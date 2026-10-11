import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { findUserById, roleNames, type RoleName, type UserWithRoles } from "../models/user";

export interface TokenPayload {
  sub: string;
  roles: RoleName[];
}

declare global {
  namespace Express {
    interface Request {
      user?: UserWithRoles;
    }
  }
}

export function signToken(user: UserWithRoles): string {
  const payload: TokenPayload = { sub: user.id, roles: roleNames(user) };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(header.slice(7), env.jwtSecret) as TokenPayload;
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // Re-load the user so suspended/deleted accounts and role changes take effect immediately.
  const user = await findUserById(payload.sub);
  if (!user || user.status !== "ACTIVE") {
    return res.status(401).json({ message: "Account not found or inactive" });
  }

  req.user = user;
  next();
}

export function requireRole(...allowed: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Authentication required" });
    if (!roleNames(req.user).some((role) => allowed.includes(role))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
