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
├── web/        Public landing site (Vite + React + TypeScript)
├── server/     API (Express 5 + TypeScript + Prisma + PostgreSQL)
├── RENTrust_Developer_Architecture_Business_Model_Workflow.docx
└── RENTrust_MVP_Backend_Flow_and_ERD.excalidraw
```

### `web/`: landing site

A single public page that introduces RENTrust to renters (first) and landlords, and collects waitlist sign-ups for Lagos and Abuja. The page is designed as a survey plan, because RENTrust checks a rental the way a surveyor checks a plot. It does not contain the marketplace or any authenticated features yet.

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

Express 5 with Prisma 7 on PostgreSQL. The identity layer exists so far: users, roles, user roles and consents. Auth is JWT-based.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/register` | Create an account |
| POST | `/api/v1/auth/login` | Sign in and receive a token |
| GET | `/api/v1/auth/me` | Current user (auth required) |
| PATCH | `/api/v1/auth/password` | Change password (auth required) |

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
npm run db:seed        # seed roles
npm run dev            # http://localhost:5050
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | API port | `5050` (5000 is taken by AirPlay Receiver on macOS) |
| `DATABASE_URL` | PostgreSQL connection string | required |
| `JWT_SECRET` | Token signing secret | required |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:5173` |

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
