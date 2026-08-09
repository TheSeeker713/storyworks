"""Per-project git committer."""

from __future__ import annotations

from pathlib import Path

from engine.committer import checkpoint_project, init_project_git, list_history
from engine.vault.store import VaultStore


def test_git_init_and_history(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    proj = store.create_project("Git Proj")
    pdir = store.root / "projects" / proj["slug"]
    assert (pdir / ".git").is_dir()
    store.write_content(proj["slug"], title="Doc", body="v1\n")
    hist = list_history(pdir)
    assert len(hist) >= 1
    store.write_content(proj["slug"], content_id="manual", title="Doc2", body="v2\n")
    hist2 = list_history(pdir)
    assert len(hist2) >= len(hist)
    store.close()


def test_init_idempotent(tmp_path: Path):
    d = tmp_path / "proj"
    d.mkdir()
    a = init_project_git(d)
    b = init_project_git(d)
    assert a["ok"] and b["ok"]
    assert b.get("already") is True
    clean = checkpoint_project(d, message="noop")
    assert clean["ok"] is True
