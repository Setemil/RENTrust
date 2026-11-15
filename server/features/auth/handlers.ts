import type { Request, Response } from "express";
import { signToken } from "../../shared/auth";
import { prisma } from "../../shared/db";
import { badRequest, conflict, forbidden, unauthorized } from "../../shared/errors";
import { oneOf, str } from "../../shared/input";
import { SELF_ASSIGNABLE_ROLES, createUser, findUserByEmail, hashPassword, toPublicUser, verifyPassword } from "./users";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

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
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  res.json({ message: "Password updated" });
}
