"""Notes auto-organization detects mentions and infers all four Codex types."""

from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app
from engine.vault.note_detection import detect_note_codex_links


def test_contextual_detection_infers_character_prop_scene_and_worldbuilding():
    text = (
        "Mara argued with the ferryman. "
        "She needs the Silver Amulet that Mara carries. "
        "Eastern Docks deserves a whole scene before the storm. "
        "The Tideborn culture has a strict mourning rule."
    )

    detected = {
        (link["name"], link["type"]) for link in detect_note_codex_links(text)
    }

    assert ("Mara", "character") in detected
    assert ("Silver Amulet", "prop") in detected
    assert ("Eastern Docks", "scene") in detected
    assert ("Tideborn", "worldbuilding") in detected


def test_typed_tags_override_inference_without_confirmation():
    detected = detect_note_codex_links(
        "#prop:Black-Key opens it. #scene:North-Tower waits. "
        "#worldbuilding:Tide-Law applies. #character:Mara"
    )
    by_name = {link["name"]: link["type"] for link in detected}
    assert by_name == {
        "Black Key": "prop",
        "North Tower": "scene",
        "Tide Law": "worldbuilding",
        "Mara": "character",
    }


def test_notes_api_persists_typed_codex_links_and_stubs(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "vault"
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200
    project = client.post(
        "/api/projects", json={"name": "Typed notes", "module": "notes"}
    ).json()

    response = client.post(
        f"/api/projects/{project['slug']}/content",
        json={
            "id": "note-typed",
            "type": "note",
            "title": "Mentions",
            "body": (
                "Mara said the Silver Amulet is a prop. "
                "Eastern Docks needs a scene. "
                "Tideborn culture has an old rule."
            ),
            "auto_tag": True,
        },
    )

    assert response.status_code == 200
    links = response.json()["codex_links"]
    assert {link["type"] for link in links} == {
        "character",
        "prop",
        "scene",
        "worldbuilding",
    }
    stored = client.get(
        f"/api/projects/{project['slug']}/content/note-typed"
    ).json()
    assert stored["meta"]["codex_links"] == links
    entries = client.get(f"/api/projects/{project['slug']}/codex").json()["entries"]
    assert {(entry["title"], entry["type"]) for entry in entries} >= {
        ("Mara", "character"),
        ("Silver Amulet", "prop"),
        ("Eastern Docks", "scene"),
        ("Tideborn", "worldbuilding"),
    }
