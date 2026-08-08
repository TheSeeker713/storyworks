"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowToolbarItem,
  DefaultToolbar,
  Editor,
  EraserToolbarItem,
  HandToolbarItem,
  NoteToolbarItem,
  SelectToolbarItem,
  TextToolbarItem,
  Tldraw,
  renderPlaintextFromRichText,
  type TLEditorSnapshot,
  type TLUiOverrides,
} from "tldraw";
import "tldraw/tldraw.css";
import { api } from "@/lib/api";

type Props = {
  projectSlug: string;
  boardId: string;
  vaultPath: string;
  onDraftText?: (text: string) => void;
};

/** Freehand draw removed. Geo primitives stay in the editor schema but are not offered in the toolbar. */
const HIDDEN_TOOL_IDS = new Set([
  "draw",
  "highlight",
  "rectangle",
  "ellipse",
  "triangle",
  "diamond",
  "hexagon",
  "oval",
  "rhombus",
  "star",
  "cloud",
  "heart",
  "x-box",
  "check-box",
  "arrow-left",
  "arrow-up",
  "arrow-down",
  "arrow-right",
  "line",
  "frame",
  "laser",
  "asset",
  "embed",
]);

const uiOverrides: TLUiOverrides = {
  tools(_editor, tools) {
    for (const id of HIDDEN_TOOL_IDS) {
      delete tools[id];
    }
    return tools;
  },
};

function StoryworksToolbar() {
  return (
    <DefaultToolbar>
      <SelectToolbarItem />
      <HandToolbarItem />
      <EraserToolbarItem />
      <ArrowToolbarItem />
      <TextToolbarItem />
      <NoteToolbarItem />
    </DefaultToolbar>
  );
}

function plaintextFromShape(editor: Editor, shapeId: string): string {
  const shape = editor.getShape(shapeId as never);
  if (!shape || !("props" in shape)) return "";
  const props = shape.props as { richText?: unknown };
  if (!props.richText) return "";
  try {
    return renderPlaintextFromRichText(editor, props.richText as never);
  } catch {
    return "";
  }
}

function isTldrawSnapshot(doc: Record<string, unknown>): boolean {
  return Boolean(doc && typeof doc === "object" && ("document" in doc || "store" in doc));
}

async function ensureVaultOpen(vaultPath: string) {
  if (!vaultPath.trim()) {
    throw new Error("No vault folder open — choose a vault before using the canvas");
  }
  const health = await api.health();
  if (!health.vault_open) {
    await api.openVault(vaultPath);
  }
}

export default function CanvasBoard({ projectSlug, boardId, vaultPath, onDraftText }: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hashesRef = useRef<Record<string, string>>({});
  const [persistError, setPersistError] = useState<string | null>(null);

  const persist = useCallback(
    async (editor: Editor) => {
      try {
        await ensureVaultOpen(vaultPath);
        const snapshot = editor.getSnapshot();
        await api.putBoard(boardId, snapshot as unknown as Record<string, unknown>);

        const bodies: string[] = [];
        for (const shape of editor.getCurrentPageShapes()) {
          if (shape.type !== "note" && shape.type !== "text") continue;
          const meta = (shape.meta || {}) as { contentId?: string; title?: string };
          let contentId = meta.contentId;
          const body = plaintextFromShape(editor, shape.id);
          bodies.push(body);
          const title = meta.title || body.split("\n")[0]?.slice(0, 80) || "Untitled note";
          if (!contentId) {
            const created = await api.writeContent(projectSlug, {
              type: "note",
              title,
              body,
              canvas: { board_id: boardId, x: shape.x, y: shape.y, project_slug: projectSlug },
            });
            if (!created.ok || !created.id) continue;
            contentId = created.id;
            hashesRef.current[contentId] = created.content_hash || "";
            editor.updateShape({
              id: shape.id,
              type: shape.type,
              meta: { ...meta, contentId, title, projectSlug },
            });
            continue;
          }
          const result = await api.writeContent(projectSlug, {
            id: contentId,
            type: "note",
            title,
            body,
            canvas: { board_id: boardId, x: shape.x, y: shape.y, project_slug: projectSlug },
            expected_hash: hashesRef.current[contentId],
            dirty: true,
          });
          if (result.ok && result.content_hash) {
            hashesRef.current[contentId] = result.content_hash;
          }
        }
        onDraftText?.(bodies.join("\n\n"));
        setPersistError(null);
      } catch (err) {
        setPersistError(err instanceof Error ? err.message : String(err));
      }
    },
    [boardId, onDraftText, projectSlug, vaultPath],
  );

  const schedulePersist = useCallback(
    (editor: Editor) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(editor);
      }, 600);
    },
    [persist],
  );

  const onMount = useCallback(
    (editor: Editor) => {
      void (async () => {
        try {
          await ensureVaultOpen(vaultPath);
          const doc = await api.getBoard(boardId);
          if (isTldrawSnapshot(doc)) {
            try {
              editor.loadSnapshot(doc as unknown as TLEditorSnapshot);
            } catch {
              // empty / legacy marker — leave blank canvas for this project
            }
          }
          // No shared demo notes. Each project starts empty until the user adds shapes.
          editor.store.listen(() => schedulePersist(editor), { source: "user", scope: "document" });
          setPersistError(null);
        } catch (err) {
          setPersistError(err instanceof Error ? err.message : String(err));
        }
      })();
    },
    [boardId, schedulePersist, vaultPath],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      {persistError && (
        <p className="absolute left-3 top-3 z-20 max-w-lg rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
          Canvas save/load: {persistError}
        </p>
      )}
      <Tldraw
        onMount={onMount}
        overrides={uiOverrides}
        components={{ Toolbar: StoryworksToolbar }}
      />
    </div>
  );
}
