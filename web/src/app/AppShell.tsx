import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router";
import button from "../components/Button.module.css";
import Logo from "../components/Logo";
import { useAuth } from "./auth";
import { displayName } from "./user";
import styles from "./AppShell.module.css";

function Loading() {
  return (
    <p className={styles.loading} role="status">
      Loading your account…
    </p>
  );
}

// Signed-in area: header with nav and sign-out. Sends guests to /login, remembering where they were going.
export function AppLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/app" className={styles.home} aria-label="RENTrust home">
            <Logo />
          </Link>
          <nav aria-label="Account" className={styles.nav}>
            <NavLink to="/app" end>
              Home
            </NavLink>
            <NavLink to="/app/profile">Profile</NavLink>
          </nav>
          <span className={styles.who}>{displayName(user)}</span>
          <button type="button" className={`${button.button} ${button.outline} ${button.small}`} onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main>
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
