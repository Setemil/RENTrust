import { emailConnected, env } from "./env";
import { HttpError } from "./errors";

// Sends one email through Resend, in RENTrust's plain branded layout:
//
//   await sendEmail({ to: user.email, subject: "Your code", heading: "Confirm your email", lines: ["…"] });
//
// It waits for Resend and throws if the email didn't go. Only call it once EMAIL is connected
// (`emailConnected` in env.ts), and never with character-report content.

type Email = {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  // A big code shown on its own line, such as a sign-in code.
  code?: string;
  button?: { label: string; url: string };
};

const NAVY = "#0e3b61";
const GREEN = "#227044";
const SOFT = "#41596e";
const FONT = "font-family:Arial,Helvetica,sans-serif;";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Table layout and inline styles, because that is what email apps reliably render.
function html({ heading, lines, code, button }: Email) {
  const paragraphs = lines.map((line) => `<p style="${FONT}margin:0 0 16px;font-size:16px;line-height:1.55;color:${NAVY}">${escape(line)}</p>`).join("");
  const codeBlock = code
    ? `<p style="${FONT}margin:8px 0 24px;font-size:32px;font-weight:700;letter-spacing:6px;color:${NAVY}">${escape(code)}</p>`
    : "";
  const buttonBlock = button
    ? `<p style="margin:8px 0 24px"><a href="${escape(button.url)}" style="${FONT}display:inline-block;padding:12px 22px;background:${NAVY};color:#f1f5f3;font-size:15px;font-weight:700;text-decoration:none;border:2px solid ${NAVY}">${escape(button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f1f5f3">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:2px solid ${NAVY}">
<tr><td style="padding:20px 28px;border-bottom:1px solid ${NAVY}"><span style="${FONT}font-size:22px;font-weight:700;color:${NAVY}">REN</span><span style="${FONT}font-size:22px;font-weight:700;color:${GREEN}">Trust</span></td></tr>
<tr><td style="padding:28px">
<h1 style="${FONT}margin:0 0 16px;font-size:22px;line-height:1.3;color:${NAVY}">${escape(heading)}</h1>
${paragraphs}${codeBlock}${buttonBlock}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #c7d0d8"><p style="${FONT}margin:0;font-size:13px;line-height:1.5;color:${SOFT}">RENTrust Nigeria Limited. You're getting this because of your RENTrust account. If you didn't expect it, you can ignore it.</p></td></tr>
</table></body></html>`;
}

function text({ heading, lines, code, button }: Email) {
  return [heading, "", ...lines, ...(code ? ["", code] : []), ...(button ? ["", `${button.label}: ${button.url}`] : [])].join("\n");
}

// The person sees a short "try again"; the server log keeps Resend's own reason.
function notSent(reason: string): never {
  console.error(`[email] not sent: ${reason}`);
  throw new HttpError(502, "We couldn't send the email. Try again in a minute.", "EMAIL_NOT_SENT");
}

export async function sendEmail(email: Email) {
  if (!emailConnected) throw new Error("sendEmail called but email isn't connected");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, to: [email.to], subject: email.subject, html: html(email), text: text(email) }),
    signal: AbortSignal.timeout(10_000),
  }).catch((err: Error) => notSent(err.message));
  if (!res.ok) notSent(`Resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
}
