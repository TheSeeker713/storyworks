"""SQLite WAL index/cache over vault markdown (never source of truth)."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Optional


SCHEMA = """
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  project_slug TEXT NOT NULL,
  type TEXT NOT NULL,
  parent TEXT,
  title TEXT,
  subject TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  mtime REAL NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_content_project ON content(project_slug);
CREATE INDEX IF NOT EXISTS idx_content_archived ON content(archived);
"""


class VaultIndex:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL;")
        self._conn.executescript(SCHEMA)
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    def upsert(self, row: dict[str, Any]) -> None:
        self._conn.execute(
            """
            INSERT INTO content (id, project_slug, type, parent, title, subject, archived, path, content_hash, mtime, updated_at)
            VALUES (:id, :project_slug, :type, :parent, :title, :subject, :archived, :path, :content_hash, :mtime, :updated_at)
            ON CONFLICT(id) DO UPDATE SET
              project_slug=excluded.project_slug,
              type=excluded.type,
              parent=excluded.parent,
              title=excluded.title,
              subject=excluded.subject,
              archived=excluded.archived,
              path=excluded.path,
              content_hash=excluded.content_hash,
              mtime=excluded.mtime,
              updated_at=excluded.updated_at
            """,
            row,
        )
        self._conn.commit()

    def delete(self, content_id: str) -> None:
        self._conn.execute("DELETE FROM content WHERE id = ?", (content_id,))
        self._conn.commit()

    def get(self, content_id: str) -> Optional[dict[str, Any]]:
        cur = self._conn.execute("SELECT * FROM content WHERE id = ?", (content_id,))
        row = cur.fetchone()
        return dict(row) if row else None

    def list_project(self, project_slug: str, *, include_archived: bool = False) -> list[dict[str, Any]]:
        if include_archived:
            cur = self._conn.execute(
                "SELECT * FROM content WHERE project_slug = ? ORDER BY updated_at DESC",
                (project_slug,),
            )
        else:
            cur = self._conn.execute(
                "SELECT * FROM content WHERE project_slug = ? AND archived = 0 ORDER BY updated_at DESC",
                (project_slug,),
            )
        return [dict(r) for r in cur.fetchall()]

    def clear(self) -> None:
        self._conn.execute("DELETE FROM content")
        self._conn.commit()
