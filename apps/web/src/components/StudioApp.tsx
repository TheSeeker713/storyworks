"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { runConnectorBootChecks, type SttUiState } from "@/lib/connectors";
import BootScreen from "@/components/BootScreen";
import MuseLayer from "@/components/MuseLayer";
import Onboarding from "@/components/Onboarding";
import ProjectList, { type ProjectRow } from "@/components/ProjectList";
import WritingEditor from "@/components/WritingEditor";

const VAULT_KEY = "storyworks.vaultPath";
const PROJECT_KEY = "storyworks.projectSlug";
const STT_KEY = "storyworks.sttEnabled";
const MUSE_KEY = "storyworks.museEnabled";
const ONBOARD_KEY = "storyworks.onboarded";

export default function StudioApp() {
  const [booting, setBooting] = useState(true);
  const [vaultPath, setVaultPath] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<ProjectRow[]>([]);
  const [newName, setNewName] = useState("My Project");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [sttState, setSttState] = useState<SttUiState>("unknown");
  const [sttEnabled, setSttEnabled] = useState(false);
  const [museEnabled, setMuseEnabled] = useState(false);
  const [masterOn, setMasterOn] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingFirstRun, setOnboardingFirstRun] = useState(true);
  const [ollamaSummary, setOllamaSummary] = useState("checking…");
  const [sttSummary, setSttSummary] = useState("checking…");
  const [draftText, setDraftText] = useState("");
  const [museAppend, setMuseAppend] = useState<string | null>(null);
  const [pickingFolder, setPickingFolder] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [completingOnboard, setCompletingOnboard] = useState(false);

  const refreshProjects = useCallback(async () => {
    const [live, archived] = await Promise.all([api.listProjects(false), api.listProjects(true)]);
    setProjects(live.projects.filter((p) => !p.archived));
    setArchivedProjects(archived.projects.filter((p) => p.archived));
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
      setInputPath(path);
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
    let cancelled = false;
    void (async () => {
      setSttEnabled(localStorage.getItem(STT_KEY) === "1");
      setMuseEnabled(localStorage.getItem(MUSE_KEY) === "1");

      const result = await runConnectorBootChecks((partial) => {
        if (cancelled) return;
        if (partial.ollamaSummary !== undefined) setOllamaSummary(partial.ollamaSummary);
        if (partial.sttSummary !== undefined) setSttSummary(partial.sttSummary);
        if (partial.sttState !== undefined) setSttState(partial.sttState);
      });
      if (cancelled) return;

      setOllamaSummary(result.ollamaSummary);
      setSttSummary(result.sttSummary);
      setSttState(result.sttState);
      setBooting(false);

      const onboarded = localStorage.getItem(ONBOARD_KEY) === "1";
      const saved = localStorage.getItem(VAULT_KEY);
      if (!onboarded || !saved) {
        setOnboardingFirstRun(true);
        setShowOnboarding(true);
        if (saved) setInputPath(saved);
        return;
      }
      setInputPath(saved);
      void openVault(saved).catch((e: Error) => setError(e.message));
    })();
    return () => {
      cancelled = true;
    };
  }, [openVault]);

  const onboardingDismissible = Boolean(inputPath.trim()) || !onboardingFirstRun;

  async function pickVaultFolder() {
    setPickError(null);
    setPickingFolder(true);
    try {
      const result = await api.pickDirectory();
      if (result.cancelled || !result.ok || !result.path) {
        setPickError(result.cancelled ? null : "Folder picker failed");
        return;
      }
      setInputPath(result.path);
    } catch (e) {
      setPickError((e as Error).message);
    } finally {
      setPickingFolder(false);
    }
  }

  async function finishOnboardingSetup(opts: { hateAi: boolean }) {
    const path = inputPath.trim();
    if (!path) throw new Error("Choose a vault folder first");
    setCompletingOnboard(true);
    setError(null);
    try {
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
    } finally {
      setCompletingOnboard(false);
    }
  }

  function finishOnboardingTour() {
    localStorage.setItem(ONBOARD_KEY, "1");
    setOnboardingFirstRun(false);
    setShowOnboarding(false);
  }

  function dismissOnboarding() {
    if (!onboardingDismissible) return;
    if (localStorage.getItem(ONBOARD_KEY) === "1") {
      setShowOnboarding(false);
      return;
    }
    void finishOnboardingSetup({ hateAi: false })
      .then(() => finishOnboardingTour())
      .catch((e: Error) => setError(e.message));
  }

  async function createProject() {
    setError(null);
    const p = await api.createProject(newName.trim() || "Untitled");
    localStorage.setItem(PROJECT_KEY, p.slug);
    setProjectSlug(p.slug);
    await refreshProjects();
  }

  function openProject(slug: string) {
    localStorage.setItem(PROJECT_KEY, slug);
    setProjectSlug(slug);
  }

  async function archiveProject(slug: string) {
    setError(null);
    await api.archiveProject(slug);
    if (projectSlug === slug) {
      setProjectSlug(null);
      localStorage.removeItem(PROJECT_KEY);
    }
    await refreshProjects();
  }

  async function restoreProject(slug: string) {
    setError(null);
    await api.restoreProject(slug);
    await refreshProjects();
  }

  async function deleteProject(slug: string, typedName: string) {
    setError(null);
    await api.deleteProject(slug, typedName);
    if (projectSlug === slug) {
      setProjectSlug(null);
      localStorage.removeItem(PROJECT_KEY);
    }
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
        : sttState === "unreachable"
          ? "STT unreachable"
          : "STT…";

  const selectedProject =
    projects.find((p) => p.slug === projectSlug) || archivedProjects.find((p) => p.slug === projectSlug);

  const getMuseContext = useCallback(
    () => ({
      text: draftText,
      title: selectedProject?.name || "manuscript",
      projectName: selectedProject?.name || projectSlug || "",
    }),
    [draftText, projectSlug, selectedProject?.name],
  );

  const headerBtn =
    "rounded-sm border px-3 py-1 text-sm transition-colors cursor-pointer hover:border-teal-800 disabled:cursor-not-allowed disabled:opacity-40";

  if (booting) {
    return <BootScreen ollamaSummary={ollamaSummary} sttSummary={sttSummary} />;
  }

  return (
    <div className="flex h-screen flex-col bg-stone-50 text-stone-900">
      {showOnboarding && (
        <Onboarding
          vaultPath={inputPath}
          dismissible={onboardingDismissible}
          ollamaSummary={ollamaSummary}
          sttSummary={sttSummary}
          pickError={pickError}
          picking={pickingFolder}
          completing={completingOnboard}
          onPickFolder={() => void pickVaultFolder()}
          onComplete={async (opts) => {
            await finishOnboardingSetup(opts);
          }}
          onDismiss={dismissOnboarding}
          onTourFinished={finishOnboardingTour}
        />
      )}
      <header className="flex flex-wrap items-center gap-2 border-b border-teal-900/15 bg-gradient-to-r from-teal-50 to-emerald-50 px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight text-teal-950">Storyworks</h1>
        <button
          type="button"
          onClick={() => void toggleMaster()}
          className={`${headerBtn} ${
            masterOn ? "border-teal-800 bg-teal-900 text-white hover:bg-teal-800" : "border-stone-400 bg-white text-stone-700 hover:bg-teal-50"
          }`}
          title="Master AI kill switch"
        >
          {masterOn ? "AI on" : "AI off"}
        </button>
        <button
          type="button"
          disabled={!masterOn}
          onClick={toggleMuse}
          className={`${headerBtn} ${
            museEnabled && masterOn
              ? "border-teal-800 bg-teal-900 text-white hover:bg-teal-800"
              : "border-stone-400 bg-white text-stone-800 hover:bg-teal-50"
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
          className={`${headerBtn} ${
            sttEnabled && masterOn && sttState === "working"
              ? "border-teal-800 bg-teal-900 text-white hover:bg-teal-800"
              : "border-stone-400 bg-white text-stone-800 hover:bg-teal-50"
          }`}
        >
          {sttLabel}
        </button>
        <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
          <p
            className="min-w-[12rem] flex-1 truncate rounded-sm border border-stone-300 bg-white px-2 py-1 font-mono text-xs text-stone-700"
            title={inputPath || "No vault folder"}
          >
            {inputPath || "No vault folder"}
          </p>
          <button
            type="button"
            className={`${headerBtn} border-stone-400 bg-white text-stone-800 hover:bg-teal-50`}
            disabled={pickingFolder}
            onClick={() => void pickVaultFolder()}
          >
            {pickingFolder ? "Choosing…" : "Choose folder"}
          </button>
          <button
            type="button"
            className={`${headerBtn} border-teal-800/30 bg-teal-900 text-white hover:bg-teal-800`}
            disabled={!inputPath.trim()}
            onClick={() => void openVault(inputPath.trim()).catch((e: Error) => setError(e.message))}
          >
            Open vault
          </button>
          {vaultPath && projectSlug && (
            <button
              type="button"
              className={`${headerBtn} border-stone-400 bg-white hover:bg-teal-50`}
              onClick={() => setProjectSlug(null)}
            >
              All projects
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500">{status}</p>
      </header>
      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <main className="relative min-h-0 flex-1">
        {!vaultPath ? (
          <div className="flex h-full items-center justify-center p-8 text-stone-600">
            Choose a vault folder to get started.
          </div>
        ) : projectSlug && selectedProject && !selectedProject.archived ? (
          <>
            <WritingEditor
              key={projectSlug}
              projectSlug={projectSlug}
              projectName={selectedProject.name}
              onDraftText={setDraftText}
              appendText={museAppend}
              onAppendConsumed={() => setMuseAppend(null)}
            />
            <MuseLayer
              enabled={museEnabled}
              masterOn={masterOn}
              getContext={getMuseContext}
              onAccept={(s) => setMuseAppend(s)}
            />
          </>
        ) : (
          <ProjectList
            projects={projects}
            archivedProjects={archivedProjects}
            selectedSlug={projectSlug}
            newName={newName}
            onNewName={setNewName}
            onCreate={() => void createProject().catch((e: Error) => setError(e.message))}
            onOpen={openProject}
            onArchive={(slug) => void archiveProject(slug).catch((e: Error) => setError(e.message))}
            onRestore={(slug) => void restoreProject(slug).catch((e: Error) => setError(e.message))}
            onDelete={(slug, typed) => void deleteProject(slug, typed).catch((e: Error) => setError(e.message))}
          />
        )}
      </main>
    </div>
  );
}
