"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const CanvasBoard = dynamic(() => import("@/components/CanvasBoard"), { ssr: false });

const VAULT_KEY = "storyworks.vaultPath";
const PROJECT_KEY = "storyworks.projectSlug";

export default function StudioApp() {
  const [vaultPath, setVaultPath] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ slug: string; name: string }[]>([]);
  const [newName, setNewName] = useState("My Project");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    const data = await api.listProjects();
    setProjects(data.projects);
  }, []);

  const openVault = useCallback(
    async (path: string) => {
      setError(null);
      setStatus("Opening vault…");
      await api.openVault(path);
      try {
        await api.backup("pre-studio");
      } catch {
        // backup best-effort
      }
      localStorage.setItem(VAULT_KEY, path);
      setVaultPath(path);
      await refreshProjects();
      const saved = localStorage.getItem(PROJECT_KEY);
      if (saved) setProjectSlug(saved);
      setStatus(`Vault: ${path}`);
    },
    [refreshProjects],
  );

  useEffect(() => {
    const saved = localStorage.getItem(VAULT_KEY);
    if (saved) {
      setInputPath(saved);
      void openVault(saved).catch((e: Error) => setError(e.message));
    }
  }, [openVault]);

  async function createProject() {
    setError(null);
    const p = await api.createProject(newName.trim() || "Untitled");
    localStorage.setItem(PROJECT_KEY, p.slug);
    setProjectSlug(p.slug);
    await refreshProjects();
  }

  return (
    <div className="flex h-screen flex-col bg-stone-50 text-stone-900">
      <header className="flex flex-wrap items-center gap-3 border-b border-teal-900/15 bg-gradient-to-r from-teal-50 to-emerald-50 px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight text-teal-950">Storyworks</h1>
        <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
          <input
            className="min-w-[16rem] flex-1 rounded-sm border border-stone-300 bg-white px-2 py-1"
            placeholder="Vault folder path"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
          />
          <button
            type="button"
            className="rounded-sm border border-teal-800/30 bg-teal-900 px-3 py-1 text-white"
            onClick={() => void openVault(inputPath.trim()).catch((e: Error) => setError(e.message))}
          >
            Open vault
          </button>
          {vaultPath && (
            <>
              <input
                className="w-40 rounded-sm border border-stone-300 bg-white px-2 py-1"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button
                type="button"
                className="rounded-sm border border-stone-400 bg-white px-3 py-1"
                onClick={() => void createProject().catch((e: Error) => setError(e.message))}
              >
                New project
              </button>
              <select
                className="rounded-sm border border-stone-300 bg-white px-2 py-1"
                value={projectSlug || ""}
                onChange={(e) => {
                  const slug = e.target.value || null;
                  setProjectSlug(slug);
                  if (slug) localStorage.setItem(PROJECT_KEY, slug);
                }}
              >
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <p className="text-xs text-stone-500">{status}</p>
      </header>
      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <main className="relative min-h-0 flex-1">
        {projectSlug ? (
          <CanvasBoard projectSlug={projectSlug} boardId={`board-${projectSlug}`} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-stone-600">
            Open a vault and create or select a project to write on the canvas.
          </div>
        )}
      </main>
    </div>
  );
}
