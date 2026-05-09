#!/usr/bin/env bash
set -e

echo "=== Deploying DBOT Tracking Stack to Docker Swarm ==="

# Load environment safely
set -a && . .env && set +a

# Initialize swarm if not already
if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q "active"; then
    echo "Initializing Docker Swarm..."
    docker swarm init
fi

# Create networks if they don't exist
if ! docker network ls | grep -q "dbot-network"; then
    docker network create --driver overlay --attachable dbot-network
fi

# Build airflow image locally (Swarm does not support 'build')
echo "Building airflow image..."
docker build -t dbot-airflow:latest ./airflow

# Create secrets
echo "$POSTGRES_PASSWORD" | docker secret create db_postgres_password - 2>/dev/null || true
echo "$SECRET_KEY" | docker secret create dbot_secret_key - 2>/dev/null || true

# Deploy stack
docker stack deploy -c docker-compose.swarm.yml dbot-tracking

echo "=== Deployment Complete ==="
echo "Backend:   http://localhost:8000"
echo "Airflow:   http://localhost:8080"
echo ""
echo "Monitor services:"
echo "  docker service ls"
echo "  docker service logs dbot-tracking_backend"
echo "  docker service logs dbot-tracking_airflow"
