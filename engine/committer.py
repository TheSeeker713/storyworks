"""Project Committer — debounced local git commits for story projects."""

from __future__ import annotations

import subprocess
import threading
import time
from pathlib import Path
from typing import Callable


class ProjectCommitter:
    def __init__(self, project_dir: Path, debounce_s: float = 2.0) -> None:
        self.project_dir = Path(project_dir)
        self.debounce_s = debounce_s
        self._timer: threading.Timer | None = None
        self._lock = threading.Lock()

    def schedule(self) -> None:
        with self._lock:
            if self._timer:
                self._timer.cancel()
            self._timer = threading.Timer(self.debounce_s, self.commit_now)
            self._timer.daemon = True
            self._timer.start()

    def commit_now(self) -> dict:
        root = self.project_dir
        if not (root / ".git").exists():
            return {"ok": False, "error": "not a git repo"}
        try:
            subprocess.run(["git", "add", "-A"], cwd=root, check=True, capture_output=True)
            status = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=root,
                check=True,
                capture_output=True,
                text=True,
            )
            if not status.stdout.strip():
                return {"ok": True, "committed": False, "reason": "clean"}
            msg = f"autosave: {time.strftime('%Y-%m-%d %H:%M:%S')}"
            subprocess.run(
                ["git", "commit", "-m", msg],
                cwd=root,
                check=True,
                capture_output=True,
                text=True,
            )
            return {"ok": True, "committed": True, "message": msg}
        except subprocess.CalledProcessError as exc:
            err = (exc.stderr or exc.stdout or str(exc)).strip()
            return {"ok": False, "error": err}


_committers: dict[str, ProjectCommitter] = {}


def get_committer(project_dir: Path) -> ProjectCommitter:
    key = str(project_dir.resolve())
    if key not in _committers:
        _committers[key] = ProjectCommitter(project_dir)
    return _committers[key]


def schedule_commit(project_dir: Path) -> None:
    get_committer(project_dir).schedule()