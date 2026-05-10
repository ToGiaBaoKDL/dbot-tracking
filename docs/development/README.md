# Development Guide

## Quick Start

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
make update-dbtoken TOKEN="<DBOT_BEARER_TOKEN>"

# 7. Trigger initial backfill from Airflow UI
# http://localhost:8080  (admin / admin)

# 8. Start frontend (in a new terminal)
make dev-frontend
# Open http://localhost:3000
```

> **Note:** The first user can also be registered via `POST /api/v1/auth/register`, but only admin users can access admin endpoints.

## Make Commands

```bash
# Infrastructure
make up                    # Start Postgres + Backend + Airflow
make down                  # Stop all services
make logs                  # Follow all container logs
make rebuild-backend       # Rebuild backend image after dependency changes
make clean-docker          # Stop + prune containers, volumes, networks
make clean-frontend        # Remove node_modules and .next
make clean-all             # Full cleanup (docker + frontend + backend cache)

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
make test-frontend         # Run eslint + tsc (frontend)
make format                # Run ruff + prettier formatters
make lint                  # Run ruff + eslint linters
make type-check            # Run mypy + tsc type checkers

# Admin Operations
make create-admin ADMIN_USER=admin ADMIN_PASS=secret123
make update-password USERNAME=admin PASSWORD=newpass123
make update-dbtoken TOKEN="eyJhbG..."

# Data Validation & Queries
make validate-daily                    # Validate today's data
make validate-daily ARGS="--date 2024-01-15"
make validate-overview                 # Overall DB health check
make query-signals ARGS="--date 2024-01-15 --signal BUY --limit 20"
make query-coverage ARGS="--start 2024-01-01 --end 2024-01-31"
make query-stats ARGS="--start 2024-01-01 --end 2024-01-31"

# Deploy
make deploy-oracle         # Deploy to Oracle Cloud (production)
```

## Environment Variables

This project uses **two separate `.env` files**:

- **Root `.env`** — Backend, Postgres, Airflow, Docker (loaded by Docker Compose and Pydantic Settings)
- **`frontend/.env`** — Next.js (loaded by Next.js from its own directory)

Copy `.env.example` to `.env` and `frontend/.env.example` to `frontend/.env`:

| Variable | File | Required | How to generate |
|----------|------|----------|-----------------|
| `SECRET_KEY` | root `.env` | Yes | `cd backend && uv run python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `NEXTAUTH_SECRET` | `frontend/.env` | Yes | `openssl rand -base64 32` |
| `DATABASE_URL` | root `.env` | Yes | `postgresql+asyncpg://postgres:postgres@localhost:5432/stock_signals` |

## Services

| Service | URL | Notes |
|---------|-----|-------|
| Backend API | http://localhost:8000 | Auto-migrates on start |
| Airflow UI | http://localhost:8080 | Login: admin / admin |
| Frontend | http://localhost:3000 | Run `npm run dev` separately |
| PostgreSQL | localhost:5432 | DBs: `stock_signals`, `airflow` |

## Backend Setup (uv + Python 3.12)

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment with Python 3.12
cd backend
uv venv --python 3.12

# Install dependencies
uv pip install -e ".[dev]"
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
