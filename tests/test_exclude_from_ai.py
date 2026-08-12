"""Per-entry Exclude from AI — Journal and Notes."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app
from engine.vault.journal_memory import build_journal_memory
from engine.vault.store import VaultStore


def test_exclude_from_ai_survives_autosave(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    try:
        proj = store.create_project("Notes")
        first = store.write_content(
            proj["slug"],
            title="Secret note",
            body="Character Alice walked home.",
            type_="note",
            exclude_from_ai=True,
        )
        assert first["meta"]["exclude_from_ai"] is True
        second = store.write_content(
            proj["slug"],
            content_id=first["id"],
            title="Secret note",
            body="Character Alice walked home again.",
            type_="note",
            expected_hash=first["content_hash"],
        )
        assert second["ok"] is True
        assert second["meta"]["exclude_from_ai"] is True
    finally:
        store.close()


def test_journal_memory_skips_excluded_entry(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    try:
        proj = store.create_project("Journal")
        store.write_content(
            proj["slug"],
            title="08/11/2024",
            body="The lighthouse kept its watch.",
            type_="journal_entry",
            exclude_from_ai=True,
        )
        store.write_content(
            proj["slug"],
            title="08/10/2025",
            body="Yesterday the ferry horn sounded twice.",
            type_="journal_entry",
        )
        memory = build_journal_memory(
            store,
            proj["slug"],
            book_id="main",
            as_of=date(2026, 8, 11),
        )
        assert memory["kind"] == "recent_memory"
        assert "ferry horn" in (memory["question"] or "")
        assert "lighthouse" not in (memory["question"] or "")
    finally:
        store.close()


def test_ask_vault_search_skips_excluded_but_human_search_keeps_it(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    try:
        proj = store.create_project("Notes")
        store.write_content(
            proj["slug"],
            title="Hidden vault line",
            body="The zebra whispered a password.",
            type_="note",
            exclude_from_ai=True,
        )
        store.write_content(
            proj["slug"],
            title="Open vault line",
            body="The zebra crossed at noon.",
            type_="note",
        )
        human = store.search_vault("zebra", for_ai=False)
        ai = store.search_vault("zebra", for_ai=True)
        assert any(hit["title"] == "Hidden vault line" for hit in human)
        assert all(hit["title"] != "Hidden vault line" for hit in ai)
        assert any(hit["title"] == "Open vault line" for hit in ai)
    finally:
        store.close()


def test_auto_tag_skipped_when_excluded(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    project = client.post(
        "/api/projects", json={"name": "Private notes", "module": "notes"}
    ).json()
    created = client.post(
        f"/api/projects/{project['slug']}/content",
        json={
            "id": "note-private",
            "type": "note",
            "title": "Private note",
            "body": "Character Mira opened the door.",
            "exclude_from_ai": True,
            "auto_tag": True,
        },
    )
    assert created.status_code == 200
    body = created.json()
    assert body["ok"] is True
    assert body.get("auto_tags") == []
    assert body["meta"]["exclude_from_ai"] is True
    assert not body["meta"].get("codex_links")
