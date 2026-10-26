import { prisma } from "../config/db";
import { audit } from "../lib/audit";
import { listingRef, personName } from "../lib/format";
import { notify } from "../lib/notify";

// Simulated character-report provider. The real provider is undecided (PRODUCT.md), so this
// adapter stands in for "request > provider webhook > READY". Replace requestReport and the
// timer with the provider's API call and a signed webhook handler.
export const TEST_PROVIDER = "Test provider (simulated)";
const DELAY_MS = Number(process.env.REPORT_DELAY_MS ?? 4000);
const RETENTION_DAYS = 180;

export async function requestReport(interestId: string) {
  const report = await prisma.characterReport.create({
    data: { interestId, provider: TEST_PROVIDER, status: "REQUESTED" },
  });
  setTimeout(() => {
    completeReport(report.id).catch((err) => console.error("Character report job failed:", err));
  }, DELAY_MS);
  return report;
}

// What the "provider" returns. Only facts RENTrust itself holds about the renter: no scores,
// no inferred traits (spec section 9).
async function completeReport(reportId: string) {
  const report = await prisma.characterReport.findUnique({
    where: { id: reportId },
    include: {
      interest: {
        include: {
          seeker: true,
          listing: { include: { property: true } },
        },
      },
    },
  });
  if (!report || report.status !== "REQUESTED") return;
  const { interest } = report;
  if (interest.status !== "REPORT_REQUESTED") return;

  const seeker = interest.seeker;
  const identity = await prisma.verification.findFirst({
    where: { subjectType: "USER", subjectId: seeker.id, status: "APPROVED" },
    orderBy: { reviewedAt: "desc" },
  });
  const now = new Date();
  const retainUntil = new Date(now.getTime() + RETENTION_DAYS * 864e5);

  await prisma.$transaction(async (tx) => {
    await tx.characterReport.update({
      where: { id: report.id },
      data: {
        status: "READY",
        providerRef: `TEST-${report.id.slice(0, 8).toUpperCase()}`,
        source: "RENTrust account records (test data, no external source queried)",
        reportDate: now,
        verificationStatus: identity ? "Identity verified" : "Identity not verified",
        retainUntil,
        payload: {
          name: personName(seeker),
          accountType: seeker.userType === "ORG" ? "Organisation" : "Individual",
          identityCheck: identity ? (identity.kind === "BUSINESS" ? "Business check passed" : "Government ID check passed") : "Not completed",
          identityCheckedOn: identity?.reviewedAt?.toISOString() ?? null,
          emailConfirmed: seeker.emailVerified,
          phoneConfirmed: seeker.phoneVerified,
          memberSince: seeker.createdAt.toISOString(),
          tenancyReferences: "None supplied by the test provider",
        },
      },
    });
    await tx.interest.update({ where: { id: interest.id }, data: { status: "REPORT_READY" } });
    await audit(tx, {
      actorId: null,
      action: "interest.report_ready",
      entityType: "Interest",
      entityId: interest.id,
      before: { status: "REPORT_REQUESTED" },
      after: { status: "REPORT_READY" },
    });
    // Spec section 10 wording. No report content in any channel.
    await notify(tx, {
      userId: interest.listing.property.listerId,
      event: "report.ready",
      title: `Character report ready for ${listingRef(interest.listing.ref)}`,
      body: "A character report for your prospective tenant is ready. Log in to RENTrust to review the report and decide whether to approve or reject the interest.",
      link: `/app/enquiries/${interest.id}`,
      relatedType: "Interest",
      relatedId: interest.id,
      channels: ["IN_APP", "EMAIL", "SMS"],
    });
  });
}

// Picks up reports that were still pending when the server stopped.
export async function resumePendingReports() {
  const pending = await prisma.characterReport.findMany({ where: { status: "REQUESTED" }, select: { id: true } });
  for (const { id } of pending) {
    completeReport(id).catch((err) => console.error("Character report job failed:", err));
  }
}
