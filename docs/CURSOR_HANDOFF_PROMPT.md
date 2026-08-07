# Cursor handoff prompt — Storyworks Phase 1

You are the Cursor agent taking over **Storyworks Studio**. Phase 0 is done. You implement **Phase 1 only**, then stop with an updated handoff for Phase 2.

---

## Mission

Human-gated **visual design and UX** iteration in the live **`apps/web` design sandbox** at route **`/design`**. Collaborate with the human (back-and-forth). Do **not** ship full production dashboard modules until they explicitly approve design exit criteria.

**Stop when:** sandbox reviewed + human sign-off. Then update `docs/HANDOFF.md` for the Phase 2 agent.

**Do not:** re-scaffold Phase 0; implement Writers Room / git cloud push / procedural engines; add dark mode; disrupt `projects/` unsafely.

---

## Product vision

Local-first pre-production writing studio. Ollama-first AI; OpenClaw as optional tool bridge; Grok/cloud only if user opts in. Light mode only; gold chrome direction. Muse is the idle writing listener. Dual VCS separates public product code from private story manuscripts.

Repo path: **`/Users/myceliainteractive/Developer/storyworks`**

---

## How to run the Phase 0 wire app

```bash
cd ~/Developer/storyworks
source .venv/bin/activate   # create + pip install -r requirements.txt if needed
uvicorn apps.api.app.main:app --reload --port 8787
```

```bash
cd ~/Developer/storyworks/apps/web && npm install && npm run dev
```

Open http://127.0.0.1:5173 — writing at `/`, sandbox at `/design`.

---

## Docs map

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Canonical agent entry |
| `README.md` / `INSTRUCTIONS.md` | Overview + operator manual |
| `docs/` | Specs, matrix, phases |
| `docs/HANDOFF.md` | Short checklist |
| `docs/CURSOR_HANDOFF_PROMPT.md` | This briefing |
| `.cursor/rules/*.mdc` | Behavioral rules |
| `docs/10_FEATURE_MATRIX.md` | Scope law — treat as authoritative |
| `docs/06_UI_UX.md` | UI constraints |
| `docs/phases/PHASE_1.md` | Phase 1 detail |

---

## What Phase 0 already shipped (do not rebuild)

- FastAPI + SQLite WAL; Vite/React wire UI
- Projects create/list; large editor; autosave; word count
- Muse (idle ~2.5s, Tab accept, other key dismiss)
- Archive / restore; delete only if archived + typed full name
- Ollama connector health; OpenClaw probe
- Per-project `git init` + Project Committer auto-commit (local)
- `/design` sandbox **stub** ready to expand
- Full docs + `.cursor/rules`

Preserve the writing path while you evolve the sandbox.

---

## Phase model

```
Phase 0 (done) → Phase 1 (you: design sandbox) → Phase 2+ (production)
```

All features in `docs/10_FEATURE_MATRIX.md` remain in overall scope; Phase 1 is design only.

---

## Muse (locked)

- Toggle on/off
- Idle `muse_idle_ms` default 2500 → Ollama suggestion
- **Tab** accept insert; **any other key** dismiss
- Never auto-insert without Tab

---

## Project lifecycle (locked)

- Archive = soft-hide; Restore = available again
- Delete only if archived; warning modal; type full project name; button **Delete project**
- Build interference → `projects/backup/` + temp archive (`archive_reason: system_build`) → restore when safe; never auto-delete backups

---

## Dual VCS (locked)

1. **App repo** public GitHub `main` — product code only; `projects/` and `data/` gitignored
2. **Story projects** each `projects/<slug>/.git` — local auto-commit; **private GitHub per project** later (not Phase 1)

Never commit manuscripts into the public app repo.

---

## Writers Room / procedural

Design awareness OK (IA, chrome concepts). **Do not build** in Phase 1.

---

## UI constraints

- Light mode only — no dark mode
- Gold wire / reflecting border direction
- **Primary workbench = live `/design` sandbox** (not docs-only mockups)
- Optional supporting notes under `docs/design/`

---

## Hard don’ts

- No dark mode
- No hard-delete shortcuts
- No unsafe disruption of `projects/`
- No Phase 2 production until human approves design
- No re-scaffolding Phase 0

---

## Read order

1. This file  
2. `docs/HANDOFF.md`  
3. `AGENTS.md`  
4. `INSTRUCTIONS.md`  
5. `docs/phases/PHASE_1.md`  
6. `docs/06_UI_UX.md`  
7. `docs/10_FEATURE_MATRIX.md` (law)

---

## Definition of done (Phase 1)

- Meaningful design experiments live under `/design`
- Human has reviewed and signed off exit criteria
- Writing path still works
- `docs/HANDOFF.md` updated for Phase 2 agent (point them at matrix + production phases)

---

## After Phase 1

Update handoff: Phase 1 complete; next agent does Phase 2+ production per matrix, with Writers Room MVP early, respecting project safety and dual VCS.