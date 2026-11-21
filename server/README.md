# RENTrust server: developer guide

Express 5, TypeScript, Prisma and PostgreSQL. This page tells you where things live and how to add to them. Setup commands are in the [main README](../README.md#getting-started).

## Where things live

```
server/
├── index.ts      Starts the server
├── app.ts        The Express app: request setup, routes, error handling
├── routes.ts     Mounts every feature under /api/v1 (one line per feature)
├── features/     One folder per feature. This is where you'll work.
│   ├── auth/           register, login, change password; loading and creating users
│   ├── account/        email and phone codes, consents, identity or business check
│   ├── properties/     a landlord's or agent's own properties, listings and terms
│   ├── marketplace/    what renters see: search, listing detail, accept terms, save
│   ├── interests/      show interest, character report, landlord's decision
│   ├── notifications/  in-app notifications
│   └── admin/          staff: review checks, moderate listings, users, audit log
├── shared/       Small tools every feature uses (listed below)
├── prisma/       schema.prisma, migrations, seed.ts
└── scripts/      smoke test and audit-chain check
```

Each feature folder has the same two files, plus helpers only when it needs them:

| File | What goes in it |
| --- | --- |
| `routes.ts` | The feature's URLs, each pointing at a handler. Nothing else. |
| `handlers.ts` | One function per URL: read the input, check the rules, change the data, send the response. |
| other files | Logic that more than one handler or feature uses, named for what it holds (`interests/status.ts`, `properties/listing.ts`, `auth/users.ts`). |

## How a request flows

`app.ts` → `routes.ts` → the feature's `routes.ts` → a handler in `handlers.ts` → the response.

A handler reads top to bottom in four steps:

```ts
export async function setAvailability(req: Request, res: Response) {
  // 1. Load what the request is about (this also checks the user owns it)
  const listing = (await loadOwn(req)).listing!;
  // 2. Read and check the input
  const action = oneOf(req.body?.action, "action", ["PAUSE", "RESUME", "MARK_OCCUPIED"] as const);
  // 3. Check the rules; throw if the request isn't allowed
  const { from, to } = AVAILABILITY[action];
  if (!from.includes(listing.status)) throw conflict("Can't do that right now");
  // 4. Make the change in a transaction, then respond
  await prisma.$transaction((tx) => setListingStatus(tx, { listing, to, action: action.toLowerCase(), actorId: req.user!.id }));
  res.json({ ok: true });
}
```

To stop a request, **throw** an error from `shared/errors.ts`. Never build an error response by hand; `app.ts` turns every thrown error into `{ error: { code, message, requestId } }`.

## Toasts: messages that pop up in the web app

The server decides when the web app shows a toast.

- **Announce a success:** add a `toast` field to the response.

  ```ts
  res.json({ ok: true, toast: toast.success("RT-0007 is live") });
  ```

  Use `toast.info("…")` for neutral news.
- **Errors need nothing extra.** Just throw. `app.ts` adds an error toast to every 403, 404, 409 and server error. A 400 or 401 is a form problem, so it carries no toast and the page shows it beside the form.

On the web side, `useAction` in `web/src/app/useApi.ts` shows any toast that arrives, so pages need no extra code. The toast itself lives in `web/src/app/toast.tsx`.

## The shared tools

| File | Use it for |
| --- | --- |
| `shared/db.ts` | `prisma`, the database client |
| `shared/errors.ts` | `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict` |
| `shared/input.ts` | Reading input: `str`, `int`, `oneOf`, `note`, `idParam`, `clientIp` |
| `shared/auth.ts` | Route guards `requireAuth` and `requireRole(...)`, plus `hasRole(user, ...)` |
| `shared/audit.ts` | `audit(tx, {...})`: record a sensitive action |
| `shared/notify.ts` | `notify(tx, {...})`: tell a user something happened |
| `shared/toast.ts` | `toast.success("…")`: pop a message up in the web app (see below) |
| `shared/rateLimit.ts` | `limit({ minutes, max, by })`: cap how often a visitor can call a route. Put one on any route that sends a message, checks a secret or works without signing in. |
| `shared/format.ts` | `listingRef`, `personName` |
| `shared/env.ts` | Every environment setting. Don't read `process.env` anywhere else. |
| `shared/context.ts` | The current request's ID, IP and user agent (used by `audit`) |

## Adding a feature

Say you're adding inspections.

1. **Data.** Add the models to `prisma/schema.prisma`, then run `npx prisma migrate dev --name inspections`.
2. **Folder.** Create `features/inspections/` with `routes.ts` and `handlers.ts`. Copy `features/notifications/` as the smallest working example.
3. **Mount it.** Add one line to `routes.ts`: `api.use("/inspections", inspectionRoutes);`
4. **Write the handlers** using the four steps above.
5. **Check it.** Add the feature's checks to the bottom of `scripts/smoke.mjs`, then run `npm run typecheck` and `npm run smoke`.

Adding a URL to an existing feature is steps 4 and 5, plus one line in that feature's `routes.ts`.

## Rules that keep the records trustworthy

- **Every state change writes an audit row** in the same transaction: `await audit(tx, {...})`.
- **Status changes go through one function per thing.** Use `transitionInterest` (`interests/status.ts`) and `setListingStatus` (`properties/listing.ts`). When you add something with a status, give it its own function like these and call it everywhere.
- **Nothing that serves as evidence is deleted.** Users, properties and listings have `deletedAt` (soft delete). The audit log, report access log and interest history refuse updates and deletes at the database level.
- **Check ownership on every load.** A handler that takes an `:id` must confirm the signed-in user may see that record (see `loadOwn` in `properties/handlers.ts`).
- **Never put character-report content in a notification.** Email and SMS only say "log in to review".

## Rules that keep the code easy to change

- **Keep it plain.** Write the obvious code first. No classes, decorators, generic base handlers or clever type tricks.
- **One job per function,** and a handler that fits on one screen. When a handler grows, pull a named helper out of it (see `businessDetails` and `identityDetails` in `account/handlers.ts`).
- **Share only what is used twice.** Don't write a helper for one caller.
- **Features may use each other's helper files, never each other's handlers.** `marketplace` may import from `interests/status.ts`, not from `interests/handlers.ts`.
- **Comments say why,** or what a rule is. Each file opens with a line or two on what it's for.
- **Names say what a thing is** in the product's words: property, listing, terms, interest, check.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API with reload, on port 5050 |
| `npm run typecheck` | Type-check everything |
| `npm run smoke` | Run every feature end to end against a throwaway database |
| `npm run audit:verify` | Check that no audit row has been altered |
| `npm run db:migrate` | Create and apply a migration after changing `schema.prisma` |
| `npm run db:seed` | Add roles, test accounts and test listings |
| `npm run db:reset` | Wipe the database, re-apply migrations and re-seed |
