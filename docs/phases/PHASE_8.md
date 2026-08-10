# Phase 8 — Export / Publish

**Status: MACHINE DONE (local exporters)** — overnight run.

## Steps

| Step | Name | Status |
|------|------|--------|
| 8.1 | Markdown / Fountain / FDX / EPUB / PDF exporters | done (machine) |
| 8.2 | API `POST /api/projects/{slug}/export` + sidecar under `exports/` | done (machine) |
| 8.3 | UI export actions in File menu | done (machine) |

## Limits

PDF is a minimal Helvetica text PDF (no fancy typesetting). EPUB is EPUB2-shaped zip. FDX is a minimal Final Draft XML skeleton — not a certified industry round-trip. Publish-to-store is out of scope.
