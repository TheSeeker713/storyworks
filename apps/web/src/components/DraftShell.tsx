"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ProjectModule, type ProjectRow } from "@/lib/api";
import WritingEditor from "@/components/WritingEditor";
import MuseLayer from "@/components/MuseLayer";
import CodexPanel from "@/components/CodexPanel";
import DrawingPopup from "@/components/DrawingPopup";
import ModuleWorkspace, { isWorkspaceModule } from "@/components/ModuleWorkspace";

type Tab = { id: string; title: string };

type Props = {
  project: ProjectRow;
  projects: ProjectRow[];
  museEnabled: boolean;
  masterOn: boolean;
  onHome: () => void;
  onSwitchProject: (slug: string) => void;
  onDraftText: (text: string) => void;
  draftText: string;
  museAppend: string | null;
  onMuseAppendConsumed: () => void;
  onMuseAccept: (s: string) => void;
  onCreateModule?: (module: ProjectModule) => void;
  commandCodexTarget?: { project_slug: string; type: string; id: string; nonce: number } | null;
  onCommandCodexConsumed?: () => void;
};

const MENU = ["File", "Edit", "View", "Window", "Help"] as const;

const MODULE_TOOLS: { module: ProjectModule; label: string }[] = [
  { module: "novel", label: "Novel" },
  { module: "screenplay", label: "Screenplay" },
  { module: "notes", label: "Notes" },
  { module: "journal", label: "Journal" },
  { module: "blog", label: "Blog" },
];

