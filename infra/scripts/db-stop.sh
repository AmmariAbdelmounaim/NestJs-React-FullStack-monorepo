#!/bin/bash
# ===============================================
# Stop the PostgreSQL database
# Usage: ./db-stop.sh
# ===============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/.."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "🛑 Stopping Library Platform Database"
echo "========================================="
echo ""

# Stop Docker Compose
cd "$INFRA_DIR"
docker-compose down postgres

echo ""
echo -e "${GREEN}✓ Database stopped successfully${NC}"
echo ""
echo "To remove data volumes as well, run:"
echo "  cd infra && docker-compose down -v"

