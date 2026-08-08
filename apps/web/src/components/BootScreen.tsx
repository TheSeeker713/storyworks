"use client";

type Props = {
  ollamaSummary: string;
  sttSummary: string;
};

/** Full-screen boot gate. Shown until local connector checks resolve (ok, fail, or timeout). */
export default function BootScreen({ ollamaSummary, sttSummary }: Props) {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-stone-50 px-6 text-stone-900">
      <div className="w-full max-w-md rounded-sm border border-teal-900/20 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-teal-950">Storyworks</h1>
        <p className="mt-2 text-sm text-stone-600">Checking local helpers before you start…</p>
        <ul className="mt-6 space-y-3 text-sm text-stone-800">
          <li>
            <span className="font-medium">Ollama:</span> {ollamaSummary}
          </li>
          <li>
            <span className="font-medium">Speech-to-text:</span> {sttSummary}
          </li>
        </ul>
        <p className="mt-6 text-xs text-stone-500">
          Each check ends in success, failure, or timeout. Nothing stays on “checking…” forever.
        </p>
      </div>
    </div>
  );
}
