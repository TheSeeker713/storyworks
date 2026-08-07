# Storyworks

Local-first writing & pre-production studio. Create a story project, write in a large editor, and optionally use **Muse** (Ollama) for idle next-sentence suggestions.

## Quick start

```bash
# From ~/Developer/storyworks
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn apps.api.app.main:app --reload --port 8787
```

```bash
cd apps/web && npm install && npm run dev
```

Visit http://127.0.0.1:5173

## Architecture

```
apps/api     FastAPI — projects, documents, Muse, connectors
apps/web     Vite + React — wire UI + /design sandbox
engine/      Ollama, OpenClaw probe, Muse, Project Committer
projects/    User story projects (gitignored; each has own .git)
data/        SQLite + logs (gitignored)
docs/        Specs and handoffs
```

## Dual git

- **This repo** = product code → public GitHub.
- **Each `projects/<slug>`** = creative content → local git (+ private remote later).

See `docs/05_GIT_SYNC.md`.

## Phases (v2 rebuild)

- **Phase 0** (in progress): enforcement gate, new stack, vault truth, durable canvas writing, STT prove, FULL STOP
- **Phase 1**: studio chrome / nesting (after Phase 0 human clear via gate script)
- **Phase 2+**: OpenClaw roles, STT polish, Codex, pipelines (`docs/10_FEATURE_MATRIX.md` evolving)

Agents: start at `AGENTS.md`. Operators: `INSTRUCTIONS.md`. Clearance: `./scripts/check-phase-clear.sh`.

## License

Private / unpublished unless otherwise noted on GitHub.