#!/usr/bin/env bash
# Snapshot the active vault before a risky step.
# Usage: ./scripts/backup-vault.sh /path/to/vault [slug]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/.venv/bin/activate"
VAULT="${1:?vault path required}"
SLUG="${2:-pre-step}"
python - <<PY
from pathlib import Path
from engine.vault.backup import backup_vault_snapshot
dest = backup_vault_snapshot(Path("$VAULT"), slug="$SLUG")
print(dest)
PY
