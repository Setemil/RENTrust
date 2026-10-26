import { createHash, randomInt } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../config/db";
import { audit } from "../lib/audit";
import { badRequest, clientIp, conflict, oneOf, str } from "../lib/http";
import { notify } from "../lib/notify";
import { roleNames } from "../models/user";

// The legal documents are still drafts; this is the version each consent records.
export const CONSENT_DOC_VERSION = "draft-2026-10";
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
// No SMS/email gateway yet, so outside production the code is returned to the client to show on screen.
const SHOW_CODES = process.env.NODE_ENV !== "production";

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

const ID_TYPES = ["NIN", "PASSPORT", "DRIVERS_LICENCE", "VOTERS_CARD"] as const;

function mask(value: string) {
  const tail = value.slice(-4);
  return `${"•".repeat(Math.max(value.length - 4, 3))}${tail}`;
}

// Everything the home page needs to show where each check stands.
export async function status(req: Request, res: Response) {
  const user = req.user!;
  const [consents, verification] = await Promise.all([
    prisma.consent.findMany({ where: { userId: user.id }, orderBy: { acceptedAt: "desc" } }),
    prisma.verification.findFirst({
      where: { subjectType: "USER", subjectId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const accepted = (kind: string) => consents.some((c) => c.kind === kind);
  res.json({
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    termsAccepted: accepted("TERMS_OF_SERVICE") && accepted("PRIVACY_POLICY"),
    consentVersion: CONSENT_DOC_VERSION,
    kycStatus: user.kycStatus,
    verification: verification && {
      id: verification.id,
      kind: verification.kind,
      status: verification.status,
      data: verification.data,
      createdAt: verification.createdAt,
      reviewedAt: verification.reviewedAt,
      reviewNote: verification.reviewNote,
    },
  });
}

export async function sendOtp(req: Request, res: Response) {
  const user = req.user!;
  const channel = oneOf(req.body?.channel, "channel", ["EMAIL", "PHONE"] as const);
  if ((channel === "EMAIL" && user.emailVerified) || (channel === "PHONE" && user.phoneVerified)) {
    throw conflict("Already confirmed");
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.updateMany({
    where: { userId: user.id, channel, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.otpCode.create({
    data: { userId: user.id, channel, codeHash: hashCode(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  if (SHOW_CODES) console.log(`[otp] ${channel} code for ${user.email}: ${code}`);
  res.json({
    sentTo: channel === "EMAIL" ? user.email : user.phone,
    expiresInMinutes: OTP_TTL_MS / 60000,
    ...(SHOW_CODES ? { testCode: code } : {}),
  });
}

export async function verifyOtp(req: Request, res: Response) {
  const user = req.user!;
  const channel = oneOf(req.body?.channel, "channel", ["EMAIL", "PHONE"] as const);
  const code = str(req.body?.code, "code", { max: 10 }).replace(/\s/g, "");

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, channel, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expiresAt < new Date()) throw badRequest("That code has expired. Send a new one.");
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw badRequest("Too many wrong attempts. Send a new code.");
  if (otp.codeHash !== hashCode(code)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw badRequest("That code isn't right. Check it and try again.");
  }

  const field = channel === "EMAIL" ? "emailVerified" : "phoneVerified";
  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { [field]: true } }),
  ]);
  await audit(prisma, {
    actorId: user.id,
    action: `user.${channel.toLowerCase()}_verified`,
    entityType: "User",
    entityId: user.id,
    ip: clientIp(req),
  });
  res.json({ [field]: true });
}

export async function acceptConsents(req: Request, res: Response) {
  const user = req.user!;
  const kinds = req.body?.kinds;
  const allowed = ["TERMS_OF_SERVICE", "PRIVACY_POLICY", "MARKETING"] as const;
  if (!Array.isArray(kinds) || !kinds.length) throw badRequest("kinds is required");
  const clean = kinds.map((k) => oneOf(k, "kinds", allowed));
  await prisma.consent.createMany({
    data: clean.map((kind) => ({ userId: user.id, kind, docVersion: CONSENT_DOC_VERSION, ip: clientIp(req) })),
  });
  res.status(201).json({ accepted: clean, docVersion: CONSENT_DOC_VERSION });
}

// Individual KYC or organisation KYB. Goes to the admin review queue (the KYC provider is not chosen yet).
export async function submitVerification(req: Request, res: Response) {
  const user = req.user!;
  if (user.kycStatus === "PENDING") throw conflict("Your check is already being reviewed");
  if (user.kycStatus === "VERIFIED") throw conflict("Your account is already verified");
  if (!user.emailVerified || !user.phoneVerified) throw badRequest("Confirm your email and phone first");
  const consents = await prisma.consent.findMany({ where: { userId: user.id } });
  if (!["TERMS_OF_SERVICE", "PRIVACY_POLICY"].every((k) => consents.some((c) => c.kind === k))) {
    throw badRequest("Accept the RENTrust terms and privacy notice first");
  }

  const body = req.body ?? {};
  let kind: "IDENTITY" | "BUSINESS";
  let data: Record<string, string>;
  if (user.userType === "ORG") {
    kind = "BUSINESS";
    const rcNumber = str(body.rcNumber, "RC number", { max: 20 }).toUpperCase();
    if (!/^(RC|BN|IT)?\s?\d{4,10}$/.test(rcNumber)) throw badRequest("Enter the CAC number, like RC 1234567");
    data = {
      registeredName: str(body.registeredName, "Registered name", { max: 200 }),
      rcNumber,
      representativeName: str(body.representativeName, "Representative's name", { max: 120 }),
      representativeRole: str(body.representativeRole, "Representative's role", { max: 80 }),
    };
  } else {
    kind = "IDENTITY";
    const idNumber = str(body.idNumber, "ID number", { max: 20 }).replace(/\s/g, "");
    if (!/^[A-Za-z0-9]{6,20}$/.test(idNumber)) throw badRequest("Enter the ID number as it appears on the document");
    const dob = str(body.dateOfBirth, "Date of birth", { max: 10 });
    const dobDate = new Date(dob);
    const age = (Date.now() - dobDate.getTime()) / (365.25 * 864e5);
    if (Number.isNaN(dobDate.getTime()) || age < 18 || age > 120) throw badRequest("You must be 18 or older");
    data = {
      idType: oneOf(body.idType, "ID type", ID_TYPES),
      // The full number would go to the KYC provider; RENTrust keeps only a masked copy.
      idNumber: mask(idNumber),
      dateOfBirth: dob,
    };
  }

  const verification = await prisma.$transaction(async (tx) => {
    const v = await tx.verification.create({
      data: {
        subjectType: "USER",
        subjectId: user.id,
        kind,
        provider: "RENTrust review (test)",
        data,
        submittedById: user.id,
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { kycStatus: "PENDING" } });
    await audit(tx, {
      actorId: user.id,
      action: "verification.submitted",
      entityType: "Verification",
      entityId: v.id,
      after: { kind, status: "PENDING" },
      ip: clientIp(req),
    });
    await notify(tx, {
      userId: user.id,
      event: "verification.submitted",
      title: kind === "BUSINESS" ? "Business check submitted" : "Identity check submitted",
      body: "RENTrust is reviewing your details. We'll let you know here when it's done.",
      link: "/app",
      relatedType: "Verification",
      relatedId: v.id,
    });
    return v;
  });

  res.status(201).json({ id: verification.id, status: verification.status, roles: roleNames(user) });
}
