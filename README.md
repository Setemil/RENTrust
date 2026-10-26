# RENTrust

RENTrust is a verified, account-gated rental marketplace for Nigeria. It connects verified individuals and organisations looking for residential homes, short-lets and office space with verified landlords and authorised agents. It then carries the deal through interest approval, inspection, a lawyer-reviewed tenancy agreement, licensed payment settlement and ongoing rent management.

RENTrust is meant to be transaction and tenancy infrastructure, not just a listings portal. Every rental runs through this trust loop:

```
Verified user → Verified property → Landlord terms → Verified interest
→ Character assessment → Landlord decision → Controlled inspection
→ Agreement → Secure payment → Managed tenancy
```

The full product, architecture and business specification is in [`RENTrust_Developer_Architecture_Business_Model_Workflow.docx`](RENTrust_Developer_Architecture_Business_Model_Workflow.docx). The MVP backend flow and ERD are in [`RENTrust_MVP_Backend_Flow_and_ERD.excalidraw`](RENTrust_MVP_Backend_Flow_and_ERD.excalidraw).

## How it works

1. **Account and verification.** Property seekers sign up as an individual (KYC) or an organisation (KYB) before they can open the marketplace. Landlords and agents verify their identity and their ownership or mandate before listing. Properties are verified separately from the people who list them.
2. **Gated marketplace.** Unauthenticated visitors only see public pages. Listings, landlord details, saved searches and every later step need a verified account, and this is enforced on the server.
3. **Landlord terms and interest.** A seeker reads and accepts the landlord's terms, and the exact version accepted is stored. Only then can they show interest.
4. **Character report.** Each interest triggers a report from an approved provider. Landlords see only the minimum necessary information, every access is logged, and report content is never sent over SMS.
5. **Landlord decision.** The landlord approves or rejects. Approval opens inspection scheduling. Rejection notifies the seeker.
6. **Inspection.** An admin assigns an inspection officer, who conducts the visit and files a report.
7. **Agreement and payment.** The agreement is generated from lawyer-reviewed, versioned templates and signed by both parties. Payment goes through a licensed provider that splits settlement between the landlord and the RENTrust platform fee.
8. **Tenancy and rent management.** Rent schedules, reminders 90/60/30/14 days before rent is due, receipts, a ledger, renewals and defaults. Where needed, a landlord can instruct legal recovery, which is routed to qualified legal practitioners.

## Roles

| Role | Summary |
| --- | --- |
| Property seeker (individual / organisation) | Verify, search, accept terms, show interest, inspect, sign, pay, manage tenancy |
| Landlord | Verify ownership, subscribe, list, set terms, review reports, approve or reject, manage rent |
| Agent / property manager | Verify authority, list mandated properties, manage enquiries |
| Inspection officer | Accept assignments, conduct inspections, submit reports |
| Verification officer / moderator | Review KYC, KYB, properties and listings |
| Finance admin | Subscriptions, fees, settlement and reconciliation |
| Legal / recovery officer | Instructed notices and recovery matters |
| Super admin | Configuration, roles, permissions, audit |

## Revenue model

Listing subscriptions, featured listings, transaction platform fees, optional rent-management fees, inspection fees (if charged) and legal-recovery fees. Every fee is disclosed before a party agrees to it.

## Repository layout

```
RENTrust/
├── web/        Landing page and signed-in app (Vite + React + TypeScript)
├── server/     API (Express 5 + TypeScript + Prisma + PostgreSQL)
├── RENTrust_Developer_Architecture_Business_Model_Workflow.docx
└── RENTrust_MVP_Backend_Flow_and_ERD.excalidraw
```

### `web/`: landing site and app

The public landing page (`/`) introduces RENTrust and collects waitlist sign-ups. It is designed as a set of numbered survey-plan sheets. The signed-in app (`/app`, plus `/login` and `/signup`) keeps the same colours, type and square, ruled look, but without the sheet frames. App code lives in `web/src/app/`: shared UI in `ui.tsx`, `Form.tsx` and `Traverse.tsx`, and one file per area in `pages/`.

```
web/src/
├── content.ts          All page copy, nav, form options and CONTACT_EMAIL
├── App.tsx             Section order and each sheet's scale
├── styles/             tokens.css (colours, type, spacing) and base.css
├── lib/motion.ts       useMotion: GSAP + ScrollTrigger setup with a reduced-motion guard
├── components/         Sheet, TitleBlock, WaitlistForm, Header, Footer, Logo, Button styles
│   └── plan/           Survey drawings: ParcelPlan (hero), OverlapPlan, shared marks and geometry
└── sections/           Hero, Checks, Steps, Landlords, Closing
```

- Change wording in `content.ts`. Components only render it.
- Animations use GSAP through `useMotion`. They only run when the visitor allows motion, and the markup's default is always the finished state.
- Every section is wrapped in `Sheet`, which draws the frame, the sheet number and the scale bar.
- Bearings and distances on the hero plot are calculated from its corner points in `plan/geometry.ts`, so editing the shape keeps the labels correct.
- The waitlist form has no backend yet. It opens the visitor's email app addressed to `CONTACT_EMAIL`. Replace `handleSubmit` in `WaitlistForm.tsx` once an API endpoint exists, and confirm the real contact address.
- Design rules and tokens are recorded in [`DESIGN.md`](DESIGN.md). Product context is in [`PRODUCT.md`](PRODUCT.md).

### `server/`: API

