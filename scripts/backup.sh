#!/usr/bin/env bash
set -euo pipefail

# Automated PostgreSQL backup — streams to Oracle Object Storage (no local persistence)
# Usage: Add to crontab: 0 3 * * * /opt/dbot-tracking/scripts/backup.sh

APP_DIR="/opt/dbot-tracking"
DB_CONTAINER="dbot-postgres"

# Source env vars from .env (required for cron which has no environment)
if [ -f "$APP_DIR/.env" ]; then
  set -a && source "$APP_DIR/.env" && set +a
fi

DB_NAME="${POSTGRES_DB:-stock_signals}"
DB_USER="${POSTGRES_USER:-postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TMP_BACKUP="/tmp/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Cleanup temp file on exit (even on failure)
trap 'rm -f "$TMP_BACKUP"' EXIT

echo "[$(date)] Starting backup..."

# ---------------------------------------------------------------------------
# 1. Verify OOS is configured (mandatory — no local retention)
# ---------------------------------------------------------------------------
if [ -z "${OOS_ACCESS_KEY:-}" ] || [ -z "${OOS_SECRET_KEY:-}" ] || [ -z "${OOS_NAMESPACE:-}" ] || [ -z "${OOS_REGION:-}" ] || [ -z "${OOS_BUCKET:-}" ]; then
  echo "[$(date)] ERROR: Oracle Object Storage not configured. Set OOS_ACCESS_KEY, OOS_SECRET_KEY, OOS_NAMESPACE, OOS_REGION, OOS_BUCKET in .env"
  exit 1
fi

if ! command -v rclone &> /dev/null; then
  echo "[$(date)] ERROR: rclone not found. Install with: sudo apt install rclone"
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Verify container is running
# ---------------------------------------------------------------------------
if ! docker inspect "$DB_CONTAINER" &>/dev/null; then
  echo "[$(date)] ERROR: Container $DB_CONTAINER not found"
  exit 1
fi

if [ "$(docker inspect --format='{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null)" != "true" ]; then
  echo "[$(date)] ERROR: Container $DB_CONTAINER is not running"
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Dump and compress to temp file
# ---------------------------------------------------------------------------
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-}" "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$TMP_BACKUP"

# Verify temp file
if [ ! -s "$TMP_BACKUP" ]; then
  echo "[$(date)] ERROR: Backup file is empty"
  rm -f "$TMP_BACKUP"
  exit 1
fi

if ! gunzip -t "$TMP_BACKUP" 2>/dev/null; then
  echo "[$(date)] ERROR: Backup file is corrupt"
  rm -f "$TMP_BACKUP"
  exit 1
fi

SIZE=$(du -h "$TMP_BACKUP" | cut -f1)
echo "[$(date)] Dump complete: $SIZE"

# ---------------------------------------------------------------------------
# 4. Upload to Oracle Object Storage
# ---------------------------------------------------------------------------
export RCLONE_CONFIG_OOS_TYPE=s3
export RCLONE_CONFIG_OOS_PROVIDER=Other
export RCLONE_CONFIG_OOS_ENV_AUTH=false
export RCLONE_CONFIG_OOS_ACCESS_KEY_ID="$OOS_ACCESS_KEY"
export RCLONE_CONFIG_OOS_SECRET_ACCESS_KEY="$OOS_SECRET_KEY"
export RCLONE_CONFIG_OOS_REGION="$OOS_REGION"
export RCLONE_CONFIG_OOS_ENDPOINT="https://${OOS_NAMESPACE}.compat.objectstorage.${OOS_REGION}.oraclecloud.com"

rclone copy "$TMP_BACKUP" "oos:${OOS_BUCKET}/postgres/"
echo "[$(date)] Uploaded to Oracle Object Storage: oos:${OOS_BUCKET}/postgres/$(basename "$TMP_BACKUP")"

# ---------------------------------------------------------------------------
# 5. Clean up temp file
# ---------------------------------------------------------------------------
rm -f "$TMP_BACKUP"
echo "[$(date)] Backup complete — no local copy retained."
