"""Board load/save must not 500 on corrupt JSON; projects isolate board files."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app

client = TestClient(app)


def test_corrupt_board_get_returns_empty_not_500(tmp_path: Path):
    vault = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    boards = vault / "boards"
    boards.mkdir(parents=True, exist_ok=True)
    (boards / "board-broken.json").write_text("{not-json", encoding="utf-8")
    r = client.get("/api/boards/board-broken")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("empty") is True
    assert body.get("corrupt") is True


def test_board_put_get_roundtrip_per_project(tmp_path: Path):
    vault = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    a = client.post("/api/projects", json={"name": "Alpha"}).json()["slug"]
    b = client.post("/api/projects", json={"name": "Beta"}).json()["slug"]
    snap_a = {"document": {"store": {"shape:a": {"id": "shape:a"}}, "schema": {}}, "session": {}}
    snap_b = {"document": {"store": {"shape:b": {"id": "shape:b"}}, "schema": {}}, "session": {}}
    assert client.put(f"/api/boards/board-{a}", json={"document": snap_a}).status_code == 200
    assert client.put(f"/api/boards/board-{b}", json={"document": snap_b}).status_code == 200
    got_a = client.get(f"/api/boards/board-{a}").json()
    got_b = client.get(f"/api/boards/board-{b}").json()
    assert "shape:a" in got_a["document"]["store"]
    assert "shape:b" in got_b["document"]["store"]
    assert "shape:a" not in got_b["document"]["store"]
    assert (vault / "boards" / f"board-{a}.json").is_file()
    assert (vault / "boards" / f"board-{b}.json").is_file()
