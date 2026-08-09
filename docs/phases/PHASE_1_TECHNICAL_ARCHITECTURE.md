# Storyworks — Technical Architecture (Phase 1 Output 6)

Every decision below was reached with real research behind it, not
assumption, sources are named so a future agent can re-verify rather than
take this on faith. Where something is genuinely undecided, it's marked
OPEN, do not resolve an OPEN item silently.

## Platform

macOS only. No Windows, no Linux target. Stated explicitly in `AGENTS.md`
and core `.cursor/rules` already, carry it forward.

## Stack

- Frontend: Next.js (static export mode) + React 19 + TypeScript + Tailwind
- Editor: TipTap (ProseMirror), confirmed working, this was never the
  problem in the canvas investigation
- Backend: Python FastAPI + SQLite WAL
- AI/agents: `engine/` Python package, Ollama-first connector pattern
  already built and working
- Packaging: stays local dev-server-in-browser through Phase 1 Design and
  early Production. Tauri (Rust shell, WKWebView, Python sidecar) is the
  deliberate later packaging step, documented, not built yet.

## Canvas engine, resolved with real research

**There is no general app-wide canvas.** This was investigated in depth:
tldraw fit the product best technically but requires a paid commercial
license or a permanently-watermarked hobby license for anything beyond
localhost development, incompatible with Storyworks' commercial
trajectory under Mycelia Interactive LLC. Excalidraw (MIT-licensed) was
evaluated as an alternative and rejected, its extensibility model can't
cleanly host a custom shape with a real embedded editor the way tldraw's
`ShapeUtil` system can (confirmed by reading Excalidraw's actual
`renderEmbeddable` docs, not assumed). The decision: **drop third-party
canvas SDKs entirely.** The main app uses the Draft Screen (plain
writable surface, TipTap, no canvas) as the primary writing surface.

**PENS is the one exception, and it's roadmap-only.** PENS needs its own
node-graph canvas, plus a genuinely robust state/intelligence system
(tracked variables, condition evaluation, e.g. "if trust > 5"), plus a
dedicated React Three Fiber / WebGL visual layer, a deliberate, isolated
exception to "no WebGL outside the gold bezel." This is correctly scoped
as roughly doubling the build effort of the rest of the app combined.
**Do not build PENS' real functionality in near-term phases.** The tray
icon exists; clicking it shows a "coming soon" state (see wireframe in
Part Two of the design reference).

**OPEN**: where PENS' tracked state (e.g. "trust between two characters")
actually lives, a manual field, something inferred from Codex
progressions, or a separate variable system PENS introduces, is not
decided. Resolve this when PENS gets its real phase, not before.

## Data model

- Vault: plain `.md` files in a user-chosen directory (Obsidian-vault
  pattern), this is the **source of truth**.
- SQLite: fast write-layer cache and search index, **not** the source of
  truth. Specifically enables crash recovery, a write between two `.md`
  saves survives an unexpected shutdown, recovered and shown to the user
  on next launch (see the recovery banner wireframe).
- Version control: per-project local git, already built and working from
  earlier phases, this is the real "time machine," independent of
  whatever any cloud sync layer does or doesn't preserve.
- Data hierarchy: see information architecture doc. Codex entries carry
  **progressions**, timestamped state changes (addition or replacement
  mode) bound to a manuscript point. AI context for a given point in the
  story only sees progressions up to that point, never future ones, this
  is the spoiler-safety mechanism and must be enforced at the data layer,
  not just the UI layer.

## AI model roles, locked

- Writing / Muse / auto-title: `huihui_ai/qwen3-abliterated:14b`
- Agentic pipelines / classification: `qwen2.5-coder:7b`
- **Fail closed if either is missing** from `ollama list` on the actual
  machine. Never silently substitute. Run `ollama list` and report
  reality rather than assuming the lineup is present.

## Speech-to-text

Local only. Accuracy option: Whisper large-v3. Speed option: NVIDIA
Parakeet (notably fast on Apple Silicon). User-selectable in Settings, not
hardcoded. An existing local `mlx_audio`-based environment was found and
repaired earlier in this project (`voice-env`), containing both engines
already, prefer reusing and extending that over a fresh install.

