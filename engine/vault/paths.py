"""Vault path helpers — Project → Book → Folder → Content."""

from __future__ import annotations

import hashlib
from pathlib import Path

DEFAULT_BOOK_ID = "main"
DEFAULT_FOLDER_ID = "main"


def storyworks_dir(vault: Path) -> Path:
    return vault / ".storyworks"


def app_support_root() -> Path:
    """macOS local app cache — outside iCloud Documents."""
    return Path.home() / "Library" / "Application Support" / "Storyworks"


def index_dir(vault: Path) -> Path:
    """SQLite cache dir keyed by vault path (not inside the vault / iCloud tree)."""
    digest = hashlib.sha256(str(vault.resolve()).encode("utf-8")).hexdigest()[:24]
    return app_support_root() / "indexes" / digest


def index_path(vault: Path) -> Path:
    return index_dir(vault) / "index.sqlite"


def vault_cache_nosync_index(vault: Path) -> Path:
    """Previous in-vault `.nosync` location (still under Documents)."""
    return storyworks_dir(vault) / "cache.nosync" / "index.sqlite"


def legacy_index_path(vault: Path) -> Path:
    """Oldest in-vault location (corrupted under iCloud Documents)."""
    return storyworks_dir(vault) / "index.sqlite"


def _move_sqlite_bundle(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    for suffix in ("", "-wal", "-shm"):
        old = Path(f"{src}{suffix}") if suffix else src
        if not old.exists():
            continue
        new = Path(f"{dest}{suffix}") if suffix else dest
        if new.exists():
            continue
        old.replace(new)


def migrate_legacy_index(vault: Path) -> None:
    """Prefer Application Support; pull forward from older in-vault index locations once."""
    dest = index_path(vault)
    if dest.exists():
        return
    for src in (vault_cache_nosync_index(vault), legacy_index_path(vault)):
        if src.exists():
            _move_sqlite_bundle(src, dest)
            # Drop empty cache.nosync dir if we emptied it
            parent = src.parent
            if parent.name == "cache.nosync" and parent.is_dir():
                try:
                    next(parent.iterdir())
                except StopIteration:
                    try:
                        parent.rmdir()
                    except OSError:
                        pass
            return
    index_dir(vault).mkdir(parents=True, exist_ok=True)


def settings_path(vault: Path) -> Path:
    return storyworks_dir(vault) / "settings.json"


def vault_meta_path(vault: Path) -> Path:
    return storyworks_dir(vault) / "vault.json"


def backup_root(vault: Path) -> Path:
    return storyworks_dir(vault) / "backup"


def project_dir(vault: Path, project_slug: str) -> Path:
    return vault / "projects" / project_slug


def books_dir(vault: Path, project_slug: str) -> Path:
    return project_dir(vault, project_slug) / "books"


def book_dir(vault: Path, project_slug: str, book_id: str) -> Path:
    return books_dir(vault, project_slug) / book_id


def book_meta_path(vault: Path, project_slug: str, book_id: str) -> Path:
    return book_dir(vault, project_slug, book_id) / "book.md"


def folders_dir(vault: Path, project_slug: str, book_id: str) -> Path:
    return book_dir(vault, project_slug, book_id) / "folders"


def folder_dir(vault: Path, project_slug: str, book_id: str, folder_id: str) -> Path:
    return folders_dir(vault, project_slug, book_id) / folder_id


def folder_meta_path(vault: Path, project_slug: str, book_id: str, folder_id: str) -> Path:
    return folder_dir(vault, project_slug, book_id, folder_id) / "folder.md"


def content_dir(
    vault: Path,
    project_slug: str,
    book_id: str = DEFAULT_BOOK_ID,
    folder_id: str = DEFAULT_FOLDER_ID,
) -> Path:
    return folder_dir(vault, project_slug, book_id, folder_id) / "content"


def content_path(
    vault: Path,
    project_slug: str,
    content_id: str,
    *,
    book_id: str = DEFAULT_BOOK_ID,
    folder_id: str = DEFAULT_FOLDER_ID,
) -> Path:
    return content_dir(vault, project_slug, book_id, folder_id) / f"{content_id}.md"


def legacy_content_dir(vault: Path, project_slug: str) -> Path:
    """Pre-hierarchy flat content/ directory."""
    return project_dir(vault, project_slug) / "content"


def boards_dir(vault: Path) -> Path:
    return vault / "boards"
