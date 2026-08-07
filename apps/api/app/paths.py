"""Path helpers for Storyworks."""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = Path(os.environ.get("STORYWORKS_DATA_DIR", ROOT / "data"))
PROJECTS_DIR = Path(os.environ.get("STORYWORKS_PROJECTS_DIR", ROOT / "projects"))
BACKUP_DIR = PROJECTS_DIR / "backup"
DB_PATH = DATA_DIR / "storyworks.sqlite"

for d in (PROJECTS_DIR, BACKUP_DIR, DATA_DIR, DATA_DIR / "logs"):
    d.mkdir(parents=True, exist_ok=True)