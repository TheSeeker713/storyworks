# Packaging

## Now (dev)

Local two-process browser workflow:

1. FastAPI on `http://127.0.0.1:8787`
2. Next.js `next dev` (or `next build` static export) for the UI

```bash
source .venv/bin/activate
uvicorn apps.api.app.main:app --reload --port 8787
```

```bash
cd apps/web && npm run dev
```

## Desktop scaffold (Deployment — partial)

Tree: `apps/desktop/` + `apps/desktop/src-tauri/` (config + stub binary).

Intended production shape:

- Tauri 2 WKWebView → `apps/web/out`
- Python FastAPI sidecar on loopback
- Full build: embedded local inference (no required external Ollama)
- Lite build: no AI runtime shipped

Overnight automation **does not** run `tauri build` or notarization.

## Signing checklist (Jeremy only — never give certs to agents)

1. Enroll / renew Apple Developer Program
2. Create Developer ID Application certificate in Keychain
3. Set `bundle.macOS.signingIdentity` in `tauri.conf.json` (or env)
4. `cargo tauri build`
5. Notarize with `xcrun notarytool` + staple
6. Verify Gatekeeper on a clean Mac

Blocked without the above. Do not mark Deployment COMPLETE until Jeremy confirms a signed install.

## Pricing / distribution (undecided)

Lite free/donation vs Full ≤ Scrivener one-time; store vs direct — open product calls, not agent work.
