# Storyworks Web (Next.js)

Agents do **not** run `npm run dev` or open a browser. Jeremy boots the web app himself. Agents may use `npm run build` / lint / typecheck only.

```bash
cd apps/web && npm install && npm run dev
```

Static export mode (`output: "export"`). Dev proxies `/api/*` to FastAPI `:8787`.

See root `AGENTS.md`. Packaging later: Tauri + Python sidecar (not built in Phase 0).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
