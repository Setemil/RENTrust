import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Outlet, useSearchParams } from "react-router";
import button from "../../components/Button.module.css";
import { Field, SelectField, TextAreaField, formStyles } from "../Form";
import { dateTime, interestStatusLabel, listingStatusLabel, money, rent, shortDate, termsRows, typeLabel } from "../format";
import type { ListingStatus, RentPeriod, TermsContent } from "../types";
import { Empty, ErrorNote, Loading, Page, Schedule, Status, Tabs, uiStyles } from "../ui";
import { useAction, useApi } from "../useApi";
import { interestBeacon } from "./Interests";
import { listingBeacon } from "./Properties";
import styles from "./Admin.module.css";
import table from "./Table.module.css";

type Overview = { peopleChecks: number; propertyChecks: number; listings: number; awaiting: number; users: number; live: number };

export function AdminLayout() {
  const { data } = useApi<Overview>("/admin/overview");
  return (
    <Page title="Admin" intro="Review identity and property checks, moderate listings, and see what every account has done.">
      <Tabs
        label="Admin sections"
        items={[
          { to: "/app/admin", label: "People checks", count: data?.peopleChecks },
          { to: "/app/admin/properties", label: "Property documents", count: data?.propertyChecks },
          { to: "/app/admin/listings", label: "Listings", count: data?.listings },
          { to: "/app/admin/interests", label: "Interests" },
          { to: "/app/admin/users", label: "Users" },
          { to: "/app/admin/audit", label: "Audit log" },
        ]}
      />
      <Outlet />
    </Page>
  );
}

