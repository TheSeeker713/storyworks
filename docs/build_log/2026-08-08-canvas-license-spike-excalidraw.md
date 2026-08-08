# Spike — canvas engine license / TipTap cards (2026-08-08)

**Status:** research only. Current tldraw integration paused, not removed. No canvas rewrite until Jeremy approves a path.

**Why now:** tldraw SDK needs a paid commercial license (or hobby license with permanent “made with tldraw” watermark) for non-localhost production. Storyworks → Mycelia Interactive LLC → MyKAIA is a commercial trajectory. Tauri packaging will not stay “localhost HTTPS.” Decide before more product surface is built on tldraw.

---

## 1) Excalidraw — can it host TipTap like tldraw `ShapeUtil`?

**License:** MIT ([excalidraw/excalidraw LICENSE](https://github.com/excalidraw/excalidraw/blob/master/LICENSE)).

**Element model (closed set):** Official types include rectangle, diamond, ellipse, text, arrow/line, freedraw, image, frame/magicframe, embeddable, iframe — not an open registry of custom shape classes. See element type union in `packages/element/src/types.ts`.

**What looks like “custom React” but isn’t ShapeUtil:**

| Mechanism | What it actually is | TipTap cards? |
|-----------|---------------------|---------------|
| `customData` on any element | Optional `Record<string, any>` metadata ([docs props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)) | Metadata only — no custom renderer |
| `renderTopRightUI` / children `MainMenu` etc. | Chrome around the editor | Not in-canvas cards |
| `renderEmbeddable` | **Replaces the built-in `<iframe>` renderer** for `type: "embeddable"` ([render-props docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/render-props): “replace the renderer for embeddable elements (which renders iframe elements)”) | Possible **hack**: return a TipTap React tree instead of an iframe for an embeddable element. Not a first-class card shape system. No `ShapeUtil`-style geometry/hit-test/edit lifecycle of your own type. |

**Plain answer:** Excalidraw does **not** have a tldraw-style custom shape util that mounts arbitrary React as a peer of rect/note. The only in-canvas React escape hatch is overriding **embeddable** rendering. Forcing TipTap through that path is a force-fit: wrong abstraction, iframe-oriented element type, pointer/focus/editing behavior will fight a writing studio.

---

## 2) Excalidraw frames — nested worlds?

**Docs:** Frames are containment + optional clipping; children via `frameId`; strict array ordering (children before frame) ([frames docs](https://docs.excalidraw.com/docs/codebase/frames)).

**Nested frames:** Maintainer on [issue #8359](https://github.com/excalidraw/excalidraw/issues/8359): *“If I understand correctly, you're asking about nested frames. This isn't yet supported.”* Discussion [#10580](https://github.com/excalidraw/excalidraw/discussions/10580) restates single-level design.

**Plain answer:** Frames are a **lighter grouping/clipping** mechanism on one shared canvas coordinate space. Not independent nested worlds, not breadcrumb-navigable page stacks like tldraw pages/nested frames.

---

## 3) Excalidraw arrows / bindings

**Capable enough for card→card pipelines (on bindable types).**

Evidence:

- Programmatic bindings via `ExcalidrawElementSkeleton` `start`/`end` + `convertToExcalidrawElements` ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton)).
- Runtime `bindBindingElement` / update-on-move in `packages/element/src/binding.ts`.
- Bindable types include rectangle, diamond, ellipse, text, image, iframe, **embeddable**, frame ([types.ts](https://github.com/excalidraw/excalidraw/blob/2b0e4c96/packages/element/src/types.ts)).

So Notes → Screenplay style edges are fine **if** cards are bindable elements. Binding is not the blocker; custom TipTap shapes and nesting are.

---

## 4) Other MIT/Apache options (brief, evidence-based)

### A) React Flow (`@xyflow/react`) — strongest mature MIT fit for TipTap cards

- **License:** MIT ([xyflow/xyflow](https://github.com/xyflow/xyflow)).
- **Custom cards:** First-class. Register `nodeTypes` as React components — TipTap mounts naturally ([Custom Nodes](https://reactflow.dev/examples/nodes/custom-node)).
- **Edges:** First-class handles/edges for pipelines.
- **Nesting:** Sub-flows via `parentId`, relative coords, `extent: 'parent'`, nested groups ([Sub Flows](https://reactflow.dev/learn/layouting/sub-flows)). Nested hierarchy works; it is **still one viewport**, not a separate camera “world” you enter like a tldraw page dive — closer to nested groups than page stacks (page stacks can be app-owned: swap flow document).
- **Gaps vs tldraw:** Node-graph paradigm, not freehand whiteboard. No Rough.js sketch aesthetic out of the box. Attribution appears by default in free usage (Pro removes it / funds MIT maintenance) — softer than tldraw’s license wall, but brand-relevant for a polished MyKAIA surface.

### B) Younger “MIT canvas with HTML embeds” projects

- **Field Notes**, **canvas-harness**, **LumenBoard** — READMEs claim custom React / HTML embeds and MIT (or similar). Maturity, API stability, and shipping history are thin compared to React Flow or Excalidraw. Not recommended as the production bet without a separate bake-off spike.

### C) Hand-rolled CSS-transform pan/zoom

Always available. Full control, TipTap trivial, bindings/nesting all custom. Highest ongoing cost; only if no library is accepted.

---

## 5) Honest recommendation

**tldraw was the best technical match** for the locked product shape (custom TipTap shapes + freehand-capable infinite canvas + pages/frames + bindings). It is **not license-compatible** with Storyworks’ commercial / MyKAIA path without buying a commercial license or accepting a permanent watermark.

**Excalidraw is not a drop-in replacement for that product shape.** MIT yes; TipTap-as-ShapeUtil no; nested worlds no; bindings yes. Using `renderEmbeddable` for TipTap would be a hack that will hurt later.

**Closest mature permissive option for the card+pipeline core** is **React Flow**: TipTap cards and edges are native; nesting via sub-flows is real but not tldraw-page worlds; freehand whiteboard is not the point of that library.

**Decision fork (Jeremy picks before any canvas rewrite):**

1. **Pay for tldraw commercial** — keep current direction; watermark gone; best tech fit.
2. **Switch canvas product model to React Flow** — TipTap cards + edges + parent nesting; accept node-graph UX; implement “pages” as separate flow documents in the vault if needed.
3. **Excalidraw** — only if we deliberately shrink the product to sketch+arrows and give up real TipTap card shapes (or accept a bad embeddable hack). Not recommended for the locked Milanote-style writing surface.
4. **Hand-roll** — last resort after rejecting 1–2.

**Paused:** do not rip out tldraw until one of the above is approved.
