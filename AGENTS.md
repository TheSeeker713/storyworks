# Storyworks — Agent Entrypoint

Local-first pre-production writing studio. **Read this first**, then follow the phase rules.

## Platform and long-term architecture (locked)

- **macOS only.** Do not target Windows or Linux as supported platforms.
- **MyKAIA Big App:** Storyworks is designed to eventually connect to or be absorbed as a micro-app inside the MyKAIA “Big App” ecosystem. Prefer data-model and API choices that do not foreclose that later.

## Phase discipline (locked) — v2 rebuild

| Phase | Owner | Scope |
|-------|--------|--------|
| **0** | In progress | Enforcement gate, new stack scaffold, vault truth, project list + TipTap writing (canvas descoped), STT repair-and-prove, onboarding/Muse, FULL STOP |
| **1** | After Phase 0 human clear | Studio chrome, nesting, Cmd+K, list index |
| **2+** | After Phase 1 clear | OpenClaw roles, STT polish, Codex, pipelines, procedural |

**Do not** treat the prior Vite/Phase 0–1B tree as the product law. That line was superseded by the rebuild boundary commit. **Do not** implement Phase 1 until Jeremy clears `docs/phases/PHASE_0_HUMAN_CHECKLIST.md` **and** `./scripts/check-phase-clear.sh` exits 0 on that file.

Cold start: `AGENTS.md` → [`docs/HANDOFF.md`](docs/HANDOFF.md) → [`docs/PHASE_STEP_PROTOCOL.md`](docs/PHASE_STEP_PROTOCOL.md) → current `docs/phases/PHASE_*.md`.

## Step quality gate (locked)

Every phase has **multiple steps**. End of each step, in order:

1. Test (read full output)
2. Phase/step audit against that step’s acceptance criteria
3. Retest to **100%** (≤99% = fail → redo)
4. Commit + push `main` (app repo only)
5. Append today’s `docs/devlogs/YYYY-MM-DD.md` using [`docs/reference/authentic-voice-notes.md`](docs/reference/authentic-voice-notes.md)

End of phase: **FULL STOP** — publish human UI/UX checklist; run `./scripts/check-phase-clear.sh` before any COMPLETE status. Chat phrases alone are not clearance.

Details: [`docs/PHASE_STEP_PROTOCOL.md`](docs/PHASE_STEP_PROTOCOL.md).

## How to run

**Agents never boot these.** Jeremy pastes the commands in his own terminals and does every browser check himself. Cursor may run `pytest` / `npm run build` / lint / typecheck only — not `uvicorn`, not `npm run dev`, not a browser.

```bash
# API (repo root) — Jeremy runs this
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn apps.api.app.main:app --reload --port 8787

# Web (separate terminal) — Jeremy runs this
cd apps/web && npm install && npm run dev
```

Open http://127.0.0.1:3000 — `/api/*` rewritten to FastAPI `:8787` in dev.

Static export: `cd apps/web && npm run build` → `apps/web/out/`.

Packaging later: Tauri + Python sidecar — see `docs/PACKAGING.md`. Not built in Phase 0.

Tests:

```bash
source .venv/bin/activate
pytest
cd apps/web && npm run build
```

Clearance gate:

```bash
./scripts/check-phase-clear.sh docs/phases/PHASE_N_HUMAN_CHECKLIST.md
```

## Dual VCS (never mix)

1. **App repo** (`~/Developer/storyworks`) → public GitHub `main`. Product code only.
2. **Story vault / projects** → user-chosen directory (from Step 0.3 onward); each story project may have its own `.git`. Never stage vault/manuscripts into the public app repo.

`projects/` and `data/` remain **gitignored** where present. Never stage manuscripts into the public app repo.

## Hard product rules

- Light mode only (no dark mode)
- Archive before delete; typed full project name to delete
- Muse: idle suggest → **Tab** accept → **any other key** dismiss
- Build interference → vault `.storyworks/backup/` (from Step 0.3) + temp archive → restore when safe
- See `docs/05_GIT_SYNC.md`, `INSTRUCTIONS.md` (rewritten as steps land)

## Docs map

| Path | Purpose |
|------|---------|
| `README.md` | Human overview + quick start |
| `INSTRUCTIONS.md` | Operator manual |
| `docs/PHASE_STEP_PROTOCOL.md` | Step/phase quality gate law |
| `docs/devlogs/` | Jeremy-voice **per-day** logs |
| `docs/reference/authentic-voice-notes.md` | Devlog voice guide |
| `docs/HANDOFF.md` | Short current-phase checklist |
| `scripts/check-phase-clear.sh` | Mechanical human-clearance gate |
| `.cursor/rules/*.mdc` | Behavioral rules |

Area rules: `apps/web/AGENTS.md`, `apps/api/AGENTS.md` (until replaced in 0.2).

## Stack (target for rebuild)

Next.js (static export) + React 19 + Tailwind · TipTap (manuscript editor) · FastAPI + SQLite WAL **index** · markdown vault source of truth · Ollama-first Muse · OpenClaw (three roles, off by default) · local STT (`mlx_audio`)

**Canvas:** no third-party canvas SDK. In-house infinite canvas is a later phase — see `docs/phases/PHASE_3_CUSTOM_CANVAS.md`.

Default models when AI enabled: writing `huihui_ai/qwen3-abliterated:14b`; agentic `qwen2.5-coder:7b`.
