# DBOT Stock Signals Tracker

Monorepo tracking DBOT stock buy/sell signals with daily ETL.

## Architecture

```mermaid
flowchart LR
    User["Browser"]
    subgraph Frontend
        Next["Next.js 16"]
    end
    subgraph Backend
        API["FastAPI"]
        Auth["JWT Auth"]
    end
    subgraph Data
        PG[(PostgreSQL 16)]
    end
    subgraph Orchestrator
        AF["Airflow 2.11"]
    end
    subgraph ETL
        Script["DBOT ETL Scripts"]
        Client["DBOT API Client"]
    end

    User -->|HTTPS| Next
    Next -->|Bearer JWT| API
    API --> Auth
    API -->|SQLAlchemy| PG
    AF -->|DockerOperator| Script
    Script -->|SQLAlchemy| PG
    Script -->|HTTPS| Client
```

## Quick Start (Local)

```bash
# 1. Environment files
cp .env.example .env
cp frontend/.env.example frontend/.env
# Edit both .env files — set SECRET_KEY and NEXTAUTH_SECRET

# 2. Start infrastructure (Postgres + Backend + Airflow)
make up

# 3. Rebuild backend image if dependencies changed
make rebuild-backend

# 4. Create first admin user via shell
make shell-backend
# Inside the container:
python -c "
import asyncio
from app.core.database import get_db
from app.repositories.user_repo import UserRepository
from app.core.security import get_password_hash
async def go():
    db = await anext(get_db())
    u = await UserRepository(db).create('admin', get_password_hash('your-password'), is_admin=True)
    print(f'Admin user {u.id} created')
asyncio.run(go())
"
exit

# 5. Login to get JWT
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# 6. Set DBOT token (get from browser DevTools)
curl -X PATCH http://localhost:8000/api/v1/admin/dbot-token \
  -H "Authorization: Bearer <JWT_FROM_LOGIN>" \
  -H "Content-Type: application/json" \
  -d '{"token":"<DBOT_BEARER_TOKEN>"}'

# 7. Trigger initial backfill from Airflow UI
# http://localhost:8080  (admin / admin)

# 8. Start frontend (in a new terminal)
cd frontend && npm install && npm run dev
# Open http://localhost:3000
```

> **Note:** The first user can also be registered via `POST /api/v1/auth/register`, but only admin users can access admin endpoints. The shell method above creates an admin immediately.

## Services

| Service | URL | Notes |
|---------|-----|-------|
| Backend API | http://localhost:8000 | Auto-migrates on start |
| Airflow UI | http://localhost:8080 | Login: admin / admin |
| Frontend | http://localhost:3000 | Run `npm run dev` separately |
| PostgreSQL | localhost:5432 | DBs: `stock_signals`, `airflow` |

## ETL Architecture

Airflow is pure orchestrator — zero business logic.

Each DAG task runs a `DockerOperator` that pulls `toilachuoituyet/dbot-backend:latest` and executes ETL scripts inside the container:

- **Daily ETL** — runs `python scripts/etl_daily.py` after market close
- **Initial Dump** — runs `python scripts/etl_initial.py`, triggered manually

Benefits:
- Backend image = single source of truth (API + ETL)
- Commit → CI/CD build → push Docker Hub → Airflow auto-pulls latest
- No duplicate code between backend and Airflow

## Environment Variables

Copy `.env.example` to `.env` and `frontend/.env.example` to `frontend/.env`, then fill in:

| Variable | File | Required | How to generate |
|----------|------|----------|-----------------|
| `SECRET_KEY` | root `.env` | Yes | `cd backend && uv run python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `NEXTAUTH_SECRET` | `frontend/.env` | Yes | `openssl rand -base64 32` |
| `DATABASE_URL` | root `.env` | Yes | `postgresql+asyncpg://postgres:postgres@localhost:5432/stock_signals` |

## API Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/auth/register` | No |
| POST | `/api/v1/auth/login` | No |
| GET | `/api/v1/auth/me` | Bearer JWT |
| GET | `/api/v1/stocks` | Bearer JWT |
| GET | `/api/v1/signals?date=YYYY-MM-DD&future_days=N` | Bearer JWT |
| PATCH | `/api/v1/admin/dbot-token` | Bearer JWT + Admin |
| GET | `/api/v1/admin/users` | Bearer JWT + Admin |
| POST | `/api/v1/admin/users` | Bearer JWT + Admin |
| PATCH | `/api/v1/admin/users/{id}` | Bearer JWT + Admin |

## Tech Stack

| Layer | Tech |
|-------|------|
| Database | PostgreSQL 16 |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2, Alembic, PyJWT, uv |
| ETL | Airflow 2.11.2, DockerOperator, httpx |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TanStack Table, SWR, React Hook Form + Zod, NextAuth v4 |
| UI | Custom semantic components (Button, Input, Card, Badge) |
| CI/CD | GitHub Actions, Docker Hub |
| Deploy | Docker Swarm |

## Dark Mode

Click the **Moon/Sun** icon in the top-right header (main page) or sidebar bottom (admin pages).

- Theme preference is persisted in `localStorage`
- Respects system `prefers-color-scheme` on first visit
- All colors use semantic CSS variables — no hardcoded Tailwind colors

## CI/CD

CI runs only when:
- Push to `main` **and** commit message starts with: `feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `docs:`
- **Or** any Pull Request
- **And** changed files are in `backend/**` or `.github/workflows/ci-cd.yml`

Workflow: Test (ruff + pytest) → Build (multi-stage Docker) → Push `toilachuoituyet/dbot-backend:latest` to Docker Hub.

## Docker Swarm Deploy

```bash
# 1. Setup secrets
echo "your-postgres-password" | docker secret create db_postgres_password -
echo "your-secret-key" | docker secret create dbot_secret_key -

# 2. Deploy
make deploy-swarm

# 3. Monitor
docker service ls
docker service logs dbot-tracking_backend -f
```

## Notes

- DBOT token expires ~7 days. Update via admin API when expired.
- Index symbols (VNINDEX, VNXALL, etc.) are filtered automatically.
- Daily ETL runs at 15:00 Vietnam time (Mon–Fri).
- `future_days` accepts 1–14.
- Backend image is multi-stage build for minimal size.
- Admin users cannot deactivate their own account.
- All frontend colors use semantic CSS variables — dark mode supported out of the box.
