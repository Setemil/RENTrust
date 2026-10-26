import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import button from "../../components/Button.module.css";
import TitleBlock from "../../components/TitleBlock";
import { useAuth } from "../auth";
import { CheckField, Field, SelectField, clearErrorOnInput, formStyles } from "../Form";
import { shortDate } from "../format";
import type { AccountStatus } from "../types";
import { Loading, ErrorNote, Page, Section, Status, TestNote, uiStyles, type BeaconState } from "../ui";
import { useAction, useApi } from "../useApi";
import { greetingName } from "../user";
import styles from "./Home.module.css";

type CheckKey = "email" | "phone" | "terms" | "identity";

function OtpPanel({ channel, onDone }: { channel: "EMAIL" | "PHONE"; onDone: () => void }) {
  const send = useAction();
  const verify = useAction();
  const [sent, setSent] = useState<{ sentTo: string; testCode?: string } | null>(null);
  const [codeError, setCodeError] = useState("");

  async function handleSend() {
    const result = await send.run<{ sentTo: string; testCode?: string }>("/account/otp/send", "POST", { channel });
    if (result) setSent(result);
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    if (!/^\d{6}$/.test(code)) return setCodeError("Enter the 6-digit code.");
    setCodeError("");
    if (await verify.run("/account/otp/verify", "POST", { channel, code })) onDone();
  }

  if (!sent) {
    return (
      <div className={styles.panel}>
        <p className={uiStyles.small}>We'll send a 6-digit code {channel === "EMAIL" ? "to your email address" : "by SMS to your phone"}.</p>
        {send.error && <p className={formStyles.alert} role="alert">{send.error}</p>}
        <div className={formStyles.actionsRow}>
          <button type="button" className={`${button.button} ${button.small}`} onClick={handleSend} disabled={send.pending}>
            {send.pending ? "Sending…" : "Send code"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className={`${styles.panel} ${formStyles.form}`} onSubmit={handleVerify} noValidate>
      <p className={uiStyles.small}>
        Code sent to <strong>{sent.sentTo}</strong>. It expires in 10 minutes.
      </p>
      {sent.testCode && (
        <TestNote>
          {channel === "EMAIL" ? "Email" : "SMS"} isn't connected yet, so here is your code: <strong className={styles.code}>{sent.testCode}</strong>
        </TestNote>
      )}
      {verify.error && <p className={formStyles.alert} role="alert">{verify.error}</p>}
      <div className={styles.inline}>
        <Field label="Code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} error={codeError} autoFocus />
        <button type="submit" className={`${button.button}`} disabled={verify.pending}>
          {verify.pending ? "Checking…" : "Confirm"}
        </button>
      </div>
      <button type="button" className={uiStyles.linkButton} onClick={handleSend} disabled={send.pending}>
        Send a new code
      </button>
    </form>
  );
}

function TermsPanel({ version, onDone }: { version: string; onDone: () => void }) {
  const accept = useAction();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!checked) return setError("Tick the box to accept.");
    if (await accept.run("/account/consents", "POST", { kinds: ["TERMS_OF_SERVICE", "PRIVACY_POLICY"] })) onDone();
  }

  return (
    <form className={`${styles.panel} ${formStyles.form}`} onSubmit={handleSubmit} noValidate>
      <p className={uiStyles.small}>
        The terms explain what RENTrust checks, who sees your details and how long they are kept. Your acceptance is recorded with the
        document version and time.
      </p>
      <TestNote>The legal documents are still drafts (version {version}).</TestNote>
      {accept.error && <p className={formStyles.alert} role="alert">{accept.error}</p>}
      <CheckField checked={checked} onChange={(e) => { setChecked(e.target.checked); setError(""); }} error={error}>
        I accept the RENTrust Terms of Service and Privacy Notice.
      </CheckField>
      <button type="submit" className={`${button.button} ${button.small} ${formStyles.submit}`} disabled={accept.pending}>
        {accept.pending ? "Saving…" : "Accept"}
      </button>
    </form>
  );
}

const idTypes = [
  { value: "NIN", label: "National Identity Number (NIN)" },
  { value: "PASSPORT", label: "International passport" },
  { value: "DRIVERS_LICENCE", label: "Driver's licence" },
  { value: "VOTERS_CARD", label: "Voter's card" },
];

type IdErrors = Partial<Record<"idNumber" | "dateOfBirth" | "registeredName" | "rcNumber" | "representativeName" | "representativeRole", string>>;

