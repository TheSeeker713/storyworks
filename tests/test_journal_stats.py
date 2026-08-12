"""Journal streaks and entry metadata are derived locally."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app
from engine.vault.journal_memory import build_journal_stats
from engine.vault.store import VaultStore


def test_journal_metadata_is_logged_and_preserved_on_rewrite(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    project = store.create_project("Metadata fixture", module="draft")
    slug = project["slug"]

    store.write_content(
        slug,
        content_id="journal-a",
        type_="journal_entry",
        title="08/10/2026",
        body="One two three four.",
        entry_date="2026-08-10",
        entry_time="06:45:12-06:00",
    )
    first = store.read_content(slug, "journal-a")["meta"]
    assert first["entry_date"] == "2026-08-10"
    assert first["entry_time"] == "06:45:12-06:00"
    assert first["word_count"] == 4

    store.write_content(
        slug,
        content_id="journal-a",
        type_="journal_entry",
        title="08/10/2026",
        body="Now only three.",
    )
    rewritten = store.read_content(slug, "journal-a")["meta"]
    assert rewritten["entry_date"] == "2026-08-10"
    assert rewritten["entry_time"] == "06:45:12-06:00"
    assert rewritten["word_count"] == 3
    store.close()


def test_stats_api_counts_entries_and_consecutive_written_days(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    project = client.post(
        "/api/projects", json={"name": "Streak fixture", "module": "draft"}
    ).json()
    slug = project["slug"]

    for day in (8, 9, 10):
        response = client.post(
            f"/api/projects/{slug}/content",
            json={
                "id": f"entry-{day}",
                "type": "journal_entry",
                "title": f"08/{day:02d}/2026",
                "body": f"Words written on day {day}.",
                "entry_date": f"2026-08-{day:02d}",
                "entry_time": "07:30:00-06:00",
                "word_count": 999,
            },
        )
        assert response.status_code == 200
        assert response.json()["meta"]["word_count"] == 5

    payload = client.get(
        f"/api/projects/{slug}/journal/stats",
        params={"book_id": "main", "as_of": "2026-08-11"},
    ).json()

    assert payload["entry_count"] == 3
    assert payload["current_streak"] == 3
    assert payload["total_words"] == 15
    assert {entry["date"] for entry in payload["entries"]} == {
        "2026-08-08",
        "2026-08-09",
        "2026-08-10",
    }

    store = VaultStore.init_vault(vault)
    direct = build_journal_stats(store, slug, as_of=date(2026, 8, 11))
    assert direct["current_streak"] == 3
    store.close()
