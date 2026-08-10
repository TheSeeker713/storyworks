"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type CommandCodexHit,
  type CommandSearchResult,
  type ProjectModule,
} from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onApplied?: (settings: Record<string, unknown>) => void;
  onProject: (slug: string) => void;
  onCodex: (entry: CommandCodexHit) => void;
  onTool: (tool: string, module?: ProjectModule) => void;
};

const EMPTY: CommandSearchResult = { projects: [], codex: [], writing: [] };
const TOOLS: { id: string; label: string; keywords: string; module?: ProjectModule }[] = [
  { id: "settings", label: "Open Settings", keywords: "settings preferences" },
  { id: "new-novel", label: "New Novel", keywords: "create novel", module: "novel" },
  { id: "new-screenplay", label: "New Screenplay", keywords: "create screenplay script", module: "screenplay" },
  { id: "new-notes", label: "New Notes project", keywords: "create notes", module: "notes" },
  { id: "new-journal", label: "New Journal", keywords: "create journal", module: "journal" },
  { id: "new-blog", label: "New Blog", keywords: "create blog", module: "blog" },
];

/** Global Cmd+K palette: Projects, Codex, writing, tools, and direct Settings actions. */
export default function CmdKPalette({
  open,
  onClose,
  onApplied,
  onProject,
  onCodex,
  onTool,
}: Props) {
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CommandSearchResult>(EMPTY);

  useEffect(() => {
    if (!open) {
      setQ("");
      setMsg(null);
      setResults(EMPTY);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !q.trim()) {
      setResults(EMPTY);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      void api
        .commandSearch(q.trim())
        .then((next) => {
          if (!cancelled) setResults(next);
        })
        .catch((e: Error) => {
          if (!cancelled) setMsg(e.message);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, q]);

  const tools = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return TOOLS.slice(0, 2);
    return TOOLS.filter((tool) =>
      `${tool.label} ${tool.keywords}`.toLowerCase().includes(query),
    );
  }, [q]);

  if (!open) return null;

  async function applySettingsRequest() {
    if (!q.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.settingsAgent(q.trim(), true);
      if (!r.ok) {
        setMsg(r.error || "Could not apply");
      } else {
        setMsg(`Applied: ${JSON.stringify(r.patch || {})}`);
        if (r.settings) onApplied?.(r.settings);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-stone-900/30 p-8 pt-24" onClick={onClose}>
      <div
        className="max-h-[70vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-white p-4 shadow-xl"
        style={{ borderColor: "var(--sw-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
          Command
        </p>
        <input
          autoFocus
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--sw-border)" }}
          placeholder="Jump to a project, Codex entry, writing, tool, or setting"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        />
        {searching && <p className="mt-2 text-xs" style={{ color: "var(--sw-ink-faint)" }}>Searching…</p>}

        {results.projects.length > 0 && (
          <section className="mt-4">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>Projects</p>
            {results.projects.map((project) => (
              <button key={project.slug} type="button" className="sw-command-row" onClick={() => { onProject(project.slug); onClose(); }}>
                <span>{project.name}</span><span className="capitalize">{project.module || "draft"}</span>
              </button>
            ))}
          </section>
        )}

        {results.codex.length > 0 && (
          <section className="mt-4">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>Codex</p>
            {results.codex.map((entry) => (
              <button key={`${entry.project_slug}:${entry.type}:${entry.id}`} type="button" className="sw-command-row" onClick={() => { onCodex(entry); onClose(); }}>
                <span>{entry.title}</span><span>{entry.project_name} · {entry.type}</span>
              </button>
            ))}
          </section>
        )}

        {results.writing.length > 0 && (
          <section className="mt-4">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>Writing</p>
            {results.writing.map((hit) => (
              <button key={`${hit.project_slug}:${hit.id}`} type="button" className="sw-command-row" onClick={() => { onProject(hit.project_slug); onClose(); }}>
                <span>{hit.title || hit.id}</span><span>{hit.type || "content"}</span>
              </button>
            ))}
          </section>
        )}

        {tools.length > 0 && (
          <section className="mt-4">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>Tools</p>
            {tools.map((tool) => (
              <button key={tool.id} type="button" className="sw-command-row" onClick={() => { onTool(tool.id, tool.module); onClose(); }}>
                <span>{tool.label}</span><span>Tool</span>
              </button>
            ))}
          </section>
        )}

        {q.trim() && (
          <section className="mt-4">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>Settings</p>
            <button
              type="button"
              className="sw-command-row"
              disabled={busy}
              onClick={() => void applySettingsRequest()}
            >
              <span>{busy ? "Applying…" : `Apply “${q.trim()}”`}</span>
              <span>Direct setting action</span>
            </button>
          </section>
        )}

        {msg && (
          <p className="mt-2 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
            {msg}
          </p>
        )}
        <button type="button" className="sw-btn-ghost mt-4" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
