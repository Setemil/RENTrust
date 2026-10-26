import { prisma } from "../config/db";
import { RoleName, type Prisma } from "../generated/prisma/client";
import { hashPassword } from "../models/user";

// Test data. Every account uses the same password: SEED_PASSWORD if set (always set it for a
// hosted environment, since the default is published in the README), otherwise "rentrust-test".
const PASSWORD = process.env.SEED_PASSWORD || "rentrust-test";
const CONSENT_VERSION = "draft-2026-10";

type SeedUser = {
  email: string;
  phone: string;
  role: RoleName;
  userType?: "IND" | "ORG";
  profile: Record<string, string>;
  verified: "full" | "contact" | "none";
  kycPending?: boolean;
};

const users: SeedUser[] = [
  { email: "admin@rentrust.test", phone: "08000000001", role: "ADMIN", profile: { firstName: "Ada", lastName: "Admin" }, verified: "full" },
  { email: "landlord@rentrust.test", phone: "08000000002", role: "LANDLORD", profile: { firstName: "Bola", lastName: "Adeyemi" }, verified: "full" },
  { email: "agent@rentrust.test", phone: "08000000003", role: "AGENT", profile: { firstName: "Chidi", lastName: "Okafor" }, verified: "full" },
  { email: "renter@rentrust.test", phone: "08000000004", role: "SEEKER", profile: { firstName: "Tolu", lastName: "Bakare" }, verified: "full" },
  { email: "company@rentrust.test", phone: "08000000005", role: "SEEKER", userType: "ORG", profile: { orgName: "Kestrel Logistics Ltd" }, verified: "full" },
  { email: "newrenter@rentrust.test", phone: "08000000006", role: "SEEKER", profile: { firstName: "Halima", lastName: "Sani" }, verified: "contact", kycPending: true },
];

const terms = (overrides: Partial<Record<string, unknown>> = {}): Prisma.InputJsonObject => ({
  permittedUse: "Residential use by the named tenant and household",
  maxOccupants: 4,
  pets: "ASK",
  smoking: "NOT_ALLOWED",
  minimumTermMonths: 12,
  paymentFrequency: "YEARLY",
  cautionDeposit: 300000,
  additional: ["No structural changes without written consent", "Tenant pays electricity and water bills directly"],
  ...overrides,
});

type SeedListing = {
  owner: string;
  status: "LIVE" | "PENDING_REVIEW" | "DRAFT";
  propertyVerified: boolean;
  property: Omit<Prisma.PropertyCreateWithoutListerInput, "listing">;
  listing: { rentAmount: number; rentPeriod: "YEAR" | "MONTH" | "NIGHT"; serviceCharge?: number; otherCharges?: { label: string; amount: number }[] };
  terms: Prisma.InputJsonObject;
};

