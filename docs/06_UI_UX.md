# UI / UX

## Locked constraints

- Light mode only
- Gold reflecting borders / chrome direction
- Muse: ghost text, Tab accept, other key dismiss
- Archive → typed-name delete

## Surfaces

| Route | Role |
|-------|------|
| `/` | Project browser (Phase 0 wire until Phase 1 clear) |
| `/project/:id` | Writing surface (preserve) |
| `/design` | **Phase 1B workbench** — full-bleed studio shell |

## Phase 1B shell law (sandbox)

- **Full-bleed:** `/design` is edge-to-edge at max browser size. No centered card-page chrome.
- **Layer stack (back → front):** daily webp playlist → dim veil → solid module stage → R3F drawers → aides.
- **Daily BG (Playlist A):** shuffle once → one image per calendar day → loop / reshuffle at end of cycle → same image all day. State in `localStorage`.
- **Opacity:** global control dims the webp; modules stay solid/opaque.
- **Parallax:** only during transitions between maxed modules; static afterward.
- **R3F:** side panels / drawer card systems only — never the daily full-screen background.
- **Writing modules:** Prompt / Note / Novel / Screenplay / Journal as flat solid panels.
- **Aides:** every control has a visible label and/or hover hint.
- **Assets:** `assets/backgrounds/` → `scripts/convert-backgrounds.sh` → `apps/web/public/backgrounds/` + `manifest.json`.

Phase 0 = wire UI on production routes. Phase 1B iterates the shell in `/design` before production chrome ships.
