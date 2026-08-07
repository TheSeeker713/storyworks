"""Ollama HTTP connector (local-first)."""

from __future__ import annotations

import os
from typing import Any

import httpx

OLLAMA_BASE = os.environ.get("STORYWORKS_OLLAMA_URL", "http://127.0.0.1:11434")
DEFAULT_MODEL = os.environ.get("STORYWORKS_OLLAMA_MODEL", "huihui_ai/qwen3-abliterated:14b")
FALLBACK_MODEL = os.environ.get("STORYWORKS_OLLAMA_FALLBACK", "qwen3:8b")


def ollama_health() -> dict[str, Any]:
    try:
        with httpx.Client(timeout=3.0) as client:
            r = client.get(f"{OLLAMA_BASE}/api/tags")
            r.raise_for_status()
            data = r.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            return {
                "ok": True,
                "base_url": OLLAMA_BASE,
                "models": models,
                "default_model": DEFAULT_MODEL,
                "fallback_model": FALLBACK_MODEL,
            }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "base_url": OLLAMA_BASE,
            "error": str(exc),
            "default_model": DEFAULT_MODEL,
            "fallback_model": FALLBACK_MODEL,
        }


def ollama_generate(
    prompt: str,
    *,
    model: str | None = None,
    system: str | None = None,
    max_tokens: int = 256,
) -> dict[str, Any]:
    health = ollama_health()
    if not health.get("ok"):
        return {"ok": False, "error": health.get("error", "Ollama unavailable"), "text": ""}

    chosen = model or DEFAULT_MODEL
    available = set(health.get("models") or [])
    if available and chosen not in available and FALLBACK_MODEL in available:
        chosen = FALLBACK_MODEL
    elif available and chosen not in available:
        # pick first available
        chosen = next(iter(available))

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": chosen,
        "messages": messages,
        "stream": False,
        "think": False,
        "options": {"num_predict": max_tokens},
    }
    try:
        with httpx.Client(timeout=120.0) as client:
            r = client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
            r.raise_for_status()
            data = r.json()
            message = data.get("message") or {}
            text = (message.get("content") or data.get("response") or "").strip()
            if not text and message.get("thinking"):
                # Fallback if a thinking model ignored think:false
                text = str(message.get("thinking")).strip()
            return {"ok": True, "model": chosen, "text": text}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc), "text": "", "model": chosen}