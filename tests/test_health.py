"""Scaffold health checks for Storyworks v2 API."""

from __future__ import annotations

from fastapi.testclient import TestClient

from apps.api.app.main import app

client = TestClient(app)


def test_health_ok():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["service"] == "storyworks-api"
    assert body["stack"] == "v2"
    assert "vault_open" in body
