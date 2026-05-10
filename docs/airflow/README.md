# Airflow

## Architecture

Airflow is a **pure orchestrator** — zero business logic in DAGs.

Each task runs a `DockerOperator` that pulls the backend image and executes ETL scripts inside:

```
Airflow Scheduler
    │
    ▼
DockerOperator
    │
    ├── pulls: toilachuoituyet/dbot-backend:latest
    ├── runs: python scripts/etl_daily.py
    └── connects to: PostgreSQL (same DB as backend)
```

## DAGs

| DAG | Schedule | Timeout | Description |
|-----|----------|---------|-------------|
| `etl_local_daily_dbot` | `0 15 * * 1-5` | 30 min | Daily ETL after market close (Mon-Fri) |
| `etl_local_initial_dump` | None (manual) | 2 hours | One-time historical backfill |

**Naming convention:** `[job_type]_[worker_type]_[description].py`

## Why DockerOperator?

- Backend image = single source of truth (API + ETL)
- Commit → CI/CD build → push Docker Hub → Airflow auto-pulls latest
- No duplicate code between backend and Airflow
- ETL scripts run in identical environment as API

## Local Dev

```bash
make up        # Starts Airflow at http://localhost:8080
make logs      # Follow all container logs
```

Airflow UI: `http://localhost:8080` (default: admin / admin)

## Production

In production (Oracle Cloud), Airflow runs inside the same VM as backend and PostgreSQL, managed by `docker-compose.prod.yml`.

**Resource limits:** 1 GB RAM limit, 512 MB reservation

**Environment variables:**
```
AIRFLOW__CORE__EXECUTOR=LocalExecutor
AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql+psycopg2://.../airflow
AIRFLOW__CORE__DEFAULT_TIMEZONE=Asia/Ho_Chi_Minh
AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION=false
```

## First-time Setup

1. Start services: `make up`
2. Trigger initial dump:
   - Airflow UI → DAGs → `etl_local_initial_dump` → Trigger DAG
3. Enable daily ETL:
   - Airflow UI → DAGs → `etl_local_daily_dbot` → Unpause

## Monitoring

```bash
# Airflow logs
docker compose logs -f airflow

# Check task status
docker compose exec airflow airflow tasks list etl_local_daily_dbot
```
