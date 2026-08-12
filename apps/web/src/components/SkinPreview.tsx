"use client";

import type { CSSProperties } from "react";

export const fallbackSkinBackground: CSSProperties = {
  backgroundColor: "#DCE8DF",
  backgroundImage:
    "radial-gradient(circle at 18% 24%, rgba(27,75,67,.42) 0 9%, transparent 10%)," +
    "radial-gradient(circle at 76% 30%, rgba(138,168,136,.55) 0 14%, transparent 15%)," +
    "linear-gradient(135deg, #C9DDD3 0%, #EFE8D8 52%, #AFC7B7 100%)",
  backgroundSize: "180px 180px, 240px 240px, cover",
};

type Props = {
  enabled: boolean;
  trayEdge: "left" | "right";
  compact?: boolean;
  imageUrl?: string | null;
};

export default function SkinPreview({
  enabled,
  trayEdge,
  compact = false,
  imageUrl = null,
}: Props) {
  const surface: CSSProperties = imageUrl
    ? {
        backgroundColor: "#DCE8DF",
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : fallbackSkinBackground;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${compact ? "h-24" : "h-36"}`}
      style={{ ...surface, borderColor: "var(--sw-border)" }}
      aria-label="Daily skin and tray edge preview"
    >
      <div
        className="absolute inset-0"
        style={{ background: enabled ? "rgba(251,248,241,.58)" : "rgba(251,248,241,.92)" }}
      />
      <div
        className={`absolute inset-y-0 w-2 ${
          trayEdge === "right" ? "right-0 border-l" : "left-0 border-r"
        }`}
        style={{ borderColor: "var(--sw-border)", background: "var(--sw-parchment-deep)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--sw-teal)" }}>
            {enabled ? "Daily skins on" : "Daily skins off"}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: "var(--sw-ink-muted)" }}>
            {imageUrl ? "Today’s local skin" : "Local placeholder pattern"} · tray on the {trayEdge}
          </p>
        </div>
      </div>
    </div>
  );
}
