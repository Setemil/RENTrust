import type { Request, Response } from "express";
import { prisma } from "../config/db";
import type { InterestStatus, Prisma } from "../generated/prisma/client";
import { audit } from "../lib/audit";
import { listingRef, personName } from "../lib/format";
import { badRequest, clientIp, conflict, forbidden, idParam, notFound, oneOf, str } from "../lib/http";
import { notify } from "../lib/notify";
import { CONSENT_DOC_VERSION } from "./accountController";
import { roleNames } from "../models/user";
import { requestReport } from "../services/characterReport";

const OPEN: InterestStatus[] = ["INITIATED", "TERMS_ACCEPTED", "KYC_CONFIRMED", "REPORT_REQUESTED", "REPORT_READY", "AWAITING_DECISION", "APPROVED"];

export function interestSummary(i: { id: string; status: InterestStatus; createdAt: Date; decidedAt: Date | null; termsAcceptedAt: Date; terms: { version: number } }) {
  return {
    id: i.id,
    status: i.status,
    createdAt: i.createdAt,
    decidedAt: i.decidedAt,
    termsAcceptedAt: i.termsAcceptedAt,
    termsVersion: i.terms.version,
  };
}

const include = {
  terms: true,
  report: { select: { id: true, status: true, reportDate: true, provider: true } },
  seeker: true,
  listing: { include: { property: { include: { lister: true } } } },
} satisfies Prisma.InterestInclude;

type Loaded = Prisma.InterestGetPayload<{ include: typeof include }>;

async function load(id: string) {
  const interest = await prisma.interest.findUnique({ where: { id }, include });
  if (!interest) throw notFound("Interest not found");
  return interest;
}

// Each status change is an audit row, so the timeline is read back from there.
async function history(interestId: string) {
  const rows = await prisma.auditLog.findMany({
    where: { entityType: "Interest", entityId: interestId, action: { startsWith: "interest." } },
    orderBy: { createdAt: "asc" },
    select: { after: true, createdAt: true },
  });
  return rows
    .map((r) => ({ status: (r.after as { status?: string } | null)?.status, at: r.createdAt }))
    .filter((r) => r.status);
}

function listingPart(i: Loaded) {
  const p = i.listing.property;
  return {
    id: i.listing.id,
    ref: listingRef(i.listing.ref),
    title: p.title,
    area: p.area,
    state: p.state,
    type: p.type,
    rentAmount: i.listing.rentAmount,
    rentPeriod: i.listing.rentPeriod,
  };
}

// The renter's view: never includes the landlord's internal reason or the report itself.
async function seekerView(i: Loaded) {
  return {
    ...interestSummary(i),
    message: i.message,
    listing: listingPart(i),
    lister: { name: personName(i.listing.property.lister), listedAs: i.listing.property.listedAs },
    reportStatus: i.report?.status ?? null,
    history: await history(i.id),
  };
}

// The landlord's view: minimum renter detail, report status (content only via /report, which is logged).
async function listerView(i: Loaded) {
  const accesses = i.report
    ? await prisma.reportAccessLog.count({ where: { reportId: i.report.id } })
    : 0;
  return {
    ...interestSummary(i),
    message: i.message,
    decisionReason: i.decisionReason,
    listing: listingPart(i),
    seeker: {
      name: personName(i.seeker),
      accountType: i.seeker.userType,
      identityVerified: i.seeker.kycStatus === "VERIFIED",
    },
    report: i.report && { status: i.report.status, reportDate: i.report.reportDate, provider: i.report.provider, timesOpened: accesses },
    terms: { version: i.terms.version, content: i.terms.content },
    history: await history(i.id),
  };
}

