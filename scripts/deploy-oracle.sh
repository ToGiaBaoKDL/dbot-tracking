#!/usr/bin/env bash
set -euo pipefail

echo "=== Deploying DBOT Tracker to Oracle Cloud ==="

APP_DIR="/opt/dbot-tracking"
COMPOSE_FILE="docker-compose.prod.yml"
MAX_WAIT=120

# ---------------------------------------------------------------------------
# 1. Verify prerequisites
# ---------------------------------------------------------------------------
if [ ! -f "$APP_DIR/.env" ]; then
  echo "[ERROR] .env file not found at $APP_DIR/.env"
  echo "        Copy .env.example, fill in all values, then retry."
  exit 1
fi

cd "$APP_DIR"

# Source env for Docker Hub pull
set -a && source .env && set +a

# ---------------------------------------------------------------------------
# 2. Pre-deploy database backup
# ---------------------------------------------------------------------------
echo "[1/8] Creating pre-deploy backup..."
bash scripts/backup.sh || echo "[WARN] Backup failed, continuing..."

# ---------------------------------------------------------------------------
# 3. Sync code (atomic — discards any local changes)
# ---------------------------------------------------------------------------
if [ -d ".git" ]; then
  echo "[2/8] Syncing code from Git..."
  git fetch origin main
  git reset --hard origin/main
fi

# ---------------------------------------------------------------------------
# 4. Build Airflow image locally
# ---------------------------------------------------------------------------
echo "[3/8] Building airflow image..."
docker build -t dbot-airflow:latest ./airflow

# ---------------------------------------------------------------------------
# 5. Pull latest backend image
# ---------------------------------------------------------------------------
echo "[4/8] Pulling backend image..."
IMAGE="${DBOT_BACKEND_IMAGE:-toilachuoituyet/dbot-backend:latest}"
docker pull "$IMAGE"

# ---------------------------------------------------------------------------
# 6. Deploy stack
# ---------------------------------------------------------------------------
echo "[5/8] Deploying services..."
# Only pull backend (postgres + tunnel use public images; airflow is local)
docker compose -f "$COMPOSE_FILE" pull backend
# Force-recreate airflow so the freshly built local image is picked up
# (Docker Compose does not detect image changes when the tag stays 'latest')
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans --force-recreate airflow
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ---------------------------------------------------------------------------
# 7. Health check (polling with timeout)
# ---------------------------------------------------------------------------
echo "[6/8] Waiting for services to be healthy (max ${MAX_WAIT}s)..."
wait_for_health() {
  local container=$1
  local elapsed=0
  while [ $elapsed -lt $MAX_WAIT ]; do
    local status
    status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
    if [ "$status" = "healthy" ]; then
      echo "  $container: $status"
      return 0
    fi
    echo "  $container: $status (waiting...)"
    sleep 5
    elapsed=$((elapsed + 5))
  done
  echo "[ERROR] $container did not become healthy within ${MAX_WAIT}s"
  return 1
}

wait_for_health dbot-postgres || exit 1
wait_for_health dbot-backend || exit 1
wait_for_health dbot-airflow || exit 1

# ---------------------------------------------------------------------------
# 8. Cleanup
# ---------------------------------------------------------------------------
echo "[7/8] Cleaning up old images..."
# Prune dangling images older than 7 days to preserve rollback candidates
docker image prune -f --filter "until=168h"

echo ""
echo "[8/8] Deployment complete"
echo ""
echo "Backend image: $IMAGE"
echo "Git commit:    $(git rev-parse --short HEAD)"
echo ""
echo "Monitor:"
echo "  docker compose -f $COMPOSE_FILE logs -f"
echo "  docker compose -f $COMPOSE_FILE ps"
