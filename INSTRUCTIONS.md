# Storyworks — Operator Instructions

## Run locally

1. Install [Ollama](https://ollama.com) and pull a model (default: `huihui_ai/qwen3-abliterated:14b`, fallback `qwen3:8b`).
2. Optional: OpenClaw on PATH for cloud probe.
3. API:

```bash
cd ~/Developer/storyworks
source .venv/bin/activate   # or create venv first
uvicorn apps.api.app.main:app --reload --port 8787
```

4. Web:

```bash
cd ~/Developer/storyworks/apps/web
npm run dev
```

## Create a project

1. Open http://127.0.0.1:5173
2. Enter a name → **Create project**
3. Open the project → write. Autosave keeps SQLite + `projects/<slug>/manuscript.md`
4. Local git auto-commits after short debounce (Project Committer)

## Muse

- Toggle **Muse** in the editor chrome
- Stop typing ~2.5s → ghost suggestion
- **Tab** = accept and insert
- **Any other key** = dismiss (typing continues)

Requires Ollama healthy (status pill in top bar).

## Archive / restore / delete

| Action | Rule |
|--------|------|
| Archive | Soft-hide; reversible |
| Restore | Back to available |
| Delete | **Only if archived**. Type full project name. Button: **Delete project** |

Delete also copies non-git files to `projects/backup/<slug>-<timestamp>/` before removing the live folder.

## Build safety (production later)

If a build/migration might interfere with user projects:

1. Copy → `projects/backup/<slug>-<timestamp>/`
2. Temp-archive live project (`archive_reason: system_build`)
3. Run risky work
4. Restore when safe
5. Never auto-delete backups

## Dual VCS

- App code: this public repo only
- Story content: never commit into the app repo; lives under gitignored `projects/`

Cloud private remotes per story project: specified in `docs/05_GIT_SYNC.md` (implement later).

## Env overrides

| Variable | Default |
|----------|---------|
| `STORYWORKS_OLLAMA_URL` | `http://127.0.0.1:11434` |
| `STORYWORKS_OLLAMA_MODEL` | `huihui_ai/qwen3-abliterated:14b` |
| `STORYWORKS_OLLAMA_FALLBACK` | `qwen3:8b` |