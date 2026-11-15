import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "./api";
import { useAuth } from "./auth";
import { useToast, type Toast } from "./toast";

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
// Any toast the server sends with the response is shown. An error that arrives as a toast is
// not repeated in `error`, so `error` only ever holds what belongs beside the form.
export function useAction() {
  const { token } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(
    async <T,>(path: string, method: string, body?: unknown): Promise<T | null> => {
      setPending(true);
      setError("");
      try {
        const result = await api<T>(path, { method, body, token });
        const sent = (result as { toast?: Toast } | null)?.toast;
        if (sent) toast(sent);
        return result;
      } catch (err) {
        if (err instanceof ApiError && err.toast) toast(err.toast);
        else setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [token, toast],
  );

  return { run, pending, error, setError };
}
