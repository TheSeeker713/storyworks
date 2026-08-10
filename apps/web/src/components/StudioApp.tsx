"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  type CommandCodexHit,
  type ProjectModule,
  type ProjectRow,
} from "@/lib/api";
import { runConnectorBootChecks, type SttUiState } from "@/lib/connectors";
import BootScreen from "@/components/BootScreen";
import DraftShell from "@/components/DraftShell";
import Onboarding from "@/components/Onboarding";
import ProjectList from "@/components/ProjectList";
import SettingsPanel from "@/components/SettingsPanel";
import CmdKPalette from "@/components/CmdKPalette";

const VAULT_KEY = "storyworks.vaultPath";
const PROJECT_KEY = "storyworks.projectSlug";
const VIEW_KEY = "storyworks.view";
const RECENT_KEY = "storyworks.recentProjects";
const STT_KEY = "storyworks.sttEnabled";
const MUSE_KEY = "storyworks.museEnabled";
const ONBOARD_KEY = "storyworks.onboarded";

function pushRecent(slug: string) {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const prev: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [slug, ...prev.filter((s) => s !== slug)].slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

async function ensureWritingProject(): Promise<ProjectRow> {
  const live = await api.listProjects(false);
  const projects = live.projects.filter((p) => !p.archived);
  const saved = localStorage.getItem(PROJECT_KEY);
  if (saved) {
    const hit = projects.find((p) => p.slug === saved);
    if (hit) return hit;
  }
  if (projects.length > 0) return projects[0];
  return api.createProject("");
}

export default function StudioApp() {
  const [booting, setBooting] = useState(true);
  const [vaultPath, setVaultPath] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [view, setView] = useState<"draft" | "home">("draft");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<ProjectRow[]>([]);
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [commandCodexTarget, setCommandCodexTarget] = useState<{
    project_slug: string;
    type: string;
    id: string;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function syncFromSettings(s: Record<string, unknown>) {
    setMasterOn(s.ai_master_enabled !== false);
    setMuseEnabled(Boolean(s.muse_enabled));
    setSttEnabled(Boolean(s.stt_enabled));
    localStorage.setItem(MUSE_KEY, s.muse_enabled ? "1" : "0");
    localStorage.setItem(STT_KEY, s.stt_enabled ? "1" : "0");
  }

  async function startDictate() {
    if (!masterOn || !sttEnabled || sttState !== "working" || dictating) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone API unavailable in this environment");
      return;
    }
    setDictating(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size) chunks.push(ev.data);
      };
      const stopped = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      });
      recorder.start();
      await new Promise((r) => setTimeout(r, 4000));
      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
      const blob = await stopped;
      const result = await api.transcribeUpload(blob);
      if (result.text) setMuseAppend(result.text);
      else setError(result.error || "No speech transcribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDictating(false);
    }
  }

  const goHome = useCallback(() => {
    setView("home");
    localStorage.setItem(VIEW_KEY, "home");
  }, []);

  const goDraft = useCallback((slug: string) => {
    localStorage.setItem(PROJECT_KEY, slug);
    pushRecent(slug);
    setProjectSlug(slug);
    setView("draft");
    localStorage.setItem(VIEW_KEY, "draft");
  }, []);

  const refreshProjects = useCallback(async () => {
    const [live, archived] = await Promise.all([api.listProjects(false), api.listProjects(true)]);
    setProjects(live.projects.filter((p) => !p.archived));
    setArchivedProjects(archived.projects.filter((p) => p.archived));
  }, []);

  const openVault = useCallback(
    async (path: string, opts?: { forceDraft?: boolean }) => {
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
      const writing = await ensureWritingProject();
      localStorage.setItem(PROJECT_KEY, writing.slug);
      pushRecent(writing.slug);
      setProjectSlug(writing.slug);
      await refreshProjects();
      if (opts?.forceDraft) {
        setView("draft");
        localStorage.setItem(VIEW_KEY, "draft");
      } else {
        const savedView = localStorage.getItem(VIEW_KEY);
        setView(savedView === "home" ? "home" : "draft");
      }
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
      await openVault(path, { forceDraft: true });
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
    setView("draft");
    localStorage.setItem(VIEW_KEY, "draft");
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

  async function createUntitledProject(module: ProjectModule = "draft") {
    setError(null);
    const p = await api.createProject("", module);
    await refreshProjects();
    goDraft(p.slug);
  }

  async function createModuleFromDraft(module: ProjectModule) {
    await createUntitledProject(module);
  }

  function openProject(slug: string) {
    goDraft(slug);
  }

  function openCommandCodex(entry: CommandCodexHit) {
    setCommandCodexTarget({
      project_slug: entry.project_slug,
      type: entry.type,
      id: entry.id,
      nonce: Date.now(),
    });
    goDraft(entry.project_slug);
  }

  function runCommandTool(tool: string, module?: ProjectModule) {
    if (tool === "settings") {
      setSettingsOpen(true);
      return;
    }
    if (module) {
      void createUntitledProject(module).catch((e: Error) => setError(e.message));
    }
  }

  async function archiveProject(slug: string) {
    setError(null);
    await api.archiveProject(slug);
    await refreshProjects();
    if (projectSlug === slug) {
      const writing = await ensureWritingProject();
      goDraft(writing.slug);
      await refreshProjects();
    }
  }

  async function renameProject(slug: string, name: string) {
    setError(null);
    await api.renameProject(slug, name);
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
    await refreshProjects();
    if (projectSlug === slug) {
      const writing = await ensureWritingProject();
      goDraft(writing.slug);
      await refreshProjects();
    }
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

  const headerBtn =
    "rounded-lg border px-3 py-1 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

  if (booting) {
    return <BootScreen ollamaSummary={ollamaSummary} sttSummary={sttSummary} />;
  }

  const showDraft = Boolean(vaultPath && view === "draft" && projectSlug && selectedProject && !selectedProject.archived);

  return (
    <div className="flex h-screen flex-col" style={{ background: "var(--sw-parchment)", color: "var(--sw-ink)" }}>
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
      <header
        className="flex flex-wrap items-center gap-2 border-b px-4 py-2"
        style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
      >
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--sw-teal)" }}>
          Storyworks
        </h1>
        <button
          type="button"
          onClick={() => void toggleMaster()}
          className={headerBtn}
          style={{
            borderColor: masterOn ? "var(--sw-teal)" : "var(--sw-border)",
            background: masterOn ? "var(--sw-teal)" : "white",
            color: masterOn ? "white" : "var(--sw-ink)",
          }}
          title="Master AI kill switch"
        >
          {masterOn ? "AI on" : "AI off"}
        </button>
        <button
          type="button"
          disabled={!masterOn}
          onClick={toggleMuse}
          className={headerBtn}
          style={{ borderColor: "var(--sw-border)", background: "white" }}
          title="Muse idle suggestions"
        >
          {museEnabled && masterOn ? "Muse on" : "Muse off"}
        </button>
        <button
          type="button"
          title={sttState === "working" ? "Toggle local speech-to-text" : "Local STT is not available"}
          disabled={!masterOn || sttState !== "working"}
          onClick={toggleStt}
          className={headerBtn}
          style={{ borderColor: "var(--sw-border)", background: "white" }}
        >
          {sttLabel}
        </button>
        <button
          type="button"
          title="Dictate ~4s into the editor (local STT)"
          disabled={!masterOn || !sttEnabled || sttState !== "working" || dictating}
          onClick={() => void startDictate()}
          className={headerBtn}
          style={{ borderColor: "var(--sw-border)", background: "white" }}
        >
          {dictating ? "Listening…" : "Dictate"}
        </button>
        <button
          type="button"
          className={headerBtn}
          style={{ borderColor: "var(--sw-border)", background: "white" }}
          onClick={() => setSettingsOpen(true)}
          title="Settings (⌘,)"
        >
          Settings
        </button>
        <button
          type="button"
          className={headerBtn}
          style={{ borderColor: "var(--sw-border)", background: "white" }}
          onClick={() => setCmdkOpen(true)}
          title="Command palette (⌘K)"
        >
          ⌘K
        </button>
        <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
          <p
            className="min-w-[12rem] flex-1 truncate rounded-lg border bg-white px-2 py-1 font-mono text-xs"
            style={{ borderColor: "var(--sw-border)", color: "var(--sw-ink-muted)" }}
            title={inputPath || "No vault folder"}
          >
            {inputPath || "No vault folder"}
          </p>
          <button
            type="button"
            className={headerBtn}
            style={{ borderColor: "var(--sw-border)", background: "white" }}
            disabled={pickingFolder}
            onClick={() => void pickVaultFolder()}
          >
            {pickingFolder ? "Choosing…" : "Choose folder"}
          </button>
          <button
            type="button"
            className="sw-btn"
            disabled={!inputPath.trim()}
            onClick={() =>
              void openVault(inputPath.trim(), { forceDraft: true }).catch((e: Error) => setError(e.message))
            }
          >
            Open vault
          </button>
          {vaultPath && (
            <button
              type="button"
              className={headerBtn}
              style={{ borderColor: "var(--sw-border)", background: "white" }}
              onClick={goHome}
              title="List/grid Home — triage at scale"
            >
              Home
            </button>
          )}
        </div>
        <p className="text-xs" style={{ color: "var(--sw-ink-faint)" }}>
          {status}
        </p>
      </header>
      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSettingsChange={syncFromSettings}
      />
      <CmdKPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onApplied={syncFromSettings}
        onProject={openProject}
        onCodex={openCommandCodex}
        onTool={runCommandTool}
      />
      <main className="relative min-h-0 flex-1">
        {!vaultPath ? (
          <div className="flex h-full items-center justify-center p-8" style={{ color: "var(--sw-ink-muted)" }}>
            Choose a vault folder to get started.
          </div>
        ) : showDraft && selectedProject ? (
          <DraftShell
            project={selectedProject}
            projects={projects}
            museEnabled={museEnabled}
            masterOn={masterOn}
            onHome={goHome}
            onSwitchProject={openProject}
            onDraftText={setDraftText}
            draftText={draftText}
            museAppend={museAppend}
            onMuseAppendConsumed={() => setMuseAppend(null)}
            onMuseAccept={(s) => setMuseAppend(s)}
            onCreateModule={(mod) => void createModuleFromDraft(mod).catch((e: Error) => setError(e.message))}
            commandCodexTarget={commandCodexTarget}
            onCommandCodexConsumed={() => setCommandCodexTarget(null)}
          />
        ) : (
          <ProjectList
            projects={projects}
            archivedProjects={archivedProjects}
            selectedSlug={projectSlug}
            onCreate={(mod) => void createUntitledProject(mod).catch((e: Error) => setError(e.message))}
            onOpen={openProject}
            onArchive={(slug) => void archiveProject(slug).catch((e: Error) => setError(e.message))}
            onRestore={(slug) => void restoreProject(slug).catch((e: Error) => setError(e.message))}
            onDelete={(slug, typed) => void deleteProject(slug, typed).catch((e: Error) => setError(e.message))}
            onRename={(slug, name) => void renameProject(slug, name).catch((e: Error) => setError(e.message))}
          />
        )}
      </main>
    </div>
  );
}
