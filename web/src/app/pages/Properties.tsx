import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import button from "../../components/Button.module.css";
import TitleBlock from "../../components/TitleBlock";
import { useAuth } from "../auth";
import { Field, SelectField, TextAreaField, formStyles } from "../Form";
import { furnishingLabel, listingStatusLabel, money, rent, shortDate, typeLabel } from "../format";
import PlotMark from "../PlotMark";
import type { ListingStatus, OwnProperty } from "../types";
import { Empty, ErrorNote, Loading, Page, Schedule, Section, Status, TestNote, type BeaconState, uiStyles } from "../ui";
import { useAction, useApi } from "../useApi";
import { TermsList } from "./ListingDetail";
import { TermsFields, readTerms } from "./PropertyForm";
import styles from "./Properties.module.css";
import table from "./Table.module.css";

export function listingBeacon(status: ListingStatus): BeaconState {
  if (status === "LIVE") return "verified";
  if (status === "PENDING_REVIEW") return "pending";
  if (status === "SUSPENDED") return "rejected";
  if (status === "DRAFT") return "open";
  return "muted";
}

const openCount = (p: OwnProperty) =>
  (p.listing.interestCounts.REPORT_READY ?? 0) + (p.listing.interestCounts.AWAITING_DECISION ?? 0);

