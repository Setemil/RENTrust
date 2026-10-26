import type { InterestStatus, ListingStatus, PropertyType, RentPeriod, TermsContent } from "./types";

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export const money = (amount: number) => naira.format(amount);

export const periodLabel: Record<RentPeriod, string> = { YEAR: "year", MONTH: "month", NIGHT: "night" };

export const rent = (amount: number, period: RentPeriod) => `${money(amount)} / ${periodLabel[period]}`;

export const typeLabel: Record<PropertyType, string> = {
  RESIDENTIAL: "Residential",
  SHORT_LET: "Short-let",
  OFFICE: "Office",
};

export const furnishingLabel = { UNFURNISHED: "Unfurnished", SEMI_FURNISHED: "Semi-furnished", FURNISHED: "Furnished" } as const;

export const listingStatusLabel: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "In review",
  LIVE: "Live",
  PAUSED: "Paused",
  OCCUPIED: "Occupied",
  EXPIRED: "Expired",
  SUSPENDED: "Suspended",
};

export const interestStatusLabel: Record<InterestStatus, string> = {
  INITIATED: "Started",
  TERMS_ACCEPTED: "Terms accepted",
  KYC_CONFIRMED: "Identity confirmed",
  REPORT_REQUESTED: "Report requested",
  REPORT_READY: "Report ready",
  AWAITING_DECISION: "Landlord deciding",
  APPROVED: "Approved",
  REJECTED: "Not approved",
  WITHDRAWN: "Withdrawn",
};

export function shortDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return shortDate(iso);
}

const pets = { ALLOWED: "Allowed", NOT_ALLOWED: "Not allowed", ASK: "Ask the landlord first" };
const smoking = { ALLOWED: "Allowed", NOT_ALLOWED: "Not allowed", OUTSIDE_ONLY: "Outside only" };
const frequency = {
  YEARLY: "Yearly, in advance",
  TWICE_YEARLY: "Every six months",
  QUARTERLY: "Quarterly",
  MONTHLY: "Monthly",
  PER_STAY: "Per stay, before check-in",
};

// Terms as label/value rows, in the order a renter reads them.
export function termsRows(t: TermsContent) {
  return [
    { label: "Permitted use", value: t.permittedUse },
    { label: "Maximum occupants", value: t.maxOccupants ? String(t.maxOccupants) : "Not set" },
    { label: "Minimum term", value: t.minimumTermMonths ? `${t.minimumTermMonths} months` : "None" },
    { label: "Rent payment", value: frequency[t.paymentFrequency] },
    { label: "Caution deposit", value: t.cautionDeposit ? money(t.cautionDeposit) : "None" },
    { label: "Pets", value: pets[t.pets] },
    { label: "Smoking", value: smoking[t.smoking] },
  ];
}

export const termsOptions = { pets, smoking, frequency };
