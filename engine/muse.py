"""Muse — idle writing suggestions (Tab to accept)."""

from __future__ import annotations

from typing import Any

from engine.connectors.ollama import WRITE_MODEL, ollama_generate

SYSTEM = (
    "You are Muse, a quiet writing partner. Continue the user's prose in their voice. "
    "Output only the next sentence or short paragraph to append. No quotes, no preamble, "
    "no em dashes, no AI clichés."
)


def muse_suggest(text: str, *, title: str = "", project_name: str = "") -> dict[str, Any]:
    context = text[-4000:] if text else ""
    prompt = (
        f"Project: {project_name or 'untitled'}\n"
        f"Document: {title or 'draft'}\n\n"
        f"Continue from here (append only):\n\n{context}\n"
    )
    result = ollama_generate(prompt, system=SYSTEM, max_tokens=120, model=WRITE_MODEL)
    if not result.get("ok"):
        return result
    suggestion = (result.get("text") or "").strip()
    if suggestion.startswith('"') and suggestion.endswith('"'):
        suggestion = suggestion[1:-1]
    return {"ok": True, "suggestion": suggestion, "model": result.get("model") or WRITE_MODEL}
