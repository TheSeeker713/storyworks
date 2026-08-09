"""Vault markdown-truth + SQLite cache tests."""

from __future__ import annotations

import threading
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from apps.api.app.main import app
from engine.vault.backup import backup_vault_snapshot
from engine.vault.store import VaultStore


@pytest.fixture()
def vault_dir(tmp_path: Path) -> Path:
    return tmp_path / "vault"


@pytest.fixture()
def store(vault_dir: Path) -> VaultStore:
    s = VaultStore.init_vault(vault_dir)
    yield s
    s.close()


def test_write_read_markdown_truth(store: VaultStore, vault_dir: Path):
    proj = store.create_project("Alpha Book")
    result = store.write_content(proj["slug"], title="Scene one", body="Hello vault.\n")
    assert result["ok"] is True
    path = vault_dir / result["path"]
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "Hello vault." in text
    assert "title: Scene one" in text
    again = store.read_content(proj["slug"], result["id"])
    assert again["body"].startswith("Hello vault.")


def test_external_edit_conflict_when_dirty(store: VaultStore, vault_dir: Path):
    proj = store.create_project("Conflict Proj")
    first = store.write_content(proj["slug"], title="Note", body="v1\n")
    path = vault_dir / first["path"]
    path.write_text(path.read_text(encoding="utf-8").replace("v1", "external"), encoding="utf-8")
    conflicted = store.write_content(
        proj["slug"],
        content_id=first["id"],
        title="Note",
        body="v2 local\n",
        expected_hash=first["content_hash"],
        dirty=True,
    )
    assert conflicted["ok"] is False
    assert conflicted["conflict"] is True
    assert (vault_dir / conflicted["conflict_path"]).is_file()


def test_archive_typed_delete_project(store: VaultStore):
    proj = store.create_project("Delete Me")
    with pytest.raises(PermissionError):
        store.delete_project(proj["slug"], "Delete Me")
    store.set_project_archived(proj["slug"], True)
    with pytest.raises(PermissionError):
        store.delete_project(proj["slug"], "Wrong")
    out = store.delete_project(proj["slug"], "Delete Me")
    assert out["ok"] is True
    assert store.list_projects(include_archived=True) == []


def test_backup_snapshot(store: VaultStore, vault_dir: Path):
    store.create_project("Backup Me")
    dest = backup_vault_snapshot(vault_dir, slug="test")
    assert dest.is_dir()
    assert (dest / "projects").is_dir()
    assert not (dest / ".storyworks" / "backup").exists()


def test_api_vault_flow(vault_dir: Path):
    client = TestClient(app)
    r = client.post("/api/vault/open", json={"path": str(vault_dir)})
    assert r.status_code == 200
    r = client.post("/api/projects", json={"name": "API Project"})
    assert r.status_code == 200
    slug = r.json()["slug"]
    r = client.post(
        f"/api/projects/{slug}/content",
        json={"title": "Card", "body": "from api\n", "type": "note"},
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True
    r = client.post("/api/vault/backup", params={"slug": "api"})
    assert r.status_code == 200
    assert Path(r.json()["backup"]).is_dir()


def test_index_lives_under_cache_nosync(store: VaultStore, vault_dir: Path):
    """SQLite must not sit at vault root under iCloud-synced Documents."""
    db = vault_dir / ".storyworks" / "cache.nosync" / "index.sqlite"
    assert db.is_file()
    assert not (vault_dir / ".storyworks" / "index.sqlite").exists()


def test_migrates_legacy_index_out_of_icloud_path(tmp_path: Path):
    from engine.vault.paths import index_path, legacy_index_path, migrate_legacy_index, storyworks_dir

    vault = tmp_path / "v"
    storyworks_dir(vault).mkdir(parents=True)
    legacy = legacy_index_path(vault)
    legacy.write_bytes(b"legacy-db")
    (Path(str(legacy) + "-wal")).write_bytes(b"wal")
    migrate_legacy_index(vault)
    assert index_path(vault).read_bytes() == b"legacy-db"
    assert (Path(str(index_path(vault)) + "-wal")).read_bytes() == b"wal"
    assert not legacy.exists()


def test_concurrent_writes_do_not_crash(store: VaultStore):
    """FastAPI sync routes hit the store from a threadpool; sqlite must not segfault."""
    proj = store.create_project("Race Proj")
    slug = proj["slug"]
    errors: list[BaseException] = []

    def worker(i: int) -> None:
        try:
            store.write_content(
                slug,
                content_id="manuscript" if i % 3 == 0 else f"doc-{i}",
                type_="manuscript" if i % 3 == 0 else "note",
                title="Untitled",
                body=f"line {i}\n",
                dirty=True,
            )
        except BaseException as exc:  # noqa: BLE001 — collect for assertion
            errors.append(exc)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(24)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert errors == []
    again = store.read_content(slug, "manuscript")
    assert again["id"] == "manuscript"
    listed = store.index.list_project(slug)
    assert len(listed) >= 1
