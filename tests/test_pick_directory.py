"""Vault folder picker API (osascript mocked — no live dialog in CI)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from apps.api.app.main import app

client = TestClient(app)


def test_pick_directory_returns_path(monkeypatch):
    monkeypatch.setattr(
        "engine.vault.pick.pick_folder_macos",
        lambda prompt="Choose your Storyworks vault folder": {
            "ok": True,
            "path": "/Users/test/StoryworksVault",
            "cancelled": False,
        },
    )
    r = client.post("/api/vault/pick-directory")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["path"] == "/Users/test/StoryworksVault"
    assert body["cancelled"] is False


def test_pick_directory_cancelled(monkeypatch):
    monkeypatch.setattr(
        "engine.vault.pick.pick_folder_macos",
        lambda prompt="Choose your Storyworks vault folder": {
            "ok": False,
            "cancelled": True,
            "error": "User canceled.",
        },
    )
    r = client.post("/api/vault/pick-directory")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False
    assert body["cancelled"] is True


def test_pick_folder_macos_parses_osascript(monkeypatch):
    from engine.vault import pick as pick_mod

    class FakeCompleted:
        returncode = 0
        stdout = "/Users/jeremy/Documents/Vault/\n"
        stderr = ""

    monkeypatch.setattr(
        pick_mod.subprocess,
        "run",
        lambda *a, **k: FakeCompleted(),
    )
    result = pick_mod.pick_folder_macos()
    assert result["ok"] is True
    assert result["path"] == "/Users/jeremy/Documents/Vault"
