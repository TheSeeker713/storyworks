"""OpenClaw three-role connector — fail-closed degradation."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app
from engine.connectors import openclaw as openclaw_mod
from engine.vault.store import VaultStore


def test_openclaw_defaults_off(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    try:
        settings = store.settings()
        assert settings["openclaw"] == {
            "research": False,
            "git": False,
            "agentic": False,
        }
    finally:
        store.close()


def test_openclaw_health_missing_binary_is_fail_closed(monkeypatch):
    monkeypatch.setattr(openclaw_mod.shutil, "which", lambda _name: None)
    health = openclaw_mod.openclaw_health(
        {"openclaw": {"research": True, "git": False, "agentic": False}}
    )
    assert health["available"] is False
    assert health["ok"] is False
    assert health["role_status"]["research"]["enabled"] is True
    assert health["role_status"]["research"]["available"] is False
    assert "PATH" in (health["role_status"]["research"]["error"] or "")


def test_openclaw_role_run_fail_closed_when_disabled(monkeypatch):
    monkeypatch.setattr(openclaw_mod.shutil, "which", lambda _name: "/usr/bin/openclaw")
    monkeypatch.setattr(
        openclaw_mod,
        "_probe_binary",
        lambda _path: {"ok": True, "version": "test", "error": None},
    )
    result = openclaw_mod.run_openclaw_role(
        "research",
        settings={"openclaw": {"research": False, "git": False, "agentic": False}},
    )
    assert result["ok"] is False
    assert result["unavailable"] is True
    assert "disabled" in (result["error"] or "") or "off" in (result["error"] or "")


def test_openclaw_role_run_visible_unavailable_when_enabled(monkeypatch):
    monkeypatch.setattr(openclaw_mod.shutil, "which", lambda _name: "/usr/bin/openclaw")
    monkeypatch.setattr(
        openclaw_mod,
        "_probe_binary",
        lambda _path: {"ok": True, "version": "test", "error": None},
    )
    result = openclaw_mod.run_openclaw_role(
        "git",
        settings={"openclaw": {"research": False, "git": True, "agentic": False}},
    )
    assert result["ok"] is False
    assert result["unavailable"] is True
    assert result["role"] == "git"
    assert result["error"]


def test_openclaw_settings_deep_merge_and_api(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(openclaw_mod.shutil, "which", lambda _name: None)
    client = TestClient(app)
    vault = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    patched = client.patch(
        "/api/vault/settings",
        json={"patch": {"openclaw": {"research": True}}},
    )
    assert patched.status_code == 200
    body = patched.json()
    assert body["openclaw"]["research"] is True
    assert body["openclaw"]["git"] is False
    assert body["openclaw"]["agentic"] is False

    health = client.get("/api/connectors/openclaw").json()
    assert health["roles"]["research"] is True
    assert health["role_status"]["research"]["enabled"] is True
    assert health["role_status"]["research"]["available"] is False

    run = client.post(
        "/api/connectors/openclaw/run",
        json={"role": "research"},
    ).json()
    assert run["ok"] is False
    assert run["unavailable"] is True
