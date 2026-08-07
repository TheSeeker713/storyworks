# Cursor handoff — Storyworks v2 rebuild (Phase 0)

You are the Cursor agent on **Storyworks** at `~/Developer/storyworks` (`TheSeeker713/storyworks`).

## Mission

Execute **Phase 0 only**, step by step per `docs/phases/PHASE_0.md`. Stop at end of phase for human UI/UX clear. Do not start Phase 1 until `./scripts/check-phase-clear.sh docs/phases/PHASE_0_HUMAN_CHECKLIST.md` exits 0.

## Locked facts

- macOS only; MyKAIA Big App micro-app absorption is a long-term architecture principle
- Per-day devlogs: `docs/devlogs/YYYY-MM-DD.md`
- Clearance is mechanical via `scripts/check-phase-clear.sh` — chat phrases alone never clear a phase
- Model defaults when AI on: write `huihui_ai/qwen3-abliterated:14b`; agentic `qwen2.5-coder:7b`

## Read order

`AGENTS.md` → `docs/HANDOFF.md` → `docs/PHASE_STEP_PROTOCOL.md` → `docs/phases/PHASE_0.md`

## Do not

- Mark Phase 0 COMPLETE without a passing gate script
- Stage vault / `projects/` / `data/` into the app repo
- Add dark mode
- Skip step quality gate (test → audit → 100% → commit/push → day-devlog append)
