import type { Db } from "./audit";
import { emailConnected } from "./env";

type Channel = "IN_APP" | "EMAIL" | "SMS";

// Tells a user something happened. Writes one row per channel:
//
//   await notify(tx, { userId, event: "listing.approve", title: "RT-0001 is live", body: "…", link: "/app/…" });
//
// In-app is the default. An EMAIL row is QUEUED for shared/emailSender.ts when email is
// connected, and SIMULATED when it isn't. SMS has no gateway yet, so it is always SIMULATED.
// Never put character-report content in title or body: email and SMS only ever say "log in
// to review".
function statusFor(channel: Channel) {
  if (channel === "IN_APP") return "SENT" as const;
  if (channel === "EMAIL" && emailConnected) return "QUEUED" as const;
  return "SIMULATED" as const;
}

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
      status: statusFor(channel),
    })),
  });
}
