import { prisma } from "../config/db";
import type { Prisma } from "../generated/prisma/client";

type Db = Prisma.TransactionClient | typeof prisma;

type Channel = "IN_APP" | "EMAIL" | "SMS";

// Writes one notification row per channel. Email and SMS gateways are not connected yet,
// so those rows are stored as SIMULATED; swap this for a real queue + gateway adapter later.
// Never put character-report content in title/body: email and SMS only say "log in to review".
export async function notify(
  db: Db,
  input: {
    userId: string;
    event: string;
    title: string;
    body: string;
    link?: string;
    relatedType?: string;
    relatedId?: string;
    channels?: Channel[];
  },
) {
  const channels = input.channels ?? ["IN_APP"];
  await db.notification.createMany({
    data: channels.map((channel) => ({
      userId: input.userId,
      event: input.event,
      channel,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      relatedType: input.relatedType ?? null,
      relatedId: input.relatedId ?? null,
      status: channel === "IN_APP" ? ("SENT" as const) : ("SIMULATED" as const),
    })),
  });
}
