# Deploy to Railway

RENTrust runs on Railway as one project with three services: the **database**, the **server** (API) and the **web** app. Each push to `alpha` redeploys whichever of the server or web folders changed.

Railway builds each service with `npm run build` and starts it with `npm start`, from that folder's `package.json`. The server's `start` applies any new database migrations before it starts, so database changes go out with the code. What you set up by hand is the services, a few settings and the variables.

There is no `railway.json` in the repo. Railway has deprecated those files and no longer lets new services use them, so every setting below is made in the dashboard.

## 1. Create the project and the database

1. In Railway, create a new project (**New Project → Empty project**).
2. Add the database: **Create → Database → PostgreSQL**. Railway names it `Postgres`; keep that name, because the variables below refer to it.

## 2. Add the server

1. **Create → GitHub Repo → RENTrust.** Rename the service to `server`.
2. In the service's **Settings**:
   - **Root Directory:** `/server`
   - **Branch:** `alpha`
   - **Watch Paths:** `/server/**`, so the server only redeploys when its own folder changes
   - **Healthcheck Path:** `/api/v1/health`, so Railway only switches traffic to a new version once it answers
3. In **Variables**, add:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (a reference, so it follows the database if it changes) |
   | `JWT_SECRET` | A new long random value. Generate one with `openssl rand -base64 48`. Don't reuse an old one. |
   | `TRUST_PROXY` | `1` (Railway has one proxy in front of the app; without this every visitor shares one rate limit) |
   | `SEED_PASSWORD` | A private password for the seeded test accounts. The default is published in the README. |
   | `PORT` | `8080` |
   | `CLIENT_URL` | Fill in after step 3, with the web service's address |
   | `RESEND_API_KEY` | A Resend key with **Sending access** only |
   | `EMAIL_FROM` | For example `RENTrust <no-reply@mail.rentrust.ng>`. The domain must be verified in Resend, or every email is refused. |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From Cloudinary → Settings → API Keys |
   | `TEST_MODE` | `true` while email and SMS aren't connected. Railway sets `NODE_ENV=production` for you, which otherwise hides the on-screen codes and reset links, and nobody could confirm their email. Remove it once email and SMS work, and before real people sign up. |
4. **Settings → Networking → Generate Domain**, with port **8080**. Note the address, such as `https://server-production-1234.up.railway.app`.
5. Check it: opening that address plus `/api/v1/health` should show `{"status":"ok"}`.

## 3. Add the web app

1. **Create → GitHub Repo → RENTrust** again. Rename this service to `web`.
2. In **Settings**:
   - **Root Directory:** `/web`
   - **Branch:** `alpha`
   - **Watch Paths:** `/web/**`
3. In **Variables**, add `PORT` = `8080`, and `VITE_API_URL` set to the server's address plus `/api/v1`, for example `https://server-production-1234.up.railway.app/api/v1`. It is baked in when the app is built, so redeploy the web service after changing it.
4. **Settings → Networking → Generate Domain**, with port **8080**.
5. Go back to the **server's** variables and set `CLIENT_URL` to the web address, starting with `https://` and with no slash at the end, for example `https://web-production-1234.up.railway.app`. Without it, the browser refuses the app's calls to the API.

## 4. Add the test accounts (once)

Install the Railway CLI (`npm i -g @railway/cli`), then from the repo:

```bash
railway login
```

```bash
railway link
```

```bash
railway ssh --service server
```

Inside that shell, run:

```bash
npx prisma db seed
```

Never run the seed on a database real people use: it adds test accounts that anyone who knows the password can sign in to.

## 5. Check the whole loop

Open the web address, sign in as `renter@rentrust.test` with your `SEED_PASSWORD`, and run the full loop from the [main README](../README.md#testing-the-mvp).

## Before inviting external testers

- [ ] **Resend domain verified.** In Resend → Domains, add `mail.rentrust.ng` (or whichever subdomain you send from), add the DNS records it shows, and wait for "Verified". Until then Resend only delivers to your own Resend account's address.
- [ ] **`RESEND_API_KEY` and `EMAIL_FROM` set** on the server. Sign up with a fresh address and check the code arrives by email, not on screen.
- [ ] **Cloudinary keys set.** As a landlord, add a photo to a draft listing.
- [ ] **Keys never pasted anywhere public.** If a key was ever shared in a chat, a ticket or a commit, regenerate it and update the variable.
- [ ] **`TEST_MODE`:** with email connected, it now only affects phone codes, which are still shown on screen because there is no SMS provider yet. That means anyone can "confirm" any phone number. Fine for a closed beta; connect SMS and remove `TEST_MODE` before an open launch.
- [ ] **Backups:** in the Postgres service, turn on backups (Railway's **Backups** tab) so a bad migration or mistake can be undone.
- [ ] **An admin account** whose password only you know, to approve identity checks and listings. The seeded `admin@rentrust.test` uses `SEED_PASSWORD`; keep that secret.

## When something goes wrong

| Symptom | Likely cause |
| --- | --- |
| The web app says it can't reach the server | `VITE_API_URL` is wrong, or the web app wasn't redeployed after setting it |
| The browser console shows a CORS error | The server's `CLIENT_URL` doesn't exactly match the web address, including the `https://` at the start |
| The server crashes saying a table "does not exist" | Migrations didn't run. Check the start command is `npm start` (not `node dist/index.js`); the log should say "All migrations have been successfully applied". |
| The server crashes right after "prisma migrate deploy" | A migration failed. Read the deploy logs; the database is left as it was. |
| An email never arrives | Open the server's logs and search `email`. `email is off` at startup names the missing variable. `email not sent` has Resend's reason. `email sent` means Resend took it: look up its `resendId` in Resend's Emails page. |
| Sign-up says "We couldn't send the email" | Resend refused it. The log line `email not sent` has Resend's reason. Usually `EMAIL_FROM` isn't on a verified domain, or the domain isn't verified yet so Resend only delivers to your own address. |
| You want only the problems | The server logs one JSON line per event. In Railway's log view, filter with `@level:error` or `@level:warn`. |
| Photos say uploads "aren't switched on" | One of the three `CLOUDINARY_*` variables is missing on the server |
| "Application failed to respond" while the logs look fine | The domain's port isn't the one the app listens on. Set `PORT=8080` and the domain's port to 8080. |
| Everyone gets "Too many attempts" at once | `TRUST_PROXY` isn't `1` |
| Refreshing an inner page gives an error | The web service isn't starting with `npm start`, so Railway is serving the files some other way |

## Later: your own domain

Once you own the domain, add `api.rentrust.ng` to the server and `rentrust.ng` to the web service under **Settings → Networking → Custom Domain**, and create the DNS records Railway shows. Then update `CLIENT_URL` and `VITE_API_URL` to the new addresses and redeploy both.
