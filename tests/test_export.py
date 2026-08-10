"""Phase 8 export formats — tmp_path only."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app
from engine.export.formats import export_project


def test_export_fountain_and_epub_via_api(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "v"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    p = client.post("/api/projects", json={"name": "Export Me", "module": "screenplay"}).json()
    slug = p["slug"]
    client.post(
        f"/api/projects/{slug}/content",
        json={
            "id": "sc-1",
            "type": "screenplay_scene",
            "title": "INT. LAB - NIGHT",
            "body": "A writer types.\n",
        },
    )

    fountain = client.post(f"/api/projects/{slug}/export?format=fountain")
    assert fountain.status_code == 200
    body = fountain.json()
    assert body["ok"] is True
    assert "INT. LAB" in body["content"] or "A writer types" in body["content"]
    assert body["filename"].endswith(".fountain")

    epub = client.post(f"/api/projects/{slug}/export?format=epub")
    assert epub.status_code == 200
    assert epub.json()["encoding"] == "base64"
    assert len(epub.json()["content"]) > 20

    pdf = client.post(f"/api/projects/{slug}/export?format=pdf")
    assert pdf.status_code == 200
    assert pdf.json()["format"] == "pdf"

    fdx = client.post(f"/api/projects/{slug}/export?format=fdx")
    assert fdx.status_code == 200
    assert "FinalDraft" in fdx.json()["content"]


def test_export_project_markdown_unit(tmp_path: Path):
    from engine.vault.store import VaultStore

    root = tmp_path / "vault"
    store = VaultStore.init_vault(root)
    row = store.create_project("Unit Export", module="novel")
    pdir = root / "projects" / row["slug"]
    result = export_project(pdir, "markdown")
    assert result["ok"]
    assert "# " in result["content"]