const listings: SeedListing[] = [
  {
    owner: "landlord@rentrust.test",
    status: "LIVE",
    propertyVerified: true,
    property: {
      type: "RESIDENTIAL", title: "Two-bedroom flat off Herbert Macaulay Way", state: "Lagos", lga: "Lagos Mainland", area: "Yaba",
      address: "14 Test Close, Yaba (test address)", bedrooms: 2, bathrooms: 2, sizeSqm: 95, furnishing: "UNFURNISHED",
      amenities: ["Prepaid meter", "Borehole", "Gated compound", "Parking for one car"],
      description: "Second-floor flat in a block of six. Tiled throughout, fitted kitchen, both bedrooms en suite. Ten minutes' walk to the Yaba bus terminal.",
    },
    listing: { rentAmount: 2_400_000, rentPeriod: "YEAR", serviceCharge: 250_000, otherCharges: [{ label: "Legal fee", amount: 240_000 }] },
    terms: terms(),
  },
  {
    owner: "landlord@rentrust.test",
    status: "LIVE",
    propertyVerified: true,
    property: {
      type: "RESIDENTIAL", title: "Three-bedroom terrace with BQ", state: "Lagos", lga: "Eti-Osa", area: "Lekki Phase 1",
      address: "3 Sample Street, Lekki Phase 1 (test address)", bedrooms: 3, bathrooms: 4, sizeSqm: 180, furnishing: "SEMI_FURNISHED",
      amenities: ["24-hour security", "Shared generator", "Boys' quarters", "Two parking spaces", "Water treatment"],
      description: "End-of-terrace house in an estate of twelve. Fitted wardrobes, kitchen appliances included, separate boys' quarters with its own entrance.",
    },
    listing: { rentAmount: 8_500_000, rentPeriod: "YEAR", serviceCharge: 1_200_000, otherCharges: [{ label: "Legal fee", amount: 850_000 }] },
    terms: terms({ maxOccupants: 6, cautionDeposit: 1_000_000 }),
  },
  {
    owner: "agent@rentrust.test",
    status: "LIVE",
    propertyVerified: true,
    property: {
      type: "SHORT_LET", title: "Furnished studio, short stays", state: "FCT Abuja", lga: "Abuja Municipal", area: "Wuse 2",
      address: "Flat 4, 9 Demo Crescent, Wuse 2 (test address)", bedrooms: 1, bathrooms: 1, sizeSqm: 42, furnishing: "FURNISHED",
      amenities: ["Wi-Fi", "Air conditioning", "Inverter backup", "Weekly cleaning", "Smart TV"],
      description: "Self-contained studio close to Banex Plaza. Sleeps two. Minimum stay three nights.",
    },
    listing: { rentAmount: 55_000, rentPeriod: "NIGHT", otherCharges: [{ label: "Cleaning fee (per stay)", amount: 15_000 }] },
    terms: terms({ permittedUse: "Short stay, up to two guests", maxOccupants: 2, pets: "NOT_ALLOWED", minimumTermMonths: null, paymentFrequency: "PER_STAY", cautionDeposit: 50_000, additional: ["No parties or events", "Quiet hours 10pm to 7am"] }),
  },
  {
    owner: "agent@rentrust.test",
    status: "LIVE",
    propertyVerified: true,
    property: {
      type: "OFFICE", title: "Open-plan office floor, 120 sqm", state: "FCT Abuja", lga: "Abuja Municipal", area: "Central Business District",
      address: "Floor 3, Test House, CBD (test address)", bedrooms: 0, bathrooms: 2, sizeSqm: 120, furnishing: "UNFURNISHED",
      amenities: ["Lift", "Dedicated generator", "Fibre-ready", "Six parking spaces", "Reception shared with building"],
      description: "Whole third floor of a four-storey office building. Two washrooms, kitchenette, partitioning allowed with consent.",
    },
    listing: { rentAmount: 18_000_000, rentPeriod: "YEAR", serviceCharge: 3_600_000, otherCharges: [{ label: "Agency fee", amount: 1_800_000 }, { label: "Legal fee", amount: 1_800_000 }] },
    terms: terms({ permittedUse: "Office use only; no residential occupation", maxOccupants: 40, pets: "NOT_ALLOWED", minimumTermMonths: 24, cautionDeposit: 2_000_000, additional: ["Partitioning only with the landlord's written approval", "Signage subject to building rules"] }),
  },
  {
    owner: "landlord@rentrust.test",
    status: "LIVE",
    propertyVerified: true,
    property: {
      type: "RESIDENTIAL", title: "Mini flat in quiet close", state: "FCT Abuja", lga: "Bwari", area: "Gwarinpa",
      address: "21 Example Avenue, Gwarinpa (test address)", bedrooms: 1, bathrooms: 1, sizeSqm: 48, furnishing: "UNFURNISHED",
      amenities: ["Prepaid meter", "Borehole", "Gated compound"],
      description: "Ground-floor one-bedroom flat with a small kitchen and a shared courtyard.",
    },
    listing: { rentAmount: 1_200_000, rentPeriod: "YEAR", serviceCharge: 100_000 },
    terms: terms({ maxOccupants: 2, cautionDeposit: 150_000 }),
  },
  {
    owner: "landlord@rentrust.test",
    status: "PENDING_REVIEW",
    propertyVerified: false,
    property: {
      type: "RESIDENTIAL", title: "Four-bedroom detached house", state: "Lagos", lga: "Ikeja", area: "Ikeja GRA",
      address: "7 Placeholder Road, Ikeja GRA (test address)", bedrooms: 4, bathrooms: 5, sizeSqm: 320, furnishing: "UNFURNISHED",
      amenities: ["Garden", "Boys' quarters", "Generator house", "Four parking spaces"],
      description: "Detached house on a corner plot. Waiting for RENTrust review.",
    },
    listing: { rentAmount: 15_000_000, rentPeriod: "YEAR", serviceCharge: 0 },
    terms: terms({ maxOccupants: 8, cautionDeposit: 1_500_000 }),
  },
];

