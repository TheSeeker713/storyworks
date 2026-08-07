"use client";

type Props = {
  vaultPath: string;
  onVaultPath: (path: string) => void;
  onComplete: (opts: { hateAi: boolean }) => void;
  ollamaSummary: string;
  sttSummary: string;
};

export default function Onboarding({
  vaultPath,
  onVaultPath,
  onComplete,
  ollamaSummary,
  sttSummary,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/20 p-6 backdrop-blur-sm">
      <div className="max-w-lg rounded-sm border border-teal-900/20 bg-stone-50 p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-teal-950">Welcome to Storyworks</h2>
        <p className="mt-2 text-sm text-stone-600">
          Local writing first. Pick a folder for your vault, then choose whether AI helpers stay available.
        </p>

        <label className="mt-6 block text-sm font-medium text-stone-800">
          Writing directory
          <input
            className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2"
            placeholder="/Users/you/Documents/StoryworksVault"
            value={vaultPath}
            onChange={(e) => onVaultPath(e.target.value)}
          />
        </label>
        <p className="mt-1 text-xs text-stone-500">Changeable later in Settings. Plain markdown files live here.</p>

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

        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            className="rounded-sm border border-stone-400 bg-white px-4 py-2 text-left text-stone-900"
            onClick={() => onComplete({ hateAi: true })}
            disabled={!vaultPath.trim()}
          >
            Do you hate AI? Click here and you won&apos;t have to deal with it, ever, unless you change
            your mind in Settings.
          </button>
          <button
            type="button"
            className="rounded-sm border border-teal-800/40 bg-teal-900 px-4 py-2 text-white disabled:opacity-40"
            onClick={() => onComplete({ hateAi: false })}
            disabled={!vaultPath.trim()}
          >
            Keep AI helpers available (off until I turn them on)
          </button>
        </div>
      </div>
    </div>
  );
}