export async function create(req: Request, res: Response) {
  const user = req.user!;
  if (!roleNames(user).includes("SEEKER")) throw forbidden("Only renter accounts can show interest");
  const listingId = str(req.body?.listingId, "listingId");
  if (req.body?.consentCharacterReport !== true) {
    throw badRequest("Agree to the character report so the landlord can assess your interest");
  }
  const message = str(req.body?.message, "Message", { max: 1000, optional: true }) || null;

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { property: true, terms: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!listing || listing.status !== "LIVE") throw notFound("This listing isn't available");
  if (listing.property.listerId === user.id) throw badRequest("You can't show interest in your own listing");

  // The gate (spec section 8): verified identity and the current terms version accepted.
  if (user.kycStatus !== "VERIFIED") throw forbidden("Complete your identity check before showing interest");
  const terms = listing.terms[0];
  const acceptance = terms
    ? await prisma.termsAcceptance.findUnique({ where: { userId_termsId: { userId: user.id, termsId: terms.id } } })
    : null;
  if (!terms || !acceptance) throw forbidden("Read and accept the landlord's current terms first");

  const existing = await prisma.interest.findFirst({
    where: { listingId, seekerId: user.id, status: { in: OPEN } },
  });
  if (existing) throw conflict("You've already shown interest in this property");

  const ip = clientIp(req);
  const interest = await prisma.$transaction(async (tx) => {
    const i = await tx.interest.create({
      data: {
        seekerId: user.id,
        listingId,
        termsId: terms.id,
        termsAcceptedAt: acceptance.acceptedAt,
        message,
        status: "INITIATED",
      },
    });
    await tx.consent.create({
      data: { userId: user.id, kind: "CHARACTER_REPORT", docVersion: CONSENT_DOC_VERSION, ip },
    });
    // Walk the state machine one step at a time so each transition is on the record.
    const steps: InterestStatus[] = ["INITIATED", "TERMS_ACCEPTED", "KYC_CONFIRMED", "REPORT_REQUESTED"];
    for (let s = 0; s < steps.length; s++) {
      await audit(tx, {
        actorId: user.id,
        action: `interest.${steps[s].toLowerCase()}`,
        entityType: "Interest",
        entityId: i.id,
        before: s ? { status: steps[s - 1] } : undefined,
        after: { status: steps[s], ...(s === 1 ? { termsVersion: terms.version } : {}) },
        ip,
      });
    }
    await tx.interest.update({ where: { id: i.id }, data: { status: "REPORT_REQUESTED" } });
    await notify(tx, {
      userId: listing.property.listerId,
      event: "interest.new",
      title: `New interest in ${listingRef(listing.ref)}`,
      body: "A verified renter has accepted your terms and shown interest. Their character report is being prepared.",
      link: `/app/enquiries/${i.id}`,
      relatedType: "Interest",
      relatedId: i.id,
    });
    return i;
  });

  await requestReport(interest.id);
  res.status(201).json({ interest: await seekerView(await load(interest.id)) });
}

export async function listMine(req: Request, res: Response) {
  const interests = await prisma.interest.findMany({
    where: { seekerId: req.user!.id },
    include,
    orderBy: { createdAt: "desc" },
  });
  res.json({
    interests: interests.map((i) => ({
      ...interestSummary(i),
      listing: listingPart(i),
      reportStatus: i.report?.status ?? null,
    })),
  });
}

export async function listReceived(req: Request, res: Response) {
  const interests = await prisma.interest.findMany({
    where: { listing: { property: { listerId: req.user!.id } } },
    include,
    orderBy: { createdAt: "desc" },
  });
  res.json({
    interests: interests.map((i) => ({
      ...interestSummary(i),
      listing: listingPart(i),
      seeker: { name: personName(i.seeker), accountType: i.seeker.userType, identityVerified: i.seeker.kycStatus === "VERIFIED" },
      reportStatus: i.report?.status ?? null,
    })),
  });
}

export async function getOne(req: Request, res: Response) {
  const user = req.user!;
  const interest = await load(idParam(req));
  if (interest.seekerId === user.id) return res.json({ view: "seeker", interest: await seekerView(interest) });
  const isLister = interest.listing.property.listerId === user.id;
  if (isLister || roleNames(user).includes("ADMIN")) {
    return res.json({ view: "lister", canDecide: isLister, interest: await listerView(interest) });
  }
  throw forbidden();
}

