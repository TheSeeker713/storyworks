"use client";

/**
 * Opt-in Journal map shell (Phase 4.5).
 * MapLibre/OSM/PMTiles full offline tiles are wired as a follow-on; this surface
 * establishes the off-by-default toggle and pin list without Google deps.
 */

type Pin = { id: string; title: string; lat?: number; lng?: number };

type Props = {
  open: boolean;
  onClose: () => void;
  pins: Pin[];
};

export default function JournalMap({ open, onClose, pins }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/30 p-6" onClick={onClose}>
      <div
        className="flex h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border bg-white shadow-xl"
        style={{ borderColor: "var(--sw-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--sw-border)" }}>
          <div>
            <h3 className="font-medium" style={{ color: "var(--sw-teal)" }}>
              Journal map
            </h3>
            <p className="text-xs" style={{ color: "var(--sw-ink-muted)" }}>
              Off by default. MapLibre + OSM/PMTiles offline path — no Google. Tile pack install is next.
            </p>
          </div>
          <button type="button" className="text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="relative min-h-0 flex-1" style={{ background: "linear-gradient(160deg,#dfe8e2,#f4efe4)" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="max-w-sm px-6 text-center text-sm" style={{ color: "var(--sw-ink-muted)" }}>
              Map canvas placeholder. Entry pins listed below; geographic tiles load when a local PMTiles pack is
              configured in Settings → Journal.
            </p>
          </div>
        </div>
        <ul className="max-h-40 overflow-y-auto border-t px-4 py-2 text-sm" style={{ borderColor: "var(--sw-border)" }}>
          {pins.length === 0 ? (
            <li style={{ color: "var(--sw-ink-faint)" }}>No pinned entries yet.</li>
          ) : (
            pins.map((p) => (
              <li key={p.id} className="py-1">
                {p.title}
                {p.lat != null && p.lng != null ? (
                  <span className="ml-2 text-xs" style={{ color: "var(--sw-ink-faint)" }}>
                    {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                  </span>
                ) : (
                  <span className="ml-2 text-xs" style={{ color: "var(--sw-ink-faint)" }}>
                    (no coords)
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
