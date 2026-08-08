"use client";

import { useEffect, useState } from "react";

export type OnboardingComplete = { hateAi: boolean };

type Props = {
  vaultPath: string;
  /** True when Esc / click-outside may close. False on first run before a vault folder is chosen. */
  dismissible: boolean;
  ollamaSummary: string;
  sttSummary: string;
  pickError?: string | null;
  picking?: boolean;
  completing?: boolean;
  onPickFolder: () => void;
  onComplete: (opts: OnboardingComplete) => void | Promise<void>;
  onDismiss: () => void;
  onTourFinished: () => void;
};

type Step = "setup" | "tour";

const btnBase =
  "rounded-sm border px-4 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800";
const btnIdle =
  "cursor-pointer border-stone-400 bg-white text-stone-900 hover:border-teal-800 hover:bg-teal-50";
const btnPrimary =
  "cursor-pointer border-teal-800/40 bg-teal-900 text-white hover:bg-teal-800";
const btnDisabled = "cursor-not-allowed border-stone-300 bg-stone-100 text-stone-400";

/**
 * First-run / settings onboarding.
 *
 * Dismiss rules (deliberate):
 * - First run with no vault folder yet → not dismissible (Esc / outside ignored).
 *   The app has nowhere to write without a vault.
 * - After a vault folder is chosen, or on any later reopen → Esc + click-outside dismiss.
 */
export default function Onboarding({
  vaultPath,
  dismissible,
  ollamaSummary,
  sttSummary,
  pickError,
  picking,
  completing,
  onPickFolder,
  onComplete,
  onDismiss,
  onTourFinished,
}: Props) {
  const [step, setStep] = useState<Step>("setup");
  const hasVault = Boolean(vaultPath.trim());
  const actionsEnabled = hasVault && !picking && !completing;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (step === "tour") {
        onTourFinished();
        return;
      }
      if (!dismissible) return;
      onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissible, onDismiss, onTourFinished, step]);

  async function chooseAi(hateAi: boolean) {
    if (!actionsEnabled) return;
    await onComplete({ hateAi });
    setStep("tour");
  }

  function onBackdropClick() {
    if (step === "tour") {
      onTourFinished();
      return;
    }
    if (!dismissible) return;
    onDismiss();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/20 p-6 backdrop-blur-sm"
      role="presentation"
      onClick={onBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative z-10 max-w-lg rounded-sm border border-teal-900/20 bg-stone-50 p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "setup" ? (
          <>
            <h2 id="onboarding-title" className="text-2xl font-semibold text-teal-950">
              Welcome to Storyworks
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Local writing first. Choose a vault folder, then whether AI helpers stay available.
            </p>

            <div className="mt-6">
              <p className="text-sm font-medium text-stone-800">Writing directory</p>
              <button
                type="button"
                onClick={onPickFolder}
                disabled={Boolean(picking || completing)}
                className={`mt-1 w-full ${btnBase} ${
                  picking || completing ? btnDisabled : btnPrimary
                }`}
              >
                {picking ? "Opening folder picker…" : "Choose vault folder…"}
              </button>
              <p className="mt-2 rounded-sm border border-stone-200 bg-white px-3 py-2 font-mono text-xs text-stone-700">
                {hasVault ? vaultPath : "No folder selected yet"}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Uses the macOS folder dialog. Path is read-only here — change it later from the header.
              </p>
              {pickError && <p className="mt-2 text-xs text-red-700">{pickError}</p>}
            </div>

            <div className="mt-6 space-y-2 text-sm text-stone-700">
              <p>
                <span className="font-medium">Ollama:</span> {ollamaSummary}
              </p>
              <p>
                <span className="font-medium">Speech-to-text:</span> {sttSummary}
              </p>
              <p className="text-xs text-stone-500">
                OpenClaw research, git bridge, and agentic pipelines stay off by default.
              </p>
            </div>

            {!hasVault && (
              <p className="mt-4 text-xs text-amber-800">
                Choose a vault folder first. Until then this screen stays open — Esc and click-outside
                will not dismiss it.
              </p>
            )}

            <div className="mt-8 flex flex-col gap-2">
              <button
                type="button"
                className={`${btnBase} ${actionsEnabled ? btnIdle : btnDisabled}`}
                onClick={() => chooseAi(true)}
                disabled={!actionsEnabled}
                title={hasVault ? undefined : "Choose a vault folder first"}
              >
                Do you hate AI? Click here and you won&apos;t have to deal with it, ever, unless you
                change your mind in Settings.
              </button>
              <button
                type="button"
                className={`${btnBase} ${actionsEnabled ? btnPrimary : btnDisabled}`}
                onClick={() => chooseAi(false)}
                disabled={!actionsEnabled}
                title={hasVault ? undefined : "Choose a vault folder first"}
              >
                Keep AI helpers available (off until I turn them on)
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="onboarding-title" className="text-2xl font-semibold text-teal-950">
              Quick look around
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              A short map of what is already on screen. Nothing to memorize — just know where things
              live.
            </p>
            <ul className="mt-6 list-disc space-y-3 pl-5 text-sm text-stone-800">
              <li>
                <span className="font-medium">Header</span> — Storyworks brand, AI / Muse / STT
                toggles, vault folder, and New project.
              </li>
              <li>
                <span className="font-medium">Canvas</span> — the main writing surface (tldraw). Create
                a project, then type in Note cards; they save as vault markdown.
              </li>
              <li>
                <span className="font-medium">Tool tray</span> — canvas tools once a project is open
                (Select, Hand, Note, Text, Arrow — not freehand drawing).
              </li>
              <li>
                <span className="font-medium">Cmd+K</span> — command palette (wired in a later phase;
                the shortcut is reserved so you know it is coming).
              </li>
            </ul>
            <button
              type="button"
              className={`mt-8 w-full ${btnBase} ${btnPrimary}`}
              onClick={onTourFinished}
            >
              Start writing
            </button>
            <p className="mt-2 text-center text-xs text-stone-500">Esc or click outside also closes.</p>
          </>
        )}
      </div>
    </div>
  );
}
