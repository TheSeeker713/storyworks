"""Phase 8 export formats — tmp_path only."""

from __future__ import annotations

import base64
import io
import xml.etree.ElementTree as ET
from pathlib import Path

from fastapi.testclient import TestClient
from pypdf import PdfReader

from apps.api.app.main import app
from engine.export.formats import _as_fdx, _as_pdf, export_project


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


def test_fdx_preserves_fountain_screenplay_structure():
    xml = _as_fdx(
        [
            (
                "Scene 1",
                "INT. CAFÉ – NIGHT\n"
                "Rain needles the windows.\n\n"
                "MARA\n"
                "(quietly)\n"
                "You came back.\n\n"
                "CUT TO:\n"
                "EXT. HARBOR – DAWN\n"
                "Boats rock beneath a violet sky.\n",
            )
        ],
        "Tide & Memory",
    )

    root = ET.fromstring(xml)
    paragraphs = root.findall("./Content/Paragraph")
    kinds = [paragraph.attrib["Type"] for paragraph in paragraphs]
    texts = [paragraph.findtext("Text") for paragraph in paragraphs]

    assert kinds == [
        "Scene Heading",
        "Action",
        "Character",
        "Parenthetical",
        "Dialogue",
        "Transition",
        "Scene Heading",
        "Action",
    ]
    assert texts[0] == "INT. CAFÉ – NIGHT"
    assert texts[4] == "You came back."
    assert root.findtext("./TitlePage/Content/Paragraph/Text") == "Tide & Memory"


def test_pdf_is_paginated_unicode_and_does_not_truncate():
    lines = [f"Line {index}: café — 雪 and “quoted text”" for index in range(1, 451)]
    pdf_bytes = _as_pdf([("Long chapter", "\n".join(lines))], "Unicode manuscript — 雪")

    reader = PdfReader(io.BytesIO(pdf_bytes))
    extracted = "\n".join(page.extract_text() or "" for page in reader.pages)

    assert len(reader.pages) > 1
    assert "Unicode manuscript — 雪" in extracted
    assert "Line 1: café — 雪 and “quoted text”" in extracted
    assert "Line 450: café — 雪 and “quoted text”" in extracted
    assert "?" not in extracted


def test_pdf_api_returns_decodable_complete_document(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "v"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    project = client.post(
        "/api/projects", json={"name": "Unicode PDF", "module": "novel"}
    ).json()
    content = "\n".join(f"Paragraph {index} — naïve café" for index in range(1, 260))
    assert client.post(
        f"/api/projects/{project['slug']}/content",
        json={
            "id": "chapter-unicode",
            "type": "chapter",
            "title": "雪",
            "body": content,
        },
    ).status_code == 200

    response = client.post(f"/api/projects/{project['slug']}/export?format=pdf")
    assert response.status_code == 200
    reader = PdfReader(io.BytesIO(base64.b64decode(response.json()["content"])))
    extracted = "\n".join(page.extract_text() or "" for page in reader.pages)
    assert len(reader.pages) > 1
    assert "Paragraph 259 — naïve café" in extracted
