import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import button from "../../components/Button.module.css";
import AuthLayout from "../AuthLayout";
import { Field, clearErrorOnInput, formStyles } from "../Form";
import { useAction } from "../useApi";

// Step 2 of a password reset: the emailed link opens this page with ?token=…. On success the
// server sends a toast and every other session is signed out, so the person signs in afresh.

type Errors = Partial<Record<"newPassword" | "confirmPassword", string>>;

export default function ResetPassword() {
  const token = useSearchParams()[0].get("token");
  const navigate = useNavigate();
  const action = useAction();
  const [errors, setErrors] = useState<Errors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    const next: Errors = {};
    if (newPassword.length < 8) next.newPassword = "Use at least 8 characters.";
    if (confirmPassword !== newPassword) next.confirmPassword = "This doesn't match the new password.";
    setErrors(next);
    if (Object.keys(next).length) return;

    if (await action.run("/auth/password/reset", "POST", { token, newPassword })) navigate("/login", { replace: true });
  }

  return (
    <AuthLayout
      id="reset-password"
      heading="Choose a new password."
      intro="Saving a new password signs you out on every other device, so nobody can keep using the old one."
      blockTitle="New password"
      blockMeta="Account access"
    >
      <title>New password | RENTrust</title>
      {token ? (
        <form className={formStyles.form} onSubmit={handleSubmit} onInput={clearErrorOnInput(setErrors)} noValidate>
          {action.error && (
            <p className={formStyles.alert} role="alert">
              {action.error}
            </p>
          )}
          <Field
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            error={errors.newPassword}
            autoFocus
          />
          <Field
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword}
          />
          <button type="submit" className={`${button.button} ${formStyles.submit}`} disabled={action.pending}>
            {action.pending ? "Saving…" : "Save new password"}
          </button>
        </form>
      ) : (
        <p className={formStyles.alert} role="alert">
          This link is incomplete. Open the link from the email again, or ask for a new one.
        </p>
      )}
      <p className={formStyles.foot}>
        Link expired? <Link to="/forgot-password">Ask for a new one</Link>
      </p>
    </AuthLayout>
  );
}
