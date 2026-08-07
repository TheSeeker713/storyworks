"""Muse respects AI master kill switch."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app


def test_muse_disabled_when_master_off(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "v"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    assert (
        client.patch("/api/vault/settings", json={"patch": {"ai_master_enabled": False}}).status_code
        == 200
    )
    r = client.post("/api/muse/suggest", json={"text": "Once upon a time"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False
    assert body.get("disabled") is True
