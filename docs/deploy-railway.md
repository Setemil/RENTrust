# Deploy to Railway

RENTrust runs on Railway as one project with three services: the **database**, the **server** (API) and the **web** app. Each push to `alpha` redeploys whichever of the server or web folders changed.

The repo already holds each service's settings in `server/railway.json` and `web/railway.json`: how to build, how to start, the health check, and the folder to watch. The server also runs `prisma migrate deploy` before every deploy, so database changes go out with the code. What you set up by hand is the services themselves and their variables.

## 1. Create the project and the database

1. In Railway, create a new project (**New Project → Empty project**).
2. Add the database: **Create → Database → PostgreSQL**. Railway names it `Postgres`; keep that name, because the variables below refer to it.

## 2. Add the server

1. **Create → GitHub Repo → RENTrust.** Rename the service to `server`.
2. In the service's **Settings**:
   - **Root Directory:** `/server`
   - **Config file path:** `/server/railway.json`. Railway doesn't look inside the root directory for this file, so the full path is needed.
   - **Branch:** `alpha`
3. In **Variables**, add:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (a reference, so it follows the database if it changes) |
   | `JWT_SECRET` | A new long random value. Generate one with `openssl rand -base64 48`. Don't reuse an old one. |
   | `TRUST_PROXY` | `1` (Railway has one proxy in front of the app; without this every visitor shares one rate limit) |
   | `SEED_PASSWORD` | A private password for the seeded test accounts. The default is published in the README. |
   | `CLIENT_URL` | Fill in after step 3, with the web service's address |

   Leave `NODE_ENV` unset while testers need the on-screen codes and reset links, because email isn't connected yet. Set it to `production` once it is.
4. **Settings → Networking → Generate Domain.** Note the address, such as `https://server-production-1234.up.railway.app`.
5. Check it: opening that address plus `/api/v1/health` should show `{"status":"ok"}`.

## 3. Add the web app

1. **Create → GitHub Repo → RENTrust** again. Rename this service to `web`.
2. In **Settings**:
   - **Root Directory:** `/web`
   - **Config file path:** `/web/railway.json`
   - **Branch:** `alpha`
3. In **Variables**, add `VITE_API_URL` set to the server's address plus `/api/v1`, for example `https://server-production-1234.up.railway.app/api/v1`. It is baked in when the app is built, so redeploy the web service after changing it.
4. **Settings → Networking → Generate Domain.**
5. Go back to the **server's** variables and set `CLIENT_URL` to the web address, with no slash at the end. Without it, the browser refuses the app's calls to the API.

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

## When something goes wrong

| Symptom | Likely cause |
| --- | --- |
| The web app says it can't reach the server | `VITE_API_URL` is wrong, or the web app wasn't redeployed after setting it |
| The browser console shows a CORS error | The server's `CLIENT_URL` doesn't exactly match the web address |
| The server deploy fails at "pre-deploy" | A migration failed. Read the deploy logs; the database is left as it was. |
| Everyone gets "Too many attempts" at once | `TRUST_PROXY` isn't `1` |
| Refreshing an inner page gives an error | The web service isn't using `/web/railway.json`, so the wrong start command ran |

## Later: your own domain

Once you own the domain, add `api.rentrust.ng` to the server and `rentrust.ng` to the web service under **Settings → Networking → Custom Domain**, and create the DNS records Railway shows. Then update `CLIENT_URL` and `VITE_API_URL` to the new addresses and redeploy both.
