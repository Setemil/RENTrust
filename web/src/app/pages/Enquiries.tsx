import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import button from "../../components/Button.module.css";
import TitleBlock from "../../components/TitleBlock";
import { TextAreaField, formStyles } from "../Form";
import { dateTime, interestStatusLabel, rent, shortDate } from "../format";
import Traverse from "../Traverse";
import type { CharacterReport, InterestRow, ListerInterest } from "../types";
import { Empty, ErrorNote, Loading, Page, Schedule, Section, Status, TestNote, uiStyles } from "../ui";
import { useAuth } from "../auth";
import { useAction, useApi } from "../useApi";
import { TermsList } from "./ListingDetail";
import { interestBeacon } from "./Interests";
import styles from "./Enquiries.module.css";
import table from "./Table.module.css";

const groups = {
  decide: { label: "Needs your decision", statuses: ["REPORT_READY", "AWAITING_DECISION"] },
  waiting: { label: "Report in progress", statuses: ["REPORT_REQUESTED", "INITIATED", "TERMS_ACCEPTED", "KYC_CONFIRMED"] },
  closed: { label: "Decided", statuses: ["APPROVED", "REJECTED", "WITHDRAWN"] },
} as const;
type Group = keyof typeof groups;

export function EnquiryList() {
  const [params, setParams] = useSearchParams();
  const group = (params.get("show") as Group | null) ?? "decide";
  const { data, error, loading, reload } = useApi<{ interests: InterestRow[] }>("/interests/received");
  const all = data?.interests ?? [];
  const count = (g: Group) => all.filter((i) => (groups[g].statuses as readonly string[]).includes(i.status)).length;
  const rows = all.filter((i) => (groups[group].statuses as readonly string[]).includes(i.status));

  return (
    <Page title="Enquiries" intro="Verified renters who accepted your terms. Open each character report, then approve or reject.">
      <div role="tablist" aria-label="Enquiry groups" className={styles.filters}>
        {(Object.keys(groups) as Group[]).map((g) => (
          <button key={g} type="button" role="tab" aria-selected={group === g} onClick={() => setParams(g === "decide" ? {} : { show: g })}>
            {groups[g].label}
            {data && <span>{count(g)}</span>}
          </button>
        ))}
      </div>
      {error && <ErrorNote message={error.message} retry={reload} />}
      {loading && !data && <Loading rows={5} />}
      {data && !rows.length && (
        <Empty title={group === "decide" ? "Nothing waiting for you" : group === "waiting" ? "No reports in progress" : "No decisions yet"}>
          {all.length
            ? "Check the other groups above."
            : "When a verified renter accepts your terms and shows interest, it appears here with their character report."}
        </Empty>
      )}
      {rows.length > 0 && (
        <table className={table.table}>
          <thead>
            <tr>
              <th scope="col">Renter</th>
              <th scope="col">Property</th>
              <th scope="col">Received</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td data-label="Renter">
                  <Link to={`/app/enquiries/${i.id}`} className={table.primary}>
                    {i.seeker?.name}
                  </Link>
                  <span className={table.sub}>
                    {i.seeker?.accountType === "ORG" ? "Organisation" : "Individual"}
                    {i.seeker?.identityVerified ? ", identity verified" : ""}
                  </span>
                </td>
                <td data-label="Property">
                  {i.listing.title}
                  <span className={table.sub}>{i.listing.ref}</span>
                </td>
                <td data-label="Received">{shortDate(i.createdAt)}</td>
                <td data-label="Status">
                  <Status state={interestBeacon(i.status)}>{interestStatusLabel[i.status]}</Status>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Page>
  );
}

function ReportPanel({ interest, onOpened }: { interest: ListerInterest; onOpened: () => void }) {
  const open = useAction();
  const [report, setReport] = useState<CharacterReport | null>(null);
  const status = interest.report?.status;

  async function handleOpen() {
    const result = await open.run<CharacterReport>(`/interests/${interest.id}/report`, "GET");
    if (result) {
      setReport(result);
      onOpened();
    }
  }

  if (status !== "READY") {
    return (
      <TitleBlock title="Character report" meta="Being prepared">
        <div className={uiStyles.stack}>
          <p className={uiStyles.small}>RENTrust has requested the report. You'll get a notification when it's ready; this page updates when you reload it.</p>
          <TestNote>The simulated provider returns a report within a few seconds.</TestNote>
        </div>
      </TitleBlock>
    );
  }

  if (!report) {
    return (
      <TitleBlock title="Character report" meta={`Ready ${shortDate(interest.report!.reportDate)}`}>
        <div className={uiStyles.stack}>
          <p className={uiStyles.small}>
            Opening the report is recorded with your name and the time. {interest.report!.timesOpened > 0 && `It has been opened ${interest.report!.timesOpened} ${interest.report!.timesOpened === 1 ? "time" : "times"}.`}
          </p>
          {open.error && <p className={formStyles.alert} role="alert">{open.error}</p>}
          <button type="button" className={`${button.button} ${formStyles.submit}`} onClick={handleOpen} disabled={open.pending}>
            {open.pending ? "Opening…" : "Open report"}
          </button>
        </div>
      </TitleBlock>
    );
  }

  const r = report.report;
  const yes = (v: boolean) => (v ? <Status state="verified" size="sm">Confirmed</Status> : <Status state="open" size="sm">Not confirmed</Status>);
  return (
    <TitleBlock title="Character report" meta={r.providerRef ?? ""}>
      <div className={uiStyles.stack}>
        <Schedule
          compact
          rows={[
            { label: "Name", value: r.payload.name },
            { label: "Account type", value: r.payload.accountType },
            { label: "Identity", value: r.payload.identityCheck.includes("passed") ? <Status state="verified" size="sm">{r.payload.identityCheck}</Status> : r.payload.identityCheck },
            ...(r.payload.identityCheckedOn ? [{ label: "Checked on", value: shortDate(r.payload.identityCheckedOn) }] : []),
            { label: "Email", value: yes(r.payload.emailConfirmed) },
            { label: "Phone", value: yes(r.payload.phoneConfirmed) },
            { label: "On RENTrust since", value: shortDate(r.payload.memberSince) },
            { label: "Tenancy references", value: r.payload.tenancyReferences },
          ]}
        />
        <dl className={styles.provenance}>
          <div>
            <dt>Source</dt>
            <dd>{r.source}</dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{r.provider}</dd>
          </div>
          <div>
            <dt>Report date</dt>
            <dd>{shortDate(r.reportDate)}</dd>
          </div>
          <div>
            <dt>Deleted after</dt>
            <dd>{shortDate(r.retainUntil)}</dd>
          </div>
        </dl>
        <details className={styles.log}>
          <summary>Access log ({report.accessLog.length})</summary>
          <ul>
            {report.accessLog.map((a) => (
              <li key={a.at}>
                {a.by}, {dateTime(a.at)}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </TitleBlock>
  );
}

function DecisionPanel({ interest, onDecided }: { interest: ListerInterest; onDecided: () => void }) {
  const decide = useAction();
  const [choice, setChoice] = useState<"APPROVE" | "REJECT" | null>(null);

  if (interest.status === "APPROVED" || interest.status === "REJECTED") {
    return (
      <TitleBlock title="Your decision" meta={shortDate(interest.decidedAt)}>
        <div className={uiStyles.stack}>
          <Status state={interestBeacon(interest.status)}>{interest.status === "APPROVED" ? "Approved" : "Rejected"}</Status>
          <p className={uiStyles.small}>
            {interest.status === "APPROVED"
              ? "The renter has been told. Inspection scheduling, with an officer assigned by RENTrust, arrives in a later release."
              : "The renter was told the interest won't go ahead, without your reason."}
          </p>
          {interest.decisionReason && (
            <Schedule compact rows={[{ label: "Internal note", value: interest.decisionReason }]} />
          )}
        </div>
      </TitleBlock>
    );
  }

  if (interest.status === "WITHDRAWN") {
    return (
      <TitleBlock title="Decision" meta="Not needed">
        <p className={uiStyles.small}>The renter withdrew their interest.</p>
      </TitleBlock>
    );
  }

  const ready = interest.status === "AWAITING_DECISION";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choice) return;
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (await decide.run(`/interests/${interest.id}/decision`, "PATCH", { decision: choice, reason: reason || undefined })) onDecided();
  }

  return (
    <TitleBlock title="Your decision" meta={ready ? "Ready" : "Open the report first"}>
      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        {!ready && <p className={uiStyles.small}>You can decide once you've opened the character report.</p>}
        {decide.error && <p className={formStyles.alert} role="alert">{decide.error}</p>}
        <div className={styles.choices} role="radiogroup" aria-label="Decision">
          {(["APPROVE", "REJECT"] as const).map((c) => (
            <label key={c} className={styles.choice} data-disabled={!ready || undefined}>
              <input type="radio" name="decision" value={c} checked={choice === c} onChange={() => setChoice(c)} disabled={!ready} />
              <span>
                <strong>{c === "APPROVE" ? "Approve interest" : "Reject interest"}</strong>
                {c === "APPROVE" ? "The renter is told and inspection opens next." : "The renter is told it won't go ahead. Your reason is not shared."}
              </span>
            </label>
          ))}
        </div>
        {choice && (
          <TextAreaField
            label="Internal note (optional)"
            name="reason"
            rows={2}
            maxLength={500}
            hint="Kept for RENTrust's records. Never shown to the renter."
          />
        )}
        <button type="submit" className={`${button.button} ${formStyles.submit}`} disabled={!ready || !choice || decide.pending}>
          {decide.pending ? "Saving…" : choice === "REJECT" ? "Confirm rejection" : choice === "APPROVE" ? "Confirm approval" : "Choose an option"}
        </button>
      </form>
    </TitleBlock>
  );
}

export function EnquiryDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<{ view: string; canDecide: boolean; interest: ListerInterest }>(`/interests/${id}`);
  const isAdmin = user?.roles.includes("ADMIN") && !user.roles.some((r) => r === "LANDLORD" || r === "AGENT");
  const back = isAdmin ? { to: "/app/admin/interests", label: "Admin" } : { to: "/app/enquiries", label: "Enquiries" };

  if (loading && !data) return <Page title="Enquiry" back={back}><Loading rows={6} /></Page>;
  if (error || !data) return <Page title="Enquiry" back={back}><ErrorNote message={error?.message ?? "Not found"} retry={reload} /></Page>;

  const i = data.interest;
  return (
    <Page
      title={i.seeker.name}
      back={back}
      intro={`Interested in ${i.listing.title} (${i.listing.ref}). Received ${shortDate(i.createdAt)}.`}
      actions={<Status state={interestBeacon(i.status)}>{interestStatusLabel[i.status]}</Status>}
    >
      <Section title="Progress" id="progress-title">
        <Traverse status={i.status} history={i.history} viewer="lister" />
      </Section>
      <div className={uiStyles.twoCol} style={{ marginTop: "var(--space-5)" }}>
        <div className={uiStyles.stack}>
          <Section title="The renter" id="renter-title">
            <Schedule
              rows={[
                { label: "Name", value: i.seeker.name },
                { label: "Account", value: i.seeker.accountType === "ORG" ? "Organisation" : "Individual" },
                { label: "Identity", value: <Status state={i.seeker.identityVerified ? "verified" : "pending"} size="sm">{i.seeker.identityVerified ? "Verified by RENTrust" : "Not verified"}</Status> },
                { label: "Their message", value: i.message ?? <span className={uiStyles.muted}>None</span> },
              ]}
            />
          </Section>
          <Section title="Terms they accepted" meta={`Version ${i.terms.version}, ${shortDate(i.termsAcceptedAt)}`} id="terms-title">
            <TermsList content={i.terms.content} version={i.terms.version} />
          </Section>
          <Section title="Property" id="property-title">
            <Schedule
              rows={[
                { label: "Listing", value: `${i.listing.ref}, ${i.listing.title}` },
                { label: "Area", value: `${i.listing.area}, ${i.listing.state}` },
                { label: "Rent", value: rent(i.listing.rentAmount, i.listing.rentPeriod) },
              ]}
            />
          </Section>
        </div>
        <div className={`${uiStyles.stack} ${styles.side}`}>
          <ReportPanel interest={i} onOpened={reload} />
          {data.canDecide ? (
            <DecisionPanel interest={i} onDecided={reload} />
          ) : (
            <TitleBlock title="Decision" meta="Lister only">
              <p className={uiStyles.small}>Only the landlord or agent who listed the property can approve or reject. Your report access is logged like theirs.</p>
            </TitleBlock>
          )}
        </div>
      </div>
    </Page>
  );
}
