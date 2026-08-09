# Phase 2 — Data & Draft Screen

**Status: AWAITING HUMAN UI/UX CLEAR — FULL STOP.**

Do **not** mark COMPLETE and do **not** start Phase 3 until Jeremy fills [`PHASE_2_HUMAN_CHECKLIST.md`](PHASE_2_HUMAN_CHECKLIST.md) and `./scripts/check-phase-clear.sh` exits 0. Agents never write the sign-off table.

Standing law: [`docs/MASTER_PLAN.md`](../MASTER_PLAN.md). Project switcher Option 3 resolved in IA. Typography remains OPEN.

## Steps

| Step | Name | Status |
|------|------|--------|
| 2.1 | Vault engine re-verify against Phase 1 | done (100%) |
| 2.2 | Project → Book → Folder → Content hierarchy + migration | done (100%) |
| 2.3 | Home list/grid + header switcher + lifecycle UI | done (100%) |
| 2.4 | Draft Screen chrome (menu, tabs, context menu, Zen, tray shell) | done (100%) |
| 2.5 | Per-project git + version history UI | done (100%) |
| 2.6 | Human checklist + FULL STOP | done (100%) — waiting on human |

## Keep vs rebuild (2.1 audit)

- **Kept:** md-as-truth atomic write, SQLite WAL index, conflict hash, project archive/restore/typed-delete, TipTap autosave path, vault backup snapshots, onboarding vault picker (reference until Phase 7).
- **Rebuilt/extended:** on-disk hierarchy (Books/Folders/Content), migration from flat `content/`, `engine/committer.py` + History UI, Home list/grid + header switcher, Draft Screen chrome.

## Out of scope (unchanged)

Novel/Screenplay/Codex depth, Notes/Journal/Blog modules, AI layer, PENS canvas, Lite/Full, product typography, dark-mode tokens.
