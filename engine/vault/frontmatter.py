"""Minimal YAML-ish frontmatter parse/serialize for vault markdown files."""

from __future__ import annotations

import json
import re
from typing import Any

FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n?(.*)\Z", re.DOTALL)


def parse_markdown(text: str) -> tuple[dict[str, Any], str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    meta: dict[str, Any] = {}
    for line in m.group(1).splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, raw = line.partition(":")
        key = key.strip()
        raw = raw.strip()
        if raw.startswith("[") or raw.startswith("{"):
            try:
                meta[key] = json.loads(raw)
                continue
            except json.JSONDecodeError:
                pass
        if raw.lower() in ("true", "false"):
            meta[key] = raw.lower() == "true"
        elif raw.isdigit():
            meta[key] = int(raw)
        else:
            if (raw.startswith('"') and raw.endswith('"')) or (
                raw.startswith("'") and raw.endswith("'")
            ):
                raw = raw[1:-1]
            meta[key] = raw
    return meta, m.group(2)


def dump_markdown(meta: dict[str, Any], body: str) -> str:
    lines = ["---"]
    for key, value in meta.items():
        if isinstance(value, (dict, list)):
            lines.append(f"{key}: {json.dumps(value, separators=(',', ':'))}")
        elif isinstance(value, bool):
            lines.append(f"{key}: {'true' if value else 'false'}")
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    body = body if body.endswith("\n") or body == "" else body + "\n"
    return "\n".join(lines) + "\n" + body
