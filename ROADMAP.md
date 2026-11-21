# RENTrust roadmap: to the first public test

This is the plan for getting RENTrust from today's demo to a **closed public beta** (Batch 1) where real renters and landlords complete a full rental, including paying rent through the platform. It replaces the "MVP build order" in the README as the working plan. The specification is still in `RENTrust_Developer_Architecture_Business_Model_Workflow.docx`.

Status key: `[x]` done, `[~]` in progress, `[ ]` not started.

## Where we are

Built: auth and roles, a gated marketplace, email and phone OTP, consents, KYC/KYB submission with admin review, properties and listings with moderation, versioned landlord terms, show interest, a simulated character report, the landlord's decision, in-app notifications, an admin console and an audit log.

Not built: inspection, messaging, agreements, payments, tenancy and rent management, legal recovery. Email, SMS, KYC and the character report are simulated.

## What Batch 1 has to prove

A verified renter can find a verified home, get approved, inspect it, sign a lawyer-reviewed agreement, pay rent and fees through a licensed provider, and have the landlord receive their money. Both sides get receipts, reminders and a record they can trust.

**Batch 1 scope:** Lagos only, invite-only, about 15–30 landlords and agents, then 50–150 renters. Residential lets only; short-lets and offices come after.

---

## Phase 0: Decisions and partners (week 0, runs alongside Phase 1)

These are business and legal choices. Code waits on several of them, so start now.

