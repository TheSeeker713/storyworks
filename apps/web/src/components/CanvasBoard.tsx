"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Editor,
  Tldraw,
  createBindingId,
  createShapeId,
  renderPlaintextFromRichText,
  toRichText,
  type TLEditorSnapshot,
} from "tldraw";
import "tldraw/tldraw.css";
import { api } from "@/lib/api";

type Props = {
  projectSlug: string;
  boardId: string;
  onDraftText?: (text: string) => void;
};

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

export default function CanvasBoard({ projectSlug, boardId, onDraftText }: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hashesRef = useRef<Record<string, string>>({});

  const persist = useCallback(
    async (editor: Editor) => {
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
            canvas: { board_id: boardId, x: shape.x, y: shape.y },
          });
          if (!created.ok || !created.id) continue;
          contentId = created.id;
          hashesRef.current[contentId] = created.content_hash || "";
          editor.updateShape({
            id: shape.id,
            type: shape.type,
            meta: { ...meta, contentId, title },
          });
          continue;
        }
        const result = await api.writeContent(projectSlug, {
          id: contentId,
          type: "note",
          title,
          body,
          canvas: { board_id: boardId, x: shape.x, y: shape.y },
          expected_hash: hashesRef.current[contentId],
          dirty: true,
        });
        if (result.ok && result.content_hash) {
          hashesRef.current[contentId] = result.content_hash;
        }
      }
      onDraftText?.(bodies.join("\n\n"));
    },
    [boardId, onDraftText, projectSlug],
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
        const doc = await api.getBoard(boardId);
        if (doc && typeof doc === "object" && ("document" in doc || "store" in doc)) {
          try {
            editor.loadSnapshot(doc as unknown as TLEditorSnapshot);
          } catch {
            // ignore empty/legacy
          }
        }

        const notes = editor.getCurrentPageShapes().filter((s) => s.type === "note");
        if (notes.length === 0) {
          const a = createShapeId();
          const b = createShapeId();
          const arrow = createShapeId();
          const bindStart = createBindingId();
          const bindEnd = createBindingId();
          editor.createShapes([
            {
              id: a,
              type: "note",
              x: 120,
              y: 120,
              props: {
                richText: toRichText("Home note — type here. Persists to vault .md."),
              },
              meta: { title: "Home note" },
            },
            {
              id: b,
              type: "note",
              x: 420,
              y: 220,
              props: { richText: toRichText("Linked note (binding demo).") },
              meta: { title: "Linked note" },
            },
            {
              id: arrow,
              type: "arrow",
              x: 200,
              y: 160,
              props: {
                start: { x: 0, y: 0 },
                end: { x: 180, y: 80 },
              },
            },
          ]);
          editor.createBindings([
            {
              id: bindStart,
              type: "arrow",
              fromId: arrow,
              toId: a,
              props: {
                terminal: "start",
                normalizedAnchor: { x: 0.5, y: 0.5 },
                isExact: false,
                isPrecise: false,
              },
            },
            {
              id: bindEnd,
              type: "arrow",
              fromId: arrow,
              toId: b,
              props: {
                terminal: "end",
                normalizedAnchor: { x: 0.5, y: 0.5 },
                isExact: false,
                isPrecise: false,
              },
            },
          ]);
          await persist(editor);
        }

        editor.store.listen(() => schedulePersist(editor), { source: "user", scope: "document" });
      })();
    },
    [boardId, persist, schedulePersist],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="h-full w-full">
      <Tldraw onMount={onMount} />
    </div>
  );
}
