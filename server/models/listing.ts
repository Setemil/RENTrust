import { prisma } from "../config/db";
import type { Prisma } from "../generated/prisma/client";
import { badRequest, int, oneOf, str } from "../lib/http";
import { listingRef, personName } from "../lib/format";

export const STATES = ["Lagos", "FCT Abuja"] as const;
export const PROPERTY_TYPES = ["RESIDENTIAL", "SHORT_LET", "OFFICE"] as const;
export const FURNISHING = ["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"] as const;
export const RENT_PERIODS = ["YEAR", "MONTH", "NIGHT"] as const;
const PETS = ["ALLOWED", "NOT_ALLOWED", "ASK"] as const;
const SMOKING = ["ALLOWED", "NOT_ALLOWED", "OUTSIDE_ONLY"] as const;
const PAYMENT_FREQUENCY = ["YEARLY", "TWICE_YEARLY", "QUARTERLY", "MONTHLY", "PER_STAY"] as const;

export type TermsContent = {
  permittedUse: string;
  maxOccupants: number | null;
  pets: (typeof PETS)[number];
  smoking: (typeof SMOKING)[number];
  minimumTermMonths: number | null;
  paymentFrequency: (typeof PAYMENT_FREQUENCY)[number];
  cautionDeposit: number | null;
  additional: string[];
};

// Landlord terms are set through fixed platform controls plus a short list of extra conditions.
export function parseTerms(body: any): TermsContent {
  if (!body || typeof body !== "object") throw badRequest("terms are required");
  const additional = Array.isArray(body.additional) ? body.additional : [];
  if (additional.length > 10) throw badRequest("Add at most 10 extra conditions");
  return {
    permittedUse: str(body.permittedUse, "Permitted use", { max: 120 }),
    maxOccupants: int(body.maxOccupants, "Maximum occupants", { min: 1, max: 500, optional: true }),
    pets: oneOf(body.pets, "Pets", PETS),
    smoking: oneOf(body.smoking, "Smoking", SMOKING),
    minimumTermMonths: int(body.minimumTermMonths, "Minimum term", { min: 0, max: 120, optional: true }),
    paymentFrequency: oneOf(body.paymentFrequency, "Payment frequency", PAYMENT_FREQUENCY),
    cautionDeposit: int(body.cautionDeposit, "Caution deposit", { optional: true }),
    additional: additional
      .map((line: unknown, i: number) => str(line, `Condition ${i + 1}`, { max: 300, optional: true }))
      .filter(Boolean),
  };
}

export function parseProperty(body: any) {
  const amenities = Array.isArray(body.amenities) ? body.amenities : [];
  if (amenities.length > 30) throw badRequest("Add at most 30 amenities");
  return {
    type: oneOf(body.type, "Property type", PROPERTY_TYPES),
    title: str(body.title, "Title", { max: 120 }),
    state: oneOf(body.state, "State", STATES),
    lga: str(body.lga, "LGA or city", { max: 80 }),
    area: str(body.area, "Area", { max: 80 }),
    address: str(body.address, "Street address", { max: 200 }),
    bedrooms: int(body.bedrooms, "Bedrooms", { max: 50 })!,
    bathrooms: int(body.bathrooms, "Bathrooms", { max: 50 })!,
    sizeSqm: int(body.sizeSqm, "Size", { min: 1, max: 1_000_000, optional: true }),
    furnishing: oneOf(body.furnishing, "Furnishing", FURNISHING),
    amenities: amenities.map((a: unknown) => str(a, "Amenity", { max: 60 })),
    description: str(body.description, "Description", { max: 3000, optional: true }),
  };
}

export function parseListing(body: any) {
  const charges = Array.isArray(body.otherCharges) ? body.otherCharges : [];
  if (charges.length > 8) throw badRequest("Add at most 8 other charges");
  let availableFrom: Date | null = null;
  if (body.availableFrom) {
    availableFrom = new Date(str(body.availableFrom, "Available from", { max: 10 }));
    if (Number.isNaN(availableFrom.getTime())) throw badRequest("Available from must be a date");
  }
  return {
    rentAmount: int(body.rentAmount, "Rent", { min: 1 })!,
    rentPeriod: oneOf(body.rentPeriod, "Rent period", RENT_PERIODS),
    serviceCharge: int(body.serviceCharge, "Service charge", { optional: true }),
    otherCharges: charges.map((c: any, i: number) => ({
      label: str(c?.label, `Charge ${i + 1} name`, { max: 60 }),
      amount: int(c?.amount, `Charge ${i + 1} amount`)!,
    })),
    availableFrom,
  };
}

export const listingInclude = {
  property: { include: { lister: true } },
  terms: { orderBy: { version: "desc" }, take: 1 },
} satisfies Prisma.ListingInclude;

export type ListingWithProperty = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

// What a signed-in marketplace user sees. The street address is held back until the viewer's own
// identity is verified; the lister is shown by name and check status only.
export function toMarketListing(listing: ListingWithProperty, viewer: { kycStatus: string }) {
  const { property } = listing;
  const canSeeAddress = viewer.kycStatus === "VERIFIED";
  return {
    id: listing.id,
    ref: listingRef(listing.ref),
    status: listing.status,
    rentAmount: listing.rentAmount,
    rentPeriod: listing.rentPeriod,
    serviceCharge: listing.serviceCharge,
    otherCharges: listing.otherCharges,
    currency: listing.currency,
    availableFrom: listing.availableFrom,
    publishedAt: listing.publishedAt,
    property: {
      type: property.type,
      title: property.title,
      state: property.state,
      lga: property.lga,
      area: property.area,
      address: canSeeAddress ? property.address : null,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sizeSqm: property.sizeSqm,
      furnishing: property.furnishing,
      amenities: property.amenities,
      description: property.description,
      verificationStatus: property.verificationStatus,
    },
    lister: {
      name: personName(property.lister),
      listedAs: property.listedAs,
      identityVerified: property.lister.kycStatus === "VERIFIED",
    },
    terms: listing.terms[0] ? { id: listing.terms[0].id, version: listing.terms[0].version, content: listing.terms[0].content, effectiveAt: listing.terms[0].effectiveAt } : null,
  };
}

export async function adminIds() {
  const admins = await prisma.userRole.findMany({ where: { role: { name: "ADMIN" } }, select: { userId: true } });
  return admins.map((a) => a.userId);
}
