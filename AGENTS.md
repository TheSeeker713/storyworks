# Storyworks — Agent Entrypoint

Local-first pre-production writing studio. **Read this first**, then follow the phase rules.

## Phase discipline (locked)

| Phase | Owner | Scope |
|-------|--------|--------|
| **0** | Complete | Thin usable slice + quality-gate closure |
| **1** | Awaiting human clear | Phase 1B full-bleed `/design` shell shipped; **FULL STOP** on `PHASE_1_HUMAN_CHECKLIST.md` |
| **2+** | After Phase 1 clear | Production feature matrix (Writers Room, modules, git sync, procedural…) |

**Do not** re-scaffold Phase 0. **Do not** implement Phase 2 until Jeremy clears `docs/phases/PHASE_1_HUMAN_CHECKLIST.md`.

Cold start: `AGENTS.md` → [`docs/HANDOFF.md`](docs/HANDOFF.md) → [`docs/PHASE_STEP_PROTOCOL.md`](docs/PHASE_STEP_PROTOCOL.md) → current `docs/phases/PHASE_*.md` → [`docs/10_FEATURE_MATRIX.md`](docs/10_FEATURE_MATRIX.md).

## Step quality gate (locked)

Every phase has **multiple steps**. End of each step, in order:

1. Test (read full output)
2. Phase/step audit against that step’s acceptance criteria
3. Retest to **100%** (≤99% = fail → redo)
4. Commit + push `main` (app repo only)
5. Devlog in `docs/devlogs/` using [`docs/reference/authentic-voice-notes.md`](docs/reference/authentic-voice-notes.md)

End of phase: **FULL STOP** — publish human UI/UX checklist; wait for Jeremy clear before next phase.

Details: [`docs/PHASE_STEP_PROTOCOL.md`](docs/PHASE_STEP_PROTOCOL.md).

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

Tests:

```bash
source .venv/bin/activate
pytest
cd apps/web && npm run build
```

## Dual VCS (never mix)

1. **App repo** (`~/Developer/storyworks`) → public GitHub `main`. Product code only.
2. **Story projects** (`projects/<slug>/`) → each has its own `.git`. Auto-committed locally. Private GitHub remotes later.

`projects/` and `data/` are **gitignored**. Never stage manuscripts into the public app repo.

## Hard product rules

- Light mode only (no dark mode)
- Archive before delete; typed full project name to delete
- Muse: idle suggest → **Tab** accept → **any other key** dismiss
- Build interference → `projects/backup/` + temp archive → restore when safe
- See `docs/05_GIT_SYNC.md`, `INSTRUCTIONS.md`

## Docs map

| Path | Purpose |
|------|---------|
| `README.md` | Human overview + quick start |
| `INSTRUCTIONS.md` | Operator manual |
| `docs/PHASE_STEP_PROTOCOL.md` | Step/phase quality gate law |
| `docs/devlogs/` | Jeremy-voice step logs |
| `docs/reference/authentic-voice-notes.md` | Devlog voice guide |
| `docs/` | Specs, matrix, phases, research |
| `docs/HANDOFF.md` | Short current-phase checklist |
| `docs/CURSOR_HANDOFF_PROMPT.md` | Cold-start briefing |
| `.cursor/rules/*.mdc` | Behavioral rules |

Area rules: `apps/web/AGENTS.md`, `apps/api/AGENTS.md`.

## Stack

FastAPI + SQLite WAL · Vite/React/TS · Ollama (Muse) · OpenClaw probe (optional)
