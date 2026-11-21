import { prisma } from "./db";
import { sendEmail } from "./email";
import { emailConnected, env } from "./env";
import { log } from "./log";

// Sends queued notification emails in the background. notify() stores an EMAIL notification as
// QUEUED (it runs inside database transactions, where waiting on an email would be wrong); this
// loop picks them up every few seconds, sends them and marks each SENT, or FAILED after
// MAX_ATTEMPTS. The queue is the notifications table itself, so nothing is lost on a restart.
//
// It assumes one server. With more than one, two copies could pick up the same row; claim rows
// first (or move to pg-boss, see ROADMAP) before scaling out.

const EVERY_MS = 5_000;
const BATCH = 20;
const MAX_ATTEMPTS = 5;

async function sendOne(row: { id: string; title: string; body: string; link: string | null; attempts: number; user: { email: string } }) {
  try {
    await sendEmail({
      to: row.user.email,
      subject: row.title,
      heading: row.title,
      lines: [row.body],
      button: { label: "Open RENTrust", url: env.clientUrl + (row.link ?? "/app") },
    });
    await prisma.notification.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), attempts: row.attempts + 1 } });
  } catch (err) {
    const attempts = row.attempts + 1;
    const gaveUp = attempts >= MAX_ATTEMPTS;
    await prisma.notification.update({
      where: { id: row.id },
      data: { attempts, status: gaveUp ? "FAILED" : "QUEUED", lastError: String((err as Error).message).slice(0, 500) },
    });
    if (gaveUp) log.error("notification email given up", { notificationId: row.id, attempts });
    else log.warn("notification email will be retried", { notificationId: row.id, attempts });
  }
}

export async function sendQueuedEmails() {
  const rows = await prisma.notification.findMany({
    where: { channel: "EMAIL", status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, title: true, body: true, link: true, attempts: true, user: { select: { email: true } } },
  });
  for (const row of rows) await sendOne(row);
}

export function startEmailSender() {
  if (!emailConnected) return;
  let running = false;
  setInterval(async () => {
    if (running) return; // the last batch is still going
    running = true;
    await sendQueuedEmails().catch((err) => log.error("email sender failed", { err }));
    running = false;
  }, EVERY_MS);
  log.info("email sender started", { everySeconds: EVERY_MS / 1000 });
}
