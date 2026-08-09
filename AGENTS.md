# Storyworks — Agent Entrypoint

Local-first pre-production writing studio. **Read this first**, then follow the phase rules.

## Platform and long-term architecture (locked)

- **macOS only.** Do not target Windows or Linux as supported platforms.
- **MyKAIA Big App:** Storyworks is designed to eventually connect to or be absorbed as a micro-app inside the MyKAIA “Big App” ecosystem. Prefer data-model and API choices that do not foreclose that later.

## Phase discipline (locked)

Standing law: [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md). It supersedes all prior phase structures.

| Phase | Status | Scope |
|-------|--------|--------|
| **0 Setup** | Done (0.1–0.2 only) | Clearance gate script + per-day devlog protocol; bare Next.js/FastAPI/`engine/` scaffold. Nothing user-facing. |
| **1 Design** | COMPLETE (2026-08-09) | Seven design artifacts (see `PHASE_1.md`). Two OPEN gaps: Project switcher, typography — see HANDOFF. |
| **2–8 Production** | Unblocked — Phase 2 next (separate session) | Data & Draft Screen → Novel/Screenplay/Codex → Notes/Journal/Blog → AI layer → PENS → Onboarding/Settings/Lite·Full → Export/Publish |
| **Deployment** | Not started | Tauri packaging, signing, pricing, distribution |

**Do not** treat the prior Vite/Phase 0–1B tree, or the pre-master-plan “Phase 0 with vault/editor/Muse” structure, as current product law. Superseded history (old phase docs + per-step devlogs): [`docs/archive/2026-08-08-pre-master-plan.zip`](docs/archive/2026-08-08-pre-master-plan.zip).

Vault, TipTap, Muse, onboarding, and STT code in the repo today are a **working reference implementation**, not COMPLETE under any production phase. Phase 2 opens by checking each piece against Phase 1 design docs: keep what fits, rebuild what doesn’t.

Cold start: `AGENTS.md` → [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md) → [`docs/HANDOFF.md`](docs/HANDOFF.md) → [`docs/phases/PHASE_1_INFORMATION_ARCHITECTURE.md`](docs/phases/PHASE_1_INFORMATION_ARCHITECTURE.md) → [`docs/phases/PHASE_1_TECHNICAL_ARCHITECTURE.md`](docs/phases/PHASE_1_TECHNICAL_ARCHITECTURE.md) → [`docs/phases/PHASE_1_VISUAL_TOKENS.md`](docs/phases/PHASE_1_VISUAL_TOKENS.md) → [`docs/PHASE_STEP_PROTOCOL.md`](docs/PHASE_STEP_PROTOCOL.md) → current `docs/phases/PHASE_*.md`. Design wireframes/thesis live in `docs/design/storyworks-design-reference-part-1.html` and `part-2.html`.

Older numbered specs under `docs/` (`00_VISION`, `06_UI_UX`, `10_FEATURE_MATRIX`, etc.) are pre-master-plan and subordinate where Phase 1 design docs supersede them.

## Step quality gate (locked)

Every phase has **multiple steps**. End of each step, in order:

1. Test (read full output)
2. Phase/step audit against that step’s acceptance criteria
3. Retest to **100%** (≤99% = fail → redo)
4. Commit + push `main` (app repo only)
5. Append today’s `docs/devlogs/YYYY-MM-DD.md` using [`docs/reference/authentic-voice-notes.md`](docs/reference/authentic-voice-notes.md)

End of phase: **FULL STOP** — publish human checklist; run `./scripts/check-phase-clear.sh` before any COMPLETE status. Chat phrases alone are not clearance. **Agents never fill Tester/Date/Result on any human checklist sign-off table** — Jeremy types those himself. Phase 1 Design is document-gated (seven outputs + Jeremy’s sign-off), not a UI walk of the old Setup checklist.

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

Packaging: Tauri + Python sidecar — see `docs/PACKAGING.md`. Built in Deployment, not earlier.

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
2. **Story vault / projects** → user-chosen directory; each story project may have its own `.git`. Never stage vault/manuscripts into the public app repo.

`projects/` and `data/` remain **gitignored** where present. Never stage manuscripts into the public app repo.

## Hard product rules

- Theme follows Phase 1 visual system once published (plan: light default, dark available as a setting). Do not invent dark-mode UI before those docs exist.
- Archive before delete; typed full project name to delete
- Muse: idle suggest → **Tab** accept → **any other key** dismiss
- Build interference → vault `.storyworks/backup/` + temp archive → restore when safe
- See `docs/05_GIT_SYNC.md`, `INSTRUCTIONS.md` (rewritten as steps land)

## Docs map

| Path | Purpose |
|------|---------|
| `README.md` | Human overview + quick start |
| `INSTRUCTIONS.md` | Operator manual |
| `docs/MASTER_PLAN.md` | Standing production plan (Setup → Deployment) |
| `docs/phases/PHASE_1_INFORMATION_ARCHITECTURE.md` | Phase 1 IA (incl. Project switcher OPEN gap) |
| `docs/phases/PHASE_1_TECHNICAL_ARCHITECTURE.md` | Phase 1 technical architecture |
| `docs/phases/PHASE_1_VISUAL_TOKENS.md` | Phase 1 visual tokens (typography OPEN) |
| `docs/design/storyworks-design-reference-part-*.html` | Thesis, features, principles, wireframes |
| `docs/PHASE_STEP_PROTOCOL.md` | Step/phase quality gate law |
| `docs/devlogs/` | Jeremy-voice **per-day** logs |
| `docs/reference/authentic-voice-notes.md` | Devlog voice guide |
| `docs/HANDOFF.md` | Short current-phase checklist |
| `docs/archive/2026-08-08-pre-master-plan.zip` | Superseded pre-master-plan phase docs + old per-step devlogs |
| `scripts/check-phase-clear.sh` | Mechanical human-clearance gate |
| `.cursor/rules/*.mdc` | Behavioral rules |

Area rules: `apps/web/AGENTS.md`, `apps/api/AGENTS.md`.

## Stack (target)

Next.js (static export) + React 19 + Tailwind · TipTap (manuscript editor, pending Phase 1 confirm) · FastAPI + SQLite WAL **index** · markdown vault source of truth · local AI (Phase 5; Deployment embeds inference for Full build) · local STT

**Canvas:** scoped to **PENS (Phase 6)** only. MIT-licensed or hand-rolled; license-checked before any canvas code. Not a whole-app surface.

Default models when AI enabled (until Phase 1/5 revises): writing `huihui_ai/qwen3-abliterated:14b`; agentic `qwen2.5-coder:7b`.
