// Shapes returned by the API. Kept by hand next to the server controllers.

export type VerifyState = "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";
export type PropertyType = "RESIDENTIAL" | "SHORT_LET" | "OFFICE";
export type Furnishing = "UNFURNISHED" | "SEMI_FURNISHED" | "FURNISHED";
export type RentPeriod = "YEAR" | "MONTH" | "NIGHT";
export type ListingStatus = "DRAFT" | "PENDING_REVIEW" | "LIVE" | "PAUSED" | "OCCUPIED" | "EXPIRED" | "SUSPENDED";
export type InterestStatus =
  | "INITIATED"
  | "TERMS_ACCEPTED"
  | "KYC_CONFIRMED"
  | "REPORT_REQUESTED"
  | "REPORT_READY"
  | "AWAITING_DECISION"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";

export type TermsContent = {
  permittedUse: string;
  maxOccupants: number | null;
  pets: "ALLOWED" | "NOT_ALLOWED" | "ASK";
  smoking: "ALLOWED" | "NOT_ALLOWED" | "OUTSIDE_ONLY";
  minimumTermMonths: number | null;
  paymentFrequency: "YEARLY" | "TWICE_YEARLY" | "QUARTERLY" | "MONTHLY" | "PER_STAY";
  cautionDeposit: number | null;
  additional: string[];
};

export type Terms = { id: string; version: number; content: TermsContent; effectiveAt: string };
export type Charge = { label: string; amount: number };

export type PropertyFields = {
  type: PropertyType;
  title: string;
  state: string;
  lga: string;
  area: string;
  address: string | null;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number | null;
  furnishing: Furnishing;
  amenities: string[];
  description: string;
  verificationStatus: VerifyState;
};

export type InterestSummary = {
  id: string;
  status: InterestStatus;
  createdAt: string;
  decidedAt: string | null;
  termsAcceptedAt: string;
  termsVersion: number;
};

export type MarketListing = {
  id: string;
  ref: string;
  status: ListingStatus;
  rentAmount: number;
  rentPeriod: RentPeriod;
  serviceCharge: number | null;
  otherCharges: Charge[];
  currency: string;
  availableFrom: string | null;
  publishedAt: string | null;
  property: PropertyFields;
  lister: { name: string; listedAs: "OWNER" | "AGENT"; identityVerified: boolean };
  terms: Terms | null;
  saved: boolean;
};

export type ListingDetail = MarketListing & {
  isOwn: boolean;
  termsAcceptedAt: string | null;
  interest: InterestSummary | null;
};

export type AccountStatus = {
  emailVerified: boolean;
  phoneVerified: boolean;
  termsAccepted: boolean;
  consentVersion: string;
  kycStatus: VerifyState;
  verification: {
    id: string;
    kind: "IDENTITY" | "BUSINESS";
    status: "PENDING" | "APPROVED" | "REJECTED";
    data: Record<string, string>;
    createdAt: string;
    reviewedAt: string | null;
    reviewNote: string | null;
  } | null;
};

export type ListingRef = {
  id: string;
  ref: string;
  title: string;
  area: string;
  state: string;
  type: PropertyType;
  rentAmount: number;
  rentPeriod: RentPeriod;
};

export type HistoryEntry = { status: InterestStatus; at: string };

export type SeekerInterest = InterestSummary & {
  message: string | null;
  listing: ListingRef;
  lister: { name: string; listedAs: "OWNER" | "AGENT" };
  reportStatus: "REQUESTED" | "READY" | "FAILED" | null;
  history: HistoryEntry[];
};

export type ListerInterest = InterestSummary & {
  message: string | null;
  decisionReason: string | null;
  listing: ListingRef;
  seeker: { name: string; accountType: "IND" | "ORG"; identityVerified: boolean };
  report: { status: "REQUESTED" | "READY" | "FAILED"; reportDate: string | null; provider: string; timesOpened: number } | null;
  terms: { version: number; content: TermsContent };
  history: HistoryEntry[];
};

export type InterestRow = InterestSummary & {
  listing: ListingRef;
  reportStatus: "REQUESTED" | "READY" | "FAILED" | null;
  seeker?: { name: string; accountType: "IND" | "ORG"; identityVerified: boolean };
};

export type CharacterReport = {
  report: {
    provider: string;
    providerRef: string | null;
    source: string | null;
    reportDate: string | null;
    verificationStatus: string | null;
    retainUntil: string | null;
    payload: {
      name: string;
      accountType: string;
      identityCheck: string;
      identityCheckedOn: string | null;
      emailConfirmed: boolean;
      phoneConfirmed: boolean;
      memberSince: string;
      tenancyReferences: string;
    };
  };
  accessLog: { at: string; by: string }[];
};

export type OwnProperty = Omit<PropertyFields, "address"> & {
  id: string;
  address: string;
  listedAs: "OWNER" | "AGENT";
  createdAt: string;
  listing: {
    id: string;
    ref: string;
    status: ListingStatus;
    rentAmount: number;
    rentPeriod: RentPeriod;
    serviceCharge: number | null;
    otherCharges: Charge[];
    availableFrom: string | null;
    reviewNote: string | null;
    publishedAt: string | null;
    terms: Terms[];
    interestCounts: Partial<Record<InterestStatus, number>>;
  };
  verification: {
    kind: "OWNERSHIP" | "MANDATE";
    status: "PENDING" | "APPROVED" | "REJECTED";
    data: Record<string, string>;
    createdAt: string;
    reviewNote: string | null;
  } | null;
};

export type AppNotification = {
  id: string;
  event: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  alsoSent: { channel: "EMAIL" | "SMS"; status: "SENT" | "SIMULATED" | "FAILED" }[];
};
