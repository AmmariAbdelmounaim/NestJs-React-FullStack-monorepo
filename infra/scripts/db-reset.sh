#!/bin/bash
# ===============================================
# Reset the PostgreSQL database (destroys all data!)
# Usage: ./db-reset.sh
# ===============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/.."
ROOT_DIR="$SCRIPT_DIR/../.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "⚠️  RESET Library Platform Database"
echo "========================================="
echo ""
echo -e "${RED}WARNING: This will DELETE ALL DATA!${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo ""
    echo "Reset cancelled."
    exit 0
fi

# Load environment variables from root .env if it exists
if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    source "$ROOT_DIR/.env"
    set +a
fi

# Database connection settings (with defaults)
POSTGRES_CONTAINER_NAME=${POSTGRES_CONTAINER_NAME:-library-platform-db}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_DB=${POSTGRES_DB}

echo ""
echo "Stopping database..."
cd "$INFRA_DIR"
docker-compose down -v postgres

echo ""
echo "Removing volumes..."
# Try to remove volume with default name, or construct from project name
VOLUME_NAME="${COMPOSE_PROJECT_NAME:-infra}_postgres_data"
docker volume rm "$VOLUME_NAME" 2>/dev/null || true

echo ""
echo "Starting fresh database..."
docker-compose up -d postgres

echo ""
echo "Waiting for database to be ready..."
sleep 5

# Wait for health check
echo "Checking database health..."
for i in {1..30}; do
    if docker exec "${POSTGRES_CONTAINER_NAME}" pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Database failed to start${NC}"
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}✓ Database reset complete!${NC}"
echo ""
echo "The database has been reset with:"
echo "  - Fresh schema"
echo "  - Initial seed data"
