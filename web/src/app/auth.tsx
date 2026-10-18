import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api, type AuthResponse, type RegisterInput, type User } from "./api";

const TOKEN_KEY = "rentrust.token";

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked (private mode): the session lasts until the tab closes.
  }
}

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  const startSession = useCallback(({ token, user }: AuthResponse) => {
    writeToken(token);
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  // Restore the session on load. An expired or revoked token signs the user out.
  useEffect(() => {
    if (!token || user) return;
    let cancelled = false;
    setLoading(true);
    api<{ user: User }>("/auth/me", { token })
      .then(({ user }) => !cancelled && setUser(user))
      .catch((err) => {
        if (!cancelled && err instanceof ApiError && err.status === 401) logout();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, user, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      logout,
      login: async (email, password) =>
        startSession(await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } })),
      register: async (input) =>
        startSession(await api<AuthResponse>("/auth/register", { method: "POST", body: input })),
    }),
    [user, token, loading, logout, startSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