- [ ] **Payment provider.** Paystack or Flutterwave. Both support split settlement to landlord subaccounts, bank transfer, card, USSD and webhooks. Settlement has to go through a licensed provider; RENTrust does not hold tenants' money itself.
- [ ] **Who holds the caution deposit:** paid straight to the landlord, or held by a licensed escrow or trustee partner until the tenancy ends. This needs a legal opinion.
- [ ] **Fee model for Batch 1:** the platform fee rate, who pays it (tenant, landlord or split), and whether inspection or listing fees apply during the beta. Every fee is shown before anyone agrees to it.
- [ ] **Email provider** (Resend, Postmark or SES) and **SMS provider** (Termii or Africa's Talking). Register a sending domain.
- [ ] **KYC/KYB provider** (Smile ID, Dojah, Prembly or VerifyMe): BVN, NIN, CAC lookups and bank-account name matching.
- [ ] **Character-report provider and lawful basis,** signed off by legal. Until then, Batch 1 uses a verification summary built from RENTrust's own records, labelled as that.
- [ ] **E-signature approach:** a built-in click-to-sign with an evidence trail, or a provider. Legal confirms what is valid for a Lagos tenancy.
- [ ] **Tenancy agreement templates,** lawyer-reviewed for Lagos residential lets and versioned.
- [ ] **Hosting:** managed Postgres with point-in-time recovery, an API host, a static web host, object storage, and staging and production environments.
- [ ] **Company and compliance:** NDPA registration with the NDPC, a Data Protection Officer, Terms of Service and Privacy Policy, CAC details for the footer.

## Phase 1: Foundations, records and security (about 2 weeks)

The goal is that records are trustworthy and auditable from the first real user.

Records:
- [x] Evidence records can't be cascade-deleted: users, properties, listings, terms, acceptances, interests, reports, report access and audit rows use `Restrict`.
- [x] Soft delete (`deletedAt`) on users, properties and listings. Deleted accounts can't sign in, and deleted listings drop out of the marketplace.
- [x] Every timestamp is `timestamptz`, and IP columns are `inet` throughout.
- [x] Tamper-evident audit log. Rows are append-only (the database refuses `UPDATE`, `DELETE` and `TRUNCATE`), ordered by `seq` and hash-chained. `npm run audit:verify` checks the chain.
- [x] Each audit entry carries a request ID and user agent, so every action traces back to a request.
- [x] An append-only interest status history table. Every transition records who made it, when and why, and is guarded against races.
- [ ] Run the production API as a database role that can only `INSERT` and `SELECT` on `audit_logs`, `interest_status_history` and `report_access_logs`. Set this up at deploy (Phase 10).
- [ ] Field-level encryption, with a KMS-held key, for ID numbers and report payloads.
- [ ] Retention schedule per record type, with a scheduled purge or anonymise job.
- [ ] Account deletion that anonymises personal fields and keeps the record skeleton (NDPA).
- [ ] Legal documents (Terms of Service, Privacy Policy, consent texts) versioned in a table, with consents pointing at the exact version accepted.
- [ ] Replace untyped JSON where it matters: charges become `ListingCharge` rows, names move out of `profile`, and amenities become a lookup.

API and security:
- [x] One error shape everywhere, `{ error: { code, message, requestId } }`, plus an `X-Request-Id` header on every response.
- [ ] zod validation on every request body and query, which also produces the OpenAPI spec.
- [x] `helmet`, a body-size limit, and rate limits (strict on login, register, OTP and password reset). Counts are in memory, which is fine for one server; move them to Postgres or Redis before running more than one.
- [x] Password reset by email: a one-time link that expires in 30 minutes, and a reset or password change signs out every older token. Until the email gateway (Phase 2) the link is shown on screen in test mode, and nothing is sent in production.
- [ ] Short-lived access tokens with a refresh token, revoked on password change, suspension or deletion.
- [ ] TOTP 2FA, required for landlords, agents and all staff.
- [ ] Integration tests (Vitest and Supertest against a test database): marketplace gating, every role check, cross-user access, the interest state machine and audit-chain integrity.
- [x] CI that runs typecheck, build and the smoke test on every push to `alpha` and every PR (`.github/workflows/ci.yml`). Add the integration tests to it when they exist.

Architecture:
- [x] One folder per feature in `server/features/` (routes and handlers), shared tools in `server/shared/`, and a developer guide in `server/README.md`. New features (`inspections`, `agreements`, `payments`, `tenancies`) each get their own folder.
- [x] `npm run smoke`: an end-to-end check of every feature against a throwaway database.
- [ ] A durable job queue (`pg-boss` on Postgres) for reports, notifications, reminders, reconciliation and retention. Nothing runs on `setTimeout`.

## Phase 2: Real communications, documents and KYC (about 2 weeks)

- [ ] An email and SMS gateway behind `notify()`, sent through the job queue with retries and delivery status. OTP codes stop being returned to the page.
- [ ] Branded email templates (logo, navy and green) from the RENTrust domain, with SPF, DKIM and DMARC set up.
- [ ] Private document upload to object storage, using signed expiring links and type and size limits. Covers ID, CAC, C of O or deed, letter of authority and inspection photos.
- [ ] Uploads wired into the KYC, KYB, ownership and mandate forms and the admin review screens.
- [ ] KYC/KYB provider integration (BVN or NIN for individuals, CAC for organisations), with manual review as the fallback.
- [ ] Landlord payout account: bank account resolve plus a name match against the verified identity. This is required before a listing can take payments.
- [ ] A webhook inbox table: every provider callback is stored, verified by signature, and processed exactly once.

## Phase 3: Character report (about 1 week, needs legal sign-off)

- [ ] Provider adapter: request, then a signed webhook, then READY, with idempotency. If the provider is not cleared in time, ship the verification summary labelled as such.
- [ ] Consent screen and disclosure before any report is requested.
- [ ] Retention: reports are purged after `retainUntil`, and the purge is audited.

## Phase 4: Inspection and messaging (about 2 weeks)

- [ ] `Inspection` model and state machine: requested, then scheduled, assigned, completed or cancelled, with status history and audit.
- [ ] After approval, the renter picks from slots the landlord offered. An admin assigns an inspection officer, and the officer has their own screens: accept the job, check in, upload a checklist and photos, file the report.
- [ ] Inspection outcome: the renter confirms they want to proceed or withdraws.
- [ ] Per-interest messaging between renter and landlord or agent, opening only after approval. Messages are moderated and reportable, and both sides get email nudges. Contact details are not shared before the agreement.

## Phase 5: Tenancy agreement (about 2 weeks)

- [ ] Versioned, lawyer-reviewed `AgreementTemplate` records (Lagos residential first).
- [ ] An agreement is generated from the template, the listing, the accepted terms and the parties' verified details, then frozen as a PDF with a content hash.
- [ ] Both parties review it, and the renter can request changes within the platform's fixed controls.
- [ ] E-signature with an evidence trail: who signed, when, IP, user agent, the document hash and the OTP confirmation.
- [ ] Signed agreements stored immutably and downloadable by both parties, with versions kept.

## Phase 6: Payments and settlement (about 3 weeks)

This is the core of the beta. The money rules are:

- All amounts are stored as **kobo in `BigInt`**, with the currency on every row. Naira floats are never used.
- **Double-entry ledger.** Every movement is a balanced set of `LedgerEntry` rows (debits equal credits) against accounts: tenant, landlord payable, platform revenue, provider clearing, deposit held. Entries are never edited; a correction is a new reversing entry.
- Every payment-creating call takes an **idempotency key**. Webhooks are signature-verified and deduplicated through the webhook inbox.

Build:
- [ ] Data model: `Invoice`, `InvoiceLine`, `Payment`, `PaymentAttempt`, `LedgerAccount`, `LedgerEntry`, `Payout`, `Refund`, `Receipt`, `WebhookEvent`.
- [ ] **Move-in invoice** generated when the agreement is signed. It covers rent for the first period, service charge, caution deposit, the legal and agency fees disclosed on the listing, and the platform fee. Each line shows who receives it.
- [ ] **Checkout** through the provider (card, bank transfer and USSD), with a dedicated virtual account per invoice for bank transfers.
- [ ] **Webhook handling:** a successful charge marks the payment confirmed, posts it to the ledger, issues a receipt and moves the tenancy to ACTIVE. Failed or abandoned payments update status and notify the renter.
- [ ] **Split settlement:** the landlord's share goes to their verified subaccount, and the platform fee goes to RENTrust. The caution deposit goes wherever the Phase 0 decision says.
- [ ] **Receipts:** numbered PDFs for both parties, emailed and kept in the app.
- [ ] **Refunds and cancellations:** if the landlord pulls out or the move-in fails before handover, a refund runs through the provider, with a reversing ledger entry and an audit row.
- [ ] **Daily reconciliation:** a job matches provider settlement reports against the ledger and payouts, and any mismatch goes to a finance admin queue.
- [ ] **Finance admin:** payments, payouts, refunds, reconciliation exceptions and CSV export. Refunds above a set amount need two people to approve.
- [ ] Test coverage for the money paths in provider test mode: a successful payment, a duplicate webhook, a webhook arriving before the redirect, a partial or failed transfer, and a refund.

## Phase 7: Tenancy and rent management (about 2 weeks)

- [ ] `Tenancy` record: parties, property, agreement, start and end dates, rent, frequency, status (pending payment, active, notice, ended, in default) and status history.
- [ ] **Rent schedule** generated from the agreement (yearly, twice-yearly, quarterly or monthly), with an invoice per period.
- [ ] **Reminders** 90, 60, 30 and 14 days before rent is due, then on the due date and when overdue, by email, SMS and in-app, run by the job queue.
- [ ] **Paying rent:** the same checkout, split and receipt flow as move-in. For monthly rent, an optional saved-card authorisation or direct-debit mandate where the provider supports it.
- [ ] **Renewal:** the landlord offers new terms 90 days before the end date, and the renter accepts or declines. Accepting produces a new agreement version and schedule.
- [ ] **Ledger view** for each tenancy: everything invoiced, paid and outstanding, with downloadable statements.
- [ ] **Landlord dashboard:** occupied units, rent due, rent received, overdue, and upcoming renewals.
- [ ] **Default handling for Batch 1:** overdue status, escalating reminders and an admin flag. The legal recovery module waits until after the beta.

## Phase 8: Marketplace quality and admin (about 1.5 weeks, can run alongside Phases 5–7)

- [ ] Listing photos: upload, reorder, a cover image, and thumbnails served through a CDN.
- [ ] Search: filters for price, bedrooms, area, type and furnishing, plus sorting and cursor pagination. Postgres full-text and trigram search for now.
- [ ] Saved searches with alerts.
- [ ] Report a listing or a user, with a moderation queue and suspend and ban actions.
- [ ] Staff roles: verification officer, moderator, inspection coordinator, finance admin, super admin, and a read-only auditor.
- [ ] Admin exports (CSV) and simple operational reports.
- [ ] Mobile and accessibility pass on every signed-in screen, aiming for WCAG 2.2 AA at a 375px width.

## Phase 9: Compliance and trust content (about 1 week, alongside Phase 8)

- [ ] Terms of Service, Privacy Policy, fee schedule and cookie notice, published and versioned.
- [ ] Data export and account deletion requests from the profile page.
- [ ] A data processing register, plus a DPA with each provider (payments, email, SMS, KYC, report, hosting).
- [ ] Help centre, support email and phone, response-time commitments, and a complaints and dispute process.
- [ ] Company details (CAC number, registered address) in the footer.
- [ ] The landing-page waitlist form saves to the API instead of opening `mailto:`.

## Phase 10: Production, operations and launch (about 1.5 weeks)

- [ ] Staging and production environments, with secrets in the host's secret manager.
- [ ] CI/CD: build, test, run `db:deploy` and release. The seed never runs in production, and the first admin is created with a one-off script.
- [ ] Database: point-in-time recovery, daily backups, a restore drill, a connection pooler, and an app role that can only insert into append-only tables.
- [ ] Observability: Sentry on the API and web app, structured JSON logs with request IDs, uptime checks, a public status page and alerting.
- [ ] Security: dependency scanning, `/security-review`, and an external penetration test of auth, payments and file access before invites go out.
- [ ] Product analytics: the funnel from sign-up through verified, interest, approved, inspected, signed and paid, to see where people drop off.
- [ ] Runbooks: payment incidents, data requests, account takeover and outages.
- [ ] Pre-launch rehearsal: run the full loop on staging with real people and small real payments (₦100 rent) through the provider's live mode.

## Batch 1 launch

1. Onboard landlords and agents first, then verify their identity, properties and payout accounts.
2. Invite renters in waves of about 25, and watch the funnel and support queue between waves.
3. Hold a weekly review of reconciliation reports, the audit-chain check, support tickets and drop-off points.

**Exit criteria for opening wider:**
- At least 10 tenancies completed end to end with payment.
- Zero unreconciled money.
- No critical security findings outstanding.
- Support response under one working day.

## Timeline (estimates)

| Phases | One developer | Two developers |
| --- | --- | --- |
| 1 Foundations | 2 weeks | 1 week |
| 2 Comms, documents, KYC | 2 weeks | 1 week |
| 3 Character report | 1 week | 0.5 week |
| 4 Inspection and messaging | 2 weeks | 1 week |
| 5 Agreement | 2 weeks | 1 week |
| 6 Payments | 3 weeks | 2 weeks |
| 7 Tenancy and rent | 2 weeks | 1.5 weeks |
| 8–9 Marketplace, admin, compliance | 2.5 weeks | runs in parallel |
| 10 Production and launch | 1.5 weeks | 1 week |
| **Total** | **about 18 weeks** | **about 10–11 weeks** |

Payments, agreements and the character report depend on Phase 0 decisions, so legal and partner work should start immediately.

## After Batch 1

Legal recovery module, short-lets (nightly pricing, calendar, check-in) and corporate tenants, subscriptions and featured listings, search with Meilisearch or Typesense, read replicas, partitioned audit and notification tables, a mobile app, more states, and ISO 27001 or SOC 2.

## Engineering standards (apply to every phase)

- **Money:** kobo stored as `BigInt`, a double-entry ledger, idempotency keys and reconciliation.
- **Records:** no hard deletes of evidence. History lives in append-only tables, the audit log is hash-chained, and every timestamp is `timestamptz`.
- **State machines:** every status change goes through one guarded function that writes history and an audit row.
- **Providers:** each sits behind an adapter with a simulated implementation for development and tests. Webhooks go through the inbox.
- **Privacy:** data minimisation, field encryption for identifiers, no report content in email or SMS, and retention jobs.
- **API:** versioned under `/api/v1`, one error shape, request IDs, an OpenAPI spec and cursor pagination.
- **Quality:** typecheck, tests and review on every PR, and integration tests for every role and state transition.
