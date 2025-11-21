#!/bin/bash
# ===============================================
# Seed database with initial data
# Usage: ./db-seed.sh [seed_file]
# ===============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEEDS_DIR="$SCRIPT_DIR/../database/seeds"
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

# Check if Docker container is running
if ! docker ps --format '{{.Names}}' | grep -q "library-platform-db"; then
    echo -e "${RED}Error: Docker container library-platform-db is not running.${NC}"
    echo ""
    echo "Start it with:"
    echo "  npm run db:start"
    exit 1
fi

echo "========================================"
echo "🌱 Seeding Database"
echo "========================================"
echo ""

# If specific seed file is provided
if [ -n "$1" ]; then
    SEED_FILE="$SEEDS_DIR/$1"
    
    if [ ! -f "$SEED_FILE" ]; then
        echo -e "${RED}Error: Seed file not found: $1${NC}"
        echo ""
        echo "Available seeds:"
        ls -1 "$SEEDS_DIR"
        exit 1
    fi
    
    echo "Running seed: $1"
    
    if docker exec -i "library-app" psql \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -v ON_ERROR_STOP=1 \
        < "$SEED_FILE"; then
        echo ""
        echo -e "${GREEN}✓ Seed completed successfully${NC}"
    else
        echo ""
        echo -e "${RED}✗ Seed failed${NC}"
        exit 1
    fi
else
    # Run all seeds in order
    echo "Running all seeds in order..."
    echo ""
    
    for seed in "$SEEDS_DIR"/*.sql; do
        if [ -f "$seed" ]; then
            filename=$(basename "$seed")
            echo -e "${BLUE}→ $filename${NC}"
            
            if docker exec -i "library-platform-db" psql \
                -U "$POSTGRES_USER" \
                -d "$POSTGRES_DB" \
                -v ON_ERROR_STOP=1 \
                < "$seed"; then
                echo -e "${GREEN}  ✓ Completed${NC}"
            else
                echo -e "${RED}  ✗ Failed${NC}"
                exit 1
            fi
            echo ""
        fi
    done
    
    echo ""
    echo -e "${GREEN}✓ All seeds completed successfully${NC}"
fi

echo "========================================"

