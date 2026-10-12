import { useId, useState, type FormEvent } from "react";
import { CONTACT_EMAIL, cities, roles } from "../content";
import button from "./Button.module.css";
import styles from "./WaitlistForm.module.css";

function waitlistEmail(form: HTMLFormElement) {
  const data = new FormData(form);
  const role = roles.find((r) => r.value === data.get("role"))?.label;
  const subject = `RENTrust waitlist: ${data.get("city")}`;
  const body = [`Email: ${data.get("email")}`, `City: ${data.get("city")}`, `Role: ${role}`].join("\n");
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function WaitlistForm() {
  const id = useId();
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = waitlistEmail(event.currentTarget);
    setSent(true);
  }

  function handleInvalid(event: FormEvent<HTMLInputElement>) {
    event.preventDefault();
    setEmailError("Enter your email address, like name@example.com.");
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor={`${id}-email`}>Email address</label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? `${id}-email-error` : undefined}
          onInvalid={handleInvalid}
          onInput={() => setEmailError("")}
        />
        {emailError && (
          <p id={`${id}-email-error`} className={styles.error}>
            {emailError}
          </p>
        )}
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={`${id}-role`}>I am a</label>
          <select id={`${id}-role`} name="role">
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-city`}>City</label>
          <select id={`${id}-city`} name="city">
            {cities.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className={button.button}>
        Join the waitlist
      </button>
      <p className={styles.status} role="status">
        {sent ? (
          <>
            Your email app should open with your details. Send it to join. Nothing opened? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </>
        ) : (
          "Opens your email app with your details filled in."
        )}
      </p>
    </form>
  );
}
