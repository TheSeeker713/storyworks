# Data model (Phase 0)

## SQLite

**projects**

| Column | Notes |
|--------|--------|
| id | UUID |
| name | Display name |
| slug | Unique filesystem folder |
| archived | 0/1 |
| archive_reason | `user` \| `system_build` \| null |
| created_at / updated_at | unix float |

**documents**

| Column | Notes |
|--------|--------|
| id | UUID |
| project_id | FK |
| title | default Manuscript |
| body | full text |
| updated_at | |

## Filesystem

```
projects/<slug>/
  .git/           # story VCS only
  manuscript.md
  project.json
projects/backup/<slug>-<timestamp>/
```

Later phases add Codex entities, scene graphs, screenplay formats, etc. See `10_FEATURE_MATRIX.md`.