import type { Request, Response } from "express";
import type { ListingStatus, VerificationStatus } from "../../generated/prisma/client";
import { audit } from "../../shared/audit";
import { prisma } from "../../shared/db";
import { badRequest, conflict, notFound } from "../../shared/errors";
import { listingRef, personName } from "../../shared/format";
import { idParam, note as noteInput, oneOf } from "../../shared/input";
import { notify } from "../../shared/notify";
import { toast } from "../../shared/toast";
import { roleNames } from "../auth/users";
import { setListingStatus } from "../properties/listing";

// RENTrust staff: review identity and property checks, moderate listings, manage users,
// and read the interests and audit logs.

const person = (u: { id: string; email: string; userType: string; profile: unknown; kycStatus: string }) => ({
  id: u.id,
  name: personName(u),
  email: u.email,
  userType: u.userType,
  kycStatus: u.kycStatus,
});

export async function overview(_req: Request, res: Response) {
  const [peopleChecks, propertyChecks, listings, awaiting, users, live] = await Promise.all([
    prisma.verification.count({ where: { status: "PENDING", subjectType: "USER" } }),
    prisma.verification.count({ where: { status: "PENDING", subjectType: "PROPERTY" } }),
    prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.interest.count({ where: { status: { in: ["REPORT_READY", "AWAITING_DECISION"] } } }),
    prisma.user.count(),
    prisma.listing.count({ where: { status: "LIVE" } }),
  ]);
  res.json({ peopleChecks, propertyChecks, listings, awaiting, users, live });
}

export async function verifications(req: Request, res: Response) {
  const status = req.query.status ? oneOf(req.query.status, "status", ["PENDING", "APPROVED", "REJECTED"] as const) : "PENDING";
  const subject = req.query.subject ? oneOf(req.query.subject, "subject", ["USER", "PROPERTY"] as const) : undefined;
  const rows = await prisma.verification.findMany({
    where: { status, ...(subject ? { subjectType: subject } : {}) },
    include: { submittedBy: true, reviewedBy: true },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    take: 100,
  });
  const propertyIds = rows.filter((r) => r.subjectType === "PROPERTY").map((r) => r.subjectId);
  const properties = await prisma.property.findMany({ where: { id: { in: propertyIds } }, include: { listing: true } });
  res.json({
    verifications: rows.map((v) => {
      const p = properties.find((x) => x.id === v.subjectId);
      return {
        id: v.id,
        subjectType: v.subjectType,
        kind: v.kind,
        status: v.status,
        data: v.data,
        provider: v.provider,
        createdAt: v.createdAt,
        reviewedAt: v.reviewedAt,
        reviewNote: v.reviewNote,
        reviewedBy: v.reviewedBy ? personName(v.reviewedBy) : null,
        submittedBy: { ...person(v.submittedBy), phone: v.submittedBy.phone, emailVerified: v.submittedBy.emailVerified, phoneVerified: v.submittedBy.phoneVerified },
        property: p && {
          id: p.id,
          title: p.title,
          address: p.address,
          area: p.area,
          state: p.state,
          ref: p.listing ? listingRef(p.listing.ref) : null,
          listedAs: p.listedAs,
        },
      };
    }),
  });
}

