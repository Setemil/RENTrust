import { env } from "./env";
import { HttpError, badRequest } from "./errors";
import { log } from "./log";

// Sends sign-up phone codes through Termii, by WhatsApp or by SMS:
//
//   await sendPhoneCode({ via: "WHATSAPP", phone: user.phone, code, minutes: 10 });
//
// RENTrust makes and checks the code itself (hashed, like email codes); Termii only delivers it.
// WhatsApp uses an approved authentication template, whose only variable is the code. SMS goes
// on the DND route, the one that still reaches numbers with Do Not Disturb switched on.
// Only call it once that route is connected (`whatsappConnected` / `smsConnected` in env.ts).

export type PhoneRoute = "WHATSAPP" | "SMS";

// Termii wants 234XXXXXXXXXX: country code, no "+", no spaces. People type 0803…, +234 803… or
// 234803…, so turn each of those into that form.
export function termiiNumber(phone: string) {
  let digits = phone.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (/^0\d{10}$/.test(digits)) digits = `234${digits.slice(1)}`;
  if (!/^\d{11,15}$/.test(digits)) throw badRequest("The phone number on your account doesn't look right. Check it and try again.", "PHONE_INVALID");
  return digits;
}

// "2348031234567" -> "234803*****67": enough to recognise in the log, not to harvest.
const hide = (number: string) => `${number.slice(0, 6)}${"*".repeat(Math.max(number.length - 8, 0))}${number.slice(-2)}`;

const FAILED: Record<PhoneRoute, string> = {
  WHATSAPP: "We couldn't send the WhatsApp message. Try SMS instead, or try again in a minute.",
  SMS: "We couldn't send the text message. Try again in a minute.",
};

// The person sees a short "try again"; the server log keeps Termii's own reason.
function notSent(via: PhoneRoute, to: string, reason: string): never {
  log.error("phone code not sent", { via, to: hide(to), reason });
  throw new HttpError(502, FAILED[via], "PHONE_NOT_SENT");
}

async function post(via: PhoneRoute, to: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${env.termii.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, api_key: env.termii.apiKey }),
    signal: AbortSignal.timeout(10_000),
  }).catch((err: Error) => notSent(via, to, err.message));
  const text = await res.text().catch(() => "");
  const reply = (() => {
    try {
      return JSON.parse(text) as { code?: string; message?: string; message_id_str?: string; balance?: number };
    } catch {
      return {};
    }
  })();
  // Termii answers "code": "ok" when it accepted the message; anything else carries its reason.
  if (!res.ok || reply.code !== "ok") notSent(via, to, `Termii ${res.status}: ${(reply.message ?? text).slice(0, 300)}`);
  log.info("phone code sent", { via, to: hide(to), termiiId: reply.message_id_str, balance: reply.balance });
}

export async function sendPhoneCode({ via, phone, code, minutes }: { via: PhoneRoute; phone: string; code: string; minutes: number }) {
  const to = termiiNumber(phone);
  if (via === "WHATSAPP") {
    await post(via, to, "/api/send/template", {
      phone_number: to,
      device_id: env.termii.whatsappDeviceId,
      template_id: env.termii.whatsappTemplateId,
      data: { otp: code },
    });
    return;
  }
  // No apostrophes or other special characters: they cut an SMS from 160 to 70 characters.
  await post(via, to, "/api/sms/send", {
    to,
    from: env.termii.senderId,
    sms: `Your RENTrust code is ${code}. It expires in ${minutes} minutes. Do not share it with anyone.`,
    type: "plain",
    channel: "dnd",
  });
}