// Opening the report is logged every time (spec section 9). The landlord's first look moves the
// interest to AWAITING_DECISION.
export async function openReport(req: Request, res: Response) {
  const user = req.user!;
  const interest = await load(idParam(req));
  const isLister = interest.listing.property.listerId === user.id;
  if (!isLister && !roleNames(user).includes("ADMIN")) throw forbidden();
  const report = await prisma.characterReport.findUnique({ where: { interestId: interest.id } });
  if (!report || report.status !== "READY") throw conflict("The report isn't ready yet");

  const ip = clientIp(req);
  await prisma.$transaction(async (tx) => {
    await tx.reportAccessLog.create({ data: { reportId: report.id, accessedById: user.id, ip } });
    await audit(tx, { actorId: user.id, action: "report.accessed", entityType: "CharacterReport", entityId: report.id, ip });
    if (isLister && interest.status === "REPORT_READY") {
      await tx.interest.update({ where: { id: interest.id }, data: { status: "AWAITING_DECISION" } });
      await audit(tx, {
        actorId: user.id,
        action: "interest.awaiting_decision",
        entityType: "Interest",
        entityId: interest.id,
        before: { status: "REPORT_READY" },
        after: { status: "AWAITING_DECISION" },
        ip,
      });
    }
  });

  const accesses = await prisma.reportAccessLog.findMany({
    where: { reportId: report.id },
    orderBy: { accessedAt: "desc" },
    take: 20,
    include: { accessedBy: true },
  });
  res.json({
    report: {
      provider: report.provider,
      providerRef: report.providerRef,
      source: report.source,
      reportDate: report.reportDate,
      verificationStatus: report.verificationStatus,
      retainUntil: report.retainUntil,
      payload: report.payload,
    },
    accessLog: accesses.map((a) => ({ at: a.accessedAt, by: personName(a.accessedBy) })),
  });
}

export async function decide(req: Request, res: Response) {
  const user = req.user!;
  const interest = await load(idParam(req));
  if (interest.listing.property.listerId !== user.id) throw forbidden();
  if (interest.status !== "AWAITING_DECISION") {
    throw conflict(
      interest.status === "REPORT_READY" || interest.status === "REPORT_REQUESTED"
        ? "Open the character report before deciding"
        : "A decision has already been made",
    );
  }
  const decision = oneOf(req.body?.decision, "decision", ["APPROVE", "REJECT"] as const);
  const reason = str(req.body?.reason, "Reason", { max: 500, optional: true }) || null;
  const status: InterestStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";
  const ref = listingRef(interest.listing.ref);
  const title = interest.listing.property.title;

  await prisma.$transaction(async (tx) => {
    await tx.interest.update({
      where: { id: interest.id },
      data: { status, decisionReason: reason, decidedById: user.id, decidedAt: new Date() },
    });
    await audit(tx, {
      actorId: user.id,
      action: `interest.${status.toLowerCase()}`,
      entityType: "Interest",
      entityId: interest.id,
      before: { status: interest.status },
      after: { status },
      ip: clientIp(req),
    });
    // The reason stays internal; the renter gets a neutral message either way.
    await notify(tx, {
      userId: interest.seekerId,
      event: `interest.${status.toLowerCase()}`,
      title: decision === "APPROVE" ? `Your interest in ${ref} was approved` : `Update on your interest in ${ref}`,
      body:
        decision === "APPROVE"
          ? `The landlord approved your interest in ${title}. RENTrust will open inspection scheduling for you next.`
          : `The landlord has decided not to go ahead with your interest in ${title}. Your account and checks are unaffected, and you can keep browsing verified listings.`,
      link: `/app/interests/${interest.id}`,
      relatedType: "Interest",
      relatedId: interest.id,
      channels: ["IN_APP", "EMAIL", "SMS"],
    });
  });
  res.json({ interest: await listerView(await load(interest.id)) });
}

export async function withdraw(req: Request, res: Response) {
  const user = req.user!;
  const interest = await load(idParam(req));
  if (interest.seekerId !== user.id) throw forbidden();
  if (!["REPORT_REQUESTED", "REPORT_READY", "AWAITING_DECISION"].includes(interest.status)) {
    throw conflict("This interest can no longer be withdrawn");
  }
  await prisma.$transaction(async (tx) => {
    await tx.interest.update({ where: { id: interest.id }, data: { status: "WITHDRAWN" } });
    await audit(tx, {
      actorId: user.id,
      action: "interest.withdrawn",
      entityType: "Interest",
      entityId: interest.id,
      before: { status: interest.status },
      after: { status: "WITHDRAWN" },
      ip: clientIp(req),
    });
    await notify(tx, {
      userId: interest.listing.property.listerId,
      event: "interest.withdrawn",
      title: `Interest in ${listingRef(interest.listing.ref)} withdrawn`,
      body: "The renter has withdrawn their interest. No decision is needed.",
      link: `/app/enquiries/${interest.id}`,
      relatedType: "Interest",
      relatedId: interest.id,
    });
  });
  res.json({ interest: await seekerView(await load(interest.id)) });
}
