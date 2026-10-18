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
  ) {
    super(message);
  }
}

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
    // The Vite proxy answers with an empty 5xx when the server is down.
    const message = data?.message ?? (res.status >= 500 ? UNREACHABLE : `Request failed (${res.status})`);
    throw new ApiError(res.status, message);
  }
  return data as T;
}
