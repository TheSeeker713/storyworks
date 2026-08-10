"""Author / Muse / AI word-count provenance helpers."""

from __future__ import annotations

import re
from typing import Any


_WORD = re.compile(r"\S+")


def count_words(text: str) -> int:
    return len(_WORD.findall(text or ""))


def normalize_provenance(raw: Any) -> dict[str, int]:
    if not isinstance(raw, dict):
        raw = {}
    return {
        "muse_words": max(0, int(raw.get("muse_words") or 0)),
        "ai_words": max(0, int(raw.get("ai_words") or 0)),
    }


def provenance_summary(body: str, provenance: Any) -> dict[str, int]:
    """Design footer shape: total · you · Muse · AI."""
    total = count_words(body)
    prov = normalize_provenance(provenance)
    attributed = prov["muse_words"] + prov["ai_words"]
    author = max(0, total - attributed)
    return {
        "total_words": total,
        "author_words": author,
        "muse_words": prov["muse_words"],
        "ai_words": prov["ai_words"],
    }