export async function reviewVerification(req: Request, res: Response) {
  const admin = req.user!;
  const v = await prisma.verification.findUnique({ where: { id: idParam(req) } });
  if (!v) throw notFound();
  if (v.status !== "PENDING") throw conflict("This check has already been reviewed");
  const decision = oneOf(req.body?.decision, "decision", ["APPROVE", "REJECT"] as const);
  const note = noteInput(req.body?.note);
  if (decision === "REJECT" && !note) throw badRequest("Say what needs fixing, so they can resubmit");
  const status: VerificationStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";
  const resulting = decision === "APPROVE" ? "VERIFIED" : "REJECTED";

  await prisma.$transaction(async (tx) => {
    await tx.verification.update({
      where: { id: v.id },
      data: { status, reviewNote: note, reviewedById: admin.id, reviewedAt: new Date() },
    });
    let title: string;
    let body: string;
    let link: string;
    if (v.subjectType === "USER") {
      await tx.user.update({ where: { id: v.subjectId }, data: { kycStatus: resulting } });
      const label = v.kind === "BUSINESS" ? "business check" : "identity check";
      title = decision === "APPROVE" ? `Your ${label} is verified` : `Your ${label} needs another look`;
      body = decision === "APPROVE" ? "You can now show interest in properties, or list your own." : `RENTrust's note: ${note}`;
      link = "/app";
    } else {
      const p = await tx.property.update({ where: { id: v.subjectId }, data: { verificationStatus: resulting } });
      title = decision === "APPROVE" ? `${p.title}: property documents verified` : `${p.title}: property documents need another look`;
      body = decision === "APPROVE" ? "The listing itself is reviewed separately." : `RENTrust's note: ${note}`;
      link = `/app/properties/${p.id}`;
    }
    await audit(tx, {
      actorId: admin.id,
      action: `verification.${status.toLowerCase()}`,
      entityType: "Verification",
      entityId: v.id,
      before: { status: "PENDING" },
      after: { status, subjectType: v.subjectType, kind: v.kind },
    });
    await notify(tx, {
      userId: v.submittedById,
      event: `verification.${status.toLowerCase()}`,
      title,
      body,
      link,
      relatedType: "Verification",
      relatedId: v.id,
      channels: ["IN_APP", "EMAIL"],
    });
  });
  res.json({ ok: true, toast: toast.success(decision === "APPROVE" ? "Check approved" : "Check sent back with your note") });
}

export async function listings(req: Request, res: Response) {
  const statuses = ["DRAFT", "PENDING_REVIEW", "LIVE", "PAUSED", "OCCUPIED", "EXPIRED", "SUSPENDED"] as const;
  const status = req.query.status ? oneOf(req.query.status, "status", statuses) : "PENDING_REVIEW";
  const rows = await prisma.listing.findMany({
    where: { status },
    include: { property: { include: { lister: true } }, terms: { orderBy: { version: "desc" }, take: 1 } },
    orderBy: { updatedAt: status === "PENDING_REVIEW" ? "asc" : "desc" },
    take: 100,
  });
  res.json({
    listings: rows.map((l) => ({
      id: l.id,
      ref: listingRef(l.ref),
      status: l.status,
      reviewNote: l.reviewNote,
      rentAmount: l.rentAmount,
      rentPeriod: l.rentPeriod,
      serviceCharge: l.serviceCharge,
      otherCharges: l.otherCharges,
      updatedAt: l.updatedAt,
      publishedAt: l.publishedAt,
      property: {
        id: l.property.id,
        type: l.property.type,
        title: l.property.title,
        address: l.property.address,
        area: l.property.area,
        lga: l.property.lga,
        state: l.property.state,
        bedrooms: l.property.bedrooms,
        bathrooms: l.property.bathrooms,
        description: l.property.description,
        verificationStatus: l.property.verificationStatus,
        listedAs: l.property.listedAs,
      },
      lister: person(l.property.lister),
      terms: l.terms[0] ? { version: l.terms[0].version, content: l.terms[0].content } : null,
    })),
  });
}

// What each moderation action needs and leads to. Returns the new status, or throws if the
// action isn't allowed right now.
function moderationResult(
  action: "APPROVE" | "REJECT" | "SUSPEND" | "REINSTATE",
  listing: { status: ListingStatus; property: { verificationStatus: string; lister: { kycStatus: string } } },
  note: string | null,
): ListingStatus {
  switch (action) {
    case "APPROVE":
      if (listing.status !== "PENDING_REVIEW") throw conflict("Only listings waiting for review can be approved");
      if (listing.property.lister.kycStatus !== "VERIFIED") throw conflict("The lister's own identity check isn't verified yet");
      if (listing.property.verificationStatus !== "VERIFIED") throw conflict("Verify the property documents first (Checks tab)");
      return "LIVE";
    case "REJECT":
      if (listing.status !== "PENDING_REVIEW") throw conflict("Only listings waiting for review can be sent back");
      if (!note) throw badRequest("Say what needs changing, so the lister can fix it");
      return "DRAFT";
    case "SUSPEND":
      if (listing.status === "SUSPENDED") throw conflict("Already suspended");
      if (!note) throw badRequest("Give a reason for the suspension");
      return "SUSPENDED";
    case "REINSTATE":
      if (listing.status !== "SUSPENDED") throw conflict("Only suspended listings can be reinstated");
      return "LIVE";
  }
}

