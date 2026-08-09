# Cursor handoff — Storyworks (master plan)

You are the Cursor agent on **Storyworks** at `~/Developer/storyworks` (`TheSeeker713/storyworks`).

## Mission

Follow [`docs/MASTER_PLAN.md`](MASTER_PLAN.md) and [`docs/HANDOFF.md`](HANDOFF.md).

- **Phase 0 Setup** is done (0.1 gate + 0.2 scaffold only).
- **Phase 1 Design is IN PROGRESS** — artifacts are in the repo; Jeremy has not signed the checklist. Do not mark COMPLETE. Do not start Phase 2. Do not invent answers for OPEN gaps (Project switcher; typography).
- **Never fill Tester, Date, or Result** on any `PHASE_*_HUMAN_CHECKLIST.md` sign-off table.

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

- Fill human checklist sign-off fields (Tester / Date / Result)
- Mark any phase COMPLETE without a passing gate script on a checklist Jeremy signed
- Stage vault / `projects/` / `data/` into the app repo
- Boot servers, run `npm run dev` / `uvicorn`, or open a browser
- Skip step quality gate (test → audit → 100% → commit/push → day-devlog append)
- Invent a Project switcher or product typography without Jeremy
- Start Phase 2 before Phase 1 clears
