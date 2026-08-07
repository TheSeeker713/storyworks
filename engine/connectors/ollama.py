"""Ollama connector stub — expanded in later Phase 0 steps."""

from __future__ import annotations

import os
from typing import Any

import httpx

DEFAULT_URL = os.environ.get("STORYWORKS_OLLAMA_URL", "http://127.0.0.1:11434")
WRITE_MODEL = os.environ.get("STORYWORKS_OLLAMA_MODEL", "huihui_ai/qwen3-abliterated:14b")
AGENT_MODEL = os.environ.get("STORYWORKS_OLLAMA_AGENT_MODEL", "qwen2.5-coder:7b")


def ollama_health() -> dict[str, Any]:
    try:
        r = httpx.get(f"{DEFAULT_URL}/api/tags", timeout=2.0)
        r.raise_for_status()
        names = [m.get("name", "") for m in r.json().get("models", [])]
        return {
            "ok": True,
            "url": DEFAULT_URL,
            "models": names,
            "write_model": WRITE_MODEL,
            "agent_model": AGENT_MODEL,
            "write_model_present": any(
                WRITE_MODEL in n or n.startswith(WRITE_MODEL.split(":")[0]) for n in names
            ),
            "agent_model_present": any(
                AGENT_MODEL in n or n.startswith(AGENT_MODEL.split(":")[0]) for n in names
            ),
        }
    except Exception as exc:  # noqa: BLE001 — connector must never hang callers
        return {"ok": False, "url": DEFAULT_URL, "error": str(exc)}


def ollama_generate(
    prompt: str,
    *,
    system: str | None = None,
    max_tokens: int = 256,
    model: str | None = None,
) -> dict[str, Any]:
    model = model or WRITE_MODEL
    health = ollama_health()
    if not health.get("ok"):
        return {"ok": False, "error": health.get("error") or "ollama down", "model": model}
    names = health.get("models") or []
    present = any(model in n or n.startswith(model.split(":")[0]) for n in names)
    if not present:
        return {"ok": False, "error": f"model missing: {model}", "model": model}

    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": max_tokens},
    }
    if system:
        payload["system"] = system
    try:
        r = httpx.post(f"{DEFAULT_URL}/api/generate", json=payload, timeout=120.0)
        r.raise_for_status()
        data = r.json()
        return {"ok": True, "text": data.get("response") or "", "model": model}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc), "model": model}
