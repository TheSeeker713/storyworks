# Phase 1 — Human-gated visual / UX design (1B redesign)

**Status: AWAITING HUMAN UI/UX CLEAR** — Phase 1B steps done at 100%. **FULL STOP.** Do not start Phase 2 until Jeremy clears [`PHASE_1_HUMAN_CHECKLIST.md`](PHASE_1_HUMAN_CHECKLIST.md).

**Primary surface:** `/design` full-bleed studio shell. Production writing path (`/`, `/project/:id`) stays Phase 0 wire until clear.

## Locked redesign decisions

| Decision | Choice |
|----------|--------|
| Scope | `/design` only until human clear |
| Chrome | Full-bleed edge-to-edge shell — old tab experiments **rejected** |
| Daily BG | Playlist A: shuffle once → one webp per calendar day → loop/reshuffle → same image all day |
| Backdrop | webp behind UI (`public/backgrounds/`) |
| R3F / WebGL | Side drawer / panel prototypes only — **not** full-screen BG |
| Writing modules | Flat **solid** panels: Prompt / Note / Novel / Screenplay / Journal |
| Motion | Module transition + BG parallax **only during** module switch; drawer slide; opacity feedback |
| Aides | Every control has a visible aide and/or hover `title` |
| Muse | Tab accept / other key dismiss unchanged when shown in mocks |
| Muse prose training | Out of scope this pass |

## Steps (Phase 1B)

| Step | Name | Status |
|------|------|--------|
| 1B.1 | R3F/three/drei deps + ffmpeg/cwebp + convert script + placeholder playlist | done |
| 1B.2 | Full-bleed shell + daily playlist BG + opacity + solid modules + transition parallax | done |
| 1B.3 | Hover/visual aides + R3F side-drawer prototype | done |
| 1B.4 | Docs + human checklist + FULL STOP | done — waiting on human |

## Asset tooling

- Drop sources in `assets/backgrounds/` (jpg/png/webp). Bulky dumps may go under `assets/backgrounds/raw/` (gitignored).
- Run `scripts/convert-backgrounds.sh` → `apps/web/public/backgrounds/bg-NNN.webp` + `manifest.json`.
- Requires `cwebp` (`brew install webp`) and/or ffmpeg with libwebp. Homebrew’s default ffmpeg bottle often lacks the encoder — prefer `cwebp`.

## Out of scope (unchanged)

Porting shell to production `/` / editor, Writers Room runtime, Codex production, private git push, procedural, dark mode, Muse prose fingerprint/LoRA ladder.
