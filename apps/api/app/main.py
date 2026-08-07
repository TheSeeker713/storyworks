"""Storyworks API — Phase 0."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.connectors.ollama import ollama_generate, ollama_health
from engine.connectors.openclaw import openclaw_health
from engine.muse import muse_suggest

from . import db

app = FastAPI(title="Storyworks API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


class CreateProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class SaveDocIn(BaseModel):
    body: str
    title: Optional[str] = None


class DeleteIn(BaseModel):
    typed_name: str


class MuseIn(BaseModel):
    text: str = ""
    title: str = ""
    project_name: str = ""


class GenerateIn(BaseModel):
    prompt: str
    system: Optional[str] = None


@app.get("/api/health")
def health():
    return {"ok": True, "service": "storyworks-api", "phase": 0}


@app.get("/api/connectors/ollama")
def connector_ollama():
    return ollama_health()


@app.get("/api/connectors/openclaw")
def connector_openclaw():
    return openclaw_health()


@app.get("/api/projects")
def projects_list(archived: bool = False):
    return {"projects": db.list_projects(include_archived=archived)}


@app.post("/api/projects")
def projects_create(body: CreateProjectIn):
    return db.create_project(body.name)


@app.get("/api/projects/{project_id}")
def projects_get(project_id: str):
    p = db.get_project(project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@app.post("/api/projects/{project_id}/archive")
def projects_archive(project_id: str):
    p = db.set_archived(project_id, True, reason="user")
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@app.post("/api/projects/{project_id}/restore")
def projects_restore(project_id: str):
    p = db.set_archived(project_id, False)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@app.post("/api/projects/{project_id}/delete")
def projects_delete(project_id: str, body: DeleteIn):
    result = db.delete_project(project_id, body.typed_name)
    if not result.get("ok"):
        err = result.get("error")
        if err == "not_found":
            raise HTTPException(404, "Project not found")
        if err == "must_archive_first":
            raise HTTPException(400, "Archive the project before deleting")
        if err == "name_mismatch":
            raise HTTPException(400, "Typed name does not match project name")
        raise HTTPException(400, err or "delete failed")
    return result


@app.get("/api/projects/{project_id}/document")
def document_get(project_id: str):
    doc = db.get_document(project_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@app.put("/api/projects/{project_id}/document")
def document_save(project_id: str, body: SaveDocIn):
    doc = db.save_document(project_id, body.body, body.title)
    if not doc:
        raise HTTPException(404, "Project not found")
    return doc


@app.post("/api/muse/suggest")
def muse(body: MuseIn):
    return muse_suggest(body.text, title=body.title, project_name=body.project_name)


@app.post("/api/generate")
def generate(body: GenerateIn):
    return ollama_generate(body.prompt, system=body.system)