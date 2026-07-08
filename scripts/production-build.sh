#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_ROOT="${BACKEND_ROOT:-$(dirname "$ROOT")/backend}"

echo "==> Building frontend (production)..."
cd "$ROOT"
export NODE_ENV=production
npm run build

if [[ -d "$BACKEND_ROOT" ]]; then
  echo "==> Building backend (production)..."
  cd "$BACKEND_ROOT"
  npm run build
  echo "==> Backend built at $BACKEND_ROOT/dist"
else
  echo "==> Skipping backend (BACKEND_ROOT not found: $BACKEND_ROOT)"
fi

echo ""
echo "Production build complete."
echo "  Frontend: cd Frontend && npm run start:prod"
echo "  Backend:  cd backend && NODE_ENV=production npm run start:prod"
echo "  Docker:   docker compose -f docker-compose.production.yml up --build"
