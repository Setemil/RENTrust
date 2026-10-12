# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: renters.** Individuals and organisations in Nigeria looking for a residential home, short-let apartment or office space, who are tired of unverified listings, fake agents and paying before they can trust anyone.
- **Secondary: landlords and authorised agents** who want enquiries from verified, assessed tenants and help managing rent after the tenancy starts.

## Product Purpose

RENTrust is a verified, account-gated rental marketplace run by RENTrust Nigeria Limited. Everyone in the deal is checked: renters (KYC/KYB), landlords and agents (identity plus ownership or mandate), and each property separately. The platform carries a rental from search through landlord approval, a supervised inspection, a lawyer-reviewed agreement and licensed payment settlement, then on into rent management.

Success: a renter finds and secures a place without being scammed; a landlord fills a property with a tenant they had the chance to assess, and gets paid on schedule.

## Positioning

RENTrust manages the whole rental ecosystem, from property search to rental management. This is the headline claim; every surface should make clear that RENTrust stays involved after move-in (rent reminders, receipts, renewals, late-rent support).

Not a listings portal. RENTrust is transaction and tenancy infrastructure built on a trust loop: verified user → verified property → landlord terms → verified interest → character assessment → landlord decision → controlled inspection → agreement → secure payment → managed tenancy. Listings are visible only to verified accounts, enforced server-side.

## Operating Context

- Launch markets: **Lagos and Abuja**.
- The platform is **not live yet**. The landing page's main action is joining a waitlist (an email link today, a form later).
- Inspection officers are assigned by RENTrust, not chosen by either party.
- Payments go through a licensed payment/settlement provider that splits funds between the landlord and the RENTrust fee. RENTrust never holds rent informally.
- Legal recovery is routed to qualified legal practitioners; the software itself never evicts anyone.

## Capabilities and Constraints

- Full specification: `RENTrust_Developer_Architecture_Business_Model_Workflow.docx`.
- Existing stack: `web/` (Vite, React, TypeScript), `server/` (Express 5, Prisma, PostgreSQL).
- Character reports are sensitive: never sent by SMS or in email bodies, minimum data shown to landlords, every access logged.
- Undecided: pricing amounts, the character-report provider, the payment provider, and the waitlist form backend. Do not state any of these.

## Brand Commitments

- Name: **RENTrust** ("REN" navy, "Trust" green). Tagline: "Marketplace for Verified Property Listings".
- Logo mark: house-roofed shield with a check. Vector files in `web/public/brand/`.
- Brand colours: navy `#0E3B61`, green `#2A8651`.
- Voice: plain, direct, reassuring without hype. Nigerian English spelling (organisation, licence).

## Evidence on Hand

- No testimonials, customer logos, user counts, press or partner names exist. Never fabricate them.
- No property photography exists yet.

## Product Principles

1. Trust is shown through mechanism (who is checked, when, by whom), never claimed through adjectives.
2. Renters come first; landlords are a real but secondary audience.
3. Say less: the landing page gives a short picture of the platform and how it helps, not the full workflow.
4. Never imply legal, payment or enforcement powers RENTrust does not hold.
