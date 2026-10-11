import type { Request, Response } from "express";
import { prisma } from "../config/db";
import { signToken } from "../middleware/auth";
import {
  SELF_ASSIGNABLE_ROLES,
  createUser,
  findUserByEmail,
  hashPassword,
  toPublicUser,
  verifyPassword,
  type RoleName,
} from "../models/user";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function register(req: Request, res: Response) {
  const { email, phone, password, userType, role, profile } = req.body ?? {};

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ message: "A valid email is required" });
  }
  if (typeof phone !== "string" || phone.trim().length < 7) {
    return res.status(400).json({ message: "A valid phone number is required" });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  if (userType !== undefined && userType !== "IND" && userType !== "ORG") {
    return res.status(400).json({ message: "userType must be IND or ORG" });
  }
  const requestedRole: RoleName = role ?? "SEEKER";
  if (!SELF_ASSIGNABLE_ROLES.includes(requestedRole)) {
    return res
      .status(400)
      .json({ message: `role must be one of ${SELF_ASSIGNABLE_ROLES.join(", ")}` });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { phone: normalizedPhone }] },
    select: { id: true },
  });
  if (existing) {
    return res.status(409).json({ message: "An account with that email or phone already exists" });
  }

  const cleanProfile: Record<string, string> = {};
  for (const key of ["firstName", "lastName", "orgName"] as const) {
    const value = optionalString(profile?.[key]);
    if (value) cleanProfile[key] = value;
  }

  const user = await createUser({
    email: normalizedEmail,
    phone: normalizedPhone,
    password,
    userType: userType ?? "IND",
    role: requestedRole,
    profile: cleanProfile,
  });

  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await findUserByEmail(email.trim().toLowerCase());
  // Same response for unknown email and wrong password, so accounts can't be enumerated.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ message: "Account is suspended" });
  }

  res.json({ token: signToken(user), user: toPublicUser(user) });
}

export async function me(req: Request, res: Response) {
  res.json({ user: toPublicUser(req.user!) });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ message: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  const user = req.user!;
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  res.json({ message: "Password updated" });
}
