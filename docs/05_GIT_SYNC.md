# Dual VCS — App vs story projects

Two git systems. They **never** share a remote or commit history.

## A) App development (this repo)

| Item | Value |
|------|--------|
| Path | `~/Developer/storyworks` |
| Remote | Public GitHub `storyworks` on `main` |
| Contains | `apps/`, `engine/`, `docs/`, `.cursor/`, AGENTS.md, … |
| Never | Manuscripts, `projects/**`, `data/**`, secrets |

## B) Story project git

| Item | Value |
|------|--------|
| Path | `projects/<slug>/` each with own `.git` |
| Init | On project create |
| Auto-commit | Project Committer (watch/debounce) — not an LLM |
| Offline | Full history local |
| Cloud | **Private GitHub repo per project** (locked default); optional later GitLab/Gitea/local-only |
| App repo | Entire `projects/` tree gitignored |

## Separation rules

1. App `.gitignore` excludes `projects/`, `data/`, venv, secrets
2. Never stage story paths from app root
3. Committer `cwd` always `projects/<slug>`
4. App CI clones only the public app repo
5. Push to private remotes = later phase (spec here; not Phase 0)

## Phase 0 status

- App → public GitHub: yes
- Project local git + auto-commit: yes
- Project → private GitHub push: documented, not implemented yet