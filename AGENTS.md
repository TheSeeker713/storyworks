# Storyworks — Agent Entrypoint

Local-first pre-production writing studio. **Read this first**, then follow the phase rules.

## Phase discipline (locked)

| Phase | Owner | Scope |
|-------|--------|--------|
| **0** | Done (scaffold) | Thin usable slice: projects, editor, Muse, archive, connectors, docs |
| **1** | Next agent | Human-gated visual/UX in `apps/web` **`/design` sandbox only** |
| **2+** | Later | Production feature matrix (Writers Room, modules, git sync, procedural…) |

**Do not** re-scaffold Phase 0. **Do not** implement Phase 2 production until the human signs off Phase 1 design.

Cold start for Phase 1: open **`docs/CURSOR_HANDOFF_PROMPT.md`** first, then `docs/HANDOFF.md`.

## How to run

```bash
# API (repo root)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn apps.api.app.main:app --reload --port 8787

# Web (separate terminal)
cd apps/web && npm install && npm run dev
```

Open http://127.0.0.1:5173 — API proxied to `:8787`.

## Dual VCS (never mix)

1. **App repo** (`~/Developer/storyworks`) → public GitHub `main`. Product code only.
2. **Story projects** (`projects/<slug>/`) → each has its own `.git`. Auto-committed locally. Private GitHub remotes later.

`projects/` and `data/` are **gitignored**. Never stage manuscripts into the public app repo.

## Hard product rules

- Light mode only (no dark mode)
- Archive before delete; typed full project name to delete
- Muse: idle suggest → **Tab** accept → **any other key** dismiss
- Build interference with user projects → `projects/backup/` + temp archive → restore when safe
- See `docs/05_GIT_SYNC.md`, `INSTRUCTIONS.md`

## Docs map

| Path | Purpose |
|------|---------|
| `README.md` | Human overview + quick start |
| `INSTRUCTIONS.md` | Operator manual |
| `docs/` | Specs, matrix, phases, research |
| `docs/HANDOFF.md` | Short next-agent checklist |
| `docs/CURSOR_HANDOFF_PROMPT.md` | Full Phase 1 briefing prompt |
| `.cursor/rules/*.mdc` | Behavioral rules (short; link here) |

Area rules: `apps/web/AGENTS.md`, `apps/api/AGENTS.md`.

## Stack

FastAPI + SQLite WAL · Vite/React/TS · Ollama (Muse) · OpenClaw probe (optional)