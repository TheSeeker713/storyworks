"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  enabled: boolean;
  masterOn: boolean;
  getContext: () => { text: string; title: string; projectName: string };
  onAccept: (suggestion: string) => void;
};

const IDLE_MS = 2500;

export default function MuseLayer({ enabled, masterOn, getContext, onAccept }: Props) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !masterOn) {
      setSuggestion(null);
      return;
    }

    const bump = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const ctx = getContext();
        if (!ctx.text.trim()) return;
        void api
          .museSuggest(ctx)
          .then((r) => {
            if (r.ok && r.suggestion) {
              setSuggestion(r.suggestion);
              setError(null);
            } else {
              setSuggestion(null);
              setError(r.error || null);
            }
          })
          .catch((e: Error) => {
            setSuggestion(null);
            setError(e.message);
          });
      }, IDLE_MS);
    };

    const onKey = (e: KeyboardEvent) => {
      if (suggestion) {
        if (e.key === "Tab") {
          e.preventDefault();
          onAccept(suggestion);
          setSuggestion(null);
          return;
        }
        setSuggestion(null);
      }
      bump();
    };

    window.addEventListener("keydown", onKey);
    bump();
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, masterOn, getContext, onAccept, suggestion]);

  if (!enabled || !masterOn) return null;

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-40 max-w-xl">
      {suggestion && (
        <p className="rounded-sm border border-teal-800/20 bg-white/90 px-3 py-2 text-sm text-stone-500 shadow-sm">
          <span className="mr-2 text-xs uppercase tracking-wide text-teal-800/70">Muse</span>
          {suggestion}
          <span className="mt-1 block text-xs text-stone-400">Tab accept · any other key dismiss</span>
        </p>
      )}
      {!suggestion && error && (
        <p className="rounded-sm border border-stone-300 bg-stone-100/90 px-3 py-1 text-xs text-stone-500">
          Muse unavailable: {error}
        </p>
      )}
    </div>
  );
}
