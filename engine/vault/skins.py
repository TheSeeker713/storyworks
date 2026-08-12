"""Daily skin rotation from local assets/skins (optional; placeholder when absent)."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any, Optional

_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def skins_dir(repo_root: Optional[Path] = None) -> Path:
    root = repo_root or Path(__file__).resolve().parents[2]
    return root / "assets" / "skins"


def list_skin_files(repo_root: Optional[Path] = None) -> list[Path]:
    directory = skins_dir(repo_root)
    if not directory.is_dir():
        return []
    files = [
        path
        for path in sorted(directory.iterdir())
        if path.is_file() and path.suffix.lower() in _IMAGE_SUFFIXES
    ]
    return files


def today_skin(repo_root: Optional[Path] = None, *, as_of: Optional[date] = None) -> dict[str, Any]:
    """Pick a deterministic skin for the local calendar day, or report none."""
    files = list_skin_files(repo_root)
    day = as_of or date.today()
    if not files:
        return {
            "ok": True,
            "available": False,
            "as_of": day.isoformat(),
            "path": None,
            "filename": None,
            "url": None,
            "count": 0,
            "reason": "no local skin assets",
        }
    index = day.timetuple().tm_yday % len(files)
    chosen = files[index]
    return {
        "ok": True,
        "available": True,
        "as_of": day.isoformat(),
        "path": str(chosen),
        "filename": chosen.name,
        "url": f"/api/skins/file/{chosen.name}",
        "count": len(files),
        "reason": None,
    }
