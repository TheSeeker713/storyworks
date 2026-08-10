"""Storyworks API — v2 rebuild."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from apps.api.app import state
from engine.vault.backup import backup_vault_snapshot

app = FastAPI(title="Storyworks API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    vault_open = False
    try:
        state.get_vault()
        vault_open = True
    except RuntimeError:
        pass
    return {
        "ok": True,
        "service": "storyworks-api",
        "phase": "2",
        "stack": "v2",
        "vault_open": vault_open,
    }


@app.get("/api/connectors/ollama")
def connector_ollama():
    from engine.connectors.ollama import ollama_health

    return ollama_health()


@app.get("/api/connectors/openclaw")
def connector_openclaw():
    from engine.connectors.openclaw import openclaw_health

    return openclaw_health()


@app.get("/api/connectors/stt")
def connector_stt():
    from engine.connectors.stt import stt_status

    return stt_status()


class TranscribeIn(BaseModel):
    path: str = Field(min_length=1)


@app.post("/api/stt/transcribe")
def stt_transcribe(body: TranscribeIn):
    from engine.connectors.stt import transcribe_file

    result = transcribe_file(body.path)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error") or "stt failed")
    return result


class MuseIn(BaseModel):
    text: str = ""
    title: str = ""
    project_name: str = ""


@app.post("/api/muse/suggest")
def muse_suggest(body: MuseIn):
    try:
        store = state.get_vault()
        settings = store.settings()
    except RuntimeError:
        settings = {"ai_master_enabled": True, "muse_enabled": True}

    if not settings.get("ai_master_enabled", True):
        return {"ok": False, "error": "AI master switch is off", "disabled": True}
    if not settings.get("muse_enabled", True):
        return {"ok": False, "error": "Muse is off", "disabled": True}

    from engine.muse import muse_suggest as _muse

    return _muse(body.text, title=body.title, project_name=body.project_name)


class OpenVaultIn(BaseModel):
    path: str = Field(min_length=1)


@app.post("/api/vault/open")
def vault_open(body: OpenVaultIn):
    p = Path(body.path).expanduser()
    if not p.exists():
        p.mkdir(parents=True, exist_ok=True)
    if not p.is_dir():
        raise HTTPException(400, "path must be a directory")
    store = state.open_vault(p)
    return {"ok": True, "path": str(store.root), "indexed": store.reindex()}


@app.post("/api/vault/pick-directory")
def vault_pick_directory():
    """Native macOS Choose Folder dialog. Blocks until the user picks or cancels."""
    from engine.vault.pick import pick_folder_macos

    result = pick_folder_macos()
    if result.get("cancelled"):
        return {"ok": False, "cancelled": True, "path": None}
    if not result.get("ok"):
        raise HTTPException(400, result.get("error") or "folder picker failed")
    return {"ok": True, "cancelled": False, "path": result["path"]}


@app.get("/api/vault")
def vault_info():
    try:
        store = state.get_vault()
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"ok": True, "path": str(store.root), "settings": store.settings()}


@app.post("/api/vault/backup")
def vault_backup(slug: str = "manual"):
    try:
        store = state.get_vault()
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    dest = backup_vault_snapshot(store.root, slug=slug)
    return {"ok": True, "backup": str(dest)}


class SettingsIn(BaseModel):
    patch: dict[str, Any]


@app.patch("/api/vault/settings")
def vault_settings(body: SettingsIn):
    try:
        store = state.get_vault()
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    return store.save_settings(body.patch)


class CreateProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)


@app.get("/api/projects")
def projects_list(archived: bool = False):
    try:
        store = state.get_vault()
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"projects": store.list_projects(include_archived=archived)}


@app.post("/api/projects")
def projects_create(body: CreateProjectIn):
    try:
        store = state.get_vault()
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    return store.create_project(body.name)


@app.post("/api/projects/{slug}/archive")
def projects_archive(slug: str):
    try:
        store = state.get_vault()
        return store.set_project_archived(slug, True)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/projects/{slug}/restore")
def projects_restore(slug: str):
    try:
        store = state.get_vault()
        return store.set_project_archived(slug, False)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


class DeleteProjectIn(BaseModel):
    typed_name: str


@app.post("/api/projects/{slug}/delete")
def projects_delete(slug: str, body: DeleteProjectIn):
    try:
        store = state.get_vault()
        return store.delete_project(slug, body.typed_name)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


class WriteContentIn(BaseModel):
    id: Optional[str] = None
    type: str = "note"
    title: str = ""
    subject: str = ""
    body: str = ""
    parent: str = ""
    book_id: str = "main"
    folder_id: str = "main"
    canvas: Optional[dict[str, Any]] = None
    expected_hash: Optional[str] = None
    dirty: bool = False


@app.get("/api/projects/{slug}/books")
def books_list(slug: str):
    try:
        store = state.get_vault()
        return {"books": store.list_books(slug)}
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/projects/{slug}/books/{book_id}/folders")
def folders_list(slug: str, book_id: str):
    try:
        store = state.get_vault()
        return {"folders": store.list_folders(slug, book_id)}
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/projects/{slug}/history")
def project_history(slug: str, limit: int = 50):
    try:
        store = state.get_vault()
        from engine.committer import list_history
        from engine.vault.paths import project_dir

        return {"history": list_history(project_dir(store.root, slug), limit=limit)}
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/projects/{slug}/checkpoint")
def project_checkpoint(slug: str, message: str = "autosave"):
    """Coarse per-project git snapshot (idle / blur / History) — not every content write."""
    try:
        store = state.get_vault()
        return store.checkpoint_project(slug, message=message or "autosave")
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(500, f"checkpoint failed: {type(exc).__name__}: {exc}") from exc


@app.get("/api/projects/{slug}/content")
def content_list(slug: str, archived: bool = False):
    try:
        store = state.get_vault()
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"content": store.index.list_project(slug, include_archived=archived)}


@app.post("/api/projects/{slug}/content")
def content_write(slug: str, body: WriteContentIn):
    try:
        store = state.get_vault()
        return store.write_content(
            slug,
            content_id=body.id,
            type_=body.type,
            title=body.title,
            subject=body.subject,
            body=body.body,
            parent=body.parent,
            book_id=body.book_id,
            folder_id=body.folder_id,
            canvas=body.canvas,
            expected_hash=body.expected_hash,
            dirty=body.dirty,
        )
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        # Surface real cause (sqlite races used to segfault the worker → opaque 500).
        raise HTTPException(500, f"content write failed: {type(exc).__name__}: {exc}") from exc


@app.get("/api/projects/{slug}/content/{content_id}")
def content_read(slug: str, content_id: str):
    try:
        store = state.get_vault()
        return store.read_content(slug, content_id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/projects/{slug}/content/{content_id}/archive")
def content_archive(slug: str, content_id: str):
    try:
        store = state.get_vault()
        return store.set_content_archived(slug, content_id, True)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/projects/{slug}/content/{content_id}/restore")
def content_restore(slug: str, content_id: str):
    try:
        store = state.get_vault()
        return store.set_content_archived(slug, content_id, False)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


class DeleteContentIn(BaseModel):
    typed_title: str


@app.post("/api/projects/{slug}/content/{content_id}/delete")
def content_delete(slug: str, content_id: str, body: DeleteContentIn):
    try:
        store = state.get_vault()
        return store.delete_content(slug, content_id, body.typed_title)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/boards/{board_id}")
def board_get(board_id: str):
    try:
        store = state.get_vault()
        return store.load_board(board_id)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    except OSError as exc:
        raise HTTPException(500, f"board read failed: {exc}") from exc


class BoardIn(BaseModel):
    document: dict[str, Any]


@app.put("/api/boards/{board_id}")
def board_put(board_id: str, body: BoardIn):
    try:
        store = state.get_vault()
        return store.save_board(board_id, body.document)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    except (TypeError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc
    except OSError as exc:
        raise HTTPException(500, f"board write failed: {exc}") from exc
