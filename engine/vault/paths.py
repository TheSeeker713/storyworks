"""Vault path helpers."""

from __future__ import annotations

from pathlib import Path


def storyworks_dir(vault: Path) -> Path:
    return vault / ".storyworks"


def index_path(vault: Path) -> Path:
    return storyworks_dir(vault) / "index.sqlite"


def settings_path(vault: Path) -> Path:
    return storyworks_dir(vault) / "settings.json"


def vault_meta_path(vault: Path) -> Path:
    return storyworks_dir(vault) / "vault.json"


def backup_root(vault: Path) -> Path:
    return storyworks_dir(vault) / "backup"


def project_dir(vault: Path, project_slug: str) -> Path:
    return vault / "projects" / project_slug


def content_dir(vault: Path, project_slug: str) -> Path:
    return project_dir(vault, project_slug) / "content"


def content_path(vault: Path, project_slug: str, content_id: str) -> Path:
    return content_dir(vault, project_slug) / f"{content_id}.md"


def boards_dir(vault: Path) -> Path:
    return vault / "boards"
