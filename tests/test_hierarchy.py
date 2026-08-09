"""Project → Book → Folder → Content hierarchy + migration."""

from __future__ import annotations

from pathlib import Path

from engine.vault.paths import DEFAULT_BOOK_ID, DEFAULT_FOLDER_ID, content_path, legacy_content_dir
from engine.vault.store import VaultStore


def test_create_project_has_default_hierarchy(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    proj = store.create_project("Hier Proj")
    slug = proj["slug"]
    path = content_path(store.root, slug, "x", book_id=DEFAULT_BOOK_ID, folder_id=DEFAULT_FOLDER_ID)
    assert path.parent.is_dir()
    books = store.list_books(slug)
    assert any(b["id"] == DEFAULT_BOOK_ID for b in books)
    folders = store.list_folders(slug, DEFAULT_BOOK_ID)
    assert any(f["id"] == DEFAULT_FOLDER_ID for f in folders)
    assert (store.root / "projects" / slug / ".git").is_dir()
    # Seeded manuscript exists immediately (zero-friction Draft path)
    seeded = store.read_content(slug, "manuscript")
    assert seeded["meta"].get("title") == "Untitled draft"
    store.close()


def test_migrate_flat_content(tmp_path: Path):
    root = tmp_path / "vault"
    store = VaultStore.init_vault(root)
    # Simulate pre-hierarchy project
    slug = "legacy"
    pdir = root / "projects" / slug
    pdir.mkdir(parents=True)
    from engine.vault.frontmatter import dump_markdown
    from engine.vault.store import atomic_write

    atomic_write(
        pdir / "project.md",
        dump_markdown({"id": slug, "type": "project", "title": "Legacy", "archived": False}, "# Legacy\n"),
    )
    legacy = legacy_content_dir(root, slug)
    legacy.mkdir()
    atomic_write(
        legacy / "abc123.md",
        dump_markdown({"id": "abc123", "type": "note", "title": "Old note"}, "legacy body\n"),
    )
    store.close()

    store2 = VaultStore.init_vault(root)
    moved_path = content_path(root, slug, "abc123")
    assert moved_path.is_file()
    data = store2.read_content(slug, "abc123")
    assert "legacy body" in data["body"]
    store2.close()


def test_write_read_under_hierarchy(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "v")
    proj = store.create_project("Write Hier")
    result = store.write_content(proj["slug"], title="Chapter", body="Hello hierarchy.\n")
    assert result["ok"] is True
    assert "books/main/folders/main/content/" in result["path"]
    again = store.read_content(proj["slug"], result["id"])
    assert again["body"].startswith("Hello hierarchy.")
    store.close()
