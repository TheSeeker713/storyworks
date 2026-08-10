"""Public API safety gate for incomplete Private Journal UX."""

from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app


def test_api_rejects_new_private_books_until_touch_id_is_complete(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    project = client.post(
        "/api/projects", json={"name": "Journal safety", "module": "journal"}
    ).json()

    response = client.post(
        f"/api/projects/{project['slug']}/journal/books",
        json={"title": "Private thoughts", "privacy": "private", "password": "secret1"},
    )

    assert response.status_code == 503
    assert "temporarily unavailable" in response.json()["detail"]
    assert all(book["title"] != "Private thoughts" for book in client.get(
        f"/api/projects/{project['slug']}/books"
    ).json()["books"])


def test_api_still_allows_public_journal_books(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    project = client.post(
        "/api/projects", json={"name": "Public journal", "module": "journal"}
    ).json()

    response = client.post(
        f"/api/projects/{project['slug']}/journal/books",
        json={"title": "Travel log", "privacy": "public"},
    )

    assert response.status_code == 200
    assert response.json()["privacy"] == "public"
