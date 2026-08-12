"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import SkinPreview from "@/components/SkinPreview";

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
  const [openclaw, setOpenclaw] = useState<Awaited<ReturnType<typeof api.openclaw>> | null>(null);
  const [openclawError, setOpenclawError] = useState<string | null>(null);
  const [roleProbe, setRoleProbe] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void api
      .vault()
      .then((v) => setSettings(v.settings || {}))
      .catch((e: Error) => setError(e.message));
    void api
      .openclaw()
      .then((status) => {
        setOpenclaw(status);
        setOpenclawError(status.available ? null : status.error || "OpenClaw unavailable");
      })
      .catch((e: Error) => setOpenclawError(e.message));
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
      const status = await api.openclaw();
      setOpenclaw(status);
      setOpenclawError(status.available ? null : status.error || "OpenClaw unavailable");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function probeRole(role: "research" | "git" | "agentic") {
    setRoleProbe(null);
    try {
      const result = await api.openclawRun(role);
      setRoleProbe(
        result.ok
          ? `${role}: ready`
          : `${role}: ${result.error || "unavailable"}`,
      );
    } catch (e) {
      setRoleProbe(e instanceof Error ? e.message : String(e));
    }
  }

  const tier = String(settings.product_tier || "full");
  const q = search.trim().toLowerCase();
  const show = (label: string) => !q || label.toLowerCase().includes(q);
  const openclawSettings =
    (settings.openclaw as Record<string, boolean> | undefined) || {
      research: false,
      git: false,
      agentic: false,
    };

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

          {show("OpenClaw research git agentic") && (
            <section>
              <h3 className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                OpenClaw
              </h3>
              <p className="mt-1 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                Three independent bridges, all off by default. Each fails closed with a visible
                reason when OpenClaw is missing or the role is not ready — they never hang the
                writing surface.
              </p>
              {openclawError && (
                <p className="mt-2 text-xs text-amber-800" role="status">
                  {openclawError}
                </p>
              )}
              {roleProbe && (
                <p className="mt-2 text-xs" style={{ color: "var(--sw-ink-muted)" }} role="status">
                  {roleProbe}
                </p>
              )}
              {(["research", "git", "agentic"] as const).map((role) => {
                const status = openclaw?.role_status?.[role];
                const enabled = Boolean(openclawSettings[role]);
                const showWarn = enabled && (!status?.ok || Boolean(status?.error));
                return (
                  <div
                    key={role}
                    className="mt-3 rounded-lg border px-3 py-2"
                    style={{ borderColor: "var(--sw-border)" }}
                  >
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={settings.ai_master_enabled === false}
                        onChange={(e) =>
                          void patch({
                            openclaw: {
                              ...openclawSettings,
                              [role]: e.target.checked,
                            },
                          })
                        }
                      />
                      <span className="capitalize">{role}</span>
                    </label>
                    <p className="mt-1 text-[11px]" style={{ color: "var(--sw-ink-muted)" }}>
                      {status?.label || role}
                    </p>
                    <p
                      className="mt-1 text-[11px]"
                      style={{ color: showWarn ? "#9a3412" : "var(--sw-teal)" }}
                    >
                      {!enabled
                        ? "Off"
                        : status?.ok
                          ? "Ready"
                          : status?.error || openclaw?.error || "Unavailable"}
                    </p>
                    {enabled && (
                      <button
                        type="button"
                        className="mt-2 rounded border px-2 py-1 text-[11px]"
                        style={{ borderColor: "var(--sw-border)" }}
                        onClick={() => void probeRole(role)}
                      >
                        Probe role
                      </button>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {show("Appearance skins tray") && (
            <section>
              <h3 className="text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
                Appearance
              </h3>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(settings.daily_skins_enabled)}
                  onChange={(e) => void patch({ daily_skins_enabled: e.target.checked })}
                />
                Daily skins
              </label>
              <p className="mt-1 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
                Rotates a local background image under a fixed light overlay. Uses{" "}
                <code className="font-mono">assets/skins/</code> when present; otherwise a local
                placeholder pattern.
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span>Tool tray edge</span>
                <div className="flex gap-2">
                  {(["left", "right"] as const).map((edge) => (
                    <button
                      key={edge}
                      type="button"
                      className="rounded-lg border px-3 py-1.5 capitalize"
                      style={{
                        borderColor:
                          String(settings.tray_edge || "left") === edge
                            ? "var(--sw-teal)"
                            : "var(--sw-border)",
                        background:
                          String(settings.tray_edge || "left") === edge
                            ? "var(--sw-parchment)"
                            : "white",
                      }}
                      onClick={() => void patch({ tray_edge: edge })}
                    >
                      {edge}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <SkinPreview
                  enabled={Boolean(settings.daily_skins_enabled)}
                  trayEdge={
                    String(settings.tray_edge || "left") === "right" ? "right" : "left"
                  }
                  compact
                />
              </div>
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
