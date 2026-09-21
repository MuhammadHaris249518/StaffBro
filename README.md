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

### Deploy on Render

The repo root [`render.yaml`](./render.yaml) Blueprint creates three services in Singapore:

| Service | What it is |
| --- | --- |
| `staffbro-api` | Docker FastAPI (`backend/Dockerfile`). Binds `$PORT`, migrates, seeds demo data |
| `staffbro-admin` | Vite static SPA. `VITE_API_URL` is the API’s public URL |
| `staffbro-db` | Postgres 16 (free plan **expires after 30 days**) |

Expo is **not** a Render service. After the API is up, set `EXPO_PUBLIC_API_URL` in `mobile/` to `https://staffbro-api-….onrender.com` and restart Expo.

1. Push this repository to GitHub (Render deploys from git). Almost the whole tree is still untracked locally — commit first.
2. Open [Render Dashboard → New → Blueprint](https://dashboard.render.com/blueprints/new), connect the repo, apply `render.yaml`.
3. Wait for `staffbro-api` (health check `GET /health`) and `staffbro-admin`.
4. Admin: `https://staffbro-admin-….onrender.com` — log in with `03009999999` / `password8`.
5. API docs: `https://staffbro-api-….onrender.com/docs`.

If the admin SPA still calls `localhost:8000`, set `VITE_API_URL` on `staffbro-admin` to the API URL and **Manual Deploy** that static site.

Free web services sleep after ~15 minutes idle; the first request after sleep can take ~30–60s. Upgrade Postgres before day 30 or export a dump.

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
