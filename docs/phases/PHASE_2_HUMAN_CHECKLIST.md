# Phase 2 — Data & Draft Screen human checklist

Agents never fill the sign-off table. Jeremy types Tester / Date / Result himself after a live walk.

## How to run

```bash
# API
source .venv/bin/activate
uvicorn apps.api.app.main:app --reload --port 8787

# Web (separate terminal)
cd apps/web && npm run dev
```

Open http://127.0.0.1:3000

## Checks

- [ ] Vault opens (existing or new folder)
- [ ] Home list/grid shows title, module/type, last-modified
- [ ] Create project → opens Draft Screen; new project has Book/Folder hierarchy (structure tray)
- [ ] Archive / restore / typed-name delete work from Home
- [ ] Header project switcher jumps between projects; Home is still reachable (not switcher-only)
- [ ] Draft Screen: two-tier menu (File/Edit/View…), Sublime-style tabs, + new tab
- [ ] Right-click on writing surface shows context menu
- [ ] Zen via control; Esc exits Zen (does not enter Zen)
- [ ] Left tray edge reveals structure; PENS shows coming soon
- [ ] TipTap autosaves; content under books/main/folders/main/content/
- [ ] History UI lists per-project git commits after edits
- [ ] Light chrome uses Phase 1 color tokens; typography still temporary system stack

## Sign-off

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Result | |
