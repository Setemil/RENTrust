import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { tooManyRequests } from "./errors";

// Caps how often one visitor can call a route, and answers 429 past the cap:
//
//   router.post("/login", limit({ minutes: 15, max: 10, by: "email" }), login);
//
// `by` says who is counted: "ip" (the default) counts each address, "email" counts each
// address and email together (for routes that take an email before sign-in), and "user"
// counts each signed-in user.
//
// Counts are kept in memory, so they reset when the server restarts and each copy of the
// server counts on its own. That is fine for one server. Before running more than one, move
// the counts to Postgres or Redis (express-rate-limit takes a `store` option).

type Counted = "ip" | "email" | "user";

function key(req: Request, by: Counted) {
  const ip = ipKeyGenerator(req.ip ?? "");
  if (by === "user") return req.user?.id ?? ip;
  if (by === "email") return `${ip}|${String(req.body?.email ?? "").trim().toLowerCase()}`;
  return ip;
}

export function limit({ minutes, max, by = "ip" }: { minutes: number; max: number; by?: Counted }) {
  return rateLimit({
    windowMs: minutes * 60_000,
    limit: max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => key(req, by),
    handler: (_req, _res, next) => next(tooManyRequests()),
  });
}
