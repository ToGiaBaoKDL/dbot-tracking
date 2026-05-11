# DBOT Stock Signals Tracker

## Project Overview

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

| Layer | Tech | Port |
|-------|------|------|
| PostgreSQL | Database | 5432 |
| FastAPI | Backend API | 8000 |
| Airflow 2 | ETL Orchestrator | 8080 |
| Next.js | Frontend | 3000 |

## Database Schema

- `users` — App users (username/password), `is_admin` flag
- `dbot_token` — Stored DBOT Bearer token (encrypted at rest via Fernet)
- `stocks` — Stock symbols (PK: symbol), filtered index symbols
- `stock_daily_data` — Daily OHLCV + signals (unique: symbol + date)

## Airflow DAGs

Naming convention: `[job_type]_[worker_type]_[description].py`

- **Initial dump DAG** — One-time historical data backfill (manual trigger, ~2h timeout)
- **Daily ETL DAG** — Daily ETL at 15:00 Mon–Fri (~30min timeout)

Both DAGs use `DockerOperator` pulling `toilachuoituyet/dbot-backend:latest` and run scripts inside the container. Zero business logic in DAGs.

### Setting up DBOT Token

1. Get Bearer token from browser DevTools
2. Login to app → get JWT
3. `PATCH /api/v1/admin/dbot-token` with `{"token": "..."}` (admin only)
4. Or insert directly into `dbot_token` table

## Auth Flow

1. User logs in via `/login` (NextAuth Credentials)
2. Backend validates username/password (argon2/bcrypt) → returns JWT (4h expiry)
3. Frontend stores JWT via NextAuth (httpOnly cookie) with expiry tracking
4. All API calls include `Authorization: Bearer <token>`
5. Middleware + client auto-redirect to `/login` when JWT expires
6. Non-admin users are blocked from `/admin/*` routes at the frontend middleware level

## Development Commands

### Backend Setup (uv + Python 3.12)

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment with Python 3.12
cd backend
uv venv --python 3.12

# Install dependencies
uv pip install -e ".[dev]"
```

### Common Commands

```bash
# Start all services (postgres, backend, airflow)
make up

# Stop all services
make down

# Rebuild backend image after dependency changes
make rebuild-backend

# Backend only (local, needs postgres running)
make dev-backend

# Frontend only (local)
cd frontend && npm run dev

# Backend tests
make test-backend

# Format & lint
make format
make lint

# Database migration
make migrate m="description"
make init-db
```

## Tech Stack & Best Practices

### Backend
- **FastAPI** + **SQLAlchemy 2.0** (async) + **Pydantic v2**
- **Repository Pattern**: 1 file per repository class
- **Service Layer**: Business logic + transaction management
- **Security**: JWT with `iss`/`aud`/`iat`/`jti` claims (PyJWT), argon2 password hashing (bcrypt legacy compatible), Fernet encryption for DBOT token
- **Ruff**: Lint + format with `E,F,I,N,W,UP,B,C4,SIM,ARG` rules, target Python 3.12
- **Logging**: Structured `[timestamp] [level] message` via `logging` module
- **Package manager**: `uv` (no pip, no requirements.txt, no poetry)

### Frontend
- **Next.js 16** App Router + **React 19**
- **Tailwind CSS 4** for styling
- **TanStack Table** for data tables
- **SWR** for client-side data fetching (caching, dedup, error retry)
- **React Hook Form** + **Zod** for form validation
- **NextAuth.js v4** with Credentials provider + JWT expiry tracking
- **UI**: Semantic CSS variables (`bg-background`, `text-foreground`, etc.), zero hardcoded Tailwind colors

### Airflow
- **Airflow 2.11.2** with LocalExecutor
- **Naming convention**: `[job_type]_[worker_type]_[description].py`
- `dag_id = os.path.basename(__file__).replace(".py", "")`
- Zero business logic in DAGs — DockerOperator pulls backend image

## File Structure

```
.
├── backend/              FastAPI app
│   ├── app/
│   │   ├── api/v1/       API routes (auth, stocks, signals, admin)
│   │   ├── core/         Config (Pydantic Settings), DB, Security, Encryption
│   │   ├── etl/          Shared ETL module (sync DB + crawler)
│   │   ├── models/       SQLAlchemy 2.0 models
│   │   ├── repositories/ DB access layer (User, Stock, Daily, Token)
│   │   ├── schemas/      Pydantic v2 schemas + validation
│   │   └── services/     Business logic (Auth, Stock, Signal, Token)
│   ├── scripts/          Standalone ETL scripts (daily, initial)
│   ├── tests/            pytest (async, SQLite in-memory)
│   ├── alembic/          DB migrations
│   ├── pyproject.toml    setuptools + uv config
│   ├── uv.lock           Reproducible dependency lock
│   └── Dockerfile        Multi-stage build (uv + python 3.12)
├── airflow/
│   ├── dags/             DAG definitions (self-contained, no shared config)
│   └── Dockerfile        Airflow 2.11.2 + providers
├── frontend/
│   ├── app/              Next.js App Router
│   │   ├── api/auth/     NextAuth API route
│   │   ├── login/        Login page (RHF + Zod)
│   │   ├── admin/        Admin pages (token, users)
│   │   ├── loading.tsx   Loading UI
│   │   ├── error.tsx     Error boundary
│   │   └── not-found.tsx 404 page
│   ├── components/       UI components (Button, Input, Card, Badge)
│   ├── features/         Feature modules (signals dashboard)
│   ├── lib/              Shared utilities (api client, auth, schemas)
│   └── types/            TypeScript type definitions
├── docker/
│   └── postgres/
│       └── init.sql      Auto-create airflow DB
├── infrastructure/
│   └── terraform/        Oracle Cloud IaC (instance + bucket)
│       ├── modules/
│       │   ├── compute/  VCN, subnet, security list, instance
│       │   └── object_storage/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars.example
├── docker-compose.dev.yml    Local dev
├── docker-compose.prod.yml   Production (Oracle Cloud)
├── Makefile                  Dev commands (uv + npm)
├── .env.example              Root env vars (DB, backend, airflow)
├── frontend/.env.example     Frontend env vars (NEXT_PUBLIC_*, NEXTAUTH_*)
└── .github/workflows/
    ├── backend-ci-cd.yml     CI/CD + auto-deploy
    └── frontend-ci.yml       Frontend build + Vercel auto-deploy
