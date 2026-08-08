# Phase 3 — Custom in-house canvas (after Phase 2)

**Not started.** Phase 0 and Phase 1 must clear first; Phase 2 production work proceeds without a third-party canvas SDK.

## Decision context

2026-08-08 license spike (`docs/build_log/2026-08-08-canvas-license-spike-excalidraw.md`):

- tldraw was the best technical fit for TipTap cards + freehand + nested worlds, but its SDK license conflicts with Storyworks → Mycelia → MyKAIA commercial trajectory (paid license or permanent watermark).
- Excalidraw (MIT) does not cleanly support custom TipTap card shapes (`renderEmbeddable` is an iframe override, not ShapeUtil).
- React Flow (MIT) fits cards + edges but is a node-graph UX, not the locked writing-surface product shape.
- **Call:** no third-party canvas SDK. Build our own later, under this phase, with a real research/spike process — not under license panic.

## Scope (when this phase opens)

Design and implement an in-house infinite canvas:

- Pan / zoom
- Nested “worlds within worlds” (breadcrumb-navigable)
- Custom card shapes with TipTap mounted inside
- Node / arrow bindings for pipelines (Notes → Screenplay → …)
- No third-party canvas SDK dependency

## Gate

Same step protocol as other phases: test → audit → 100% → commit → day-devlog. Human checklist + `check-phase-clear.sh` before COMPLETE.
