"use client";

import { useEffect, useState } from "react";

type Health = { ok?: boolean; service?: string; phase?: string; stack?: string };

export default function HomePage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then(async (r) => {
        if (!r.ok) throw new Error(`health ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "API unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 via-stone-50 to-emerald-50 text-stone-900">
      <header className="flex items-center justify-between border-b border-teal-900/10 px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-teal-950">Storyworks</h1>
        <p className="text-sm text-stone-600">v2 rebuild · Phase 0 scaffold</p>
      </header>
      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-lg text-stone-700">
          Human-creativity-first writing studio. Canvas and vault land in the next steps.
        </p>
        <div className="mt-8 rounded-sm border border-amber-700/40 bg-white/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-amber-800/80">API health</p>
          {error && <p className="mt-2 text-sm text-red-700">{error} (start FastAPI on :8787)</p>}
          {health && (
            <pre className="mt-2 overflow-x-auto text-sm text-teal-950">
              {JSON.stringify(health, null, 2)}
            </pre>
          )}
          {!health && !error && <p className="mt-2 text-sm text-stone-500">Checking…</p>}
        </div>
      </section>
    </main>
  );
}
