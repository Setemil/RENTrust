import { createHash, randomInt } from "node:crypto";
import type { Request, Response } from "express";
import { audit } from "../../shared/audit";
import { prisma } from "../../shared/db";
import { emailConnected, emailMissing, env, smsConnected, smsMissing, whatsappConnected, whatsappMissing } from "../../shared/env";
import { sendEmail } from "../../shared/email";
import { HttpError, badRequest, conflict } from "../../shared/errors";
import { clientIp, oneOf, str } from "../../shared/input";
import { log } from "../../shared/log";
import { notify } from "../../shared/notify";
import { type PhoneRoute, sendPhoneCode } from "../../shared/termii";
import type { UserWithRoles } from "../auth/users";
import { CONSENT_DOC_VERSION } from "./consent";

// The checks a new account goes through before it can use the marketplace:
// confirm email and phone (OTP), accept the terms, then submit an identity or business check.

const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
// Email codes go by email (Resend); phone codes by WhatsApp or SMS (Termii). A route that isn't
// connected shows the code on the page instead, but only in test mode (see env.ts).
type Route = "EMAIL" | PhoneRoute;
const ROUTE: Record<Route, { name: string; connected: boolean; missing: string[]; off: string }> = {
  EMAIL: { name: "Email", connected: emailConnected, missing: emailMissing, off: "We can't send email codes right now. Try again later." },
  WHATSAPP: { name: "WhatsApp", connected: whatsappConnected, missing: whatsappMissing, off: "We can't send WhatsApp messages right now. Try SMS instead." },
  SMS: { name: "SMS", connected: smsConnected, missing: smsMissing, off: "We can't send text messages right now. Try WhatsApp instead." },
};
const ID_TYPES = ["NIN", "PASSPORT", "DRIVERS_LICENCE", "VOTERS_CARD"] as const;

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

// Only the current version counts: after the documents change, everyone accepts them again.
async function hasAcceptedTerms(userId: string) {
  const consents = await prisma.consent.findMany({ where: { userId, docVersion: CONSENT_DOC_VERSION }, select: { kind: true } });
  const kinds = consents.map((c) => c.kind);
  return kinds.includes("TERMS_OF_SERVICE") && kinds.includes("PRIVACY_POLICY");
}

// The version this person last accepted, so the page can say "updated" instead of "new".
async function lastAcceptedVersion(userId: string) {
  const last = await prisma.consent.findFirst({ where: { userId, kind: "TERMS_OF_SERVICE" }, orderBy: { acceptedAt: "desc" }, select: { docVersion: true } });
  return last?.docVersion ?? null;
}

// Everything the home page needs to show where each check stands.
export async function status(req: Request, res: Response) {
  const user = req.user!;
  const verification = await prisma.verification.findFirst({
    where: { subjectType: "USER", subjectId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, kind: true, status: true, data: true, createdAt: true, reviewedAt: true, reviewNote: true },
  });
  res.json({
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    termsAccepted: await hasAcceptedTerms(user.id),
    termsAcceptedVersion: await lastAcceptedVersion(user.id),
    consentVersion: CONSENT_DOC_VERSION,
    // Which ways a phone code can go, so the page only offers the ones that work.
    phoneRoutes: { whatsapp: whatsappConnected, sms: smsConnected },
    kycStatus: user.kycStatus,
    verification,
  });
}

// Phone codes go by WhatsApp unless the person picks SMS, or only SMS is connected.
function routeFor(channel: "EMAIL" | "PHONE", via: unknown): Route {
  if (channel === "EMAIL") return "EMAIL";
  if (via !== undefined) return oneOf(via, "via", ["WHATSAPP", "SMS"] as const);
  return smsConnected && !whatsappConnected ? "SMS" : "WHATSAPP";
}

// No way to deliver the code and no test mode to show it: say so rather than pretend it went.
function cannotSend(route: Route, userId: string): never {
  const { name, missing, off } = ROUTE[route];
  log.warn(`${name} code NOT sent: ${name} is off. Add ${missing.join(" and ")} to this server's variables, then redeploy`, { userId, missing });
  throw new HttpError(503, off, "CODE_NOT_SENT");
}

async function deliverCode(route: Route, user: UserWithRoles, code: string) {
  if (route !== "EMAIL") return sendPhoneCode({ via: route, phone: user.phone, code, minutes: OTP_MINUTES });
  await sendEmail({
    to: user.email,
    subject: `${code} is your RENTrust code`,
    heading: "Confirm your email",
    lines: [`Enter this code in RENTrust to confirm your email address. It expires in ${OTP_MINUTES} minutes.`],
    code,
  });
}

