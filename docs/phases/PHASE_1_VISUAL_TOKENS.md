# Storyworks — Visual Token Sheet (Phase 1 Output 7)

These are the real values used consistently across every wireframe in the
design reference, not placeholders. Two things below are genuinely
unresolved, marked OPEN, don't invent an answer.

## Color

| Token | Value | Use |
|---|---|---|
| `--sw-teal` | `#1B4B43` | Header, primary chrome |
| `--sw-forest` | `#2D5940` | Secondary chrome, active/selected states |
| `--sw-sage` | `#8AA888` | Accent, muted highlight |
| `--sw-driftwood` | `#A68A6D` | Secondary text, subtle labels |
| `--sw-parchment` | `#FBF8F1` | Writing-zone canvas background. Brightened from an earlier `#F7F3EA`, this is the corrected, confirmed value. |
| `--sw-parchment-deep` | `#EFE8D8` | Chrome surfaces: tab bar, footer. Deliberately darker than the writing zone for contrast, do not use the same tone for both. |
| `--sw-gold` | `#C9A227` | The one bright metal accent. Never a fill color for general UI. Reserved for primary actions and the gold bezel (LiquidGlass, see technical architecture doc). |
| `--sw-ink` | `#2A2A26` | Primary text |
| `--sw-ink-muted` | `#6B6656` | Secondary text |
| `--sw-ink-faint` | `#A6A192` | Tertiary text, hints, disabled states |
| `--sw-border` | `#DDD5C4` | Default hairline border |

Semantic pairs (used for status/state, not general decoration):

| Token | Background | Text | Border | Meaning |
|---|---|---|---|---|
| Success/positive | `#EAF3DE` | `#3B6D11` | `#97C459` | Completed steps, positive branch outcomes, kept items |
| Warning/pending | `#FAEEDA` | `#854F0B` | `#EF9F27` | Awaiting review, set-aside items, negative branch outcomes, recovery-critical warnings |

**Dark mode**: reversed from an earlier hard "never" rule, now a real
Settings option given commercial distribution. **OPEN**: dark-mode token
values were never specified, every wireframe this whole session was built
light-only. Do not invent dark equivalents of the above without a real
design pass.

## Typography

**OPEN, genuinely unresolved.** Every wireframe across both parts of the
design reference used the system UI font stack (`-apple-system, "SF Pro
Text", "Segoe UI", sans-serif`) as a placeholder for layout purposes. No
typeface decision was ever made for the shipped product, headings,
body text, or the monospace treatment used in Screenplay. Do not treat
the system font as a locked decision, it was never chosen on purpose.

What is confirmed: Journal's body text renders larger (18px in
wireframes) than other modules' writing surfaces (14–15px), and
Screenplay uses a monospace font for its Fountain-style formatting
specifically. Beyond that, resolve typography as its own real decision
before Phase 2 ships type-sensitive UI.

## Spacing & shape

- Card corner radius: `8px` for compact UI cards (buttons, badges,
  Codex entry cards), `10–12px` for containing panels/frames
- Card border: `1px solid var(--sw-border)`, `2px` or a color-swap only
  for deliberate emphasis (e.g. a selected Codex card getting a gold
  border instead of the default)
- Badge/pill: `border-radius: 14–20px` (fully rounded), `10–11px` font

## Button depth treatment (the confirmed app-wide standard)

CSS only, no WebGL, no images. Applies to every button in the app except
the gold bezel itself.

```css
.button {
  background: linear-gradient(180deg, #356B58, #1F4A3D);
  border: 1px solid #163A30;
  border-radius: 8px;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.18) inset,
    0 3px 0 #123529,
    0 6px 10px rgba(0,0,0,0.22);
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.25) inset,
    0 5px 0 #123529,
    0 10px 16px rgba(0,0,0,0.28);
}
.button:active {
  transform: translateY(2px);
  box-shadow: 0 1px 3px rgba(0,0,0,0.35) inset;
}
```

A secondary "ghost" button variant (used for Cancel-style actions) uses a
light gradient (`#FFFFFF` to `#F3EEE1`) with the same shadow/press
mechanics, and a "gold primary" variant (used for the single main action
on a screen, e.g. onboarding's Continue) swaps the gradient to
`#D9AE2E`→`#B8891A` with a matching darker shadow stack. Never more than
one gold-primary button visible on a screen at once, it marks the one
main forward action, not a general accent.

## Toggle switch

`32px × 18px` (or `30px × 17px` in denser contexts like Settings), pill
shape, `14px` circular thumb. On-state: `background: var(--sw-teal)`,
thumb right. Off-state: `background: var(--sw-border)`, thumb left,
thumb color `#FFFFFF` to distinguish from the on-state thumb's
`--sw-parchment`.

## Icon set

Tabler Icons (outline style) were used throughout every wireframe for
convenience during the design pass. **This was not a deliberate,
confirmed decision about the shipped icon library**, it's what was
available in the design tool. Confirm or replace before treating it as
locked.

## Component patterns to carry forward exactly

- **Card minimize/expand**: minimized state shows title + one-line
  subject only, fixed max-width, wraps and scrolls rather than growing
  unbounded. Expanded state gets its own zen/focus chrome. Applies
  identically to Codex entries, Novel scene cards, and any future card
  type.
- **Reveal-on-demand chrome**: the left tray, the scratchpad's pool
  panel, and Blog's "set aside" badge all follow the same rule, don't
  render UI chrome for a state that has nothing in it yet. Apply this
  rule to any future panel/badge that can legitimately be empty.
- **Non-blocking AI review**: an AI suggestion a user hasn't acted on
  never blocks continued writing, and never silently disappears if
  ignored. "Set aside" (not "archive", that word is reserved for the
  Project-level lifecycle) moves it out of the way, retrievable via a
  small badge, until explicitly revisited.
