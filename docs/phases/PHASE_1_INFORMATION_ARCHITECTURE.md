# Storyworks — Information Architecture (Phase 1 Output 5)

Status: mostly resolved, one real gap flagged explicitly below. Do not
invent a solution to that gap without Jeremy's sign-off, it's a genuine
open design question, not an oversight to quietly patch.

## The six tools

Novel, Screenplay, Blog, Notes, Journal, PENS. Each is a distinct writing
surface with its own AI-agentic behavior (see feature list in
`storyworks-design-reference-part-1.html` §2), but all six share the same
outer shell: header, tab strip, context-aware left tray, right-click menu,
Zen mode, Codex access.

**PENS is roadmap-only.** Its tray/tool-tray icon exists and is clickable,
but opens a "coming soon" state, not a working module. Do not build PENS'
actual functionality in Phase 2+ unless explicitly told otherwise.

## Data hierarchy

```
Project
 └── Book
      └── Folder
           └── Content (chapters, scenes, entries, notes — module-specific)
```

Journal has its own variant of this same shape:

```
Journal
 └── Book (Public or Private)
      └── Folder
           └── Entry
```

Codex (Characters, Props, Worldbuilding, Scenes) sits **outside** this
tree, shared across every Book in a Project, not nested inside any one
Book. Treat it as a cross-cutting reference layer, not a content type
inside the hierarchy above.

## Navigation, resolved pieces

- **Header**: persistent, every screen. Brand, basic menu (File/Edit/
  View/Window/Help), Codex icon (gold-accented), AI/Muse/STT status
  pills, avatar.
- **Tab strip**: Sublime-style, multiple open documents per project.
  Sits directly below the header.
- **Left tray**: hidden by default, thin always-visible edge tab,
  hover-or-click to reveal, click (not drag) to act. Content is
  **context-aware**:
  - On the Draft Screen / no project open: tool-creation list (Note,
    Character, Scene, Novel, Screenplay, Journal, Blog, PENS)
  - Inside an open Novel: that project's chapter list, expandable to
    nested, editable scene cards
  - Inside an open Screenplay: that project's scene list directly (no
    chapter nesting, screenplays don't have chapters as a unit)
  - Inside an open Notes project: note list + an "Ask your vault"
    search field
  - Inside an open Journal: Book list (with lock icons for private
    Books)
- **Cmd+K**: global command palette, grouped results (Projects, Codex,
  Tools, Settings). Settings results execute directly, "Turn on daily
  skins" is not a link to a settings page, it's the action itself.
  Never the only way to reach something already visible elsewhere.
- **Settings**: sticky header + search bar, scrollable body, sectioned
  (AI & Assistance, Appearance, Drawing, Vault & Backup, Journal, more
  sections added as future phases ship). Every setting is also
  reachable by asking the AI assistant directly in plain language, the
  assistant needs real, permitted write access to the settings layer,
  not just the ability to describe what a setting does.

## Navigation, the real gap

**There is no resolved top-level "switch between Projects" screen.**
Early in this design process, the plan was a Milanote-style spatial
canvas where the Home view doubled as the project list. That canvas was
descoped entirely after the tldraw licensing investigation (see
technical architecture doc), and the project-list-as-canvas idea was
never replaced with a concrete alternative. Every wireframe since then
assumes you're already inside a project.

**Do not invent this without asking.** Reasonable candidates worth
raising with Jeremy before building: a simple list/grid view (title,
type, last-modified, matching the "list/index view for triage at scale"
idea from early planning), a dropdown in the header, or something else
entirely. This is a real open item, not a minor detail.

## Module-specific structural notes

- **Novel**: chapters are the primary unit, scenes nest inside chapters
  as cards. Clicking a scene card jumps the cursor to that point in one
  continuous chapter document, scenes are not separate files.
- **Screenplay**: scenes are the primary unit, no chapter layer.
- **Codex entries**: four types (Character, Prop, Worldbuilding, Scene),
  each with its own field set beyond Name + description (see technical
  architecture doc for the exact fields). Global Simple/Complex toggle
  in Settings controls whether an entry's facets (Traits, Backstory,
  etc.) render as one flat field or separate addressable cards, same
  toggle, same behavior, across all four types and everywhere Codex
  appears.
- **Journal Books**: Public or Private at creation time, not changeable
  after (encryption is applied at creation; converting a Book's privacy
  status after the fact is not currently specified, flag if this comes
  up during Phase 2+ build).
