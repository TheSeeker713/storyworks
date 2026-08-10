"""Codex entries + progressions (markdown truth under projects/<slug>/codex/)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from engine.vault.frontmatter import dump_markdown, parse_markdown

CODEX_TYPES = ("character", "prop", "worldbuilding", "scene")
SUGGESTED_ORDER = ("character", "worldbuilding", "prop", "scene")

TYPE_FIELDS: dict[str, list[str]] = {
    "character": ["role", "relationship_to"],
    "prop": ["owned_or_carried_by"],
    "worldbuilding": ["category"],
    "scene": ["location", "who_is_here"],
}

COMPLEX_FACETS: dict[str, list[str]] = {
    "character": ["traits", "backstory", "appearance", "relationships"],
    "prop": ["description", "origin", "significance", "current_owner"],
    "worldbuilding": ["overview", "detail", "history", "rules"],
    "scene": ["setting_detail", "participants", "purpose", "sensory"],
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _write(path: Path, text: str) -> None:
    from engine.vault.store import atomic_write

    atomic_write(path, text)


def codex_root(project_path: Path) -> Path:
    return project_path / "codex"


def entry_path(project_path: Path, type_: str, entry_id: str) -> Path:
    return codex_root(project_path) / type_ / f"{entry_id}.md"


def _empty_facets(type_: str) -> dict[str, str]:
    return {k: "" for k in COMPLEX_FACETS.get(type_, [])}


def create_entry(
    project_path: Path,
    *,
    type_: str,
    name: str,
    description: str = "",
    fields: Optional[dict[str, Any]] = None,
    facets: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    type_ = type_.lower().strip()
    if type_ not in CODEX_TYPES:
        raise ValueError(f"unknown codex type: {type_}")
    entry_id = uuid.uuid4().hex
    now = _utc_now()
    meta: dict[str, Any] = {
        "id": entry_id,
        "type": type_,
        "title": name,
        "subject": (description or "").split("\n", 1)[0][:120],
        "fields": {k: (fields or {}).get(k, "") for k in TYPE_FIELDS[type_]},
        "facets": {**_empty_facets(type_), **(facets or {})},
        "progressions": [],
        "updated_at": now,
        "created_at": now,
    }
    path = entry_path(project_path, type_, entry_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    _write(path, dump_markdown(meta, description or f"# {name}\n"))
    return read_entry(project_path, type_, entry_id)


def read_entry(project_path: Path, type_: str, entry_id: str) -> dict[str, Any]:
    path = entry_path(project_path, type_, entry_id)
    if not path.is_file():
        raise FileNotFoundError(entry_id)
    meta, body = parse_markdown(path.read_text(encoding="utf-8"))
    return {
        "id": str(meta.get("id") or entry_id),
        "type": str(meta.get("type") or type_),
        "title": str(meta.get("title") or ""),
        "subject": str(meta.get("subject") or ""),
        "fields": dict(meta.get("fields") or {}),
        "facets": dict(meta.get("facets") or {}),
        "progressions": list(meta.get("progressions") or []),
        "body": body,
        "updated_at": meta.get("updated_at"),
        "created_at": meta.get("created_at"),
        "path": str(path.relative_to(project_path.parent.parent))
        if project_path.parent.parent.exists()
        else str(path),
    }


def list_entries(project_path: Path, *, type_: Optional[str] = None) -> list[dict[str, Any]]:
    root = codex_root(project_path)
    root.mkdir(parents=True, exist_ok=True)
    types = [type_] if type_ else list(CODEX_TYPES)
    out: list[dict[str, Any]] = []
    for t in types:
        if t not in CODEX_TYPES:
            continue
        d = root / t
        if not d.is_dir():
            continue
        for md in sorted(d.glob("*.md")):
            meta, body = parse_markdown(md.read_text(encoding="utf-8"))
            out.append(
                {
                    "id": str(meta.get("id") or md.stem),
                    "type": str(meta.get("type") or t),
                    "title": str(meta.get("title") or md.stem),
                    "subject": str(meta.get("subject") or ""),
                    "updated_at": meta.get("updated_at"),
                }
            )
    out.sort(key=lambda r: str(r.get("updated_at") or ""), reverse=True)
    return out


def update_entry(
    project_path: Path,
    type_: str,
    entry_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    fields: Optional[dict[str, Any]] = None,
    facets: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    path = entry_path(project_path, type_, entry_id)
    if not path.is_file():
        raise FileNotFoundError(entry_id)
    meta, body = parse_markdown(path.read_text(encoding="utf-8"))
    if name is not None:
        meta["title"] = name
    if description is not None:
        body = description
        meta["subject"] = description.split("\n", 1)[0][:120]
    if fields is not None:
        cur = dict(meta.get("fields") or {})
        cur.update(fields)
        meta["fields"] = cur
    if facets is not None:
        curf = dict(meta.get("facets") or _empty_facets(type_))
        curf.update(facets)
        meta["facets"] = curf
    meta["updated_at"] = _utc_now()
    _write(path, dump_markdown(meta, body))
    return read_entry(project_path, type_, entry_id)


def add_progression(
    project_path: Path,
    type_: str,
    entry_id: str,
    *,
    mode: str,
    manuscript_point: str,
    text: str,
    ordinal: Optional[float] = None,
) -> dict[str, Any]:
    if mode not in ("addition", "replacement"):
        raise ValueError("mode must be addition or replacement")
    path = entry_path(project_path, type_, entry_id)
    if not path.is_file():
        raise FileNotFoundError(entry_id)
    meta, body = parse_markdown(path.read_text(encoding="utf-8"))
    progs = list(meta.get("progressions") or [])
    prog = {
        "id": uuid.uuid4().hex[:12],
        "mode": mode,
        "manuscript_point": manuscript_point,
        "ordinal": float(ordinal if ordinal is not None else len(progs)),
        "text": text,
        "created_at": _utc_now(),
    }
    progs.append(prog)
    meta["progressions"] = progs
    meta["updated_at"] = _utc_now()
    _write(path, dump_markdown(meta, body))
    return read_entry(project_path, type_, entry_id)


def progressions_for_ai(
    project_path: Path,
    type_: str,
    entry_id: str,
    *,
    story_ordinal: float,
) -> list[dict[str, Any]]:
    """Spoiler-safe: only progressions at or before the story point."""
    entry = read_entry(project_path, type_, entry_id)
    visible: list[dict[str, Any]] = []
    for p in entry.get("progressions") or []:
        try:
            ord_ = float(p.get("ordinal", 0))
        except (TypeError, ValueError):
            ord_ = 0.0
        if ord_ <= float(story_ordinal):
            visible.append(p)
    return visible


def ensure_stub(project_path: Path, name: str, *, type_: str = "character") -> dict[str, Any]:
    """Silent stub create for Notes auto-tag (no confirmation)."""
    name = name.strip()
    if not name:
        raise ValueError("empty name")
    for e in list_entries(project_path):
        if e["title"].strip().lower() == name.lower():
            return read_entry(project_path, e["type"], e["id"])
    return create_entry(project_path, type_=type_, name=name, description="")
