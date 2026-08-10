"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onApplied?: (settings: Record<string, unknown>) => void;
};

/** Cmd+K — NL settings entry into the same settings-via-agent surface. */
export default function CmdKPalette({ open, onClose, onApplied }: Props) {
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setMsg(null);
    }
  }, [open]);

  if (!open) return null;

  async function run() {
    if (!q.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.settingsAgent(q.trim(), true);
      if (!r.ok) {
        setMsg(r.error || "Could not apply");
      } else {
        setMsg(`Applied: ${JSON.stringify(r.patch || {})}`);
        if (r.settings) onApplied?.(r.settings);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-stone-900/30 p-8 pt-24" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border bg-white p-4 shadow-xl"
        style={{ borderColor: "var(--sw-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
          Command · settings
        </p>
        <input
          autoFocus
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--sw-border)" }}
          placeholder='e.g. "turn off Muse" or "turn off AI"'
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter") void run();
          }}
        />
        <div className="mt-3 flex items-center gap-2">
          <button type="button" className="sw-btn" disabled={busy} onClick={() => void run()}>
            {busy ? "Working…" : "Apply"}
          </button>
          <button type="button" className="text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        {msg && (
          <p className="mt-2 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
