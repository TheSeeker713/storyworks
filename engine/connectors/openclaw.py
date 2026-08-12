"""OpenClaw connector — three independent roles, fail-closed when unavailable."""

from __future__ import annotations

import shutil
import subprocess
from typing import Any, Optional

ROLES = ("research", "git", "agentic")

_ROLE_LABELS = {
    "research": "Research bridge (online lookups via Grok)",
    "git": "Git bridge (story-project git only)",
    "agentic": "Agentic pipelines (card-to-card automation)",
}


def _role_settings(settings: Optional[dict[str, Any]]) -> dict[str, bool]:
    raw = (settings or {}).get("openclaw") if isinstance(settings, dict) else {}
    if not isinstance(raw, dict):
        raw = {}
    return {role: bool(raw.get(role)) for role in ROLES}


def _probe_binary(path: str) -> dict[str, Any]:
    """Best-effort presence probe. Never hangs the app."""
    try:
        completed = subprocess.run(
            [path, "--version"],
            capture_output=True,
            text=True,
            timeout=2.0,
            check=False,
        )
        if completed.returncode == 0:
            version = (completed.stdout or completed.stderr or "").strip().splitlines()
            return {
                "ok": True,
                "version": version[0] if version else "unknown",
                "error": None,
            }
        # Some CLIs use `version` / `help` instead of --version; still count as present.
        if completed.returncode in {1, 2} and (
            completed.stdout or completed.stderr
        ):
            return {"ok": True, "version": "present", "error": None}
        return {
            "ok": False,
            "version": None,
            "error": (completed.stderr or completed.stdout or "openclaw probe failed").strip()
            or "openclaw probe failed",
        }
    except FileNotFoundError:
        return {"ok": False, "version": None, "error": "openclaw not on PATH"}
    except subprocess.TimeoutExpired:
        return {"ok": False, "version": None, "error": "openclaw probe timed out"}
    except Exception as exc:  # noqa: BLE001 — connectors must never raise to callers
        return {"ok": False, "version": None, "error": str(exc)}


def openclaw_health(settings: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    path = shutil.which("openclaw")
    roles_enabled = _role_settings(settings)
    if not path:
        role_status = {
            role: {
                "enabled": roles_enabled[role],
                "available": False,
                "ok": False,
                "label": _ROLE_LABELS[role],
                "error": "openclaw not on PATH",
            }
            for role in ROLES
        }
        return {
            "ok": False,
            "available": False,
            "path": None,
            "version": None,
            "error": "openclaw not on PATH",
            "roles": roles_enabled,
            "role_status": role_status,
        }

    probe = _probe_binary(path)
    binary_ok = bool(probe.get("ok"))
    binary_error = None if binary_ok else (probe.get("error") or "openclaw unavailable")
    role_status: dict[str, Any] = {}
    for role in ROLES:
        enabled = roles_enabled[role]
        if not binary_ok:
            role_status[role] = {
                "enabled": enabled,
                "available": False,
                "ok": False,
                "label": _ROLE_LABELS[role],
                "error": binary_error,
            }
        elif not enabled:
            role_status[role] = {
                "enabled": False,
                "available": True,
                "ok": False,
                "label": _ROLE_LABELS[role],
                "error": "role off by default",
            }
        else:
            role_status[role] = {
                "enabled": True,
                "available": True,
                "ok": True,
                "label": _ROLE_LABELS[role],
                "error": None,
            }

    return {
        "ok": binary_ok,
        "available": binary_ok,
        "path": path,
        "version": probe.get("version"),
        "error": binary_error,
        "roles": roles_enabled,
        "role_status": role_status,
    }


def run_openclaw_role(
    role: str,
    *,
    settings: Optional[dict[str, Any]] = None,
    payload: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Invoke one OpenClaw role. Always returns a structured fail-closed result."""
    if role not in ROLES:
        return {
            "ok": False,
            "unavailable": True,
            "role": role,
            "error": f"unknown openclaw role: {role}",
        }

    health = openclaw_health(settings)
    status = (health.get("role_status") or {}).get(role) or {}
    if not status.get("enabled"):
        return {
            "ok": False,
            "unavailable": True,
            "role": role,
            "error": status.get("error") or "role disabled",
            "label": status.get("label") or _ROLE_LABELS[role],
        }
    if not health.get("available") or not status.get("available"):
        return {
            "ok": False,
            "unavailable": True,
            "role": role,
            "error": status.get("error") or health.get("error") or "openclaw unavailable",
            "label": status.get("label") or _ROLE_LABELS[role],
        }

    path = health.get("path")
    if not path:
        return {
            "ok": False,
            "unavailable": True,
            "role": role,
            "error": "openclaw not on PATH",
            "label": _ROLE_LABELS[role],
        }

    # Real role CLIs land later; tonight we fail closed with a visible reason rather than
    # inventing network calls that could hang or crash the writing surface.
    detail = {
        "research": "research bridge needs Grok credentials and network — not configured",
        "git": "git bridge is not wired for story-project assistance yet",
        "agentic": "agentic pipelines are not wired yet",
    }[role]
    _ = payload  # reserved for future role payloads
    return {
        "ok": False,
        "unavailable": True,
        "role": role,
        "error": detail,
        "label": _ROLE_LABELS[role],
        "path": path,
        "version": health.get("version"),
    }
