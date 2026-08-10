"use client";

type Props = {
  open: boolean;
  onClose: () => void;
};

const INPUTS = [
  { id: "mouse", label: "Mouse / trackpad" },
  { id: "pencil", label: "Apple Pencil" },
] as const;

const TOOLS = [
  { id: "pen", label: "Pen" },
  { id: "highlighter", label: "Highlighter" },
  { id: "eraser", label: "Eraser" },
  { id: "select", label: "Select" },
  { id: "text", label: "Text" },
  { id: "shape", label: "Shape" },
  { id: "image", label: "Image" },
  { id: "undo", label: "Undo" },
] as const;

export default function DrawingPopup({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/25 p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Drawing tools"
        className="w-full max-w-md rounded-lg border bg-white p-5 shadow-xl"
        style={{ borderColor: "var(--sw-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium" style={{ color: "var(--sw-teal)" }}>
            Drawing
          </h3>
          <button type="button" className="text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--sw-ink-muted)" }}>
          UI shell only — shared eight-tool kit; canvas paint lands with PENS (Phase 6).
        </p>
        <p className="mt-2 text-[11px] leading-snug" style={{ color: "var(--sw-ink-faint)" }}>
          Sidecar / iPad + Pencil mirroring is optional hardware convenience, not a sync or backup guarantee. Storyworks
          does not treat external displays as durable storage.
        </p>

        <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
          Input
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {INPUTS.map((input) => (
            <button
              key={input.id}
              type="button"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment)" }}
            >
              {input.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "var(--sw-driftwood)" }}>
          Tools
        </p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="rounded-lg border px-2 py-2 text-xs"
              style={{ borderColor: "var(--sw-border)", background: "white" }}
              title={tool.label}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
