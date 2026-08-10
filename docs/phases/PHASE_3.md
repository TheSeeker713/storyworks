# Phase 3 — Novel & Screenplay (+ Codex foundation)

**Status: MACHINE STEPS DONE** (Jeremy ordered Phase 3→4 continuous build; no human FULL STOP between phases for this run only. Human clear waits at end of Phase 4.)

Standing law: [`docs/MASTER_PLAN.md`](../MASTER_PLAN.md). Design: IA + technical architecture + design-reference part-1 §§8–10.

## Steps

| Step | Name | Status |
|------|------|--------|
| 3.1 | Module identity + create paths (`novel` / `screenplay`) | done (machine) |
| 3.2 | Codex store + API (four types, progressions, spoiler filter) | done (machine) |
| 3.3 | Codex UI + Simple/Complex settings + header icon | done (machine) |
| 3.4 | Novel structure (chapter tabs, nested scene cards, jump-in-doc) | done (machine) |
| 3.5 | Screenplay (flat scenes, Fountain formatting, Describe/SDT menu shells) | done (machine) |
| 3.6 | Context trays + tool-creation list | done (machine) |
| 3.7 | Audit / tests / continue to Phase 4 (no inter-phase FULL STOP this run) | done (machine) |

## Out of scope

Muse/mention-detection / live Describe AI (Phase 5), Fountain/.fdx export (Phase 8), PENS canvas (Phase 6), typography finalization (OPEN).

## Machine notes (for Jeremy’s Phase 4 walk)

- Codex: Characters / Props / Worldbuilding / Scenes; progressions (add/replace); `progressions_for_ai` spoiler filter; silent stubs from Notes tags; Simple/Complex toggle in Codex panel.
- Novel: chapter tabs; tray expands to nested scene cards; scene click scrolls within one continuous chapter document (`<!-- scene:id -->` anchors).
- Screenplay: flat scene tray; Fountain-ish Enter transforms in WritingEditor; Describe / Show-don’t-tell are **UI stubs** until Phase 5.
- Creating Novel/Screenplay from Draft tray currently creates a **new** module project (does not convert the open draft).
