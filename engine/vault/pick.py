"""Native macOS folder picker for vault selection (osascript)."""

from __future__ import annotations

import subprocess
from typing import Any


def pick_folder_macos(prompt: str = "Choose your Storyworks vault folder") -> dict[str, Any]:
    """
    Open the system Choose Folder dialog and return an absolute POSIX path.
    Cancelled dialogs return ok=False, cancelled=True (not an exception).
    """
    # Escape quotes in prompt for AppleScript string literal.
    safe = prompt.replace("\\", "\\\\").replace('"', '\\"')
    script = f'POSIX path of (choose folder with prompt "{safe}")'
    try:
        r = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=600,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "cancelled": False, "error": "folder picker timed out"}
    except FileNotFoundError:
        return {"ok": False, "cancelled": False, "error": "osascript not found (macOS only)"}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "cancelled": False, "error": str(exc)}

    if r.returncode != 0:
        err = (r.stderr or r.stdout or "cancelled").strip()
        cancelled = "User canceled" in err or "user cancelled" in err.lower() or "-128" in err
        return {
            "ok": False,
            "cancelled": cancelled,
            "error": err or "folder picker cancelled",
        }

    path = (r.stdout or "").strip().rstrip("/")
    if not path:
        return {"ok": False, "cancelled": True, "error": "no folder selected"}
    return {"ok": True, "path": path, "cancelled": False}
