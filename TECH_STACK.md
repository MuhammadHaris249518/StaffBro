# Staffbro — tech stack

Locked for MVP development. Source: PRD v1.2 Section 12, [implementation plan](./IMPLEMENTATION_PLAN.md), and [Stitch UI tokens](./Stitch%20Ui/tokens.json).

**MVP:** ship register/login + role, profiles, catalog filters, business approval, jobs, apply/offer/hire, admin analytics, in-app notifications, and phone OTP on this stack. Skip refresh-token rotation, CNIC, push, and payments until the 10-phase plan resumes.

Do not add a library or service that is not on this list without an explicit decision. If it is in the **Rejected** column, it stays out of the pilot.

---

## Snapshot

| Layer | Choice |
| --- | --- |
| Mobile app | React Native + Expo SDK 57 (TypeScript), Expo Router, Android APK |
| UI | Stitch designs in `Stitch Ui/` — Plus Jakarta Sans + Noto Sans, Material Symbols, tokens in `Stitch Ui/tokens.json` |
| Admin web | React + Vite + TypeScript, shadcn/ui, TanStack Table |
| API | FastAPI (Python 3.12) modular monolith, Pydantic v2 |
| ORM / migrations | SQLAlchemy 2.0 async + Alembic |
| Auth | Self-owned: Argon2id, 15-min JWT access, hashed rotating refresh (30 days) |
| Database | PostgreSQL on Render (Blueprint) or Supabase (`pg_trgm`, `citext`; PostGIS later) |
| Files | Supabase Storage — `avatars` (public), `private-docs` (private), uploads through the API only |
| Search | Postgres filters + `pg_trgm` + catalogue aliases (Roman Urdu) |
| Hosting | Docker on Render (free web service) |
| CI / cron / backups | GitHub Actions |
| Push | Expo Push Service |
| Errors / uptime | Sentry (API + app), keep-alive pinger on `GET /health` |
| Contract | OpenAPI from FastAPI → generated TypeScript client (`openapi-typescript`) |

---

## Mobile (worker + business)

One Expo app, two role route groups after login: `(worker)` and `(business)`.

| Piece | Package / tool | Why |
| --- | --- | --- |
| Runtime | React Native + **Expo SDK 57** (managed workflow), TypeScript | Team already writes React/TS; Android-first; iOS later is the same codebase |
| Navigation | **Expo Router** | File-based routes; role groups + guards |
| Server state | **TanStack Query** | Lists, cache, retry on flaky 3G |
| Forms | **React Hook Form** + **Zod** | Align Zod with Pydantic; Stitch form layouts |
| Tokens | **expo-secure-store** | Refresh token only; access JWT in memory |
| i18n | **react-i18next** | All strings in resource files from day 1 (`LOC-01`) |
| Images | **expo-image-picker** + **expo-image-manipulator** | Client compress; server still re-encodes and strips EXIF |
| Push | **expo-notifications** + Expo Push | Free; no extra vendor |
| Phone / WhatsApp | `Linking` → `tel:` and `wa.me` | Matches Stitch Call / WhatsApp buttons |
| Fonts | Plus Jakarta Sans (headlines), Noto Sans (body/labels) | Stitch |
| Icons | Material Symbols Outlined | Stitch |
| Builds | **EAS Build** (or local) → signed **Android APK** | Expo Go is not a distribution channel |
| Hotfix | **EAS Update** (JS-only) | After the APK is out |

**Target:** Android 8+, low-end phones, 4-inch and up. Images ≤ ~150 KB. List virtualisation. Offline = last-viewed lists read-only (P1); no offline write queue.

**Not used:** Flutter, native Kotlin/Swift as the app, Redux, offline-sync engines, custom native modules that break Expo managed workflow.

---

## Admin web

| Piece | Package / tool |
| --- | --- |
| App | React + **Vite** + TypeScript SPA |
| UI kit | **shadcn/ui** |
| Tables | **TanStack Table** |
| Hosting | Render static site (Blueprint); Cloudflare Pages / Vercel / Netlify also fine |
| API | Same `/api/v1` + same generated TS client as mobile |

Five to six screens: login (TOTP), business queue, phone queue, ID queue, users, later jobs/reports/metrics. CORS allow-list of this origin only.

**Not used:** Django admin, Retool.

---

## Backend

Modular monolith. Modules: `auth`, `workers`, `businesses`, `jobs`, `candidacies`, `verification`, `admin`, `catalog`, `files`, `notifications`, `reports`.

Modules call each other’s **services**, never each other’s tables.

