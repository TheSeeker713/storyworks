# Phase 7 — Onboarding, Settings, product split

**Status: MACHINE DONE (runtime flags)** — overnight run.

## Steps

| Step | Name | Status |
|------|------|--------|
| 7.1 | Settings panel (search, kill switch, Muse/STT, STT model) | done (machine) |
| 7.2 | Lite / Full product_tier runtime gate + disclosure | done (machine) |
| 7.3 | BYOM toggle + third-party data warning | done (machine) |
| 7.4 | Cmd+K → settings-via-agent | done (machine) |
| 7.5 | Cloud backup = folder-location copy (no OAuth) | done (copy) |
| 7.6 | Onboarding “hate AI?” remains (Phase 0 reference polish) | kept |

## Judgment / limits

Lite does **not** strip AI code from the JS/Python bundle tonight — that is a true build-variant / Deployment concern. Runtime gates honor `product_tier` + kill switch. GPU/CPU install messaging stays onboarding/status text level.
