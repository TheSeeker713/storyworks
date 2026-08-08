# Handoff — current phase

1. **Storyworks v2 rebuild.** Prior Vite/Phase 0–1B line is historical only.
2. **Phase 0:** steps 0.1–0.3 and 0.5–0.8 machine-done. **0.4 revised 2026-08-08** — tldraw removed; project list + TipTap writing. Awaiting Jeremy live verify. Status: **FULL STOP — human UI/UX gate.** No third-party canvas SDK; custom canvas is Phase 3 (`PHASE_3_CUSTOM_CANVAS.md`).
3. Clear **`docs/phases/PHASE_0_HUMAN_CHECKLIST.md`** (project list + TipTap, not canvas), then run:

   ```bash
   ./scripts/check-phase-clear.sh docs/phases/PHASE_0_HUMAN_CHECKLIST.md
   ```

   Exit code must be **0**. Chat phrases alone do not clear.
4. **Do not start Phase 1** and do not mark Phase 0 COMPLETE until that script passes.
5. Run app: API `:8787` + `apps/web` `npm run dev` → http://127.0.0.1:3000
6. Protocol: `docs/PHASE_STEP_PROTOCOL.md`. Devlogs: `docs/devlogs/YYYY-MM-DD.md`.
7. Platform: **macOS only.** Long-term: MyKAIA Big App micro-app absorption.
8. Dual VCS: never stage vault contents, `projects/`, or `data/` into the app repo.

When Phase 0 is cleared (gate script + filled checklist): update this file for Phase 1.
