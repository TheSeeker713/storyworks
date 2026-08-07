"""SQLite data layer (WAL)."""

from __future__ import annotations

import json
import re
import sqlite3
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any

from .paths import BACKUP_DIR, DB_PATH, PROJECTS_DIR

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  archived INTEGER NOT NULL DEFAULT 0,
  archive_reason TEXT,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Manuscript',
  body TEXT NOT NULL DEFAULT '',
  updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
"""


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    return s or "project"


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)
        conn.commit()


def _row_project(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "slug": row["slug"],
        "archived": bool(row["archived"]),
        "archive_reason": row["archive_reason"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def list_projects(*, include_archived: bool = False) -> list[dict[str, Any]]:
    with connect() as conn:
        if include_archived:
            rows = conn.execute(
                "SELECT * FROM projects ORDER BY updated_at DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM projects WHERE archived = 0 ORDER BY updated_at DESC"
            ).fetchall()
        return [_row_project(r) for r in rows]


def get_project(project_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        return _row_project(row) if row else None


def _unique_slug(conn: sqlite3.Connection, base: str) -> str:
    slug = base
    n = 2
    while conn.execute("SELECT 1 FROM projects WHERE slug = ?", (slug,)).fetchone():
        slug = f"{base}-{n}"
        n += 1
    return slug


def _init_project_git(project_dir: Path) -> None:
    project_dir.mkdir(parents=True, exist_ok=True)
    if not (project_dir / ".git").exists():
        subprocess.run(["git", "init"], cwd=project_dir, check=True, capture_output=True)
        subprocess.run(
            ["git", "config", "user.email", "storyworks@local"],
            cwd=project_dir,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["git", "config", "user.name", "Storyworks"],
            cwd=project_dir,
            check=True,
            capture_output=True,
        )
    manuscript = project_dir / "manuscript.md"
    if not manuscript.exists():
        manuscript.write_text("# Manuscript\n\n", encoding="utf-8")
    meta = project_dir / "project.json"
    if not meta.exists():
        meta.write_text(json.dumps({"format": "storyworks-project", "v": 1}, indent=2), encoding="utf-8")
    subprocess.run(["git", "add", "-A"], cwd=project_dir, check=True, capture_output=True)
    status = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=project_dir,
        capture_output=True,
        text=True,
        check=True,
    )
    if status.stdout.strip():
        subprocess.run(
            ["git", "commit", "-m", "Initial project"],
            cwd=project_dir,
            check=True,
            capture_output=True,
        )


def create_project(name: str) -> dict[str, Any]:
    now = time.time()
    pid = str(uuid.uuid4())
    with connect() as conn:
        slug = _unique_slug(conn, _slugify(name))
        conn.execute(
            "INSERT INTO projects (id, name, slug, archived, archive_reason, created_at, updated_at) "
            "VALUES (?, ?, ?, 0, NULL, ?, ?)",
            (pid, name.strip(), slug, now, now),
        )
        doc_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO documents (id, project_id, title, body, updated_at) VALUES (?, ?, ?, ?, ?)",
            (doc_id, pid, "Manuscript", "", now),
        )
        conn.commit()
    project_dir = PROJECTS_DIR / slug
    _init_project_git(project_dir)
    project = get_project(pid)
    assert project
    project["document_id"] = doc_id
    return project


def set_archived(project_id: str, archived: bool, reason: str | None = None) -> dict[str, Any] | None:
    now = time.time()
    with connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            return None
        archive_reason = reason if archived else None
        conn.execute(
            "UPDATE projects SET archived = ?, archive_reason = ?, updated_at = ? WHERE id = ?",
            (1 if archived else 0, archive_reason, now, project_id),
        )
        conn.commit()
    return get_project(project_id)


def delete_project(project_id: str, typed_name: str) -> dict[str, Any]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            return {"ok": False, "error": "not_found"}
        if not row["archived"]:
            return {"ok": False, "error": "must_archive_first"}
        if typed_name.strip() != row["name"]:
            return {"ok": False, "error": "name_mismatch"}
        slug = row["slug"]
        # Backup before delete
        stamp = time.strftime("%Y%m%d-%H%M%S")
        src = PROJECTS_DIR / slug
        if src.exists():
            dest = BACKUP_DIR / f"{slug}-{stamp}"
            dest.mkdir(parents=True, exist_ok=True)
            for item in src.iterdir():
                if item.name == ".git":
                    continue
                target = dest / item.name
                if item.is_dir():
                    import shutil

                    shutil.copytree(item, target)
                else:
                    import shutil

                    shutil.copy2(item, target)
            # keep a note
            (dest / "DELETED.txt").write_text(
                f"Deleted project '{row['name']}' at {stamp}\n", encoding="utf-8"
            )
        conn.execute("DELETE FROM documents WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
    # Remove live folder after DB delete
    import shutil

    live = PROJECTS_DIR / slug
    if live.exists():
        shutil.rmtree(live)
    return {"ok": True}


def get_document(project_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1",
            (project_id,),
        ).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "project_id": row["project_id"],
            "title": row["title"],
            "body": row["body"],
            "updated_at": row["updated_at"],
        }


def save_document(project_id: str, body: str, title: str | None = None) -> dict[str, Any] | None:
    now = time.time()
    with connect() as conn:
        proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not proj:
            return None
        row = conn.execute(
            "SELECT * FROM documents WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1",
            (project_id,),
        ).fetchone()
        if not row:
            return None
        new_title = title if title is not None else row["title"]
        conn.execute(
            "UPDATE documents SET body = ?, title = ?, updated_at = ? WHERE id = ?",
            (body, new_title, now, row["id"]),
        )
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))
        conn.commit()
        slug = proj["slug"]
    # Sync to filesystem for project git
    project_dir = PROJECTS_DIR / slug
    project_dir.mkdir(parents=True, exist_ok=True)
    (project_dir / "manuscript.md").write_text(body, encoding="utf-8")
    from engine.committer import schedule_commit

    schedule_commit(project_dir)
    return get_document(project_id)