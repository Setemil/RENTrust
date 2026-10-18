import { useState, type FormEvent } from "react";
import button from "../../components/Button.module.css";
import AuthLayout from "../AuthLayout";
import { useAuth } from "../auth";
import { Field, clearErrorOnInput, formStyles } from "../Form";

export default function Login() {
  const { login } = useAuth();
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const next: typeof errors = {};
    if (!email) next.email = "Enter your email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      id="sign-in"
      heading="Welcome back."
      intro="Sign in to see your account and where each of your checks stands."
      blockTitle="Sign in"
      blockMeta="Account access"
    >
      <title>Sign in | RENTrust</title>
      <form className={formStyles.form} onSubmit={handleSubmit} onInput={clearErrorOnInput(setErrors)} noValidate>
        {formError && (
          <p className={formStyles.alert} role="alert">
            {formError}
          </p>
        )}
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
          autoFocus
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
        />
        <button type="submit" className={`${button.button} ${formStyles.submit}`} disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