export async function sendOtp(req: Request, res: Response) {
  const user = req.user!;
  const channel = oneOf(req.body?.channel, "channel", ["EMAIL", "PHONE"] as const);
  const alreadyDone = channel === "EMAIL" ? user.emailVerified : user.phoneVerified;
  if (alreadyDone) throw conflict("Already confirmed");
  const route = routeFor(channel, req.body?.via);
  const canSend = ROUTE[route].connected;
  if (!canSend && !env.testMode) cannotSend(route, user.id);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Only the newest code works: retire any earlier ones.
  await prisma.otpCode.updateMany({ where: { userId: user.id, channel, consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.otpCode.create({
    data: { userId: user.id, channel, codeHash: hashCode(code), expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000) },
  });

  if (canSend) await deliverCode(route, user, code);
  const showCode = !canSend && env.testMode;
  if (showCode) log.info("test code shown on screen", { via: route, email: user.email, code });
  res.json({
    sentTo: channel === "EMAIL" ? user.email : user.phone,
    via: route,
    expiresInMinutes: OTP_MINUTES,
    ...(showCode ? { testCode: code } : {}),
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
  await prisma.$transaction(async (tx) => {
    await tx.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    await tx.user.update({ where: { id: user.id }, data: { [field]: true } });
    await audit(tx, { actorId: user.id, action: `user.${channel.toLowerCase()}_verified`, entityType: "User", entityId: user.id });
  });
  res.json({ [field]: true });
}

export async function acceptConsents(req: Request, res: Response) {
  const kinds = req.body?.kinds;
  if (!Array.isArray(kinds) || !kinds.length) throw badRequest("kinds is required");
  const accepted = kinds.map((k) => oneOf(k, "kinds", ["TERMS_OF_SERVICE", "PRIVACY_POLICY", "MARKETING"] as const));
  const userId = req.user!.id;
  await prisma.$transaction(async (tx) => {
    await tx.consent.createMany({
      data: accepted.map((kind) => ({ userId, kind, docVersion: CONSENT_DOC_VERSION, ip: clientIp(req) })),
    });
    await audit(tx, { actorId: userId, action: "user.consents_accepted", entityType: "User", entityId: userId, after: { kinds: accepted, docVersion: CONSENT_DOC_VERSION } });
  });
  res.status(201).json({ accepted, docVersion: CONSENT_DOC_VERSION });
}

// What an organisation submits for its business check (KYB).
function businessDetails(body: any) {
  const rcNumber = str(body.rcNumber, "RC number", { max: 20 }).toUpperCase();
  if (!/^(RC|BN|IT)?\s?\d{4,10}$/.test(rcNumber)) throw badRequest("Enter the CAC number, like RC 1234567");
  return {
    registeredName: str(body.registeredName, "Registered name", { max: 200 }),
    rcNumber,
    representativeName: str(body.representativeName, "Representative's name", { max: 120 }),
    representativeRole: str(body.representativeRole, "Representative's role", { max: 80 }),
  };
}

// What an individual submits for their identity check (KYC). The full ID number would go to
// the KYC provider; RENTrust keeps only the last four characters.
function identityDetails(body: any) {
  const idNumber = str(body.idNumber, "ID number", { max: 20 }).replace(/\s/g, "");
  if (!/^[A-Za-z0-9]{6,20}$/.test(idNumber)) throw badRequest("Enter the ID number as it appears on the document");
  const dateOfBirth = str(body.dateOfBirth, "Date of birth", { max: 10 });
  const age = (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 864e5);
  if (!(age >= 18 && age <= 120)) throw badRequest("You must be 18 or older");
  return {
    idType: oneOf(body.idType, "ID type", ID_TYPES),
    idNumber: "•".repeat(Math.max(idNumber.length - 4, 3)) + idNumber.slice(-4),
    dateOfBirth,
  };
}

async function assertReadyForVerification(user: UserWithRoles) {
  if (user.kycStatus === "PENDING") throw conflict("Your check is already being reviewed");
  if (user.kycStatus === "VERIFIED") throw conflict("Your account is already verified");
  if (!user.emailVerified || !user.phoneVerified) throw badRequest("Confirm your email and phone first");
  if (!(await hasAcceptedTerms(user.id))) throw badRequest("Accept the RENTrust terms and privacy notice first");
}

// Individual KYC or organisation KYB. Goes to the admin review queue (no KYC provider yet).
export async function submitVerification(req: Request, res: Response) {
  const user = req.user!;
  await assertReadyForVerification(user);
  const isBusiness = user.userType === "ORG";
  const kind = isBusiness ? "BUSINESS" : "IDENTITY";
  const data = isBusiness ? businessDetails(req.body ?? {}) : identityDetails(req.body ?? {});

  const verification = await prisma.$transaction(async (tx) => {
    const v = await tx.verification.create({
      data: { subjectType: "USER", subjectId: user.id, kind, provider: "RENTrust review (test)", data, submittedById: user.id },
    });
    await tx.user.update({ where: { id: user.id }, data: { kycStatus: "PENDING" } });
    await audit(tx, {
      actorId: user.id,
      action: "verification.submitted",
      entityType: "Verification",
      entityId: v.id,
      after: { kind, status: "PENDING" },
    });
    await notify(tx, {
      userId: user.id,
      event: "verification.submitted",
      title: isBusiness ? "Business check submitted" : "Identity check submitted",
      body: "RENTrust is reviewing your details. We'll let you know here when it's done.",
      link: "/app",
      relatedType: "Verification",
      relatedId: v.id,
    });
    return v;
  });

  res.status(201).json({ id: verification.id, status: verification.status });
}
