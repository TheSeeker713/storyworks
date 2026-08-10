"""Rename surfaces and date/time defaults (tmp_path only)."""

import re
from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app
DATED = re.compile(r"\d{4}-\d{2}-\d{2}-\d{6}")


def _open(client: TestClient, root: Path) -> None:
    assert client.post("/api/vault/open", json={"path": str(root)}).status_code == 200


def test_empty_project_uses_dated_project_and_content_identifiers(tmp_path: Path):
    client = TestClient(app)
    root = tmp_path / "vault"
    _open(client, root)

    project = client.post("/api/projects", json={"name": "", "module": "draft"}).json()
    assert project["name"].startswith("Draft ")
    assert DATED.search(project["name"])
    assert "untitled" not in project["slug"]

    content = client.get(f"/api/projects/{project['slug']}/content").json()["content"]
    assert len(content) == 1
    assert content[0]["id"].startswith("draft-")
    assert DATED.search(content[0]["id"])
    assert DATED.search(content[0]["title"])
    assert "untitled" not in content[0]["title"].lower()
    path = root / content[0]["path"]
    assert path.name == f"{content[0]['id']}.md"


def test_project_and_content_rename_keep_stable_ids_and_paths(tmp_path: Path):
    client = TestClient(app)
    root = tmp_path / "vault"
    _open(client, root)
    project = client.post("/api/projects", json={"name": "", "module": "draft"}).json()
    slug = project["slug"]
    row = client.get(f"/api/projects/{slug}/content").json()["content"][0]
    original_path = row["path"]

    renamed_project = client.patch(
        f"/api/projects/{slug}/rename", json={"name": "The Harbor Book"}
    )
    assert renamed_project.status_code == 200
    assert renamed_project.json()["slug"] == slug
    assert renamed_project.json()["name"] == "The Harbor Book"

    renamed_content = client.patch(
        f"/api/projects/{slug}/content/{row['id']}/rename",
        json={"name": "Opening tide"},
    )
    assert renamed_content.status_code == 200
    assert renamed_content.json()["id"] == row["id"]
    assert renamed_content.json()["path"] == original_path
    assert renamed_content.json()["meta"]["title"] == "Opening tide"


def test_codex_rename_is_available_through_existing_patch_api(tmp_path: Path):
    client = TestClient(app)
    root = tmp_path / "vault"
    _open(client, root)
    project = client.post(
        "/api/projects", json={"name": "Codex rename", "module": "novel"}
    ).json()
    entry = client.post(
        f"/api/projects/{project['slug']}/codex",
        json={"type": "character", "name": "Mara", "description": ""},
    ).json()

    renamed = client.patch(
        f"/api/projects/{project['slug']}/codex/character/{entry['id']}",
        json={"name": "Mara Venn"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "Mara Venn"
