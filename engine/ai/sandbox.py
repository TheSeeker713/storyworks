"""Sandboxed AI drafts — held until human approve / set-aside."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from engine.vault.store import atomic_write


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sandbox_path(vault_root: Path, project_slug: str) -> Path:
    return vault_root / ".storyworks" / "ai_sandbox" / f"{project_slug}.json"


def _load(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    items = data.get("items") if isinstance(data, dict) else data
    return list(items) if isinstance(items, list) else []


def _save(path: Path, items: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write(path, json.dumps({"items": items}, indent=2) + "\n")


def list_sandbox(vault_root: Path, project_slug: str, *, content_id: str | None = None) -> list[dict[str, Any]]:
    items = _load(sandbox_path(vault_root, project_slug))
    if content_id:
        items = [i for i in items if i.get("content_id") == content_id]
    return items


def create_sandbox_draft(
    vault_root: Path,
    project_slug: str,
    *,
    content_id: str,
    kind: str,
    body: str,
    title: str = "",
) -> dict[str, Any]:
    path = sandbox_path(vault_root, project_slug)
    items = _load(path)
    item = {
        "id": f"ai-{uuid.uuid4().hex[:12]}",
        "content_id": content_id,
        "kind": kind,
        "title": title or kind,
        "body": body,
        "status": "pending",
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
    }
    items.append(item)
    _save(path, items)
    return item


def set_sandbox_status(
    vault_root: Path,
    project_slug: str,
    draft_id: str,
    status: str,
) -> dict[str, Any]:
    if status not in {"pending", "approved", "set_aside", "dismissed"}:
        raise ValueError(f"invalid sandbox status: {status}")
    path = sandbox_path(vault_root, project_slug)
    items = _load(path)
    for item in items:
        if item.get("id") == draft_id:
            item["status"] = status
            item["updated_at"] = _utc_now()
            _save(path, items)
            return item
    raise FileNotFoundError(draft_id)


def get_sandbox_draft(vault_root: Path, project_slug: str, draft_id: str) -> dict[str, Any]:
    for item in _load(sandbox_path(vault_root, project_slug)):
        if item.get("id") == draft_id:
            return item
    raise FileNotFoundError(draft_id)
