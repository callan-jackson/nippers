# N.I.P.P.E.R.S. — website & booking system

Website, parent booking portal and admin dashboard for **N.I.P.P.E.R.S.** (Newhaven Inclusive Play Project Educational and Recreational Services), a registered charity running after school and holiday playschemes in Newhaven, East Sussex.

Parents create an account, add their children (school, medical, emergency contacts, photo consent) and request After School Club / Holiday Club sessions from a calendar. Staff confirm or decline requests, print a daily register, and manage prices, term dates, policies, testimonials, photos and announcements — all from their phone.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript, Tailwind, React Router, TanStack Query, react-hook-form + zod | Mobile-first SPA; validation schemas are shared with the API |
| API | Azure Functions v4 (Node 20, TypeScript, bundled with esbuild) | Runs as Static Web Apps managed functions — no servers |
| Data | Azure Cosmos DB (NoSQL) **free tier** | 1000 RU/s + 25 GB, £0/month; a JSON file store is used for local dev/tests |
| Auth | Email + password (scrypt, per-user salt), JWT in an `HttpOnly; SameSite=Lax` cookie, parent/admin roles | No third-party auth dependency |
| Email | Resend REST API (free tier) | Logged to console until `RESEND_API_KEY` is set |
| Hosting | Azure Static Web Apps **Free** | Custom domain + SSL included, £0/month |

Total running cost: **£0/month**. Also ships a `docker-compose.yml` for self-hosting anywhere.

```
api/            Azure Functions (TypeScript)
  src/functions   HTTP endpoints: auth, public, children, bookings, admin (/api/manage/*)
  src/lib         store (Cosmos + file), auth, bookings/availability rules, content seed, email
  src/shared      types + zod schemas shared with the web app
  test/           vitest unit tests
web/            React app (public site, /account parent portal, /admin dashboard)
infra/          deploy.sh (Azure), nginx.conf (Docker)
docs/           client brief + admin handover guide
```

## Run locally

```bash
npm install
npm run dev:api     # Functions host on :7071 (file store in api/.data, admin seeded from api/local.settings.json)
npm run dev:web     # Vite on :5173, proxies /api → :7071
```

Default local admin: `admin@nippers.org.uk` / `ChangeMe123!` (see `api/local.settings.json`).
Emails are printed to the API console. `npm test` runs the API unit tests; `npm run lint` type-checks both packages.

## Deploy to Azure (free)

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
| `STORE` | `cosmos` or `file` (default `file`; `memory` in tests) |
| `COSMOS_CONNECTION_STRING`, `COSMOS_DATABASE` | Cosmos DB target (database + containers are created on first run) |
| `JWT_SECRET` | 32+ random characters; rotating it signs everyone out |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin account, created on first request if missing |
| `APP_URL` | Public URL used in emails and for the CSRF origin check |
| `RESEND_API_KEY`, `MAIL_FROM` | Transactional email (optional) |

## Security notes

- Passwords hashed with scrypt (N=16384) and a 16-byte salt; login lockout after 8 failures; password-reset tokens are single-use and expire after 1 hour.
- Session cookie is `HttpOnly`, `Secure` in production, `SameSite=Lax`; state-changing endpoints require `Content-Type: application/json` and a matching `Origin`.
- All input is validated with zod on both client and server; Cosmos queries are parameterised and field names whitelisted.
- Admin endpoints live under `/api/manage/*` and check the `admin` role on every request. Parents can only read/write their own children and bookings.
- Contact form has a honeypot field; bank details are only shown to signed-in parents with confirmed bookings.
