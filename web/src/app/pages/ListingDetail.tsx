import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import button from "../../components/Button.module.css";
import TitleBlock from "../../components/TitleBlock";
import { useAuth } from "../auth";
import { CheckField, TextAreaField, formStyles } from "../Form";
import { furnishingLabel, interestStatusLabel, money, periodLabel, rent, shortDate, termsRows, typeLabel } from "../format";
import PlotMark from "../PlotMark";
import type { ListingDetail as Detail, SeekerInterest, TermsContent } from "../types";
import { ErrorNote, Loading, Page, Schedule, Section, Status, TestNote, uiStyles } from "../ui";
import { useAction, useApi } from "../useApi";
import styles from "./ListingDetail.module.css";

export function TermsList({ content, version, effectiveAt }: { content: TermsContent; version: number; effectiveAt?: string }) {
  return (
    <div className={uiStyles.stack}>
      <Schedule rows={termsRows(content)} />
      {content.additional.length > 0 && (
        <div>
          <h3 className={styles.subhead}>Other conditions</h3>
          <ol className={styles.conditions}>
            {content.additional.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
      )}
      <p className={`${uiStyles.small} ${uiStyles.muted}`}>
        Version {version}
        {effectiveAt ? `, in effect since ${shortDate(effectiveAt)}` : ""}. Set with RENTrust's standard term controls.
      </p>
    </div>
  );
}

function Charges({ listing }: { listing: Detail }) {
  const deposit = listing.terms?.content.cautionDeposit ?? null;
  const rows = [
    { label: `Rent (per ${periodLabel[listing.rentPeriod]})`, amount: listing.rentAmount },
    ...(listing.serviceCharge ? [{ label: "Service charge", amount: listing.serviceCharge }] : []),
    ...listing.otherCharges.map((c) => ({ label: c.label, amount: c.amount })),
    ...(deposit ? [{ label: "Caution deposit (refundable)", amount: deposit }] : []),
  ];
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  return (
    <table className={styles.charges}>
      <caption className="visually-hidden">Charges</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            <td>{money(r.amount)}</td>
          </tr>
        ))}
      </tbody>
      {listing.rentPeriod !== "NIGHT" && rows.length > 1 && (
        <tfoot>
          <tr>
            <th scope="row">Total of listed charges</th>
            <td>{money(total)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function InterestGate({ listing, onChange }: { listing: Detail; onChange: () => void }) {
  const { user } = useAuth();
  const accept = useAction();
  const show = useAction();
  const [readTerms, setReadTerms] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ read?: string; consent?: string }>({});

  if (!user) return null;
  const isRenter = user.roles.includes("SEEKER");
  const verified = user.kycStatus === "VERIFIED";
  const accepted = Boolean(listing.termsAcceptedAt);
  const open = listing.interest && !["REJECTED", "WITHDRAWN"].includes(listing.interest.status);

  if (listing.isOwn) {
    return (
      <TitleBlock title="Your listing" meta={listing.ref}>
        <p className={uiStyles.small}>This is how renters see your listing.</p>
      </TitleBlock>
    );
  }

  if (open && listing.interest) {
    const approved = listing.interest.status === "APPROVED";
    return (
      <TitleBlock title="Your interest" meta={`Since ${shortDate(listing.interest.createdAt)}`}>
        <div className={uiStyles.stack}>
          <Status state={approved ? "verified" : "pending"}>{interestStatusLabel[listing.interest.status]}</Status>
          <p className={uiStyles.small}>
            You accepted version {listing.interest.termsVersion} of the landlord's terms. {approved ? "The landlord approved your interest." : "The landlord decides after reviewing your character report."}
          </p>
          <Link to={`/app/interests/${listing.interest.id}`} className={`${button.button} ${button.small}`}>
            See progress
          </Link>
        </div>
      </TitleBlock>
    );
  }

  async function handleAccept() {
    if (!readTerms) return setErrors({ read: "Tick the box to confirm you've read them." });
    setErrors({});
    if (await accept.run(`/listings/${listing.id}/terms/accept`, "POST", { termsId: listing.terms!.id })) onChange();
  }

  async function handleShow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) return setErrors({ consent: "The landlord needs the report to assess your interest." });
    setErrors({});
    const message = String(new FormData(event.currentTarget).get("message") ?? "").trim();
    const result = await show.run<{ interest: SeekerInterest }>("/interests", "POST", {
      listingId: listing.id,
      consentCharacterReport: true,
      message: message || undefined,
    });
    if (result) onChange();
  }

  const gate = [
    { label: "Signed in", done: true, note: "" },
    { label: verified ? "Identity verified" : "Identity check", done: verified, note: verified ? "" : "Needed before you can show interest." },
    { label: `Landlord's terms, version ${listing.terms?.version ?? "–"}`, done: accepted, note: accepted ? `Accepted ${shortDate(listing.termsAcceptedAt)}` : "Read them on this page, then accept below." },
  ];

  return (
    <TitleBlock title="Show interest" meta={listing.interest ? "Try again" : "Three checks"}>
      <div className={uiStyles.stack}>
        <ol className={styles.gate}>
          {gate.map((g) => (
            <li key={g.label}>
              <Status state={g.done ? "verified" : "open"}>{g.label}</Status>
              {g.note && <p>{g.note}</p>}
            </li>
          ))}
        </ol>

        {!isRenter ? (
          <p className={uiStyles.small}>Showing interest needs a renter account. Landlords and agents can browse to compare listings.</p>
        ) : !verified ? (
          <Link to="/app" className={`${button.button} ${button.small}`}>
            Finish your identity check
          </Link>
        ) : !accepted ? (
          <div className={formStyles.form}>
            {accept.error && <p className={formStyles.alert} role="alert">{accept.error}</p>}
            <CheckField checked={readTerms} onChange={(e) => { setReadTerms(e.target.checked); setErrors({}); }} error={errors.read}>
              I've read the landlord's terms (version {listing.terms?.version}) and agree to them for this property.
            </CheckField>
            <button type="button" className={`${button.button} ${formStyles.submit}`} onClick={handleAccept} disabled={accept.pending}>
              {accept.pending ? "Saving…" : "Accept terms"}
            </button>
          </div>
        ) : (
          <form className={formStyles.form} onSubmit={handleShow} noValidate>
            {show.error && <p className={formStyles.alert} role="alert">{show.error}</p>}
            <TextAreaField label="Message to the landlord (optional)" name="message" rows={3} maxLength={1000} placeholder="When you'd like to move in, who will live there…" />
            <CheckField checked={consent} onChange={(e) => { setConsent(e.target.checked); setErrors({}); }} error={errors.consent}>
              I agree to RENTrust requesting a character report about me for this landlord. They see only what they need to decide, and every
              time they open it is logged.
            </CheckField>
            <TestNote>The report comes from a simulated provider using only your RENTrust account details.</TestNote>
            <button type="submit" className={`${button.button} ${formStyles.submit}`} disabled={show.pending}>
              {show.pending ? "Sending…" : "Show interest"}
            </button>
          </form>
        )}
      </div>
    </TitleBlock>
  );
}

