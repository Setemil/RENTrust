# Tutorial 4: Login and security

This tutorial explains how RENTrust knows who is making a request and what they may do. It uses two small libraries: **bcrypt** for passwords and **jsonwebtoken** for sign-in tokens. Do [Tutorial 3](3-node-typescript-express.md) first.

## 1. The whole flow

1. **Register.** The user sends an email and password. The server stores a *hash* of the password, never the password.
2. **Log in.** The user sends the email and password again. The server checks the password against the hash and, if it matches, returns a *token*.
3. **Every later request.** The web app sends the token in a header. A middleware checks it and loads the user.
4. **Permissions.** A second check asks whether this user's role may use this route, and whether this record belongs to them.

## 2. Passwords: bcrypt

A **hash** is a one-way scramble. You can turn a password into a hash, but not a hash back into a password. If the database is ever stolen, the thief gets hashes, not passwords.

Create `server/learn.ts` (a scratch file; delete it afterwards):

```ts
import bcrypt from "bcrypt";

async function main() {
  const hash = await bcrypt.hash("my-password", 12);
  console.log(hash);

  console.log(await bcrypt.compare("my-password", hash));    // true
  console.log(await bcrypt.compare("wrong-password", hash)); // false

  // The same password gives a different hash every time.
  console.log(await bcrypt.hash("my-password", 12));
}

main();
```

```bash
npx tsx learn.ts
```

What to notice:

- **Two hashes of one password differ.** bcrypt mixes in a random value called a *salt*, so two users with the same password don't share a hash.
- **The `12` is the cost.** A higher number makes each hash slower to compute, which makes guessing millions of passwords impractical.
- **You never decode a hash.** To check a login you call `compare`, which hashes the attempt the same way and compares the results.

RENTrust wraps these in two one-line helpers, `hashPassword` and `verifyPassword`, in [`features/auth/users.ts`](../../server/features/auth/users.ts).

## 3. Tokens: JWT

After login the server needs a way to recognise the user on the next request without asking for the password again. It hands out a **JSON Web Token (JWT)**: a short text that says "this is user X", signed with a secret only the server knows.

Replace `learn.ts` with:

```ts
import jwt from "jsonwebtoken";

const SECRET = "a-long-random-secret";

const token = jwt.sign({ sub: "user-123" }, SECRET, { expiresIn: "1d" });
console.log(token);

console.log(jwt.verify(token, SECRET)); // { sub: 'user-123', iat: …, exp: … }

try {
  jwt.verify(token, "the-wrong-secret");
} catch (err) {
  console.log("Rejected:", (err as Error).message);
}
```

