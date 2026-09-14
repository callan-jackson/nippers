# N.I.P.P.E.R.S. — website & booking system

Website, parent booking portal and admin dashboard for **N.I.P.P.E.R.S.** (Newhaven Inclusive Play Project Educational and Recreational Services), a registered charity running after school and holiday playschemes in Newhaven, East Sussex.

Parents create an account, add their children (school, medical, emergency contacts, photo consent) and request After School Club / Holiday Club sessions from a calendar. Staff confirm or decline requests, print a daily register, and manage prices, term dates, policies, testimonials, photos and announcements — all from their phone.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript, Tailwind, React Router, TanStack Query, react-hook-form + zod | Mobile-first SPA; validation schemas are shared with the API |
| API | TypeScript handlers behind a platform-neutral router — deployable as **Netlify Functions** or **Azure Functions** | Same code, two hosts; no servers |
| Data | **Neon Postgres** (free tier) via a `Store` interface; also Cosmos DB (free tier) or a JSON file store for dev/tests | Swap hosts without touching business logic |
| Auth | Email + password (scrypt, per-user salt), JWT in an `HttpOnly; SameSite=Lax` cookie, parent/admin roles | No third-party auth dependency |
| Email | Resend REST API (free tier) | Logged to console until `RESEND_API_KEY` is set |
| Hosting | **Netlify Free** (primary) or Azure Static Web Apps Free | Custom domain + SSL included, no card required, £0/month |

Total running cost: **£0/month**. Also ships a `docker-compose.yml` for self-hosting anywhere.

```
api/            API (TypeScript)
  src/functions   HTTP endpoints: auth, public, children, bookings, admin (/api/manage/*)
  src/lib         router (platform-neutral), stores (Postgres, Cosmos, file), auth, booking rules, seed, email
  src/shared      types + zod schemas shared with the web app
  src/index.ts    Azure Functions adapter · netlify/api.mts  Netlify Functions adapter
  test/           vitest unit tests (rules, auth, stores, HTTP dispatch)
web/            React app (public site, /account parent portal, /admin dashboard)
infra/          deploy.sh (Azure), nginx.conf (Docker)
docs/           client brief + admin handover guide
```

## Run locally

```bash
npm install
npm run dev         # netlify dev → http://localhost:8888 (Vite + the API function, file store, admin seeded from .env)
```

Default local admin: `admin@nippers.org.uk` / `ChangeMe123!` (see `.env`). Emails are printed to the console.
`npm test` runs the API unit tests; `npm run lint` type-checks both packages.
Azure-style local dev (`npm run dev:azure`) needs `azure-functions-core-tools` and the SWA CLI installed globally.

## Deploy to Netlify + Neon (free, recommended)

1. Create a Neon project and copy its **pooled** connection string.
2. `netlify login`, then from the repo root:
   ```bash
   cd web && netlify sites:create --name nippers --cwd .. && cd ..
   netlify env:set --cwd . STORE postgres
   netlify env:set --cwd . DATABASE_URL "postgresql://…"
   netlify env:set --cwd . JWT_SECRET "$(openssl rand -base64 48)"
   netlify env:set --cwd . ADMIN_EMAIL nippers1973@outlook.com
   netlify env:set --cwd . ADMIN_PASSWORD "choose-a-strong-one"
   netlify env:set --cwd . APP_URL https://nippers.netlify.app
   npm run deploy
   ```
   The database schema is created on first request. Connect the GitHub repo in the Netlify UI for deploys on push.
3. Custom domain: Netlify → Domain management → add `nippers.org.uk` and set the DNS records it shows at the registrar (one.com). SSL is automatic.
4. Email: create a free Resend account, verify the domain, `netlify env:set RESEND_API_KEY re_…`.

## Deploy to Azure (free alternative)

```bash
az login
./infra/deploy.sh          # creates nippers-rg, Cosmos DB (free tier), Static Web App (Free), sets settings, builds, deploys
```

The script prints the generated admin password — sign in and change it. Re-run with `DEPLOY_ONLY=1` to redeploy code only. For CI, add the SWA deployment token as the `AZURE_STATIC_WEB_APPS_API_TOKEN` repo secret and pushes to `main` deploy via `.github/workflows/deploy.yml`.

**Custom domain:** `az staticwebapp hostname set -n nippers-web -g nippers-rg --hostname nippers.org.uk`, then add the CNAME/TXT records it prints at the domain registrar (currently one.com). SSL is automatic.

**Email:** create a free [Resend](https://resend.com) account, verify `nippers.org.uk` (DNS records), then `az staticwebapp appsettings set -n nippers-web -g nippers-rg --setting-names RESEND_API_KEY=re_xxx`.

## Docker (self-host)

```bash
cp .env.example .env   # set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d   # http://localhost:8080 — data persisted on a named volume
```

## Configuration

| Setting | Purpose |
|---|---|
| `STORE` | `postgres`, `cosmos` or `file` (inferred from which connection string is set; `memory` in tests) |
| `DATABASE_URL` | Postgres/Neon connection string — the `docs` table is created on first run |
| `COSMOS_CONNECTION_STRING`, `COSMOS_DATABASE` | Cosmos DB target (database + containers are created on first run) |
| `JWT_SECRET` | 32+ random characters; rotating it signs everyone out |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin account, created on first request if missing |
| `APP_URL` | Public URL used in emails and for the CSRF origin check |
| `RESEND_API_KEY`, `MAIL_FROM` | Transactional email (optional) |

## Security notes

- Passwords hashed with scrypt (N=16384) and a 16-byte salt; login lockout after 8 failures; password-reset tokens are single-use and expire after 1 hour.
- Session cookie is `HttpOnly`, `Secure` in production, `SameSite=Lax`; state-changing endpoints require `Content-Type: application/json` and a matching `Origin`.
- All input is validated with zod on both client and server; Postgres and Cosmos queries are parameterised and field names whitelisted.
- Admin endpoints live under `/api/manage/*` and check the `admin` role on every request. Parents can only read/write their own children and bookings.
- Contact form has a honeypot field; bank details are only shown to signed-in parents with confirmed bookings.
