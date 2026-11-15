import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Toast.module.css";

// Toasts: short messages that appear in the bottom corner. The server decides when to send one
// (see server/shared/toast.ts) and useAction shows whatever arrives, so pages rarely call this
// directly. When a page does need one of its own:
//
//   const toast = useToast();
//   toast({ kind: "success", message: "Copied" });

export type Toast = {
  kind: "success" | "info" | "error";
  message: string;
  // A short reference to quote to support, sent with server errors.
  reference?: string;
};

type ShownToast = Toast & { id: number };

const MAX_SHOWN = 4;
// Errors stay until dismissed; everything else leaves by itself.
const AUTO_DISMISS_MS = 6000;

const ToastContext = createContext<((toast: Toast) => void) | null>(null);

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside ToastProvider");
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ShownToast[]>([]);
  const nextId = useRef(1);

  const show = useCallback((toast: Toast) => {
    const id = nextId.current++;
    setToasts((shown) => {
      // A double click or a retry shouldn't stack the same message twice.
      if (shown.some((t) => t.kind === toast.kind && t.message === toast.message)) return shown;
      return [...shown, { ...toast, id }].slice(-MAX_SHOWN);
    });
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((shown) => shown.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.stack} role="region" aria-label="Messages">
        {toasts.map((toast) => (
          <ToastNote key={toast.id} toast={toast} dismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastNote({ toast, dismiss }: { toast: ShownToast; dismiss: (id: number) => void }) {
  const isError = toast.kind === "error";
  // Reading or tabbing into a toast holds it open.
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (isError || held) return;
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isError, held, dismiss, toast.id]);

  return (
    <div
      className={styles.toast}
      data-kind={toast.kind}
      role={isError ? "alert" : "status"}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <span className={styles.beacon} aria-hidden="true" />
      <div className={styles.body}>
        <p>
          {isError && <span className="visually-hidden">Error: </span>}
          {toast.message}
        </p>
        {toast.reference && <p className={styles.reference}>Reference {toast.reference}</p>}
      </div>
      <button type="button" className={styles.close} aria-label="Dismiss message" onClick={() => dismiss(toast.id)}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
          <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}
