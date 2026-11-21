import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { audit } from "../../shared/audit";
import { signToken } from "../../shared/auth";
import { prisma } from "../../shared/db";
import { env } from "../../shared/env";
import { badRequest, conflict, forbidden, unauthorized } from "../../shared/errors";
import { clientIp, oneOf, str } from "../../shared/input";
import { toast } from "../../shared/toast";
import { SELF_ASSIGNABLE_ROLES, createUser, findUserByEmail, findUserById, hashPassword, toPublicUser, verifyPassword } from "./users";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const RESET_MINUTES = 30;
// No email gateway yet (ROADMAP Phase 2). Until there is one, the reset link is returned to the
// page outside production, the same way email and phone codes are. In production nothing is
// sent yet, and the link is never logged there, because a logged link is a working password.
const SHOW_RESET_LINKS = !env.isProduction;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const usable = (user: { deletedAt: Date | null; status: string } | null) => user && !user.deletedAt && user.status === "ACTIVE";

function password(value: unknown, field = "Password"): string {
  if (typeof value !== "string" || value.length < MIN_PASSWORD) {
    throw badRequest(`${field} must be at least ${MIN_PASSWORD} characters`);
  }
  return value;
}

export async function register(req: Request, res: Response) {
  const body = req.body ?? {};
  const email = str(body.email, "Email", { max: 200 }).toLowerCase();
  if (!EMAIL_RE.test(email)) throw badRequest("A valid email is required");
  const phone = str(body.phone, "Phone number", { max: 20 });
  if (phone.length < 7) throw badRequest("A valid phone number is required");

  const taken = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] }, select: { id: true } });
  if (taken) throw conflict("An account with that email or phone already exists");

  // Only the name fields we know about are kept from the profile.
  const profile: Record<string, string> = {};
  for (const key of ["firstName", "lastName", "orgName"]) {
    const value = str(body.profile?.[key], key, { max: 120, optional: true });
    if (value) profile[key] = value;
  }

  const user = await createUser({
    email,
    phone,
    password: password(body.password),
    userType: body.userType === undefined ? "IND" : oneOf(body.userType, "userType", ["IND", "ORG"] as const),
    role: body.role === undefined ? "SEEKER" : oneOf(body.role, "role", SELF_ASSIGNABLE_ROLES),
    profile,
  });
  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password: given } = req.body ?? {};
  if (typeof email !== "string" || typeof given !== "string") throw badRequest("Email and password are required");

  const user = await findUserByEmail(email.trim().toLowerCase());
  // Same answer for an unknown email, a deleted account and a wrong password, so accounts can't be discovered.
  if (!user || user.deletedAt || !(await verifyPassword(given, user.passwordHash))) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }
  if (user.status !== "ACTIVE") throw forbidden("Account is suspended", "ACCOUNT_SUSPENDED");

  res.json({ token: signToken(user), user: toPublicUser(user) });
}

export async function me(req: Request, res: Response) {
  res.json({ user: toPublicUser(req.user!) });
}

export async function changePassword(req: Request, res: Response) {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== "string") throw badRequest("currentPassword and newPassword are required");
  const next = password(newPassword, "New password");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw unauthorized("Current password is incorrect", "INVALID_CREDENTIALS");
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() } });
    await audit(tx, { actorId: user.id, action: "user.password_changed", entityType: "User", entityId: user.id });
  });
  // Every older token now fails (see requireAuth), so hand this tab a fresh one.
  res.json({ message: "Password updated", token: signToken(user), user: toPublicUser(user) });
}

// Step 1 of a reset: email a one-time link. The answer is the same whether or not the account
// exists, so this can't be used to find out who has an account.
export async function forgotPassword(req: Request, res: Response) {
  const email = str(req.body?.email, "Email", { max: 200 }).toLowerCase();
  const user = await findUserByEmail(email);
  let testLink: string | undefined;

  if (usable(user)) {
    const token = randomBytes(32).toString("base64url");
    await prisma.$transaction(async (tx) => {
      // Only the newest link works: retire any earlier ones.
      await tx.passwordReset.updateMany({ where: { userId: user!.id, usedAt: null }, data: { usedAt: new Date() } });
      await tx.passwordReset.create({
        data: { userId: user!.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000), ip: clientIp(req) },
      });
      await audit(tx, { actorId: user!.id, action: "user.password_reset_requested", entityType: "User", entityId: user!.id });
    });
    if (SHOW_RESET_LINKS) {
      testLink = `${env.clientUrl}/reset-password?token=${token}`;
      console.log(`[reset] link for ${email}: ${testLink}`);
    }
  }

  res.json({
    message: "If an account uses that email, we've sent it a link to set a new password.",
    expiresInMinutes: RESET_MINUTES,
    ...(testLink ? { testLink } : {}),
  });
}

// Step 2: set the new password with the link's token. This signs out every other session.
export async function resetPassword(req: Request, res: Response) {
  const token = str(req.body?.token, "token", { max: 200 });
  const next = password(req.body?.newPassword, "New password");
  const expired = badRequest("This link has expired or has already been used. Ask for a new one.", "RESET_LINK_INVALID");

  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) throw expired;
  const user = await findUserById(reset.userId);
  if (!usable(user)) throw expired;

  const passwordHash = await hashPassword(next);
  await prisma.$transaction(async (tx) => {
    // Guarded, so two requests racing with the same link can't both succeed.
    const { count } = await tx.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
    if (count === 0) throw expired;
    await tx.user.update({ where: { id: user!.id }, data: { passwordHash, passwordChangedAt: new Date() } });
    await audit(tx, { actorId: user!.id, action: "user.password_reset", entityType: "User", entityId: user!.id });
  });
  res.json({ ok: true, toast: toast.success("Password updated. Sign in with your new password.") });
}
