import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import button from "../../components/Button.module.css";
import { api } from "../api";
import { useAuth } from "../auth";
import { formStyles, Field, SelectField } from "../Form";
import { furnishingLabel, rent, typeLabel } from "../format";
import PlotMark from "../PlotMark";
import type { MarketListing } from "../types";
import { Empty, ErrorNote, Loading, Page, Status, Tabs, uiStyles } from "../ui";
import { useApi } from "../useApi";
import styles from "./Listings.module.css";

const typeOptions = [
  { value: "", label: "Any type" },
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "SHORT_LET", label: "Short-let" },
  { value: "OFFICE", label: "Office" },
];
const stateOptions = [
  { value: "", label: "Lagos and Abuja" },
  { value: "Lagos", label: "Lagos" },
  { value: "FCT Abuja", label: "Abuja" },
];
const bedOptions = [
  { value: "", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];
const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "rent_asc", label: "Rent, low to high" },
  { value: "rent_desc", label: "Rent, high to low" },
];

function SaveButton({ listing, onChange }: { listing: MarketListing; onChange: (saved: boolean) => void }) {
  const { token } = useAuth();
  const [pending, setPending] = useState(false);
  async function toggle() {
    setPending(true);
    try {
      await api(`/listings/${listing.id}/save`, { method: listing.saved ? "DELETE" : "POST", token });
      onChange(!listing.saved);
    } finally {
      setPending(false);
    }
  }
  return (
    <button
      type="button"
      className={styles.save}
      aria-pressed={listing.saved}
      aria-label={`${listing.saved ? "Remove" : "Save"} ${listing.property.title}`}
      onClick={toggle}
      disabled={pending}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 3h12v18l-6-4.5L6 21Z" fill={listing.saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {listing.saved ? "Saved" : "Save"}
    </button>
  );
}

export default function Listings({ savedOnly = false }: { savedOnly?: boolean }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = new URLSearchParams(params);
  if (savedOnly) query.set("saved", "1");
  const { data, error, loading, reload, setData } = useApi<{ listings: MarketListing[] }>(`/listings?${query}`);
  const filtered = ["q", "type", "state", "maxRent", "minBedrooms"].some((k) => params.get(k));

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      const v = String(value).trim().replace(/,/g, "");
      if (v && !(key === "sort" && v === "newest")) next.set(key, v);
    }
    setParams(next);
  }

  const setSaved = (id: string, saved: boolean) =>
    setData((d) => d && { listings: d.listings.map((l) => (l.id === id ? { ...l, saved } : l)).filter((l) => !savedOnly || l.saved) });

  const verified = user?.kycStatus === "VERIFIED";
  const listings = data?.listings ?? [];

  return (
    <Page
      title="Marketplace"
      intro="Properties in Lagos and Abuja. Every lister's identity and every property's documents are checked by RENTrust before a listing goes live."
    >
      {!verified && (
        <p className={styles.gate}>
          <Status state="pending">Browsing only</Status>
          <span>
            Showing interest needs a verified identity, and street addresses stay hidden until then.{" "}
            <Link to="/app">Finish your checks</Link>
          </span>
        </p>
      )}

      <form className={styles.filters} onSubmit={handleFilter} key={params.toString()} role="search" aria-label="Filter listings">
        <div className={styles.search}>
          <Field label="Search" name="q" placeholder="Area, town or title" defaultValue={params.get("q") ?? ""} />
        </div>
        <SelectField label="Type" name="type" options={typeOptions} defaultValue={params.get("type") ?? ""} />
        <SelectField label="Where" name="state" options={stateOptions} defaultValue={params.get("state") ?? ""} />
        <Field label="Max rent (₦)" name="maxRent" inputMode="numeric" placeholder="No limit" defaultValue={params.get("maxRent") ?? ""} />
        <SelectField label="Bedrooms" name="minBedrooms" options={bedOptions} defaultValue={params.get("minBedrooms") ?? ""} />
        <SelectField label="Sort" name="sort" options={sortOptions} defaultValue={params.get("sort") ?? "newest"} />
        <div className={styles.go}>
          <button type="submit" className={button.button}>
            Search
          </button>
        </div>
      </form>

      <div className={styles.bar}>
        <Tabs
          label="Listing views"
          items={[
            { to: `/app/listings${params.size ? `?${params}` : ""}`, label: "All listings" },
            { to: `/app/listings/saved${params.size ? `?${params}` : ""}`, label: "Saved" },
          ]}
        />
        <p className={styles.resultCount} aria-live="polite">
          {data && `${listings.length} ${listings.length === 1 ? "property" : "properties"}`}
          {filtered && (
            <>
              {" · "}
              <button type="button" className={uiStyles.linkButton} onClick={() => setParams(new URLSearchParams())}>
                Clear filters
              </button>
            </>
          )}
        </p>
      </div>

      {error && <ErrorNote message={error.message} retry={reload} />}
      {loading && !data && <Loading rows={6} label="Loading listings" />}
      {data && !listings.length && (
        savedOnly ? (
          <Empty title="Nothing saved yet">Use Save on any listing to keep it here while you compare.</Empty>
        ) : (
          <Empty title={filtered ? "No listings match these filters" : "No live listings yet"}>
            {filtered ? "Try a higher rent limit, fewer bedrooms or a different area." : "Listings appear here once RENTrust has checked them."}
          </Empty>
        )
      )}

      {listings.length > 0 && (
        <ul className={styles.results}>
          {listings.map((l) => (
            <li key={l.id} className={styles.result}>
              <PlotMark refCode={l.ref} verified={l.property.verificationStatus === "VERIFIED"} />
              <div className={styles.main}>
                <p className={styles.ref}>
                  {l.ref} · {typeLabel[l.property.type]}
                </p>
                <h2>
                  <Link to={`/app/listings/${l.id}`} className={styles.title}>
                    {l.property.title}
                  </Link>
                </h2>
                <p className={styles.where}>
                  {l.property.area}, {l.property.lga}, {l.property.state === "FCT Abuja" ? "Abuja" : l.property.state}
                </p>
              </div>
              <dl className={styles.facts}>
                {l.property.type !== "OFFICE" && (
                  <div>
                    <dt>Bedrooms</dt>
                    <dd>{l.property.bedrooms}</dd>
                  </div>
                )}
                <div>
                  <dt>Bathrooms</dt>
                  <dd>{l.property.bathrooms}</dd>
                </div>
                {l.property.sizeSqm && (
                  <div>
                    <dt>Size</dt>
                    <dd>{l.property.sizeSqm} m²</dd>
                  </div>
                )}
                <div>
                  <dt>Finish</dt>
                  <dd>{furnishingLabel[l.property.furnishing]}</dd>
                </div>
              </dl>
              <div className={styles.money}>
                <p className={styles.rent}>{rent(l.rentAmount, l.rentPeriod)}</p>
                <Status state={l.property.verificationStatus === "VERIFIED" ? "verified" : "pending"} size="sm">
                  {l.property.verificationStatus === "VERIFIED" ? "Property verified" : "Property check pending"}
                </Status>
              </div>
              <SaveButton listing={l} onChange={(saved) => setSaved(l.id, saved)} />
            </li>
          ))}
        </ul>
      )}
      <p className={`${uiStyles.small} ${uiStyles.muted} ${styles.foot}`}>
        <span className={formStyles.label}>About these listings.</span> Rent is shown as the lister entered it. Every other charge is listed on
        the property page before you show interest.
      </p>
    </Page>
  );
}
