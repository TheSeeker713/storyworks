# Storyworks — Master Production Plan (resolved)

This document governs the full build, Setup through Deployment. It supersedes
all prior phase structures. Any future agent, including a freshly-switched
one with no memory of this project's history, should be able to read this
document alone and understand the shape of the whole build.

Pre-master-plan phase docs and old per-step devlogs:
`docs/archive/2026-08-08-pre-master-plan.zip`.

---

## Governing rule for every phase, no exceptions

Steps chain automatically within a phase: implement → test (full raw output,
not a summary) → audit against that step's own acceptance criteria →
retest to 100% → **commit → push `main` → append that day's devlog entry
in first person**, in that order, before moving to the next step or
reporting anything as done. No pausing for approval between steps.

The **only** human checkpoint inside a phase is the end-of-phase FULL STOP.
Going forward, that checklist lives in chat; Jeremy’s own reply is sign-off.
An agent never originates a human confirmation. A phase may not be marked
COMPLETE any other way. Details: `docs/PHASE_STEP_PROTOCOL.md`.

Cursor never boots a server, runs `npm run dev`, runs `uvicorn`, or opens a
browser, under any circumstance. Jeremy alone tests live, every time. Cursor's
own testing is limited to `pytest`, build, lint, typecheck, static code
audits, and reading source to trace bugs.

---

## Phase 0 — Setup

Only job: prove the machinery works. Nothing user-facing. No vault logic,
no onboarding, no editor, no AI, no design decisions. If it produces
something a user could look at and judge, it isn't Setup.

- **0.1** (top priority, blocks everything else): build and prove, with raw
  executed output, the clearance gate script and the per-day devlog
  protocol. This is the mechanism every later phase's honesty depends on.
- **0.2**: bare repo scaffold. Empty Next.js/React/TS/Tailwind shell, empty
  FastAPI shell with a health check, `engine/` package stub. `pytest`,
  build, and lint all green on nothing.

**Status:** Done for this real scope (0.1 and 0.2 only).

---

## Phase 1 — Design

No functioning app comes out of this phase. Just Jeremy and Claude,
producing artifacts Cursor builds against later. This phase did not exist
in the prior structure, and its absence is what caused the tldraw license
scramble and the shipped UI bugs. It is not optional this time.

Required outputs before Phase 2 may begin:

1. Product thesis and target customer, locked
2. Full feature list by tool: Novel, Screenplay, Blog, Notes, Journal, PENS
   (Procedural Editor for Nonlinear Storytelling), each with its AI-agentic
   capabilities named explicitly
3. Pain-point-driven design principles, want vs need, sourced from research
   already done
4. Wireframes or static mockups for every core screen: onboarding, Draft
   Screen, each module's writing surface, PENS, Settings, the tool tray,
   Cmd+K
5. Information architecture doc: Projects → Books → Folders → Content,
   Codex, how they nest and navigate
6. Technical architecture decided on paper: vault `.md`-as-truth +
   SQLite-as-cache, canvas scoped to PENS only (engine researched fresh,
   license-checked before adoption), editor library choice, AI model
   roles, Lite vs Full build split
7. Visual system: color tokens (blues/greens/light-browns/reflective-gold),
   light default with dark available as a setting, typography, component
   states

**Existing code carry-forward, resolved:** the current repo's vault write
path, gate script, and archive/restore/delete lifecycle were built and
tested, but never designed against real artifacts. They are treated as a
**working reference implementation, not a sacred asset.** Phase 2 opens by
checking each piece against the Phase 1 design docs: what still fits gets
kept and reused, what doesn't gets rebuilt. Nothing carries forward by
default just because it already exists; nothing gets discarded by default
just because Phase 1 is new. Each piece earns its place against the design.

---

## Phases 2 through 8 — Production

- **Phase 2 — Data & Draft Screen.** Vault engine (re-verified against
  Phase 1 design, kept or rebuilt per the resolution above), Project/Book/
  Folder lifecycle, archive/restore/delete, the Draft Screen (two-tier
  menu, Sublime-style tabs, always-available right-click menu, Esc-driven
  Zen mode), version history surfaced as a real visible feature on top of
  the existing per-project git.
- **Phase 3 — Novel & Screenplay.** The two manuscript-shaped tools, plus
  the Codex foundation (Characters, Props, Worldbuilding, Scenes), since
  both lean on it immediately.
- **Phase 4 — Notes, Journal, Blog.** The three lighter-weight tools.
- **Phase 5 — AI agentic layer.** Muse, STT, the sandboxed-AI-draft +
  human-approval-gate system, author/AI word-count provenance tracking,
  applied across all five tools built so far.
- **Phase 6 — PENS.** The custom in-house canvas, MIT-licensed or
  hand-rolled, license-checked before any code is written, scoped only to
  this module, not the whole app. Isolated on its own phase so it can't
  block anything else if it runs long.
- **Phase 7 — Onboarding, Settings, product split.** Vault picker, AI
  opt-out flow ("Do you hate AI?"), master kill switch, Lite (no AI code
  present) vs Full (local AI + BYOM) build variants, GPU/CPU install
  messaging, BYOM local-and-API options with third-party data disclosure
  warnings, cloud backup via plain folder location (iCloud Drive/Dropbox/
  Google Drive sync folders, no OAuth or API integration required).
- **Phase 8 — Export/Publish.** EPUB/PDF/Fountain/.fdx per module, as
  appropriate. Previously an unscoped gap, now a real phase.

---

## Final Phase — Deployment

Tauri packaging (Rust shell, Python/FastAPI sidecar, bundled `llama.cpp`/
`mlx-serve`-style embedded inference for the Full build, no external Ollama
dependency required). Code signing, notarization, installer. One-time
purchase pricing infrastructure for both tiers (Lite free/donation, Full at
or below Scrivener's ~$49–60 one-time). Store or direct-distribution
decision.

---

## What happens next

Phase 1 (Design) begins now, as a Jeremy-and-Claude-only working session.
Nothing goes to Cursor until Phase 1's seven outputs exist as real
documents. This plan itself is the standing reference for that entire
sequence going forward.
