# Phase 1 — Design

**Status: IN PROGRESS — AWAITING HUMAN SIGN-OFF.** Seven design artifacts are in the repo. Do **not** mark COMPLETE and do **not** start Phase 2 until Jeremy fills the sign-off table in [`PHASE_1_HUMAN_CHECKLIST.md`](PHASE_1_HUMAN_CHECKLIST.md) himself and `./scripts/check-phase-clear.sh` exits 0 on that file.

Standing law: [`docs/MASTER_PLAN.md`](../MASTER_PLAN.md). No functioning app ships from this phase. Artifacts below are what Phase 2+ will build against after clear.

## Required outputs (present; awaiting human review)

| # | Output | Location |
|---|--------|----------|
| 1 | Product thesis and target customer | [`docs/design/storyworks-design-reference-part-1.html`](../design/storyworks-design-reference-part-1.html) § thesis |
| 2 | Full feature list by tool (Novel, Screenplay, Blog, Notes, Journal, PENS + AI-agentic capabilities) | same HTML, features section |
| 3 | Pain-point-driven design principles (want vs need) | same HTML, principles section |
| 4 | Wireframes / static mockups (core screens) | Part 1 + [`docs/design/storyworks-design-reference-part-2.html`](../design/storyworks-design-reference-part-2.html) |
| 5 | Information architecture | [`PHASE_1_INFORMATION_ARCHITECTURE.md`](PHASE_1_INFORMATION_ARCHITECTURE.md) |
| 6 | Technical architecture | [`PHASE_1_TECHNICAL_ARCHITECTURE.md`](PHASE_1_TECHNICAL_ARCHITECTURE.md) |
| 7 | Visual system / tokens | [`PHASE_1_VISUAL_TOKENS.md`](PHASE_1_VISUAL_TOKENS.md) |

## Open gaps (do not invent)

1. **Project switcher** — IA § “Navigation, the real gap”: no resolved top-level switch-between-Projects screen. Resolve early in Phase 2 after clear; later modules assume it exists. Do not invent without asking Jeremy.
2. **Typography** — Visual tokens § “Typography, OPEN”: system font in wireframes was placeholder only. Resolve before type-sensitive UI ships. Dark-mode token values also OPEN.

See [`docs/HANDOFF.md`](../HANDOFF.md) for the cold-start callout.

## Carry-forward

Existing vault write path, gate script, and archive/restore/delete lifecycle remain a **working reference**, not sacred. Phase 2 checks each piece against these design docs after Phase 1 clears.

## Next

Phase 2 — Data & Draft Screen — **only after** Jeremy’s real sign-off and a passing gate script. See master plan.
