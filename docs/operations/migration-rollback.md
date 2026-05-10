# Rollback & Recovery

## Deployment Rollback (Fastest)

If a deploy breaks the application, roll back the backend container to the previous image **without touching the database**:

```bash
cd /opt/dbot-tracking
make rollback-oracle
```

Or roll back to a specific image tag:

```bash
make rollback-oracle TAG=toilachuoituyet/dbot-backend:20260510-abc1234
```

This does **not** mutate `.env` — the rollback is applied via an inline environment variable.

## Database Migration Rollback

If a migration fails during deploy, run:

```bash
cd /opt/dbot-tracking
docker compose -f docker-compose.prod.yml exec backend alembic downgrade -1
```

This reverts the **last applied migration**.

## Find Current Migration

```bash
docker compose -f docker-compose.prod.yml exec backend alembic current
```

## List All Migrations

```bash
docker compose -f docker-compose.prod.yml exec backend alembic history --verbose
```

## Rollback to Specific Revision

```bash
docker compose -f docker-compose.prod.yml exec backend alembic downgrade <revision_id>
```

## Full Recovery (if alembic is broken)

1. **Stop backend:**
   ```bash
   docker compose -f docker-compose.prod.yml stop backend
   ```

2. **Restore from backup:**
   ```bash
   # Download latest backup from Oracle Object Storage
   rclone copy oos:dbot-backups/postgres/ /tmp/restore/ --include "stock_signals_*.sql.gz"
   
   # Find and restore
   LATEST=$(ls -t /tmp/restore/stock_signals_*.sql.gz | head -1)
   gunzip < "$LATEST" | docker exec -i dbot-postgres psql -U postgres -d stock_signals
   ```

3. **Restart backend:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d backend
   ```

## Prevention

- `scripts/deploy-oracle.sh` automatically creates a pre-deploy backup
- Always test migrations locally before deploying to production
- Never delete migration files after they have been applied
