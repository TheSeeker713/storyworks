"""Isolated Storyworks API fixtures (temp data + projects dirs)."""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest


@pytest.fixture()
def api_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    data = tmp_path / "data"
    projects = tmp_path / "projects"
    data.mkdir()
    projects.mkdir()
    monkeypatch.setenv("STORYWORKS_DATA_DIR", str(data))
    monkeypatch.setenv("STORYWORKS_PROJECTS_DIR", str(projects))

    for name in list(sys.modules):
        if name.startswith("apps.api") or name.startswith("engine"):
            del sys.modules[name]

    import apps.api.app.paths as paths

    assert paths.DATA_DIR == data
    assert paths.PROJECTS_DIR == projects

    import apps.api.app.db as db
    import apps.api.app.main as main

    db.init_db()

    from fastapi.testclient import TestClient

    with TestClient(main.app) as client:
        yield client, projects
