#!/usr/bin/env bash
# Convenience runners for Storyworks Phase 0
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
case "${1:-}" in
  api)
    cd "$ROOT"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    exec uvicorn apps.api.app.main:app --reload --port 8787
    ;;
  web)
    cd "$ROOT/apps/web"
    exec npm run dev
    ;;
  *)
    echo "Usage: $0 {api|web}"
    exit 1
    ;;
esac
