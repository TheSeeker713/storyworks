# Phase / step protocol (locked)

Applies to every Storyworks phase under [`docs/MASTER_PLAN.md`](MASTER_PLAN.md). macOS only.

Standing phase map: Setup (0) → Design (1) → Production (2–8) → Deployment. The pre-master-plan structure that packed vault/editor/AI into “Phase 0” is historical only (see `docs/archive/2026-08-08-pre-master-plan.zip`). Setup’s real scope is **0.1** (gate + per-day devlogs) and **0.2** (bare scaffold).

## Phases have multiple steps

Each phase’s `docs/phases/PHASE_N.md` lists numbered steps with acceptance criteria when that phase is active. Phases 2–8 and Deployment live in the master plan until their `PHASE_N.md` files are authored at phase start. Do not treat a whole phase as one undivided blob of work.

## End of every step (mandatory order)

1. **Test** — Run the step’s automated checks. Read the full output (exit code alone is not enough).
2. **Phase/step audit** — Cross-check results against that step’s acceptance list in `PHASE_N.md`. Diff-audit against intent (no drive-by scope; never stage `projects/` / `data/` / vault contents / secrets).
3. **Retest** — Re-run after any fixes. Score must be **100%** of required checks green.
4. **Fail rule** — **99% or below = fail.** Redo the step until 100%. No exceptions.
5. **Commit + push `main`** — App repo only (`origin` → public Storyworks). Message focuses on why.
6. **Devlog** — Append a `## HH:MM` entry to today’s `docs/devlogs/YYYY-MM-DD.md` in Jeremy’s first-person voice using [`docs/reference/authentic-voice-notes.md`](reference/authentic-voice-notes.md). Create the day file if needed. Commit + push the devlog if it was not in the same commit.
7. **In-chat verify list** — In the same reply that reports the step/fix done on the machine side, give Jeremy a short plain checklist (a couple of lines) of what to check live. No separate checklist file for routine step or bug-fix work.

No pausing for approval between steps inside a phase for automated work — but a step or fix is only **done** when Jeremy’s own words say so (see confirmation rules below).

## Human confirmation — in chat (locked, going forward)

Effective immediately for **step-level and bug-fix-level** work, replacing the file-based `PHASE_N_HUMAN_CHECKLIST.md` + gate-script pattern for routine verification:

1. When an agent finishes a step or a fix, it gives Jeremy a short, plain checklist **directly in the chat reply** — what to check, in a couple of lines — not a separate file he has to open.
2. Jeremy responds however he wants: walks that list, or does his own ad hoc testing, and reports back in his own words, screenshots, whatever. Both are valid confirmation.
3. **An agent never originates a human confirmation** — in a file, a commit message, a devlog, or chat — on Jeremy’s behalf. No “Jeremy confirmed X” unless he actually said so in his own message first. If he reports a bug instead of confirming, that is the real result; log that.
4. A step or fix is only “done” once Jeremy’s own words say so. **Absence of an objection is not confirmation.**

Historical `PHASE_0_HUMAN_CHECKLIST.md` / `PHASE_1_HUMAN_CHECKLIST.md` (and any already-published Phase 2 file checklist) stay as record. Do not rewrite them to invent clearance. This process applies going forward.

## End of every phase — FULL STOP (chat sign-off)

After the last step of a phase passes the step gate:

1. **FULL STOP.** Do not start the next phase.
2. Put the phase-closing summary **directly in the chat reply** — same rigor as the old human checklist (how to run, routes, click/keyboard paths, expected results, pass/fail items). Not a separate signed file for routine clearance going forward.
3. Wait for Jeremy’s own reply in chat as sign-off. Chat phrases invented by the agent are **not** clearance. Only Jeremy’s message counts.
4. Until he clears it: only fix reported failures — no next-phase scope.
5. On clear (Jeremy’s own words): update HANDOFF + phase status, commit/push, then begin next phase step 1.

The one rule carrying forward unchanged from the file era:

> **An agent never originates a human confirmation, in a file or in chat, on the human’s behalf.**

That is the part that failed twice — not the file format.

`scripts/check-phase-clear.sh` remains for historical checklist files only. Do not treat a green gate script (or a blank/absence of objection) as phase COMPLETE without Jeremy’s own confirmation in chat.

## Verifiable clearance (locked)

A phase status may read **COMPLETE** only when Jeremy has confirmed clearance **in his own chat message**. Agents may then update status docs to match what he said — they may not invent the confirmation first.

Writing “COMPLETE (human cleared)” (or equivalent) without that human message is a protocol violation.

## What “100%” means

- Every check listed for that step is green
- Audit finds no unmet acceptance item and no locked-rule regressions (Muse Tab/dismiss when Muse is in scope, theme rules as locked by current phase / Phase 1 visual system once published, dual VCS, archive→typed delete, markdown vault truth once that surface is in-phase)
- If the step marks “Jeremy manual pass required,” that pass is part of 100% for that step and requires Jeremy’s own words
- End-of-phase COMPLETE additionally requires Jeremy’s chat sign-off after the FULL STOP summary