export default function ListingDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi<{ listing: Detail }>(`/listings/${id}`);
  const back = { to: "/app/listings", label: "Marketplace" };

  if (loading && !data) return <Page title="Listing" back={back}><Loading rows={8} /></Page>;
  if (error || !data) return <Page title="Listing" back={back}><ErrorNote message={error?.message ?? "Not found"} retry={reload} /></Page>;

  const l = data.listing;
  const p = l.property;
  const facts = [
    { label: "Type", value: typeLabel[p.type] },
    ...(p.type !== "OFFICE" ? [{ label: "Bedrooms", value: String(p.bedrooms) }] : []),
    { label: "Bathrooms", value: String(p.bathrooms) },
    ...(p.sizeSqm ? [{ label: "Size", value: `${p.sizeSqm} m²` }] : []),
    { label: "Finish", value: furnishingLabel[p.furnishing] },
    { label: "Available from", value: l.availableFrom ? shortDate(l.availableFrom) : "Now" },
    {
      label: "Address",
      value: p.address ?? <span className={uiStyles.muted}>Shown once your identity is verified</span>,
    },
  ];

  return (
    <Page
      title={p.title}
      back={back}
      intro={`${p.area}, ${p.lga}, ${p.state === "FCT Abuja" ? "Abuja" : p.state}`}
      actions={<p className={styles.price}>{rent(l.rentAmount, l.rentPeriod)}</p>}
    >
      <div className={uiStyles.twoCol}>
        <div className={uiStyles.stack}>
          <div className={styles.plate}>
            <PlotMark refCode={l.ref} verified={p.verificationStatus === "VERIFIED"} size={88} />
            <dl className={styles.checks}>
              <div>
                <dt>Listing</dt>
                <dd>{l.ref}</dd>
              </div>
              <div>
                <dt>Property documents</dt>
                <dd>
                  <Status state={p.verificationStatus === "VERIFIED" ? "verified" : "pending"} size="sm">
                    {p.verificationStatus === "VERIFIED" ? "Verified by RENTrust" : "In review"}
                  </Status>
                </dd>
              </div>
              <div>
                <dt>{l.lister.listedAs === "AGENT" ? "Agent" : "Landlord"}</dt>
                <dd>
                  {l.lister.name}
                  <Status state={l.lister.identityVerified ? "verified" : "pending"} size="sm">
                    {l.lister.identityVerified ? "Identity verified" : "Identity in review"}
                  </Status>
                </dd>
              </div>
            </dl>
          </div>

          <Section title="The property" id="property-title">
            <Schedule rows={facts} />
            {p.description && <p className={`${uiStyles.prose} ${styles.description}`}>{p.description}</p>}
            {p.amenities.length > 0 && (
              <ul className={styles.amenities} aria-label="Amenities">
                {p.amenities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Every charge" meta="Disclosed before you agree to anything" id="charges-title">
            <Charges listing={l} />
          </Section>

          <Section title="Landlord's terms" meta={l.terms ? `Version ${l.terms.version}` : undefined} id="terms-title">
            {l.terms ? <TermsList content={l.terms.content} version={l.terms.version} effectiveAt={l.terms.effectiveAt} /> : <p>No terms set.</p>}
          </Section>
        </div>
        <aside className={styles.aside}>
          <InterestGate listing={l} onChange={reload} />
        </aside>
      </div>
    </Page>
  );
}
