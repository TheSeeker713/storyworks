"""Vault store: markdown files are truth; SQLite is cache."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from engine.vault.frontmatter import dump_markdown, parse_markdown
from engine.vault.index import VaultIndex
from engine.vault.paths import (
    boards_dir,
    content_path,
    index_path,
    project_dir,
    settings_path,
    storyworks_dir,
    vault_meta_path,
)

SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(name: str) -> str:
    s = SLUG_RE.sub("-", name.strip().lower()).strip("-")
    return s or "untitled"


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try:
                os.unlink(tmp)
            except OSError:
                pass


class VaultStore:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.index = VaultIndex(index_path(self.root))

    @classmethod
    def init_vault(cls, root: Path) -> "VaultStore":
        root = root.resolve()
        root.mkdir(parents=True, exist_ok=True)
        storyworks_dir(root).mkdir(parents=True, exist_ok=True)
        (root / "projects").mkdir(exist_ok=True)
        boards_dir(root).mkdir(exist_ok=True)
        meta = {"schema_version": 1, "created_at": _utc_now()}
        if not vault_meta_path(root).exists():
            atomic_write(vault_meta_path(root), json.dumps(meta, indent=2) + "\n")
        if not settings_path(root).exists():
            atomic_write(
                settings_path(root),
                json.dumps(
                    {
                        "ai_master_enabled": True,
                        "muse_enabled": True,
                        "stt_enabled": False,
                        "write_model": "huihui_ai/qwen3-abliterated:14b",
                        "agent_model": "qwen2.5-coder:7b",
                        "openclaw": {"research": False, "git": False, "agentic": False},
                    },
                    indent=2,
                )
                + "\n",
            )
        store = cls(root)
        store.reindex()
        return store

    def close(self) -> None:
        self.index.close()

    def settings(self) -> dict[str, Any]:
        raw = settings_path(self.root).read_text(encoding="utf-8")
        return json.loads(raw)

    def save_settings(self, data: dict[str, Any]) -> dict[str, Any]:
        merged = {**self.settings(), **data}
        atomic_write(settings_path(self.root), json.dumps(merged, indent=2) + "\n")
        return merged

    def create_project(self, name: str) -> dict[str, Any]:
        slug = slugify(name)
        base = project_dir(self.root, slug)
        if base.exists():
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"
            base = project_dir(self.root, slug)
        base.mkdir(parents=True)
        (base / "content").mkdir()
        (base / "codex").mkdir()
        meta = {
            "id": slug,
            "type": "project",
            "title": name,
            "archived": False,
            "updated_at": _utc_now(),
        }
        atomic_write(base / "project.md", dump_markdown(meta, f"# {name}\n"))
        # Empty marker only — tldraw snapshot is written on first canvas persist for this project.
        board = {"id": f"board-{slug}", "project_slug": slug, "empty": True}
        atomic_write(boards_dir(self.root) / f"board-{slug}.json", json.dumps(board, indent=2) + "\n")
        return {"slug": slug, "name": name, "archived": False}

    def list_projects(self, *, include_archived: bool = False) -> list[dict[str, Any]]:
        projects_root = self.root / "projects"
        if not projects_root.is_dir():
            return []
        out: list[dict[str, Any]] = []
        for p in sorted(projects_root.iterdir()):
            if not p.is_dir():
                continue
            md = p / "project.md"
            if not md.exists():
                continue
            meta, _ = parse_markdown(md.read_text(encoding="utf-8"))
            archived = bool(meta.get("archived", False))
            if archived and not include_archived:
                continue
            out.append(
                {
                    "slug": p.name,
                    "name": meta.get("title") or p.name,
                    "archived": archived,
                }
            )
        return out

    def set_project_archived(self, slug: str, archived: bool) -> dict[str, Any]:
        md = project_dir(self.root, slug) / "project.md"
        if not md.exists():
            raise FileNotFoundError(slug)
        meta, body = parse_markdown(md.read_text(encoding="utf-8"))
        meta["archived"] = archived
        meta["updated_at"] = _utc_now()
        atomic_write(md, dump_markdown(meta, body))
        return {"slug": slug, "name": meta.get("title") or slug, "archived": archived}

    def delete_project(self, slug: str, typed_name: str) -> dict[str, Any]:
        md = project_dir(self.root, slug) / "project.md"
        if not md.exists():
            raise FileNotFoundError(slug)
        meta, _ = parse_markdown(md.read_text(encoding="utf-8"))
        name = str(meta.get("title") or slug)
        if not meta.get("archived"):
            raise PermissionError("archive required before delete")
        if typed_name.strip() != name:
            raise PermissionError("typed name does not match")
        # backup project then remove
        from engine.vault.backup import backup_vault_snapshot

        backup_vault_snapshot(self.root, slug=f"delete-{slug}")
        shutil.rmtree(project_dir(self.root, slug))
        board = boards_dir(self.root) / f"board-{slug}.json"
        if board.exists():
            board.unlink()
        # drop index rows
        for row in self.index.list_project(slug, include_archived=True):
            self.index.delete(row["id"])
        return {"ok": True, "slug": slug}

    def write_content(
        self,
        project_slug: str,
        *,
        content_id: Optional[str] = None,
        type_: str = "note",
        title: str = "",
        subject: str = "",
        body: str = "",
        parent: str = "",
        canvas: Optional[dict[str, Any]] = None,
        expected_hash: Optional[str] = None,
        dirty: bool = False,
    ) -> dict[str, Any]:
        content_id = content_id or uuid.uuid4().hex
        path = content_path(self.root, project_slug, content_id)
        disk_hash = None
        if path.exists():
            disk_bytes = path.read_bytes()
            disk_hash = _hash_bytes(disk_bytes)
            if expected_hash and disk_hash != expected_hash:
                if dirty:
                    conflict = path.with_name(f"{content_id}.conflict-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.md")
                    shutil.copy2(path, conflict)
                    return {
                        "ok": False,
                        "conflict": True,
                        "conflict_path": str(conflict.relative_to(self.root)),
                        "disk_hash": disk_hash,
                        "id": content_id,
                    }
                # clean UI: reload path — caller should re-read; we still overwrite only if not dirty
                # For clean external edit, refuse overwrite unless expected_hash matches or is None with force
                if expected_hash is not None:
                    return {
                        "ok": False,
                        "conflict": True,
                        "message": "file changed on disk",
                        "disk_hash": disk_hash,
                        "id": content_id,
                    }

        meta = {
            "id": content_id,
            "type": type_,
            "parent": parent,
            "title": title,
            "subject": subject,
            "tags": [],
            "archived": False,
            "canvas": canvas or {},
            "updated_at": _utc_now(),
        }
        text = dump_markdown(meta, body)
        atomic_write(path, text)
        self._index_file(project_slug, path)
        st = path.stat()
        return {
            "ok": True,
            "id": content_id,
            "path": str(path.relative_to(self.root)),
            "content_hash": _hash_bytes(text.encode("utf-8")),
            "mtime": st.st_mtime,
            "meta": meta,
            "body": body,
        }

    def read_content(self, project_slug: str, content_id: str) -> dict[str, Any]:
        path = content_path(self.root, project_slug, content_id)
        if not path.exists():
            raise FileNotFoundError(content_id)
        raw = path.read_text(encoding="utf-8")
        meta, body = parse_markdown(raw)
        return {
            "id": content_id,
            "path": str(path.relative_to(self.root)),
            "content_hash": _hash_bytes(raw.encode("utf-8")),
            "mtime": path.stat().st_mtime,
            "meta": meta,
            "body": body,
        }

    def set_content_archived(self, project_slug: str, content_id: str, archived: bool) -> dict[str, Any]:
        data = self.read_content(project_slug, content_id)
        meta = data["meta"]
        meta["archived"] = archived
        meta["updated_at"] = _utc_now()
        path = content_path(self.root, project_slug, content_id)
        atomic_write(path, dump_markdown(meta, data["body"]))
        self._index_file(project_slug, path)
        return self.read_content(project_slug, content_id)

    def delete_content(self, project_slug: str, content_id: str, typed_title: str) -> dict[str, Any]:
        data = self.read_content(project_slug, content_id)
        meta = data["meta"]
        title = str(meta.get("title") or content_id)
        if not meta.get("archived"):
            raise PermissionError("archive required before delete")
        if typed_title.strip() != title:
            raise PermissionError("typed title does not match")
        path = content_path(self.root, project_slug, content_id)
        bak_dir = storyworks_dir(self.root) / "backup" / f"content-{content_id}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"
        bak_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, bak_dir / path.name)
        path.unlink()
        self.index.delete(content_id)
        return {"ok": True, "id": content_id}

    def save_board(self, board_id: str, document: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(document, dict):
            raise TypeError("board document must be a JSON object")
        # Keep each project's board under boards/<board_id>.json (board_id already includes project slug).
        path = boards_dir(self.root) / f"{board_id}.json"
        try:
            payload = json.dumps(document, indent=2, allow_nan=False) + "\n"
        except (TypeError, ValueError) as exc:
            raise ValueError(f"board document is not JSON-serializable: {exc}") from exc
        atomic_write(path, payload)
        return {"ok": True, "id": board_id, "path": str(path.relative_to(self.root))}

    def load_board(self, board_id: str) -> dict[str, Any]:
        path = boards_dir(self.root) / f"{board_id}.json"
        if not path.exists():
            return {"id": board_id, "empty": True}
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            # Corrupt/partial write must not 500 the API — treat as empty and let the client re-seed.
            return {"id": board_id, "empty": True, "corrupt": True}
        if not isinstance(data, dict):
            return {"id": board_id, "empty": True, "corrupt": True}
        return data

    def reindex(self) -> int:
        self.index.clear()
        count = 0
        projects = self.root / "projects"
        if not projects.is_dir():
            return 0
        for proj in projects.iterdir():
            cdir = proj / "content"
            if not cdir.is_dir():
                continue
            for md in cdir.glob("*.md"):
                if ".conflict-" in md.name:
                    continue
                self._index_file(proj.name, md)
                count += 1
        return count

    def _index_file(self, project_slug: str, path: Path) -> None:
        raw = path.read_text(encoding="utf-8")
        meta, _ = parse_markdown(raw)
        content_id = str(meta.get("id") or path.stem)
        self.index.upsert(
            {
                "id": content_id,
                "project_slug": project_slug,
                "type": str(meta.get("type") or "note"),
                "parent": str(meta.get("parent") or ""),
                "title": str(meta.get("title") or ""),
                "subject": str(meta.get("subject") or ""),
                "archived": 1 if meta.get("archived") else 0,
                "path": str(path.relative_to(self.root)),
                "content_hash": _hash_bytes(raw.encode("utf-8")),
                "mtime": path.stat().st_mtime,
                "updated_at": str(meta.get("updated_at") or ""),
            }
        )
