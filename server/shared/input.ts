import type { Request } from "express";
import { badRequest, notFound } from "./errors";

// Small checks for request input. Each returns the clean value or throws a 400 that names the
// field, so handlers can read input in one line:
//
//   const title = str(body.title, "Title", { max: 120 });

export function str(value: unknown, field: string, { max = 500, optional = false } = {}): string {
  const empty = value === undefined || value === null || (typeof value === "string" && !value.trim());
  if (empty) {
    if (optional) return "";
    throw badRequest(`${field} is required`);
  }
  if (typeof value !== "string") throw badRequest(`${field} must be text`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw badRequest(`${field} must be ${max} characters or fewer`);
  return trimmed;
}

// Returns null only when `optional` is set and nothing was sent.
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

// An optional free-text note (review notes, reasons). Null when nothing was sent.
export function note(value: unknown, field = "Note"): string | null {
  return str(value, field, { max: 500, optional: true }) || null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The :id in the URL. Anything that isn't a UUID is a 404, not a database error.
export function idParam(req: Request, name = "id"): string {
  const raw = req.params[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !UUID_RE.test(value)) throw notFound();
  return value;
}

export function clientIp(req: Request): string | null {
  return req.ip ?? null;
}
