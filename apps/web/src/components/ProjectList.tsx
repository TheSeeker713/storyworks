"use client";

import { useState } from "react";
import type { ProjectRow } from "@/lib/api";

export type { ProjectRow };

type Props = {
  projects: ProjectRow[];
  archivedProjects: ProjectRow[];
  selectedSlug: string | null;
  newName: string;
  onNewName: (name: string) => void;
  onCreate: () => void;
  onOpen: (slug: string) => void;
  onArchive: (slug: string) => void;
  onRestore: (slug: string) => void;
  onDelete: (slug: string, typedName: string) => void;
};

function formatWhen(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ProjectList({
  projects,
  archivedProjects,
  selectedSlug,
  newName,
  onNewName,
  onCreate,
  onOpen,
  onArchive,
  onRestore,
  onDelete,
}: Props) {
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const deleteTarget = archivedProjects.find((p) => p.slug === deleteSlug) || null;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6" style={{ background: "var(--sw-parchment)" }}>
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--sw-teal)" }}>
          Home
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--sw-ink-muted)" }}>
          List/grid triage for every project. Archive, restore, and typed delete live here. Header switcher is a
          shortcut only.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[12rem] flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
          style={{ borderColor: "var(--sw-border)" }}
          value={newName}
          onChange={(e) => onNewName(e.target.value)}
          placeholder="New project name"
        />
        <button type="button" className="sw-btn" onClick={onCreate} disabled={!newName.trim()}>
          New project
        </button>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
          Projects
        </h3>
        {projects.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--sw-ink-faint)" }}>
            No projects yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--sw-border)" }}>
            <table className="w-full text-left text-sm">
              <thead style={{ background: "var(--sw-parchment-deep)" }}>
                <tr>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Module</th>
                  <th className="px-3 py-2 font-medium">Last modified</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.slug}
                    className="border-t"
                    style={{
                      borderColor: "var(--sw-border)",
                      background: selectedSlug === p.slug ? "#e8f0ec" : "white",
                    }}
                  >
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="font-medium hover:underline"
                        style={{ color: "var(--sw-ink)" }}
                        onClick={() => onOpen(p.slug)}
                      >
                        {p.name}
                      </button>
                    </td>
                    <td className="px-3 py-2 capitalize" style={{ color: "var(--sw-ink-muted)" }}>
                      {p.module || "draft"}
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--sw-ink-muted)" }}>
                      {formatWhen(p.updated_at)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="sw-btn" onClick={() => onOpen(p.slug)}>
                          Open
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border px-3 py-1.5 text-sm"
                          style={{ borderColor: "var(--sw-border)", background: "white" }}
                          onClick={() => onArchive(p.slug)}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
          Archived
        </h3>
        {archivedProjects.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--sw-ink-faint)" }}>
            None.
          </p>
        ) : (
          <ul className="space-y-2">
            {archivedProjects.map((p) => (
              <li
                key={p.slug}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
              >
                <span className="flex-1 text-sm">
                  {p.name}{" "}
                  <span className="capitalize" style={{ color: "var(--sw-ink-muted)" }}>
                    ({p.module || "draft"})
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded-lg border bg-white px-3 py-1.5 text-sm"
                  style={{ borderColor: "var(--sw-border)" }}
                  onClick={() => onRestore(p.slug)}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-sm text-red-800"
                  style={{ borderColor: "#f1c0c0", background: "white" }}
                  onClick={() => {
                    setDeleteSlug(p.slug);
                    setTypedName("");
                  }}
                >
                  Delete…
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/20 p-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-lg border bg-white p-5 shadow-lg"
            style={{ borderColor: "var(--sw-border)" }}
          >
            <h3 className="text-lg font-semibold">Delete project</h3>
            <p className="mt-2 text-sm" style={{ color: "var(--sw-ink-muted)" }}>
              Type the full project name <span className="font-medium">{deleteTarget.name}</span> to confirm.
            </p>
            <input
              className="mt-4 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--sw-border)" }}
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border bg-white px-3 py-1.5 text-sm"
                style={{ borderColor: "var(--sw-border)" }}
                onClick={() => setDeleteSlug(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sw-btn"
                disabled={typedName !== deleteTarget.name}
                onClick={() => {
                  onDelete(deleteTarget.slug, typedName);
                  setDeleteSlug(null);
                }}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
