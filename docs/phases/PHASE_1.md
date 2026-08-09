# Phase 1 — Design

**Status: IN PROGRESS** — Jeremy + Claude only. No Cursor product implementation. No functioning app ships from this phase.

Standing law: [`docs/MASTER_PLAN.md`](../MASTER_PLAN.md).

## Required outputs (gate before Phase 2)

These must exist as real documents before Phase 2 may begin. Do not fill them in this governance pass; they are produced in the Jeremy+Claude design session.

1. Product thesis and target customer, locked
2. Full feature list by tool: Novel, Screenplay, Blog, Notes, Journal, PENS — each with AI-agentic capabilities named explicitly
3. Pain-point-driven design principles, want vs need, sourced from research already done
4. Wireframes or static mockups for every core screen: onboarding, Draft Screen, each module’s writing surface, PENS, Settings, the tool tray, Cmd+K
5. Information architecture doc: Projects → Books → Folders → Content, Codex, how they nest and navigate
6. Technical architecture on paper: vault `.md`-as-truth + SQLite-as-cache, canvas scoped to PENS only (engine researched fresh, license-checked before adoption), editor library choice, AI model roles, Lite vs Full build split
7. Visual system: color tokens (blues/greens/light-browns/reflective-gold), light default with dark available as a setting, typography, component states

## Carry-forward

Existing vault write path, gate script, and archive/restore/delete lifecycle are a **working reference**, not sacred. Phase 2 checks each piece against these design docs.

## Human checklist

Publish `PHASE_1_HUMAN_CHECKLIST.md` when the seven outputs are ready (document gate + sign-off). The old 1B `/design` checklist is superseded and archived in [`docs/archive/2026-08-08-pre-master-plan.zip`](../archive/2026-08-08-pre-master-plan.zip).
