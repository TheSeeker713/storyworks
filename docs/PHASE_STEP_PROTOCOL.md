# Phase / step protocol (locked)

Applies to every Storyworks phase from Phase 0 closure onward.

## Phases have multiple steps

Each phase’s `docs/phases/PHASE_N.md` lists numbered steps with acceptance criteria. Do not treat a whole phase as one undivided blob of work.

## End of every step (mandatory order)

1. **Test** — Run the step’s automated checks. Read the full output (exit code alone is not enough).
2. **Phase/step audit** — Cross-check results against that step’s acceptance list in `PHASE_N.md`. Diff-audit against intent (no drive-by scope; never stage `projects/` / `data/` / secrets).
3. **Retest** — Re-run after any fixes. Score must be **100%** of required checks green.
4. **Fail rule** — **99% or below = fail.** Redo the step until 100%. No exceptions.
5. **Commit + push `main`** — App repo only (`origin` → public Storyworks). Message focuses on why.
6. **Devlog** — Write `docs/devlogs/` in Jeremy’s first-person voice using [`docs/reference/authentic-voice-notes.md`](reference/authentic-voice-notes.md). Commit + push the devlog if it was not in the same commit.

## End of every phase — FULL STOP (human UI/UX gate)

After the last step of a phase passes the step gate:

1. **FULL STOP.** Do not start the next phase.
2. Publish a human checklist: `docs/phases/PHASE_N_HUMAN_CHECKLIST.md` (how to run, routes, click/keyboard paths, expected results, pass/fail).
3. Wait for Jeremy to clear the checklist (manual UI/UX pass).
4. Until cleared: only fix reported checklist failures — no next-phase scope.
5. On clear: update HANDOFF + phase status, commit/push, then begin next phase step 1.

## What “100%” means

- Every check listed for that step is green
- Audit finds no unmet acceptance item and no locked-rule regressions (Muse Tab/dismiss, light mode, dual VCS, archive→typed delete)
- If the step marks “Jeremy manual pass required,” that pass is part of 100% for that step
