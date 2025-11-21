#!/bin/bash
# ===============================================
# Run database migrations
# Usage: ./db-migrate.sh [migration_file]
# ===============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../database/migrations"
ROOT_DIR="$SCRIPT_DIR/../.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables from root .env if it exists
if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    source "$ROOT_DIR/.env"
    set +a
fi

# Database connection settings (with defaults)
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
DB_APP_ROLE=${DB_APP_ROLE}
DB_APP_PASSWORD=${DB_APP_PASSWORD}
POSTGRES_CONTAINER_NAME="library-platform-db"

# Check if Docker container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER_NAME}$"; then
    echo -e "${RED}Error: Docker container '${POSTGRES_CONTAINER_NAME}' is not running.${NC}"
    echo ""
    echo "Start it with:"
    echo "  npm run db:start"
    exit 1
fi

echo "========================================"
echo "📦 Running Database Migrations"
echo "========================================"
echo ""

# If specific migration file is provided
if [ -n "$1" ]; then
    MIGRATION_FILE="$MIGRATIONS_DIR/$1"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo -e "${RED}Error: Migration file not found: $1${NC}"
        echo ""
        echo "Available migrations:"
        ls -1 "$MIGRATIONS_DIR"
        exit 1
    fi
    
    echo "Running migration: $1"
    
    if docker exec -i "$POSTGRES_CONTAINER_NAME" psql \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -v ON_ERROR_STOP=1 \
        -v app_role="$DB_APP_ROLE" \
        -v app_password="$DB_APP_PASSWORD" \
        < "$MIGRATION_FILE"; then
        echo ""
        echo -e "${GREEN}✓ Migration completed successfully${NC}"
    else
        echo ""
        echo -e "${RED}✗ Migration failed${NC}"
        exit 1
    fi
else
    # Run all migrations in order
    echo "Running all migrations in order..."
    echo ""
    
    for migration in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            filename=$(basename "$migration")
            echo -e "${BLUE}→ $filename${NC}"
            
            if docker exec -i "$POSTGRES_CONTAINER_NAME" psql \
                -U "$POSTGRES_USER" \
                -d "$POSTGRES_DB" \
                -v ON_ERROR_STOP=1 \
                -v app_role="$DB_APP_ROLE" \
                -v app_password="$DB_APP_PASSWORD" \
                < "$migration"; then
                echo -e "${GREEN}  ✓ Completed${NC}"
            else
                echo -e "${RED}  ✗ Failed${NC}"
                exit 1
            fi
            echo ""
        fi
    done
    
    echo ""
    echo -e "${GREEN}✓ All migrations completed successfully${NC}"
fi

echo "========================================"

