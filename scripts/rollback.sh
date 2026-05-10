#!/usr/bin/env bash
set -euo pipefail

# Rollback script for Oracle Cloud production deploy
# Usage: bash scripts/rollback.sh [IMAGE_TAG]
# If no tag provided, rolls back to previous git commit's image

APP_DIR="/opt/dbot-tracking"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$APP_DIR"

# Source env
set -a && source .env && set +a

# Determine target image
if [ $# -ge 1 ]; then
  TARGET_IMAGE="$1"
else
  # Get previous commit's short SHA
  PREV_SHA=$(git rev-parse --short HEAD~1)
  TARGET_IMAGE="toilachuoituyet/dbot-backend:${PREV_SHA}"
fi

echo "=== Rollback ==="
echo "Target image: $TARGET_IMAGE"

# Pull target image
docker pull "$TARGET_IMAGE"

# Recreate backend with pinned image via inline env var (no .env mutation)
DBOT_BACKEND_IMAGE="$TARGET_IMAGE" docker compose -f "$COMPOSE_FILE" up -d backend --no-deps

echo ""
echo "Rollback complete. Backend running: $TARGET_IMAGE"
echo ""
echo "To return to latest:"
echo "  docker compose -f $COMPOSE_FILE up -d backend"
