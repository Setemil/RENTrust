import type { Toast } from "./toast";

// In dev, Vite proxies /api to the server on :5050 (see vite.config.ts).
// For a deployed build, set VITE_API_URL to the API's full /api/v1 URL.
const BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

const UNREACHABLE = "Can't reach the RENTrust server. Check that it's running (npm run dev in server/).";

export type RoleName = "SEEKER" | "LANDLORD" | "AGENT" | "OFFICER" | "ADMIN";
export type KycStatus = "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";

export type User = {
  id: string;
  email: string;
  phone: string;
  userType: "IND" | "ORG";
  profile: { firstName?: string; lastName?: string; orgName?: string };
  status: "ACTIVE" | "SUSPENDED";
  kycStatus: KycStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  roles: RoleName[];
};

export type AuthResponse = { token: string; user: User };

export type RegisterInput = {
  email: string;
  phone: string;
  password: string;
  userType: "IND" | "ORG";
  role: "SEEKER" | "LANDLORD" | "AGENT";
  profile: { firstName?: string; lastName?: string; orgName?: string };
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    // Machine-readable code from the server, e.g. "INVALID_CREDENTIALS" or "STALE_STATE".
    public code: string | null = null,
    // Quote this to support; it matches the server's logs and audit rows.
    public requestId: string | null = null,
    // Set when the server wants this error shown as a toast rather than beside a form.
    public toast: Toast | null = null,
  ) {
    super(message);
  }
}

type ErrorBody = { error?: { code?: string; message?: string; requestId?: string | null }; toast?: Toast };

export async function api<T>(
  path: string,
  { method = "GET", body, token }: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, UNREACHABLE);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Server errors arrive as { error: { code, message, requestId } }. The Vite proxy answers
    // with an empty 5xx when the server is down.
    const body = data as ErrorBody | null;
    const err = body?.error;
    const message = err?.message ?? (res.status >= 500 ? UNREACHABLE : `Request failed (${res.status})`);
    throw new ApiError(res.status, message, err?.code ?? null, err?.requestId ?? res.headers.get("X-Request-Id"), body?.toast ?? null);
  }
  return data as T;
}
