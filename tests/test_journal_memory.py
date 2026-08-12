"""Journal callbacks are local and grounded in real prior entries."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app
from engine.vault.journal_memory import build_journal_memory
from engine.vault.store import VaultStore


def test_on_this_day_prefers_anniversary_and_quotes_the_entry(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    project = store.create_project("Morning Pages", module="journal")
    slug = project["slug"]
    store.write_content(
        slug,
        content_id="anniversary",
        type_="journal_entry",
        title="08/11/2024",
        body="I finally sent the lighthouse chapter to Mara. My hands shook after I pressed send.",
    )
    store.write_content(
        slug,
        content_id="recent",
        type_="journal_entry",
        title="08/10/2026",
        body="This is newer, but it is not an anniversary entry.",
    )

    result = build_journal_memory(
        store,
        slug,
        active_content_id="entry-1",
        as_of=date(2026, 8, 11),
    )

    assert result["kind"] == "on_this_day"
    assert result["memory"]["id"] == "anniversary"
    assert result["memory"]["excerpt"] == "I finally sent the lighthouse chapter to Mara."
    assert "I finally sent the lighthouse chapter to Mara." in result["question"]
    assert "2 years ago" in result["question"]
    store.close()


def test_journal_memory_api_falls_back_to_real_recent_entry(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    project = client.post(
        "/api/projects", json={"name": "Journal memory", "module": "journal"}
    ).json()
    slug = project["slug"]
    response = client.post(
        f"/api/projects/{slug}/content",
        json={
            "id": "yesterday",
            "type": "journal_entry",
            "title": "08/10/2026",
            "body": "The ferry horn woke me before sunrise, and I felt ready to work.",
            "book_id": "main",
        },
    )
    assert response.status_code == 200

    memory = client.get(
        f"/api/projects/{slug}/journal/memory",
        params={
            "book_id": "main",
            "active_content_id": "entry-1",
            "as_of": "2026-08-11",
        },
    )

    assert memory.status_code == 200
    payload = memory.json()
    assert payload["kind"] == "recent_memory"
    assert payload["memory"]["body"].startswith("The ferry horn woke me")
    assert "The ferry horn woke me before sunrise" in payload["question"]
