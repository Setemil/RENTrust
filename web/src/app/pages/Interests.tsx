import { Link, useParams } from "react-router";
import button from "../../components/Button.module.css";
import TitleBlock from "../../components/TitleBlock";
import { formStyles } from "../Form";
import { interestStatusLabel, rent, shortDate } from "../format";
import Traverse from "../Traverse";
import type { InterestRow, InterestStatus, SeekerInterest } from "../types";
import { Empty, ErrorNote, Loading, Page, Schedule, Section, Status, type BeaconState, uiStyles } from "../ui";
import { useAction, useApi } from "../useApi";
import table from "./Table.module.css";

export function interestBeacon(status: InterestStatus): BeaconState {
  if (status === "APPROVED") return "verified";
  if (status === "REJECTED") return "rejected";
  if (status === "WITHDRAWN") return "muted";
  return "pending";
}

export function InterestList() {
  const { data, error, loading, reload } = useApi<{ interests: InterestRow[] }>("/interests/mine");
  const interests = data?.interests ?? [];
  return (
    <Page title="My interests" intro="Every property you've shown interest in, and where each one stands.">
      {error && <ErrorNote message={error.message} retry={reload} />}
      {loading && !data && <Loading rows={5} />}
      {data && !interests.length && (
        <Empty
          title="You haven't shown interest in a property yet"
          action={
            <Link to="/app/listings" className={`${button.button} ${button.small}`}>
              Browse the marketplace
            </Link>
          }
        >
          Open a listing, read the landlord's terms, then show interest. The landlord sees a short character report and decides.
        </Empty>
      )}
      {interests.length > 0 && (
        <table className={table.table}>
          <thead>
            <tr>
              <th scope="col">Property</th>
              <th scope="col">Rent</th>
              <th scope="col">Shown interest</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {interests.map((i) => (
              <tr key={i.id}>
                <td data-label="Property">
                  <Link to={`/app/interests/${i.id}`} className={table.primary}>
                    {i.listing.title}
                  </Link>
                  <span className={table.sub}>
                    {i.listing.ref} · {i.listing.area}
                  </span>
                </td>
                <td data-label="Rent">{rent(i.listing.rentAmount, i.listing.rentPeriod)}</td>
                <td data-label="Shown interest">{shortDate(i.createdAt)}</td>
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

export function InterestDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi<{ view: string; interest: SeekerInterest }>(`/interests/${id}`);
  const withdraw = useAction();
  const back = { to: "/app/interests", label: "My interests" };

  if (loading && !data) return <Page title="Interest" back={back}><Loading rows={6} /></Page>;
  if (error || !data) return <Page title="Interest" back={back}><ErrorNote message={error?.message ?? "Not found"} retry={reload} /></Page>;

  const i = data.interest;
  const canWithdraw = ["REPORT_REQUESTED", "REPORT_READY", "AWAITING_DECISION"].includes(i.status);
  const headline: Record<string, string> = {
    APPROVED: "The landlord approved your interest. RENTrust will open inspection scheduling for you next.",
    REJECTED: "The landlord decided not to go ahead. Your account and checks are unaffected, and you can show interest in other listings.",
    WITHDRAWN: "You withdrew this interest.",
  };

  async function handleWithdraw() {
    if (await withdraw.run(`/interests/${i.id}/withdraw`, "POST")) reload();
  }

  return (
    <Page
      title={i.listing.title}
      back={back}
      intro={headline[i.status] ?? "Your character report goes to the landlord, who then approves or rejects your interest. You'll be notified either way."}
      actions={<Status state={interestBeacon(i.status)}>{interestStatusLabel[i.status]}</Status>}
    >
      <Section title="Progress" id="progress-title">
        <Traverse status={i.status} history={i.history} viewer="seeker" />
      </Section>
      <div className={uiStyles.twoCol} style={{ marginTop: "var(--space-5)" }}>
        <Section title="What you agreed to" id="agreed-title">
          <Schedule
            rows={[
              { label: "Listing", value: <Link to={`/app/listings/${i.listing.id}`}>{i.listing.ref}, {i.listing.area}</Link> },
              { label: "Rent", value: rent(i.listing.rentAmount, i.listing.rentPeriod) },
              { label: "Landlord's terms", value: `Version ${i.termsVersion}, accepted ${shortDate(i.termsAcceptedAt)}` },
              { label: i.lister.listedAs === "AGENT" ? "Agent" : "Landlord", value: i.lister.name },
              { label: "Your message", value: i.message ?? <span className={uiStyles.muted}>None</span> },
            ]}
          />
        </Section>
        <TitleBlock title="Your character report" meta={i.reportStatus === "READY" ? "Ready" : i.reportStatus === "REQUESTED" ? "Being prepared" : "–"}>
          <div className={uiStyles.stack}>
            <p className={uiStyles.small}>
              The landlord sees your name, account type, which of your checks are complete, and when you joined. Nothing else, and no scores.
              Each time they open it is logged.
            </p>
            {canWithdraw && (
              <>
                <button type="button" className={`${button.button} ${button.outline} ${button.small}`} onClick={handleWithdraw} disabled={withdraw.pending}>
                  {withdraw.pending ? "Withdrawing…" : "Withdraw interest"}
                </button>
                {withdraw.error && <p className={formStyles.alert} role="alert">{withdraw.error}</p>}
              </>
            )}
          </div>
        </TitleBlock>
      </div>
    </Page>
  );
}
