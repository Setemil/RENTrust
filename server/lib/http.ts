import type { Request } from "express";

// Throw from any handler; the error middleware turns it into a JSON response.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const forbidden = (message = "You don't have access to this") => new HttpError(403, message);
export const notFound = (message = "Not found") => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

export function str(value: unknown, field: string, { max = 500, optional = false } = {}): string {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
    if (optional) return "";
    throw badRequest(`${field} is required`);
  }
  if (typeof value !== "string") throw badRequest(`${field} must be text`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw badRequest(`${field} must be ${max} characters or fewer`);
  return trimmed;
}

export function int(value: unknown, field: string, { min = 0, max = 2_000_000_000, optional = false } = {}): number | null {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
    throw badRequest(`${field} is required`);
  }
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`${field} must be a whole number between ${min} and ${max}`);
  }
  return n;
}

export function oneOf<T extends string>(value: unknown, field: string, options: readonly T[]): T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw badRequest(`${field} must be one of ${options.join(", ")}`);
  }
  return value as T;
}

export function clientIp(req: Request): string | null {
  return req.ip ?? null;
}

// Express 5 types route params as string | string[].
export function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function idParam(req: Request, name = "id"): string {
  const value = param(req, name);
  if (!UUID_RE.test(value)) throw notFound();
  return value;
}
