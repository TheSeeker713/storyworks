"""Per-project git committer. cwd is always projects/<slug> — never the app repo."""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any


def _run(cwd: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        check=False,
    )


def init_project_git(project_path: Path) -> dict[str, Any]:
    project_path = project_path.resolve()
    if not project_path.is_dir():
        raise FileNotFoundError(str(project_path))
    git_dir = project_path / ".git"
    if git_dir.exists():
        return {"ok": True, "already": True, "path": str(project_path)}
    r = _run(project_path, ["init"])
    if r.returncode != 0:
        return {"ok": False, "error": r.stderr.strip() or r.stdout.strip()}
    ignore = project_path / ".gitignore"
    if not ignore.exists():
        ignore.write_text("# storyworks project git\n.DS_Store\n", encoding="utf-8")
    _run(project_path, ["add", "-A"])
    _run(
        project_path,
        [
            "-c",
            "user.email=storyworks@local",
            "-c",
            "user.name=Storyworks",
            "commit",
            "-m",
            "Initial project commit",
            "--allow-empty",
        ],
    )
    return {"ok": True, "already": False, "path": str(project_path)}


def checkpoint_project(project_path: Path, *, message: str = "autosave") -> dict[str, Any]:
    project_path = project_path.resolve()
    if not (project_path / ".git").exists():
        init = init_project_git(project_path)
        if not init.get("ok"):
            return init
    status = _run(project_path, ["status", "--porcelain"])
    if status.returncode != 0:
        return {"ok": False, "error": status.stderr.strip()}
    if not status.stdout.strip():
        return {"ok": True, "committed": False, "reason": "clean"}
    _run(project_path, ["add", "-A"])
    r = _run(
        project_path,
        [
            "-c",
            "user.email=storyworks@local",
            "-c",
            "user.name=Storyworks",
            "commit",
            "-m",
            message,
        ],
    )
    if r.returncode != 0:
        return {"ok": False, "error": r.stderr.strip() or r.stdout.strip()}
    return {"ok": True, "committed": True, "message": message}


def list_history(project_path: Path, *, limit: int = 50) -> list[dict[str, Any]]:
    project_path = project_path.resolve()
    if not (project_path / ".git").exists():
        return []
    r = _run(
        project_path,
        ["log", f"-n{limit}", "--pretty=format:%H%x09%cI%x09%s"],
    )
    if r.returncode != 0:
        return []
    out: list[dict[str, Any]] = []
    for line in r.stdout.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t", 2)
        if len(parts) < 3:
            continue
        out.append({"sha": parts[0], "date": parts[1], "message": parts[2]})
    return out


def show_file_at(project_path: Path, rel_path: str, sha: str) -> dict[str, Any]:
    project_path = project_path.resolve()
    r = _run(project_path, ["show", f"{sha}:{rel_path}"])
    if r.returncode != 0:
        return {"ok": False, "error": r.stderr.strip() or "not found"}
    return {"ok": True, "sha": sha, "path": rel_path, "text": r.stdout}
