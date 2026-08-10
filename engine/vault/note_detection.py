"""Deterministic, local Notes mention detection and Codex type inference."""

from __future__ import annotations

import re
from typing import Any


_TYPED_TAG = re.compile(
    r"#(?P<type>(?i:character|prop|worldbuilding|scene)):"
    r"(?P<name>[A-Za-z][\w-]*(?:\s+[A-Z][\w-]*){0,2})",
)
_TAG = re.compile(r"#(?P<name>[A-Za-z][\w-]*(?:\s+[A-Z][\w-]*){0,2})")
_PROPER_NOUN = re.compile(r"\b([A-Z][a-z][\w'-]*(?:\s+[A-Z][a-z][\w'-]*){0,2})\b")

_SKIP = {
    "A",
    "An",
    "And",
    "But",
    "Could",
    "Every",
    "For",
    "He",
    "Her",
    "His",
    "I",
    "If",
    "It",
    "Its",
    "Maybe",
    "Might",
    "My",
    "She",
    "Some",
    "The",
    "They",
    "This",
    "We",
    "What",
    "When",
    "Where",
    "Worth",
    "You",
}

_CUES: dict[str, tuple[str, ...]] = {
    "character": (
        "character",
        "person",
        "named",
        "said",
        "says",
        "asked",
        "replied",
        "whispered",
        "argued",
        "walked",
        "smiled",
        "keeps mentioning",
        "relationship",
    ),
    "prop": (
        "prop",
        "object",
        "item",
        "weapon",
        "artifact",
        "carries",
        "carried",
        "holds",
        "held",
        "wears",
        "wore",
        "found",
        "lost",
        "amulet",
        "locket",
        "rune",
        "sword",
        "ring",
        "key",
    ),
    "worldbuilding": (
        "worldbuilding",
        "culture",
        "history",
        "religion",
        "government",
        "language",
        "tradition",
        "custom",
        "law",
        "rule",
        "lore",
        "kingdom",
        "nation",
        "clan",
        "magic system",
    ),
    "scene": (
        "scene",
        "chapter",
        "sequence",
        "setting",
        "takes place",
        "happens at",
        "location",
        "before the storm",
        "int.",
        "ext.",
    ),
}


def _context(text: str, start: int, end: int) -> str:
    """Use the containing sentence so unrelated nearby entities do not vote."""
    left = max(text.rfind(".", 0, start), text.rfind("!", 0, start), text.rfind("?", 0, start))
    right_candidates = [
        pos for pos in (text.find(".", end), text.find("!", end), text.find("?", end)) if pos >= 0
    ]
    right = min(right_candidates) + 1 if right_candidates else len(text)
    return text[left + 1 : right].lower()


def infer_codex_type(name: str, context: str) -> str:
    """Infer one of the four Codex types from nearby language."""
    scores = {
        type_: sum(2 if " " in cue else 1 for cue in cues if cue in context)
        for type_, cues in _CUES.items()
    }
    lower_name = name.lower()
    person_verb = re.search(
        rf"\b{re.escape(lower_name)}(?:'s)?\s+"
        r"(?:argued|asked|carried|carries|held|holds|keeps|replied|said|says|smiled|walked|wears|whispered)\b",
        context,
    )
    if person_verb:
        scores["character"] += 5
    if any(word in lower_name for word in ("docks", "harbor", "room", "house", "forest", "road")):
        scores["scene"] += 1
    if any(word in lower_name for word in ("sword", "ring", "key", "locket", "amulet", "rune")):
        scores["prop"] += 2
    if any(word in lower_name for word in ("empire", "kingdom", "clan", "culture", "guild")):
        scores["worldbuilding"] += 2

    best = max(scores, key=scores.get)
    if scores[best] > 0:
        return best

    # Ambiguous bare proper names are most often people; this fallback is used
    # only after all four contextual classifiers have been evaluated.
    return "character"


def detect_note_codex_links(text: str) -> list[dict[str, Any]]:
    """Return unique, typed Codex links without asking for confirmation."""
    candidates: list[tuple[str, str | None, int, int]] = []
    occupied: list[tuple[int, int]] = []

    for match in _TYPED_TAG.finditer(text):
        candidates.append(
            (
                match.group("name").replace("-", " ").strip(),
                match.group("type").lower(),
                match.start(),
                match.end(),
            )
        )
        occupied.append((match.start(), match.end()))

    for match in _TAG.finditer(text):
        if any(start <= match.start() < end for start, end in occupied):
            continue
        candidates.append(
            (
                match.group("name").replace("-", " ").strip(),
                None,
                match.start(),
                match.end(),
            )
        )
        occupied.append((match.start(), match.end()))

    for match in _PROPER_NOUN.finditer(text):
        name = match.group(1).strip()
        if name.startswith("The "):
            name = name[4:]
        if name in _SKIP or any(start <= match.start() < end for start, end in occupied):
            continue
        context = _context(text, match.start(), match.end())
        if not any(cue in context for cues in _CUES.values() for cue in cues):
            continue
        candidates.append((name, None, match.start(), match.end()))

    links: list[dict[str, Any]] = []
    seen: set[str] = set()
    for name, explicit_type, start, end in candidates:
        key = name.casefold()
        if not name or key in seen:
            continue
        seen.add(key)
        context = _context(text, start, end)
        links.append(
            {
                "name": name,
                "type": explicit_type or infer_codex_type(name, context),
                "source": "typed_tag" if explicit_type else "automatic",
            }
        )
    return links