function IdentityPanel({ isOrg, onDone }: { isOrg: boolean; onDone: () => void }) {
  const submit = useAction();
  const [errors, setErrors] = useState<IdErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const next: IdErrors = {};
    if (isOrg) {
      if (!data.registeredName?.trim()) next.registeredName = "Enter the name registered with CAC.";
      if (!/^(RC|BN|IT)?\s?\d{4,10}$/i.test(data.rcNumber?.trim() ?? "")) next.rcNumber = "Enter the CAC number, like RC 1234567.";
      if (!data.representativeName?.trim()) next.representativeName = "Enter the name of the person acting for the organisation.";
      if (!data.representativeRole?.trim()) next.representativeRole = "Enter their role, like Director.";
    } else {
      if (!/^[A-Za-z0-9 ]{6,24}$/.test(data.idNumber?.trim() ?? "")) next.idNumber = "Enter the number exactly as it appears on the document.";
      if (!data.dateOfBirth) next.dateOfBirth = "Enter your date of birth.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    if (await submit.run("/account/verification", "POST", data)) onDone();
  }

  return (
    <form className={`${styles.panel} ${formStyles.form}`} onSubmit={handleSubmit} onInput={clearErrorOnInput(setErrors)} noValidate>
      <TestNote>
        No KYC provider is connected yet. A RENTrust admin reviews your details by hand, and only the last four characters of an ID number
        are stored.
      </TestNote>
      {submit.error && <p className={formStyles.alert} role="alert">{submit.error}</p>}
      {isOrg ? (
        <>
          <div className={formStyles.row}>
            <Field label="Registered name" name="registeredName" autoComplete="organization" error={errors.registeredName} />
            <Field label="CAC number" name="rcNumber" placeholder="RC 1234567" error={errors.rcNumber} />
          </div>
          <div className={formStyles.row}>
            <Field label="Representative's full name" name="representativeName" autoComplete="name" error={errors.representativeName} />
            <Field label="Their role" name="representativeRole" placeholder="Director" error={errors.representativeRole} />
          </div>
        </>
      ) : (
        <>
          <SelectField label="ID document" name="idType" options={idTypes} defaultValue="NIN" />
          <div className={formStyles.row}>
            <Field label="ID number" name="idNumber" autoComplete="off" error={errors.idNumber} />
            <Field label="Date of birth" name="dateOfBirth" type="date" autoComplete="bday" error={errors.dateOfBirth} />
          </div>
        </>
      )}
      <button type="submit" className={`${button.button} ${formStyles.submit}`} disabled={submit.pending}>
        {submit.pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

type Row = {
  key: CheckKey;
  name: string;
  detail: ReactNode;
  state: BeaconState;
  status: string;
  action?: string;
  blockedBy?: string;
};

function rowsFor(s: AccountStatus, user: { email: string; phone: string; userType: string }): Row[] {
  const isOrg = user.userType === "ORG";
  const contactDone = s.emailVerified && s.phoneVerified && s.termsAccepted;
  const v = s.verification;
  const identity: Row = {
    key: "identity",
    name: isOrg ? "Business check" : "Identity check",
    detail: isOrg ? "CAC registration and an authorised representative" : "A government-issued ID",
    state: "open",
    status: "Not started",
    action: "Start",
    blockedBy: contactDone ? undefined : "Finish the checks above first.",
  };
  if (s.kycStatus === "PENDING") Object.assign(identity, { state: "pending", status: "In review", action: undefined, detail: `Submitted ${shortDate(v?.createdAt ?? null)}. RENTrust will let you know here.` });
  if (s.kycStatus === "VERIFIED") Object.assign(identity, { state: "verified", status: "Verified", action: undefined, detail: v?.reviewedAt ? `Verified ${shortDate(v.reviewedAt)}` : identity.detail });
  if (s.kycStatus === "REJECTED") Object.assign(identity, { state: "rejected", status: "Not approved", action: "Resubmit", detail: v?.reviewNote ? `RENTrust's note: ${v.reviewNote}` : identity.detail });

  return [
    { key: "email", name: "Email address", detail: user.email, state: s.emailVerified ? "verified" : "open", status: s.emailVerified ? "Confirmed" : "Not confirmed", action: s.emailVerified ? undefined : "Confirm" },
    { key: "phone", name: "Phone number", detail: user.phone, state: s.phoneVerified ? "verified" : "open", status: s.phoneVerified ? "Confirmed" : "Not confirmed", action: s.phoneVerified ? undefined : "Confirm" },
    { key: "terms", name: "Terms and privacy notice", detail: s.termsAccepted ? `Accepted, version ${s.consentVersion}` : "What RENTrust checks and who sees what", state: s.termsAccepted ? "verified" : "open", status: s.termsAccepted ? "Accepted" : "Not accepted", action: s.termsAccepted ? undefined : "Review" },
    identity,
  ];
}

function NextSteps({ roles, verified }: { roles: string[]; verified: boolean }) {
  const items: { to: string; label: string; body: string }[] = [];
  if (roles.includes("ADMIN")) items.push({ to: "/app/admin", label: "Open the review queue", body: "Identity checks, property documents and listings waiting for a decision." });
  if (roles.includes("SEEKER")) {
    items.push({ to: "/app/listings", label: "Browse the marketplace", body: verified ? "Every listed property and lister has been checked." : "You can browse now. Showing interest needs your identity check." });
    items.push({ to: "/app/interests", label: "Track your interests", body: "Where each one stands, from the landlord's terms to their decision." });
  }
  if (roles.includes("LANDLORD") || roles.includes("AGENT")) {
    items.push({ to: "/app/properties/new", label: "List a property", body: verified ? "Add details, set your terms, then send it for review." : "You can prepare a draft now and submit it once your identity check is verified." });
    items.push({ to: "/app/enquiries", label: "Review enquiries", body: "Character reports and approve or reject decisions." });
  }
  return (
    <TitleBlock title="What you can do" meta={verified ? "Unlocked" : "Partly unlocked"}>
      <ul className={styles.next}>
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to}>{item.label}</Link>
            <p>{item.body}</p>
          </li>
        ))}
      </ul>
    </TitleBlock>
  );
}

