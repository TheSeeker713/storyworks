"""Codex entries + spoiler-safe progressions (tmp_path only)."""

from __future__ import annotations

from pathlib import Path

from engine.vault import codex as cx
from engine.vault.store import VaultStore


def test_codex_crud_and_suggested_order(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    proj = store.create_project("Novel One", module="novel")
    pdir = store.root / "projects" / proj["slug"]
    entry = cx.create_entry(pdir, type_="character", name="Ava", description="Lead")
    assert entry["title"] == "Ava"
    assert entry["fields"].get("role") == ""
    listed = cx.list_entries(pdir)
    assert any(e["id"] == entry["id"] for e in listed)
    assert list(cx.SUGGESTED_ORDER)[0] == "character"
    store.close()


def test_progression_spoiler_filter(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    proj = store.create_project("SP", module="screenplay")
    pdir = store.root / "projects" / proj["slug"]
    entry = cx.create_entry(pdir, type_="character", name="Bo")
    cx.add_progression(
        pdir,
        "character",
        entry["id"],
        mode="addition",
        manuscript_point="Ch1",
        text="meets ally",
        ordinal=1,
    )
    cx.add_progression(
        pdir,
        "character",
        entry["id"],
        mode="replacement",
        manuscript_point="Ch9",
        text="betrayal — AI must not see early",
        ordinal=9,
    )
    early = cx.progressions_for_ai(pdir, "character", entry["id"], story_ordinal=2)
    assert len(early) == 1
    assert early[0]["text"] == "meets ally"
    late = cx.progressions_for_ai(pdir, "character", entry["id"], story_ordinal=9)
    assert len(late) == 2
    store.close()


def test_create_novel_seeds_chapter_scenes(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    proj = store.create_project("My Novel", module="novel")
    scenes = store.get_content_scenes(proj["slug"], "chapter-1")
    assert scenes and scenes[0]["id"] == "opening"
    body = store.read_content(proj["slug"], "chapter-1")["body"]
    assert "<!--scene:opening-->" in body
    store.close()
