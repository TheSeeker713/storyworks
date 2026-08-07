"""Markdown vault source of truth + SQLite index/cache."""

from engine.vault.backup import backup_vault_snapshot
from engine.vault.store import VaultStore

__all__ = ["VaultStore", "backup_vault_snapshot"]
