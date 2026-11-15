import type { Request, Response } from "express";
import { audit } from "../../shared/audit";
import { hasRole } from "../../shared/auth";
import { prisma } from "../../shared/db";
import { badRequest, conflict, forbidden, notFound } from "../../shared/errors";
import { listingRef } from "../../shared/format";
import { idParam, oneOf, str } from "../../shared/input";
import { notify } from "../../shared/notify";
import { toast, type Toast } from "../../shared/toast";
import { adminIds } from "../auth/users";
import { parseListing, parseProperty, parseTerms, setListingStatus } from "./listing";

// A landlord's or agent's own properties: create, edit, set terms, submit for review,
// pause and resume. Every property has exactly one listing.

// The documents that prove ownership (landlord) or authority to let (agent).
const EVIDENCE_TYPES = {
  OWNERSHIP: ["CERTIFICATE_OF_OCCUPANCY", "DEED_OF_ASSIGNMENT", "GOVERNORS_CONSENT", "SURVEY_PLAN", "OTHER"],
  MANDATE: ["LETTER_OF_AUTHORITY", "MANAGEMENT_AGREEMENT", "POWER_OF_ATTORNEY", "OTHER"],
} as const;

// What the lister may do to a listing's availability, and from which states.
const AVAILABILITY = {
  PAUSE: { from: ["LIVE"], to: "PAUSED" },
  RESUME: { from: ["PAUSED", "OCCUPIED"], to: "LIVE" },
  MARK_OCCUPIED: { from: ["LIVE", "PAUSED"], to: "OCCUPIED" },
} as const;

const propertyInclude = {
  listing: {
    include: {
      terms: { orderBy: { version: "desc" as const } },
      interests: { select: { status: true } },
    },
  },
};

// Loads the property in the URL, and refuses if it isn't the signed-in user's.
async function loadOwn(req: Request) {
  const property = await prisma.property.findUnique({ where: { id: idParam(req) }, include: propertyInclude });
  if (!property) throw notFound("Property not found");
  if (property.listerId !== req.user!.id) throw forbidden();
  return property;
}

type Loaded = Awaited<ReturnType<typeof loadOwn>>;

// The property as the lister sees it: listing, terms history, interest counts and document check.
async function view(property: Loaded) {
  const verification = await prisma.verification.findFirst({
    where: { subjectType: "PROPERTY", subjectId: property.id },
    orderBy: { createdAt: "desc" },
    select: { kind: true, status: true, data: true, createdAt: true, reviewNote: true },
  });
  const { interests, ...listing } = property.listing!;
  const interestCounts: Record<string, number> = {};
  for (const { status } of interests) interestCounts[status] = (interestCounts[status] ?? 0) + 1;
  return {
    ...property,
    listing: { ...listing, ref: listingRef(listing.ref), interestCounts },
    verification,
  };
}

// Most handlers end the same way: reload the property and send it back, with an optional toast.
async function sendProperty(req: Request, res: Response, message?: Toast) {
  res.json({ property: await view(await loadOwn(req)), toast: message });
}

export async function listMine(req: Request, res: Response) {
  const properties = await prisma.property.findMany({
    where: { listerId: req.user!.id },
    include: propertyInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ properties: await Promise.all(properties.map(view)) });
}

export async function getOne(req: Request, res: Response) {
  await sendProperty(req, res);
}

export async function create(req: Request, res: Response) {
  const user = req.user!;
  const body = req.body ?? {};
  const property = parseProperty(body.property ?? {});
  const listing = parseListing(body.listing ?? {});
  const terms = parseTerms(body.terms);

  const created = await prisma.$transaction(async (tx) => {
    const p = await tx.property.create({
      data: {
        ...property,
        listerId: user.id,
        listedAs: hasRole(user, "AGENT") ? "AGENT" : "OWNER",
        listing: { create: { ...listing, terms: { create: { version: 1, content: terms } } } },
      },
      include: propertyInclude,
    });
    await audit(tx, { actorId: user.id, action: "property.created", entityType: "Property", entityId: p.id });
    return p;
  });
  res.status(201).json({ property: await view(created) });
}