Run it again. Then paste the printed token into [jwt.io](https://jwt.io) and look at its three parts, separated by dots:

| Part | Holds |
| --- | --- |
| Header | The signing method |
| Payload | The data: `sub` (the user's ID), `iat` (issued at), `exp` (expires at) |
| Signature | Proof that the server made it |

Two facts follow from this:

- **Anyone can read a token's payload.** It is encoded, not encrypted. Never put a password or private data in one. RENTrust's tokens hold only the user's ID.
- **Nobody can change a token without the secret.** Editing the payload breaks the signature, and `verify` rejects it. That is why `JWT_SECRET` in `.env` must be long, random and private. Anyone who has it can sign in as anyone.

## 4. The guard: `requireAuth`

Open [`shared/auth.ts`](../../server/shared/auth.ts). `requireAuth` is a middleware like the `requireKey` you wrote in Tutorial 3. It:

1. reads the header `Authorization: Bearer <token>`,
2. verifies the token and takes the user's ID from it,
3. loads that user from the database,
4. refuses if the user is missing, deleted or suspended,
5. stores the user in `req.user` and calls `next()`.

Step 3 matters. Because the user is loaded on every request, suspending an account takes effect immediately, even though the old token hasn't expired.

In [`routes.ts`](../../server/routes.ts), the line `api.use(requireAuth)` sits below the auth routes and above everything else. So register and login are open, and every other route needs a token.

## 5. Try it by hand

Start the server (`npm run dev` in `server/`). Log in as the seeded renter; the test password is listed under "Testing the MVP" in the [main README](../../README.md#testing-the-mvp).

```bash
curl -X POST http://localhost:5050/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"renter@rentrust.test","password":"PASSWORD-FROM-README"}'
```

The response holds a `token` and the `user`. Copy the token and save it in the terminal:

```bash
TOKEN="paste-the-token-here"
```

Now call a protected route three ways:

```bash
curl http://localhost:5050/api/v1/auth/me
```

```bash
curl http://localhost:5050/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

```bash
curl http://localhost:5050/api/v1/admin/overview -H "Authorization: Bearer $TOKEN"
```

The first answers 401 because there is no token. The second returns the renter's account. The third answers 403: the renter is signed in, but isn't an admin.

Note the shape of every error: `{ "error": { "code", "message", "requestId" } }`. The 403 also carries a `toast`, which the web app pops up.

## 6. Roles and ownership

Knowing who the user is (**authentication**) is half the job. The other half is deciding what they may do (**authorisation**). RENTrust checks two things.

**Role.** Each user holds roles such as `SEEKER`, `LANDLORD` or `ADMIN`. A feature limits its routes to roles with `requireRole`. This line is at the top of [`features/admin/routes.ts`](../../server/features/admin/routes.ts):

```ts
router.use(requireRole("ADMIN"));
```

**Ownership.** A landlord may edit properties, but only their own. A role check can't know that, so each handler that takes an `:id` loads the record and confirms it belongs to the signed-in user. See `loadOwn` in [`features/properties/handlers.ts`](../../server/features/properties/handlers.ts).

Forgetting the ownership check is one of the most common security bugs in web apps: a signed-in user changes the ID in the URL and reads someone else's record.

## 7. Other protections in the project

| Protection | What it prevents | Where |
| --- | --- | --- |
| The same error for a wrong email and a wrong password | Finding out which emails have accounts | `login` in [`features/auth/handlers.ts`](../../server/features/auth/handlers.ts) |
| Input checks on every field | Bad or oversized data reaching the database | [`shared/input.ts`](../../server/shared/input.ts) |
| Prisma builds the SQL | SQL injection: user text being run as SQL | every query |
| CORS limited to `CLIENT_URL` | Other websites calling the API from a visitor's browser | [`app.ts`](../../server/app.ts) |
| An audit row for every sensitive action | Changes nobody can trace | [`shared/audit.ts`](../../server/shared/audit.ts) |
| Secrets in `.env`, never in code | Leaking the database password or `JWT_SECRET` through git | [`shared/env.ts`](../../server/shared/env.ts) |
| Rate limits on login, sign-up, codes and password reset | Guessing passwords or codes by trying thousands | [`shared/rateLimit.ts`](../../server/shared/rateLimit.ts) |
| Changing or resetting a password signs out older tokens | A stolen token outliving the password change | `requireAuth` in [`shared/auth.ts`](../../server/shared/auth.ts) |

Still to come, as listed in the [roadmap](../../ROADMAP.md): short-lived tokens with refresh, and two-factor login.

## Exercises

1. In the bcrypt script, change the cost from 12 to 14 and time both. What changed?
2. Sign a token with `expiresIn: "2s"`, wait three seconds (`setTimeout`), then verify it. What is the error message?
3. Log in as the landlord and call `GET /api/v1/properties`. Then call it with the renter's token. Explain the difference.
4. In `shared/auth.ts`, what answer does a suspended user get, and with which error code?
5. Why does `login` check the password even when no user has that email?

## Answers

1. Each hash takes about four times longer. Every step up doubles the work.
2. `jwt expired`. The signature is still valid, but the `exp` time has passed.
3. The landlord gets their properties. The renter gets 403, because the properties routes are limited to landlords and agents.
4. 401 with the code `ACCOUNT_INACTIVE`, because `requireAuth` loads the user on every request and checks its status.
5. It doesn't quite: `!user ||` stops before the password check. What matters is that both cases return the *same* message and code, so a visitor can't tell a wrong email from a wrong password.

## Go further

- [Introduction to JSON Web Tokens](https://jwt.io/introduction)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/): the most common web security mistakes
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

You have finished the tutorials. Go back to the [index](README.md#after-the-tutorials) for what to do next.
