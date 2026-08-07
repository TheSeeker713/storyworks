"""OpenClaw connector stub — three roles land in Phase 2; probe only for now."""

from __future__ import annotations

import shutil
from typing import Any


def openclaw_health() -> dict[str, Any]:
    path = shutil.which("openclaw")
    if not path:
        return {"ok": False, "available": False, "error": "openclaw not on PATH"}
    return {"ok": True, "available": True, "path": path, "roles": {"research": False, "git": False, "agentic": False}}
