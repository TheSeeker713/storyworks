"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type SandboxItem } from "@/lib/api";

type Props = {
  projectSlug: string;
  contentId: string;
  onApproved?: () => void;
};

/** Non-blocking AI review / sandbox cards — approve, set aside, or dismiss (never silent). */
export default function AiSandboxPanel({ projectSlug, contentId, onApproved }: Props) {
  const [items, setItems] = useState<SandboxItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await api.listSandbox(projectSlug, contentId);
      setItems(r.items.filter((i) => i.status === "pending" || i.status === "set_aside"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [projectSlug, contentId]);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 4000);
    return () => clearInterval(t);
  }, [reload]);

  async function act(id: string, action: "approve" | "set_aside" | "dismiss") {
    setBusy(id);
    try {
      await api.sandboxAction(projectSlug, id, action);
      await reload();
      if (action === "approve") onApproved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0 && !error) return null;

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-30 w-72 space-y-2">
      {error && (
        <p className="rounded border bg-red-50 px-2 py-1 text-xs text-red-700" style={{ borderColor: "#fecaca" }}>
          {error}
        </p>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border bg-white/95 p-3 shadow-sm"
          style={{ borderColor: "var(--sw-border)" }}
        >
          <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
            AI · {item.kind} · {item.status}
          </p>
          <p className="mt-1 max-h-28 overflow-y-auto text-xs whitespace-pre-wrap" style={{ color: "var(--sw-ink)" }}>
            {item.body}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              className="sw-btn text-[11px] !px-2 !py-1"
              disabled={busy === item.id}
              onClick={() => void act(item.id, "approve")}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded border px-2 py-1 text-[11px]"
              style={{ borderColor: "var(--sw-border)" }}
              disabled={busy === item.id}
              onClick={() => void act(item.id, "set_aside")}
            >
              Set aside
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-[11px]"
              style={{ color: "var(--sw-ink-muted)" }}
              disabled={busy === item.id}
              onClick={() => void act(item.id, "dismiss")}
              title="Kept as dismissed — never silent discard"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
