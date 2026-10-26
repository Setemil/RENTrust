import type { Request, Response } from "express";
import { prisma } from "../config/db";
import { audit } from "../lib/audit";
import { listingRef } from "../lib/format";
import { badRequest, clientIp, conflict, forbidden, idParam, notFound, oneOf, str } from "../lib/http";
import { notify } from "../lib/notify";
import { adminIds, parseListing, parseProperty, parseTerms } from "../models/listing";
import { roleNames } from "../models/user";

const EVIDENCE_TYPES = {
  OWNERSHIP: ["CERTIFICATE_OF_OCCUPANCY", "DEED_OF_ASSIGNMENT", "GOVERNORS_CONSENT", "SURVEY_PLAN", "OTHER"],
  MANDATE: ["LETTER_OF_AUTHORITY", "MANAGEMENT_AGREEMENT", "POWER_OF_ATTORNEY", "OTHER"],
} as const;

const propertyInclude = {
  listing: {
    include: {
      terms: { orderBy: { version: "desc" as const } },
      interests: { select: { status: true } },
    },
  },
};

async function loadOwn(req: Request) {
  const property = await prisma.property.findUnique({ where: { id: idParam(req) }, include: propertyInclude });
  if (!property) throw notFound("Property not found");
  if (property.listerId !== req.user!.id) throw forbidden();
  return property;
}

type Loaded = Awaited<ReturnType<typeof loadOwn>>;

async function serialize(property: Loaded) {
  const verification = await prisma.verification.findFirst({
    where: { subjectType: "PROPERTY", subjectId: property.id },
    orderBy: { createdAt: "desc" },
  });
  const listing = property.listing!;
  const counts: Record<string, number> = {};
  for (const i of listing.interests) counts[i.status] = (counts[i.status] ?? 0) + 1;
  const { interests: _i, terms, ...rest } = listing;
  return {
    ...property,
    listing: { ...rest, ref: listingRef(listing.ref), terms, interestCounts: counts },
    verification: verification && {
      kind: verification.kind,
      status: verification.status,
      data: verification.data,
      createdAt: verification.createdAt,
      reviewNote: verification.reviewNote,
    },
  };
}

export async function listMine(req: Request, res: Response) {
  const properties = await prisma.property.findMany({
    where: { listerId: req.user!.id },
    include: propertyInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ properties: await Promise.all(properties.map(serialize)) });
}

export async function getOne(req: Request, res: Response) {
  res.json({ property: await serialize(await loadOwn(req)) });
}

export async function create(req: Request, res: Response) {
  const user = req.user!;
  const body = req.body ?? {};
  const propertyData = parseProperty(body.property ?? {});
  const listingData = parseListing(body.listing ?? {});
  const terms = parseTerms(body.terms);
  const listedAs = roleNames(user).includes("AGENT") ? "AGENT" : "OWNER";

  const property = await prisma.$transaction(async (tx) => {
    const p = await tx.property.create({
      data: {
        ...propertyData,
        listerId: user.id,
        listedAs,
        listing: { create: { ...listingData, terms: { create: { version: 1, content: terms } } } },
      },
    });
    await audit(tx, { actorId: user.id, action: "property.created", entityType: "Property", entityId: p.id, ip: clientIp(req) });
    return p;
  });
  const loaded = await prisma.property.findUniqueOrThrow({ where: { id: property.id }, include: propertyInclude });
  res.status(201).json({ property: await serialize(loaded) });
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
    await audit(tx, { actorId: req.user!.id, action: "property.updated", entityType: "Property", entityId: property.id, ip: clientIp(req) });
  });
  res.json({ property: await serialize(await loadOwn(req)) });
}

// Terms are immutable: every change writes the next version. Renters who accepted an older
// version keep that record; new interest needs the current one.
export async function updateTerms(req: Request, res: Response) {
  const property = await loadOwn(req);
  const listing = property.listing!;
  if (listing.status === "SUSPENDED") throw conflict("This listing is suspended");
  const content = parseTerms(req.body);
  const version = (listing.terms[0]?.version ?? 0) + 1;
  await prisma.$transaction(async (tx) => {
    const t = await tx.landlordTerms.create({ data: { listingId: listing.id, version, content } });
    await audit(tx, {
      actorId: req.user!.id,
      action: "terms.version_created",
      entityType: "LandlordTerms",
      entityId: t.id,
      after: { listing: listingRef(listing.ref), version },
      ip: clientIp(req),
    });
  });
  res.json({ property: await serialize(await loadOwn(req)) });
}

export async function submit(req: Request, res: Response) {
  const user = req.user!;
  const property = await loadOwn(req);
  const listing = property.listing!;
  if (listing.status !== "DRAFT") throw conflict("This listing has already been submitted");
  if (user.kycStatus !== "VERIFIED") throw badRequest("Your own identity check must be verified before you list");

  const needsEvidence = property.verificationStatus !== "VERIFIED" && property.verificationStatus !== "PENDING";
  const kind = property.listedAs === "AGENT" ? "MANDATE" : "OWNERSHIP";
  let evidence: Record<string, string> | null = null;
  if (needsEvidence) {
    const body = req.body ?? {};
    evidence = {
      documentType: oneOf(body.documentType, "Document type", EVIDENCE_TYPES[kind]),
      reference: str(body.reference, "Document reference", { max: 120 }),
      notes: str(body.notes, "Notes", { max: 500, optional: true }),
    };
  }

  await prisma.$transaction(async (tx) => {
    if (evidence) {
      const v = await tx.verification.create({
        data: {
          subjectType: "PROPERTY",
          subjectId: property.id,
          kind,
          provider: "RENTrust review (test)",
          data: evidence,
          submittedById: user.id,
        },
      });
      await tx.property.update({ where: { id: property.id }, data: { verificationStatus: "PENDING" } });
      await audit(tx, { actorId: user.id, action: "verification.submitted", entityType: "Verification", entityId: v.id, after: { kind }, ip: clientIp(req) });
    }
    await tx.listing.update({ where: { id: listing.id }, data: { status: "PENDING_REVIEW", reviewNote: null } });
    await audit(tx, {
      actorId: user.id,
      action: "listing.submitted",
      entityType: "Listing",
      entityId: listing.id,
      before: { status: "DRAFT" },
      after: { status: "PENDING_REVIEW" },
      ip: clientIp(req),
    });
    for (const adminId of await adminIds()) {
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
  res.json({ property: await serialize(await loadOwn(req)) });
}

export async function setAvailability(req: Request, res: Response) {
  const property = await loadOwn(req);
  const listing = property.listing!;
  const action = oneOf(req.body?.action, "action", ["PAUSE", "RESUME", "MARK_OCCUPIED"] as const);
  const transitions = {
    PAUSE: { from: ["LIVE"], to: "PAUSED" },
    RESUME: { from: ["PAUSED", "OCCUPIED"], to: "LIVE" },
    MARK_OCCUPIED: { from: ["LIVE", "PAUSED"], to: "OCCUPIED" },
  } as const;
  const t = transitions[action];
  if (!(t.from as readonly string[]).includes(listing.status)) throw conflict(`Can't do that while the listing is ${listing.status.toLowerCase().replace("_", " ")}`);
  await prisma.$transaction(async (tx) => {
    await tx.listing.update({ where: { id: listing.id }, data: { status: t.to } });
    await audit(tx, {
      actorId: req.user!.id,
      action: `listing.${action.toLowerCase()}`,
      entityType: "Listing",
      entityId: listing.id,
      before: { status: listing.status },
      after: { status: t.to },
      ip: clientIp(req),
    });
  });
  res.json({ property: await serialize(await loadOwn(req)) });
}
