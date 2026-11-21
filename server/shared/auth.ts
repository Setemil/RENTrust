import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { findUserById, roleNames, type RoleName, type UserWithRoles } from "../features/auth/users";
import { env } from "./env";
import { forbidden, unauthorized } from "./errors";

// Sign-in tokens and the two route guards:
//
//   requireAuth          the request must carry a valid token; sets req.user
//   requireRole("ADMIN") the signed-in user must hold one of these roles

declare global {
  namespace Express {
    interface Request {
      user?: UserWithRoles;
    }
  }
}

export function signToken(user: UserWithRoles): string {
  return jwt.sign({ sub: user.id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized();

  let token: { sub: string; iat: number };
  try {
    token = jwt.verify(header.slice(7), env.jwtSecret) as { sub: string; iat: number };
  } catch {
    throw unauthorized("Invalid or expired token", "TOKEN_INVALID");
  }

  // Load the user on every request, so suspensions, deletions and role changes apply at once.
  const user = await findUserById(token.sub);
  if (!user || user.deletedAt || user.status !== "ACTIVE") {
    throw unauthorized("Account not found or inactive", "ACCOUNT_INACTIVE");
  }
  // A password change or reset signs out every token issued before it. (iat is in seconds.)
  if (user.passwordChangedAt && token.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw unauthorized("Your password was changed. Sign in again.", "TOKEN_REVOKED");
  }

  req.user = user;
  next();
}

export function requireRole(...allowed: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!hasRole(req.user, ...allowed)) throw forbidden("Forbidden");
    next();
  };
}

export function hasRole(user: UserWithRoles, ...roles: RoleName[]): boolean {
  return roleNames(user).some((role) => roles.includes(role));
}
