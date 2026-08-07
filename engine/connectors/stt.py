"""Local STT via repaired voice-env + mlx_whisper (one proven path)."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any

DEFAULT_VOICE_ENV = Path(
    os.environ.get(
        "STORYWORKS_VOICE_ENV",
        str(Path.home() / "myceliainteractive/developer/voice-env"),
    )
)
DEFAULT_MODEL = os.environ.get("STORYWORKS_STT_MODEL", "mlx-community/whisper-tiny")


def _python_bin(voice_env: Path) -> Path:
    return voice_env / "bin" / "python3.12"


def stt_status(voice_env: Path | None = None) -> dict[str, Any]:
    env = Path(voice_env or DEFAULT_VOICE_ENV)
    py = _python_bin(env)
    if not py.exists() or not os.access(py, os.X_OK):
        return {
            "ok": False,
            "installed": False,
            "state": "not_installed",
            "error": f"voice-env python missing or not executable: {py}",
            "voice_env": str(env),
            "model": DEFAULT_MODEL,
        }
    try:
        r = subprocess.run(
            [str(py), "-c", "import mlx_whisper; print('ok')"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "installed": False,
            "state": "not_installed",
            "error": str(exc),
            "voice_env": str(env),
            "model": DEFAULT_MODEL,
        }
    if r.returncode != 0 or "ok" not in (r.stdout or ""):
        return {
            "ok": False,
            "installed": False,
            "state": "not_installed",
            "error": (r.stderr or r.stdout or "mlx_whisper import failed").strip(),
            "voice_env": str(env),
            "model": DEFAULT_MODEL,
        }
    return {
        "ok": True,
        "installed": True,
        "state": "working",
        "voice_env": str(env),
        "python": str(py),
        "model": DEFAULT_MODEL,
    }


def transcribe_file(audio_path: str | Path, *, voice_env: Path | None = None, model: str | None = None) -> dict[str, Any]:
    status = stt_status(voice_env)
    if not status.get("ok"):
        return {**status, "text": ""}

    env = Path(voice_env or DEFAULT_VOICE_ENV)
    py = _python_bin(env)
    audio_path = Path(audio_path).resolve()
    if not audio_path.is_file():
        return {"ok": False, "error": f"audio not found: {audio_path}", "text": ""}

    model = model or DEFAULT_MODEL
    script = (
        "import json,sys,mlx_whisper\n"
        f"r=mlx_whisper.transcribe(sys.argv[1], path_or_hf_repo={model!r})\n"
        "print(json.dumps({'text': r.get('text','') if isinstance(r,dict) else str(r)}))\n"
    )
    try:
        r = subprocess.run(
            [str(py), "-c", script, str(audio_path)],
            capture_output=True,
            text=True,
            timeout=600,
            check=False,
        )
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc), "text": ""}

    if r.returncode != 0:
        return {
            "ok": False,
            "error": (r.stderr or r.stdout or "transcription failed").strip()[:2000],
            "text": "",
        }
    import json

    try:
        payload = json.loads((r.stdout or "").strip().splitlines()[-1])
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": f"bad stt json: {exc}: {r.stdout!r}", "text": ""}
    return {
        "ok": True,
        "installed": True,
        "state": "working",
        "text": (payload.get("text") or "").strip(),
        "model": model,
        "voice_env": str(env),
    }
