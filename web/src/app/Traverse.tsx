import { dateTime } from "./format";
import type { HistoryEntry, InterestStatus } from "./types";
import styles from "./Traverse.module.css";

const rank: Record<InterestStatus, number> = {
  INITIATED: 0,
  TERMS_ACCEPTED: 1,
  KYC_CONFIRMED: 2,
  REPORT_REQUESTED: 3,
  REPORT_READY: 4,
  AWAITING_DECISION: 5,
  APPROVED: 6,
  REJECTED: 6,
  WITHDRAWN: 6,
};

type StationState = "done" | "current" | "todo" | "rejected" | "muted";
type Station = { title: string; note: string; state: StationState; at?: string };

function stationsFor(status: InterestStatus, history: HistoryEntry[], viewer: "seeker" | "lister"): Station[] {
  const r = rank[status];
  const at = (s: InterestStatus) => history.find((h) => h.status === s)?.at;
  const withdrawn = status === "WITHDRAWN";
  const decided = status === "APPROVED" || status === "REJECTED";
  const landlord = viewer === "seeker" ? "The landlord" : "You";

  return [
    { title: "Terms accepted", note: "The exact version is on record.", state: r >= 1 ? "done" : "todo", at: at("TERMS_ACCEPTED") },
    { title: "Identity confirmed", note: "Checked against the verified account.", state: r >= 2 ? "done" : "todo", at: at("KYC_CONFIRMED") },
    {
      title: "Character report",
      note: r >= 4 ? "Ready for the landlord." : r === 3 && !withdrawn ? "Being prepared now." : "Requested automatically.",
      state: r >= 4 ? "done" : r === 3 ? (withdrawn ? "muted" : "current") : "todo",
      at: at("REPORT_READY"),
    },
    {
      title: "Landlord review",
      note: decided ? `${landlord} reviewed the report.` : status === "AWAITING_DECISION" ? `${landlord === "You" ? "You have" : "The landlord has"} opened the report.` : r === 4 ? `Waiting for ${landlord === "You" ? "you" : "the landlord"} to open the report.` : "After the report is ready.",
      state: decided ? "done" : r === 4 || r === 5 ? (withdrawn ? "muted" : "current") : "todo",
      at: at("AWAITING_DECISION"),
    },
    {
      title: status === "APPROVED" ? "Approved" : status === "REJECTED" ? "Not approved" : withdrawn ? "Withdrawn" : "Decision",
      note: status === "APPROVED" ? "Inspection scheduling opens next." : status === "REJECTED" ? "This interest is closed." : withdrawn ? "No decision was needed." : "Approve or reject.",
      state: status === "APPROVED" ? "done" : status === "REJECTED" ? "rejected" : withdrawn ? "muted" : "todo",
      at: at(status) && r === 6 ? at(status) : undefined,
    },
    { title: "Inspection", note: "Arrives in a later release.", state: "muted" },
  ];
}

// The interest's route drawn as a survey traverse: solid between stations already walked,
// dashed ahead. Green beacons mark what has been verified or approved.
export default function Traverse({ status, history, viewer }: { status: InterestStatus; history: HistoryEntry[]; viewer: "seeker" | "lister" }) {
  const stations = stationsFor(status, history, viewer);
  return (
    <ol className={styles.traverse} aria-label="Progress">
      {stations.map((s, i) => (
        <li key={s.title} className={styles.station} data-state={s.state} data-walked={stations[i + 1] && s.state === "done" && stations[i + 1].state !== "todo" && stations[i + 1].state !== "muted" ? "" : undefined}>
          <span className={styles.beacon} aria-hidden="true" />
          <div className={styles.text}>
            <p className={styles.title}>
              {s.title}
              <span className="visually-hidden">
                {s.state === "done" ? " (done)" : s.state === "current" ? " (in progress)" : s.state === "rejected" ? " (closed)" : ""}
              </span>
            </p>
            <p className={styles.note}>{s.note}</p>
            {s.at && <p className={styles.at}>{dateTime(s.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
