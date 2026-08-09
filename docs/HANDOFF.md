# Handoff — current phase

1. **Master plan is law:** [`docs/MASTER_PLAN.md`](MASTER_PLAN.md).
2. **Phase 0 Setup** is done (0.1 + 0.2 only).
3. **Phase 1 Design is COMPLETE** (2026-08-09). Jeremy reviewed the five design docs and signed [`docs/phases/PHASE_1_HUMAN_CHECKLIST.md`](phases/PHASE_1_HUMAN_CHECKLIST.md); `./scripts/check-phase-clear.sh` exits 0. Artifacts:
   - Wireframes / thesis / features / principles: [`docs/design/storyworks-design-reference-part-1.html`](design/storyworks-design-reference-part-1.html), [`part-2.html`](design/storyworks-design-reference-part-2.html)
   - IA: [`docs/phases/PHASE_1_INFORMATION_ARCHITECTURE.md`](phases/PHASE_1_INFORMATION_ARCHITECTURE.md)
   - Tech: [`docs/phases/PHASE_1_TECHNICAL_ARCHITECTURE.md`](phases/PHASE_1_TECHNICAL_ARCHITECTURE.md)
   - Visual tokens: [`docs/phases/PHASE_1_VISUAL_TOKENS.md`](phases/PHASE_1_VISUAL_TOKENS.md)
4. **OPEN gaps (do not invent — ask Jeremy):**
   - **Project switcher:** IA § “Navigation, the real gap” — no resolved top-level switch-between-Projects UI. Resolve early in Phase 2; later modules assume it exists.
   - **Typography:** Visual tokens § “Typography, OPEN” — wireframe system fonts were placeholders. Resolve before type-sensitive UI ships. Dark-mode token values also OPEN.
5. **Next: Phase 2 — Data & Draft Screen** (unblocked). First real step is a separate conversation — do not start Phase 2 implementation until that session. Check existing vault / TipTap / archive-delete reference code against Phase 1 docs; keep what fits, rebuild what doesn’t.
6. Protocol: [`docs/PHASE_STEP_PROTOCOL.md`](PHASE_STEP_PROTOCOL.md) — agents never write checklist sign-off fields unless Jeremy provides the exact text to write. Dual VCS: never stage vault / `projects/` / `data`. Agents never boot servers or browsers.
7. Pre-master-plan history: [`docs/archive/2026-08-08-pre-master-plan.zip`](archive/2026-08-08-pre-master-plan.zip).
