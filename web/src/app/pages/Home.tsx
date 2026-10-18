import { Link } from "react-router";
import Sheet from "../../components/Sheet";
import type { KycStatus, User } from "../api";
import { useAuth } from "../auth";
import { greetingName } from "../user";
import styles from "./Home.module.css";

type CheckState = "verified" | "pending" | "rejected" | "open";

type Check = { name: string; detail: string; state: CheckState; status: string; unlocks: string };

const kycStatus: Record<KycStatus, [CheckState, string]> = {
  NOT_STARTED: ["open", "Not started"],
  PENDING: ["pending", "In review"],
  VERIFIED: ["verified", "Verified"],
  REJECTED: ["rejected", "Not approved"],
};

function checksFor(user: User): Check[] {
  const lists = user.roles.some((role) => role === "LANDLORD" || role === "AGENT");
  const [idState, idStatus] = kycStatus[user.kycStatus];
  return [
    {
      name: "Email address",
      detail: user.email,
      state: user.emailVerified ? "verified" : "open",
      status: user.emailVerified ? "Verified" : "Not confirmed",
      unlocks: "Account recovery and updates about your rental.",
    },
    {
      name: "Phone number",
      detail: user.phone,
      state: user.phoneVerified ? "verified" : "open",
      status: user.phoneVerified ? "Verified" : "Not confirmed",
      unlocks: "Inspection and rent reminders.",
    },
    {
      name: user.userType === "ORG" ? "Business check" : "Identity check",
      detail: user.userType === "ORG" ? "Registration and directors" : "Government-issued ID",
      state: idState,
      status: idStatus,
      unlocks: lists ? "Listing a property. Each property is then checked separately." : "The verified listings and showing interest in a property.",
    },
    {
      name: "Two-step sign-in",
      detail: "A code on each sign-in",
      state: user.mfaEnabled ? "verified" : "open",
      status: user.mfaEnabled ? "On" : "Off",
      unlocks: lists ? "Required for landlords and agents before listing." : "Extra protection for your account and payments.",
    },
  ];
}

function summary(done: number, total: number) {
  if (done === 0) return "Your account is set up. Complete the checks below to unlock RENTrust.";
  if (done === total) return "Every check on your account is complete.";
  return `${done} of ${total} checks complete. Finish the rest to unlock more of RENTrust.`;
}

export default function Home() {
  const user = useAuth().user!;
  const checks = checksFor(user);
  const done = checks.filter((check) => check.state === "verified").length;

  return (
    <Sheet
      id="home"
      sheet={{ number: 1, total: 2, scale: 50 }}
      headingLevel={1}
      title={`Hello, ${greetingName(user)}.`}
      intro={summary(done, checks.length)}
    >
      <title>Home | RENTrust</title>
      <section aria-labelledby="checks-title" className={styles.schedule}>
        <div className={styles.head}>
          <h2 id="checks-title">Your checks</h2>
          <p>
            {done} of {checks.length} complete
          </p>
        </div>
        <ul>
          {checks.map((check) => (
            <li key={check.name} className={styles.row} data-state={check.state}>
              <span className={styles.beacon} aria-hidden="true" />
              <div className={styles.what}>
                <h3>{check.name}</h3>
                <p>{check.detail}</p>
              </div>
              <p className={styles.status}>{check.status}</p>
              <p className={styles.unlocks}>
                <span>{check.state === "verified" ? "Unlocked" : "Unlocks"}</span> {check.unlocks}
              </p>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Ways to complete each check will appear here as they go live. Your details are on your{" "}
          <Link to="/app/profile">profile</Link>.
        </p>
      </section>
    </Sheet>
  );
}
