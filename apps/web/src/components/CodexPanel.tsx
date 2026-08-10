"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  type CodexEntry,
  type CodexEntrySummary,
} from "@/lib/api";

const CODEX_TYPES = ["character", "prop", "worldbuilding", "scene"] as const;

const COMPLEX_FACETS: Record<string, string[]> = {
  character: ["traits", "backstory", "appearance", "relationships"],
  prop: ["description", "origin", "significance", "current_owner"],
  worldbuilding: ["overview", "detail", "history", "rules"],
  scene: ["setting_detail", "participants", "purpose", "sensory"],
};

type Props = {
  open: boolean;
  projectSlug: string;
  onClose: () => void;
  initialEntry?: { type: string; id: string; nonce: number } | null;
  onInitialEntryOpened?: () => void;
};

export default function CodexPanel({
  open,
  projectSlug,
  onClose,
  initialEntry,
  onInitialEntryOpened,
}: Props) {
  const [entries, setEntries] = useState<CodexEntrySummary[]>([]);
  const [suggestedOrder, setSuggestedOrder] = useState<string[]>([...CODEX_TYPES]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<CodexEntry | null>(null);
  const [complex, setComplex] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createType, setCreateType] = useState<string>("character");
  const [progMode, setProgMode] = useState<"addition" | "replacement">("addition");
  const [progPoint, setProgPoint] = useState("");
  const [progText, setProgText] = useState("");
  const [progOrdinal, setProgOrdinal] = useState("");
  const [facetDraft, setFacetDraft] = useState<Record<string, string>>({});
  const [renameName, setRenameName] = useState("");

  const loadList = useCallback(async () => {
    const type = typeFilter === "all" ? undefined : typeFilter;
    const res = await api.listCodex(projectSlug, type);
    setEntries(res.entries);
    if (res.suggested_order?.length) setSuggestedOrder(res.suggested_order);
  }, [projectSlug, typeFilter]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    void (async () => {
      try {
        const v = await api.vault();
        setComplex(Boolean(v.settings.codex_complex));
        await loadList();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [open, loadList]);

  useEffect(() => {
    if (!open || !initialEntry) return;
    void api
      .getCodex(projectSlug, initialEntry.type, initialEntry.id)
      .then((full) => {
        setSelected(full);
        setFacetDraft({ ...(full.facets || {}) });
        setRenameName(full.title);
        setCreating(false);
        setTypeFilter("all");
        setError(null);
        onInitialEntryOpened?.();
      })
      .catch((e: Error) => setError(e.message));
  }, [open, projectSlug, initialEntry, onInitialEntryOpened]);

  async function toggleComplex() {
    const next = !complex;
    setComplex(next);
    try {
      await api.patchSettings({ codex_complex: next });
    } catch (e) {
      setComplex(!next);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function openEntry(row: CodexEntrySummary) {
    try {
      const full = await api.getCodex(projectSlug, row.type, row.id);
      setSelected(full);
      setFacetDraft({ ...(full.facets || {}) });
      setRenameName(full.title);
      setCreating(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function createEntry() {
    if (!name.trim()) return;
    try {
      const entry = await api.createCodex(projectSlug, {
        type: createType,
        name: name.trim(),
        description: description.trim(),
      });
      setName("");
      setDescription("");
      setCreating(false);
      await loadList();
      setSelected(entry);
      setFacetDraft({ ...(entry.facets || {}) });
      setRenameName(entry.title);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveFacets() {
    if (!selected) return;
    try {
      const updated = await api.patchCodex(projectSlug, selected.type, selected.id, {
        facets: facetDraft,
        description: selected.body,
      });
      setSelected(updated);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function renameSelected() {
    if (!selected || !renameName.trim()) return;
    try {
      const updated = await api.patchCodex(projectSlug, selected.type, selected.id, {
        name: renameName.trim(),
      });
      setSelected(updated);
      setRenameName(updated.title);
      await loadList();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function addProgression() {
    if (!selected || !progText.trim() || !progPoint.trim()) return;
    try {
      const ordinal = progOrdinal.trim() === "" ? undefined : Number(progOrdinal);
      const updated = await api.addCodexProgression(projectSlug, selected.type, selected.id, {
        mode: progMode,
        manuscript_point: progPoint.trim(),
        text: progText.trim(),
        ordinal: Number.isFinite(ordinal) ? ordinal : undefined,
      });
      setSelected(updated);
      setProgPoint("");
      setProgText("");
      setProgOrdinal("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!open) return null;

  const orderIndex = (t: string) => {
    const i = suggestedOrder.indexOf(t);
    return i === -1 ? 99 : i;
  };

  const sortedEntries = [...entries].sort((a, b) => {
    const d = orderIndex(a.type) - orderIndex(b.type);
    if (d !== 0) return d;
    return (a.title || "").localeCompare(b.title || "");
  });

  const facetKeys = selected ? COMPLEX_FACETS[selected.type] || Object.keys(selected.facets || {}) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/25 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Codex"
        className="flex h-[min(85vh,720px)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border bg-white shadow-xl"
        style={{ borderColor: "var(--sw-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex flex-wrap items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
        >
          <h3 className="text-lg font-semibold" style={{ color: "var(--sw-gold)" }}>
            Codex
          </h3>
          <label className="ml-2 flex items-center gap-1 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
            Filter
            <select
              className="rounded border bg-white px-2 py-1"
              style={{ borderColor: "var(--sw-border)" }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All</option>
              {CODEX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-lg border px-2 py-1 text-xs"
            style={{ borderColor: "var(--sw-border)", background: "white" }}
            onClick={() => void toggleComplex()}
            title="Toggle Complex facets"
          >
            {complex ? "Complex" : "Simple"}
          </button>
          <button
            type="button"
            className="sw-btn"
            onClick={() => {
              setCreating(true);
              setSelected(null);
            }}
          >
            New entry
          </button>
          <button type="button" className="ml-auto text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Suggested order stepper (non-locking) */}
        <div className="flex flex-wrap gap-2 border-b px-4 py-2" style={{ borderColor: "var(--sw-border)" }}>
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
            Suggested order
          </span>
          {suggestedOrder.map((t, i) => (
            <button
              key={t}
              type="button"
              className="rounded-full border px-2 py-0.5 text-[11px] capitalize"
              style={{
                borderColor: typeFilter === t ? "var(--sw-gold)" : "var(--sw-border)",
                background: typeFilter === t ? "#f7efd0" : "white",
                color: "var(--sw-ink)",
              }}
              onClick={() => setTypeFilter(t)}
              title="Suggestion only — not a lock"
            >
              {i + 1}. {t}
            </button>
          ))}
        </div>

        {error && (
          <p className="bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex min-h-0 flex-1">
          <aside className="w-56 shrink-0 overflow-y-auto border-r p-3" style={{ borderColor: "var(--sw-border)" }}>
            {sortedEntries.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--sw-ink-faint)" }}>
                No entries yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {sortedEntries.map((e) => (
                  <li key={`${e.type}-${e.id}`}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--sw-parchment-deep)]"
                      style={{
                        background: selected?.id === e.id ? "var(--sw-parchment-deep)" : undefined,
                      }}
                      onClick={() => void openEntry(e)}
                    >
                      <span className="block truncate font-medium">{e.title}</span>
                      <span className="block text-[10px] capitalize" style={{ color: "var(--sw-ink-faint)" }}>
                        {e.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto p-4">
            {creating && (
              <div className="space-y-3">
                <h4 className="font-medium" style={{ color: "var(--sw-teal)" }}>
                  Create entry
                </h4>
                <label className="block text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                  Type
                  <select
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--sw-border)" }}
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value)}
                  >
                    {CODEX_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                  Name
                  <input
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--sw-border)" }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </label>
                <label className="block text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                  Description
                  <textarea
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--sw-border)" }}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="As much or as little as you want"
                  />
                </label>
                <button type="button" className="sw-btn" disabled={!name.trim()} onClick={() => void createEntry()}>
                  Create
                </button>
              </div>
            )}

            {!creating && selected && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide capitalize" style={{ color: "var(--sw-driftwood)" }}>
                    {selected.type}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-lg font-medium"
                      style={{ borderColor: "var(--sw-border)", color: "var(--sw-teal)" }}
                      value={renameName}
                      onChange={(e) => setRenameName(e.target.value)}
                      aria-label="Codex entry name"
                    />
                    <button
                      type="button"
                      className="sw-btn-ghost"
                      disabled={!renameName.trim() || renameName.trim() === selected.title}
                      onClick={() => void renameSelected()}
                    >
                      Rename
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--sw-ink)" }}>
                    {selected.body || selected.subject || "—"}
                  </p>
                </div>

                {complex && facetKeys.length > 0 && (
                  <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: "var(--sw-border)" }}>
                    <p className="text-xs font-medium" style={{ color: "var(--sw-driftwood)" }}>
                      Complex facets
                    </p>
                    {facetKeys.map((key) => (
                      <label key={key} className="block text-xs capitalize" style={{ color: "var(--sw-ink-muted)" }}>
                        {key.replace(/_/g, " ")}
                        <textarea
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          style={{ borderColor: "var(--sw-border)" }}
                          rows={2}
                          value={facetDraft[key] || ""}
                          onChange={(e) => setFacetDraft((f) => ({ ...f, [key]: e.target.value }))}
                        />
                      </label>
                    ))}
                    <button type="button" className="sw-btn" onClick={() => void saveFacets()}>
                      Save facets
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                    Progressions
                  </p>
                  {(selected.progressions || []).length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--sw-ink-faint)" }}>
                      None yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {(selected.progressions || []).map((p) => (
                        <li
                          key={p.id}
                          className="rounded-lg border px-3 py-2 text-sm"
                          style={{ borderColor: "var(--sw-border)" }}
                        >
                          <p className="text-[10px]" style={{ color: "var(--sw-ink-faint)" }}>
                            {p.mode} · {p.manuscript_point} · ord {p.ordinal}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">{p.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="grid gap-2 rounded-lg border p-3" style={{ borderColor: "var(--sw-border)" }}>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="rounded border px-2 py-1 text-xs"
                        style={{ borderColor: "var(--sw-border)" }}
                        value={progMode}
                        onChange={(e) => setProgMode(e.target.value as "addition" | "replacement")}
                      >
                        <option value="addition">addition</option>
                        <option value="replacement">replacement</option>
                      </select>
                      <input
                        className="min-w-[8rem] flex-1 rounded border px-2 py-1 text-xs"
                        style={{ borderColor: "var(--sw-border)" }}
                        placeholder="Manuscript point"
                        value={progPoint}
                        onChange={(e) => setProgPoint(e.target.value)}
                      />
                      <input
                        className="w-20 rounded border px-2 py-1 text-xs"
                        style={{ borderColor: "var(--sw-border)" }}
                        placeholder="Ordinal"
                        value={progOrdinal}
                        onChange={(e) => setProgOrdinal(e.target.value)}
                      />
                    </div>
                    <textarea
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      style={{ borderColor: "var(--sw-border)" }}
                      rows={2}
                      placeholder="Progression text"
                      value={progText}
                      onChange={(e) => setProgText(e.target.value)}
                    />
                    <button
                      type="button"
                      className="sw-btn self-start"
                      disabled={!progText.trim() || !progPoint.trim()}
                      onClick={() => void addProgression()}
                    >
                      Add progression
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!creating && !selected && (
              <p className="text-sm" style={{ color: "var(--sw-ink-faint)" }}>
                Select an entry or create one.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
