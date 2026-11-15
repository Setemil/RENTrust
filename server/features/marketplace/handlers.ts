import type { Request, Response } from "express";
import type { Prisma } from "../../generated/prisma/client";
import { audit } from "../../shared/audit";
import { prisma } from "../../shared/db";
import { badRequest, conflict, notFound } from "../../shared/errors";
import { clientIp, idParam, int, oneOf, str } from "../../shared/input";
import { interestSummary } from "../interests/status";
import { PROPERTY_TYPES, STATES, isRemoved, listingInclude, toMarketListing } from "../properties/listing";

// What a signed-in renter sees: search, a listing's detail, accepting its terms, saving it.
// Only LIVE listings are ever returned here, and every route sits behind requireAuth.
export async function search(req: Request, res: Response) {
  const q = req.query;
  // Soft-deleted listings, properties and listers never appear.
  const where: Prisma.ListingWhereInput = { status: "LIVE", deletedAt: null };
  const property: Prisma.PropertyWhereInput = { deletedAt: null, lister: { deletedAt: null } };
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
  if (!listing || listing.status !== "LIVE" || isRemoved(listing)) throw notFound("This listing isn't available");
  return listing;
}

export async function detail(req: Request, res: Response) {
  const user = req.user!;
  const id = idParam(req);
  const listing = await prisma.listing.findUnique({ where: { id }, include: listingInclude });
  // The lister can preview their own listing in any state; everyone else only sees LIVE ones.
  if (!listing || isRemoved(listing) || (listing.status !== "LIVE" && listing.property.listerId !== user.id)) {
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
