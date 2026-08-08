# Phase 0 — Human UI/UX checklist (v2 rebuild)

**FULL STOP.** Do not start Phase 1 until every item below is cleared **and** `./scripts/check-phase-clear.sh docs/phases/PHASE_0_HUMAN_CHECKLIST.md` exits 0.

Chat phrases alone are not clearance.

**Phase 0 writing shape (locked 2026-08-08):** project list + TipTap text editor bound to vault markdown. No third-party canvas SDK.

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
- [ ] Can choose a vault folder (macOS folder picker) and continue
- [ ] “Hate AI?” choice turns master AI off (header shows AI off; Muse/STT stay off)
- [ ] Alternate path keeps AI available but helpers start off until toggled
- [ ] Light mode only — no dark mode toggle anywhere

### Header

- [ ] Brand shows **Storyworks**
- [ ] **AI** master toggle is visible and works both ways
- [ ] **Muse** toggle is visible; disabled / ineffective when AI master is off
- [ ] **STT** toggle shows real state: working on/off, or **STT not installed** / unreachable (never silent hang on “checking…”)

### Vault + projects

- [ ] Open vault creates/uses folder with `.storyworks/` on disk
- [ ] Create a project — it appears under Available
- [ ] Open a project — TipTap writing surface loads (not a canvas)
- [ ] Archive moves project to Archived; restore brings it back
- [ ] Delete requires archive first + typing the full exact project name

### Writing (durable)

- [ ] Type in the project editor; after a short pause, status shows saved
- [ ] A `.md` file exists under `projects/<slug>/content/` (manuscript)
- [ ] Refresh the page → text is still there
- [ ] Writing works with AI master **off** (no AI required)

### Muse (when AI on)

- [ ] Muse on + idle ~2.5s → ghost suggestion appears (needs Ollama + `huihui_ai/qwen3-abliterated:14b`)
- [ ] **Tab** accepts suggestion into the manuscript
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
