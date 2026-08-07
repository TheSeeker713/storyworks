# Phase 0 — Human UI/UX checklist (v2 rebuild)

**FULL STOP.** Do not start Phase 1 until every item below is cleared **and** `./scripts/check-phase-clear.sh docs/phases/PHASE_0_HUMAN_CHECKLIST.md` exits 0.

Chat phrases alone are not clearance.

## How to run

```bash
# Terminal 1 — API
cd ~/Developer/storyworks
source .venv/bin/activate
uvicorn apps.api.app.main:app --reload --port 8787

# Terminal 2 — Web
cd ~/Developer/storyworks/apps/web
npm run dev
```

Open **http://127.0.0.1:3000**

Optional: `ollama list` so Muse can suggest when AI is on.

---

## Checklist

### First launch / onboarding

- [ ] Onboarding appears (or can be forced by clearing `storyworks.onboarded` in localStorage)
- [ ] Can enter a vault folder path and continue
- [ ] “Hate AI?” choice turns master AI off (header shows AI off; Muse/STT stay off)
- [ ] Alternate path keeps AI available but helpers start off until toggled
- [ ] Light mode only — no dark mode toggle anywhere

### Header

- [ ] Brand shows **Storyworks**
- [ ] **AI** master toggle is visible and works both ways
- [ ] **Muse** toggle is visible; disabled / ineffective when AI master is off
- [ ] **STT** toggle shows real state: working on/off, or **STT not installed** (never silent failure / hang)

### Vault + projects

- [ ] Open vault creates/uses folder with `.storyworks/` on disk
- [ ] Create a project — it appears in the project selector
- [ ] Archive / restore / typed-name delete still enforced by API (spot-check via UI or API is OK for Phase 0)

### Canvas writing (durable)

- [ ] Select/create project → tldraw canvas loads
- [ ] Type in a Note card; after a short pause, a `.md` file exists under `projects/<slug>/content/`
- [ ] Refresh the page → board/notes still load from vault
- [ ] Writing works with AI master **off** (no AI required)

### Muse (when AI on)

- [ ] Muse on + idle ~2.5s → ghost suggestion appears (needs Ollama + `huihui_ai/qwen3-abliterated:14b`)
- [ ] **Tab** accepts suggestion
- [ ] Any other key dismisses suggestion
- [ ] With Ollama stopped or model missing, Muse fails gracefully (message / no hang)

### Backup

- [ ] Opening vault or calling backup creates a folder under `{vault}/.storyworks/backup/`

### Clearance gate

- [ ] Ran `./scripts/check-phase-clear.sh docs/phases/PHASE_0_HUMAN_CHECKLIST.md` yourself after filling this list

---

## Sign-off

When all boxes are clear, fill the table below, then run the gate script until it prints OK.

| Field | Value |
|-------|--------|
| Tester | |
| Date | |
| Notes / fails | |

**Agents: do not begin Phase 1 and do not mark Phase 0 COMPLETE until the gate script exits 0.**
