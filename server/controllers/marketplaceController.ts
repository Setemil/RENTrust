import type { Request, Response } from "express";
import { prisma } from "../config/db";
import type { Prisma } from "../generated/prisma/client";
import { audit } from "../lib/audit";
import { badRequest, clientIp, conflict, idParam, int, notFound, oneOf, str } from "../lib/http";
import { PROPERTY_TYPES, STATES, listingInclude, toMarketListing } from "../models/listing";
import { interestSummary } from "./interestController";

// Only LIVE listings are ever returned here, and every route sits behind requireAuth.
export async function search(req: Request, res: Response) {
  const q = req.query;
  const where: Prisma.ListingWhereInput = { status: "LIVE" };
  const property: Prisma.PropertyWhereInput = {};
  if (q.type) property.type = oneOf(q.type, "type", PROPERTY_TYPES);
  if (q.state) property.state = oneOf(q.state, "state", STATES);
  if (q.minBedrooms) property.bedrooms = { gte: int(q.minBedrooms, "minBedrooms", { max: 50 })! };
  if (q.q) {
    const text = str(q.q, "q", { max: 80 });
    property.OR = [
      { title: { contains: text, mode: "insensitive" } },
      { area: { contains: text, mode: "insensitive" } },
      { lga: { contains: text, mode: "insensitive" } },
    ];
  }
  where.property = property;
  if (q.maxRent) where.rentAmount = { lte: int(q.maxRent, "maxRent", { min: 1 })! };
  if (q.saved === "1") where.saves = { some: { userId: req.user!.id } };

  const sort = q.sort ? oneOf(q.sort, "sort", ["newest", "rent_asc", "rent_desc"] as const) : "newest";
  const orderBy: Prisma.ListingOrderByWithRelationInput =
    sort === "rent_asc" ? { rentAmount: "asc" } : sort === "rent_desc" ? { rentAmount: "desc" } : { publishedAt: "desc" };

  const [listings, saved] = await Promise.all([
    prisma.listing.findMany({ where, include: listingInclude, orderBy, take: 100 }),
    prisma.savedListing.findMany({ where: { userId: req.user!.id }, select: { listingId: true } }),
  ]);
  const savedIds = new Set(saved.map((s) => s.listingId));
  res.json({
    listings: listings.map((l) => ({ ...toMarketListing(l, req.user!), saved: savedIds.has(l.id) })),
  });
}

async function loadLive(id: string) {
  const listing = await prisma.listing.findUnique({ where: { id }, include: listingInclude });
  if (!listing || listing.status !== "LIVE") throw notFound("This listing isn't available");
  return listing;
}

export async function detail(req: Request, res: Response) {
  const user = req.user!;
  const id = idParam(req);
  const listing = await prisma.listing.findUnique({ where: { id }, include: listingInclude });
  // The lister can preview their own listing in any state; everyone else only sees LIVE ones.
  if (!listing || (listing.status !== "LIVE" && listing.property.listerId !== user.id)) {
    throw notFound("This listing isn't available");
  }
  const current = listing.terms[0];
  const [acceptance, saved, interest] = await Promise.all([
    current
      ? prisma.termsAcceptance.findUnique({ where: { userId_termsId: { userId: user.id, termsId: current.id } } })
      : null,
    prisma.savedListing.findUnique({ where: { userId_listingId: { userId: user.id, listingId: id } } }),
    prisma.interest.findFirst({
      where: { listingId: id, seekerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { terms: { select: { version: true } } },
    }),
  ]);
  res.json({
    listing: {
      ...toMarketListing(listing, user),
      saved: Boolean(saved),
      isOwn: listing.property.listerId === user.id,
      termsAcceptedAt: acceptance?.acceptedAt ?? null,
      interest: interest ? interestSummary(interest) : null,
    },
  });
}

export async function acceptTerms(req: Request, res: Response) {
  const listing = await loadLive(idParam(req));
  const current = listing.terms[0];
  if (!current) throw badRequest("This listing has no terms yet");
  // The client says which version it showed; refuse if the landlord changed it in the meantime.
  const termsId = str(req.body?.termsId, "termsId");
  if (termsId !== current.id) throw conflict("The landlord has updated these terms. Read the new version first.");
  const acceptance = await prisma.termsAcceptance.upsert({
    where: { userId_termsId: { userId: req.user!.id, termsId } },
    update: {},
    create: { userId: req.user!.id, termsId, ip: clientIp(req) },
  });
  await audit(prisma, {
    actorId: req.user!.id,
    action: "terms.accepted",
    entityType: "LandlordTerms",
    entityId: termsId,
    after: { version: current.version },
    ip: clientIp(req),
  });
  res.json({ termsAcceptedAt: acceptance.acceptedAt, version: current.version });
}

export async function save(req: Request, res: Response) {
  const listing = await loadLive(idParam(req));
  await prisma.savedListing.upsert({
    where: { userId_listingId: { userId: req.user!.id, listingId: listing.id } },
    update: {},
    create: { userId: req.user!.id, listingId: listing.id },
  });
  res.json({ saved: true });
}

export async function unsave(req: Request, res: Response) {
  await prisma.savedListing.deleteMany({ where: { userId: req.user!.id, listingId: idParam(req) } });
  res.json({ saved: false });
}