Express 5 with Prisma 7 on PostgreSQL, JWT auth. The MVP covers the trust loop up to the landlord's decision: account checks, property and listing verification, versioned landlord terms, show interest, character report and approve/reject. Inspection, agreements, payments and tenancy come next.

```
server/
├── controllers/   auth, account (OTP, consents, KYC/KYB), property, marketplace, interest, notification, admin
├── routers/       authRouter (public) and appRouter (everything behind requireAuth + role checks)
├── services/      characterReport.ts: the simulated report provider (swap for a real one here)
├── lib/           audit log writer, notifications, input checks
└── prisma/        schema, migrations and seed (test accounts and listings)
```

| Area | Routes (all under `/api/v1`, all need a signed-in account) |
| --- | --- |
| Account checks | `GET /account/status`, `POST /account/otp/send`, `POST /account/otp/verify`, `POST /account/consents`, `POST /account/verification` |
| Marketplace | `GET /listings`, `GET /listings/:id`, `POST /listings/:id/terms/accept`, `POST` / `DELETE /listings/:id/save` |
| Landlord / agent | `GET` / `POST /properties`, `GET` / `PATCH /properties/:id`, `PUT /properties/:id/terms`, `POST /properties/:id/submit`, `POST /properties/:id/availability` |
| Interests | `POST /interests`, `GET /interests/mine`, `GET /interests/received`, `GET /interests/:id`, `GET /interests/:id/report` (logged), `PATCH /interests/:id/decision`, `POST /interests/:id/withdraw` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all` |
| Admin | `GET /admin/overview`, `GET` / `PATCH /admin/verifications`, `GET` / `PATCH /admin/listings`, `GET` / `PATCH /admin/users`, `GET /admin/interests`, `GET /admin/audit` |

What is simulated until providers are chosen (the UI labels each one "Test mode"):

- **Email and SMS codes:** outside production the code is returned to the page and logged by the server.
- **KYC / KYB and property documents:** go to the admin review queue. Only a masked ID number and a document reference are stored; there is no file upload yet.
- **Character report:** `services/characterReport.ts` returns a report built only from RENTrust's own account data, after `REPORT_DELAY_MS`.
- **Email and SMS notifications:** stored as `SIMULATED` rows next to the in-app notification. Report content never goes in them.

## Getting started

Requirements: Node.js 20.19 or newer, npm, and PostgreSQL.

### Landing site

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and build to web/dist
```

### API

```bash
cd server
cp .env.example .env   # then set DATABASE_URL and JWT_SECRET
npm install            # also generates the Prisma client
npm run db:migrate     # apply migrations
npm run db:seed        # roles, test accounts and test listings
npm run dev            # http://localhost:5050
```

`npm run db:reset` wipes the database, re-applies migrations and re-seeds. It deletes every account, not just the test ones.

### Testing the MVP

Every seeded account uses the password `rentrust-test`.

| Account | Use it to |
| --- | --- |
| `renter@rentrust.test` | Browse, accept a landlord's terms, show interest, follow progress |
| `company@rentrust.test` | The same, as an organisation (KYB) |
| `newrenter@rentrust.test` | See the experience while an identity check is still in review |
| `landlord@rentrust.test` | Manage listings (one is waiting for review), open character reports, approve or reject |
| `agent@rentrust.test` | List as an agent (mandate instead of ownership) |
| `admin@rentrust.test` | Approve identity checks, property documents and listings; see users, interests and the audit log |

A full loop: sign in as the renter and show interest in a Bola Adeyemi listing. Sign in as the landlord; the report is ready a few seconds later under Enquiries. Open it, then approve or reject. The renter sees the decision under My interests and Notifications. To test sign-up, create a new account, confirm email and phone with the codes shown on screen, accept the terms, submit an ID check, then approve it as the admin.

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | API port | `5050` (5000 is taken by AirPlay Receiver on macOS) |
| `DATABASE_URL` | PostgreSQL connection string | required |
| `JWT_SECRET` | Token signing secret | required |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:5173` |
| `REPORT_DELAY_MS` | Delay before the simulated character report is ready | `4000` |

## MVP build order

From the specification, section 30:

1. Authentication and account-gated marketplace
2. Individual KYC/KYB and landlord/agent verification
3. Property creation, moderation and search
4. Landlord terms module
5. Show interest and interest state machine
6. Character-report provider integration and landlord decision dashboard
7. Inspection scheduling and admin officer assignment
8. Messaging and notifications
9. Tenancy agreement engine
10. Payment and settlement integration
11. Tenancy and rent-management module
12. Admin, audit and reporting
13. Legal recovery module
14. Short-let and corporate enhancements

## Security principles

- Role-based access control on every dashboard and API, with marketplace gating enforced on the server
- Encryption in transit and at rest, and access-controlled document links
- 2FA for landlords, agents, admins and sensitive operations
- Immutable audit logs for KYC, report access, landlord decisions, inspections, agreements and payments
- Consent records for character-report processing, data minimisation, and defined retention and deletion periods
- Signed payment webhooks and idempotency keys for payment and settlement operations

## Legal note

Before launch, RENTrust's legal team needs to validate the character-report data source and lawful basis, estate-agency rules in each operating state, tenancy-document and e-signature requirements, the payment settlement structure, consumer terms and the scope of the legal recovery service. The platform should support rules that vary by jurisdiction rather than assume one workflow fits all of Nigeria.

---

© RENTrust Nigeria Limited
