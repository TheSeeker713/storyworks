"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type ContentScene,
  type JournalBook,
  type ProjectMeta,
  type ProjectRow,
  type ProvenanceSummary,
  type SearchHit,
} from "@/lib/api";
import WritingEditor, { type WritingEditorHandle } from "@/components/WritingEditor";
import JournalMap from "@/components/JournalMap";
import MuseLayer from "@/components/MuseLayer";
import AiSandboxPanel from "@/components/AiSandboxPanel";

function wordCount(s: string) {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

function datedContentName(prefix: string) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("-");
  return { id: `${prefix.toLowerCase()}-${stamp}`, title: `${prefix} ${stamp}` };
}

const MODULES = ["novel", "screenplay", "notes", "journal", "blog"] as const;
export type WorkspaceModule = (typeof MODULES)[number];

export function isWorkspaceModule(m?: string): m is WorkspaceModule {
  return !!m && (MODULES as readonly string[]).includes(m);
}

const BLOG_STAGES = [
  { id: "research", contentId: "blog-research", label: "Research" },
  { id: "outline", contentId: "blog-outline", label: "Outline" },
  { id: "draft", contentId: "blog-draft", label: "Draft" },
  { id: "edit", contentId: "blog-edit", label: "Edit" },
] as const;

type ContentRow = { id: string; title: string; type: string; book_id?: string };

