import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router";
import button from "../components/Button.module.css";
import Logo from "../components/Logo";
import { api } from "./api";
import { useAuth } from "./auth";
import { displayName, roleLabels } from "./user";
import styles from "./AppShell.module.css";

function Loading() {
  return (
    <p className={styles.loading} role="status">
      Loading your account…
    </p>
  );
}

type NavItem = { to: string; label: string; end?: boolean };

function navFor(roles: string[]): NavItem[] {
  const items: NavItem[] = [{ to: "/app", label: "Home", end: true }];
  if (roles.includes("ADMIN")) items.push({ to: "/app/admin", label: "Admin" });
  items.push({ to: "/app/listings", label: "Marketplace" });
  if (roles.includes("SEEKER")) items.push({ to: "/app/interests", label: "My interests" });
  if (roles.includes("LANDLORD") || roles.includes("AGENT")) {
    items.push({ to: "/app/properties", label: "My properties" }, { to: "/app/enquiries", label: "Enquiries" });
  }
  return items;
}

function useUnreadCount() {
  const { token } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () =>
      api<{ unread: number }>("/notifications/unread-count", { token })
        .then((r) => !cancelled && setUnread(r.unread))
        .catch(() => {});
    load();
    const timer = window.setInterval(load, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, location.pathname]);
  return unread;
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z" strokeLinejoin="round" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

// Signed-in area. Sends guests to /login, remembering where they were going.
export function AppLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const unread = useUnreadCount();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const nav = navFor(user.roles);
  const links = nav.map((item) => (
    <NavLink key={item.to} to={item.to} end={item.end}>
      {item.label}
    </NavLink>
  ));

  return (
    <div className={styles.app}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/app" className={styles.home} aria-label="RENTrust home">
            <Logo />
          </Link>
          <nav aria-label="Main" className={styles.nav}>
            {links}
          </nav>
          <NavLink
            to="/app/notifications"
            className={styles.bell}
            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          >
            <BellIcon />
            {unread > 0 && <span className={styles.badge}>{unread > 99 ? "99+" : unread}</span>}
          </NavLink>
          <NavLink to="/app/profile" className={styles.who}>
            <span>{displayName(user)}</span>
            <span className={styles.role}>{user.roles.map((r) => roleLabels[r]).join(", ")}</span>
          </NavLink>
          <button type="button" className={`${button.button} ${button.outline} ${button.small}`} onClick={logout}>
            Sign out
          </button>
        </div>
        <nav aria-label="Main" className={styles.mobileNav}>
          {links}
          <NavLink to="/app/profile">Profile</NavLink>
        </nav>
      </header>
      <p className={styles.testStrip}>
        <strong>Test build.</strong> Identity checks, character reports, emails and SMS are simulated. Nothing here is a real listing.
      </p>
      <main id="main">
        <Outlet />
      </main>
    </div>
  );
}

// Sign-in and sign-up. Already signed-in users go straight to the app.
export function GuestLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const onLogin = location.pathname === "/login";

  if (loading) return <Loading />;
  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/app"} replace />;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.home} aria-label="RENTrust home">
            <Logo />
          </Link>
          <p className={styles.switch}>
            {onLogin ? "New to RENTrust?" : "Already registered?"}{" "}
            <Link to={onLogin ? "/signup" : "/login"} state={location.state}>
              {onLogin ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
