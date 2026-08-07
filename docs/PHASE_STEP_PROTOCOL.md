# Phase / step protocol (locked)

Applies to every Storyworks phase from the v2 rebuild onward. macOS only.

## Phases have multiple steps

Each phase’s `docs/phases/PHASE_N.md` lists numbered steps with acceptance criteria. Do not treat a whole phase as one undivided blob of work.

## End of every step (mandatory order)

1. **Test** — Run the step’s automated checks. Read the full output (exit code alone is not enough).
2. **Phase/step audit** — Cross-check results against that step’s acceptance list in `PHASE_N.md`. Diff-audit against intent (no drive-by scope; never stage `projects/` / `data/` / vault contents / secrets).
3. **Retest** — Re-run after any fixes. Score must be **100%** of required checks green.
4. **Fail rule** — **99% or below = fail.** Redo the step until 100%. No exceptions.
5. **Commit + push `main`** — App repo only (`origin` → public Storyworks). Message focuses on why.
6. **Devlog** — Append a `## HH:MM` entry to today’s `docs/devlogs/YYYY-MM-DD.md` in Jeremy’s first-person voice using [`docs/reference/authentic-voice-notes.md`](reference/authentic-voice-notes.md). Create the day file if needed. Commit + push the devlog if it was not in the same commit.

## End of every phase — FULL STOP (human UI/UX gate)

After the last step of a phase passes the step gate:

1. **FULL STOP.** Do not start the next phase.
2. Publish a human checklist: `docs/phases/PHASE_N_HUMAN_CHECKLIST.md` (how to run, routes, click/keyboard paths, expected results, pass/fail, sign-off table).
3. Wait for Jeremy to clear the checklist (manual UI/UX pass). Chat phrases alone are **not** clearance.
4. Until cleared: only fix reported checklist failures — no next-phase scope.
5. **Before** marking the phase COMPLETE or beginning the next phase, agents **must** run:

   ```bash
   ./scripts/check-phase-clear.sh docs/phases/PHASE_N_HUMAN_CHECKLIST.md
   ```

   Exit code must be **0**. Nonzero = not cleared. Do not edit phase status to COMPLETE on a failing gate.
6. On clear (script passes **and** Jeremy filled the checklist): update HANDOFF + phase status, commit/push, then begin next phase step 1.

## Verifiable clearance (locked)

A phase status may read **COMPLETE** only when **all** of the following are true:

1. `docs/phases/PHASE_N_HUMAN_CHECKLIST.md` has **zero** unchecked task lines matching `- [ ]`
2. The sign-off table has non-empty **Tester** and **Date** values
3. `./scripts/check-phase-clear.sh` on that checklist exits **0**

Writing “COMPLETE (human cleared)” (or equivalent) without a passing gate script is a protocol violation. The prior false Phase 0 clearance is why this gate exists.

## What “100%” means

- Every check listed for that step is green
- Audit finds no unmet acceptance item and no locked-rule regressions (Muse Tab/dismiss, light mode, dual VCS, archive→typed delete, markdown vault truth once Step 0.3+ exists)
- If the step marks “Jeremy manual pass required,” that pass is part of 100% for that step
- End-of-phase COMPLETE additionally requires the clearance script to pass
