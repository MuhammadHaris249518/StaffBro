# 🏢 StaffBro

Two-sided hiring marketplace for frontline workers and hospitality / retail businesses in Islamabad / Rawalpindi.

---

### 📲 Download Mobile App (Android)
[![Download Android APK](https://img.shields.io/badge/📲_Download_Android_APK-Click_to_Install-00C853?style=for-the-badge&logo=android&logoColor=white)](https://expo.dev/accounts/sheikh-khizar/projects/staffbro/builds/6c978e34-a19a-4eda-a29d-1f0189fd34d7)

*Click the button above on any Android device to install the app directly.*

---

### 🌐 Live Web Demos
* 🖥️ **Admin Portal:** [https://abundant-wonder-production-b171.up.railway.app](https://abundant-wonder-production-b171.up.railway.app) *(Login: `03009999999` / `password8`)*
* ⚙️ **Backend API (Swagger Docs):** [https://staffbro-production.up.railway.app/docs](https://staffbro-production.up.railway.app/docs)

---

- [Product requirements](./Staffbro_MVP_PRD.pdf)
- [Tech stack](./TECH_STACK.md)
- [Implementation plan](./IMPLEMENTATION_PLAN.md)
- [Mobile UI (Stitch)](./Stitch%20Ui/)


## Status

**Now-path: MVP** (accounts → profiles → approved businesses → jobs → apply/offer/hire → admin + analytics). Foundations from Phase 1 stay in the repo. The 10-phase full product plan is in [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

| Piece | Command |
| --- | --- |
| API + Postgres | From the **repo root** (not `mobile/`): `docker compose up --build` then open http://localhost:8000/health and http://localhost:8000/docs |
| Seed (idempotent) | already runs on API start (`SEED_ON_START=true`); or `python -m app.seed` in `backend/` |
| Mobile | `cd mobile && npm install && npx expo start` |
| Admin | `cd admin && npm install && npm run dev` (http://localhost:5173) |

Copy [`.env.example`](./.env.example) to `.env` if you run the API outside Compose.

### Demo accounts (after seed)

| Role | Phone | Password |
| --- | --- | --- |
| Job seeker | `03001234567` | `password8` |
| Company manager | `03007654321` | `password8` |
| Admin (web) | `03009999999` | `password8` |

### API (MVP)

- `GET /health` — database ping
- `GET /version`
- `GET /share/jobs/{id}` — public job page
- `GET /api/v1/catalog/professions` · `skills` · `locations`
- `POST /api/v1/auth/register` · `login` · `GET /api/v1/auth/me`
- Worker/business profiles, jobs (filters, edit, close/reopen), apply / review / hire / reject / direct-offer accept-decline
- `GET /api/v1/admin/dashboard` and approval/user/job queues (ADMIN)
- Notifications, phone verification, usage events

Catalogue seed: 8 professions, 70+ skills (Roman Urdu aliases), Islamabad + Rawalpindi areas. Business types later are restaurant / hotel / grocery only (D1).

### Deployment on Railway (Active)

The project is actively hosted on [Railway](https://railway.app) with three connected cloud services:

| Service | Type | Live URL | Details |
| --- | --- | --- | --- |
| **`staffbro-api`** | Docker (FastAPI) | [https://staffbro-production.up.railway.app](https://staffbro-production.up.railway.app/docs) | Auto-migrates with Alembic, seeds catalogue & demo data |
| **`staffbro-admin`** | Node / Vite SPA | [https://abundant-wonder-production-b171.up.railway.app](https://abundant-wonder-production-b171.up.railway.app) | Admin web portal (`03009999999` / `password8`) |
| **`PostgreSQL`** | Managed Database | Internal (`staffbro.railway.internal`) | Cloud PostgreSQL 16 database |

#### Environment Variables on Railway:
* **API Service (`StaffBro`):**
  * `DATABASE_URL`: Linked from Railway Postgres (`${{Postgres.DATABASE_URL}}`)
  * `APP_ENV`: `production`
  * `SEED_ON_START`: `true`
  * `JWT_SECRET`: Secret key for JWT auth
  * `INTERNAL_TASKS_SECRET`: Tasks secret
* **Admin Service (`abundant-wonder`):**
  * `VITE_API_URL`: `https://staffbro-production.up.railway.app`
  * Start Command: `npx vite preview --host 0.0.0.0 --port 3000`
* **Mobile App:**
  * `EXPO_PUBLIC_API_URL`: `https://staffbro-production.up.railway.app` (configured in `mobile/eas.json` for APK builds).

### Layout

```
backend/     FastAPI modular monolith
mobile/       Expo Router (Stitch tokens)
admin/        Vite + React admin shell
packages/     shared notes / api-client copy
Stitch Ui/    design source of truth
```

## Decisions locked in Phase 1

- **D1** Business types: restaurant, hotel, grocery only (no `OTHER`)
- **D7** Starter profession/skill/area lists are seeded (replace anytime; seed is idempotent)
- **D8** Render Blueprint (`render.yaml`): Docker API + static admin + Postgres. Expo stays local / EAS.
