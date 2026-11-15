import type { Prisma } from "../generated/prisma/client";
import { requestContext } from "./context";
import { prisma } from "./db";

// Pass `tx` inside a transaction, or `prisma` outside one.
export type Db = Prisma.TransactionClient | typeof prisma;

// Records a sensitive action in the append-only audit log (spec section 28). Call it for every
// state change, in the same transaction as the change:
//
//   await audit(tx, { actorId: user.id, action: "listing.submitted", entityType: "Listing", entityId: listing.id });
//
// The request ID, IP and user agent are added automatically. The database assigns the row's
// place in the hash chain and refuses updates and deletes.
export function audit(
  db: Db,
  entry: {
    actorId: string | null; // null when the system acted
    action: string; // "<thing>.<what happened>", e.g. "interest.approved"
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  const ctx = requestContext();
  return db.auditLog.create({
    data: {
      ...entry,
      ip: ctx?.ip ?? null,
      requestId: ctx?.requestId ?? null,
      userAgent: ctx?.userAgent ?? null,
    },
    select: { id: true },
  });
}