// Details can change only while the listing is a draft; live listings go back through review.
export async function update(req: Request, res: Response) {
  const property = await loadOwn(req);
  if (property.listing!.status !== "DRAFT") {
    throw conflict("Only draft listings can be edited. Pause it and contact RENTrust to change a live listing.");
  }
  const body = req.body ?? {};
  const propertyData = parseProperty(body.property ?? {});
  const listingData = parseListing(body.listing ?? {});

  await prisma.$transaction(async (tx) => {
    await tx.property.update({ where: { id: property.id }, data: propertyData });
    await tx.listing.update({ where: { id: property.listing!.id }, data: listingData });
    await audit(tx, { actorId: req.user!.id, action: "property.updated", entityType: "Property", entityId: property.id });
  });
  await sendProperty(req, res);
}

// Terms are never edited: every change writes the next version. Renters who accepted an older
// version keep that record; new interest needs the current one.
export async function updateTerms(req: Request, res: Response) {
  const { listing } = await loadOwn(req);
  if (listing!.status === "SUSPENDED") throw conflict("This listing is suspended");
  const content = parseTerms(req.body);
  const version = (listing!.terms[0]?.version ?? 0) + 1;

  await prisma.$transaction(async (tx) => {
    const terms = await tx.landlordTerms.create({ data: { listingId: listing!.id, version, content } });
    await audit(tx, {
      actorId: req.user!.id,
      action: "terms.version_created",
      entityType: "LandlordTerms",
      entityId: terms.id,
      after: { listing: listingRef(listing!.ref), version },
    });
  });
  await sendProperty(req, res);
}

// Sends a draft listing to RENTrust for review. The first time, the property's ownership or
// mandate documents go with it.
export async function submit(req: Request, res: Response) {
  const user = req.user!;
  const property = await loadOwn(req);
  const listing = property.listing!;
  if (listing.status !== "DRAFT") throw conflict("This listing has already been submitted");
  if (user.kycStatus !== "VERIFIED") throw badRequest("Your own identity check must be verified before you list");

  const kind = property.listedAs === "AGENT" ? "MANDATE" : "OWNERSHIP";
  const alreadyChecked = property.verificationStatus === "VERIFIED" || property.verificationStatus === "PENDING";
  const evidence = alreadyChecked
    ? null
    : {
        documentType: oneOf(req.body?.documentType, "Document type", EVIDENCE_TYPES[kind]),
        reference: str(req.body?.reference, "Document reference", { max: 120 }),
        notes: str(req.body?.notes, "Notes", { max: 500, optional: true }),
      };
  const admins = await adminIds();

  await prisma.$transaction(async (tx) => {
    if (evidence) {
      const v = await tx.verification.create({
        data: { subjectType: "PROPERTY", subjectId: property.id, kind, provider: "RENTrust review (test)", data: evidence, submittedById: user.id },
      });
      await tx.property.update({ where: { id: property.id }, data: { verificationStatus: "PENDING" } });
      await audit(tx, { actorId: user.id, action: "verification.submitted", entityType: "Verification", entityId: v.id, after: { kind } });
    }
    await setListingStatus(tx, { listing, to: "PENDING_REVIEW", action: "submitted", actorId: user.id, data: { reviewNote: null } });
    for (const adminId of admins) {
      await notify(tx, {
        userId: adminId,
        event: "listing.submitted",
        title: `${listingRef(listing.ref)} is waiting for review`,
        body: `${property.title}, ${property.area}. ${evidence ? "Property documents need checking too." : ""}`.trim(),
        link: "/app/admin/listings",
        relatedType: "Listing",
        relatedId: listing.id,
      });
    }
  });
  await sendProperty(req, res, toast.success(`${listingRef(listing.ref)} sent to RENTrust for review`));
}

export async function setAvailability(req: Request, res: Response) {
  const listing = (await loadOwn(req)).listing!;
  const action = oneOf(req.body?.action, "action", ["PAUSE", "RESUME", "MARK_OCCUPIED"] as const);
  const { from, to } = AVAILABILITY[action];
  if (!(from as readonly string[]).includes(listing.status)) {
    throw conflict(`Can't do that while the listing is ${listing.status.toLowerCase().replace("_", " ")}`);
  }
  await prisma.$transaction((tx) => setListingStatus(tx, { listing, to, action: action.toLowerCase(), actorId: req.user!.id }));
  await sendProperty(req, res, toast.info(`${listingRef(listing.ref)} is now ${to.toLowerCase()}`));
}
