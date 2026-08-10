"""Paragraph timestamp metadata for Notes and Journal (tmp_path only)."""

from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app


def test_paragraph_timestamps_persist_and_survive_legacy_writes(tmp_path: Path):
    client = TestClient(app)
    root = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(root)}).status_code == 200
    project = client.post(
        "/api/projects", json={"name": "Timestamp notes", "module": "notes"}
    ).json()
    timestamps = ["2026-08-10T19:00:00.000Z", "2026-08-10T19:01:00.000Z"]

    written = client.post(
        f"/api/projects/{project['slug']}/content",
        json={
            "id": "timestamped-note",
            "type": "note",
            "title": "Timestamped note",
            "body": "First paragraph\nSecond paragraph",
            "paragraph_timestamps": timestamps,
        },
    )
    assert written.status_code == 200
    assert written.json()["meta"]["paragraph_timestamps"] == timestamps

    # A caller that predates the timestamp field must not erase existing data.
    rewritten = client.post(
        f"/api/projects/{project['slug']}/content",
        json={
            "id": "timestamped-note",
            "type": "note",
            "title": "Timestamped note",
            "body": "First paragraph edited\nSecond paragraph",
        },
    )
    assert rewritten.status_code == 200
    assert rewritten.json()["meta"]["paragraph_timestamps"] == timestamps


def test_journal_entries_accept_independent_timestamp_per_paragraph(tmp_path: Path):
    client = TestClient(app)
    root = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(root)}).status_code == 200
    project = client.post(
        "/api/projects", json={"name": "Timestamp journal", "module": "journal"}
    ).json()
    timestamps = [
        "2026-08-10T20:00:00.000Z",
        "2026-08-10T20:03:42.000Z",
        "2026-08-10T20:07:09.000Z",
    ]

    response = client.post(
        f"/api/projects/{project['slug']}/content",
        json={
            "id": "entry-timestamps",
            "type": "journal_entry",
            "title": "08/10/2026",
            "body": "One\nTwo\nThree",
            "paragraph_timestamps": timestamps,
        },
    )

    assert response.status_code == 200
    assert response.json()["meta"]["paragraph_timestamps"] == timestamps
