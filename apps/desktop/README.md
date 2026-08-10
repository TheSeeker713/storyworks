# Storyworks desktop (Tauri scaffold)

macOS-only shell. This is scaffolding for Deployment — not a signed product build.

## Intent

- Tauri 2 + WKWebView loads the Next static export (`apps/web/out`)
- Python FastAPI runs as a sidecar on `127.0.0.1:8787`
- Full build later embeds local inference; Lite omits AI runtime

## Prerequisites (Jeremy)

```bash
# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Tauri CLI
cargo install tauri-cli --version "^2.0.0" --locked

# Xcode CLT + Apple Developer certs for release signing
```

## Dev shape (do not expect overnight agent to run this live)

1. Build web: `cd apps/web && npm run build`
2. Start API sidecar yourself: `uvicorn apps.api.app.main:app --port 8787`
3. From `apps/desktop`: `cargo tauri dev` once `src-tauri` is fully initialized on your machine

## Signing (Jeremy only)

See `docs/PACKAGING.md` § Signing. Never paste certificates into chat or agent context.
