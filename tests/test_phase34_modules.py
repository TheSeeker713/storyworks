"""Phase 3–4 module seeds + blog set-aside + notes search (tmp_path)."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app
from engine.vault.store import VaultStore


def test_module_seeds(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "v")
    n = store.create_project("N", module="notes")
    assert store.read_content(n["slug"], "note-1")["meta"]["type"] == "note"
    b = store.create_project("B", module="blog")
    meta = store.get_project_meta(b["slug"])
    assert meta["blog_stage"] == "research"
    store.patch_project_meta(b["slug"], {"set_aside": [{"id": "x", "stage": "draft", "title": "Parked"}]})
    meta2 = store.get_project_meta(b["slug"])
    assert len(meta2["set_aside"]) == 1
    sp = store.create_project("S", module="screenplay")
    assert "INT." in store.read_content(sp["slug"], "scene-1")["body"]
    store.close()


def test_search_and_codex_api(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "vault"
    client.post("/api/vault/open", json={"path": str(vault)})
    r = client.post("/api/projects", json={"name": "Notes Proj", "module": "notes"})
    assert r.status_code == 200
    slug = r.json()["slug"]
    client.post(
        f"/api/projects/{slug}/content",
        json={"id": "note-1", "type": "note", "title": "Alpha", "body": "hello #River rune", "auto_tag": True},
    )
    hits = client.get("/api/search", params={"q": "hello"}).json()["hits"]
    assert any(h["id"] == "note-1" for h in hits)
    entries = client.get(f"/api/projects/{slug}/codex").json()["entries"]
    assert any(e["title"] == "River" for e in entries)
