# Addendum — Per-Entry AI Exclusion (Journal & Notes)

Not in the original Part 1/Part 2 design reference. Added from direct
market research (2026 AI-journaling competitive scan) as a genuinely
missing capability, distinct from anything already speced.

## What already exists, for contrast

- App-wide master AI kill switch (onboarding + Settings)
- Journal Book-level Public/Private with encryption
- Sandboxed AI drafts requiring human approval before merge

## What this adds

A **per-entry** flag, independent of all of the above, available in
both Journal and Notes: **"Exclude this entry from AI."** When set:

- This entry is never sent to Muse for suggestions while it's open
- This entry is never included in Journal's persistent-memory/pattern
  recognition, it will not be quoted back, referenced, or surfaced in a
  future callback
- This entry is never included in Notes' "Ask your vault" search
  results or auto-tag/link detection
- The entry itself stays fully visible, writable, and searchable by the
  human normally, this is an AI-visibility flag, not a privacy/
  encryption feature, and not a substitute for a Private Journal Book

## UI

A small toggle in the entry's own header/toolbar, off by default,
visually distinct from the Journal Book-level Public/Private control
(different control, different scope, don't conflate them in the UI).

## Why this belongs in Storyworks specifically

Directly extends the sandboxed-AI-approval philosophy already locked
for this app, adding entry-level granularity on top of the existing
app-wide and Book-level controls. Confirmed as a real, valued pattern
in the current market: Reflection's 2026 release added materially the
same control ("mark an entry Private, excluded from AI search,
insights, themes, and reviews") and it's specifically cited as
noteworthy in independent 2026 reviews.
