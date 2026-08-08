# Acceptance criteria

## Phase 0 (v2 rebuild)

### Governance / enforcement (Step 0.1)

- [x] Per-day `docs/devlogs/YYYY-MM-DD.md` convention documented
- [x] `docs/PHASE_STEP_PROTOCOL.md` requires gate script before COMPLETE
- [x] `./scripts/check-phase-clear.sh` exists, executable, fails on unfilled checklist (proof in day-devlog)
- [x] AGENTS + core/phase-current rules state macOS-only + MyKAIA; Phase 0 NOT complete
- [x] No living false-clearance claims in `PHASE_0.md`, `HANDOFF.md`, this file

### Later Phase 0 steps

- [x] 0.2 New stack scaffold; old Vite product tree removed after rebuild-boundary commit
- [x] 0.3 Vault `.md` truth + SQLite cache; old storage replaced; continuous backup
- [ ] 0.4 Project list + TipTap vault-bound writing (canvas SDK removed; awaiting human verify)
- [x] 0.5 One local STT path proven; header toggle reflects real state
- [x] 0.6 Onboarding + AI master kill switch
- [x] 0.7 Muse Tab/dismiss optional path
- [x] 0.8 Human UI/UX checklist published; status awaiting clear (not COMPLETE)

### Human gate (required to leave Phase 0)

- [ ] Jeremy fills `docs/phases/PHASE_0_HUMAN_CHECKLIST.md` (all boxes + Tester + Date)
- [ ] `./scripts/check-phase-clear.sh docs/phases/PHASE_0_HUMAN_CHECKLIST.md` exits 0

**Note:** A prior claim that Jeremy cleared Phase 0 on 2026-08-06 was false (checklist never signed). That claim is void.

## Phase 1+

See phase docs. End of each phase: human UI/UX checklist FULL STOP + gate script.
