"""Appearance settings and daily skin helpers."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from apps.api.app.main import app
from engine.vault.skins import today_skin
from engine.vault.store import VaultStore


@pytest.fixture()
def vault_dir(tmp_path: Path) -> Path:
    return tmp_path / "vault"


@pytest.fixture()
def store(vault_dir: Path) -> VaultStore:
    s = VaultStore.init_vault(vault_dir)
    yield s
    s.close()


def test_new_vault_defaults_include_skins_and_tray(store: VaultStore):
    settings = store.settings()
    assert settings["daily_skins_enabled"] is False
    assert settings["tray_edge"] == "left"


def test_existing_vault_gains_appearance_defaults(tmp_path: Path):
    root = tmp_path / "legacy"
    root.mkdir()
    sw = root / ".storyworks"
    sw.mkdir()
    (sw / "settings.json").write_text(
        json.dumps({"ai_master_enabled": True, "muse_enabled": False}),
        encoding="utf-8",
    )
    store = VaultStore.init_vault(root)
    try:
        settings = store.settings()
        assert settings["daily_skins_enabled"] is False
        assert settings["tray_edge"] == "left"
        assert settings["muse_enabled"] is False
    finally:
        store.close()


def test_tray_edge_validation(store: VaultStore):
    ok = store.save_settings({"tray_edge": "right", "daily_skins_enabled": True})
    assert ok["tray_edge"] == "right"
    assert ok["daily_skins_enabled"] is True
    with pytest.raises(ValueError, match="tray_edge"):
        store.save_settings({"tray_edge": "top"})
    with pytest.raises(ValueError, match="daily_skins_enabled"):
        store.save_settings({"daily_skins_enabled": "yes"})


def test_today_skin_rotates_when_assets_exist(tmp_path: Path):
    skins = tmp_path / "assets" / "skins"
    skins.mkdir(parents=True)
    (skins / "a.jpg").write_bytes(b"a")
    (skins / "b.jpg").write_bytes(b"b")
    first = today_skin(tmp_path, as_of=date(2026, 1, 1))
    second = today_skin(tmp_path, as_of=date(2026, 1, 2))
    assert first["available"] is True
    assert second["available"] is True
    assert first["filename"] != second["filename"]


def test_skins_today_endpoint_without_assets(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("engine.vault.skins.skins_dir", lambda _root=None: tmp_path / "missing")
    client = TestClient(app)
    response = client.get("/api/skins/today")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["available"] is False