// Approve straight away, or open a note field to reject / send back. Notes go to the person.
function DecisionBar({
  approveLabel,
  rejectLabel,
  onDecide,
  approveBlocked,
}: {
  approveLabel: string;
  rejectLabel: string;
  onDecide: (decision: "APPROVE" | "REJECT", note?: string) => Promise<boolean>;
  approveBlocked?: string;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [pending, setPending] = useState(false);
  const [noteError, setNoteError] = useState("");

  async function go(decision: "APPROVE" | "REJECT", note?: string) {
    setPending(true);
    const ok = await onDecide(decision, note);
    if (!ok) setPending(false);
  }

  async function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "").trim();
    if (!note) return setNoteError("Say what needs fixing. They'll see this note.");
    await go("REJECT", note);
  }

  if (rejecting) {
    return (
      <form className={`${formStyles.form} ${styles.reject}`} onSubmit={handleReject} noValidate>
        <TextAreaField label="Note to the person" name="note" rows={2} maxLength={500} error={noteError} autoFocus onInput={() => setNoteError("")} />
        <div className={formStyles.actionsRow}>
          <button type="submit" className={`${button.button} ${button.small}`} disabled={pending}>
            {pending ? "Saving…" : rejectLabel}
          </button>
          <button type="button" className={uiStyles.linkButton} onClick={() => setRejecting(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }
  return (
    <div className={styles.decide}>
      <button type="button" className={`${button.button} ${button.small}`} disabled={pending || Boolean(approveBlocked)} onClick={() => go("APPROVE")}>
        {approveLabel}
      </button>
      <button type="button" className={`${button.button} ${button.outline} ${button.small}`} disabled={pending} onClick={() => setRejecting(true)}>
        {rejectLabel}…
      </button>
      {approveBlocked && <span className={`${uiStyles.small} ${uiStyles.muted}`}>{approveBlocked}</span>}
    </div>
  );
}

type VerificationRow = {
  id: string;
  subjectType: "USER" | "PROPERTY";
  kind: "IDENTITY" | "BUSINESS" | "OWNERSHIP" | "MANDATE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  data: Record<string, string>;
  provider: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  submittedBy: { id: string; name: string; email: string; phone: string; userType: string; kycStatus: string; emailVerified: boolean; phoneVerified: boolean };
  property?: { id: string; title: string; address: string; area: string; state: string; ref: string | null; listedAs: string };
};

const kindLabel = { IDENTITY: "Identity (KYC)", BUSINESS: "Business (KYB)", OWNERSHIP: "Ownership", MANDATE: "Agent's authority" };
const fieldLabel: Record<string, string> = {
  idType: "ID document",
  idNumber: "ID number (masked)",
  dateOfBirth: "Date of birth",
  registeredName: "Registered name",
  rcNumber: "CAC number",
  representativeName: "Representative",
  representativeRole: "Their role",
  documentType: "Document",
  reference: "Reference",
  notes: "Notes",
};
const valueLabel: Record<string, string> = {
  NIN: "NIN",
  PASSPORT: "International passport",
  DRIVERS_LICENCE: "Driver's licence",
  VOTERS_CARD: "Voter's card",
  CERTIFICATE_OF_OCCUPANCY: "Certificate of Occupancy",
  DEED_OF_ASSIGNMENT: "Deed of Assignment",
  GOVERNORS_CONSENT: "Governor's Consent",
  SURVEY_PLAN: "Survey plan",
  LETTER_OF_AUTHORITY: "Letter of authority",
  MANAGEMENT_AGREEMENT: "Management agreement",
  POWER_OF_ATTORNEY: "Power of attorney",
  OTHER: "Other",
};

function StatusFilter({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className={styles.filter}>
      <SelectField label="Show" name="status" value={value} onChange={(e) => onChange(e.target.value)} options={options} />
    </div>
  );
}

function Checks({ subject }: { subject: "USER" | "PROPERTY" }) {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "PENDING";
  const { data, error, loading, reload } = useApi<{ verifications: VerificationRow[] }>(`/admin/verifications?subject=${subject}&status=${status}`);
  const review = useAction();
  const rows = data?.verifications ?? [];

  const decide = async (id: string, decision: "APPROVE" | "REJECT", note?: string) => {
    const ok = Boolean(await review.run(`/admin/verifications/${id}`, "PATCH", { decision, note }));
    if (ok) reload();
    return ok;
  };

  return (
    <>
      <StatusFilter
        value={status}
        onChange={(v) => setParams(v === "PENDING" ? {} : { status: v })}
        options={[
          { value: "PENDING", label: "Waiting for review" },
          { value: "APPROVED", label: "Approved" },
          { value: "REJECTED", label: "Rejected" },
        ]}
      />
      {review.error && <p className={formStyles.alert} role="alert">{review.error}</p>}
      {error && <ErrorNote message={error.message} retry={reload} />}
      {loading && !data && <Loading rows={5} />}
      {data && !rows.length && (
        <Empty title={status === "PENDING" ? "The queue is clear" : "Nothing here"}>
          {status === "PENDING" ? (subject === "USER" ? "New identity and business checks appear here when someone submits them." : "Ownership and authority documents appear here when a lister submits a listing.") : undefined}
        </Empty>
      )}
      <ul className={styles.queue}>
        {rows.map((v) => (
          <li key={v.id} className={styles.item}>
            <div className={styles.itemHead}>
              <div>
                <h2>{v.property ? v.property.title : v.submittedBy.name}</h2>
                <p className={uiStyles.muted}>
                  {kindLabel[v.kind]} · submitted {dateTime(v.createdAt)}
                </p>
              </div>
              <Status state={v.status === "APPROVED" ? "verified" : v.status === "REJECTED" ? "rejected" : "pending"}>
                {v.status === "PENDING" ? "Waiting" : v.status === "APPROVED" ? "Approved" : "Rejected"}
              </Status>
            </div>
            <div className={styles.itemBody}>
              <Schedule
                compact
                rows={Object.entries(v.data)
                  .filter(([, value]) => value)
                  .map(([k, value]) => ({ label: fieldLabel[k] ?? k, value: valueLabel[value] ?? value }))}
              />
              <Schedule
                compact
                rows={[
                  ...(v.property
                    ? [
                        { label: "Listing", value: v.property.ref ?? "–" },
                        { label: "Address", value: `${v.property.address}, ${v.property.state}` },
                        { label: "Submitted by", value: `${v.submittedBy.name} (${v.property.listedAs === "AGENT" ? "agent" : "owner"})` },
                      ]
                    : [
                        { label: "Account", value: v.submittedBy.userType === "ORG" ? "Organisation" : "Individual" },
                        { label: "Email", value: <>{v.submittedBy.email} {v.submittedBy.emailVerified && <Status state="verified" size="sm">Confirmed</Status>}</> },
                        { label: "Phone", value: <>{v.submittedBy.phone} {v.submittedBy.phoneVerified && <Status state="verified" size="sm">Confirmed</Status>}</> },
                      ]),
                  ...(v.reviewedAt ? [{ label: "Reviewed", value: `${shortDate(v.reviewedAt)}${v.reviewedBy ? ` by ${v.reviewedBy}` : ""}` }] : []),
                  ...(v.reviewNote ? [{ label: "Note", value: v.reviewNote }] : []),
                ]}
              />
            </div>
            {v.status === "PENDING" && (
              <DecisionBar approveLabel="Approve" rejectLabel="Reject" onDecide={(d, note) => decide(v.id, d, note)} />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export const PeopleChecks = () => <Checks subject="USER" />;
export const PropertyChecks = () => <Checks subject="PROPERTY" />;

type AdminListing = {
  id: string;
  ref: string;
  status: ListingStatus;
  reviewNote: string | null;
  rentAmount: number;
  rentPeriod: RentPeriod;
  serviceCharge: number | null;
  otherCharges: { label: string; amount: number }[];
  updatedAt: string;
  publishedAt: string | null;
  property: { id: string; type: "RESIDENTIAL" | "SHORT_LET" | "OFFICE"; title: string; address: string; area: string; lga: string; state: string; bedrooms: number; bathrooms: number; description: string; verificationStatus: string; listedAs: string };
  lister: { name: string; email: string; kycStatus: string };
  terms: { version: number; content: TermsContent } | null;
};

export function AdminListings() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "PENDING_REVIEW";
  const { data, error, loading, reload } = useApi<{ listings: AdminListing[] }>(`/admin/listings?status=${status}`);
  const moderate = useAction();
  const rows = data?.listings ?? [];

  const act = async (id: string, action: string, note?: string) => {
    const ok = Boolean(await moderate.run(`/admin/listings/${id}`, "PATCH", { action, note }));
    if (ok) reload();
    return ok;
  };

  return (
    <>
      <StatusFilter
        value={status}
        onChange={(v) => setParams(v === "PENDING_REVIEW" ? {} : { status: v })}
        options={(["PENDING_REVIEW", "LIVE", "PAUSED", "OCCUPIED", "SUSPENDED", "DRAFT"] as ListingStatus[]).map((s) => ({ value: s, label: s === "PENDING_REVIEW" ? "Waiting for review" : listingStatusLabel[s] }))}
      />
      {moderate.error && <p className={formStyles.alert} role="alert">{moderate.error}</p>}
      {error && <ErrorNote message={error.message} retry={reload} />}
      {loading && !data && <Loading rows={5} />}
      {data && !rows.length && <Empty title={status === "PENDING_REVIEW" ? "No listings waiting" : "No listings in this state"} />}
      <ul className={styles.queue}>
        {rows.map((l) => {
          const blocked =
            l.lister.kycStatus !== "VERIFIED"
              ? "The lister's identity isn't verified yet."
              : l.property.verificationStatus !== "VERIFIED"
                ? "Verify the property documents first."
                : undefined;
          return (
            <li key={l.id} className={styles.item}>
              <div className={styles.itemHead}>
                <div>
                  <h2>{l.property.title}</h2>
                  <p className={uiStyles.muted}>
                    {l.ref} · {typeLabel[l.property.type]} · {l.property.area}, {l.property.state} · updated {dateTime(l.updatedAt)}
                  </p>
                </div>
                <Status state={listingBeacon(l.status)}>{listingStatusLabel[l.status]}</Status>
              </div>
              <div className={styles.itemBody}>
                <Schedule
                  compact
                  rows={[
                    { label: "Lister", value: <>{l.lister.name} <Status state={l.lister.kycStatus === "VERIFIED" ? "verified" : "pending"} size="sm">{l.lister.kycStatus === "VERIFIED" ? "Verified" : "Not verified"}</Status></> },
                    { label: "Listed as", value: l.property.listedAs === "AGENT" ? "Agent" : "Owner" },
                    { label: "Property documents", value: <Status state={l.property.verificationStatus === "VERIFIED" ? "verified" : "pending"} size="sm">{l.property.verificationStatus === "VERIFIED" ? "Verified" : l.property.verificationStatus === "PENDING" ? "Waiting (Property documents tab)" : l.property.verificationStatus}</Status> },
                    { label: "Address", value: l.property.address },
                    { label: "Rent", value: rent(l.rentAmount, l.rentPeriod) },
                    ...(l.serviceCharge ? [{ label: "Service charge", value: money(l.serviceCharge) }] : []),
                    ...l.otherCharges.map((c) => ({ label: c.label, value: money(c.amount) })),
                  ]}
                />
                <div className={uiStyles.stack}>
                  {l.terms && (
                    <Schedule compact rows={[{ label: "Terms", value: `Version ${l.terms.version}` }, ...termsRows(l.terms.content).slice(0, 5)]} />
                  )}
                  {l.property.description && <p className={uiStyles.small}>{l.property.description}</p>}
                  {l.reviewNote && <p className={`${uiStyles.small}`}><strong>Last note:</strong> {l.reviewNote}</p>}
                </div>
              </div>
              {l.status === "PENDING_REVIEW" && (
                <DecisionBar approveLabel="Publish" rejectLabel="Send back" approveBlocked={blocked} onDecide={(d, note) => act(l.id, d, note)} />
              )}
              {["LIVE", "PAUSED", "OCCUPIED"].includes(l.status) && (
                <SuspendBar onSuspend={(note) => act(l.id, "SUSPEND", note)} />
              )}
              {l.status === "SUSPENDED" && (
                <div className={styles.decide}>
                  <button type="button" className={`${button.button} ${button.small}`} onClick={() => act(l.id, "REINSTATE")}>
                    Reinstate
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function SuspendBar({ onSuspend }: { onSuspend: (note: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  if (!open) {
    return (
      <div className={styles.decide}>
        <button type="button" className={`${button.button} ${button.outline} ${button.small}`} onClick={() => setOpen(true)}>
          Suspend…
        </button>
      </div>
    );
  }
  return (
    <form
      className={`${formStyles.form} ${styles.reject}`}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const note = String(new FormData(e.currentTarget).get("note") ?? "").trim();
        if (!note) return setError("Give the reason. The lister sees it.");
        await onSuspend(note);
      }}
    >
      <TextAreaField label="Reason for suspending" name="note" rows={2} error={error} autoFocus onInput={() => setError("")} />
      <div className={formStyles.actionsRow}>
        <button type="submit" className={`${button.button} ${button.small}`}>
          Suspend listing
        </button>
        <button type="button" className={uiStyles.linkButton} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

type AdminUser = { id: string; name: string; email: string; phone: string; userType: string; kycStatus: string; status: "ACTIVE" | "SUSPENDED"; roles: string[]; createdAt: string; emailVerified: boolean; phoneVerified: boolean };

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useApi<{ users: AdminUser[] }>(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  const act = useAction();
  const kyc: Record<string, ReactNode> = {
    VERIFIED: <Status state="verified" size="sm">Verified</Status>,
    PENDING: <Status state="pending" size="sm">In review</Status>,
    REJECTED: <Status state="rejected" size="sm">Rejected</Status>,
    NOT_STARTED: <Status state="open" size="sm">Not started</Status>,
  };
  return (
    <>
      <form className={styles.search} role="search" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
        <Field label="Find by email or phone" name="q" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className={button.button}>Search</button>
      </form>
      {act.error && <p className={formStyles.alert} role="alert">{act.error}</p>}
      {error && <ErrorNote message={error.message} retry={reload} />}
      {loading && !data && <Loading rows={6} />}
      {data && !data.users.length && <Empty title="No accounts match" />}
      {data && data.users.length > 0 && (
        <table className={table.table}>
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">Role</th>
              <th scope="col">Identity</th>
              <th scope="col">Joined</th>
              <th scope="col" className={table.num}>Access</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id}>
                <td data-label="Account">
                  <span className={table.primary}>{u.name}</span>
                  <span className={table.sub}>{u.email} · {u.phone}</span>
                </td>
                <td data-label="Role">{u.roles.map((r) => r.charAt(0) + r.slice(1).toLowerCase()).join(", ")}</td>
                <td data-label="Identity">{kyc[u.kycStatus]}</td>
                <td data-label="Joined">{shortDate(u.createdAt)}</td>
                <td data-label="Access" className={table.num}>
                  <div className={table.actions}>
                    {u.status === "SUSPENDED" && <Status state="rejected" size="sm">Suspended</Status>}
                    {!u.roles.includes("ADMIN") && (
                      <button
                        type="button"
                        className={uiStyles.linkButton}
                        disabled={act.pending}
                        onClick={async () => (await act.run(`/admin/users/${u.id}`, "PATCH", { status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })) && reload()}
                      >
                        {u.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

type AdminInterest = { id: string; status: keyof typeof interestStatusLabel; createdAt: string; decidedAt: string | null; reportStatus: string | null; listing: { ref: string; title: string }; seeker: string; lister: string };

export function AdminInterests() {
  const { data, error, loading, reload } = useApi<{ interests: AdminInterest[] }>("/admin/interests");
  return (
    <>
      {error && <ErrorNote message={error.message} retry={reload} />}
      {loading && !data && <Loading rows={6} />}
      {data && !data.interests.length && <Empty title="No interests yet" />}
      {data && data.interests.length > 0 && (
        <table className={table.table}>
          <thead>
            <tr>
              <th scope="col">Renter</th>
              <th scope="col">Property</th>
              <th scope="col">Lister</th>
              <th scope="col">Started</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.interests.map((i) => (
              <tr key={i.id}>
                <td data-label="Renter">
                  <Link to={`/app/enquiries/${i.id}`} className={table.primary}>{i.seeker}</Link>
                </td>
                <td data-label="Property">
                  {i.listing.title}
                  <span className={table.sub}>{i.listing.ref}</span>
                </td>
                <td data-label="Lister">{i.lister}</td>
                <td data-label="Started">{shortDate(i.createdAt)}</td>
                <td data-label="Status">
                  <Status state={interestBeacon(i.status)} size="sm">{interestStatusLabel[i.status]}</Status>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

type AuditEntry = { id: string; action: string; entityType: string; entityId: string; before: unknown; after: unknown; ip: string | null; createdAt: string; actor: string };

export function AdminAudit() {
  const [entity, setEntity] = useState("");
  const { data, error, loading, reload } = useApi<{ entries: AuditEntry[] }>(`/admin/audit${entity ? `?entityType=${entity}` : ""}`);
  const show = (v: unknown) => (v && typeof v === "object" ? Object.entries(v).map(([k, x]) => `${k}: ${String(x)}`).join(", ") : "");
  return (
    <>
      <StatusFilter
        value={entity}
        onChange={setEntity}
        options={[
          { value: "", label: "All records" },
          { value: "Interest", label: "Interests" },
          { value: "CharacterReport", label: "Character report access" },
          { value: "Verification", label: "Checks" },
          { value: "Listing", label: "Listings" },
          { value: "LandlordTerms", label: "Landlord terms" },
          { value: "Property", label: "Properties" },
          { value: "User", label: "Users" },
        ]}
      />
      {error && <ErrorNote message={error.message} retry={reload} />}
      {loading && !data && <Loading rows={8} />}
      {data && !data.entries.length && <Empty title="No records yet" />}
      {data && data.entries.length > 0 && (
        <table className={`${table.table} ${styles.audit}`}>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Who</th>
              <th scope="col">Action</th>
              <th scope="col">Record</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.id}>
                <td data-label="When">{dateTime(e.createdAt)}</td>
                <td data-label="Who">{e.actor}</td>
                <td data-label="Action"><code>{e.action}</code></td>
                <td data-label="Record">
                  {e.entityType}
                  <span className={table.sub}>{e.entityId.slice(0, 8)}</span>
                </td>
                <td data-label="Change">
                  {show(e.before) && <span className={table.sub}>from {show(e.before)}</span>}
                  {show(e.after) && <span>to {show(e.after)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className={`${uiStyles.small} ${uiStyles.muted} ${styles.auditNote}`}>Records are append-only. The latest 200 are shown.</p>
    </>
  );
}
