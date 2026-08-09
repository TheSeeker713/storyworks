# Phase 2 — Data & Draft Screen human checklist

Agents never fill the sign-off table. Jeremy types Tester / Date / Result himself after a live walk.

**Prior result (2026-08-09): FAIL** — post-onboarding forced Home + typed project name before writing. Fix shipped; re-walk from a clean browser state (or clear `localStorage` keys `storyworks.view` / re-onboard) before signing Pass.

## How to run

API terminal:

```bash
cd ~/Developer/storyworks
```

```bash
source .venv/bin/activate
```

```bash
uvicorn apps.api.app.main:app --reload --port 8787
```

Web terminal (separate):

```bash
cd ~/Developer/storyworks/apps/web
```

```bash
npm run dev
```

Open http://127.0.0.1:3000

## Checks

### Zero-friction writing (must pass)

- [ ] After onboarding (or Open vault on an empty/new vault), land on **Draft Screen**, not Home — tab **Untitled draft**, cursor live, no name field first
- [ ] Type immediately; wait ~1s; refresh the page — text still there (autosave)
- [ ] Header **Home** opens triage list; writing is not gated behind Home
- [ ] On Home, one click **New project** (no typing) creates untitled and opens Draft

### Rest of Phase 2

- [ ] Home list/grid shows title, module/type, last-modified
- [ ] Archive / restore / typed-name delete work from Home
- [ ] Header project switcher jumps between projects; Home still reachable
- [ ] Draft Screen: two-tier menu, Sublime-style tabs, + new tab
- [ ] Right-click on writing surface shows context menu
- [ ] Zen via control; Esc exits Zen (does not enter Zen)
- [ ] Left tray edge reveals structure; PENS shows coming soon
- [ ] Content under `books/main/folders/main/content/`
- [ ] History UI lists per-project git commits after edits
- [ ] Light chrome uses Phase 1 color tokens; typography still temporary system stack

## Sign-off

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Result | |

(Previous fail recorded in git history / prior Result: fail — blank the table for the re-walk.)
