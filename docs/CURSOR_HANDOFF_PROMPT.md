# Cursor handoff — Storyworks (master plan)

You are the Cursor agent on **Storyworks** at `~/Developer/storyworks` (`TheSeeker713/storyworks`).

## Mission

Follow [`docs/MASTER_PLAN.md`](MASTER_PLAN.md) and [`docs/HANDOFF.md`](HANDOFF.md).

- **Phase 0 Setup** is done (0.1 gate + 0.2 scaffold only).
- **Phase 1 Design** is current and is **Jeremy + Claude only**. Do not fill the seven design outputs. Do not start Phase 2+ product code until those documents exist as real files.
- Do not revive or clear the old Phase 0 human checklist from `docs/archive/2026-08-08-pre-master-plan.zip`.

## Locked facts

- macOS only; MyKAIA Big App micro-app absorption is a long-term architecture principle
- Per-day devlogs: `docs/devlogs/YYYY-MM-DD.md`
- Clearance is mechanical via `scripts/check-phase-clear.sh` — chat phrases alone never clear a phase
- Theme follows Phase 1 visual system once published; do not invent dark-mode UI before then
- Canvas is PENS-only (Phase 6); license-check before any canvas dependency
- Existing vault / TipTap / Muse / onboarding / STT code is working reference, not sacred

## Read order

`AGENTS.md` → `docs/MASTER_PLAN.md` → `docs/HANDOFF.md` → `docs/PHASE_STEP_PROTOCOL.md` → current `docs/phases/PHASE_*.md`

## Do not

- Mark any phase COMPLETE without a passing gate script on that phase’s checklist
- Stage vault / `projects/` / `data/` into the app repo
- Boot servers, run `npm run dev` / `uvicorn`, or open a browser
- Skip step quality gate (test → audit → 100% → commit/push → day-devlog append)
