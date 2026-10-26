import { useState, type FormEvent } from "react";
import button from "../../components/Button.module.css";
import TitleBlock from "../../components/TitleBlock";
import { api } from "../api";
import { useAuth } from "../auth";
import { Field, clearErrorOnInput, formStyles } from "../Form";
import { Page } from "../ui";
import { displayName, formatDate, roleLabels } from "../user";
import styles from "./Profile.module.css";

type PasswordErrors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

function ChangePassword() {
  const { token } = useAuth();
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    const next: PasswordErrors = {};
    if (!currentPassword) next.currentPassword = "Enter your current password.";
    if (newPassword.length < 8) next.newPassword = "Use at least 8 characters.";
    else if (newPassword === currentPassword) next.newPassword = "Choose a password different from your current one.";
    if (confirmPassword !== newPassword) next.confirmPassword = "This doesn't match the new password.";
    setErrors(next);
    setFormError("");
    setSaved(false);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await api("/auth/password", { method: "PATCH", token, body: { currentPassword, newPassword } });
      form.reset();
      setSaved(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={formStyles.form} onSubmit={handleSubmit} onInput={clearErrorOnInput(setErrors)} noValidate>
      {formError && (
        <p className={formStyles.alert} role="alert">
          {formError}
        </p>
      )}
      <Field
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword}
      />
      <Field
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.newPassword}
      />
      <Field
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword}
      />
      <button type="submit" className={`${button.button} ${formStyles.submit}`} disabled={submitting}>
        {submitting ? "Saving…" : "Update password"}
      </button>
      <p className={formStyles.status} role="status">
        {saved ? "Password updated. Use the new one next time you sign in." : ""}
      </p>
    </form>
  );
}

export default function Profile() {
  const user = useAuth().user!;
  const isOrg = user.userType === "ORG";

  const details = [
    { label: isOrg ? "Organisation" : "Name", value: displayName(user) },
    { label: "Email address", value: user.email },
    { label: "Phone number", value: user.phone },
    { label: "Joining as", value: user.roles.map((role) => roleLabels[role]).join(", ") },
    { label: "Account type", value: isOrg ? "Organisation" : "Individual" },
    { label: "Member since", value: formatDate(user.createdAt) },
  ];

  return (
    <Page title="Your profile" intro="The details RENTrust holds for your account.">
      <div className={styles.layout}>
        <TitleBlock title="Account details" meta={user.status === "ACTIVE" ? "Active" : "Suspended"}>
          <dl className={styles.details}>
            {details.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </TitleBlock>
        <TitleBlock title="Change password" meta="Security">
          <ChangePassword />
        </TitleBlock>
      </div>
    </Page>
  );
}
