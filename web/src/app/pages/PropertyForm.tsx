import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import button from "../../components/Button.module.css";
import { ChoiceGroup, Field, SelectField, TextAreaField, formStyles } from "../Form";
import { termsOptions } from "../format";
import type { Charge, OwnProperty, PropertyType, TermsContent } from "../types";
import { ErrorNote, Loading, Page, uiStyles } from "../ui";
import { useAction, useApi } from "../useApi";
import styles from "./PropertyForm.module.css";

const toNumber = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/[,\s₦]/g, "");
  return s === "" ? null : Number(s);
};
const toText = (v: FormDataEntryValue | null) => String(v ?? "").trim();

const optionList = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

// The landlord terms controls. Shared by the create form and the "change terms" form.
export function TermsFields({ initial }: { initial?: TermsContent }) {
  const [extra, setExtra] = useState<string[]>(initial?.additional.length ? initial.additional : [""]);
  return (
    <>
      <Field label="Permitted use" name="permittedUse" defaultValue={initial?.permittedUse ?? "Residential use by the named tenant and household"} />
      <div className={formStyles.row}>
        <Field label="Maximum occupants" name="maxOccupants" inputMode="numeric" defaultValue={initial?.maxOccupants ?? ""} hint="Leave blank for no limit." />
        <Field label="Minimum term (months)" name="minimumTermMonths" inputMode="numeric" defaultValue={initial?.minimumTermMonths ?? 12} hint="Leave blank for short stays." />
      </div>
      <div className={formStyles.row}>
        <SelectField label="Rent payment" name="paymentFrequency" options={optionList(termsOptions.frequency)} defaultValue={initial?.paymentFrequency ?? "YEARLY"} />
        <Field label="Caution deposit (₦)" name="cautionDeposit" inputMode="numeric" defaultValue={initial?.cautionDeposit ?? ""} hint="Refundable. Leave blank for none." />
      </div>
      <div className={formStyles.row}>
        <SelectField label="Pets" name="pets" options={optionList(termsOptions.pets)} defaultValue={initial?.pets ?? "ASK"} />
        <SelectField label="Smoking" name="smoking" options={optionList(termsOptions.smoking)} defaultValue={initial?.smoking ?? "NOT_ALLOWED"} />
      </div>
      <fieldset className={styles.list}>
        <legend className={formStyles.label}>Other conditions</legend>
        <p className={formStyles.hint}>Plain statements renters must accept, like "No structural changes without written consent". Up to 10.</p>
        {extra.map((line, i) => (
          <div key={i} className={styles.listRow}>
            <Field label={`Condition ${i + 1}`} name="additional" defaultValue={line} />
            {extra.length > 1 && (
              <button type="button" className={uiStyles.linkButton} onClick={() => setExtra(extra.filter((_, j) => j !== i))} aria-label={`Remove condition ${i + 1}`}>
                Remove
              </button>
            )}
          </div>
        ))}
        {extra.length < 10 && (
          <button type="button" className={uiStyles.linkButton} onClick={() => setExtra([...extra, ""])}>
            Add a condition
          </button>
        )}
      </fieldset>
    </>
  );
}

export function readTerms(data: FormData): TermsContent {
  return {
    permittedUse: toText(data.get("permittedUse")),
    maxOccupants: toNumber(data.get("maxOccupants")),
    minimumTermMonths: toNumber(data.get("minimumTermMonths")),
    paymentFrequency: toText(data.get("paymentFrequency")) as TermsContent["paymentFrequency"],
    cautionDeposit: toNumber(data.get("cautionDeposit")),
    pets: toText(data.get("pets")) as TermsContent["pets"],
    smoking: toText(data.get("smoking")) as TermsContent["smoking"],
    additional: data.getAll("additional").map(toText).filter(Boolean),
  };
}

const typeOptions = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "SHORT_LET", label: "Short-let" },
  { value: "OFFICE", label: "Office" },
] as const;