| Layer | Owns | Must not |
| --- | --- | --- |
| `router.py` | HTTP, auth deps, request/response schemas | Business rules, SQL |
| `service.py` | Rules, state machine, authz, transactions | HTTP types |
| `repository.py` | Complex SQL + keyset pagination (only if needed) | Rules |
| `core/` | Config, DB session, JWT/hashing, errors, logging, rate limit, pagination | Domain logic |

| Piece | Package / tool |
| --- | --- |
| Language | **Python 3.12** |
| Framework | **FastAPI** + Uvicorn (one worker on 512 MB) |
| Validation | **Pydantic v2** |
| DB driver | **SQLAlchemy 2.0** async + **asyncpg** (Supabase pooled URL; disable prepared-statement cache on the transaction pooler) |
| Migrations | **Alembic**, forward-only, expand → deploy → contract, advisory lock on upgrade |
| Passwords | **Argon2id** |
| Rate limit | **slowapi** in-process (Redis only when a second API instance exists) |
| Images | Server-side re-encode, magic-byte check, EXIF/GPS strip |
| Tests | Unit (rules + state machine) + integration (real Postgres) + authz matrix |

**Not used:** microservices, NestJS/Node, serverless functions as the API, in-process schedulers on Render free (they die when the box sleeps).

---

## Data and files

| Piece | Choice |
| --- | --- |
| Database | **PostgreSQL** (Supabase). UUID PKs, enums/`CHECK`, money as integer PKR |
| Text search | `pg_trgm` GIN on job titles and alias arrays |
| Locations | SQL tree (country → province → city → area). No PostGIS in MVP |
| Avatars | Bucket `avatars`, public, random UUID path |
| ID / selfie | Bucket `private-docs`, backend-only, 60-second signed URLs |
| Uploads | Through the API only, 5 MB cap, never trust client MIME |

**Not used:** Firestore, Mongo, Elasticsearch, Meilisearch, vector search, direct-to-bucket client uploads, RLS (FastAPI is the single authz point).

---

## Auth

| Piece | Choice |
| --- | --- |
| Identifier | Phone E.164 (`03xx…` → `+923xx…`) |
| Password | Argon2id, min 8 chars, breached-password check at register |
| Access | JWT, 15 minutes, memory only on device |
| Refresh | 30 days, hashed in `refresh_tokens`, rotation + reuse detection |
| Admin | Seed-created accounts + TOTP before the ID queue goes live |
| Phone proof | WhatsApp reverse OTP (manual admin confirm). No SMS OTP |

**Not used:** Supabase Auth, Firebase Auth, SMS OTP.

---

## Infra and delivery

| Piece | Choice |
| --- | --- |
| Local | Docker Postgres + API |
| Staging | Render Blueprint (`render.yaml`): Docker API + static admin + free Postgres (expires in 30 days) |
| Production | Paid Render (or keep free API) + Render/Supabase Postgres |
| Secrets | Render / GitHub encrypted secrets. Nothing in the repo or the app bundle |
| CI | GitHub Actions: lint, types, Alembic, generated-client freshness |
| Cron | Actions → `POST /internal/tasks/:name` (secret header): expire candidacies/jobs, purge ID docs, purge notifications |
| Backups | Nightly encrypted `pg_dump` (`age`), restore drill before launch |
| Keep-alive | Pinger hits `/health` ~every 10 minutes so Render does not sleep in prod |
| Monitoring | Sentry on API + app |
| Share page | Public `/j/:slug` (Open Graph) for WhatsApp job links |

**Upgrade path (do not build now):** paid Render instance (~$7/mo) then an in-process or small worker for cron; Supabase Pro if DB/storage limits hit. Estimated $30–60/mo when free tiers run out.

**Not used:** Kubernetes, self-hosted runners, Datadog, OneSignal, self-run push.

---

## API contract

- Base path: `/api/v1`
- JSON over HTTPS, `Authorization: Bearer <access>`
- Errors: `{ "error": { "code", "message", "details" } }`
- Lists: keyset pagination `?limit=20&cursor=`
- Mutations that can retry (apply / offer / transition): `Idempotency-Key`
- TypeScript client generated from OpenAPI in CI; stale committed client fails the build

---

## Repo layout (when Phase 1 starts)

```
backend/          FastAPI modular monolith
mobile/            Expo app (Stitch UI)
admin/             Vite SPA
Stitch Ui/         Design source of truth (do not restyle away from this)
```

---

## Explicitly out of the stack until after pilot

In-app chat, AI matching, Redis, Elasticsearch, WhatsApp Business API, SMS, payments, automated KYC, iOS App Store release, Play Store public listing (sideload APK first).
