# Cursor handoff — Storyworks (master plan)

You are the Cursor agent on **Storyworks** at `~/Developer/storyworks` (`TheSeeker713/storyworks`).

## Mission

Follow [`docs/MASTER_PLAN.md`](MASTER_PLAN.md) and [`docs/HANDOFF.md`](HANDOFF.md).

- **Phase 0 Setup** is done (0.1 gate + 0.2 scaffold only).
- **Phase 1 Design is COMPLETE.** Build against the Phase 1 artifacts. Do not invent answers for OPEN gaps (Project switcher; typography) — ask Jeremy.
- **Next: Phase 2 — Data & Draft Screen** when Jeremy starts that phase. Resolve the project-switcher gap early.

## Locked facts

- macOS only; MyKAIA Big App micro-app absorption is a long-term architecture principle
- Per-day devlogs: `docs/devlogs/YYYY-MM-DD.md`
- Clearance is mechanical via `scripts/check-phase-clear.sh` — chat phrases alone never clear a phase
- Theme / tokens: `docs/phases/PHASE_1_VISUAL_TOKENS.md` (typography OPEN; dark-mode tokens OPEN)
- Canvas is PENS-only (Phase 6); license-check before any canvas dependency
- Existing vault / TipTap / Muse / onboarding / STT code is working reference, not sacred

## Read order

`AGENTS.md` → `docs/MASTER_PLAN.md` → `docs/HANDOFF.md` → `docs/phases/PHASE_1_INFORMATION_ARCHITECTURE.md` → `docs/phases/PHASE_1_TECHNICAL_ARCHITECTURE.md` → `docs/phases/PHASE_1_VISUAL_TOKENS.md` → `docs/PHASE_STEP_PROTOCOL.md` → current `docs/phases/PHASE_*.md`

## Do not

- Mark any phase COMPLETE without a passing gate script on that phase’s checklist
- Stage vault / `projects/` / `data/` into the app repo
- Boot servers, run `npm run dev` / `uvicorn`, or open a browser
- Skip step quality gate (test → audit → 100% → commit/push → day-devlog append)
- Invent a Project switcher or product typography without Jeremy
