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

from engine.ai.provenance import count_words
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

DEFAULT_SETTINGS: dict[str, Any] = {
    "ai_master_enabled": True,
    "muse_enabled": True,
    "stt_enabled": False,
    "stt_model": "mlx-community/whisper-tiny",
    "write_model": "huihui_ai/qwen3-abliterated:14b",
    "agent_model": "qwen2.5-coder:7b",
    "codex_complex": False,
    "product_tier": "full",
    "byom_enabled": False,
    "byom_endpoint": "",
    "daily_skins_enabled": False,
    "tray_edge": "left",
    "openclaw": {"research": False, "git": False, "agentic": False},
}


def slugify(name: str) -> str:
    s = SLUG_RE.sub("-", name.strip().lower()).strip("-")
    return s or "untitled"


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _creation_stamp() -> str:
    """Human-readable local creation time, safe in IDs and filenames."""
    return datetime.now().astimezone().strftime("%Y-%m-%d-%H%M%S")


def _journal_date_from_title(title: str) -> str:
    for format_ in ("%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y"):
        try:
            return datetime.strptime(title.strip(), format_).date().isoformat()
        except ValueError:
            continue
    return ""


def _default_project_title(module: str, stamp: str) -> str:
    labels = {
        "draft": "Draft",
        "novel": "Novel",
        "screenplay": "Screenplay",
        "notes": "Notes",
        "journal": "Journal",
        "blog": "Blog",
    }
    return f"{labels.get(module, 'Project')} {stamp}"


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
                json.dumps(DEFAULT_SETTINGS, indent=2) + "\n",
            )
        store = cls(root)
        store.migrate_all_projects()
        store.reindex()
        return store

    def close(self) -> None:
        self.index.close()

    def settings(self) -> dict[str, Any]:
        raw = json.loads(settings_path(self.root).read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            raw = {}
        out = {**DEFAULT_SETTINGS, **raw}
        openclaw_raw = raw.get("openclaw") if isinstance(raw.get("openclaw"), dict) else {}
        out["openclaw"] = {
            **dict(DEFAULT_SETTINGS["openclaw"]),
            **openclaw_raw,
        }
        if out.get("tray_edge") not in {"left", "right"}:
            out["tray_edge"] = "left"
        if not isinstance(out.get("daily_skins_enabled"), bool):
            out["daily_skins_enabled"] = False
        return out

    def save_settings(self, data: dict[str, Any]) -> dict[str, Any]:
        if "tray_edge" in data and data["tray_edge"] not in {"left", "right"}:
            raise ValueError("tray_edge must be left or right")
        if "daily_skins_enabled" in data and not isinstance(
            data["daily_skins_enabled"], bool
        ):
            raise ValueError("daily_skins_enabled must be a boolean")
        current = self.settings()
        merged = {**current, **data}
        if "openclaw" in data:
            if not isinstance(data["openclaw"], dict):
                raise ValueError("openclaw must be an object")
            for key, value in data["openclaw"].items():
                if key not in {"research", "git", "agentic"}:
                    raise ValueError(f"unknown openclaw role: {key}")
                if not isinstance(value, bool):
                    raise ValueError(f"openclaw.{key} must be a boolean")
            merged["openclaw"] = {
                **dict(current.get("openclaw") or DEFAULT_SETTINGS["openclaw"]),
                **data["openclaw"],
            }
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
        module = (module or "draft").lower().strip()
        allowed = {
            "draft",
            "novel",
            "screenplay",
            "notes",
            "journal",
            "blog",
        }
        if module not in allowed:
            raise ValueError(f"unknown module: {module}")
        stamp = _creation_stamp()
        dated_defaults = not name.strip()
        name = name.strip() or _default_project_title(module, stamp)
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
        if module == "blog":
            meta["blog_stage"] = "research"
            meta["set_aside"] = []
        atomic_write(base / "project.md", dump_markdown(meta, f"# {name}\n"))
        self.ensure_default_hierarchy(slug)
        board = {"id": f"board-{slug}", "project_slug": slug, "empty": True}
        atomic_write(boards_dir(self.root) / f"board-{slug}.json", json.dumps(board, indent=2) + "\n")
        self._seed_module_content(
            slug,
            module=module,
            title=name,
            stamp=stamp,
            dated_defaults=dated_defaults,
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

    def _seed_module_content(
        self,
        slug: str,
        *,
        module: str,
        title: str,
        stamp: str,
        dated_defaults: bool,
    ) -> None:
        if module == "novel":
            body = "<!--scene:opening-->\n\n"
            self.write_content(
                slug,
                content_id="chapter-1",
                type_="chapter",
                title="Chapter 1",
                body=body,
                book_id=DEFAULT_BOOK_ID,
                folder_id=DEFAULT_FOLDER_ID,
            )
            self.set_content_scenes(
                slug,
                "chapter-1",
                [{"id": "opening", "title": "Opening", "ordinal": 0}],
            )
        elif module == "screenplay":
            body = "INT. ROOM - DAY\n\nCHARACTER\nDialogue goes here.\n"
            self.write_content(
                slug,
                content_id="scene-1",
                type_="screenplay_scene",
                title="Scene 1",
                body=body,
                book_id=DEFAULT_BOOK_ID,
                folder_id=DEFAULT_FOLDER_ID,
            )
        elif module == "notes":
            self.write_content(
                slug,
                content_id=f"note-{stamp}" if dated_defaults else "note-1",
                type_="note",
                title=f"Note {stamp}" if dated_defaults else "Untitled note",
                body="",
                book_id=DEFAULT_BOOK_ID,
                folder_id=DEFAULT_FOLDER_ID,
            )
        elif module == "journal":
            from datetime import date

            today = date.today().strftime("%m/%d/%Y")
            self.write_content(
                slug,
                content_id="entry-1",
                type_="journal_entry",
                title=today,
                body="",
                book_id=DEFAULT_BOOK_ID,
                folder_id=DEFAULT_FOLDER_ID,
            )
        elif module == "blog":
            for stage, tid in (
                ("research", "blog-research"),
                ("outline", "blog-outline"),
                ("draft", "blog-draft"),
                ("edit", "blog-edit"),
            ):
                self.write_content(
                    slug,
                    content_id=tid,
                    type_=f"blog_{stage}",
                    title=stage.title(),
                    body="",
                    book_id=DEFAULT_BOOK_ID,
                    folder_id=DEFAULT_FOLDER_ID,
                )
        else:
            self.write_content(
                slug,
                content_id=f"draft-{stamp}" if dated_defaults else "manuscript",
                type_="manuscript",
                title=f"Draft {stamp}" if dated_defaults else "Untitled draft",
                body="",
                book_id=DEFAULT_BOOK_ID,
                folder_id=DEFAULT_FOLDER_ID,
            )

    def rename_project(self, slug: str, name: str) -> dict[str, Any]:
        """Rename the visible project title while preserving its stable folder identity."""
        name = name.strip()
        if not name:
            raise ValueError("project name cannot be empty")
        md = project_dir(self.root, slug) / "project.md"
        if not md.exists():
            raise FileNotFoundError(slug)
        with self._write_lock:
            meta, _ = parse_markdown(md.read_text(encoding="utf-8"))
            meta["title"] = name
            meta["updated_at"] = _utc_now()
            atomic_write(md, dump_markdown(meta, f"# {name}\n"))
        return {
            "slug": slug,
            "name": name,
            "archived": bool(meta.get("archived", False)),
            "module": str(meta.get("module") or "draft"),
            "updated_at": meta["updated_at"],
        }

    def rename_content(self, project_slug: str, content_id: str, title: str) -> dict[str, Any]:
        """Rename content metadata without changing its stable filename/ID."""
        title = title.strip()
        if not title:
            raise ValueError("content title cannot be empty")
        with self._write_lock:
            data = self.read_content(project_slug, content_id)
            meta = dict(data["meta"])
            meta["title"] = title
            meta["updated_at"] = _utc_now()
            path = self.resolve_content_path(project_slug, content_id)
            atomic_write(path, dump_markdown(meta, data["body"]))
            self._index_file(project_slug, path)
        return self.read_content(project_slug, content_id)

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
                    "privacy": str(meta.get("privacy") or "public"),
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
        paragraph_timestamps: Optional[list[str]] = None,
        entry_date: Optional[str] = None,
        entry_time: Optional[str] = None,
        word_count: Optional[int] = None,
        expected_hash: Optional[str] = None,
        dirty: bool = False,
        exclude_from_ai: Optional[bool] = None,
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

            prev_scenes: list[Any] = []
            prev_tags: list[Any] = []
            prev_codex_links: list[Any] = []
            prev_provenance: dict[str, Any] = {}
            prev_paragraph_timestamps: list[str] = []
            prev_entry_date = ""
            prev_entry_time = ""
            prev_word_count = 0
            prev_exclude_from_ai = False
            if path.exists():
                try:
                    pmeta, _ = parse_markdown(path.read_text(encoding="utf-8"))
                    prev_scenes = list(pmeta.get("scenes") or [])
                    prev_tags = list(pmeta.get("tags") or [])
                    prev_codex_links = list(pmeta.get("codex_links") or [])
                    if isinstance(pmeta.get("provenance"), dict):
                        prev_provenance = dict(pmeta["provenance"])
                    prev_paragraph_timestamps = [
                        str(value) for value in list(pmeta.get("paragraph_timestamps") or [])
                    ]
                    prev_entry_date = str(pmeta.get("entry_date") or "")
                    prev_entry_time = str(pmeta.get("entry_time") or "")
                    prev_word_count = max(0, int(pmeta.get("word_count") or 0))
                    prev_exclude_from_ai = bool(pmeta.get("exclude_from_ai"))
                except (OSError, TypeError, ValueError):
                    pass
            journal_meta: dict[str, Any] = {}
            if type_ == "journal_entry":
                local_now = datetime.now().astimezone().replace(microsecond=0)
                if body.startswith("swenc:"):
                    journal_word_count = (
                        max(0, int(word_count))
                        if word_count is not None
                        else prev_word_count
                    )
                else:
                    journal_word_count = count_words(body)
                journal_meta = {
                    "entry_date": (
                        entry_date
                        or prev_entry_date
                        or _journal_date_from_title(title)
                        or local_now.date().isoformat()
                    ),
                    "entry_time": entry_time or prev_entry_time or local_now.timetz().isoformat(),
                    "word_count": journal_word_count,
                }
            meta = {
                "id": content_id,
                "type": type_,
                "parent": parent,
                "book_id": book_id,
                "folder_id": folder_id,
                "title": title,
                "subject": subject,
                "tags": prev_tags,
                "scenes": prev_scenes,
                "codex_links": prev_codex_links,
                "provenance": prev_provenance,
                "paragraph_timestamps": (
                    [str(value) for value in paragraph_timestamps]
                    if paragraph_timestamps is not None
                    else prev_paragraph_timestamps
                ),
                "exclude_from_ai": (
                    bool(exclude_from_ai)
                    if exclude_from_ai is not None
                    else prev_exclude_from_ai
                ),
                "archived": False,
                "canvas": canvas or {},
                "updated_at": _utc_now(),
                **journal_meta,
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

    def bump_provenance(
        self,
        project_slug: str,
        content_id: str,
        *,
        muse_words: int = 0,
        ai_words: int = 0,
    ) -> dict[str, Any]:
        """Increment Muse/AI accepted-word counters without rewriting body text."""
        from engine.ai.provenance import normalize_provenance, provenance_summary

        with self._write_lock:
            data = self.read_content(project_slug, content_id)
            meta = dict(data["meta"])
            prov = normalize_provenance(meta.get("provenance"))
            prov["muse_words"] += max(0, int(muse_words))
            prov["ai_words"] += max(0, int(ai_words))
            meta["provenance"] = prov
            meta["updated_at"] = _utc_now()
            path = self.resolve_content_path(project_slug, content_id)
            atomic_write(path, dump_markdown(meta, data["body"]))
            self._index_file(project_slug, path)
            summary = provenance_summary(str(data["body"] or ""), prov)
            return {"ok": True, "id": content_id, "provenance": prov, "summary": summary}

    def approve_sandbox_into_content(
        self,
        project_slug: str,
        draft_id: str,
        *,
        mode: str = "append",
    ) -> dict[str, Any]:
        """Merge a pending/set_aside sandbox draft into the target content body."""
        from engine.ai.provenance import count_words
        from engine.ai.sandbox import get_sandbox_draft, set_sandbox_status

        draft = get_sandbox_draft(self.root, project_slug, draft_id)
        if draft.get("status") == "approved":
            raise PermissionError("draft already approved")
        content_id = str(draft["content_id"])
        text = str(draft.get("body") or "").strip()
        if not text:
            raise ValueError("empty sandbox draft")

        with self._write_lock:
            data = self.read_content(project_slug, content_id)
            body = str(data["body"] or "")
            if mode == "replace":
                new_body = text + ("\n" if not text.endswith("\n") else "")
            else:
                sep = "" if not body or body.endswith("\n") else "\n"
                new_body = body + sep + text + ("\n" if not text.endswith("\n") else "")
            result = self.write_content(
                project_slug,
                content_id=content_id,
                type_=str(data["meta"].get("type") or "note"),
                title=str(data["meta"].get("title") or ""),
                subject=str(data["meta"].get("subject") or ""),
                body=new_body,
                book_id=str(data.get("book_id") or DEFAULT_BOOK_ID),
                folder_id=str(data.get("folder_id") or DEFAULT_FOLDER_ID),
            )
            if not result.get("ok"):
                return result
            self.bump_provenance(project_slug, content_id, ai_words=count_words(text))
            item = set_sandbox_status(self.root, project_slug, draft_id, "approved")
            return {"ok": True, "draft": item, "content": self.read_content(project_slug, content_id)}

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

    def set_content_scenes(
        self, project_slug: str, content_id: str, scenes: list[dict[str, Any]]
    ) -> dict[str, Any]:
        data = self.read_content(project_slug, content_id)
        meta = data["meta"]
        meta["scenes"] = scenes
        meta["updated_at"] = _utc_now()
        path = self.resolve_content_path(project_slug, content_id)
        atomic_write(path, dump_markdown(meta, data["body"]))
        self._index_file(project_slug, path)
        return self.read_content(project_slug, content_id)

    def get_content_scenes(self, project_slug: str, content_id: str) -> list[dict[str, Any]]:
        data = self.read_content(project_slug, content_id)
        scenes = data["meta"].get("scenes") or []
        return list(scenes) if isinstance(scenes, list) else []

    def create_journal_book(
        self,
        project_slug: str,
        title: str,
        *,
        privacy: str = "public",
        password: Optional[str] = None,
    ) -> dict[str, Any]:
        privacy = privacy.lower().strip()
        if privacy not in ("public", "private"):
            raise ValueError("privacy must be public or private")
        book_id = slugify(title) or uuid.uuid4().hex[:8]
        bdir = book_dir(self.root, project_slug, book_id)
        if bdir.exists():
            book_id = f"{book_id}-{uuid.uuid4().hex[:4]}"
            bdir = book_dir(self.root, project_slug, book_id)
        fdir = folder_dir(self.root, project_slug, book_id, DEFAULT_FOLDER_ID)
        fdir.mkdir(parents=True, exist_ok=True)
        (fdir / "content").mkdir(exist_ok=True)
        now = _utc_now()
        meta: dict[str, Any] = {
            "id": book_id,
            "type": "book",
            "title": title,
            "privacy": privacy,
            "updated_at": now,
            "created_at": now,
        }
        recovery_key = None
        if privacy == "private":
            if not password:
                raise ValueError("password required for private journal book")
            from engine.vault.journal_crypto import book_crypto_public_meta, new_private_book_secrets

            secrets = new_private_book_secrets(password)
            recovery_key = secrets["recovery_key"]
            meta.update(book_crypto_public_meta(secrets))
            from engine.vault.journal_crypto import keychain_service, keychain_store

            keychain_store(keychain_service(project_slug, book_id), password)
        atomic_write(book_meta_path(self.root, project_slug, book_id), dump_markdown(meta, f"# {title}\n"))
        atomic_write(
            folder_meta_path(self.root, project_slug, book_id, DEFAULT_FOLDER_ID),
            dump_markdown(
                {
                    "id": DEFAULT_FOLDER_ID,
                    "type": "folder",
                    "title": "Entries",
                    "book_id": book_id,
                    "updated_at": now,
                },
                "# Entries\n",
            ),
        )
        out = {"id": book_id, "title": title, "privacy": privacy, "updated_at": now}
        if recovery_key:
            out["recovery_key"] = recovery_key
            out["recovery_warning"] = (
                "Store this recovery key offline. If you lose both password and key, the book is unrecoverable."
            )
        return out

    def unlock_journal_book(
        self,
        project_slug: str,
        book_id: str,
        *,
        password: Optional[str] = None,
        recovery_key: Optional[str] = None,
    ) -> dict[str, Any]:
        bmp = book_meta_path(self.root, project_slug, book_id)
        if not bmp.exists():
            raise FileNotFoundError(book_id)
        meta, _ = parse_markdown(bmp.read_text(encoding="utf-8"))
        if str(meta.get("privacy") or "public") != "private":
            return {"ok": True, "privacy": "public", "book_id": book_id}
        from engine.vault.journal_crypto import (
            keychain_load,
            keychain_service,
            keychain_store,
            unlock_dek,
        )

        pw = password
        if not pw and not recovery_key:
            pw = keychain_load(keychain_service(project_slug, book_id))
        dek = unlock_dek(
            password=pw,
            recovery_key=recovery_key,
            salt_b64=str(meta["crypto_salt"]),
            wrapped_pw=str(meta["wrapped_dek_password"]),
            wrapped_rk=str(meta["wrapped_dek_recovery"]),
        )
        if pw:
            keychain_store(keychain_service(project_slug, book_id), pw)
        # Session token for this process only (hex of dek) — API returns opaque handle.
        token = dek.decode("ascii")
        return {"ok": True, "privacy": "private", "book_id": book_id, "session_dek": token}

    def content_excludes_ai(self, project_slug: str, content_id: str) -> bool:
        try:
            data = self.read_content(project_slug, content_id)
        except FileNotFoundError:
            return False
        return bool((data.get("meta") or {}).get("exclude_from_ai"))

    def set_exclude_from_ai(
        self, project_slug: str, content_id: str, exclude: bool
    ) -> dict[str, Any]:
        data = self.read_content(project_slug, content_id)
        meta = dict(data.get("meta") or {})
        meta["exclude_from_ai"] = bool(exclude)
        meta["updated_at"] = _utc_now()
        path = self.resolve_content_path(project_slug, content_id)
        atomic_write(path, dump_markdown(meta, str(data.get("body") or "")))
        self._index_file(project_slug, path)
        return self.read_content(project_slug, content_id)

    def search_vault(
        self,
        query: str,
        *,
        limit: int = 40,
        for_ai: bool = False,
    ) -> list[dict[str, Any]]:
        """Lexical Ask-your-vault search (Phase 4); NL agent is Phase 5."""
        q = query.strip().lower()
        if not q:
            return []
        hits: list[dict[str, Any]] = []
        projects = self.root / "projects"
        if not projects.is_dir():
            return []
        for proj in projects.iterdir():
            if not proj.is_dir() or not (proj / "project.md").exists():
                continue
            for row in self.index.list_project(proj.name, include_archived=False):
                title = str(row.get("title") or "")
                subject = str(row.get("subject") or "")
                blob = f"{title} {subject}".lower()
                path = self.root / str(row.get("path") or "")
                body_snip = ""
                exclude_from_ai = False
                if path.is_file():
                    try:
                        meta, body = parse_markdown(path.read_text(encoding="utf-8"))
                        exclude_from_ai = bool(meta.get("exclude_from_ai"))
                        if for_ai and exclude_from_ai:
                            continue
                        body_snip = body[:240]
                        blob += " " + body.lower()
                    except OSError:
                        pass
                if q in blob:
                    hits.append(
                        {
                            "project_slug": proj.name,
                            "id": row["id"],
                            "title": title,
                            "type": row.get("type"),
                            "snippet": body_snip,
                            "exclude_from_ai": exclude_from_ai,
                        }
                    )
                if len(hits) >= limit:
                    return hits
        return hits

    def patch_project_meta(self, project_slug: str, patch: dict[str, Any]) -> dict[str, Any]:
        md = project_dir(self.root, project_slug) / "project.md"
        if not md.exists():
            raise FileNotFoundError(project_slug)
        meta, body = parse_markdown(md.read_text(encoding="utf-8"))
        for k, v in patch.items():
            meta[k] = v
        meta["updated_at"] = _utc_now()
        atomic_write(md, dump_markdown(meta, body))
        return {
            "slug": project_slug,
            "name": meta.get("title") or project_slug,
            "module": str(meta.get("module") or "draft"),
            "blog_stage": meta.get("blog_stage"),
            "set_aside": meta.get("set_aside") or [],
            "updated_at": meta["updated_at"],
        }

    def get_project_meta(self, project_slug: str) -> dict[str, Any]:
        md = project_dir(self.root, project_slug) / "project.md"
        if not md.exists():
            raise FileNotFoundError(project_slug)
        meta, _ = parse_markdown(md.read_text(encoding="utf-8"))
        return {
            "slug": project_slug,
            "name": meta.get("title") or project_slug,
            "module": str(meta.get("module") or "draft"),
            "blog_stage": meta.get("blog_stage"),
            "set_aside": list(meta.get("set_aside") or []),
            "updated_at": meta.get("updated_at"),
        }
