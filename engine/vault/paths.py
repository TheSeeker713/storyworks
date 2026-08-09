"""Vault path helpers — Project → Book → Folder → Content."""

from __future__ import annotations

from pathlib import Path

DEFAULT_BOOK_ID = "main"
DEFAULT_FOLDER_ID = "main"


def storyworks_dir(vault: Path) -> Path:
    return vault / ".storyworks"


def index_dir(vault: Path) -> Path:
    """Local-only SQLite cache dir. `.nosync` keeps iCloud Drive from syncing WAL files."""
    return storyworks_dir(vault) / "cache.nosync"


def index_path(vault: Path) -> Path:
    return index_dir(vault) / "index.sqlite"


def legacy_index_path(vault: Path) -> Path:
    """Pre-`.nosync` location (was corrupted under iCloud Documents)."""
    return storyworks_dir(vault) / "index.sqlite"


def migrate_legacy_index(vault: Path) -> None:
    """Move old `.storyworks/index.sqlite*` into `cache.nosync/` once."""
    dest = index_path(vault)
    if dest.exists():
        return
    src = legacy_index_path(vault)
    if not src.exists():
        index_dir(vault).mkdir(parents=True, exist_ok=True)
        return
    index_dir(vault).mkdir(parents=True, exist_ok=True)
    for suffix in ("", "-wal", "-shm"):
        old = Path(f"{src}{suffix}") if suffix else src
        if not old.exists():
            continue
        new = Path(f"{dest}{suffix}") if suffix else dest
        if not new.exists():
            old.replace(new)


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
