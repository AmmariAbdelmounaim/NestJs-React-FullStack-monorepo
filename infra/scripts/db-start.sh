#!/bin/bash
# ===============================================
# Start the PostgreSQL database
# Usage: ./db-start.sh
# ===============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/.."
ROOT_DIR="$SCRIPT_DIR/../.."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "🚀 Starting Library Platform Database"
echo "========================================"
echo ""

# Load environment variables from root .env if it exists
if [ -f "$ROOT_DIR/.env" ]; then
    echo -e "${GREEN}✓ Loading environment from root .env${NC}"
    set -a
    source "$ROOT_DIR/.env"
    set +a
else
    echo -e "${YELLOW}Warning: No .env file found. Using default values.${NC}"
    echo ""
fi

# Start Docker Compose
cd "$INFRA_DIR"
echo "Starting PostgreSQL container..."
docker-compose up -d postgres

echo ""
echo "Waiting for database to be ready..."
sleep 3

# Wait for health check
for i in {1..30}; do
    if docker exec library-platform-db pg_isready -U ${POSTGRES_USER} > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ Database is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo ""
        echo -e "${RED}✗ Database failed to start${NC}"
        echo ""
        echo "Check logs with: docker logs ${POSTGRES_CONTAINER_NAME}"
        exit 1
    fi
    sleep 1
done

echo ""
echo "========================================"
echo -e "${BLUE}Connection Information:${NC}"
echo "========================================"
echo "  Host:     localhost"
echo "  Port:     ${POSTGRES_PORT}"
echo "  Database: ${POSTGRES_DB}"
echo "  User:     ${POSTGRES_USER}"
echo ""
echo "Connect with:"
echo "  ${BLUE}psql -h localhost -p ${POSTGRES_PORT} -U ${POSTGRES_USER:-abdelmounaim} -d ${POSTGRES_DB}${NC}"
echo ""
echo "View logs:"
echo "  ${BLUE}npm run db:logs${NC}"
echo ""
echo "========================================"
