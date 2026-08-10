"""Vault store: markdown files are truth; SQLite is cache."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from engine.vault.frontmatter import dump_markdown, parse_markdown
from engine.vault.index import VaultIndex
from engine.vault.paths import (
    DEFAULT_BOOK_ID,
    DEFAULT_FOLDER_ID,
    boards_dir,
    book_dir,
    book_meta_path,
    books_dir,
    content_path,
    folder_dir,
    folder_meta_path,
    index_path,
    legacy_content_dir,
    migrate_legacy_index,
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
    # Dot-prefix + .tmp so Finder/iCloud are less likely to treat temps as user docs.
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
        tmp = ""  # replaced; nothing to unlink
    finally:
        if tmp and os.path.exists(tmp):
            try:
                os.unlink(tmp)
            except OSError:
                pass


class VaultStore:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        migrate_legacy_index(self.root)
        self.index = VaultIndex(index_path(self.root))
        # Serialize file + index writes: FastAPI sync routes run in a threadpool.
        self._write_lock = threading.RLock()

    @classmethod
    def init_vault(cls, root: Path) -> "VaultStore":
        root = root.resolve()
        root.mkdir(parents=True, exist_ok=True)
        storyworks_dir(root).mkdir(parents=True, exist_ok=True)
        migrate_legacy_index(root)
        (root / "projects").mkdir(exist_ok=True)
        boards_dir(root).mkdir(exist_ok=True)
        meta = {"schema_version": 2, "created_at": _utc_now()}
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
        store.migrate_all_projects()
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

    def ensure_default_hierarchy(self, project_slug: str) -> None:
        """Ensure default Book/Folder exist under the project."""
        bdir = book_dir(self.root, project_slug, DEFAULT_BOOK_ID)
        fdir = folder_dir(self.root, project_slug, DEFAULT_BOOK_ID, DEFAULT_FOLDER_ID)
        fdir.mkdir(parents=True, exist_ok=True)
        (fdir / "content").mkdir(exist_ok=True)
        bmp = book_meta_path(self.root, project_slug, DEFAULT_BOOK_ID)
        if not bmp.exists():
            atomic_write(
                bmp,
                dump_markdown(
                    {
                        "id": DEFAULT_BOOK_ID,
                        "type": "book",
                        "title": "Main",
                        "updated_at": _utc_now(),
                    },
                    "# Main\n",
                ),
            )
        fmp = folder_meta_path(self.root, project_slug, DEFAULT_BOOK_ID, DEFAULT_FOLDER_ID)
        if not fmp.exists():
            atomic_write(
                fmp,
                dump_markdown(
                    {
                        "id": DEFAULT_FOLDER_ID,
                        "type": "folder",
                        "title": "Main",
                        "book_id": DEFAULT_BOOK_ID,
                        "updated_at": _utc_now(),
                    },
                    "# Main\n",
                ),
            )
        # silence unused if book dir empty of folders edge — bdir created via fdir parents
        bdir.mkdir(parents=True, exist_ok=True)

    def migrate_project(self, project_slug: str) -> int:
        """Move flat content/*.md into default Book/Folder. Returns files moved."""
        self.ensure_default_hierarchy(project_slug)
        legacy = legacy_content_dir(self.root, project_slug)
        if not legacy.is_dir():
            return 0
        moved = 0
        dest = content_path(
            self.root, project_slug, "_", book_id=DEFAULT_BOOK_ID, folder_id=DEFAULT_FOLDER_ID
        ).parent
        for md in list(legacy.glob("*.md")):
            if ".conflict-" in md.name:
                continue
            target = dest / md.name
            if target.exists():
                continue
            shutil.move(str(md), str(target))
            moved += 1
        # remove empty legacy dir
        try:
            if legacy.is_dir() and not any(legacy.iterdir()):
                legacy.rmdir()
        except OSError:
            pass
        return moved

    def migrate_all_projects(self) -> int:
        projects_root = self.root / "projects"
        if not projects_root.is_dir():
            return 0
        total = 0
        for p in projects_root.iterdir():
            if p.is_dir() and (p / "project.md").exists():
                total += self.migrate_project(p.name)
        return total

    def create_project(self, name: str, *, module: str = "draft") -> dict[str, Any]:
        slug = slugify(name)
        base = project_dir(self.root, slug)
        if base.exists():
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"
            base = project_dir(self.root, slug)
        base.mkdir(parents=True)
        (base / "codex").mkdir()
        now = _utc_now()
        meta = {
            "id": slug,
            "type": "project",
            "title": name,
            "module": module,
            "archived": False,
            "updated_at": now,
            "created_at": now,
        }
        atomic_write(base / "project.md", dump_markdown(meta, f"# {name}\n"))
        self.ensure_default_hierarchy(slug)
        board = {"id": f"board-{slug}", "project_slug": slug, "empty": True}
        atomic_write(boards_dir(self.root) / f"board-{slug}.json", json.dumps(board, indent=2) + "\n")
        # Seed empty manuscript immediately so Draft Screen has a durable path before first keystroke.
        self.write_content(
            slug,
            content_id="manuscript",
            type_="manuscript",
            title="Untitled draft",
            body="",
            book_id=DEFAULT_BOOK_ID,
            folder_id=DEFAULT_FOLDER_ID,
        )
        try:
            from engine.committer import init_project_git

            init_project_git(base)
        except Exception:
            pass
        return {
            "slug": slug,
            "name": name,
            "archived": False,
            "module": module,
            "updated_at": now,
        }

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
            updated = str(meta.get("updated_at") or "")
            # Prefer newest content mtime if present
            rows = self.index.list_project(p.name, include_archived=True)
            if rows:
                content_updated = max((str(r.get("updated_at") or "") for r in rows), default="")
                if content_updated > updated:
                    updated = content_updated
            out.append(
                {
                    "slug": p.name,
                    "name": meta.get("title") or p.name,
                    "archived": archived,
                    "module": str(meta.get("module") or "draft"),
                    "updated_at": updated,
                }
            )
        out.sort(key=lambda r: r.get("updated_at") or "", reverse=True)
        return out

    def set_project_archived(self, slug: str, archived: bool) -> dict[str, Any]:
        md = project_dir(self.root, slug) / "project.md"
        if not md.exists():
            raise FileNotFoundError(slug)
        meta, body = parse_markdown(md.read_text(encoding="utf-8"))
        meta["archived"] = archived
        meta["updated_at"] = _utc_now()
        atomic_write(md, dump_markdown(meta, body))
        return {
            "slug": slug,
            "name": meta.get("title") or slug,
            "archived": archived,
            "module": str(meta.get("module") or "draft"),
            "updated_at": meta["updated_at"],
        }

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
        from engine.vault.backup import backup_vault_snapshot

        backup_vault_snapshot(self.root, slug=f"delete-{slug}")
        shutil.rmtree(project_dir(self.root, slug))
        board = boards_dir(self.root) / f"board-{slug}.json"
        if board.exists():
            board.unlink()
        for row in self.index.list_project(slug, include_archived=True):
            self.index.delete(row["id"])
        return {"ok": True, "slug": slug}

    def list_books(self, project_slug: str) -> list[dict[str, Any]]:
        self.migrate_project(project_slug)
        root = books_dir(self.root, project_slug)
        if not root.is_dir():
            return []
        out: list[dict[str, Any]] = []
        for b in sorted(root.iterdir()):
            bmp = b / "book.md"
            if not bmp.exists():
                continue
            meta, _ = parse_markdown(bmp.read_text(encoding="utf-8"))
            out.append(
                {
                    "id": b.name,
                    "title": meta.get("title") or b.name,
                    "updated_at": str(meta.get("updated_at") or ""),
                }
            )
        return out

    def list_folders(self, project_slug: str, book_id: str = DEFAULT_BOOK_ID) -> list[dict[str, Any]]:
        self.migrate_project(project_slug)
        root = book_dir(self.root, project_slug, book_id) / "folders"
        if not root.is_dir():
            return []
        out: list[dict[str, Any]] = []
        for f in sorted(root.iterdir()):
            fmp = f / "folder.md"
            if not fmp.exists():
                continue
            meta, _ = parse_markdown(fmp.read_text(encoding="utf-8"))
            out.append(
                {
                    "id": f.name,
                    "book_id": book_id,
                    "title": meta.get("title") or f.name,
                    "updated_at": str(meta.get("updated_at") or ""),
                }
            )
        return out

    def resolve_content_path(self, project_slug: str, content_id: str) -> Path:
        row = self.index.get(content_id)
        if row and row.get("path"):
            p = self.root / str(row["path"])
            if p.exists():
                return p
        # walk hierarchy
        books = books_dir(self.root, project_slug)
        if books.is_dir():
            for b in books.iterdir():
                folders = b / "folders"
                if not folders.is_dir():
                    continue
                for f in folders.iterdir():
                    cand = f / "content" / f"{content_id}.md"
                    if cand.exists():
                        return cand
        legacy = legacy_content_dir(self.root, project_slug) / f"{content_id}.md"
        if legacy.exists():
            return legacy
        return content_path(
            self.root,
            project_slug,
            content_id,
            book_id=DEFAULT_BOOK_ID,
            folder_id=DEFAULT_FOLDER_ID,
        )

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
        book_id: str = DEFAULT_BOOK_ID,
        folder_id: str = DEFAULT_FOLDER_ID,
        canvas: Optional[dict[str, Any]] = None,
        expected_hash: Optional[str] = None,
        dirty: bool = False,
    ) -> dict[str, Any]:
        with self._write_lock:
            self.migrate_project(project_slug)
            content_id = content_id or uuid.uuid4().hex
            # Prefer existing path if updating
            if self.resolve_content_path(project_slug, content_id).exists() and content_id:
                path = self.resolve_content_path(project_slug, content_id)
                # infer book/folder from path when possible
                try:
                    parts = path.relative_to(project_dir(self.root, project_slug)).parts
                    # books/<book>/folders/<folder>/content/<id>.md
                    if len(parts) >= 5 and parts[0] == "books":
                        book_id = parts[1]
                        folder_id = parts[3]
                except ValueError:
                    pass
            else:
                path = content_path(
                    self.root, project_slug, content_id, book_id=book_id, folder_id=folder_id
                )

            disk_hash = None
            if path.exists():
                disk_bytes = path.read_bytes()
                disk_hash = _hash_bytes(disk_bytes)
                if expected_hash and disk_hash != expected_hash:
                    if dirty:
                        conflict = path.with_name(
                            f"{content_id}.conflict-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.md"
                        )
                        shutil.copy2(path, conflict)
                        return {
                            "ok": False,
                            "conflict": True,
                            "conflict_path": str(conflict.relative_to(self.root)),
                            "disk_hash": disk_hash,
                            "id": content_id,
                        }
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
                "book_id": book_id,
                "folder_id": folder_id,
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
            # bump project updated_at
            pmd = project_dir(self.root, project_slug) / "project.md"
            if pmd.exists():
                pmeta, pbody = parse_markdown(pmd.read_text(encoding="utf-8"))
                pmeta["updated_at"] = meta["updated_at"]
                atomic_write(pmd, dump_markdown(pmeta, pbody))
            st = path.stat()
            # Git checkpoint is NOT per-write — see checkpoint_project (idle / blur / History).
            return {
                "ok": True,
                "id": content_id,
                "path": str(path.relative_to(self.root)),
                "content_hash": _hash_bytes(text.encode("utf-8")),
                "mtime": st.st_mtime,
                "meta": meta,
                "body": body,
                "book_id": book_id,
                "folder_id": folder_id,
            }

    def checkpoint_project(self, project_slug: str, *, message: str = "autosave") -> dict[str, Any]:
        """Coarse git snapshot for Version History — not called on every content write."""
        from engine.committer import checkpoint_project

        return checkpoint_project(project_dir(self.root, project_slug), message=message)

    def read_content(self, project_slug: str, content_id: str) -> dict[str, Any]:
        self.migrate_project(project_slug)
        path = self.resolve_content_path(project_slug, content_id)
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
            "book_id": str(meta.get("book_id") or DEFAULT_BOOK_ID),
            "folder_id": str(meta.get("folder_id") or DEFAULT_FOLDER_ID),
        }

    def set_content_archived(self, project_slug: str, content_id: str, archived: bool) -> dict[str, Any]:
        data = self.read_content(project_slug, content_id)
        meta = data["meta"]
        meta["archived"] = archived
        meta["updated_at"] = _utc_now()
        path = self.resolve_content_path(project_slug, content_id)
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
        path = self.resolve_content_path(project_slug, content_id)
        bak_dir = (
            storyworks_dir(self.root)
            / "backup"
            / f"content-{content_id}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"
        )
        bak_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, bak_dir / path.name)
        path.unlink()
        self.index.delete(content_id)
        return {"ok": True, "id": content_id}

    def save_board(self, board_id: str, document: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(document, dict):
            raise TypeError("board document must be a JSON object")
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
            if not proj.is_dir():
                continue
            self.migrate_project(proj.name)
            # hierarchical content
            books = proj / "books"
            if books.is_dir():
                for b in books.iterdir():
                    folders = b / "folders"
                    if not folders.is_dir():
                        continue
                    for f in folders.iterdir():
                        cdir = f / "content"
                        if not cdir.is_dir():
                            continue
                        for md in cdir.glob("*.md"):
                            if ".conflict-" in md.name:
                                continue
                            self._index_file(proj.name, md)
                            count += 1
            # leftover legacy
            legacy = proj / "content"
            if legacy.is_dir():
                for md in legacy.glob("*.md"):
                    if ".conflict-" in md.name:
                        continue
                    self._index_file(proj.name, md)
                    count += 1
        return count

    def _index_file(self, project_slug: str, path: Path) -> None:
        raw = path.read_text(encoding="utf-8")
        meta, _ = parse_markdown(raw)
        content_id = str(meta.get("id") or path.stem)
        book_id = str(meta.get("book_id") or DEFAULT_BOOK_ID)
        folder_id = str(meta.get("folder_id") or DEFAULT_FOLDER_ID)
        try:
            parts = path.relative_to(project_dir(self.root, project_slug)).parts
            if len(parts) >= 5 and parts[0] == "books":
                book_id = parts[1]
                folder_id = parts[3]
        except ValueError:
            pass
        self.index.upsert(
            {
                "id": content_id,
                "project_slug": project_slug,
                "type": str(meta.get("type") or "note"),
                "parent": str(meta.get("parent") or ""),
                "book_id": book_id,
                "folder_id": folder_id,
                "title": str(meta.get("title") or ""),
                "subject": str(meta.get("subject") or ""),
                "archived": 1 if meta.get("archived") else 0,
                "path": str(path.relative_to(self.root)),
                "content_hash": _hash_bytes(raw.encode("utf-8")),
                "mtime": path.stat().st_mtime,
                "updated_at": str(meta.get("updated_at") or ""),
            }
        )
