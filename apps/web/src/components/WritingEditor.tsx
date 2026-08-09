"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { api } from "@/lib/api";

type Props = {
  projectSlug: string;
  projectName: string;
  contentId: string;
  contentTitle?: string;
  zen?: boolean;
  onDraftText?: (text: string) => void;
  appendText?: string | null;
  onAppendConsumed?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
};

function textToDoc(text: string) {
  const lines = text.length > 0 ? text.split("\n") : [""];
  return {
    type: "doc" as const,
    content: lines.map((line) => ({
      type: "paragraph" as const,
      content: line ? [{ type: "text" as const, text: line }] : [],
    })),
  };
}

export default function WritingEditor({
  projectSlug,
  projectName,
  contentId,
  contentTitle,
  zen = false,
  onDraftText,
  appendText,
  onAppendConsumed,
  onContextMenu,
}: Props) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const hashRef = useRef<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyRef = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: textToDoc(""),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-stone max-w-none min-h-[22rem] px-1 py-2 focus:outline-none text-[var(--sw-ink)]",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const text = ed.getText({ blockSeparator: "\n" });
      onDraftText?.(text);
      if (!readyRef.current) return;
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void (async () => {
          try {
            const result = await api.writeContent(projectSlug, {
              id: contentId,
              type: "manuscript",
              title: contentTitle || projectName || "Manuscript",
              body: ed.getText({ blockSeparator: "\n" }),
              book_id: "main",
              folder_id: "main",
              expected_hash: hashRef.current || undefined,
              dirty: true,
            });
            if (result.conflict) {
              setError("File changed on disk — reload the project to continue.");
              setSaveState("error");
              return;
            }
            if (result.content_hash) hashRef.current = result.content_hash;
            setSaveState("saved");
            setError(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setSaveState("error");
          }
        })();
      }, 600);
    },
  });

  useEffect(() => {
    if (!editor || !appendText) return;
    editor.commands.focus("end");
    editor.commands.insertContent(appendText);
    onAppendConsumed?.();
  }, [appendText, editor, onAppendConsumed]);

  useEffect(() => {
    readyRef.current = false;
    setSaveState("idle");
    setError(null);
    if (!editor) return;

    void (async () => {
      try {
        const existing = await api.readContent(projectSlug, contentId);
        hashRef.current = existing.content_hash || "";
        editor.commands.setContent(textToDoc(existing.body || ""));
        onDraftText?.(existing.body || "");
      } catch {
        const created = await api.writeContent(projectSlug, {
          id: contentId,
          type: "manuscript",
          title: contentTitle || projectName || "Manuscript",
          body: "",
          book_id: "main",
          folder_id: "main",
        });
        hashRef.current = created.content_hash || "";
        editor.commands.setContent(textToDoc(""));
        onDraftText?.("");
      }
      readyRef.current = true;
      setSaveState("saved");
    })().catch((e: Error) => {
      setError(e.message);
      setSaveState("error");
    });

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [editor, projectSlug, projectName, contentId, contentTitle, onDraftText]);

  const label =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save error" : "";

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={{ background: "var(--sw-parchment)" }}
      onContextMenu={onContextMenu}
    >
      {!zen && (
        <div
          className="flex items-center justify-between border-b px-4 py-2"
          style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
        >
          <h2 className="text-sm font-medium" style={{ color: "var(--sw-teal)" }}>
            {contentTitle || projectName}
          </h2>
          <p className="text-xs" style={{ color: "var(--sw-ink-faint)" }}>
            {label}
          </p>
        </div>
      )}
      {error && <p className="bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}
      <div className={`min-h-0 flex-1 overflow-y-auto ${zen ? "px-10 py-10" : "px-6 py-4"}`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