type Props = {
  project: ProjectRow;
  onDraftText: (text: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onOpenCodex: () => void;
  screenplayStatus?: string | null;
  museEnabled?: boolean;
  masterOn?: boolean;
  museAppend?: string | null;
  onMuseAppendConsumed?: () => void;
  onMuseAccept?: (s: string) => void;
  draftText?: string;
};

export default function ModuleWorkspace({
  project,
  onDraftText,
  onContextMenu,
  onOpenCodex,
  screenplayStatus,
  museEnabled = false,
  masterOn = false,
  museAppend = null,
  onMuseAppendConsumed,
  onMuseAccept,
  draftText = "",
}: Props) {
  const module = (project.module || "draft") as WorkspaceModule;
  const editorRef = useRef<WritingEditorHandle>(null);

  const [content, setContent] = useState<ContentRow[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [activeTitle, setActiveTitle] = useState("");
  const [activeType, setActiveType] = useState("note");
  const [scenes, setScenes] = useState<ContentScene[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [trayOpen, setTrayOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes
  const [searchQ, setSearchQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  // Journal
  const [zen, setZen] = useState(module === "journal");
  const [books, setBooks] = useState<JournalBook[]>([]);
  const [activeBookId, setActiveBookId] = useState("main");
  const [createBookOpen, setCreateBookOpen] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [bookPrivate, setBookPrivate] = useState(false);
  const [bookPassword, setBookPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [unlockBookId, setUnlockBookId] = useState<string | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockRecoveryKey, setUnlockRecoveryKey] = useState("");
  const [unlockMode, setUnlockMode] = useState<"keychain" | "password" | "recovery">("keychain");
  const [sessionDekByBook, setSessionDekByBook] = useState<Record<string, string>>({});
  const [mapOpen, setMapOpen] = useState(false);
  const [prov, setProv] = useState<ProvenanceSummary | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");

  // Blog
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [blogStage, setBlogStage] = useState("research");

  const loadContent = useCallback(async () => {
    const res = await api.listContent(project.slug);
    setContent(res.content);
    return res.content;
  }, [project.slug]);

  useEffect(() => {
    setZen(module === "journal");
    setError(null);
    void (async () => {
      try {
        const rows = await loadContent();
        if (module === "novel") {
          const chapters = rows.filter((c) => c.type === "chapter");
          const first = chapters[0] || rows[0];
          if (first) {
            setActiveId(first.id);
            setActiveTitle(first.title);
            setActiveType(first.type);
            setExpandedChapter(first.id);
            const sc = await api.getContentScenes(project.slug, first.id);
            setScenes(sc.scenes);
          }
        } else if (module === "screenplay") {
          const scenesRows = rows.filter((c) => c.type === "screenplay_scene");
          const first = scenesRows[0] || rows[0];
          if (first) {
            setActiveId(first.id);
            setActiveTitle(first.title);
            setActiveType(first.type);
          }
        } else if (module === "notes") {
          const notes = rows.filter((c) => c.type === "note");
          const first = notes[0] || rows[0];
          if (first) {
            setActiveId(first.id);
            setActiveTitle(first.title);
            setActiveType("note");
          }
        } else if (module === "journal") {
          const b = await api.listBooks(project.slug);
          setBooks(b.books);
          const bookId = b.books[0]?.id || "main";
          setActiveBookId(bookId);
          const entries = rows.filter(
            (c) => c.type === "journal_entry" && (!c.book_id || c.book_id === bookId),
          );
          const first = entries[0] || rows.find((c) => c.type === "journal_entry");
          if (first) {
            setActiveId(first.id);
            setActiveTitle(first.title);
            setActiveType("journal_entry");
          }
        } else if (module === "blog") {
          const m = await api.getProjectMeta(project.slug);
          setMeta(m);
          const stage = String(m.blog_stage || "research");
          setBlogStage(stage);
          const stageRow = BLOG_STAGES.find((s) => s.id === stage) || BLOG_STAGES[0];
          setActiveId(stageRow.contentId);
          setActiveTitle(stageRow.label);
          setActiveType(`blog_${stageRow.id}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [project.slug, module, loadContent]);

  async function selectChapter(row: ContentRow) {
    setActiveId(row.id);
    setActiveTitle(row.title);
    setActiveType(row.type);
    setExpandedChapter(row.id);
    try {
      const sc = await api.getContentScenes(project.slug, row.id);
      setScenes(sc.scenes);
    } catch {
      setScenes([]);
    }
  }

  async function selectContent(row: ContentRow) {
    setActiveId(row.id);
    setActiveTitle(row.title);
    setActiveType(row.type);
  }

  async function runSearch() {
    if (!searchQ.trim()) {
      setHits([]);
      return;
    }
    try {
      const res = await api.search(searchQ.trim());
      setHits(res.hits);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function setBlogStageAndLoad(stageId: string) {
    const stage = BLOG_STAGES.find((s) => s.id === stageId);
    if (!stage) return;
    try {
      const m = await api.patchProjectMeta(project.slug, { blog_stage: stageId });
      setMeta(m);
      setBlogStage(stageId);
      setActiveId(stage.contentId);
      setActiveTitle(stage.label);
      setActiveType(`blog_${stageId}`);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function setAsideCurrent() {
    if (!activeId) return;
    const current = Array.isArray(meta?.set_aside) ? [...meta!.set_aside!] : [];
    if (current.some((x) => (typeof x === "object" && x && "id" in x ? (x as { id: string }).id === activeId : x === activeId))) {
      setError("Already set aside — nothing discarded.");
      return;
    }
    const next = [...current, { id: activeId, title: activeTitle, stage: blogStage, at: new Date().toISOString() }];
    try {
      const m = await api.patchProjectMeta(project.slug, { set_aside: next });
      setMeta(m);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function createJournalBook() {
    if (!bookTitle.trim()) return;
    if (bookPrivate && !bookPassword) {
      setError("Password required for private books.");
      return;
    }
    try {
      const book = await api.createJournalBook(project.slug, {
        title: bookTitle.trim(),
        privacy: bookPrivate ? "private" : "public",
        password: bookPrivate ? bookPassword : undefined,
      });
      setBooks((b) => [...b, book]);
      setActiveBookId(book.id);
      if (book.recovery_key) setRecoveryKey(book.recovery_key);
      else {
        setCreateBookOpen(false);
        setBookTitle("");
        setBookPassword("");
        setBookPrivate(false);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function unlockBook() {
    if (!unlockBookId) return;
    try {
      const credentials =
        unlockMode === "password"
          ? { password: unlockPassword }
          : unlockMode === "recovery"
            ? { recovery_key: unlockRecoveryKey.trim() }
            : {};
      const unlocked = await api.unlockJournalBook(project.slug, unlockBookId, credentials);
      if (unlocked.session_dek) {
        setSessionDekByBook((m) => ({ ...m, [unlockBookId]: unlocked.session_dek! }));
      }
      setUnlockBookId(null);
      setUnlockPassword("");
      setUnlockRecoveryKey("");
      setUnlockMode("keychain");
      setActiveBookId(unlockBookId);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const activeBookPrivacy = books.find((b) => b.id === activeBookId)?.privacy || "public";
  const activeSessionDek = sessionDekByBook[activeBookId];

  async function transformJournalLoad(body: string) {
    if (module !== "journal" || activeBookPrivacy !== "private") return body;
    if (!activeSessionDek) throw new Error("Unlock this private book to read entries.");
    if (!body.startsWith("swenc:")) return body;
    const opened = await api.openJournalText(project.slug, activeBookId, activeSessionDek, body);
    return opened.text;
  }

  async function transformJournalSave(body: string) {
    if (module !== "journal" || activeBookPrivacy !== "private") return body;
    if (!activeSessionDek) throw new Error("Unlock this private book to save entries.");
    const sealed = await api.sealJournalText(project.slug, activeBookId, activeSessionDek, body);
    return sealed.ciphertext;
  }

  async function newJournalEntry() {
    const today = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    const id = `entry-${Date.now().toString(36)}`;
    try {
      await api.writeContent(project.slug, {
        id,
        type: "journal_entry",
        title: today,
        body: "",
        book_id: activeBookId,
        folder_id: "main",
      });
      const rows = await loadContent();
      const row = rows.find((c) => c.id === id);
      if (row) void selectContent(row);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function newNote() {
    const { id, title } = datedContentName("Note");
    try {
      await api.writeContent(project.slug, {
        id,
        type: "note",
        title,
        body: "",
        book_id: "main",
        folder_id: "main",
        auto_tag: true,
      });
      const rows = await loadContent();
      const row = rows.find((c) => c.id === id);
      if (row) void selectContent(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function renameActiveContent() {
    if (!activeId || !renameTitle.trim()) return;
    try {
      await api.renameContent(project.slug, activeId, renameTitle.trim());
      setActiveTitle(renameTitle.trim());
      setContent((current) =>
        current.map((row) =>
          row.id === activeId ? { ...row, title: renameTitle.trim() } : row,
        ),
      );
      setRenameOpen(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const chapters = content.filter((c) => c.type === "chapter");
  const screenplayScenes = content.filter((c) => c.type === "screenplay_scene");
  const notes = content.filter((c) => c.type === "note");
  const journalEntries = content.filter(
    (c) => c.type === "journal_entry" && (!c.book_id || c.book_id === activeBookId),
  );
  const setAsideCount = Array.isArray(meta?.set_aside) ? meta!.set_aside!.length : 0;

  const editorClass =
    module === "screenplay"
      ? "font-mono max-w-none min-h-[22rem] px-1 py-2 focus:outline-none text-[15px] leading-relaxed text-[var(--sw-ink)] whitespace-pre-wrap"
      : undefined;

  const fontSizeClass = module === "journal" ? "text-[18px]" : "text-[16px]";

  const refreshProvenance = useCallback(async () => {
    if (!activeId) {
      setProv(null);
      return;
    }
    try {
      const r = await api.getProvenance(project.slug, activeId);
      setProv(r.summary);
    } catch {
      setProv(null);
    }
  }, [project.slug, activeId]);

  useEffect(() => {
    void refreshProvenance();
  }, [refreshProvenance, draftText]);

  const getMuseContext = useCallback(
    () => ({
      text: draftText,
      title: activeTitle || project.name,
      projectName: project.name,
    }),
    [draftText, activeTitle, project.name],
  );

  async function handleMuseAccept(s: string) {
    onMuseAccept?.(s);
    if (activeId) {
      try {
        await api.bumpProvenance(project.slug, activeId, { muse_words: wordCount(s) });
        await refreshProvenance();
      } catch {
        /* provenance is best-effort */
      }
    }
  }

  async function runAgent(tool: string, text: string, stage?: string) {
    if (!activeId || !masterOn) return;
    setAgentBusy(true);
    setError(null);
    try {
      const r = await api.agentTool({
        tool,
        text,
        stage,
        content_id: activeId,
        project_slug: project.slug,
        query: text,
      });
      if (!r.ok) setError(r.error || "Agent unavailable");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAgentBusy(false);
    }
  }

  if (zen && module === "journal") {
    return (
      <div className="relative h-full">
        <button
          type="button"
          className="absolute right-4 top-4 z-10 rounded-lg border bg-white/90 px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--sw-border)" }}
          onClick={() => setZen(false)}
        >
          Normal
        </button>
        <button
          type="button"
          className="absolute left-4 top-4 z-10 rounded-lg border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--sw-gold)", color: "var(--sw-gold)", background: "white" }}
          onClick={onOpenCodex}
        >
          Codex
        </button>
        {error && (
          <p className="absolute left-4 top-14 z-10 max-w-md rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        {activeId && (
          <WritingEditor
            ref={editorRef}
            key={`${project.slug}-${activeId}-${activeBookId}-${activeSessionDek ? "u" : "l"}`}
            projectSlug={project.slug}
            projectName={project.name}
            contentId={activeId}
            contentTitle={activeTitle}
            contentType={activeType}
            bookId={activeBookId}
            folderId="main"
            zen
            fontSizeClass={fontSizeClass}
            onDraftText={onDraftText}
            onContextMenu={onContextMenu}
            transformLoad={transformJournalLoad}
            transformSave={transformJournalSave}
            appendText={museAppend}
            onAppendConsumed={onMuseAppendConsumed}
          />
        )}
        <MuseLayer
          enabled={museEnabled}
          masterOn={masterOn}
          getContext={getMuseContext}
          onAccept={(s) => void handleMuseAccept(s)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {error && (
        <p className="bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      {/* Module chrome strip */}
      <div
        className="flex flex-wrap items-center gap-2 border-b px-3 py-1.5"
        style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
      >
        <button
          type="button"
          className="rounded px-2 py-1 text-xs font-medium"
          style={{ color: "var(--sw-gold)", border: "1px solid var(--sw-gold)" }}
          onClick={onOpenCodex}
          title="Open Codex"
        >
          Codex
        </button>
        <span className="text-xs capitalize" style={{ color: "var(--sw-ink-muted)" }}>
          {module}
        </span>
        {activeId && (
          <button
            type="button"
            className="sw-btn-ghost text-xs"
            onClick={() => {
              setRenameTitle(activeTitle);
              setRenameOpen(true);
            }}
          >
            Rename…
          </button>
        )}
        {module === "journal" && (
          <>
            <button
              type="button"
              className="rounded border bg-white px-2 py-1 text-xs"
              style={{ borderColor: "var(--sw-border)" }}
              onClick={() => setMapOpen(true)}
              title="Opt-in journal map (off by default)"
            >
              Map
            </button>
            <button
              type="button"
              className="rounded border bg-white px-2 py-1 text-xs"
              style={{ borderColor: "var(--sw-border)" }}
              onClick={() => setZen(true)}
            >
              Zen
            </button>
          </>
        )}
        {module === "blog" && setAsideCount > 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ background: "#f7efd0", color: "var(--sw-ink)" }}
            title="Set aside — never silently discarded"
          >
            Set aside: {setAsideCount}
          </span>
        )}
        {module === "blog" && (
          <button
            type="button"
            className="rounded border bg-white px-2 py-1 text-xs"
            style={{ borderColor: "var(--sw-border)" }}
            disabled={agentBusy || !masterOn || !activeId}
            onClick={() => void runAgent("blog_review", draftText, blogStage)}
            title="Non-blocking AI review → sandbox card"
          >
            AI review
          </button>
        )}
        {module === "notes" && (
          <button
            type="button"
            className="rounded border bg-white px-2 py-1 text-xs"
            style={{ borderColor: "var(--sw-border)" }}
            disabled={agentBusy || !masterOn || !searchQ.trim()}
            onClick={() => void runAgent("ask_vault", searchQ)}
            title="Ask your vault (NL over search hits)"
          >
            Ask AI
          </button>
        )}
        {prov && (
          <span className="ml-auto text-[11px]" style={{ color: "var(--sw-ink-faint)" }}>
            {prov.total_words} words · {prov.author_words} you · {prov.muse_words} Muse · {prov.ai_words} AI
          </span>
        )}
        {screenplayStatus && (
          <span className="text-xs" style={{ color: "var(--sw-teal)" }}>
            {screenplayStatus}
          </span>
        )}
      </div>

      {module === "blog" && (
        <div
          className="flex flex-wrap items-center gap-1 border-b px-3 py-2"
          style={{ borderColor: "var(--sw-border)" }}
        >
          {BLOG_STAGES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="rounded-lg border px-3 py-1 text-xs"
              style={{
                borderColor: blogStage === s.id ? "var(--sw-teal)" : "var(--sw-border)",
                background: blogStage === s.id ? "var(--sw-teal)" : "white",
                color: blogStage === s.id ? "white" : "var(--sw-ink)",
              }}
              onClick={() => void setBlogStageAndLoad(s.id)}
            >
              {i + 1}. {s.label}
            </button>
          ))}
          <button
            type="button"
            className="ml-auto rounded-lg border px-3 py-1 text-xs"
            style={{ borderColor: "var(--sw-border)", background: "white" }}
            onClick={() => void setAsideCurrent()}
            title="Keep this stage work — never silent discard"
          >
            Set aside
          </button>
        </div>
      )}

      {/* Tabs */}
      {(module === "novel" || module === "screenplay" || module === "journal") && (
        <div
          className="flex items-end gap-1 border-b px-2 pt-2"
          style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
        >
          {module === "novel" &&
            chapters.map((c) => (
              <button
                key={c.id}
                type="button"
                className="rounded-t-lg border border-b-0 px-3 py-1.5 text-xs"
                style={{
                  borderColor: "var(--sw-border)",
                  background: c.id === activeId ? "var(--sw-parchment)" : "transparent",
                }}
                onClick={() => void selectChapter(c)}
              >
                {c.title}
              </button>
            ))}
          {module === "screenplay" &&
            screenplayScenes.map((c) => (
              <button
                key={c.id}
                type="button"
                className="rounded-t-lg border border-b-0 px-3 py-1.5 text-xs"
                style={{
                  borderColor: "var(--sw-border)",
                  background: c.id === activeId ? "var(--sw-parchment)" : "transparent",
                }}
                onClick={() => void selectContent(c)}
              >
                {c.title}
              </button>
            ))}
          {module === "journal" && (
            <>
              {journalEntries.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="rounded-t-lg border border-b-0 px-3 py-1.5 text-xs"
                  style={{
                    borderColor: "var(--sw-border)",
                    background: c.id === activeId ? "var(--sw-parchment)" : "transparent",
                  }}
                  onClick={() => void selectContent(c)}
                >
                  {c.title}
                </button>
              ))}
              <button
                type="button"
                className="px-2 py-1 text-xs"
                style={{ color: "var(--sw-ink-muted)" }}
                onClick={() => void newJournalEntry()}
              >
                +
              </button>
            </>
          )}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <button
          type="button"
          className="absolute left-0 top-0 z-20 h-full w-3 border-r"
          style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
          title="Reveal tray"
          onClick={() => setTrayOpen((v) => !v)}
        />
        {trayOpen && (
          <aside
            className="z-30 w-60 shrink-0 overflow-y-auto border-r p-3 text-sm"
            style={{ borderColor: "var(--sw-border)", background: "white" }}
          >
            {module === "novel" && (
              <>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                  Chapters
                </p>
                <ul className="mt-2 space-y-2">
                  {chapters.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1 text-left text-xs font-medium hover:bg-[var(--sw-parchment-deep)]"
                        onClick={() => void selectChapter(c)}
                      >
                        {c.title}
                      </button>
                      {(expandedChapter === c.id || activeId === c.id) && scenes.length > 0 && (
                        <ul className="ml-2 mt-1 space-y-1 border-l pl-2" style={{ borderColor: "var(--sw-border)" }}>
                          {scenes.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                className="w-full rounded px-2 py-1 text-left text-[11px] hover:bg-[var(--sw-parchment-deep)]"
                                style={{ color: "var(--sw-ink-muted)" }}
                                onClick={() => {
                                  if (activeId !== c.id) void selectChapter(c).then(() => {
                                    setTimeout(() => editorRef.current?.scrollToScene(s.id), 200);
                                  });
                                  else editorRef.current?.scrollToScene(s.id);
                                }}
                              >
                                {s.title || s.id}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {module === "screenplay" && (
              <>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                  Scenes
                </p>
                <ul className="mt-2 space-y-1">
                  {screenplayScenes.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--sw-parchment-deep)]"
                        onClick={() => void selectContent(c)}
                      >
                        {c.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {module === "notes" && (
              <>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                  Notes
                </p>
                <button type="button" className="sw-btn mt-2 w-full text-xs" onClick={() => void newNote()}>
                  New note
                </button>
                <ul className="mt-2 space-y-1">
                  {notes.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--sw-parchment-deep)]"
                        style={{
                          background: c.id === activeId ? "var(--sw-parchment-deep)" : undefined,
                        }}
                        onClick={() => void selectContent(c)}
                      >
                        {c.title}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                  Ask your vault
                </p>
                <div className="mt-2 flex gap-1">
                  <input
                    className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--sw-border)" }}
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void runSearch();
                    }}
                    placeholder="Search…"
                  />
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--sw-border)" }}
                    onClick={() => void runSearch()}
                  >
                    Go
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {hits.map((h) => (
                    <li key={`${h.project_slug}-${h.id}`} className="rounded border px-2 py-1 text-[11px]" style={{ borderColor: "var(--sw-border)" }}>
                      <p className="font-medium">{h.title}</p>
                      <p style={{ color: "var(--sw-ink-faint)" }}>{h.snippet}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {module === "journal" && (
              <>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                  Books
                </p>
                <ul className="mt-2 space-y-1">
                  {books.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs hover:bg-[var(--sw-parchment-deep)]"
                        style={{
                          background: b.id === activeBookId ? "var(--sw-parchment-deep)" : undefined,
                        }}
                        onClick={() => {
                          if (b.privacy === "private") {
                            setUnlockBookId(b.id);
                          } else {
                            setActiveBookId(b.id);
                          }
                        }}
                      >
                        {b.privacy === "private" && <span title="Private">🔒</span>}
                        <span className="truncate">{b.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg border px-2 py-1.5 text-xs"
                  style={{ borderColor: "var(--sw-border)" }}
                  onClick={() => {
                    setCreateBookOpen(true);
                    setRecoveryKey(null);
                  }}
                >
                  New book…
                </button>
              </>
            )}

            {module === "blog" && (
              <>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                  Stages
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  {BLOG_STAGES.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1 text-left hover:bg-[var(--sw-parchment-deep)]"
                        onClick={() => void setBlogStageAndLoad(s.id)}
                      >
                        {s.label}
                        {blogStage === s.id ? " · active" : ""}
                      </button>
                    </li>
                  ))}
                </ul>
                {setAsideCount > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                      Set aside
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px]" style={{ color: "var(--sw-ink-muted)" }}>
                      {(meta?.set_aside || []).map((item, i) => {
                        const row = typeof item === "object" && item ? (item as { id?: string; title?: string }) : {};
                        return (
                          <li key={row.id || i}>
                            {row.title || row.id || String(item)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </aside>
        )}

        <div className="relative min-h-0 min-w-0 flex-1">
          {activeId ? (
            <WritingEditor
              ref={editorRef}
              key={`${project.slug}-${activeId}-${activeBookId}-${activeSessionDek ? "u" : "l"}`}
              projectSlug={project.slug}
              projectName={project.name}
              contentId={activeId}
              contentTitle={activeTitle}
              contentType={activeType}
              autoTag={module === "notes"}
              bookId={module === "journal" ? activeBookId : "main"}
              folderId="main"
              className={editorClass}
              fontSizeClass={fontSizeClass}
              onDraftText={onDraftText}
              onContextMenu={onContextMenu}
              transformLoad={module === "journal" ? transformJournalLoad : undefined}
              transformSave={module === "journal" ? transformJournalSave : undefined}
              appendText={museAppend}
              onAppendConsumed={onMuseAppendConsumed}
            />
          ) : (
            <p className="p-6 text-sm" style={{ color: "var(--sw-ink-faint)" }}>
              No content yet.
            </p>
          )}
          {activeId && (
            <AiSandboxPanel
              projectSlug={project.slug}
              contentId={activeId}
              onApproved={() => void refreshProvenance()}
            />
          )}
          <MuseLayer
            enabled={museEnabled}
            masterOn={masterOn}
            getContext={getMuseContext}
            onAccept={(s) => void handleMuseAccept(s)}
          />
        </div>
      </div>

      {module === "journal" && (
        <JournalMap
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          pins={journalEntries.map((e) => ({ id: e.id, title: e.title }))}
        />
      )}

      {renameOpen && activeId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/25 p-6"
          onClick={() => setRenameOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl"
            style={{ borderColor: "var(--sw-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium" style={{ color: "var(--sw-teal)" }}>Rename content</h3>
            <input
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--sw-border)" }}
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") setRenameOpen(false);
                if (e.key === "Enter") void renameActiveContent();
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="sw-btn-ghost" onClick={() => setRenameOpen(false)}>Cancel</button>
              <button type="button" className="sw-btn" disabled={!renameTitle.trim()} onClick={() => void renameActiveContent()}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}


      {createBookOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/25 p-6"
          onClick={() => {
            if (!recoveryKey) setCreateBookOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-white p-5 shadow-xl"
            style={{ borderColor: "var(--sw-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {recoveryKey ? (
              <>
                <h3 className="font-medium" style={{ color: "var(--sw-teal)" }}>
                  Recovery key
                </h3>
                <p className="mt-2 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                  Store this offline. If you lose both password and key, the book is unrecoverable.
                </p>
                <pre
                  className="mt-3 overflow-x-auto rounded border bg-[var(--sw-parchment)] p-3 text-xs"
                  style={{ borderColor: "var(--sw-border)" }}
                >
                  {recoveryKey}
                </pre>
                <button
                  type="button"
                  className="sw-btn mt-4"
                  onClick={() => {
                    setRecoveryKey(null);
                    setCreateBookOpen(false);
                    setBookTitle("");
                    setBookPassword("");
                    setBookPrivate(false);
                  }}
                >
                  I’ve saved it
                </button>
              </>
            ) : (
              <>
                <h3 className="font-medium" style={{ color: "var(--sw-teal)" }}>
                  New journal book
                </h3>
                <label className="mt-3 block text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                  Title
                  <input
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--sw-border)" }}
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    autoFocus
                  />
                </label>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={false} disabled />
                  Private (encrypted) — temporarily unavailable
                </label>
                <p
                  className="mt-2 rounded-lg border px-3 py-2 text-xs"
                  style={{
                    borderColor: "var(--sw-warning-border, #EF9F27)",
                    background: "var(--sw-warning-bg, #FAEEDA)",
                    color: "var(--sw-warning-text, #854F0B)",
                  }}
                >
                  New Private Books are disabled until Touch ID and the complete recovery flow can be
                  verified end to end. Public Books remain local in your chosen vault.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: "var(--sw-border)" }}
                    onClick={() => setCreateBookOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="button" className="sw-btn" onClick={() => void createJournalBook()}>
                    Create
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {unlockBookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/25 p-6" onClick={() => setUnlockBookId(null)}>
          <div
            className="w-full max-w-sm rounded-lg border bg-white p-5 shadow-xl"
            style={{ borderColor: "var(--sw-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium" style={{ color: "var(--sw-teal)" }}>
              Unlock book
            </h3>
            <p className="mt-1 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
              Existing Private Books can still be recovered. Creating new Private Books is temporarily disabled.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-1">
              {(["keychain", "password", "recovery"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={mode === unlockMode ? "sw-btn text-xs" : "sw-btn-ghost text-xs"}
                  onClick={() => setUnlockMode(mode)}
                >
                  {mode === "keychain" ? "Keychain" : mode === "password" ? "Password" : "Recovery key"}
                </button>
              ))}
            </div>
            {unlockMode === "keychain" && (
              <p
                className="mt-3 rounded-lg border px-3 py-2 text-xs"
                style={{ borderColor: "var(--sw-border)", color: "var(--sw-ink-muted)" }}
              >
                Uses the password already stored in macOS Keychain. Touch ID is not available yet.
              </p>
            )}
            {unlockMode === "password" && (
              <input
                type="password"
                className="mt-3 w-full rounded border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--sw-border)" }}
                placeholder="Password"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                autoFocus
              />
            )}
            {unlockMode === "recovery" && (
              <textarea
                className="mt-3 min-h-20 w-full rounded border px-2 py-1.5 font-mono text-sm"
                style={{ borderColor: "var(--sw-border)" }}
                placeholder="eight-word recovery key"
                value={unlockRecoveryKey}
                onChange={(e) => setUnlockRecoveryKey(e.target.value)}
                autoFocus
              />
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "var(--sw-border)" }} onClick={() => setUnlockBookId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="sw-btn"
                disabled={
                  (unlockMode === "password" && !unlockPassword) ||
                  (unlockMode === "recovery" && !unlockRecoveryKey.trim())
                }
                onClick={() => void unlockBook()}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