function Form({ existing }: { existing?: OwnProperty }) {
  const navigate = useNavigate();
  const save = useAction();
  const [type, setType] = useState<PropertyType>(existing?.type ?? "RESIDENTIAL");
  const [charges, setCharges] = useState<Charge[]>(existing?.listing.otherCharges ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const property = {
      type,
      title: toText(data.get("title")),
      state: toText(data.get("state")),
      lga: toText(data.get("lga")),
      area: toText(data.get("area")),
      address: toText(data.get("address")),
      bedrooms: toNumber(data.get("bedrooms")) ?? 0,
      bathrooms: toNumber(data.get("bathrooms")) ?? 0,
      sizeSqm: toNumber(data.get("sizeSqm")),
      furnishing: toText(data.get("furnishing")),
      amenities: toText(data.get("amenities")).split(/\n|,/).map((a) => a.trim()).filter(Boolean),
      description: toText(data.get("description")),
    };
    const labels = data.getAll("chargeLabel").map(toText);
    const amounts = data.getAll("chargeAmount").map(toNumber);
    const listing = {
      rentAmount: toNumber(data.get("rentAmount")),
      rentPeriod: toText(data.get("rentPeriod")),
      serviceCharge: toNumber(data.get("serviceCharge")),
      availableFrom: toText(data.get("availableFrom")) || null,
      otherCharges: labels.map((label, i) => ({ label, amount: amounts[i] })).filter((c) => c.label || c.amount),
    };

    const next: Record<string, string> = {};
    if (!property.title) next.title = "Give the listing a short title.";
    if (!property.lga) next.lga = "Enter the LGA or city.";
    if (!property.area) next.area = "Enter the area or neighbourhood.";
    if (!property.address) next.address = "Enter the street address. Only verified renters see it.";
    if (!listing.rentAmount || Number.isNaN(listing.rentAmount)) next.rentAmount = "Enter the rent as a number, like 2400000.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    const body = { property, listing, terms: readTerms(data) };
    const result = existing
      ? await save.run<{ property: OwnProperty }>(`/properties/${existing.id}`, "PATCH", body)
      : await save.run<{ property: OwnProperty }>("/properties", "POST", body);
    if (result) navigate(`/app/properties/${result.property.id}`);
  }

  const p = existing;
  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate onInput={(e) => {
      const name = (e.target as HTMLInputElement).name;
      if (errors[name]) setErrors({ ...errors, [name]: "" });
    }}>
      <fieldset className={formStyles.group}>
        <legend>The property</legend>
        <ChoiceGroup legend="Type" name="type" value={type} options={typeOptions} onChange={setType} />
        <Field label="Listing title" name="title" defaultValue={p?.title} placeholder="Two-bedroom flat off Herbert Macaulay Way" error={errors.title} maxLength={120} />
        <div className={formStyles.row}>
          <SelectField label="State" name="state" options={[{ value: "Lagos", label: "Lagos" }, { value: "FCT Abuja", label: "FCT Abuja" }]} defaultValue={p?.state ?? "Lagos"} />
          <Field label="LGA or city" name="lga" defaultValue={p?.lga} placeholder="Lagos Mainland" error={errors.lga} />
        </div>
        <div className={formStyles.row}>
          <Field label="Area" name="area" defaultValue={p?.area} placeholder="Yaba" error={errors.area} />
          <Field label="Street address" name="address" defaultValue={p?.address} hint="Shown only to renters whose identity is verified." error={errors.address} />
        </div>
        <div className={styles.four}>
          {type !== "OFFICE" && <Field label="Bedrooms" name="bedrooms" inputMode="numeric" defaultValue={p?.bedrooms ?? 1} />}
          <Field label="Bathrooms" name="bathrooms" inputMode="numeric" defaultValue={p?.bathrooms ?? 1} />
          <Field label="Size (m²)" name="sizeSqm" inputMode="numeric" defaultValue={p?.sizeSqm ?? ""} />
          <SelectField
            label="Finish"
            name="furnishing"
            options={[{ value: "UNFURNISHED", label: "Unfurnished" }, { value: "SEMI_FURNISHED", label: "Semi-furnished" }, { value: "FURNISHED", label: "Furnished" }]}
            defaultValue={p?.furnishing ?? "UNFURNISHED"}
          />
        </div>
        <TextAreaField label="Amenities" name="amenities" rows={3} defaultValue={p?.amenities.join("\n")} hint="One per line, like Prepaid meter or Borehole." />
        <TextAreaField label="Description" name="description" rows={5} defaultValue={p?.description} maxLength={3000} hint="What a renter should know: floor, condition, access, what's nearby." />
      </fieldset>

      <fieldset className={formStyles.group}>
        <legend>Rent and every other charge</legend>
        <div className={formStyles.row}>
          <Field label="Rent (₦)" name="rentAmount" inputMode="numeric" defaultValue={p?.listing.rentAmount ?? ""} error={errors.rentAmount} />
          <SelectField label="Per" name="rentPeriod" options={[{ value: "YEAR", label: "Year" }, { value: "MONTH", label: "Month" }, { value: "NIGHT", label: "Night" }]} defaultValue={p?.listing.rentPeriod ?? (type === "SHORT_LET" ? "NIGHT" : "YEAR")} />
        </div>
        <div className={formStyles.row}>
          <Field label="Service charge (₦)" name="serviceCharge" inputMode="numeric" defaultValue={p?.listing.serviceCharge ?? ""} hint="Leave blank if none." />
          <Field label="Available from" name="availableFrom" type="date" defaultValue={p?.listing.availableFrom?.slice(0, 10) ?? ""} hint="Leave blank if available now." />
        </div>
        <div className={styles.list}>
          <p className={formStyles.label}>Other charges</p>
          <p className={formStyles.hint}>Legal, agency or any other fee. Renters see every one before they show interest.</p>
          {charges.map((c, i) => (
            <div key={i} className={styles.chargeRow}>
              <Field label="Charge" name="chargeLabel" defaultValue={c.label} placeholder="Legal fee" />
              <Field label="Amount (₦)" name="chargeAmount" inputMode="numeric" defaultValue={c.amount || ""} />
              <button type="button" className={uiStyles.linkButton} onClick={() => setCharges(charges.filter((_, j) => j !== i))} aria-label={`Remove charge ${i + 1}`}>
                Remove
              </button>
            </div>
          ))}
          {charges.length < 8 && (
            <button type="button" className={uiStyles.linkButton} onClick={() => setCharges([...charges, { label: "", amount: 0 }])}>
              Add a charge
            </button>
          )}
        </div>
      </fieldset>

      {!existing && (
        <fieldset className={formStyles.group}>
          <legend>Your terms</legend>
          <p className={`${uiStyles.small} ${uiStyles.muted}`}>
            Renters must accept these before they can show interest, and the exact version they accepted is kept. Changing them later creates a new version.
          </p>
          <TermsFields />
        </fieldset>
      )}

      {save.error && <p className={formStyles.alert} role="alert">{save.error}</p>}
      <div className={formStyles.actionsRow}>
        <button type="submit" className={button.button} disabled={save.pending}>
          {save.pending ? "Saving…" : existing ? "Save changes" : "Save as draft"}
        </button>
        <span className={`${uiStyles.small} ${uiStyles.muted}`}>Nothing is published until RENTrust has reviewed it.</span>
      </div>
    </form>
  );
}

export function NewProperty() {
  return (
    <Page title="List a property" back={{ to: "/app/properties", label: "My properties" }} intro="Save a draft first. Then submit your ownership or authority documents and RENTrust reviews the listing.">
      <Form />
    </Page>
  );
}

export function EditProperty() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi<{ property: OwnProperty }>(`/properties/${id}`);
  const back = { to: `/app/properties/${id}`, label: "Back to property" };
  if (loading && !data) return <Page title="Edit property" back={back}><Loading rows={8} /></Page>;
  if (error || !data) return <Page title="Edit property" back={back}><ErrorNote message={error?.message ?? "Not found"} retry={reload} /></Page>;
  return (
    <Page title="Edit property" back={back} intro="Drafts can be edited freely. Terms are changed from the property page, as a new version.">
      <Form existing={data.property} />
    </Page>
  );
}
