.PHONY: up down logs shell-backend shell-airflow migrate init-db dev-backend dev-frontend test-backend format lint rebuild-backend deploy-swarm

up:
	docker compose up -d

down:
	docker compose down

rebuild-backend:
	docker compose build --no-cache backend
	docker compose up -d backend

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
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && pnpm dev

test-backend:
	cd backend && PYTHONPATH=. pytest tests/ -v

format:
	cd backend && ruff format .
	cd backend && ruff check . --fix
	cd frontend && pnpm format

lint:
	cd backend && ruff check .
	cd frontend && pnpm lint

deploy-swarm:
	bash scripts/deploy-swarm.sh
