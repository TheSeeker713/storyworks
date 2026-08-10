# Deployment — packaging (partial overnight)

**Status: SCAFFOLD ONLY — blocked on Jeremy for signing/notarization**

## Done without credentials

- `apps/desktop/` Tauri 2 scaffold (macOS WKWebView shell notes)
- Sidecar launch documented (FastAPI on 8787; static `apps/web/out`)
- [`docs/PACKAGING.md`](../PACKAGING.md) updated with signing checklist Jeremy must run

## Blocked (needs Jeremy)

1. Apple Developer Program membership + certificates
2. `codesign` / notarization / staple
3. Real `tauri build` against his machine toolchain
4. Embedded Full-build inference bundling (`llama.cpp` / `mlx-serve`) — large binary decision
5. Pricing / store vs direct distribution

Agents must never be given Apple credentials and must not simulate notarization success.
