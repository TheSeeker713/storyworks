# Phase 1 — Human UI/UX checklist

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

---

## Design sandbox (`/design`)

- [ ] Hero shows **Storyworks** at display size (Fraunces), light mode only
- [ ] Tabs switch: Tokens, Projects, Editor, Muse, Archive/delete, IA notes
- [ ] **Tokens:** color swatches render; type specimen + motion bars animate
- [ ] **Projects:** toggle wire / cards / rail; rail selection updates preview
- [ ] **Editor:** toggle plain / reflect / ink; ghost suggestion text visible
- [ ] **Muse:** toggle minimal / pill; copy still says Tab accept · other key dismiss
- [ ] **Archive/delete:** Delete project opens modal; wrong name disables confirm; exact name enables
- [ ] **IA notes:** Codex / Writers Room / modules placement notes readable
- [ ] Mobile width (~375px): tabs wrap; rail stacks without horizontal overflow

## Writing path preserved

- [ ] `/` still lists/creates projects (Phase 0 wire UI OK)
- [ ] Editor still autosaves; Muse Tab/dismiss still works
- [ ] No dark mode toggle appeared

## Sign-off

When clear, reply:

> Phase 1 human checklist cleared — proceed to Phase 2

| Field | Value |
|-------|--------|
| Tester | |
| Date | |
| Preferred variants (optional) | projects: ___ / editor: ___ / muse: ___ |
| Notes | |

**Agents: do not begin Phase 2 until that clear is received.**
