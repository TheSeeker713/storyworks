# Phase 1B — Human UI/UX checklist

**FULL STOP.** Do not start Phase 2 until every item is cleared.

## How to run

```bash
cd ~/Developer/storyworks && source .venv/bin/activate
uvicorn apps.api.app.main:app --reload --port 8787
```

```bash
cd ~/Developer/storyworks/apps/web && npm run dev
```

Open **http://127.0.0.1:5173/design**

Optional: drop real stills into `assets/backgrounds/`, run `./scripts/convert-backgrounds.sh`, reload. Without extra assets you should still see placeholder `bg-001` (or solid-color fallback if the manifest is empty).

---

## Full-bleed shell

- [ ] `/design` fills the browser edge-to-edge (no large letterbox / centered 1100px card page)
- [ ] Production topbar (Ollama/OpenClaw pills) is **not** on `/design`; brand lives in design chrome
- [ ] **Storyworks** brand is a strong signal and links back to `/`
- [ ] Light mode only — no dark mode toggle
- [ ] Daily webp (or solid fallback) sits **behind** UI; modules are opaque/solid

## Daily playlist + opacity

- [ ] “Today’s asset” shows an id (e.g. `bg-001`) or `fallback`
- [ ] Same asset persists across reloads on the same calendar day
- [ ] BG opacity slider dims/reveals the backdrop; value persists after reload
- [ ] Solid writing panels stay readable at low and high opacity

## Writing modules

- [ ] Switcher: Prompt / Note / Novel / Screenplay / Journal
- [ ] Each module is a **flat solid** panel (not a translucent glass card over the BG)
- [ ] Switching modules animates the stage; background parallax happens **once during** the transition, then stops
- [ ] Novel mock still states Muse: **Tab accept · any other key dismiss**

## Aides / hints

- [ ] Visible aide labels on brand, modules, opacity, today’s asset, panel, footer, drawer
- [ ] Hovering controls shows `title` tooltips that say what the control does

## R3F drawer

- [ ] **Open drawer** slides a side panel from the right
- [ ] WebGL card/plane animates inside the drawer (not as full-screen BG)
- [ ] Scrim click or **Escape** or **Close** dismisses the drawer

## Mobile (~375px)

- [ ] Chrome wraps without horizontal page overflow
- [ ] Module switcher usable; opacity + drawer still reachable
- [ ] Drawer fits viewport width

## Writing path preserved

- [ ] `/` still lists/creates projects (Phase 0 wire UI OK)
- [ ] Editor still autosaves; Muse Tab/dismiss still works on production editor
- [ ] No dark mode toggle appeared on production routes

## Sign-off

When clear, reply:

> Phase 1 human checklist cleared — proceed to Phase 2

| Field | Value |
|-------|--------|
| Tester | |
| Date | |
| Notes (BG assets, preferred module, drawer feel) | |

**Agents: do not begin Phase 2 until that clear is received.**
