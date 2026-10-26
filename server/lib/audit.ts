import { prisma } from "../config/db";
import type { Prisma } from "../generated/prisma/client";

type Db = Prisma.TransactionClient | typeof prisma;

// Append-only trail for every sensitive state change (spec section 28).
export function audit(
  db: Db,
  entry: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
    ip?: string | null;
  },
) {
  return db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      ip: entry.ip ?? null,
    },
  });
}
