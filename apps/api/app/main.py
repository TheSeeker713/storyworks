"""Storyworks API — v2 rebuild scaffold."""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

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
    return {"ok": True, "service": "storyworks-api", "phase": "0.2", "stack": "v2"}


@app.get("/api/connectors/ollama")
def connector_ollama():
    from engine.connectors.ollama import ollama_health

    return ollama_health()


@app.get("/api/connectors/openclaw")
def connector_openclaw():
    from engine.connectors.openclaw import openclaw_health

    return openclaw_health()