export default function Home() {
  const { user, refresh } = useAuth();
  const { data, error, loading, reload } = useApi<AccountStatus>("/account/status");
  const [open, setOpen] = useState<CheckKey | null>(null);

  const done = async () => {
    setOpen(null);
    await refresh();
    reload();
  };

  if (!user) return null;
  const rows = data ? rowsFor(data, user) : [];
  const complete = rows.filter((r) => r.state === "verified").length;
  const intro = !data
    ? "Checking where your account stands…"
    : complete === rows.length
      ? "Every check on your account is complete."
      : `${complete} of ${rows.length} checks complete. Each one unlocks more of RENTrust.`;

  return (
    <Page title={`Hello, ${greetingName(user)}.`} intro={intro}>
      <div className={uiStyles.twoCol}>
        <Section title="Your checks" meta={data ? `${complete} of ${rows.length} complete` : undefined} id="checks-title">
          {loading && !data && <Loading rows={4} label="Loading your checks" />}
          {error && <ErrorNote message={error.message} retry={reload} />}
          {data && (
            <ol className={styles.checks}>
              {rows.map((row) => (
                <li key={row.key} className={styles.row} data-open={open === row.key || undefined}>
                  <div className={styles.line}>
                    <Status state={row.state}>
                      <span className="visually-hidden">{row.status}</span>
                    </Status>
                    <div className={styles.what}>
                      <h3>{row.name}</h3>
                      <p>{row.detail}</p>
                    </div>
                    <p className={styles.status} data-state={row.state}>
                      {row.status}
                    </p>
                    <div className={styles.act}>
                      {row.action && !row.blockedBy && (
                        <button
                          type="button"
                          className={uiStyles.linkButton}
                          aria-expanded={open === row.key}
                          onClick={() => setOpen(open === row.key ? null : row.key)}
                        >
                          {open === row.key ? "Close" : row.action}
                        </button>
                      )}
                      {row.action && row.blockedBy && <span className={uiStyles.muted}>{row.blockedBy}</span>}
                    </div>
                  </div>
                  {open === "email" && row.key === "email" && <OtpPanel channel="EMAIL" onDone={done} />}
                  {open === "phone" && row.key === "phone" && <OtpPanel channel="PHONE" onDone={done} />}
                  {open === "terms" && row.key === "terms" && <TermsPanel version={data.consentVersion} onDone={done} />}
                  {open === "identity" && row.key === "identity" && <IdentityPanel isOrg={user.userType === "ORG"} onDone={done} />}
                </li>
              ))}
              <li className={styles.row}>
                <div className={styles.line}>
                  <Status state="muted">
                    <span className="visually-hidden">Not available yet</span>
                  </Status>
                  <div className={styles.what}>
                    <h3>Two-step sign-in</h3>
                    <p>A code on each sign-in. Arrives in a later release.</p>
                  </div>
                  <p className={styles.status} data-state="muted">
                    Not available yet
                  </p>
                  <div className={styles.act} />
                </div>
              </li>
            </ol>
          )}
        </Section>
        <NextSteps roles={user.roles} verified={user.kycStatus === "VERIFIED"} />
      </div>
    </Page>
  );
}
