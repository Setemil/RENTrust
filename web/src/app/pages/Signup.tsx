import { useState, type FormEvent } from "react";
import button from "../../components/Button.module.css";
import type { RegisterInput } from "../api";
import AuthLayout from "../AuthLayout";
import { useAuth } from "../auth";
import { ChoiceGroup, Field, clearErrorOnInput, formStyles } from "../Form";
import styles from "./Signup.module.css";

const roleOptions = [
  { value: "SEEKER", label: "Renter" },
  { value: "LANDLORD", label: "Landlord" },
  { value: "AGENT", label: "Agent or manager" },
] as const;

const typeOptions = [
  { value: "IND", label: "An individual" },
  { value: "ORG", label: "An organisation" },
] as const;

const nextSteps = [
  { title: "Confirm your email", body: "So we can reach you about your rental." },
  { title: "Confirm your phone", body: "For inspection and rent reminders." },
  { title: "Verify your identity", body: "An ID check, or a business check for organisations." },
];

type Errors = Partial<Record<"firstName" | "lastName" | "orgName" | "email" | "phone" | "password", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(input: RegisterInput): Errors {
  const errors: Errors = {};
  if (input.userType === "IND") {
    if (!input.profile.firstName) errors.firstName = "Enter your first name.";
    if (!input.profile.lastName) errors.lastName = "Enter your last name.";
  } else if (!input.profile.orgName) {
    errors.orgName = "Enter your organisation's registered name.";
  }
  if (!EMAIL_RE.test(input.email)) errors.email = "Enter an email address like name@example.com.";
  if (input.phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a phone number, like 0801 234 5678.";
  if (input.password.length < 8) errors.password = "Use at least 8 characters.";
  return errors;
}

export default function Signup() {
  const { register } = useAuth();
  const [role, setRole] = useState<RegisterInput["role"]>("SEEKER");
  const [userType, setUserType] = useState<RegisterInput["userType"]>("IND");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();

    const input: RegisterInput = {
      email: text("email"),
      phone: text("phone"),
      password: String(data.get("password") ?? ""),
      userType,
      role,
      profile:
        userType === "IND" ? { firstName: text("firstName"), lastName: text("lastName") } : { orgName: text("orgName") },
    };

    const next = validate(input);
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await register(input);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      id="sign-up"
      heading="Create your account."
      intro="Everyone on RENTrust is checked. Start with your account, then finish these from your home page:"
      aside={
        <ol className={styles.steps}>
          {nextSteps.map((step, i) => (
            <li key={step.title}>
              <span className={styles.beacon} aria-hidden="true" />
              <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
              <span>
                <strong>{step.title}</strong>
                <span className={styles.stepBody}>{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      }
      blockTitle="Sign up"
      blockMeta="New account"
    >
      <title>Create an account | RENTrust</title>
      <form className={formStyles.form} onSubmit={handleSubmit} onInput={clearErrorOnInput(setErrors)} noValidate>
        {formError && (
          <p className={formStyles.alert} role="alert">
            {formError}
          </p>
        )}
        <ChoiceGroup legend="I'm joining as a" name="role" value={role} options={roleOptions} onChange={setRole} />
        <ChoiceGroup
          legend="Signing up as"
          name="userType"
          value={userType}
          options={typeOptions}
          onChange={setUserType}
        />
        {userType === "IND" ? (
          <div className={formStyles.row}>
            <Field label="First name" name="firstName" autoComplete="given-name" error={errors.firstName} />
            <Field label="Last name" name="lastName" autoComplete="family-name" error={errors.lastName} />
          </div>
        ) : (
          <Field label="Organisation name" name="orgName" autoComplete="organization" error={errors.orgName} />
        )}
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
        />
        <Field
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="0801 234 5678"
          error={errors.phone}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password}
        />
        <button type="submit" className={`${button.button} ${formStyles.submit}`} disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
