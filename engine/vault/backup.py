"""Continuous backup snapshots under {vault}/.storyworks/backup/."""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path

from engine.vault.paths import backup_root, storyworks_dir


def backup_vault_snapshot(vault: Path, slug: str = "vault") -> Path:
    """Copy vault contents (except nested .storyworks/backup) to a timestamped folder."""
    vault = vault.resolve()
    if not vault.is_dir():
        raise FileNotFoundError(f"vault not found: {vault}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest = backup_root(vault) / f"{slug}-{stamp}"
    dest.mkdir(parents=True, exist_ok=False)

    skip_backup = backup_root(vault).resolve()

    for child in vault.iterdir():
        if child.name == ".storyworks":
            # Copy .storyworks but not its backup/ tree
            sw_dest = dest / ".storyworks"
            sw_dest.mkdir(parents=True, exist_ok=True)
            for sw_child in storyworks_dir(vault).iterdir():
                if sw_child.resolve() == skip_backup or sw_child.name == "backup":
                    continue
                target = sw_dest / sw_child.name
                if sw_child.is_dir():
                    shutil.copytree(sw_child, target)
                else:
                    shutil.copy2(sw_child, target)
            continue
        target = dest / child.name
        if child.is_dir():
            shutil.copytree(child, target)
        else:
            shutil.copy2(child, target)

    return dest
