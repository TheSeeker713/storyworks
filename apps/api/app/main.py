"""Storyworks API — v2 rebuild."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
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
        "phase": "8",
        "stack": "v2",
        "vault_open": vault_open,
        "deployment": "scaffold",
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


def _require_stt_enabled() -> dict[str, Any]:
    try:
        settings = state.get_vault().settings()
    except RuntimeError:
        settings = {"ai_master_enabled": True, "stt_enabled": True}
    if not settings.get("ai_master_enabled", True):
        raise HTTPException(400, "AI master switch is off")
    if not settings.get("stt_enabled", False):
        raise HTTPException(400, "STT is off")
    return settings


@app.post("/api/stt/transcribe")
def stt_transcribe(body: TranscribeIn):
    from engine.connectors.stt import transcribe_file

    settings = _require_stt_enabled()
    model = str(settings.get("stt_model") or "") or None
    result = transcribe_file(body.path, model=model)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error") or "stt failed")
    return result


@app.post("/api/stt/transcribe-upload")
async def stt_transcribe_upload(file: UploadFile = File(...)):
    """Accept recorded audio bytes (Dictate UI). Writes a throwaway temp file only."""
    import tempfile

    from engine.connectors.stt import transcribe_file

    settings = _require_stt_enabled()
    model = str(settings.get("stt_model") or "") or None
    suffix = Path(file.filename or "audio.webm").suffix or ".webm"
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "empty audio upload")
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(raw)
        tmp_path = Path(tmp.name)
    try:
        result = transcribe_file(tmp_path, model=model)
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass
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
    if str(settings.get("product_tier") or "full") == "lite":
        return {"ok": False, "error": "Lite tier — AI helpers off", "disabled": True}
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
    name: str = Field(default="", max_length=200)
    module: str = "draft"


class RenameIn(BaseModel):
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
        return store.create_project(body.name, module=body.module)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.patch("/api/projects/{slug}/rename")
def project_rename(slug: str, body: RenameIn):
    try:
        return state.get_vault().rename_project(slug, body.name)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc


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
    tags: Optional[list[str]] = None
    scenes: Optional[list[dict[str, Any]]] = None
    paragraph_timestamps: Optional[list[str]] = None
    auto_tag: bool = False


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
        result = store.write_content(
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
            paragraph_timestamps=body.paragraph_timestamps,
            expected_hash=body.expected_hash,
            dirty=body.dirty,
        )
        if result.get("ok") and (body.tags is not None or body.scenes is not None):
            data = store.read_content(slug, result["id"])
            meta = data["meta"]
            if body.tags is not None:
                meta["tags"] = body.tags
            if body.scenes is not None:
                meta["scenes"] = body.scenes
            from engine.vault.frontmatter import dump_markdown
            from engine.vault.store import atomic_write

            path = store.resolve_content_path(slug, result["id"])
            atomic_write(path, dump_markdown(meta, data["body"]))
            store._index_file(slug, path)
            result = store.read_content(slug, result["id"])
            result = {"ok": True, **{k: result[k] for k in result if k != "ok"}}
        if body.auto_tag and result.get("ok"):
            from engine.vault.codex import ensure_stub
            from engine.vault.note_detection import detect_note_codex_links
            from engine.vault.paths import project_dir

            stubs = []
            links = detect_note_codex_links(body.body or "")
            for link in links:
                stub = ensure_stub(
                    project_dir(store.root, slug),
                    str(link["name"]),
                    type_=str(link["type"]),
                )
                stubs.append(stub)
                link["entry_id"] = stub["id"]
                link["type"] = stub["type"]

            data = store.read_content(slug, result["id"])
            meta = data["meta"]
            meta["codex_links"] = links
            from engine.vault.frontmatter import dump_markdown
            from engine.vault.store import atomic_write

            path = store.resolve_content_path(slug, result["id"])
            atomic_write(path, dump_markdown(meta, data["body"]))
            store._index_file(slug, path)
            result["auto_tags"] = stubs
            result["codex_links"] = links
        return result
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


@app.patch("/api/projects/{slug}/content/{content_id}/rename")
def content_rename(slug: str, content_id: str, body: RenameIn):
    try:
        return state.get_vault().rename_content(slug, content_id, body.name)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
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


# --- Phase 3–4: Codex, search, journal privacy, blog meta ---


class CodexCreateIn(BaseModel):
    type: str
    name: str
    description: str = ""
    fields: Optional[dict[str, Any]] = None
    facets: Optional[dict[str, str]] = None


class CodexUpdateIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[dict[str, Any]] = None
    facets: Optional[dict[str, str]] = None


class ProgressionIn(BaseModel):
    mode: str
    manuscript_point: str
    text: str
    ordinal: Optional[float] = None


class JournalBookIn(BaseModel):
    title: str
    privacy: str = "public"
    password: Optional[str] = None


class JournalUnlockIn(BaseModel):
    password: Optional[str] = None
    recovery_key: Optional[str] = None


class ProjectMetaPatchIn(BaseModel):
    patch: dict[str, Any]


@app.get("/api/projects/{slug}/meta")
def project_meta_get(slug: str):
    try:
        return state.get_vault().get_project_meta(slug)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.patch("/api/projects/{slug}/meta")
def project_meta_patch(slug: str, body: ProjectMetaPatchIn):
    try:
        return state.get_vault().patch_project_meta(slug, body.patch)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/search")
def vault_search(q: str = "", limit: int = 40):
    try:
        return {"hits": state.get_vault().search_vault(q, limit=limit)}
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/command/search")
def command_search(q: str = "", limit: int = 12):
    """Grouped Cmd+K search over projects, Codex, and writing."""
    try:
        from engine.vault import codex as cx
        from engine.vault.paths import project_dir

        store = state.get_vault()
        query = q.strip().casefold()
        if not query:
            return {"projects": [], "codex": [], "writing": []}

        projects = [
            row
            for row in store.list_projects(include_archived=False)
            if query in f"{row.get('name', '')} {row.get('module', '')}".casefold()
        ][:limit]

        codex: list[dict[str, Any]] = []
        for project in store.list_projects(include_archived=False):
            slug = str(project["slug"])
            for entry in cx.list_entries(project_dir(store.root, slug)):
                if query not in f"{entry.get('title', '')} {entry.get('subject', '')} {entry.get('type', '')}".casefold():
                    continue
                codex.append(
                    {
                        **entry,
                        "project_slug": slug,
                        "project_name": project["name"],
                    }
                )
                if len(codex) >= limit:
                    break
            if len(codex) >= limit:
                break

        return {
            "projects": projects,
            "codex": codex,
            "writing": store.search_vault(q, limit=limit),
        }
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/projects/{slug}/codex")
def codex_list(slug: str, type: Optional[str] = None):
    try:
        from engine.vault import codex as cx
        from engine.vault.paths import project_dir

        store = state.get_vault()
        return {"entries": cx.list_entries(project_dir(store.root, slug), type_=type), "suggested_order": list(cx.SUGGESTED_ORDER)}
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/projects/{slug}/codex")
def codex_create(slug: str, body: CodexCreateIn):
    try:
        from engine.vault import codex as cx
        from engine.vault.paths import project_dir

        store = state.get_vault()
        return cx.create_entry(
            project_dir(store.root, slug),
            type_=body.type,
            name=body.name,
            description=body.description,
            fields=body.fields,
            facets=body.facets,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/projects/{slug}/codex/{type_}/{entry_id}")
def codex_get(slug: str, type_: str, entry_id: str):
    try:
        from engine.vault import codex as cx
        from engine.vault.paths import project_dir

        return cx.read_entry(project_dir(state.get_vault().root, slug), type_, entry_id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.patch("/api/projects/{slug}/codex/{type_}/{entry_id}")
def codex_patch(slug: str, type_: str, entry_id: str, body: CodexUpdateIn):
    try:
        from engine.vault import codex as cx
        from engine.vault.paths import project_dir

        return cx.update_entry(
            project_dir(state.get_vault().root, slug),
            type_,
            entry_id,
            name=body.name,
            description=body.description,
            fields=body.fields,
            facets=body.facets,
        )
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/projects/{slug}/codex/{type_}/{entry_id}/progressions")
def codex_add_progression(slug: str, type_: str, entry_id: str, body: ProgressionIn):
    try:
        from engine.vault import codex as cx
        from engine.vault.paths import project_dir

        return cx.add_progression(
            project_dir(state.get_vault().root, slug),
            type_,
            entry_id,
            mode=body.mode,
            manuscript_point=body.manuscript_point,
            text=body.text,
            ordinal=body.ordinal,
        )
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/projects/{slug}/codex/{type_}/{entry_id}/ai-progressions")
def codex_ai_progressions(slug: str, type_: str, entry_id: str, story_ordinal: float = 0):
    try:
        from engine.vault import codex as cx
        from engine.vault.paths import project_dir

        return {
            "progressions": cx.progressions_for_ai(
                project_dir(state.get_vault().root, slug),
                type_,
                entry_id,
                story_ordinal=story_ordinal,
            )
        }
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/projects/{slug}/journal/books")
def journal_book_create(slug: str, body: JournalBookIn):
    if body.privacy.strip().lower() == "private":
        raise HTTPException(
            503,
            "New Private Books are temporarily unavailable until Touch ID and the full recovery flow are verified.",
        )
    try:
        return state.get_vault().create_journal_book(
            slug, body.title, privacy=body.privacy, password=body.password
        )
    except (ValueError, PermissionError) as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/projects/{slug}/journal/books/{book_id}/unlock")
def journal_book_unlock(slug: str, book_id: str, body: JournalUnlockIn):
    try:
        return state.get_vault().unlock_journal_book(
            slug, book_id, password=body.password, recovery_key=body.recovery_key
        )
    except (FileNotFoundError, PermissionError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/projects/{slug}/journal/memory")
def journal_memory(
    slug: str,
    book_id: str = "main",
    active_content_id: str = "",
    as_of: Optional[str] = None,
):
    from datetime import date

    from engine.vault.journal_memory import build_journal_memory

    try:
        day = date.fromisoformat(as_of) if as_of else None
        return build_journal_memory(
            state.get_vault(),
            slug,
            book_id=book_id,
            active_content_id=active_content_id,
            as_of=day,
        )
    except ValueError as exc:
        raise HTTPException(400, "as_of must be an ISO date") from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


class JournalCipherIn(BaseModel):
    session_dek: str
    text: str = ""
    ciphertext: str = ""


@app.post("/api/projects/{slug}/journal/books/{book_id}/seal")
def journal_seal(_slug: str, _book_id: str, body: JournalCipherIn):
    from engine.vault.journal_crypto import encrypt_text

    try:
        dek = body.session_dek.encode("ascii")
        return {"ciphertext": "swenc:" + encrypt_text(dek, body.text)}
    except Exception as exc:
        raise HTTPException(400, f"seal failed: {exc}") from exc


@app.post("/api/projects/{slug}/journal/books/{book_id}/open")
def journal_open(_slug: str, _book_id: str, body: JournalCipherIn):
    from engine.vault.journal_crypto import decrypt_text

    try:
        raw = body.ciphertext or ""
        if not raw.startswith("swenc:"):
            return {"text": raw}
        dek = body.session_dek.encode("ascii")
        return {"text": decrypt_text(dek, raw[len("swenc:") :])}
    except Exception as exc:
        raise HTTPException(400, f"open failed: {exc}") from exc


@app.get("/api/projects/{slug}/content/{content_id}/scenes")
def content_scenes(slug: str, content_id: str):
    try:
        return {"scenes": state.get_vault().get_content_scenes(slug, content_id)}
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


# --- Phase 5: provenance, sandbox, agent tools ---


class ProvenanceBumpIn(BaseModel):
    muse_words: int = 0
    ai_words: int = 0


@app.post("/api/projects/{slug}/content/{content_id}/provenance")
def provenance_bump(slug: str, content_id: str, body: ProvenanceBumpIn):
    try:
        return state.get_vault().bump_provenance(
            slug, content_id, muse_words=body.muse_words, ai_words=body.ai_words
        )
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/projects/{slug}/content/{content_id}/provenance")
def provenance_get(slug: str, content_id: str):
    from engine.ai.provenance import provenance_summary

    try:
        data = state.get_vault().read_content(slug, content_id)
        summary = provenance_summary(str(data.get("body") or ""), data["meta"].get("provenance"))
        return {"ok": True, "summary": summary, "provenance": data["meta"].get("provenance") or {}}
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


class SandboxCreateIn(BaseModel):
    content_id: str
    kind: str = "agent"
    body: str
    title: str = ""


@app.get("/api/projects/{slug}/ai/sandbox")
def sandbox_list(slug: str, content_id: Optional[str] = None):
    from engine.ai.sandbox import list_sandbox

    try:
        store = state.get_vault()
        return {"items": list_sandbox(store.root, slug, content_id=content_id)}
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/projects/{slug}/ai/sandbox")
def sandbox_create(slug: str, body: SandboxCreateIn):
    from engine.ai.sandbox import create_sandbox_draft

    try:
        store = state.get_vault()
        settings = store.settings()
        if not settings.get("ai_master_enabled", True):
            raise HTTPException(400, "AI master switch is off")
        item = create_sandbox_draft(
            store.root,
            slug,
            content_id=body.content_id,
            kind=body.kind,
            body=body.body,
            title=body.title,
        )
        return {"ok": True, "item": item}
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


class SandboxActionIn(BaseModel):
    action: str  # approve | set_aside | dismiss
    mode: str = "append"


@app.post("/api/projects/{slug}/ai/sandbox/{draft_id}")
def sandbox_action(slug: str, draft_id: str, body: SandboxActionIn):
    from engine.ai.sandbox import set_sandbox_status

    try:
        store = state.get_vault()
        if body.action == "approve":
            return store.approve_sandbox_into_content(slug, draft_id, mode=body.mode)
        if body.action == "set_aside":
            return {"ok": True, "item": set_sandbox_status(store.root, slug, draft_id, "set_aside")}
        if body.action == "dismiss":
            # Never silent discard — dismissed stays listed as dismissed.
            return {"ok": True, "item": set_sandbox_status(store.root, slug, draft_id, "dismissed")}
        raise HTTPException(400, f"unknown action: {body.action}")
    except (FileNotFoundError, PermissionError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


class AgentToolIn(BaseModel):
    tool: str
    text: str = ""
    query: str = ""
    stage: str = "draft"
    content_id: str = ""
    project_slug: str = ""


@app.post("/api/ai/agent")
def ai_agent(body: AgentToolIn):
    """Run an agentic tool; results go to sandbox when content_id is provided."""
    from engine.ai import agent as agent_mod
    from engine.ai.sandbox import create_sandbox_draft

    try:
        store = state.get_vault()
        settings = store.settings()
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc

    if body.tool == "describe":
        result = agent_mod.describe_selection(body.text, settings=settings)
    elif body.tool == "show_dont_tell":
        result = agent_mod.show_dont_tell(body.text, settings=settings)
    elif body.tool == "blog_review":
        result = agent_mod.blog_review(body.stage, body.text, settings=settings)
    elif body.tool == "ask_vault":
        hits = store.search_vault(body.query or body.text, limit=12)
        result = agent_mod.ask_vault(body.query or body.text, hits, settings=settings)
        result["hits"] = hits
    else:
        raise HTTPException(400, f"unknown tool: {body.tool}")

    if not result.get("ok"):
        return result

    slug = body.project_slug
    content_id = body.content_id
    if slug and content_id and result.get("text"):
        item = create_sandbox_draft(
            store.root,
            slug,
            content_id=content_id,
            kind=body.tool,
            body=str(result["text"]),
            title=body.tool.replace("_", " "),
        )
        result["sandbox"] = item
    return result


class SettingsAgentIn(BaseModel):
    request: str
    apply: bool = True


@app.post("/api/ai/settings")
def ai_settings_agent(body: SettingsAgentIn):
    from engine.ai.agent import settings_via_agent

    try:
        store = state.get_vault()
        current = store.settings()
        result = settings_via_agent(body.request, current, settings=current)
        if result.get("ok") and body.apply and result.get("patch"):
            merged = store.save_settings(result["patch"])
            result["applied"] = True
            result["settings"] = merged
        return result
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/projects/{slug}/export")
def project_export(slug: str, format: str = "markdown"):
    """Phase 8 — local export. Binary formats return base64 content."""
    from engine.export.formats import export_project, write_export_sidecar
    from engine.vault.paths import project_dir

    try:
        store = state.get_vault()
        pdir = project_dir(store.root, slug)
        if not pdir.is_dir():
            raise FileNotFoundError(slug)
        result = export_project(pdir, format)
        write_export_sidecar(pdir, result)
        return result
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
