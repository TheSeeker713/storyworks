# Architecture

```
Browser (Vite/React)
    ↕ /api proxy
FastAPI (apps/api)
    ├─ SQLite WAL (data/storyworks.sqlite) — index + document bodies
    ├─ filesystem projects/<slug>/ — manuscript.md + project .git
    ├─ engine/muse.py → Ollama
    ├─ engine/connectors/openclaw.py — health probe
    └─ engine/committer.py — debounced git commit in project cwd
```

## Boundaries

| Concern | Location |
|---------|----------|
| Product UI | `apps/web` |
| HTTP API | `apps/api` |
| AI / connectors | `engine/` |
| User stories | `projects/` (gitignored) |
| App metadata DB | `data/` (gitignored) |

Phase 0 is intentionally thin: one document per project, no module graph yet.