function datedName(prefix: string) {
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

export default function DraftShell({
  project,
  projects,
  museEnabled,
  masterOn,
  onHome,
  onSwitchProject,
  onDraftText,
  draftText,
  museAppend,
  onMuseAppendConsumed,
  onMuseAccept,
  onCreateModule,
  commandCodexTarget,
  onCommandCodexConsumed,
}: Props) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeId, setActiveId] = useState("");
  const [trayOpen, setTrayOpen] = useState(false);
  const [trayPinned, setTrayPinned] = useState(false);
  const trayOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trayCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zen, setZen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ sha: string; date: string; message: string }[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [books, setBooks] = useState<{ id: string; title: string }[]>([]);
  const [structure, setStructure] = useState<string>("");
  const [shellError, setShellError] = useState<string | null>(null);
  const [codexOpen, setCodexOpen] = useState(false);
  const [noteCodexTarget, setNoteCodexTarget] = useState<{
    type: string;
    id: string;
    nonce: number;
  } | null>(null);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [screenplayStatus, setScreenplayStatus] = useState<string | null>(null);
  const [pensOpen, setPensOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");

  const module = project.module || "draft";
  const useModuleWorkspace = isWorkspaceModule(module);
  const isScreenplay = module === "screenplay";
  const isDraft = module === "draft" || !module;
  const codexInitialEntry =
    commandCodexTarget?.project_slug === project.slug
      ? commandCodexTarget
      : noteCodexTarget;

  function scheduleTrayOpen() {
    if (trayCloseTimer.current) clearTimeout(trayCloseTimer.current);
    if (trayOpenTimer.current) clearTimeout(trayOpenTimer.current);
    trayOpenTimer.current = setTimeout(() => setTrayOpen(true), 150);
  }

  function scheduleTrayClose() {
    if (trayPinned) return;
    if (trayOpenTimer.current) clearTimeout(trayOpenTimer.current);
    if (trayCloseTimer.current) clearTimeout(trayCloseTimer.current);
    trayCloseTimer.current = setTimeout(() => setTrayOpen(false), 260);
  }

  useEffect(() => {
    return () => {
      if (trayOpenTimer.current) clearTimeout(trayOpenTimer.current);
      if (trayCloseTimer.current) clearTimeout(trayCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (commandCodexTarget?.project_slug === project.slug) setCodexOpen(true);
  }, [commandCodexTarget, project.slug]);

  useEffect(() => {
    if (!isDraft) return;
    void api
      .listContent(project.slug)
      .then((result) => {
        const next = result.content.map((row) => ({ id: row.id, title: row.title || row.id }));
        setTabs(next);
        setActiveId((current) =>
          next.some((tab) => tab.id === current) ? current : next[0]?.id || "",
        );
      })
      .catch((e: Error) => setShellError(e.message));
  }, [project.slug, isDraft]);

  const loadStructure = useCallback(async () => {
    try {
      const b = await api.listBooks(project.slug);
      setBooks(b.books);
      const parts: string[] = [];
      for (const book of b.books) {
        const f = await api.listFolders(project.slug, book.id);
        parts.push(`${book.title}: ${f.folders.map((x) => x.title).join(", ") || "(empty)"}`);
      }
      setStructure(parts.join(" · ") || "Main / Main");
    } catch {
      setStructure("Main / Main");
    }
  }, [project.slug]);

  useEffect(() => {
    void loadStructure();
  }, [loadStructure]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (zen && isDraft) {
          e.preventDefault();
          setZen(false);
        }
        setCtx(null);
        setMenuOpen(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zen, isDraft]);

  async function openHistory() {
    setHistoryOpen(true);
    try {
      await api.checkpoint(project.slug, "history").catch(() => undefined);
      const h = await api.history(project.slug);
      setHistory(h.history);
    } catch {
      setHistory([]);
    }
  }

  async function newTab() {
    const { id, title } = datedName("Draft");
    try {
      await api.writeContent(project.slug, {
        id,
        type: "note",
        title,
        body: "",
        book_id: "main",
        folder_id: "main",
      });
      setShellError(null);
      setTabs((t) => [...t, { id, title }]);
      setActiveId(id);
    } catch (e) {
      setShellError(e instanceof Error ? e.message : String(e));
    }
  }

  function closeTab(id: string) {
    setTabs((t) => {
      const next = t.filter((x) => x.id !== id);
      if (next.length === 0) return t;
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  }

  async function renameActive() {
    if (!active || !renameTitle.trim()) return;
    try {
      await api.renameContent(project.slug, active.id, renameTitle.trim());
      setTabs((current) =>
        current.map((tab) =>
          tab.id === active.id ? { ...tab, title: renameTitle.trim() } : tab,
        ),
      );
      setRenameOpen(false);
      setShellError(null);
    } catch (e) {
      setShellError(e instanceof Error ? e.message : String(e));
    }
  }

  const active = tabs.find((t) => t.id === activeId) || tabs[0];
  const recent = projects.filter((p) => !p.archived).slice(0, 12);

  const getMuseContext = useCallback(
    () => ({
      text: draftText,
      title: active?.title || project.name,
      projectName: project.name,
    }),
    [draftText, active?.title, project.name],
  );

  if (zen && isDraft) {
    return (
      <div className="relative h-full">
        <button
          type="button"
          className="absolute right-4 top-4 z-10 rounded-lg border bg-white/90 px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--sw-border)" }}
          title="Exit Zen (Esc)"
          onClick={() => setZen(false)}
        >
          Exit Zen (Esc)
        </button>
        {shellError && (
          <p className="absolute left-4 top-4 z-10 max-w-md rounded bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
            {shellError}
          </p>
        )}
        {active && (
          <WritingEditor
            key={`${project.slug}-${active.id}`}
            projectSlug={project.slug}
            projectName={project.name}
            contentId={active.id}
            contentTitle={active.title}
            zen
            onDraftText={onDraftText}
            appendText={museAppend}
            onAppendConsumed={onMuseAppendConsumed}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" onClick={() => { setCtx(null); setMenuOpen(null); }}>
      {shellError && (
        <p className="bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">
          {shellError}
        </p>
      )}
      {/* Two-tier header */}
      <div className="border-b" style={{ borderColor: "var(--sw-border)", background: "var(--sw-teal)", color: "var(--sw-parchment)" }}>
        <div className="flex flex-wrap items-center gap-3 px-3 py-1.5 text-xs">
          {MENU.map((m) => (
            <div key={m} className="relative">
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(menuOpen === m ? null : m);
                }}
              >
                {m}
              </button>
              {menuOpen === m && (
                <div
                  className="absolute left-0 top-full z-40 mt-1 min-w-[10rem] rounded-lg border bg-white py-1 text-[var(--sw-ink)] shadow-lg"
                  style={{ borderColor: "var(--sw-border)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {m === "File" && (
                    <>
                      <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={onHome}>
                        Home
                      </button>
                      <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => void openHistory()}>
                        Version history…
                      </button>
                      {isDraft && active && (
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]"
                          onClick={() => {
                            setRenameTitle(active.title);
                            setRenameOpen(true);
                            setMenuOpen(null);
                          }}
                        >
                          Rename document…
                        </button>
                      )}
                      {(["markdown", "fountain", "fdx", "epub", "pdf"] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]"
                          onClick={() => {
                            setMenuOpen(null);
                            void (async () => {
                              try {
                                const r = await api.exportProject(project.slug, fmt);
                                const bin = r.encoding === "base64";
                                const blob = bin
                                  ? new Blob(
                                      [Uint8Array.from(atob(r.content), (c) => c.charCodeAt(0))],
                                      { type: r.media_type },
                                    )
                                  : new Blob([r.content], { type: r.media_type });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = r.filename;
                                a.click();
                                URL.revokeObjectURL(url);
                                setShellError(null);
                              } catch (e) {
                                setShellError(e instanceof Error ? e.message : String(e));
                              }
                            })();
                          }}
                        >
                          Export {fmt.toUpperCase()}…
                        </button>
                      ))}
                      {isDraft && (
                        <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => void newTab()}>
                          New tab
                        </button>
                      )}
                    </>
                  )}
                  {m === "View" && (
                    <>
                      {isDraft && (
                        <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => setZen(true)}>
                          Enter Zen mode
                        </button>
                      )}
                      <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => setDrawingOpen(true)}>
                        Drawing tools…
                      </button>
                      <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => setCodexOpen(true)}>
                        Codex…
                      </button>
                    </>
                  )}
                  {m !== "File" && m !== "View" && (
                    <p className="px-3 py-1.5 text-[var(--sw-ink-faint)]">Phase 3–4 shell</p>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="rounded px-2 py-1 font-medium hover:bg-white/10"
              style={{ color: "var(--sw-gold)" }}
              title="Open Codex"
              onClick={(e) => {
                e.stopPropagation();
                setCodexOpen(true);
              }}
            >
              Codex
            </button>
            <label className="flex items-center gap-1 text-[11px] text-[var(--sw-sage)]">
              Project
              <select
                className="rounded border bg-white/95 px-2 py-1 text-[var(--sw-ink)]"
                style={{ borderColor: "var(--sw-border)" }}
                value={project.slug}
                title="Header switcher — Home remains the triage path"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__home__") onHome();
                  else onSwitchProject(v);
                }}
              >
                <option value="__home__">← Home</option>
                {recent.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {isDraft && (
              <button
                type="button"
                className="rounded px-2 py-1 text-[var(--sw-gold)] hover:bg-white/10"
                title="Enter Zen mode"
                onClick={() => setZen(true)}
              >
                Zen
              </button>
            )}
            <button
              type="button"
              className="rounded px-2 py-1 hover:bg-white/10"
              title="Version history"
              onClick={() => void openHistory()}
            >
              History
            </button>
          </div>
        </div>
      </div>

      {useModuleWorkspace ? (
        <div className="min-h-0 flex-1">
          <ModuleWorkspace
            project={project}
            onDraftText={onDraftText}
            onOpenCodex={(entry) => {
              setNoteCodexTarget(
                entry ? { ...entry, nonce: Date.now() } : null,
              );
              setCodexOpen(true);
            }}
            screenplayStatus={screenplayStatus}
            museEnabled={museEnabled}
            masterOn={masterOn}
            museAppend={museAppend}
            onMuseAppendConsumed={onMuseAppendConsumed}
            onMuseAccept={onMuseAccept}
            draftText={draftText}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtx({ x: e.clientX, y: e.clientY });
            }}
          />
        </div>
      ) : (
        <>
          {/* Tab strip */}
          <div
            className="flex items-end gap-1 border-b px-2 pt-2"
            style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
          >
            {tabs.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-1 rounded-t-lg border border-b-0 px-3 py-1.5 text-xs"
                style={{
                  borderColor: "var(--sw-border)",
                  background: t.id === activeId ? "var(--sw-parchment)" : "transparent",
                  color: "var(--sw-ink)",
                }}
              >
                <button type="button" onClick={() => setActiveId(t.id)}>
                  {t.title}
                </button>
                <button type="button" className="opacity-50 hover:opacity-100" title="Close tab" onClick={() => closeTab(t.id)}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="px-2 py-1 text-xs" style={{ color: "var(--sw-ink-muted)" }} onClick={() => void newTab()}>
              +
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1">
            {/* Left tray edge */}
            <button
              type="button"
              className="absolute left-0 top-0 z-20 h-full w-3 border-r"
              style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
              title="Reveal tray"
              onMouseEnter={scheduleTrayOpen}
              onMouseLeave={scheduleTrayClose}
              onClick={() => setTrayOpen((v) => !v)}
            />
            {trayOpen && (
              <aside
                className="z-30 w-56 shrink-0 border-r p-3 text-sm shadow-md"
                style={{ borderColor: "var(--sw-border)", background: "white" }}
                onMouseEnter={scheduleTrayOpen}
                onMouseLeave={scheduleTrayClose}
              >
                <button
                  type="button"
                  className="sw-btn-ghost mb-2 w-full text-xs"
                  onClick={() => setTrayPinned((value) => !value)}
                >
                  {trayPinned ? "Unpin tray" : "Pin tray"}
                </button>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                  Structure
                </p>
                <p className="mt-2 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                  {structure}
                </p>
                <ul className="mt-3 space-y-1 text-xs">
                  {books.map((b) => (
                    <li key={b.id}>Book: {b.title}</li>
                  ))}
                </ul>
                {isDraft && onCreateModule && (
                  <>
                    <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                      Create module
                    </p>
                    <ul className="mt-2 space-y-1">
                      {MODULE_TOOLS.map((t) => (
                        <li key={t.module}>
                          <button
                            type="button"
                            className="w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--sw-parchment-deep)]"
                            onClick={() => onCreateModule(t.module)}
                          >
                            {t.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg border px-2 py-2 text-left text-xs"
                  style={{ borderColor: "var(--sw-border)", color: "var(--sw-teal)" }}
                  onClick={() => setPensOpen(true)}
                >
                  PENS
                </button>
              </aside>
            )}

            <div className="relative min-h-0 min-w-0 flex-1">
              {active ? (
                <WritingEditor
                  key={`${project.slug}-${active.id}`}
                  projectSlug={project.slug}
                  projectName={project.name}
                  contentId={active.id}
                  contentTitle={active.title}
                  onDraftText={onDraftText}
                  appendText={museAppend}
                  onAppendConsumed={onMuseAppendConsumed}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setCtx({ x: e.clientX, y: e.clientY });
                  }}
                />
              ) : (
                <p className="p-6 text-sm" style={{ color: "var(--sw-ink-faint)" }}>
                  Loading document…
                </p>
              )}
              <MuseLayer
                enabled={museEnabled}
                masterOn={masterOn}
                getContext={getMuseContext}
                onAccept={(s) => {
                  onMuseAccept(s);
                  const words = s.trim() ? s.trim().split(/\s+/).length : 0;
                  if (words > 0) {
                    void api.bumpProvenance(project.slug, activeId, { muse_words: words }).catch(() => undefined);
                  }
                }}
              />
            </div>
          </div>
        </>
      )}

      {ctx && (
        <div
          className="fixed z-50 min-w-[9rem] rounded-lg border bg-white py-1 text-sm shadow-lg"
          style={{ left: ctx.x, top: ctx.y, borderColor: "var(--sw-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => { document.execCommand("cut"); setCtx(null); }}>
            Cut
          </button>
          <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => { document.execCommand("copy"); setCtx(null); }}>
            Copy
          </button>
          <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => { document.execCommand("paste"); setCtx(null); }}>
            Paste
          </button>
          {isScreenplay && (
            <>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]"
                onClick={() => {
                  const sel = window.getSelection()?.toString() || draftText.slice(-800);
                  setScreenplayStatus("Describe…");
                  setCtx(null);
                  void api
                    .agentTool({
                      tool: "describe",
                      text: sel,
                      content_id: activeId,
                      project_slug: project.slug,
                    })
                    .then((r) =>
                      setScreenplayStatus(
                        r.ok
                          ? r.sandbox
                            ? "Describe → sandbox card (approve to merge)"
                            : "Describe ready"
                          : r.error || "Describe unavailable",
                      ),
                    )
                    .catch((e: Error) => setScreenplayStatus(e.message));
                }}
              >
                Describe
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]"
                onClick={() => {
                  const sel = window.getSelection()?.toString() || draftText.slice(-800);
                  setScreenplayStatus("Show-don't-tell…");
                  setCtx(null);
                  void api
                    .agentTool({
                      tool: "show_dont_tell",
                      text: sel,
                      content_id: activeId,
                      project_slug: project.slug,
                    })
                    .then((r) =>
                      setScreenplayStatus(
                        r.ok
                          ? r.sandbox
                            ? "Show-don't-tell → sandbox card"
                            : "Revision ready"
                          : r.error || "Unavailable",
                      ),
                    )
                    .catch((e: Error) => setScreenplayStatus(e.message));
                }}
              >
                Show don&apos;t tell
              </button>
            </>
          )}
          {isDraft && active && (
            <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => { closeTab(active.id); setCtx(null); }}>
              Close tab
            </button>
          )}
        </div>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/25 p-6" onClick={() => setHistoryOpen(false)}>
          <div
            className="max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-white p-4 shadow-xl"
            style={{ borderColor: "var(--sw-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium" style={{ color: "var(--sw-teal)" }}>
                Version history
              </h3>
              <button type="button" onClick={() => setHistoryOpen(false)}>
                Close
              </button>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
              Per-project git time machine (local).
            </p>
            {history.length === 0 ? (
              <p className="mt-4 text-sm" style={{ color: "var(--sw-ink-faint)" }}>
                No commits yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {history.map((h) => (
                  <li key={h.sha} className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--sw-border)" }}>
                    <p className="font-mono text-xs" style={{ color: "var(--sw-ink-faint)" }}>
                      {h.sha.slice(0, 8)}
                    </p>
                    <p>{h.message}</p>
                    <p className="text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                      {h.date}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {renameOpen && active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/25 p-6"
          onClick={() => setRenameOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl"
            style={{ borderColor: "var(--sw-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium" style={{ color: "var(--sw-teal)" }}>Rename document</h3>
            <input
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--sw-border)" }}
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") setRenameOpen(false);
                if (e.key === "Enter") void renameActive();
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="sw-btn-ghost" onClick={() => setRenameOpen(false)}>Cancel</button>
              <button type="button" className="sw-btn" disabled={!renameTitle.trim()} onClick={() => void renameActive()}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      <CodexPanel
        open={codexOpen}
        projectSlug={project.slug}
        initialEntry={codexInitialEntry}
        onInitialEntryOpened={() => {
          if (commandCodexTarget?.project_slug === project.slug) {
            onCommandCodexConsumed?.();
          }
          setNoteCodexTarget(null);
        }}
        onClose={() => {
          setCodexOpen(false);
          setNoteCodexTarget(null);
        }}
      />
      <DrawingPopup open={drawingOpen} onClose={() => setDrawingOpen(false)} />

      {pensOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/25 p-6"
          onClick={() => setPensOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-white p-5 shadow-xl"
            style={{ borderColor: "var(--sw-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium" style={{ color: "var(--sw-teal)" }}>
              PENS is on the roadmap
            </h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--sw-ink-muted)" }}>
              Procedural Editor for Nonlinear Storytelling needs its own node-graph intelligence and a
              dedicated visual layer — roughly doubling the rest of the app&apos;s build effort. That work
              stays deliberately parked. The tray icon stays so the vision is visible, not hidden.
            </p>
            <button type="button" className="sw-btn mt-4" onClick={() => setPensOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
