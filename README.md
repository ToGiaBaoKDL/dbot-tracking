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

# 4. Run DB migrations (if not auto-applied)
make init-db

# 5. Create first admin user
make create-admin ADMIN_USER=admin ADMIN_PASS=your-password

# 6. Set DBOT Bearer token (get from browser DevTools)
make update-dbot-token TOKEN="<DBOT_BEARER_TOKEN>"

# 7. Trigger initial backfill from Airflow UI
# http://localhost:8080  (admin / admin)

# 8. Start frontend (in a new terminal)
make dev-frontend
# Open http://localhost:3000
```

> **Note:** The first user can also be registered via `POST /api/v1/auth/register`, but only admin users can access admin endpoints. `make create-admin` creates an admin immediately.

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

- **Daily ETL** — runs `python scripts/etl_daily.py` at 15:00 Mon–Fri
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

## Make Commands

All common operations are wrapped in `make` targets:

```bash
# Infrastructure
make up                    # Start Postgres + Backend + Airflow
make down                  # Stop all services
make logs                  # Follow all container logs
make rebuild-backend       # Rebuild backend image after dependency changes
make clean-docker          # Stop + prune containers, volumes, networks

# Development
make dev-backend           # Run backend locally (uvicorn reload)
make dev-frontend          # Run frontend locally (npm run dev)
make shell-backend         # Shell into backend container
make shell-airflow         # Shell into airflow container

# Database
make init-db               # Run Alembic migrations
make migrate m="desc"      # Create new migration

# Testing & Quality
make test-backend          # Run pytest
make format                # Run ruff + prettier formatters
make lint                  # Run ruff + eslint linters

# Admin Operations
make create-admin ADMIN_USER=admin ADMIN_PASS=secret123
make update-password USERNAME=admin PASSWORD=newpass123
make update-dbot-token TOKEN="eyJhbG..." EXPIRES_AT="2026-05-16"

# Data Validation & Queries
make validate-daily                    # Validate today's data
make validate-daily ARGS="--date 2024-01-15"
make validate-overview                 # Overall DB health check
make query-signals ARGS="--date 2024-01-15 --signal BUY --limit 20"
make query-coverage ARGS="--start 2024-01-01 --end 2024-01-31"
make query-stats ARGS="--start 2024-01-01 --end 2024-01-31"

# Deploy
make deploy-swarm          # Deploy to Docker Swarm
```

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

Two separate workflows:

| Workflow | Triggers | Steps |
|----------|----------|-------|
| **Backend CI/CD** (`.github/workflows/backend-ci-cd.yml`) | Push to `main` with conventional commit (`feat:`, `fix:`, etc.) + `backend/**` changes, or any PR | uv setup → ruff → mypy → pytest → Docker build & push |
| **Frontend CI** (`.github/workflows/frontend-ci.yml`) | Push to `main` + `frontend/**` changes, or any PR | `npm ci` → `tsc --noEmit` → `next lint` → `prettier --check` → `next build` |

Docker Hub: `toilachuoituyet/dbot-backend:latest`

## Docker Swarm Deploy

```bash
# 1. Ensure .env is configured with all required vars
#    (POSTGRES_PASSWORD, SECRET_KEY, NEXTAUTH_SECRET, etc.)

# 2. Deploy (script auto-creates secrets and builds airflow image)
make deploy-swarm

# 3. Monitor
docker service ls
docker service logs dbot-tracking_backend -f
```

## Notes

- DBOT token expires ~7 days. Update via `make update-dbot-token` or admin UI.
- Index symbols (VNINDEX, VNXALL, etc.) are filtered automatically.
- Daily ETL runs at 15:00 Vietnam time (Mon–Fri).
- `future_days` accepts 1–14.
- Backend image is multi-stage build for minimal size.
- Admin users **cannot deactivate themselves or other admins** (protected at API + service layer).
- CLI scripts (`create_admin.py`, `update_password.py`, `update_dbot_token.py`) validate input before touching the DB.
- All frontend colors use semantic CSS variables — dark mode supported out of the box.
