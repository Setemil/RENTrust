import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import button from "../../components/Button.module.css";
import AuthLayout from "../AuthLayout";
import { Field, formStyles } from "../Form";
import { TestNote, uiStyles } from "../ui";
import { useAction } from "../useApi";

// Step 1 of a password reset: ask for the email, then say a link is on its way. The server gives
// the same answer whether or not the account exists, so this page does too.

type Sent = { email: string; expiresInMinutes: number; testLink?: string };

// The server builds the link for its own CLIENT_URL; keep only the path so it opens here.
const pathOf = (link: string) => {
  const url = new URL(link);
  return url.pathname + url.search;
};

export default function ForgotPassword() {
  const action = useAction();
  const [emailError, setEmailError] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) return setEmailError("Enter your email address.");
    setEmailError("");
    const result = await action.run<Omit<Sent, "email">>("/auth/password/forgot", "POST", { email });
    if (result) setSent({ ...result, email });
  }

  return (
    <AuthLayout
      id="forgot-password"
      heading="Set a new password."
      intro="Enter the email you use for RENTrust and we'll send you a link to choose a new password."
      blockTitle="Forgot password"
      blockMeta="Account access"
    >
      <title>Forgot password | RENTrust</title>
      {sent ? (
        <div className={formStyles.form}>
          <p className={formStyles.status} role="status">
            If an account uses <strong>{sent.email}</strong>, we've sent it a link. The link works once and expires in{" "}
            {sent.expiresInMinutes} minutes.
          </p>
          {sent.testLink && (
            <TestNote>
              Email isn't connected yet, so here is your link: <Link to={pathOf(sent.testLink)}>Set a new password</Link>
            </TestNote>
          )}
          <p className={uiStyles.small}>
            Nothing arrived? Check your spam folder, or{" "}
            <button type="button" className={uiStyles.linkButton} onClick={() => setSent(null)}>
              try a different email
            </button>
            .
          </p>
        </div>
      ) : (
        <form className={formStyles.form} onSubmit={handleSubmit} onInput={() => setEmailError("")} noValidate>
          {action.error && (
            <p className={formStyles.alert} role="alert">
              {action.error}
            </p>
          )}
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={emailError}
            autoFocus
          />
          <button type="submit" className={`${button.button} ${formStyles.submit}`} disabled={action.pending}>
            {action.pending ? "Sending…" : "Send link"}
          </button>
        </form>
      )}
      <p className={formStyles.foot}>
        Remembered it? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
