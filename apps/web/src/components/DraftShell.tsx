"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ProjectRow } from "@/lib/api";
import WritingEditor from "@/components/WritingEditor";
import MuseLayer from "@/components/MuseLayer";

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
  onZenChange?: (zen: boolean) => void;
};

const MENU = ["File", "Edit", "View", "Window", "Help"] as const;

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
  onZenChange,
}: Props) {
  const [tabs, setTabs] = useState<Tab[]>([{ id: "manuscript", title: "Untitled draft" }]);
  const [activeId, setActiveId] = useState("manuscript");
  const [trayOpen, setTrayOpen] = useState(false);
  const [zen, setZenState] = useState(false);

  const setZen = useCallback(
    (next: boolean) => {
      setZenState(next);
      onZenChange?.(next);
    },
    [onZenChange],
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ sha: string; date: string; message: string }[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [books, setBooks] = useState<{ id: string; title: string }[]>([]);
  const [structure, setStructure] = useState<string>("");
  const [shellError, setShellError] = useState<string | null>(null);

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
        if (zen) {
          e.preventDefault();
          setZen(false);
        }
        setCtx(null);
        setMenuOpen(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zen]);

  async function openHistory() {
    setHistoryOpen(true);
    try {
      const h = await api.history(project.slug);
      setHistory(h.history);
    } catch {
      setHistory([]);
    }
  }

  async function newTab() {
    const id = `doc-${Date.now().toString(36)}`;
    const title = `Untitled ${tabs.length}`;
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
      if (next.length === 0) return [{ id: "manuscript", title: "Untitled draft" }];
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
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

  return (
    <div
      className={
        zen
          ? "fixed inset-0 z-[100] flex min-h-0 flex-col"
          : "flex h-full min-h-0 flex-col"
      }
      style={{ background: "var(--sw-parchment)" }}
      onClick={() => {
        setCtx(null);
        setMenuOpen(null);
      }}
    >
      {zen && (
        <button
          type="button"
          className="absolute right-4 top-4 z-20 rounded-lg border bg-white/90 px-3 py-1.5 text-xs shadow-sm"
          style={{ borderColor: "var(--sw-border)" }}
          title="Exit Zen (Esc)"
          onClick={(e) => {
            e.stopPropagation();
            setZen(false);
          }}
        >
          Exit Zen (Esc)
        </button>
      )}
      {shellError && (
        <p className="bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">
          {shellError}
        </p>
      )}
      {/* Two-tier header — hidden in Zen (text-only full screen) */}
      {!zen && (
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
                      <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => void newTab()}>
                        New tab
                      </button>
                    </>
                  )}
                  {m === "View" && (
                    <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => setZen(true)}>
                      Enter Zen mode
                    </button>
                  )}
                  {m !== "File" && m !== "View" && (
                    <p className="px-3 py-1.5 text-[var(--sw-ink-faint)]">Phase 2 shell</p>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
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
            <button
              type="button"
              className="rounded px-2 py-1 text-[var(--sw-gold)] hover:bg-white/10"
              title="Enter Zen mode"
              onClick={() => setZen(true)}
            >
              Zen
            </button>
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
      )}

      {/* Tab strip */}
      {!zen && (
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
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* Left tray edge */}
        {!zen && (
        <button
          type="button"
          className="absolute left-0 top-0 z-20 h-full w-3 border-r"
          style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
          title="Reveal tray"
          onMouseEnter={() => setTrayOpen(true)}
          onClick={() => setTrayOpen((v) => !v)}
        />
        )}
        {!zen && trayOpen && (
          <aside
            className="z-30 w-56 shrink-0 border-r p-3 text-sm shadow-md"
            style={{ borderColor: "var(--sw-border)", background: "white" }}
            onMouseLeave={() => setTrayOpen(false)}
          >
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
            <p className="mt-4 text-xs" style={{ color: "var(--sw-ink-faint)" }}>
              Novel chapter cards land in Phase 3. PENS: coming soon.
            </p>
            <button type="button" className="mt-2 text-xs underline" style={{ color: "var(--sw-teal)" }} disabled title="Coming soon">
              PENS (coming soon)
            </button>
          </aside>
        )}

        <div className="relative min-h-0 min-w-0 flex-1">
          {/* One editor instance — Zen must not remount or text reloads from disk. */}
          <WritingEditor
            key={`${project.slug}-${active.id}`}
            projectSlug={project.slug}
            projectName={project.name}
            contentId={active.id}
            contentTitle={active.title}
            zen={zen}
            onDraftText={onDraftText}
            appendText={museAppend}
            onAppendConsumed={onMuseAppendConsumed}
            onContextMenu={
              zen
                ? undefined
                : (e) => {
                    e.preventDefault();
                    setCtx({ x: e.clientX, y: e.clientY });
                  }
            }
          />
          {!zen && (
            <MuseLayer
              enabled={museEnabled}
              masterOn={masterOn}
              getContext={getMuseContext}
              onAccept={onMuseAccept}
            />
          )}
        </div>
      </div>

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
          <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-[var(--sw-parchment-deep)]" onClick={() => { closeTab(active.id); setCtx(null); }}>
            Close tab
          </button>
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
    </div>
  );
}
