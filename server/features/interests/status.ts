import type { InterestStatus, Prisma } from "../../generated/prisma/client";
import { audit } from "../../shared/audit";
import { prisma } from "../../shared/db";
import { conflict } from "../../shared/errors";

// The interest state machine:
//
//   INITIATED > TERMS_ACCEPTED > KYC_CONFIRMED > REPORT_REQUESTED > REPORT_READY
//     > AWAITING_DECISION > APPROVED | REJECTED        (WITHDRAWN by the renter before a decision)
//
// Change an interest's status only with transitionInterest. It refuses stale changes and
// writes the history and audit rows for you.

// An interest in one of these states is still in play; a renter can have only one per listing.
export const OPEN_STATUSES: InterestStatus[] = [
  "INITIATED",
  "TERMS_ACCEPTED",
  "KYC_CONFIRMED",
  "REPORT_REQUESTED",
  "REPORT_READY",
  "AWAITING_DECISION",
  "APPROVED",
];

// The few fields every interest list and detail shows.
export function interestSummary(i: {
  id: string;
  status: InterestStatus;
  createdAt: Date;
  decidedAt: Date | null;
  termsAcceptedAt: Date;
  terms: { version: number };
}) {
  return {
    id: i.id,
    status: i.status,
    createdAt: i.createdAt,
    decidedAt: i.decidedAt,
    termsAcceptedAt: i.termsAcceptedAt,
    termsVersion: i.terms.version,
  };
}

// Every status the interest has been through, oldest first. Reasons stay internal.
export async function statusTimeline(interestId: string) {
  const rows = await prisma.interestStatusChange.findMany({
    where: { interestId },
    orderBy: { seq: "asc" },
    select: { toStatus: true, createdAt: true },
  });
  return rows.map((r) => ({ status: r.toStatus, at: r.createdAt }));
}

type Tx = Prisma.TransactionClient;

// Writes one step to the append-only status history and the audit log. Use it on its own only
// for steps that don't change the stored status (the walk-through when an interest is created);
// otherwise use transitionInterest.
export async function recordInterestStatus(
  tx: Tx,
  input: {
    interestId: string;
    from: InterestStatus | null;
    to: InterestStatus;
    actorId: string | null;
    reason?: string | null;
    detail?: Prisma.InputJsonObject;
  },
) {
  await tx.interestStatusChange.create({
    data: {
      interestId: input.interestId,
      fromStatus: input.from,
      toStatus: input.to,
      actorId: input.actorId,
      reason: input.reason ?? null,
    },
  });
  await audit(tx, {
    actorId: input.actorId,
    action: `interest.${input.to.toLowerCase()}`,
    entityType: "Interest",
    entityId: input.interestId,
    before: input.from ? { status: input.from } : undefined,
    after: { status: input.to, ...(input.detail ?? {}) },
  });
}

// The one way to change an interest's status. The update only applies if the interest is still in
// one of the expected states, so two concurrent requests can't both act on it (for example, a
// landlord approving while the renter withdraws).
export async function transitionInterest(
  tx: Tx,
  input: {
    interestId: string;
    from: InterestStatus | InterestStatus[];
    to: InterestStatus;
    actorId: string | null;
    reason?: string | null;
    data?: Omit<Prisma.InterestUncheckedUpdateManyInput, "status" | "id">;
    detail?: Prisma.InputJsonObject;
  },
) {
  const allowed = Array.isArray(input.from) ? input.from : [input.from];
  const current = await tx.interest.findUnique({ where: { id: input.interestId }, select: { status: true } });
  if (!current || !allowed.includes(current.status)) {
    throw conflict("This interest has changed since you loaded it. Refresh and try again.", "STALE_STATE");
  }
  const { count } = await tx.interest.updateMany({
    where: { id: input.interestId, status: current.status },
    data: { ...input.data, status: input.to },
  });
  if (count !== 1) {
    throw conflict("This interest has changed since you loaded it. Refresh and try again.", "STALE_STATE");
  }
  await recordInterestStatus(tx, {
    interestId: input.interestId,
    from: current.status,
    to: input.to,
    actorId: input.actorId,
    reason: input.reason,
    detail: input.detail,
  });
}
