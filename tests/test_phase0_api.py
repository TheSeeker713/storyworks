"""Phase 0 API acceptance regression."""

from __future__ import annotations

from pathlib import Path


def test_health(api_client):
    client, _ = api_client
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["phase"] == 0


def test_connectors_shape(api_client):
    client, _ = api_client
    o = client.get("/api/connectors/ollama").json()
    assert "ok" in o
    assert "default_model" in o
    c = client.get("/api/connectors/openclaw").json()
    assert "ok" in c
    assert "installed" in c


def test_project_write_archive_delete(api_client):
    client, projects = api_client
    created = client.post("/api/projects", json={"name": "Test Novel"}).json()
    assert created["name"] == "Test Novel"
    pid = created["id"]
    slug = created["slug"]
    assert (projects / slug / ".git").is_dir()
    assert (projects / slug / "manuscript.md").is_file()

    saved = client.put(
        f"/api/projects/{pid}/document",
        json={"body": "Once upon a wireframe."},
    ).json()
    assert saved["body"] == "Once upon a wireframe."

    got = client.get(f"/api/projects/{pid}/document").json()
    assert got["body"] == "Once upon a wireframe."

    live = client.get("/api/projects").json()["projects"]
    assert any(p["id"] == pid for p in live)

    archived = client.post(f"/api/projects/{pid}/archive").json()
    assert archived["archived"] is True
    assert archived["archive_reason"] == "user"

    live2 = client.get("/api/projects").json()["projects"]
    assert all(p["id"] != pid for p in live2)

    restored = client.post(f"/api/projects/{pid}/restore").json()
    assert restored["archived"] is False

    client.post(f"/api/projects/{pid}/archive")
    bad = client.post(f"/api/projects/{pid}/delete", json={"typed_name": "Nope"})
    assert bad.status_code == 400

    # Must archive again if restore happened — already archived above
    ok = client.post(f"/api/projects/{pid}/delete", json={"typed_name": "Test Novel"})
    assert ok.status_code == 200
    assert ok.json()["ok"] is True
    assert not (projects / slug).exists()
    backups = list((projects / "backup").glob("test-novel-*"))
    assert backups, "delete should leave a backup folder"


def test_delete_requires_archive(api_client):
    client, _ = api_client
    created = client.post("/api/projects", json={"name": "Live Only"}).json()
    pid = created["id"]
    r = client.post(f"/api/projects/{pid}/delete", json={"typed_name": "Live Only"})
    assert r.status_code == 400
    assert "Archive" in r.json()["detail"]


def test_muse_suggest_shape(api_client, monkeypatch):
    client, _ = api_client

    def fake_suggest(text, *, title="", project_name=""):
        return {"ok": True, "suggestion": "Next sentence.", "model": "test"}

    monkeypatch.setattr("apps.api.app.main.muse_suggest", fake_suggest)
    r = client.post(
        "/api/muse/suggest",
        json={"text": "Hello.", "project_name": "X", "title": "Y"},
    )
    assert r.status_code == 200
    assert r.json()["suggestion"] == "Next sentence."


def test_gitignore_protects_story_paths():
    root = Path(__file__).resolve().parents[1]
    gi = (root / ".gitignore").read_text(encoding="utf-8")
    assert "projects/*" in gi
    assert "data/*" in gi or "*.sqlite" in gi
