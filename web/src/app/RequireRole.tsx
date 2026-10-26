import type { ReactNode } from "react";
import { Link } from "react-router";
import type { RoleName } from "./api";
import { useAuth } from "./auth";
import { Empty, Page } from "./ui";

// Client-side guard for role-specific pages. The server enforces the same rules on every route.
export default function RequireRole({ roles, children }: { roles: RoleName[]; children: ReactNode }) {
  const { user } = useAuth();
  if (user && user.roles.some((r) => roles.includes(r))) return <>{children}</>;
  return (
    <Page title="Not available">
      <Empty title="This part of RENTrust isn't for your account type" action={<Link to="/app">Back to home</Link>}>
        It's for {roles.map((r) => ({ SEEKER: "renters", LANDLORD: "landlords", AGENT: "agents", OFFICER: "inspection officers", ADMIN: "RENTrust admins" })[r]).join(" and ")}.
      </Empty>
    </Page>
  );
}
