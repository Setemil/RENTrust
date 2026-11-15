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

  let userId: string;
  try {
    userId = (jwt.verify(header.slice(7), env.jwtSecret) as { sub: string }).sub;
  } catch {
    throw unauthorized("Invalid or expired token", "TOKEN_INVALID");
  }

  // Load the user on every request, so suspensions, deletions and role changes apply at once.
  const user = await findUserById(userId);
  if (!user || user.deletedAt || user.status !== "ACTIVE") {
    throw unauthorized("Account not found or inactive", "ACCOUNT_INACTIVE");
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
