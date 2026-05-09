.PHONY: up down logs shell-backend shell-airflow migrate init-db dev-backend dev-frontend test-backend format lint rebuild-backend clean-docker deploy-swarm validate-daily validate-overview query-signals query-coverage query-stats

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

shell-backend:
	docker compose exec backend sh

shell-airflow:
	docker compose exec airflow bash

migrate:
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

init-db:
	docker compose exec backend alembic upgrade head

dev-backend:
	cd backend && set -a && . ../.env && set +a && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

test-backend:
	cd backend && uv run pytest tests/ -v

format:
	cd backend && uv run ruff format . && uv run ruff check . --fix
	cd frontend && npm run format

lint:
	cd backend && uv run ruff check .
	cd frontend && npm run lint

rebuild-backend:
	docker compose build --no-cache backend
	docker compose up -d backend

clean-docker:
	docker compose down -v --remove-orphans
	docker system prune -f
	docker volume prune -f

dev-clean:
	make clean-docker
	rm -rf frontend/node_modules frontend/.next
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/.venv

validate-daily:
	docker compose exec backend python scripts/validate_daily.py $(ARGS)

validate-overview:
	docker compose exec backend python scripts/validate_overview.py

query-signals:
	docker compose exec backend python scripts/queries/latest_signals.py $(ARGS)

query-coverage:
	docker compose exec backend python scripts/queries/date_coverage.py $(ARGS)

query-stats:
	docker compose exec backend python scripts/queries/signal_stats.py $(ARGS)

deploy-swarm:
	bash scripts/deploy-swarm.sh
