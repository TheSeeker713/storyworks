# Acceptance criteria

Standing law: [`docs/MASTER_PLAN.md`](MASTER_PLAN.md).

## Phase 0 — Setup

### 0.1 Governance / enforcement

- [x] Per-day `docs/devlogs/YYYY-MM-DD.md` convention documented
- [x] `docs/PHASE_STEP_PROTOCOL.md` requires gate script before COMPLETE
- [x] `./scripts/check-phase-clear.sh` exists, executable, fails on unfilled checklist
- [x] AGENTS + rules state macOS-only + MyKAIA

### 0.2 Bare scaffold

- [x] New stack scaffold (Next.js / FastAPI / `engine/`); old Vite product tree removed after rebuild-boundary commit

**Phase 0 Setup status: DONE** for 0.1–0.2 only.

### Superseded (old Phase 0 shape — not COMPLETE)

These were built under a prior phase map. They are working reference code, not Setup deliverables, and are not marked COMPLETE under any phase:

- ~~0.3 Vault `.md` truth + SQLite cache~~ — reference
- ~~0.4 Project list + TipTap~~ — reference
- ~~0.5 Local STT~~ — reference
- ~~0.6 Onboarding + AI master kill~~ — reference
- ~~0.7 Muse optional path~~ — reference
- ~~0.8 Old human UI checklist~~ — **superseded** (not completed, not failed); archived in `docs/archive/2026-08-08-pre-master-plan.zip`

Do not run `check-phase-clear.sh` against the archived old Phase 0 checklist for clearance.

## Phase 1 — Design

- [x] Seven design outputs present (see `docs/phases/PHASE_1.md`)
- [x] OPEN gaps recorded in HANDOFF: Project switcher; Typography
- [x] `docs/phases/PHASE_1_HUMAN_CHECKLIST.md` published
- [x] Jeremy signed Tester + Date + Result (direct instruction after his review; prior agent self-sign was void)
- [x] `./scripts/check-phase-clear.sh docs/phases/PHASE_1_HUMAN_CHECKLIST.md` exits 0

**Phase 1 Design status: COMPLETE** (2026-08-09).

## Phase 2+

See `docs/MASTER_PLAN.md` and phase docs when authored. End of each production phase: human checklist FULL STOP + gate script. Phase 2 is unblocked; first real step is a separate conversation. Resolve the Project switcher gap early.
