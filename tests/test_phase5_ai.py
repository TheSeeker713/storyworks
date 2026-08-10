"""Phase 5 — provenance, sandbox approve gate, settings-via-agent (tmp_path only)."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.app.main import app
from engine.ai.provenance import count_words, provenance_summary


def _open(client: TestClient, vault: Path) -> None:
    assert client.post("/api/vault/open", json={"path": str(vault)}).status_code == 200


def test_provenance_survives_rewrite_and_muse_bump(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "v"
    _open(client, vault)
    p = client.post("/api/projects", json={"name": "Prov", "module": "draft"}).json()
    slug = p["slug"]
    w = client.post(
        f"/api/projects/{slug}/content",
        json={"id": "manuscript", "type": "manuscript", "title": "Untitled", "body": "one two three\n"},
    )
    assert w.status_code == 200
    assert w.json()["ok"] is True

    b = client.post(
        f"/api/projects/{slug}/content/manuscript/provenance",
        json={"muse_words": 2},
    )
    assert b.status_code == 200
    assert b.json()["provenance"]["muse_words"] == 2

    # Autosave-style rewrite must not wipe provenance.
    w2 = client.post(
        f"/api/projects/{slug}/content",
        json={
            "id": "manuscript",
            "type": "manuscript",
            "title": "Untitled",
            "body": "one two three four five\n",
        },
    )
    assert w2.status_code == 200
    g = client.get(f"/api/projects/{slug}/content/manuscript/provenance")
    assert g.status_code == 200
    summary = g.json()["summary"]
    assert summary["muse_words"] == 2
    assert summary["total_words"] == 5
    assert summary["author_words"] == 3


def test_sandbox_approve_appends_and_counts_ai_words(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "v"
    _open(client, vault)
    p = client.post("/api/projects", json={"name": "Sand", "module": "blog"}).json()
    slug = p["slug"]
    client.post(
        f"/api/projects/{slug}/content",
        json={"id": "blog-draft", "type": "blog_stage", "title": "Draft", "body": "Hello.\n"},
    )
    created = client.post(
        f"/api/projects/{slug}/ai/sandbox",
        json={"content_id": "blog-draft", "kind": "blog_review", "body": "AI line here", "title": "Review"},
    )
    assert created.status_code == 200
    draft_id = created.json()["item"]["id"]

    approved = client.post(
        f"/api/projects/{slug}/ai/sandbox/{draft_id}",
        json={"action": "approve", "mode": "append"},
    )
    assert approved.status_code == 200
    body = approved.json()["content"]["body"]
    assert "Hello." in body
    assert "AI line here" in body
    prov = approved.json()["content"]["meta"].get("provenance") or {}
    assert int(prov.get("ai_words") or 0) == count_words("AI line here")


def test_sandbox_set_aside_not_silent(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "v"
    _open(client, vault)
    p = client.post("/api/projects", json={"name": "Aside", "module": "notes"}).json()
    slug = p["slug"]
    client.post(
        f"/api/projects/{slug}/content",
        json={"id": "note-1", "type": "note", "title": "N", "body": ""},
    )
    created = client.post(
        f"/api/projects/{slug}/ai/sandbox",
        json={"content_id": "note-1", "kind": "ask_vault", "body": "maybe later"},
    )
    draft_id = created.json()["item"]["id"]
    r = client.post(
        f"/api/projects/{slug}/ai/sandbox/{draft_id}",
        json={"action": "set_aside"},
    )
    assert r.status_code == 200
    assert r.json()["item"]["status"] == "set_aside"
    listed = client.get(f"/api/projects/{slug}/ai/sandbox", params={"content_id": "note-1"})
    statuses = {i["id"]: i["status"] for i in listed.json()["items"]}
    assert statuses[draft_id] == "set_aside"


def test_settings_via_agent_kill_switch_deterministic(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "v"
    _open(client, vault)
    r = client.post("/api/ai/settings", json={"request": "turn off AI", "apply": True})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["applied"] is True
    assert body["settings"]["ai_master_enabled"] is False

    muse = client.post("/api/muse/suggest", json={"text": "Once upon a time"})
    assert muse.json().get("disabled") is True


def test_agent_tool_respects_master_off(tmp_path: Path):
    client = TestClient(app)
    vault = tmp_path / "v"
    _open(client, vault)
    client.patch("/api/vault/settings", json={"patch": {"ai_master_enabled": False}})
    r = client.post("/api/ai/agent", json={"tool": "describe", "text": "INT. ROOM - DAY"})
    assert r.status_code == 200
    assert r.json().get("disabled") is True


def test_provenance_summary_math():
    s = provenance_summary("a b c d e f", {"muse_words": 2, "ai_words": 1})
    assert s == {"total_words": 6, "author_words": 3, "muse_words": 2, "ai_words": 1}
