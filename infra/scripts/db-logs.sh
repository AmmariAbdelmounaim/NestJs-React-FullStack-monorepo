#!/bin/bash
# ===============================================
# View PostgreSQL database logs
# Usage: ./db-logs.sh [--follow]
# ===============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/../.."

# Colors
RED='\033[0;31m'
NC='\033[0m'

# Load environment variables from root .env if it exists
if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    source "$ROOT_DIR/.env"
    set +a
fi

# Database connection settings (with defaults)
POSTGRES_CONTAINER_NAME=${POSTGRES_CONTAINER_NAME:-library-platform-db}

# Check if Docker container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER_NAME}$"; then
    echo -e "${RED}Error: Docker container '${POSTGRES_CONTAINER_NAME}' is not running.${NC}"
    echo ""
    echo "Start it with:"
    echo "  npm run db:start"
    exit 1
fi

# Check for --follow flag
if [ "$1" == "--follow" ] || [ "$1" == "-f" ]; then
    echo "Following logs (Ctrl+C to stop)..."
    echo ""
    docker logs -f "${POSTGRES_CONTAINER_NAME}"
else
    docker logs --tail=100 "${POSTGRES_CONTAINER_NAME}"
    echo ""
    echo "Showing last 100 lines. Use --follow to stream logs."
fi

