"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSettingsChange?: (s: Record<string, unknown>) => void;
};

const STT_MODELS = [
  { id: "mlx-community/whisper-tiny", label: "Whisper tiny (speed)" },
  { id: "mlx-community/whisper-large-v3", label: "Whisper large-v3 (accuracy)" },
  { id: "parakeet", label: "Parakeet (listed — fail-closed until wired)" },
] as const;

/** Product Settings — kill switch, Muse/STT, Lite/Full, BYOM disclosure. */
export default function SettingsPanel({ open, onClose, onSettingsChange }: Props) {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    void api
      .vault()
      .then((v) => setSettings(v.settings || {}))
      .catch((e: Error) => setError(e.message));
  }, [open]);

  if (!open) return null;

  async function patch(partial: Record<string, unknown>) {
    setError(null);
    setSaved(false);
    try {
      const merged = await api.patchSettings(partial);
      setSettings(merged);
      onSettingsChange?.(merged);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const tier = String(settings.product_tier || "full");
  const q = search.trim().toLowerCase();
  const show = (label: string) => !q || label.toLowerCase().includes(q);

  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-stone-900/20" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col border-l bg-white shadow-xl"
        style={{ borderColor: "var(--sw-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 border-b bg-white px-4 py-3" style={{ borderColor: "var(--sw-border)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-medium" style={{ color: "var(--sw-teal)" }}>
              Settings
            </h2>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
          <input
            className="mt-2 w-full rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--sw-border)" }}
            placeholder="Search settings"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 text-sm">
          {error && <p className="text-xs text-red-700">{error}</p>}
          {saved && (
            <p className="text-xs" style={{ color: "var(--sw-teal)" }}>
              Saved.
            </p>
          )}

          {show("AI kill") && (
            <section>
              <h3 className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                AI
              </h3>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.ai_master_enabled !== false}
                  onChange={(e) => void patch({ ai_master_enabled: e.target.checked })}
                />
                Master AI kill switch (on = helpers available)
              </label>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(settings.muse_enabled)}
                  disabled={settings.ai_master_enabled === false}
                  onChange={(e) => void patch({ muse_enabled: e.target.checked })}
                />
                Muse
              </label>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(settings.stt_enabled)}
                  disabled={settings.ai_master_enabled === false}
                  onChange={(e) => void patch({ stt_enabled: e.target.checked })}
                />
                Speech-to-text
              </label>
            </section>
          )}

          {show("STT model") && (
            <section>
              <h3 className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                STT model
              </h3>
              <select
                className="mt-2 w-full rounded-lg border px-2 py-1.5"
                style={{ borderColor: "var(--sw-border)" }}
                value={String(settings.stt_model || STT_MODELS[0].id)}
                onChange={(e) => void patch({ stt_model: e.target.value })}
              >
                {STT_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </section>
          )}

          {show("product Lite Full") && (
            <section>
              <h3 className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                Product tier
              </h3>
              <p className="mt-1 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                Lite = preference for no AI helpers. Full = local AI + optional BYOM. Real binary strip of AI
                code is a build-time Deployment concern; this flag steers runtime gates tonight.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5"
                  style={{
                    borderColor: tier === "lite" ? "var(--sw-teal)" : "var(--sw-border)",
                    background: tier === "lite" ? "var(--sw-parchment)" : "white",
                  }}
                  onClick={() =>
                    void patch({ product_tier: "lite", ai_master_enabled: false, muse_enabled: false, stt_enabled: false })
                  }
                >
                  Lite
                </button>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5"
                  style={{
                    borderColor: tier === "full" ? "var(--sw-teal)" : "var(--sw-border)",
                    background: tier === "full" ? "var(--sw-parchment)" : "white",
                  }}
                  onClick={() => void patch({ product_tier: "full" })}
                >
                  Full
                </button>
              </div>
            </section>
          )}

          {show("BYOM") && (
            <section>
              <h3 className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                BYOM
              </h3>
              <p className="mt-1 text-xs leading-snug" style={{ color: "var(--sw-ink-muted)" }}>
                Bring Your Own Model (local endpoint or third-party API). Sending text to a third-party API
                means that provider can see it — Storyworks does not control their retention. Prefer local
                endpoints when privacy matters.
              </p>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(settings.byom_enabled)}
                  onChange={(e) => void patch({ byom_enabled: e.target.checked })}
                />
                Enable BYOM endpoint
              </label>
              <input
                className="mt-2 w-full rounded-lg border px-2 py-1.5 font-mono text-xs"
                style={{ borderColor: "var(--sw-border)" }}
                placeholder="http://127.0.0.1:11434"
                value={String(settings.byom_endpoint || "")}
                onChange={(e) => setSettings((s) => ({ ...s, byom_endpoint: e.target.value }))}
                onBlur={() => void patch({ byom_endpoint: String(settings.byom_endpoint || "") })}
              />
            </section>
          )}

          {show("cloud backup folder") && (
            <section>
              <h3 className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                Cloud backup
              </h3>
              <p className="mt-1 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                Put the vault folder inside iCloud Drive / Dropbox / Google Drive sync folders. No OAuth. Sync
                behavior is the provider&apos;s, not Storyworks&apos;.
              </p>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
