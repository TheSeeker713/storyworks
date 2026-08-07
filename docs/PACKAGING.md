# Packaging

## Now (Phase 0+)

Local two-process browser workflow:

1. FastAPI on `http://127.0.0.1:8787`
2. Next.js `next dev` (or `next build` static export) for the UI

## Later (deliberate next step — not built in this rebuild’s early phases)

**Tauri** shell:

- WKWebView on macOS
- Rust host
- Python FastAPI as a sidecar process

Do not start Tauri work until Phase 0 human clear and later phase docs call for it.
