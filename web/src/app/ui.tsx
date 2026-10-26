import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import styles from "./ui.module.css";

type PageProps = {
  title: string;
  intro?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
};

// The signed-in page frame: back link, h1, intro and actions, then content. No sheet border.
export function Page({ title, intro, back, actions, children }: PageProps) {
  return (
    <div className={styles.page}>
      <title>{`${title} | RENTrust`}</title>
      <header className={styles.pageHead}>
        <div className={styles.pageTitle}>
          {back && (
            <Link to={back.to} className={styles.back}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                <path d="M9 2 4 7l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {back.label}
            </Link>
          )}
          <h1>{title}</h1>
          {intro && <p className={styles.intro}>{intro}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export type BeaconState = "verified" | "pending" | "open" | "rejected" | "muted";

// A survey beacon plus a label. Green only when something is verified, approved or live.
export function Status({ state, children, size = "md" }: { state: BeaconState; children: ReactNode; size?: "sm" | "md" }) {
  return (
    <span className={`${styles.status} ${size === "sm" ? styles.statusSm : ""}`} data-state={state}>
      <span className={styles.beacon} aria-hidden="true" />
      {children}
    </span>
  );
}

export function Schedule({ rows, compact = false }: { rows: { label: string; value: ReactNode }[]; compact?: boolean }) {
  return (
    <dl className={`${styles.schedule} ${compact ? styles.compact : ""}`}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, meta, children, id }: { title: string; meta?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h2 id={id}>{title}</h2>
        {meta && <div className={styles.sectionMeta}>{meta}</div>}
      </div>
      {children}
    </section>
  );
}

export function Tabs({ items, label }: { items: { to: string; label: string; count?: number; end?: boolean }[]; label: string }) {
  return (
    <nav className={styles.tabs} aria-label={label}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end ?? true}>
          {item.label}
          {item.count ? <span className={styles.count}>{item.count}</span> : null}
        </NavLink>
      ))}
    </nav>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <path d="M6 30 13 8l20 6-3 18Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
        {[[6, 30], [13, 8], [33, 14], [30, 32]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="var(--film)" stroke="currentColor" strokeWidth="1.5" />
        ))}
      </svg>
      <p className={styles.emptyTitle}>{title}</p>
      {children && <div className={styles.emptyBody}>{children}</div>}
      {action}
    </div>
  );
}

export function Loading({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div className={styles.skeleton} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} style={{ width: `${92 - ((i * 17) % 35)}%` }} />
      ))}
    </div>
  );
}

export function ErrorNote({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className={styles.errorNote} role="alert">
      <p>{message}</p>
      {retry && (
        <button type="button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

// Shown wherever an external provider is simulated, so testers never mistake it for the real thing.
export function TestNote({ children }: { children: ReactNode }) {
  return (
    <p className={styles.testNote}>
      <span>Test mode</span> {children}
    </p>
  );
}

export { styles as uiStyles };