```

## Deploy

- **Local**: `make up` or `docker compose -f docker-compose.dev.yml up -d`
- **Frontend**: Vercel via GitHub Actions (tests + deploy on every push to `main`)
- **Backend + Airflow + DB**: Oracle Cloud Free Tier (Arm VM, 4-6 GB RAM) with `make deploy-oracle`

## Logging Conventions

| Source | Logger | Example |
|--------|--------|---------|
| Backend API | `dbot-backend` | `[2026-05-07 10:00:00] [INFO] GET /api/v1/signals — 200 (45.23ms)` |
| ETL Scripts | `dbot-etl` | `[2026-05-07 15:00:00] [INFO] Daily ETL completed: 875 records` |
| Frontend | `[CLIENT]` prefix | `[CLIENT] Signals fetch error: ...` |

## Important Notes

- DBOT token expires ~7 days. Update via admin API when expired.
- Initial dump DAG must be triggered manually from Airflow UI.
- Daily ETL runs at 15:00 Vietnam time (Mon–Fri).
- Index symbols (VNINDEX, VNXALL, etc.) are filtered out automatically.
- Signal for a stock on a given day can be `NULL` (no signal), `BUY`, or `SELL`.
- Admin users cannot deactivate their own account (protected API).
- Non-admin users are blocked from `/admin/*` routes at the frontend middleware level.
- Production deploy uses Oracle Cloud Free Tier (Arm VM) with Cloudflare Tunnel.
- Backend image (`dbot-backend:latest`) is single source of truth for both API and ETL.
- Local dev uses `uv` for Python dependency management; Docker image also uses `uv pip install`.
- **Airflow image is built locally** (`docker build -t dbot-airflow:latest ./airflow`) and has `pull_policy: never` in `docker-compose.prod.yml`.
- **Deploy script** (`scripts/deploy-oracle.sh`) pulls only the backend image, force-recreates airflow after local build, and prunes images older than 7 days to preserve rollback candidates.
- **Rollback script** (`scripts/rollback.sh`) uses inline `DBOT_BACKEND_IMAGE=` env var — does **not** mutate `.env`. Rollback available via `make rollback-oracle [TAG=...]`.
- **CI/CD deploy gate**: Backend deploy triggers on `deploy:` or `deploy(be)`; frontend deploy triggers on `deploy:` or `deploy(fe)`. Manual `workflow_dispatch` always works for both.
- **Backup script** (`scripts/backup.sh`) runs via cron, dumps to `/tmp/`, uploads directly to Oracle Object Storage via rclone (S3-compatible API), then deletes the temp file. No local copy is retained.