export async function moderateListing(req: Request, res: Response) {
  const listing = await prisma.listing.findUnique({ where: { id: idParam(req) }, include: { property: { include: { lister: true } } } });
  if (!listing) throw notFound();
  const action = oneOf(req.body?.action, "action", ["APPROVE", "REJECT", "SUSPEND", "REINSTATE"] as const);
  const note = noteInput(req.body?.note);
  const to = moderationResult(action, listing, note);

  const ref = listingRef(listing.ref);
  const message = {
    APPROVE: { title: `${ref} is live`, body: "Verified renters can now find it in the marketplace." },
    REJECT: { title: `${ref} needs changes before it goes live`, body: `RENTrust's note: ${note}` },
    SUSPEND: { title: `${ref} has been suspended`, body: `RENTrust's note: ${note}` },
    REINSTATE: { title: `${ref} is live again`, body: "The suspension has been lifted." },
  }[action];

  await prisma.$transaction(async (tx) => {
    await setListingStatus(tx, {
      listing,
      to,
      action: action.toLowerCase(),
      actorId: req.user!.id,
      note,
      // The note is kept on the listing only while it explains a rejection or suspension.
      data: { reviewNote: to === "LIVE" ? null : note, ...(action === "APPROVE" ? { publishedAt: new Date() } : {}) },
    });
    await notify(tx, {
      userId: listing.property.listerId,
      event: `listing.${action.toLowerCase()}`,
      ...message,
      link: `/app/properties/${listing.property.id}`,
      relatedType: "Listing",
      relatedId: listing.id,
      channels: ["IN_APP", "EMAIL"],
    });
  });
  res.json({ ok: true, toast: toast.success(message.title) });
}

export async function users(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const rows = await prisma.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {},
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({
    users: rows.map((u) => ({
      ...person(u),
      phone: u.phone,
      status: u.status,
      roles: roleNames(u),
      emailVerified: u.emailVerified,
      phoneVerified: u.phoneVerified,
      createdAt: u.createdAt,
    })),
  });
}

export async function setUserStatus(req: Request, res: Response) {
  const admin = req.user!;
  const id = idParam(req);
  if (id === admin.id) throw badRequest("You can't suspend your own account");
  const status = oneOf(req.body?.status, "status", ["ACTIVE", "SUSPENDED"] as const);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { status } });
    await audit(tx, {
      actorId: admin.id,
      action: status === "SUSPENDED" ? "user.suspended" : "user.reactivated",
      entityType: "User",
      entityId: id,
      before: { status: user.status },
      after: { status },
    });
  });
  res.json({ ok: true, toast: toast.success(status === "SUSPENDED" ? "Account suspended" : "Account reactivated") });
}

export async function interests(_req: Request, res: Response) {
  const rows = await prisma.interest.findMany({
    include: { seeker: true, listing: { include: { property: { include: { lister: true } } } }, report: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({
    interests: rows.map((i) => ({
      id: i.id,
      status: i.status,
      createdAt: i.createdAt,
      decidedAt: i.decidedAt,
      reportStatus: i.report?.status ?? null,
      listing: { ref: listingRef(i.listing.ref), title: i.listing.property.title },
      seeker: personName(i.seeker),
      lister: personName(i.listing.property.lister),
    })),
  });
}

export async function auditLog(req: Request, res: Response) {
  const entityType = typeof req.query.entityType === "string" && req.query.entityType ? req.query.entityType : undefined;
  const rows = await prisma.auditLog.findMany({
    where: entityType ? { entityType } : {},
    include: { actor: true },
    orderBy: { seq: "desc" },
    take: 200,
  });
  res.json({
    entries: rows.map((r) => ({
      id: r.id,
      seq: r.seq.toString(),
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      before: r.before,
      after: r.after,
      ip: r.ip,
      requestId: r.requestId,
      createdAt: r.createdAt,
      actor: r.actor ? personName(r.actor) : "System",
    })),
  });
}
