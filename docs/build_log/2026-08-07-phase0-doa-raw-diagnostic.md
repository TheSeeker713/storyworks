# Phase 0 DOA — raw diagnostic (2026-08-07 ~23:00 MDT)

Not a fix log. Evidence only. Phase status left untouched.

## Root cause (process, not code)

`pytest` green and `npm run build` green were treated as step completion. Neither proves the app boots, loads in a browser at the documented URL, or survives a human checklist. That gap is why 0.1–0.8 could be marked done while Jeremy could only confirm light mode by hand.

---

## 1) API boot (documented command)

Command:

```bash
cd ~/Developer/storyworks
source .venv/bin/activate
uvicorn apps.api.app.main:app --reload --port 8787
```

Raw terminal output at start:

```
INFO:     Will watch for changes in these directories: ['/Users/myceliainteractive/Developer/storyworks']
INFO:     Uvicorn running on http://127.0.0.1:8787 (Press CTRL+C to quit)
INFO:     Started reloader process [5470] using WatchFiles
INFO:     Started server process [5472]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Started cleanly. No import traceback at boot.

Later during the browser session:

- Many `/api/*` requests returned 200 (health, connectors, vault open, projects, boards, content).
- After continued use (refresh + concurrent connector probes), the **worker PID 5472 became a zombie (`Z` / `<defunct>`)**. Reloader 5470 stayed alive.
- Subsequent `curl -m 3 http://127.0.0.1:8787/api/health` → HTTP `000` (no response).
- Next.js proxy logs: `Failed to proxy http://127.0.0.1:8787/api/... Error: socket hang up` / `ECONNRESET`.
- UI showed exact banner text: `Internal Server Error` while stuck on `Opening vault…`.

API did not stay healthy under real browser load.

---

## 2) Web boot (documented command)

Command:

```bash
cd ~/Developer/storyworks/apps/web
npm run dev
```

Raw terminal output at start:

```
> web@0.1.0 dev
> next dev

▲ Next.js 16.3.0 (Turbopack)
- Local:         http://localhost:3000
- Network:       http://192.168.1.46:3000
✓ Ready in 194ms
⚠ Specified "rewrites" will not automatically work with "output: export". See more info here: https://nextjs.org/docs/messages/export-no-custom-routes
✓ Running next.config.ts took 13ms

✓ Generated AGENTS.md for AI agents. Set `agentRules: false` in next.config to disable.
```

Compiled / Ready. Warnings present (rewrites vs `output: "export"`).

When opening the **documented** URL `http://127.0.0.1:3000`, Next logged repeatedly:

```
⚠ Blocked cross-origin request to Next.js dev resource /_next/hmr from "127.0.0.1".
Cross-origin access to Next.js dev resources is blocked by default for safety.

To allow this host in development, add it to "allowedDevOrigins" in next.config.js and restart the dev server:

// next.config.js
module.exports = {
  allowedDevOrigins: ['127.0.0.1'],
}
```

Same block for:

- `/_next/static/chunks/node_modules_next_dist_20wefz_._.js`
- `/_next/static/chunks/src_components_CanvasBoard_tsx_1fdzbbb._.js`
- `/_next/static/chunks/_1z4v2yi._.js`

---

## 3) Browser — documented URL `http://127.0.0.1:3000`

### What rendered (exact body text)

```
Storyworks
AI on
Muse off
STT…
Open vault

Open a vault and create or select a project to write on the canvas.
```

- Not a blank white crash screen.
- Light background observed: `rgb(247, 245, 240)`.
- **No** onboarding modal text (`Welcome to Storyworks` absent) even when `localStorage` had no `storyworks.*` keys.
- STT stayed as exact label `STT…` (never resolved while API was dead / chunks blocked).

### Network failures (performance resource statuses)

Observed **403** on critical scripts:

| URL | status |
|-----|--------|
| `/_next/static/chunks/node_modules_next_dist_20wefz_._.js` | 403 |
| `/_next/static/chunks/src_components_CanvasBoard_tsx_1fdzbbb._.js` | 403 |
| `/_next/static/chunks/_1z4v2yi._.js` | 403 |

API via Next rewrite (with dead worker):

| path | result |
|------|--------|
| `/api/health` | `AbortError` after 2.5s client abort (no response) |
| `/api/connectors/stt` | same |
| `/api/connectors/ollama` | same |

### Console / Next tooling

Next DevTools portal present in DOM. Client hydration incomplete (`reactRoot` false via `#__next` probe). Chunk 403s match Next’s `allowedDevOrigins` block for host `127.0.0.1` while the dev server advertises `http://localhost:3000`.

---

## 4) Browser — `http://localhost:3000` (not the documented URL)

This path got further than `127.0.0.1` because chunks were not blocked.

### Onboarding (localhost)

Exact heading present: `Welcome to Storyworks`.

Filled vault path:

`/Users/myceliainteractive/Developer/storyworks/tmp/diag-vault`

Clicked hate-AI button. After completion, exact header/body included:

```
Storyworks
AI off
Muse off
STT off
…
Vault: /Users/myceliainteractive/Developer/storyworks/tmp/diag-vault
```

Onboarding status lines while modal open (exact):

- `Ollama: ok · 5 models`
- `Speech-to-text: working (mlx-community/whisper-tiny)`

### After project create (localhost, before API death)

- Project selector contained `My Project` (`slug: my-project`).
- tldraw chrome present (Select, Note, Undo, etc.).
- Note text visible: `Home note — type here. Persists to vault .md.`
- Typed ` DIAG_PERSIST_MARKER_778` into the note editor.
- On disk after debounce, file contained that marker:
  `tmp/diag-vault/projects/my-project/content/59c279ccb54547cea2c068a84c056bec.md`
- Backup folder existed: `tmp/diag-vault/.storyworks/backup/pre-studio-20260808T045824Z`
- Vault settings on disk after hate-AI:

```json
{
  "ai_master_enabled": false,
  "muse_enabled": false,
  "stt_enabled": false,
  ...
}
```

### Refresh (localhost) — broke

After hard refresh:

- Exact error text in UI: `Internal Server Error`
- Status stuck: `Opening vault…`
- Header showed `AI on` (default UI state) even though vault settings file still had `"ai_master_enabled": false`
- Header showed `STT not installed` then later `STT…` while API died
- Canvas / marker text not reachable in the UI after this failure
- Next proxy: `socket hang up` / `ECONNRESET` to `:8787`
- Host process table: uvicorn worker `5472` `<defunct>`

Onboarding alternate path (“Keep AI helpers available”) was **not** re-walked after this; hate-AI path had already been used on this vault.

---

## 5) API archive / typed-delete spot-check (curl, while API still alive)

- Archive / restore of `my-project`: 200, expected bodies.
- Delete without archive: `{"detail":"archive required before delete"}`
- Wrong typed name after archive: `{"detail":"typed name does not match"}`
- Correct typed name: `{"ok":true,"slug":"delete-me"}`

---

## Checklist walk (`PHASE_0_HUMAN_CHECKLIST.md`)

Judged against the **documented** entry URL `http://127.0.0.1:3000` as primary. Where localhost temporarily worked, noted as secondary evidence only.

### First launch / onboarding

| Item | Verdict | Evidence |
|------|---------|----------|
| Onboarding appears | **Broken** on documented URL | Exact body had no `Welcome to Storyworks`; chunk 403s on `127.0.0.1`. On localhost, Welcome did appear. |
| Enter vault path and continue | **Could not test** on documented URL (blocked by onboarding/chunk failure). **Confirmed working** once on localhost with path above → vault opened. |
| Hate AI → AI off; Muse/STT stay off | **Could not test** on documented URL. **Confirmed working** once on localhost immediately after click (`AI off` / `Muse off` / `STT off`). **Broken on refresh**: UI showed `AI on` while settings file still `ai_master_enabled: false`, then vault open failed with `Internal Server Error`. |
| Alternate path keeps AI available, helpers off | **Could not test** — earlier hate-AI path + later API death blocked a clean re-run. |
| Light mode only | **Confirmed working** | Light page chrome; background `rgb(247, 245, 240)`; no dark-mode toggle observed in header. |

### Header

| Item | Verdict | Evidence |
|------|---------|----------|
| Brand Storyworks | **Confirmed working** | Exact heading `Storyworks` on both hosts. |
| AI master toggle both ways | **Broken / incomplete** | After hate-AI, off worked once. Refresh + dead API left UI on `AI on` contrary to settings file. Did not complete a clean on→off→on cycle after recovery (API dead). |
| Muse disabled when AI off | **Confirmed working** (localhost, post hate-AI) | Muse button `disabled` while `AI off`. |
| STT shows real state | **Broken** | Observed exact labels cycling: `STT…` → `STT off` → `STT not installed` → `STT…` while connector had previously returned working; hangs when API worker dies. |

### Vault + projects

| Item | Verdict | Evidence |
|------|---------|----------|
| Open vault creates `.storyworks/` | **Confirmed working** (localhost once) | Disk: `tmp/diag-vault/.storyworks/` with `settings.json`, `index.sqlite`, `backup/`. |
| Create project appears in selector | **Confirmed working** (localhost once) | Selector option `My Project` / API `{"slug":"my-project",...}`. |
| Archive / restore / typed delete | **Confirmed working** via API spot-check (curl). **Could not test** via UI (no archive UI exercised; blocked later by API death). |

### Canvas writing

| Item | Verdict | Evidence |
|------|---------|----------|
| tldraw loads after project | **Broken** on documented URL (CanvasBoard chunk 403). **Confirmed working** once on localhost. |
| Type note → `.md` under content/ | **Confirmed working** once on localhost | Marker on disk in content md. |
| Refresh → board/notes still load | **Broken** | Refresh showed `Internal Server Error` / `Opening vault…`; notes not shown. |
| Writing with AI off | **Confirmed working** once on localhost | Typed while `AI off` before refresh failure. |

### Muse

| Item | Verdict | Evidence |
|------|---------|----------|
| Idle ghost suggestion | **Could not test** | Blocked by documented-URL chunk failure and later API death; Muse left off for hate-AI path. |
| Tab accept | **Could not test** | Same. |
| Other key dismiss | **Could not test** | Same. |
| Graceful fail without Ollama/model | **Could not test** | Same. |

### Backup

| Item | Verdict | Evidence |
|------|---------|----------|
| Backup under `.storyworks/backup/` | **Confirmed working** (localhost once) | `pre-studio-20260808T045824Z` present. |

### Clearance gate

| Item | Verdict | Evidence |
|------|---------|----------|
| Ran gate after filling list | **Could not test** / not applicable | Checklist not filled; phase not cleared. |

---

## Earliest blocking failure (for sequential fixes next)

1. **Documented URL vs Next 16 `allowedDevOrigins`**: `http://127.0.0.1:3000` gets **403** on critical `/_next/static/chunks/*` (including `CanvasBoard`). Matches Jeremy-only-light-mode experience on the URL the checklist tells humans to open.
2. **API worker dies under use** (zombie) → all proxied API calls `ECONNRESET` / hang → vault reopen and STT/Ollama status become unusable.

Do not mark Phase 0 COMPLETE. Do not start Phase 1.
