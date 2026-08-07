# Phase 0 — Human UI/UX checklist

**FULL STOP.** Do not start Phase 1 until every item below is cleared.

## How to run

```bash
# Terminal 1
cd ~/Developer/storyworks
source .venv/bin/activate
uvicorn apps.api.app.main:app --reload --port 8787

# Terminal 2
cd ~/Developer/storyworks/apps/web
npm run dev
```

Open **http://127.0.0.1:5173**

Optional: confirm Ollama is running (`ollama list`) so Muse can suggest.

---

## Checklist

### Top bar / connectors

- [ ] Page loads in light mode (no dark theme)
- [ ] Brand shows **Storyworks**
- [ ] Ollama status pill shows ok when Ollama is up (or down if Ollama stopped — either is honest)
- [ ] OpenClaw pill shows ok/n/a without crashing the app
- [ ] Nav links: **Projects** and **Design** work

### Projects (`/`)

- [ ] Create a project with a unique name → it appears under Available
- [ ] Open the project → editor loads
- [ ] Archive the project → it moves to Archived, disappears from Available
- [ ] Restore → back under Available
- [ ] Archive again → **Delete project** opens modal
- [ ] Typing the wrong name leaves Delete disabled / rejected
- [ ] Typing the **full exact name** deletes; project gone from lists
- [ ] Confirm a backup folder appeared under `projects/backup/<slug>-…` (optional Finder check)

### Editor (`/project/:id`)

- [ ] Large writing area is usable; type several sentences
- [ ] Word count updates
- [ ] Save status moves to saved after a short pause (autosave)
- [ ] Refresh the page → text is still there
- [ ] Muse toggle on: stop typing ~2.5s → ghost suggestion appears (needs Ollama)
- [ ] **Tab** accepts suggestion into the manuscript
- [ ] With a suggestion showing, press any other key → suggestion dismisses and typing continues
- [ ] Muse toggle off → no new suggestions while idle

### Design stub (`/design`)

- [ ] Route loads (placeholder sandbox is OK for Phase 0)
- [ ] Writing path still reachable via Projects nav

### Dual VCS sanity (optional but recommended)

- [ ] After writing, `projects/<slug>/` has its own `.git` (not the app repo)
- [ ] App repo `git status` does **not** show manuscript files as untracked product changes

---

## Sign-off

When all boxes are clear, reply in chat with something explicit like:

> Phase 0 human checklist cleared — proceed to Phase 1

| Field | Value |
|-------|--------|
| Tester | |
| Date | |
| Notes / fails | |

**Agents: do not begin Phase 1 until that clear is received.**
