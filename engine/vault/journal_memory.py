"""Local Journal callbacks grounded in the writer's own entries."""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Optional


_DATE_FORMATS = ("%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y")


def _entry_date(meta: dict[str, Any]) -> Optional[date]:
    for key in ("entry_date", "created_at"):
        raw = str(meta.get(key) or "").strip()
        if not raw:
            continue
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
        except ValueError:
            pass

    title = str(meta.get("title") or "").strip()
    for format_ in _DATE_FORMATS:
        try:
            return datetime.strptime(title, format_).date()
        except ValueError:
            continue
    return None


def _grounding_excerpt(body: str, limit: int = 220) -> str:
    text = re.sub(r"<!--.*?-->", " ", body, flags=re.DOTALL)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[#*_>`~]+", " ", text)
    text = " ".join(text.split())
    if not text:
        return ""

    sentences = re.split(r"(?<=[.!?])\s+", text)
    excerpt = next((sentence for sentence in sentences if len(sentence.split()) >= 4), text)
    if len(excerpt) <= limit:
        return excerpt
    shortened = excerpt[: limit + 1].rsplit(" ", 1)[0].rstrip(" ,;:")
    return f"{shortened}…"


def build_journal_memory(
    store: Any,
    project_slug: str,
    *,
    book_id: str = "main",
    active_content_id: str = "",
    as_of: Optional[date] = None,
) -> dict[str, Any]:
    """Choose an anniversary entry, or the most recent earlier entry, locally."""
    today = as_of or date.today()
    candidates: list[dict[str, Any]] = []

    for row in store.index.list_project(project_slug, include_archived=False):
        if str(row.get("type") or "") != "journal_entry":
            continue
        content_id = str(row.get("id") or "")
        if not content_id or content_id == active_content_id:
            continue
        data = store.read_content(project_slug, content_id)
        meta = dict(data.get("meta") or {})
        if str(meta.get("book_id") or "main") != book_id:
            continue
        body = str(data.get("body") or "")
        if not body.strip() or body.startswith("swenc:"):
            continue
        written_on = _entry_date(meta)
        if written_on is None or written_on >= today:
            continue
        excerpt = _grounding_excerpt(body)
        if not excerpt:
            continue
        candidates.append(
            {
                "id": content_id,
                "title": str(meta.get("title") or row.get("title") or content_id),
                "date": written_on.isoformat(),
                "body": body,
                "excerpt": excerpt,
                "years_ago": today.year - written_on.year,
            }
        )

    anniversaries = [
        item
        for item in candidates
        if date.fromisoformat(item["date"]).month == today.month
        and date.fromisoformat(item["date"]).day == today.day
    ]
    pool = anniversaries or candidates
    if not pool:
        return {
            "ok": True,
            "as_of": today.isoformat(),
            "kind": None,
            "memory": None,
            "question": None,
        }

    memory = max(pool, key=lambda item: item["date"])
    kind = "on_this_day" if anniversaries else "recent_memory"
    if kind == "on_this_day":
        question = (
            f'On this day {memory["years_ago"]} '
            f'{"year" if memory["years_ago"] == 1 else "years"} ago, '
            f'you wrote “{memory["excerpt"]}” What feels different about that today?'
        )
    else:
        question = (
            f'You wrote “{memory["excerpt"]}” on {memory["date"]}. '
            "Is that still true for you now?"
        )

    return {
        "ok": True,
        "as_of": today.isoformat(),
        "kind": kind,
        "memory": memory,
        "question": question,
    }
