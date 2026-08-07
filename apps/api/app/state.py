"""Process-local API state (active vault)."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from engine.vault.store import VaultStore

_vault: Optional[VaultStore] = None


def get_vault() -> VaultStore:
    if _vault is None:
        raise RuntimeError("vault not open — POST /api/vault/open first")
    return _vault


def open_vault(path: str | Path) -> VaultStore:
    global _vault
    if _vault is not None:
        _vault.close()
    _vault = VaultStore.init_vault(Path(path))
    return _vault


def close_vault() -> None:
    global _vault
    if _vault is not None:
        _vault.close()
        _vault = None
