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
    # Content writes do not create a commit per save anymore.
    store.write_content(proj["slug"], title="Doc", body="v1\n")
    hist = list_history(pdir)
    assert len(hist) >= 1  # initial project commit only
    before = len(hist)
    store.write_content(proj["slug"], content_id="manual", title="Doc2", body="v2\n")
    assert len(list_history(pdir)) == before
    store.checkpoint_project(proj["slug"], message="manual checkpoint")
    hist2 = list_history(pdir)
    assert len(hist2) == before + 1
    store.close()


def test_burst_writes_do_not_burst_commits(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    proj = store.create_project("Burst")
    slug = proj["slug"]
    pdir = store.root / "projects" / slug
    base = len(list_history(pdir))
    for i in range(12):
        store.write_content(
            slug,
            content_id="manuscript",
            type_="manuscript",
            title="Untitled draft",
            body=f"burst line {i}\n",
            dirty=True,
        )
    assert (pdir / "books" / "main" / "folders" / "main" / "content" / "manuscript.md").is_file()
    text = (pdir / "books" / "main" / "folders" / "main" / "content" / "manuscript.md").read_text(
        encoding="utf-8"
    )
    assert "burst line 11" in text
    assert len(list_history(pdir)) == base
    store.checkpoint_project(slug, message="after burst")
    assert len(list_history(pdir)) == base + 1
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
