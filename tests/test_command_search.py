"""Cmd+K grouped project, Codex, and writing search."""

from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app


def test_command_search_returns_grouped_jump_targets(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    project = client.post(
        "/api/projects", json={"name": "Harbor Story", "module": "novel"}
    ).json()
    assert client.post(
        f"/api/projects/{project['slug']}/content",
        json={
            "id": "harbor-chapter",
            "type": "chapter",
            "title": "Storm chapter",
            "body": "The lantern burned above the harbor.",
        },
    ).status_code == 200
    codex = client.post(
        f"/api/projects/{project['slug']}/codex",
        json={
            "type": "character",
            "name": "Mara Venn",
            "description": "Harbor pilot",
        },
    ).json()

    project_result = client.get("/api/command/search", params={"q": "Harbor"}).json()
    assert any(row["slug"] == project["slug"] for row in project_result["projects"])
    assert any(row["id"] == "harbor-chapter" for row in project_result["writing"])

    codex_result = client.get("/api/command/search", params={"q": "Mara"}).json()
    hit = next(row for row in codex_result["codex"] if row["id"] == codex["id"])
    assert hit["project_slug"] == project["slug"]
    assert hit["project_name"] == "Harbor Story"
    assert hit["type"] == "character"


def test_command_search_empty_query_has_empty_groups(tmp_path: Path):
    client = TestClient(app)
    assert client.post(
        "/api/vault/open", json={"path": str(tmp_path / "vault")}
    ).status_code == 200
    response = client.get("/api/command/search", params={"q": ""})
    assert response.status_code == 200
    assert response.json() == {"projects": [], "codex": [], "writing": []}
