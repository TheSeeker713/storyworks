import type { BgManifestItem } from "./backgroundPlaylist";
import { assetUrl } from "./backgroundPlaylist";

type Props = {
  item: BgManifestItem | null;
  opacity: number;
  /** Parallax offset during module transitions only (px). */
  parallaxX?: number;
  parallaxY?: number;
  transitioning?: boolean;
};

/**
 * Full-bleed daily webp layer. Solid fallback when manifest is empty.
 * Parallax is applied only while `transitioning` is true.
 */
export default function DailyBackground({
  item,
  opacity,
  parallaxX = 0,
  parallaxY = 0,
  transitioning = false,
}: Props) {
  const url = item ? assetUrl(item) : null;
  const shiftX = transitioning ? parallaxX : 0;
  const shiftY = transitioning ? parallaxY : 0;

  return (
    <div className="design-bg" aria-hidden="true">
      <div
        className={`design-bg-fallback${url ? "" : " visible"}`}
        style={{ opacity: url ? 0 : 1 }}
      />
      {url && (
        <img
          className="design-bg-image"
          src={url}
          alt=""
          draggable={false}
          style={{
            opacity,
            transform: `translate3d(${shiftX}px, ${shiftY}px, 0) scale(${transitioning ? 1.06 : 1.04})`,
          }}
        />
      )}
      <div
        className="design-bg-veil"
        style={{ opacity: Math.max(0, 0.55 - opacity * 0.35) }}
      />
    </div>
  );
}
