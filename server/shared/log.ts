import type { NextFunction, Request, Response } from "express";
import { requestContext } from "./context";
import { env } from "./env";

// The server's one logger. Use it instead of console.log, so every line carries a time, a level
// and the request it came from:
//
//   log.info("email sent", { to, about });
//   log.warn("photo not removed from Cloudinary", { publicId, status: res.status });
//   log.error("character report job failed", { reportId, err });
//
// info:  something happened that is worth knowing (the server started, an email went out).
// warn:  something went wrong but the server coped (a retry, a refused request, a feature off).
// error: something failed and someone should look (a crash, an email that will never arrive).
//
// Pass the caught error as `err`: its message and stack are kept. Never log passwords, tokens,
// sign-in codes or character-report content. Test mode's on-screen codes are the one exception.
//
// On Railway every line is one JSON object, so the log view can filter, e.g. `@level:error`.
// Locally it prints a readable line. To add Sentry later, send `error` lines to it in write().

type Level = "info" | "warn" | "error";
type Details = Record<string, unknown>;

const print = { info: console.log, warn: console.warn, error: console.error };

// An Error turns into {} in JSON, so keep the useful parts by hand.
function plain(value: unknown) {
  if (!(value instanceof Error)) return value;
  const code = (value as { code?: unknown }).code;
  return { message: value.message, ...(code ? { code } : {}), stack: value.stack };
}

function asJson(level: Level, message: string, details: Details, requestId?: string) {
  const fields = Object.fromEntries(Object.entries(details).map(([key, value]) => [key, plain(value)]));
  const entry = { level, message, time: new Date().toISOString(), ...(requestId ? { requestId } : {}), ...fields };
  return JSON.stringify(entry, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
}

// 14:03:22 WARN  email not sent [1a2b3c4d] to=se***@gmail.com reason="Resend 403: …"
function asText(level: Level, message: string, details: Details, requestId?: string) {
  let line = `${new Date().toTimeString().slice(0, 8)} ${level.toUpperCase().padEnd(5)} ${message}`;
  if (requestId) line += ` [${requestId.slice(0, 8)}]`;
  let stack = "";
  for (const [key, value] of Object.entries(details)) {
    if (value === undefined) continue;
    if (value instanceof Error) {
      line += ` ${key}=${JSON.stringify(value.message)}`;
      stack = value.stack ?? "";
    } else if (typeof value === "string") {
      line += ` ${key}=${/^\S+$/.test(value) ? value : JSON.stringify(value)}`;
    } else {
      line += ` ${key}=${typeof value === "bigint" ? value.toString() : JSON.stringify(value)}`;
    }
  }
  return stack ? `${line}\n${stack}` : line;
}

function write(level: Level, message: string, details: Details = {}, requestId = requestContext()?.requestId) {
  const format = env.jsonLogs ? asJson : asText;
  print[level](format(level, message, details, requestId));
}

export const log = {
  info: (message: string, details?: Details) => write("info", message, details),
  warn: (message: string, details?: Details) => write("warn", message, details),
  error: (message: string, details?: Details) => write("error", message, details),
};

// One line per API request when it finishes: method, path, status, time taken and who asked.
// 5xx is an error, 4xx a warning. The query string is left out, and so are health checks.
export function logRequests(req: Request, res: Response, next: NextFunction) {
  const started = performance.now();
  const requestId = requestContext()?.requestId;
  res.on("finish", () => {
    const path = req.originalUrl.split("?")[0];
    if (path.endsWith("/health")) return;
    const status = res.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    const ms = Math.round(performance.now() - started);
    write(level, `${req.method} ${path} ${status}`, { ms, userId: req.user?.id }, requestId);
  });
  next();
}
