"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { api } from "@/lib/api";

export type WritingEditorHandle = {
  scrollToScene: (sceneId: string) => void;
};

type Props = {
  projectSlug: string;
  projectName: string;
  contentId: string;
  contentTitle?: string;
  contentType?: string;
  autoTag?: boolean;
  bookId?: string;
  folderId?: string;
  zen?: boolean;
  className?: string;
  bodyClassName?: string;
  fontSizeClass?: string;
  onDraftText?: (text: string) => void;
  appendText?: string | null;
  onAppendConsumed?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  /** Optional body transforms (e.g. Journal private-book seal/open). */
  transformLoad?: (body: string) => Promise<string>;
  transformSave?: (body: string) => Promise<string>;
};

const AUTOSAVE_MS = 600;
const CHECKPOINT_IDLE_MS = 30_000;

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

const WritingEditor = forwardRef<WritingEditorHandle, Props>(function WritingEditor(
  {
    projectSlug,
    projectName,
    contentId,
    contentTitle,
    contentType = "manuscript",
    autoTag = false,
    bookId = "main",
    folderId = "main",
    zen = false,
    className,
    bodyClassName,
    fontSizeClass = "text-[16px]",
    onDraftText,
    appendText,
    onAppendConsumed,
    onContextMenu,
    transformLoad,
    transformSave,
  },
  ref,
) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const hashRef = useRef<string>("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkpointTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyRef = useRef(false);
  const inFlightRef = useRef(false);
  const queuedBodyRef = useRef<string | null>(null);
  const projectSlugRef = useRef(projectSlug);
  const contentIdRef = useRef(contentId);
  const contentTitleRef = useRef(contentTitle);
  const projectNameRef = useRef(projectName);
  const contentTypeRef = useRef(contentType);
  const autoTagRef = useRef(autoTag);
  const bookIdRef = useRef(bookId);
  const folderIdRef = useRef(folderId);
  const transformLoadRef = useRef(transformLoad);
  const transformSaveRef = useRef(transformSave);

  projectSlugRef.current = projectSlug;
  contentIdRef.current = contentId;
  contentTitleRef.current = contentTitle;
  projectNameRef.current = projectName;
  contentTypeRef.current = contentType;
  autoTagRef.current = autoTag;
  bookIdRef.current = bookId;
  folderIdRef.current = folderId;
  transformLoadRef.current = transformLoad;
  transformSaveRef.current = transformSave;

  function scheduleCheckpoint(reason: string) {
    if (checkpointTimer.current) clearTimeout(checkpointTimer.current);
    checkpointTimer.current = setTimeout(() => {
      void api.checkpoint(projectSlugRef.current, reason).catch(() => {
        // History is best-effort; markdown truth already persisted.
      });
    }, CHECKPOINT_IDLE_MS);
  }

  function checkpointNow(reason: string) {
    if (checkpointTimer.current) clearTimeout(checkpointTimer.current);
    checkpointTimer.current = null;
    void api.checkpoint(projectSlugRef.current, reason).catch(() => {});
  }

  async function persistBody(body: string) {
    if (inFlightRef.current) {
      queuedBodyRef.current = body;
      return;
    }
    inFlightRef.current = true;
    setSaveState("saving");
    try {
      let next: string | null = body;
      while (next !== null) {
        const toWrite = next;
        next = null;
        queuedBodyRef.current = null;
        try {
          const bodyOut = transformSaveRef.current ? await transformSaveRef.current(toWrite) : toWrite;
          const result = await api.writeContent(projectSlugRef.current, {
            id: contentIdRef.current,
            type: contentTypeRef.current || "manuscript",
            title: contentTitleRef.current || projectNameRef.current || "Manuscript",
            body: bodyOut,
            book_id: bookIdRef.current || "main",
            folder_id: folderIdRef.current || "main",
            expected_hash: hashRef.current || undefined,
            dirty: true,
            auto_tag: autoTagRef.current || undefined,
          });
          if (result.conflict) {
            setError("File changed on disk — reload the project to continue.");
            setSaveState("error");
            return;
          }
          if (result.content_hash) hashRef.current = result.content_hash;
          setError(null);
          setSaveState("saved");
          scheduleCheckpoint(`save ${contentIdRef.current}`);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setSaveState("error");
          return;
        }
        if (queuedBodyRef.current !== null) {
          next = queuedBodyRef.current;
          queuedBodyRef.current = null;
        }
      }
    } finally {
      inFlightRef.current = false;
      if (queuedBodyRef.current !== null) {
        const leftover = queuedBodyRef.current;
        queuedBodyRef.current = null;
        void persistBody(leftover);
      }
    }
  }

  const editorClass =
    className ||
    `prose prose-stone max-w-none min-h-[22rem] px-1 py-2 focus:outline-none ${fontSizeClass} leading-relaxed text-[var(--sw-ink)]`;

  const editor = useEditor({
    extensions: [StarterKit],
    content: textToDoc(""),
    immediatelyRender: false,
    autofocus: true,
    editorProps: {
      attributes: {
        class: editorClass,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const text = ed.getText({ blockSeparator: "\n" });
      onDraftText?.(text);
      if (!readyRef.current) return;
      setSaveState("saving");
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void persistBody(ed.getText({ blockSeparator: "\n" }));
      }, AUTOSAVE_MS);
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToScene(sceneId: string) {
        if (!editor) return;
        const marker = `<!--scene:${sceneId}-->`;
        const root = editor.view.dom;
        const nodes = root.querySelectorAll("p");
        for (const node of Array.from(nodes)) {
          if ((node.textContent || "").includes(marker)) {
            node.setAttribute("data-scene-id", sceneId);
            node.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
        }
        // Fallback: search ProseMirror doc positions
        let foundPos: number | null = null;
        editor.state.doc.descendants((node, pos) => {
          if (foundPos != null) return false;
          if (node.isText && node.text?.includes(marker)) {
            foundPos = pos;
            return false;
          }
          return true;
        });
        if (foundPos != null) {
          const coords = editor.view.coordsAtPos(foundPos);
          const scroller = root.closest(".overflow-y-auto");
          if (scroller instanceof HTMLElement) {
            const top = coords.top - scroller.getBoundingClientRect().top + scroller.scrollTop - 40;
            scroller.scrollTo({ top, behavior: "smooth" });
          }
        }
      },
    }),
    [editor],
  );

  useEffect(() => {
    if (!editor || !appendText) return;
    editor.commands.focus("end");
    editor.commands.insertContent(appendText);
    onAppendConsumed?.();
  }, [appendText, editor, onAppendConsumed]);

  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom;
    el.className = editorClass;
  }, [editor, editorClass]);

  useEffect(() => {
    readyRef.current = false;
    setSaveState("idle");
    setError(null);
    if (!editor) return;

    void (async () => {
      try {
        const existing = await api.readContent(projectSlug, contentId);
        hashRef.current = existing.content_hash || "";
        let body = existing.body || "";
        if (transformLoadRef.current) body = await transformLoadRef.current(body);
        editor.commands.setContent(textToDoc(body));
        onDraftText?.(body);
      } catch {
        const created = await api.writeContent(projectSlug, {
          id: contentId,
          type: contentType || "manuscript",
          title: contentTitle || projectName || "Untitled draft",
          body: "",
          book_id: bookId || "main",
          folder_id: folderId || "main",
          auto_tag: autoTag || undefined,
        });
        hashRef.current = created.content_hash || "";
        editor.commands.setContent(textToDoc(""));
        onDraftText?.("");
      }
      readyRef.current = true;
      setSaveState("saved");
      editor.commands.focus("end");
    })().catch((e: Error) => {
      setError(e.message);
      setSaveState("error");
    });

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [editor, projectSlug, projectName, contentId, contentTitle, contentType, autoTag, bookId, folderId, onDraftText]);

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "hidden") {
        checkpointNow("blur");
      }
    }
    function onBlur() {
      checkpointNow("blur");
    }
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      if (checkpointTimer.current) clearTimeout(checkpointTimer.current);
    };
  }, []);

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
      <div
        className={`min-h-0 flex-1 overflow-y-auto ${zen ? "px-10 py-10" : "px-6 py-4"} ${bodyClassName || ""}`}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

export default WritingEditor;
