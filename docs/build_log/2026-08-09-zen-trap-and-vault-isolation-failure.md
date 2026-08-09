# Failure record — Zen trap + agent wrote live vault (2026-08-09)

**Status:** FAILURE recorded. No “fixed” claim. Zen UI revert proposed, not yet applied. SQLite `cache.nosync` work from `024b408` remains in tree and is a separate issue from this UI trap.

## Human report (Jeremy)

1. Could not exit the screen; Esc did nothing; no way back to normal view.
2. Text visible (`dual 18`) that Jeremy did not type.
3. Whatever rendered was not recognizable as intended Zen (full-screen text-only).
4. Described as “always on top” — view could not be dismissed by normal means.

## Failure 1 — agent test isolation violated (process)

**Confirmed.** `dual 18` is on disk in Jeremy’s real vault manuscript:

`/Users/myceliainteractive/Documents/projects/my-project/content/projects/untitled/books/main/folders/main/content/manuscript.md`

Source: agent investigation scripts (not Jeremy) that opened that path and wrote `body=f'dual {i}\n'` (and earlier `Testing this app N`, race docs) into the live Untitled project while diagnosing SQLite / concurrency.

**Rule broken:** automated testing must use throwaway/isolated vaults (`pytest` `tmp_path`, `/tmp/sw-*`), never a human’s active vault.

**Remediation (process, going forward):** agents do not write to `~/Documents/projects/...` or any path that looks like a live vault. Do not “clean up” Jeremy’s manuscript unless he explicitly asks.

## Failure 2 — Zen trap after “true full-screen” change (`024b408`)

### Mechanism (code)

Zen was split across two booleans:

| State | Owner | When true |
|--------|--------|-----------|
| `StudioApp` `zen` | set via `onZenChange` | Hides brand header; `<main>` becomes `fixed inset-0 z-[90]` |
| `DraftShell` `zen` | local `useState` | Hides Draft chrome; shows Exit Zen; Esc calls `setZen(false)` |

Esc handler only runs exit when **DraftShell** `zen` is true. If DraftShell remounts (e.g. Fast Refresh) and resets local `zen` to `false` without calling `onZenChange(false)`, StudioApp can stay `zen === true`.

**Trap state:** `StudioApp.zen === true` ∧ `DraftShell.zen === false`

Result matches the report:

- Header gone; `main` covers viewport (“always on top”)
- Draft chrome may reappear (“not zen mode”)
- No Exit Zen button
- Esc no-ops for Studio overlay; Home / vault controls are in the hidden header

### “One editor instance”

Current `DraftShell` JSX has a single `<WritingEditor />` mount. The trap is **not** two editors fighting; it is dual Zen state + fixed overlay ownership. (Earlier remount-on-toggle was a different bug in a prior attempt.)

## Prior Zen / save rounds (same day, for the record)

| Round | Claim | Human outcome |
|-------|--------|----------------|
| Autosave 500 / locks (`263df58`) | Threadpool SQLite race → opaque 500 | Partial: new error path surfaced; then disk I/O under iCloud |
| Full-screen Zen + nosync (`024b408`) | True Zen + text preserved | **Fail:** trap / Esc useless / not recognizable Zen; also agent-polluted manuscript |
| Investigation (this record) | Root cause of trap + `dual 18` | Documented; **no code fix applied in that pass** |

## Proposed next step (not done in this commit)

Revert **only** Zen / StudioApp overlay UI from `024b408` toward last non-trapping DraftShell-local Zen (imperfect / header still visible OK). Keep SQLite `cache.nosync` + retries. Do not ship a fourth Zen redesign until that revert is verified by Jeremy.

## Related commits

- `263df58` — SQLite locks / autosave error surfacing / protocol chat checklists  
- `024b408` — iCloud index move + Zen fullscreen attempt (Zen half failed human)  
- This commit — failure records + HANDOFF/devlog only  