## OpenClaw, three gated roles

All off by default, independently toggleable:
1. Research bridge (online lookups via Grok)
2. Git bridge (commit/push assistance for story-project git only, never
   the app repo)
3. Agentic pipelines (card-to-card automation, e.g. Notes → Screenplay)

Each must degrade gracefully when unavailable (Grok credits exhausted,
network down, etc.), never crash or hang the app.

## Settings-via-agent, a real technical requirement

The AI assistant needs **direct, permitted access to toggle app settings**
on natural-language request ("I don't like this, turn it off"), not just
the ability to describe what a setting does. This is a distinct
capability from content generation and needs its own tool/function
surface against the settings API. Both the Settings search bar and Cmd+K
expose this same mechanic as two entry points into one underlying
capability.

## Journal encryption, researched pattern

Private Journal Books use local encryption plus a password, no cloud
account, no 2FA (impossible for a genuinely local-first app with no
server). Recovery pattern, confirmed against real precedent
(Cryptomator's model, explicitly preferred over Notesnook's
server/email-based recovery which requires an account): a **one-time,
human-readable recovery key** shown once at Book-creation time,
independent of the password. Password forgotten → recovery key gets you
back in. Both lost → the Book's contents are unrecoverable, stated
plainly to the user at creation, not buried in fine print. Pair with
macOS Keychain + Touch ID for smooth daily unlock; the recovery key
remains the true fallback for a lost Keychain or new machine.

## Journal map view, researched stack

Fully open-source, no Google dependency: **MapLibre GL** (MIT, WebGL
renderer) + **OpenStreetMap** data (ODbL) + **PMTiles** (offline-native
tile format) + the existing `maplibre-offline-pmtiles` plugin for
download/cache management. **OpenFreeMap** offers free pre-generated
global tiles (MIT), removing the need to run tile-generation
infrastructure. Real shipped precedent for this exact privacy posture:
Organic Maps, CoMaps (both open-source, both macOS-supported, both
explicitly built to not track users). Opt-in, off by default.

## iPad + Apple Pencil drawing

**Sidecar is a system-level macOS/iPadOS feature, not something Storyworks
builds.** "All Mac apps work with Sidecar" per Apple's own documentation,
this is a matter of the app's canvas responding well to pressure/tilt
input, not a custom mirroring integration. The app still runs entirely on
the Mac; the iPad only displays and sends input. Disclosure copy shown to
the user is **liability framing, not a technical safety claim**: "we
didn't build this, we don't control it, read Apple's own documentation if
you want to, proceed at your own risk." Do not present this as a verified
privacy audit, it isn't one.

A genuine standalone native iPad app (not mirroring) is a completely
different, much larger idea, logged as its own future phase, explicitly
not started.

## Drawing toolkit

Icon-triggered popup, two input choices only (Connect to iPad / Use
trackpad), both leading to the **same** eight-tool kit (freehand, eraser,
line, square, rectangle, triangle, circle, oval). Shape tools are not a
third parallel choice alongside input method, they're part of the
drawing surface regardless of input device.

## Visual/interaction patterns

- Button depth: pure CSS (gradient background, layered `box-shadow`,
  `translateY` on hover/press), confirmed as the app-wide standard.
  See visual token sheet for exact values.
- LiquidGlass (`@ybouane/liquidglass`, real WebGL library, loads via
  `cdn.jsdelivr.net`) is reserved **specifically for the gold bezel**,
  nowhere else. It could not be validated visually inside the design
  sandbox (three attempts failed to render despite the library loading
  and initializing without error, diagnosed as an iframe/sandbox
  limitation, not a flaw in the library, it runs correctly in production
  on myceliainteractive.com). **Verify it for real in an actual dev
  build before relying on it**, don't trust the sandbox result either
  way.
- Zen mode: Esc **closes** it, never opens it. Entry needs a visible,
  discoverable icon with mouse-over hints (toggleable in Settings).
  Journal defaults to Zen mode on entry (the one module-level exception
  to Draft Screen's opt-in default), with a Normal-mode toggle to back
  out.