async function main() {
  for (const name of Object.values(RoleName)) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  const passwordHash = await hashPassword(PASSWORD);
  const ids: Record<string, string> = {};
  for (const u of users) {
    const full = u.verified === "full";
    const contact = u.verified !== "none";
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        phone: u.phone,
        passwordHash,
        userType: u.userType ?? "IND",
        profile: u.profile,
        emailVerified: contact,
        phoneVerified: contact,
        kycStatus: full ? "VERIFIED" : u.kycPending ? "PENDING" : "NOT_STARTED",
        roles: { create: { role: { connect: { name: u.role } } } },
        consents: contact
          ? { create: [{ kind: "TERMS_OF_SERVICE", docVersion: CONSENT_VERSION }, { kind: "PRIVACY_POLICY", docVersion: CONSENT_VERSION }] }
          : undefined,
      },
    });
    ids[u.email] = user.id;
    const hasCheck = await prisma.verification.count({ where: { subjectType: "USER", subjectId: user.id } });
    if (!hasCheck && (full || u.kycPending)) {
      await prisma.verification.create({
        data: {
          subjectType: "USER",
          subjectId: user.id,
          kind: user.userType === "ORG" ? "BUSINESS" : "IDENTITY",
          provider: "RENTrust review (test)",
          status: full ? "APPROVED" : "PENDING",
          data: user.userType === "ORG"
            ? { registeredName: u.profile.orgName, rcNumber: "RC 1234567", representativeName: "Ngozi Eze", representativeRole: "Operations Director" }
            : { idType: "NIN", idNumber: "•••••••4821", dateOfBirth: "1992-04-18" },
          submittedById: user.id,
          reviewedAt: full ? new Date() : null,
        },
      });
    }
  }

  const existing = await prisma.property.count();
  if (!existing) {
    for (const l of listings) {
      const owner = ids[l.owner];
      const property = await prisma.property.create({
        data: {
          ...l.property,
          listerId: owner,
          listedAs: l.owner.startsWith("agent") ? "AGENT" : "OWNER",
          verificationStatus: l.propertyVerified ? "VERIFIED" : "PENDING",
          listing: {
            create: {
              ...l.listing,
              otherCharges: l.listing.otherCharges ?? [],
              status: l.status,
              publishedAt: l.status === "LIVE" ? new Date() : null,
              terms: { create: { version: 1, content: l.terms } },
            },
          },
        },
      });
      const isAgent = l.owner.startsWith("agent");
      await prisma.verification.create({
        data: {
          subjectType: "PROPERTY",
          subjectId: property.id,
          kind: isAgent ? "MANDATE" : "OWNERSHIP",
          provider: "RENTrust review (test)",
          status: l.propertyVerified ? "APPROVED" : "PENDING",
          data: isAgent
            ? { documentType: "LETTER_OF_AUTHORITY", reference: "LOA/2026/014" }
            : { documentType: "CERTIFICATE_OF_OCCUPANCY", reference: "C of O LA/2019/0457" },
          submittedById: owner,
          reviewedAt: l.propertyVerified ? new Date() : null,
        },
      });
    }
  }

  console.log("Seeded roles, test accounts and listings.");
  console.log(process.env.SEED_PASSWORD ? "Password for every test account: the SEED_PASSWORD you set." : `Password for every test account: ${PASSWORD}`);
  for (const u of users) console.log(`  ${u.role.padEnd(8)} ${u.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
