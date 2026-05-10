.PHONY: up down logs shell-backend shell-airflow migrate init-db dev-backend dev-frontend test-backend test-frontend format lint type-check rebuild-backend clean-docker clean-frontend clean-all deploy-oracle rollback-oracle backup validate-daily validate-overview query-signals query-coverage query-stats query-table create-admin update-password update-dbtoken

COMPOSE_DEV = docker compose -f docker-compose.dev.yml

up:
	$(COMPOSE_DEV) up -d

down:
	$(COMPOSE_DEV) down

logs:
	$(COMPOSE_DEV) logs -f

shell-backend:
	$(COMPOSE_DEV) exec backend sh

shell-airflow:
	$(COMPOSE_DEV) exec airflow bash

migrate:
	$(COMPOSE_DEV) exec backend alembic revision --autogenerate -m "$(m)"

init-db:
	$(COMPOSE_DEV) exec backend alembic upgrade head

dev-backend:
	cd backend && set -a && . ../.env && set +a && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

test-backend:
	cd backend && uv run pytest tests/ -v

test-frontend:
	cd frontend && npm run lint && npm run type-check

format:
	cd backend && uv run ruff format . && uv run ruff check . --fix
	cd frontend && npm run format

lint:
	cd backend && uv run ruff check .
	cd frontend && npm run lint

type-check:
	cd backend && ./.venv/bin/mypy app/ --ignore-missing-imports
	cd frontend && npm run type-check

rebuild-backend:
	$(COMPOSE_DEV) build --no-cache backend
	$(COMPOSE_DEV) up -d backend

clean-docker:
	$(COMPOSE_DEV) down -v --remove-orphans
	docker system prune -f
	docker volume prune -f

clean-frontend:
	rm -rf frontend/node_modules frontend/.next

clean-all: clean-docker clean-frontend
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/.venv

dev-clean: clean-all

backup:
	bash scripts/backup.sh

validate-daily:
	$(COMPOSE_DEV) exec backend python scripts/validate_daily.py $(ARGS)

validate-overview:
	$(COMPOSE_DEV) exec backend python scripts/validate_overview.py

query-signals:
	$(COMPOSE_DEV) exec backend python scripts/queries/latest_signals.py $(ARGS)

query-coverage:
	$(COMPOSE_DEV) exec backend python scripts/queries/date_coverage.py $(ARGS)

query-stats:
	$(COMPOSE_DEV) exec backend python scripts/queries/signal_stats.py $(ARGS)

deploy-oracle:
	bash scripts/deploy-oracle.sh

rollback-oracle:
	bash scripts/rollback.sh $(or $(TAG),)

create-admin:
	$(COMPOSE_DEV) exec backend python scripts/create_admin.py --username $(or $(ADMIN_USER),admin) --password $(or $(ADMIN_PASS),admin123)

update-password:
	$(COMPOSE_DEV) exec backend python scripts/update_password.py --username $(USERNAME) --password $(PASSWORD)

update-dbtoken:
	$(COMPOSE_DEV) exec backend python scripts/update_dbot_token.py "$(TOKEN)"

query-table:
	$(COMPOSE_DEV) exec backend python scripts/query_table.py "$(TABLE)" -n $(or $(LIMIT),10)
