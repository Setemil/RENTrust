import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

// Per-request context, readable anywhere down the call chain (audit rows, logs, errors)
// without threading it through every function.
export type RequestContext = {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function requestContext(): RequestContext | undefined {
  return storage.getStore();
}

// Accept a caller's X-Request-Id (from a proxy or the web app) when it looks safe, otherwise mint one.
const SAFE_ID = /^[A-Za-z0-9._:-]{8,64}$/;

export function withRequestContext(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get("x-request-id");
  const requestId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Request-Id", requestId);
  const userAgent = req.get("user-agent")?.slice(0, 300) ?? null;
  storage.run({ requestId, ip: req.ip ?? null, userAgent }, next);
}
