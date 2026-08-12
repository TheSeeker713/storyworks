"""Agentic pipelines — fail closed if Ollama/model missing. Never write manuscript directly."""

from __future__ import annotations

from typing import Any

from engine.connectors.ollama import AGENT_MODEL, ollama_generate


def _gate(settings: dict[str, Any]) -> dict[str, Any] | None:
    if not settings.get("ai_master_enabled", True):
        return {"ok": False, "error": "AI master switch is off", "disabled": True}
    return None


def agent_generate(prompt: str, *, system: str, settings: dict[str, Any], max_tokens: int = 400) -> dict[str, Any]:
    blocked = _gate(settings)
    if blocked:
        return blocked
    model = str(settings.get("agent_model") or AGENT_MODEL)
    result = ollama_generate(prompt, system=system, max_tokens=max_tokens, model=model)
    if not result.get("ok"):
        return result
    text = (result.get("text") or "").strip()
    return {"ok": True, "text": text, "model": result.get("model") or model}


def describe_selection(selection: str, *, settings: dict[str, Any]) -> dict[str, Any]:
    return agent_generate(
        f"Describe this screenplay selection for the writer (sensory, concrete). Selection:\n\n{selection}",
        system="You help screenwriters. Output a short Describe note only. No manuscript rewrite.",
        settings=settings,
        max_tokens=220,
    )


def show_dont_tell(selection: str, *, settings: dict[str, Any]) -> dict[str, Any]:
    return agent_generate(
        f"Rewrite toward show-don't-tell. Keep meaning. Selection:\n\n{selection}",
        system="You help screenwriters. Output only the revised lines.",
        settings=settings,
        max_tokens=280,
    )


def blog_review(stage: str, body: str, *, settings: dict[str, Any]) -> dict[str, Any]:
    return agent_generate(
        f"Blog stage: {stage}\n\nDraft:\n{body[-6000:]}\n\nGive a short non-blocking review card (bullets).",
        system="You are a blog editor. Non-blocking. Never demand the writer accept changes.",
        settings=settings,
        max_tokens=320,
    )


def ask_vault(query: str, hits: list[dict[str, Any]], *, settings: dict[str, Any]) -> dict[str, Any]:
    context = "\n\n".join(
        f"[{h.get('title') or h.get('id')}] { (h.get('snippet') or '')[:400] }" for h in hits[:12]
    )
    return agent_generate(
        f"Question: {query}\n\nVault excerpts:\n{context or '(none)'}\n\nAnswer from excerpts only.",
        system="You answer from the writer's local vault excerpts. If unknown, say so.",
        settings=settings,
        max_tokens=400,
    )


# Permitted settings keys for NL settings-via-agent (Phase 1 tech arch).
PERMITTED_SETTINGS = {
    "ai_master_enabled",
    "muse_enabled",
    "stt_enabled",
    "codex_complex",
    "stt_model",
    "product_tier",
    "byom_enabled",
    "daily_skins_enabled",
    "tray_edge",
}


def settings_via_agent(request: str, current: dict[str, Any], *, settings: dict[str, Any]) -> dict[str, Any]:
    """Propose a settings patch from NL. Applies only PERMITTED_SETTINGS keys after parse."""
    blocked = _gate(settings)
    if blocked:
        return blocked

    # Deterministic shortcuts — no model required for common phrases.
    low = request.strip().lower()
    patch: dict[str, Any] = {}
    if "hate ai" in low or "turn off ai" in low or "disable ai" in low or "kill switch" in low:
        patch = {"ai_master_enabled": False, "muse_enabled": False, "stt_enabled": False}
    elif "turn on muse" in low or "enable muse" in low:
        patch = {"muse_enabled": True}
    elif "turn off muse" in low or "disable muse" in low:
        patch = {"muse_enabled": False}
    elif "turn on stt" in low or "enable stt" in low or "enable speech" in low:
        patch = {"stt_enabled": True}
    elif "turn off stt" in low or "disable stt" in low:
        patch = {"stt_enabled": False}
    elif "daily skins" in low or "turn on skins" in low or "enable skins" in low:
        patch = {"daily_skins_enabled": True}
    elif "turn off skins" in low or "disable skins" in low:
        patch = {"daily_skins_enabled": False}
    elif "tray" in low and "right" in low:
        patch = {"tray_edge": "right"}
    elif "tray" in low and "left" in low:
        patch = {"tray_edge": "left"}
    elif "lite" in low and "tier" in low:
        patch = {"product_tier": "lite"}
    elif "full" in low and "tier" in low:
        patch = {"product_tier": "full"}
    else:
        result = agent_generate(
            f"Current settings JSON keys of interest: {sorted(PERMITTED_SETTINGS)}\n"
            f"Current values: { {k: current.get(k) for k in PERMITTED_SETTINGS} }\n"
            f"User request: {request}\n"
            "Reply with ONLY a compact JSON object of keys to change. No markdown.",
            system="You propose Storyworks settings patches. Only permitted boolean/string keys.",
            settings=settings,
            max_tokens=120,
        )
        if not result.get("ok"):
            return result
        import json
        import re

        text = result.get("text") or ""
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            return {"ok": False, "error": "could not parse settings patch", "raw": text}
        try:
            raw_patch = json.loads(m.group(0))
        except json.JSONDecodeError:
            return {"ok": False, "error": "invalid settings JSON", "raw": text}
        if not isinstance(raw_patch, dict):
            return {"ok": False, "error": "patch must be object"}
        patch = {k: v for k, v in raw_patch.items() if k in PERMITTED_SETTINGS}

    safe = {k: v for k, v in patch.items() if k in PERMITTED_SETTINGS}
    return {"ok": True, "patch": safe, "applied": False}
