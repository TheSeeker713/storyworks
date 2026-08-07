# Design notes — Phase 1B

Primary workbench: live `/design` route (full-bleed).

## Preferred direction (this redesign)

- Edge-to-edge studio shell; brand in the design chrome (links home)
- Atmosphere from daily **webp** playlist, not a flat fill alone
- Writing surfaces are **solid** modules (Prompt / Note / Novel / Screenplay / Journal)
- Opacity slider for BG; parallax only on module switch
- R3F reserved for drawer/card prototypes (`DrawerR3F`)
- Visible aides + `title` hints on every control
- Fonts: Fraunces (display) + Manrope (UI); gold atelier tokens; light only

## Rejected

- Previous Phase 1 tab chrome (tokens/projects/editor tabs as the main sandbox)
- Full-screen R3F as the daily background
- Translucent “glass” writing cards over the photo
- Dark mode, purple gradients, cream+terracotta broadsheet cliché, emoji clutter

## Tooling

```bash
# Drop jpg/png/webp into assets/backgrounds/ then:
./scripts/convert-backgrounds.sh
# --help / --dry-run supported
```

Converted files are tracked under `apps/web/public/backgrounds/`. Raw dumps under `assets/backgrounds/raw/` stay gitignored.

## After human clear

Port approved shell patterns into production `/` and editor — that is Phase 2+, not this checklist.
