import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "./api";
import { useAuth } from "./auth";

// GET a resource with the session token. reload() refetches without clearing what's on screen.
export function useApi<T>(path: string | null) {
  const { token, logout } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    api<T>(path, { token })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err: ApiError) => {
        if (cancelled) return;
        if (err.status === 401) logout();
        setError(err);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, token, nonce, logout]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}

// For POST/PATCH/PUT/DELETE: tracks pending + error, returns the result or null on failure.
export function useAction() {
  const { token } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(
    async <T,>(path: string, method: string, body?: unknown): Promise<T | null> => {
      setPending(true);
      setError("");
      try {
        return await api<T>(path, { method, body, token });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [token],
  );

  return { run, pending, error, setError };
}
