"""SQLite WAL index/cache over vault markdown (never source of truth)."""

from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Optional


SCHEMA = """
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  project_slug TEXT NOT NULL,
  type TEXT NOT NULL,
  parent TEXT,
  book_id TEXT,
  folder_id TEXT,
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
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(db_path), check_same_thread=False, timeout=30.0)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL;")
        self._conn.execute("PRAGMA busy_timeout=5000;")
        self._conn.execute("PRAGMA synchronous=NORMAL;")
        self._conn.executescript(SCHEMA)
        self._migrate()
        self._conn.commit()

    def _migrate(self) -> None:
        cols = {r[1] for r in self._conn.execute("PRAGMA table_info(content)").fetchall()}
        if "book_id" not in cols:
            self._conn.execute("ALTER TABLE content ADD COLUMN book_id TEXT")
        if "folder_id" not in cols:
            self._conn.execute("ALTER TABLE content ADD COLUMN folder_id TEXT")

    def _with_retry(self, fn: Any) -> Any:
        last: Optional[BaseException] = None
        for attempt in range(12):
            try:
                return fn()
            except sqlite3.OperationalError as exc:
                last = exc
                msg = str(exc).lower()
                if "disk i/o" not in msg and "locked" not in msg and "busy" not in msg:
                    raise
                # Exponential backoff capped ~0.8s; total wait well under a few seconds.
                time.sleep(min(0.8, 0.05 * (2**attempt)))
        assert last is not None
        raise last

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def upsert(self, row: dict[str, Any]) -> None:
        def _do() -> None:
            with self._lock:
                self._conn.execute(
                    """
                    INSERT INTO content (
                      id, project_slug, type, parent, book_id, folder_id,
                      title, subject, archived, path, content_hash, mtime, updated_at
                    )
                    VALUES (
                      :id, :project_slug, :type, :parent, :book_id, :folder_id,
                      :title, :subject, :archived, :path, :content_hash, :mtime, :updated_at
                    )
                    ON CONFLICT(id) DO UPDATE SET
                      project_slug=excluded.project_slug,
                      type=excluded.type,
                      parent=excluded.parent,
                      book_id=excluded.book_id,
                      folder_id=excluded.folder_id,
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

        self._with_retry(_do)

    def delete(self, content_id: str) -> None:
        def _do() -> None:
            with self._lock:
                self._conn.execute("DELETE FROM content WHERE id = ?", (content_id,))
                self._conn.commit()

        self._with_retry(_do)

    def get(self, content_id: str) -> Optional[dict[str, Any]]:
        def _do() -> Optional[dict[str, Any]]:
            with self._lock:
                cur = self._conn.execute("SELECT * FROM content WHERE id = ?", (content_id,))
                row = cur.fetchone()
                return dict(row) if row else None

        return self._with_retry(_do)

    def list_project(self, project_slug: str, *, include_archived: bool = False) -> list[dict[str, Any]]:
        def _do() -> list[dict[str, Any]]:
            with self._lock:
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

        return self._with_retry(_do)

    def clear(self) -> None:
        def _do() -> None:
            with self._lock:
                self._conn.execute("DELETE FROM content")
                self._conn.commit()

        self._with_retry(_do)