export function PropertyList() {
  const { data, error, loading, reload } = useApi<{ properties: OwnProperty[] }>("/properties");
  const properties = data?.properties ?? [];
  const add = (
    <Link to="/app/properties/new" className={`${button.button} ${button.small}`}>
      List a property
    </Link>
  );
  return (
    <Page title="My properties" intro="Each property is checked separately from you. Listings go live after RENTrust's review." actions={properties.length ? add : undefined}>
      {error && <ErrorNote message={error.message} retry={reload} />}
      {loading && !data && <Loading rows={5} />}
      {data && !properties.length && (
        <Empty title="No properties yet" action={add}>
          Add the details, rent and every charge, and your terms. Then submit your ownership documents (or your letter of authority, for agents) for review.
        </Empty>
      )}
      {properties.length > 0 && (
        <table className={table.table}>
          <thead>
            <tr>
              <th scope="col">Property</th>
              <th scope="col">Rent</th>
              <th scope="col">Documents</th>
              <th scope="col">Listing</th>
              <th scope="col">Enquiries</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id}>
                <td data-label="Property">
                  <div className={styles.cell}>
                    <PlotMark refCode={p.listing.ref} verified={p.verificationStatus === "VERIFIED"} size={36} />
                    <div>
                      <Link to={`/app/properties/${p.id}`} className={table.primary}>
                        {p.title}
                      </Link>
                      <span className={table.sub}>
                        {p.listing.ref} · {p.area}
                      </span>
                    </div>
                  </div>
                </td>
                <td data-label="Rent">{rent(p.listing.rentAmount, p.listing.rentPeriod)}</td>
                <td data-label="Documents">
                  <Status state={p.verificationStatus === "VERIFIED" ? "verified" : p.verificationStatus === "PENDING" ? "pending" : p.verificationStatus === "REJECTED" ? "rejected" : "open"} size="sm">
                    {{ VERIFIED: "Verified", PENDING: "In review", REJECTED: "Not approved", NOT_STARTED: "Not submitted" }[p.verificationStatus]}
                  </Status>
                </td>
                <td data-label="Listing">
                  <Status state={listingBeacon(p.listing.status)} size="sm">
                    {listingStatusLabel[p.listing.status]}
                  </Status>
                </td>
                <td data-label="Enquiries">
                  {openCount(p) ? (
                    <Link to="/app/enquiries">
                      <strong>{openCount(p)} to decide</strong>
                    </Link>
                  ) : (
                    <span className={uiStyles.muted}>None waiting</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Page>
  );
}

const evidence = {
  OWNERSHIP: [
    { value: "CERTIFICATE_OF_OCCUPANCY", label: "Certificate of Occupancy (C of O)" },
    { value: "DEED_OF_ASSIGNMENT", label: "Deed of Assignment" },
    { value: "GOVERNORS_CONSENT", label: "Governor's Consent" },
    { value: "SURVEY_PLAN", label: "Registered survey plan" },
    { value: "OTHER", label: "Other title document" },
  ],
  MANDATE: [
    { value: "LETTER_OF_AUTHORITY", label: "Letter of authority from the owner" },
    { value: "MANAGEMENT_AGREEMENT", label: "Property management agreement" },
    { value: "POWER_OF_ATTORNEY", label: "Power of attorney" },
    { value: "OTHER", label: "Other authority document" },
  ],
};

function SubmitPanel({ property, onDone }: { property: OwnProperty; onDone: () => void }) {
  const submit = useAction();
  const [refError, setRefError] = useState("");
  const kind = property.listedAs === "AGENT" ? "MANDATE" : "OWNERSHIP";
  const needsEvidence = property.verificationStatus === "NOT_STARTED" || property.verificationStatus === "REJECTED";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (needsEvidence && !String(data.reference ?? "").trim()) return setRefError("Enter the document's reference or number.");
    if (await submit.run(`/properties/${property.id}/submit`, "POST", data)) onDone();
  }

  return (
    <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
      {needsEvidence && (
        <>
          <SelectField label={kind === "MANDATE" ? "Your authority to let it" : "Proof of ownership"} name="documentType" options={evidence[kind]} />
          <Field label="Document reference or number" name="reference" error={refError} onInput={() => setRefError("")} placeholder={kind === "MANDATE" ? "LOA/2026/014" : "C of O LA/2019/0457"} />
          <TextAreaField label="Anything the reviewer should know (optional)" name="notes" rows={2} maxLength={500} />
          <TestNote>Document upload arrives with the secure document vault. For now, enter the reference and an admin checks it by hand.</TestNote>
        </>
      )}
      {submit.error && <p className={formStyles.alert} role="alert">{submit.error}</p>}
      <button type="submit" className={`${button.button} ${formStyles.submit}`} disabled={submit.pending}>
        {submit.pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

function TermsEditor({ property, onDone, onCancel }: { property: OwnProperty; onDone: () => void; onCancel: () => void }) {
  const save = useAction();
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await save.run(`/properties/${property.id}/terms`, "PUT", readTerms(new FormData(event.currentTarget)))) onDone();
  }
  const current = property.listing.terms[0];
  return (
    <form className={`${formStyles.form} ${styles.editor}`} onSubmit={handleSubmit} noValidate>
      <p className={`${uiStyles.small} ${uiStyles.muted}`}>
        Saving creates version {current.version + 1}. Renters who accepted version {current.version} keep that record; anyone showing interest from now on accepts the new one.
      </p>
      <TermsFields initial={current.content} />
      {save.error && <p className={formStyles.alert} role="alert">{save.error}</p>}
      <div className={formStyles.actionsRow}>
        <button type="submit" className={button.button} disabled={save.pending}>
          {save.pending ? "Saving…" : `Save as version ${current.version + 1}`}
        </button>
        <button type="button" className={`${button.button} ${button.outline}`} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function PathToLive({ property, verified, onChange }: { property: OwnProperty; verified: boolean; onChange: () => void }) {
  const status = property.listing.status;
  const docs = property.verificationStatus;
  const steps: { label: string; state: BeaconState; note: string }[] = [
    { label: "Your identity", state: verified ? "verified" : "open", note: verified ? "Verified." : "Finish your identity check on Home first." },
    {
      label: property.listedAs === "AGENT" ? "Your authority to let it" : "Ownership documents",
      state: docs === "VERIFIED" ? "verified" : docs === "PENDING" ? "pending" : docs === "REJECTED" ? "rejected" : "open",
      note:
        docs === "VERIFIED" ? "Verified by RENTrust." : docs === "PENDING" ? "Being checked." : docs === "REJECTED" ? `Not approved. ${property.verification?.reviewNote ?? ""}` : "Submitted with the listing.",
    },
    {
      label: "Listing review",
      state: status === "LIVE" || status === "PAUSED" || status === "OCCUPIED" ? "verified" : status === "PENDING_REVIEW" ? "pending" : status === "SUSPENDED" ? "rejected" : "open",
      note: status === "PENDING_REVIEW" ? "RENTrust is checking the details and charges." : status === "DRAFT" ? "Starts when you submit." : status === "SUSPENDED" ? "Suspended by RENTrust." : "Approved.",
    },
  ];
  return (
    <TitleBlock title="Path to live" meta={listingStatusLabel[status]}>
      <div className={uiStyles.stack}>
        <ol className={styles.path}>
          {steps.map((s) => (
            <li key={s.label}>
              <Status state={s.state}>{s.label}</Status>
              <p>{s.note}</p>
            </li>
          ))}
        </ol>
        {status === "DRAFT" && property.listing.reviewNote && (
          <p className={formStyles.alert}>RENTrust's note: {property.listing.reviewNote}</p>
        )}
        {status === "SUSPENDED" && property.listing.reviewNote && <p className={formStyles.alert}>RENTrust's note: {property.listing.reviewNote}</p>}
        {status === "DRAFT" && (verified ? <SubmitPanel property={property} onDone={onChange} /> : <Link to="/app" className={`${button.button} ${button.small}`}>Finish your identity check</Link>)}
      </div>
    </TitleBlock>
  );
}

function Availability({ property, onChange }: { property: OwnProperty; onChange: () => void }) {
  const act = useAction();
  const status = property.listing.status;
  const actions = [
    status === "LIVE" && { action: "PAUSE", label: "Pause listing", note: "Hidden from the marketplace until you resume." },
    (status === "PAUSED" || status === "OCCUPIED") && { action: "RESUME", label: "Make it live again", note: "Back in the marketplace straight away." },
    (status === "LIVE" || status === "PAUSED") && { action: "MARK_OCCUPIED", label: "Mark as let", note: "For when it's taken, on or off RENTrust." },
  ].filter(Boolean) as { action: string; label: string; note: string }[];
  if (!actions.length) return null;
  return (
    <TitleBlock title="Availability" meta={listingStatusLabel[status]}>
      <div className={uiStyles.stack}>
        {act.error && <p className={formStyles.alert} role="alert">{act.error}</p>}
        {actions.map((a) => (
          <div key={a.action} className={styles.availability}>
            <button
              type="button"
              className={`${button.button} ${button.small} ${a.action === "RESUME" ? "" : button.outline}`}
              disabled={act.pending}
              onClick={async () => (await act.run(`/properties/${property.id}/availability`, "POST", { action: a.action })) && onChange()}
            >
              {a.label}
            </button>
            <span className={`${uiStyles.small} ${uiStyles.muted}`}>{a.note}</span>
          </div>
        ))}
      </div>
    </TitleBlock>
  );
}

export function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<{ property: OwnProperty }>(`/properties/${id}`);
  const [editingTerms, setEditingTerms] = useState(false);
  const back = { to: "/app/properties", label: "My properties" };

  if (loading && !data) return <Page title="Property" back={back}><Loading rows={8} /></Page>;
  if (error || !data) return <Page title="Property" back={back}><ErrorNote message={error?.message ?? "Not found"} retry={reload} /></Page>;

  const p = data.property;
  const l = p.listing;
  const current = l.terms[0];
  const counts = l.interestCounts;
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <Page
      title={p.title}
      back={back}
      intro={`${l.ref} · ${typeLabel[p.type]} · ${p.area}, ${p.state === "FCT Abuja" ? "Abuja" : p.state}`}
      actions={
        <>
          {l.status === "DRAFT" && (
            <Link to={`/app/properties/${p.id}/edit`} className={`${button.button} ${button.outline} ${button.small}`}>
              Edit details
            </Link>
          )}
          <Link to={`/app/listings/${l.id}`} className={`${button.button} ${button.outline} ${button.small}`}>
            See it as a renter
          </Link>
        </>
      }
    >
      <div className={uiStyles.twoCol}>
        <div className={uiStyles.stack}>
          <Section
            title="Enquiries"
            meta={total ? <Link to="/app/enquiries">Open enquiries</Link> : undefined}
            id="enquiries-title"
          >
            {total ? (
              <Schedule
                compact
                rows={[
                  { label: "Waiting for your decision", value: (counts.REPORT_READY ?? 0) + (counts.AWAITING_DECISION ?? 0) },
                  { label: "Report being prepared", value: counts.REPORT_REQUESTED ?? 0 },
                  { label: "Approved", value: counts.APPROVED ?? 0 },
                  { label: "Rejected or withdrawn", value: (counts.REJECTED ?? 0) + (counts.WITHDRAWN ?? 0) },
                ]}
              />
            ) : (
              <p className={uiStyles.muted}>{l.status === "LIVE" ? "No enquiries yet." : "Enquiries arrive once the listing is live."}</p>
            )}
          </Section>

          <Section
            title="Your terms"
            meta={
              !editingTerms && l.status !== "SUSPENDED" ? (
                <button type="button" className={uiStyles.linkButton} onClick={() => setEditingTerms(true)}>
                  Change terms
                </button>
              ) : undefined
            }
            id="terms-title"
          >
            {editingTerms ? (
              <TermsEditor property={p} onCancel={() => setEditingTerms(false)} onDone={() => { setEditingTerms(false); reload(); }} />
            ) : (
              <TermsList content={current.content} version={current.version} effectiveAt={current.effectiveAt} />
            )}
            {l.terms.length > 1 && !editingTerms && (
              <details className={styles.history}>
                <summary>Earlier versions ({l.terms.length - 1})</summary>
                <ul>
                  {l.terms.slice(1).map((t) => (
                    <li key={t.id}>
                      Version {t.version}, from {shortDate(t.effectiveAt)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Section>

          <Section title="Details" id="details-title">
            <Schedule
              rows={[
                { label: "Address", value: p.address },
                { label: "LGA or city", value: p.lga },
                ...(p.type !== "OFFICE" ? [{ label: "Bedrooms", value: p.bedrooms }] : []),
                { label: "Bathrooms", value: p.bathrooms },
                ...(p.sizeSqm ? [{ label: "Size", value: `${p.sizeSqm} m²` }] : []),
                { label: "Finish", value: furnishingLabel[p.furnishing] },
                { label: "Rent", value: rent(l.rentAmount, l.rentPeriod) },
                ...(l.serviceCharge ? [{ label: "Service charge", value: money(l.serviceCharge) }] : []),
                ...l.otherCharges.map((c) => ({ label: c.label, value: money(c.amount) })),
                { label: "Amenities", value: p.amenities.join(", ") || "None listed" },
              ]}
            />
          </Section>
        </div>
        <div className={uiStyles.stack}>
          <PathToLive property={p} verified={user?.kycStatus === "VERIFIED"} onChange={reload} />
          <Availability property={p} onChange={reload} />
        </div>
      </div>
    </Page>
  );
}
