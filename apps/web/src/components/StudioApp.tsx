"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import MuseLayer from "@/components/MuseLayer";
import Onboarding from "@/components/Onboarding";

const CanvasBoard = dynamic(() => import("@/components/CanvasBoard"), { ssr: false });

const VAULT_KEY = "storyworks.vaultPath";
const PROJECT_KEY = "storyworks.projectSlug";
const STT_KEY = "storyworks.sttEnabled";
const MUSE_KEY = "storyworks.museEnabled";
const ONBOARD_KEY = "storyworks.onboarded";

export default function StudioApp() {
  const [vaultPath, setVaultPath] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ slug: string; name: string }[]>([]);
  const [newName, setNewName] = useState("My Project");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [sttState, setSttState] = useState<"working" | "not_installed" | "unknown">("unknown");
  const [sttEnabled, setSttEnabled] = useState(false);
  const [museEnabled, setMuseEnabled] = useState(false);
  const [masterOn, setMasterOn] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [ollamaSummary, setOllamaSummary] = useState("checking…");
  const [sttSummary, setSttSummary] = useState("checking…");
  const [draftText, setDraftText] = useState("");

  const refreshProjects = useCallback(async () => {
    const data = await api.listProjects();
    setProjects(data.projects);
  }, []);

  const refreshConnectors = useCallback(async () => {
    try {
      const s = await api.stt();
      setSttState(s.ok && s.installed ? "working" : "not_installed");
      setSttSummary(s.ok && s.installed ? `working (${s.model || "mlx_whisper"})` : "not installed");
    } catch {
      setSttState("not_installed");
      setSttSummary("not installed");
    }
    try {
      const o = await api.ollama();
      if (!o.ok) setOllamaSummary(`down (${o.error || "unreachable"})`);
      else setOllamaSummary(`ok · ${(o.models || []).length} models`);
    } catch {
      setOllamaSummary("unreachable");
    }
  }, []);

  const openVault = useCallback(
    async (path: string) => {
      setError(null);
      setStatus("Opening vault…");
      await api.openVault(path);
      try {
        await api.backup("pre-studio");
      } catch {
        // best-effort
      }
      localStorage.setItem(VAULT_KEY, path);
      setVaultPath(path);
      const v = await api.vault();
      setMasterOn(Boolean(v.settings.ai_master_enabled !== false));
      await refreshProjects();
      const saved = localStorage.getItem(PROJECT_KEY);
      if (saved) setProjectSlug(saved);
      setStatus(`Vault: ${path}`);
    },
    [refreshProjects],
  );

  useEffect(() => {
    const onboarded = localStorage.getItem(ONBOARD_KEY) === "1";
    const saved = localStorage.getItem(VAULT_KEY);
    setSttEnabled(localStorage.getItem(STT_KEY) === "1");
    setMuseEnabled(localStorage.getItem(MUSE_KEY) === "1");
    void refreshConnectors();
    if (!onboarded || !saved) {
      setShowOnboarding(true);
      if (saved) setInputPath(saved);
      return;
    }
    setInputPath(saved);
    void openVault(saved).catch((e: Error) => setError(e.message));
  }, [openVault, refreshConnectors]);

  async function finishOnboarding(opts: { hateAi: boolean }) {
    const path = inputPath.trim();
    if (!path) return;
    await openVault(path);
    const patch = opts.hateAi
      ? { ai_master_enabled: false, muse_enabled: false, stt_enabled: false }
      : { ai_master_enabled: true, muse_enabled: false, stt_enabled: false };
    await api.patchSettings(patch);
    setMasterOn(!opts.hateAi);
    setMuseEnabled(false);
    setSttEnabled(false);
    localStorage.setItem(MUSE_KEY, "0");
    localStorage.setItem(STT_KEY, "0");
    localStorage.setItem(ONBOARD_KEY, "1");
    setShowOnboarding(false);
  }

  async function createProject() {
    setError(null);
    const p = await api.createProject(newName.trim() || "Untitled");
    localStorage.setItem(PROJECT_KEY, p.slug);
    setProjectSlug(p.slug);
    await refreshProjects();
  }

  async function toggleMaster() {
    const next = !masterOn;
    setMasterOn(next);
    try {
      await api.patchSettings({ ai_master_enabled: next });
    } catch (e) {
      setError((e as Error).message);
    }
    if (!next) {
      setMuseEnabled(false);
      setSttEnabled(false);
      localStorage.setItem(MUSE_KEY, "0");
      localStorage.setItem(STT_KEY, "0");
    }
  }

  function toggleStt() {
    if (!masterOn || sttState !== "working") return;
    const next = !sttEnabled;
    setSttEnabled(next);
    localStorage.setItem(STT_KEY, next ? "1" : "0");
    void api.patchSettings({ stt_enabled: next }).catch(() => undefined);
  }

  function toggleMuse() {
    if (!masterOn) return;
    const next = !museEnabled;
    setMuseEnabled(next);
    localStorage.setItem(MUSE_KEY, next ? "1" : "0");
    void api.patchSettings({ muse_enabled: next }).catch(() => undefined);
  }

  const sttLabel =
    sttState === "working"
      ? sttEnabled
        ? "STT on"
        : "STT off"
      : sttState === "not_installed"
        ? "STT not installed"
        : "STT…";

  const getMuseContext = useCallback(
    () => ({
      text: draftText,
      title: "canvas note",
      projectName: projectSlug || "",
    }),
    [draftText, projectSlug],
  );

  return (
    <div className="flex h-screen flex-col bg-stone-50 text-stone-900">
      {showOnboarding && (
        <Onboarding
          vaultPath={inputPath}
          onVaultPath={setInputPath}
          onComplete={(opts) => void finishOnboarding(opts).catch((e: Error) => setError(e.message))}
          ollamaSummary={ollamaSummary}
          sttSummary={sttSummary}
        />
      )}
      <header className="flex flex-wrap items-center gap-2 border-b border-teal-900/15 bg-gradient-to-r from-teal-50 to-emerald-50 px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight text-teal-950">Storyworks</h1>
        <button
          type="button"
          onClick={() => void toggleMaster()}
          className={`rounded-sm border px-3 py-1 text-sm ${
            masterOn ? "border-teal-800 bg-teal-900 text-white" : "border-stone-400 bg-white text-stone-700"
          }`}
          title="Master AI kill switch"
        >
          {masterOn ? "AI on" : "AI off"}
        </button>
        <button
          type="button"
          disabled={!masterOn}
          onClick={toggleMuse}
          className={`rounded-sm border px-3 py-1 text-sm disabled:opacity-40 ${
            museEnabled && masterOn
              ? "border-teal-800 bg-teal-900 text-white"
              : "border-stone-400 bg-white text-stone-800"
          }`}
          title="Muse idle suggestions"
        >
          {museEnabled && masterOn ? "Muse on" : "Muse off"}
        </button>
        <button
          type="button"
          title={
            sttState === "working"
              ? "Toggle local speech-to-text"
              : "Local STT is not available on this machine"
          }
          disabled={!masterOn || sttState !== "working"}
          onClick={toggleStt}
          className={`rounded-sm border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
            sttEnabled && masterOn && sttState === "working"
              ? "border-teal-800 bg-teal-900 text-white"
              : "border-stone-400 bg-white text-stone-800"
          }`}
        >
          {sttLabel}
        </button>
        <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
          <input
            className="min-w-[12rem] flex-1 rounded-sm border border-stone-300 bg-white px-2 py-1"
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
                className="w-36 rounded-sm border border-stone-300 bg-white px-2 py-1"
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
          <>
            <CanvasBoard
              projectSlug={projectSlug}
              boardId={`board-${projectSlug}`}
              onDraftText={setDraftText}
            />
            <MuseLayer
              enabled={museEnabled}
              masterOn={masterOn}
              getContext={getMuseContext}
              onAccept={(s) => setDraftText((t) => `${t}${s}`)}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-stone-600">
            Open a vault and create or select a project to write on the canvas.
          </div>
        )}
      </main>
    </div>
  );
}
