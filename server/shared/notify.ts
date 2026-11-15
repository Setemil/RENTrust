import type { Db } from "./audit";

type Channel = "IN_APP" | "EMAIL" | "SMS";

// Tells a user something happened. Writes one row per channel:
//
//   await notify(tx, { userId, event: "listing.approve", title: "RT-0001 is live", body: "…", link: "/app/…" });
//
// In-app is the default. Email and SMS gateways are not connected yet, so those rows are stored
// as SIMULATED. Never put character-report content in title or body: email and SMS only ever
// say "log in to review".
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
  const { channels = ["IN_APP"], ...message } = input;
  await db.notification.createMany({
    data: channels.map((channel) => ({
      ...message,
      channel,
      status: channel === "IN_APP" ? ("SENT" as const) : ("SIMULATED" as const),
    })),
  });
}
