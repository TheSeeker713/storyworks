"""OpenClaw CLI probe (optional cloud bridge)."""

from __future__ import annotations

import shutil
import subprocess
from typing import Any


def openclaw_health() -> dict[str, Any]:
    path = shutil.which("openclaw")
    if not path:
        return {"ok": False, "installed": False, "error": "openclaw not found on PATH"}
    try:
        proc = subprocess.run(
            [path, "--version"],
            capture_output=True,
            text=True,
            timeout=8,
            check=False,
        )
        version = (proc.stdout or proc.stderr or "").strip().split("\n")[0]
        return {
            "ok": proc.returncode == 0,
            "installed": True,
            "path": path,
            "version": version,
        }
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "installed": True, "path": path, "error": str(exc)}