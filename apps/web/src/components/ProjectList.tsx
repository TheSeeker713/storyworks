"use client";

import { useState } from "react";

export type ProjectRow = { slug: string; name: string; archived: boolean };

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

const btn =
  "rounded-sm border px-3 py-1.5 text-sm transition-colors cursor-pointer hover:border-teal-800 disabled:cursor-not-allowed disabled:opacity-40";

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
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h2 className="text-lg font-semibold text-teal-950">Projects</h2>
        <p className="mt-1 text-sm text-stone-600">Create or open a project to write. Plain vault markdown — no canvas.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[12rem] flex-1 rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm"
          value={newName}
          onChange={(e) => onNewName(e.target.value)}
          placeholder="New project name"
        />
        <button
          type="button"
          className={`${btn} border-teal-800/40 bg-teal-900 text-white hover:bg-teal-800`}
          onClick={onCreate}
          disabled={!newName.trim()}
        >
          New project
        </button>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Available</h3>
        {projects.length === 0 ? (
          <p className="text-sm text-stone-500">No projects yet.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li
                key={p.slug}
                className={`flex flex-wrap items-center gap-2 rounded-sm border px-3 py-2 ${
                  selectedSlug === p.slug ? "border-teal-800 bg-teal-50" : "border-stone-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  className="flex-1 text-left text-sm font-medium text-stone-900 hover:text-teal-900"
                  onClick={() => onOpen(p.slug)}
                >
                  {p.name}
                </button>
                <button type="button" className={`${btn} border-stone-300 bg-white`} onClick={() => onOpen(p.slug)}>
                  Open
                </button>
                <button
                  type="button"
                  className={`${btn} border-stone-300 bg-white`}
                  onClick={() => onArchive(p.slug)}
                >
                  Archive
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Archived</h3>
        {archivedProjects.length === 0 ? (
          <p className="text-sm text-stone-500">None.</p>
        ) : (
          <ul className="space-y-2">
            {archivedProjects.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-center gap-2 rounded-sm border border-stone-200 bg-stone-50 px-3 py-2">
                <span className="flex-1 text-sm text-stone-700">{p.name}</span>
                <button type="button" className={`${btn} border-stone-300 bg-white`} onClick={() => onRestore(p.slug)}>
                  Restore
                </button>
                <button
                  type="button"
                  className={`${btn} border-red-300 bg-white text-red-800 hover:border-red-600`}
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
            className="w-full max-w-md rounded-sm border border-stone-300 bg-stone-50 p-5 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-stone-900">Delete project</h3>
            <p className="mt-2 text-sm text-stone-600">
              Type the full project name <span className="font-medium">{deleteTarget.name}</span> to confirm.
              Archive was required first.
            </p>
            <input
              className="mt-4 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={deleteTarget.name}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`${btn} border-stone-300 bg-white`}
                onClick={() => setDeleteSlug(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${btn} border-red-800 bg-red-800 text-white hover:bg-red-700`}
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
