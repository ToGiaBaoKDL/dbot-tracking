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
# 1. Clone and prepare environment
cp .env.example .env
# Edit .env — set SECRET_KEY and NEXTAUTH_SECRET

# 2. Start infrastructure (Postgres + Backend + Airflow)
make up

# 3. Rebuild backend image if dependencies changed
make rebuild-backend

# 4. Create first user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# 5. Set DBOT token (get from browser DevTools)
curl -X PATCH http://localhost:8000/api/v1/admin/dbot-token \
  -H "Authorization: Bearer <JWT_FROM_LOGIN>" \
  -H "Content-Type: application/json" \
  -d '{"token":"<DBOT_BEARER_TOKEN>"}'

# 6. Open Airflow UI, trigger initial dump
open http://localhost:8080  # admin / admin
# DAGs → etl_local_initial_dump → Trigger DAG

# 7. Start frontend (in a new terminal)
cd frontend
cp .env.example .env  # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
# Open http://localhost:3000
```

## ETL Architecture

**Airflow chỉ orchestrate — zero business logic.**

Mỗi DAG task = `DockerOperator` pull image `toilachuoituyet/dbot-backend:latest` từ Docker Hub và chạy:

| Task | Command |
|------|---------|
| Daily ETL | `python scripts/etl_daily.py` |
| Initial Dump | `python scripts/etl_initial.py` |

**Lợi ích:**
- Backend image = single source of truth (API + ETL)
- Commit → CI/CD build → push Docker Hub → Airflow auto pull latest
- Không còn duplicate code giữa backend và airflow

## Project Structure

```
.
├── backend/              FastAPI + SQLAlchemy 2.0 + Pydantic v2
│   ├── app/
│   │   ├── api/          API routes
│   │   ├── core/         Config, DB, Security, Encryption
│   │   ├── etl/          Shared ETL module (sync DB + crawler)
│   │   ├── models/       SQLAlchemy models
│   │   ├── repositories/ DB access layer
│   │   ├── schemas/      Pydantic schemas
│   │   └── services/     Business logic
│   ├── scripts/          Standalone ETL scripts
│   ├── tests/            pytest
│   └── Dockerfile        Multi-stage build
├── airflow/              Airflow 2.11.2 + DockerOperator
│   └── dags/             DAG definitions only
├── frontend/             Next.js 16 + React 19 + Tailwind CSS 4
│   ├── app/              App Router pages
│   ├── components/       UI components (Button, Input, Card, Badge)
│   ├── features/         Feature modules (signals dashboard)
│   └── lib/              Utilities, API client, schemas, auth
├── docker/
│   └── postgres/
│       └── init.sql      Auto-create airflow DB
├── docker-compose.yml    Local dev
├── docker-compose.swarm.yml  Production Swarm
├── Makefile              Dev commands
└── .github/workflows/
    └── ci-cd.yml         Build + push Docker image
```

## Services

| Service | URL | Notes |
|---------|-----|-------|
| Backend API | http://localhost:8000 | Auto-migrates on start |
| Airflow UI | http://localhost:8080 | Login: admin / admin |
| Frontend | http://localhost:3000 | Run `npm run dev` separately |
| PostgreSQL | localhost:5432 | DBs: `stock_signals`, `airflow` |

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | How to generate |
|----------|----------|-----------------|
| `SECRET_KEY` | Yes | `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `DATABASE_URL` | Yes | `postgresql+asyncpg://postgres:postgres@localhost:5432/stock_signals` |

## Development Commands

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
make migrate m="add new table"
make init-db
```

## Dark Mode

Click the **Moon/Sun** icon in the top-right header (main page) or sidebar bottom (admin pages).

- Theme preference is persisted in `localStorage`
- Respects system `prefers-color-scheme` on first visit
- All colors use semantic CSS variables — no hardcoded Tailwind colors

## CI/CD

### Trigger Rules

CI chỉ chạy khi:
- Push lên `main` **và** commit message bắt đầu bằng: `feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `docs:`
- **Hoặc** bất kỳ Pull Request nào
- **Và** file thay đổi nằm trong `backend/**` hoặc `.github/workflows/ci-cd.yml`

### Workflow

1. **Test**: Run ruff + pytest
2. **Build**: Build backend Docker image (multi-stage)
3. **Push**: Push `toilachuoituyet/dbot-backend:latest` + `YYYYMMDD-<sha>` tags lên Docker Hub

### Setup GitHub Actions

1. Fork/push repo lên GitHub
2. Vào **Settings → Secrets and variables → Actions**:
   - `DOCKERHUB_USERNAME` = `toilachuoituyet`
   - `DOCKERHUB_TOKEN` = token từ Docker Hub

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

## Auth Flow

1. Register via `POST /api/v1/auth/register`
2. Login via `POST /api/v1/auth/login` → returns JWT (4h expiry)
3. Frontend stores JWT via NextAuth (httpOnly cookie) with expiry tracking
4. All API calls include `Authorization: Bearer <token>`
5. Middleware auto-redirects to `/login` when JWT expires
6. Non-admin users are blocked from `/admin/*` routes

## Setting Up DBOT Token

1. Login to [dbot.vn/dashboard](https://dbot.vn/dashboard) in browser
2. Open DevTools → Network → copy `Authorization: Bearer ...` header
3. Call admin API:
   ```bash
   curl -X PATCH http://localhost:8000/api/v1/admin/dbot-token \
     -H "Authorization: Bearer <YOUR_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"token":"<DBOT_BEARER_TOKEN>"}'
   ```

## Airflow DAGs

| DAG | Schedule | Description |
|-----|----------|-------------|
| `etl_local_initial_dump` | Manual | One-time historical backfill (~30-60 min) |
| `etl_local_daily_dbot` | 15:00 T2-T6 | Daily ETL after market close |

**Airflow pulls `toilachuoituyet/dbot-backend:latest` image** và chạy ETL scripts bên trong container.

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
| Backend | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2, Alembic, PyJWT |
| ETL | Airflow 2.11.2, DockerOperator, httpx |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TanStack Table, SWR, React Hook Form + Zod, NextAuth v4 |
| UI | Custom semantic components (Button, Input, Card, Badge) |
| CI/CD | GitHub Actions, Docker Hub |
| Deploy | Docker Swarm |

## Notes

- DBOT token expires ~7 days. Update via admin API when expired.
- Index symbols (VNINDEX, VNXALL, etc.) are filtered automatically.
- Daily ETL runs at 15:00 Vietnam time (Mon-Fri).
- `future_days` accepts 1-14.
- Backend image is multi-stage build for minimal size.
- Admin users cannot deactivate their own account.
- All frontend colors use semantic CSS variables — dark mode supported out of the box.
