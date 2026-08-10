"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The one ordinary-chrome WebGL surface allowed by the Phase 1 architecture.
 * CSS remains a visible fallback when WebGL/init is unavailable.
 */
export default function GoldBezel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const root = rootRef.current;
    const glass = glassRef.current;
    if (!root || !glass) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;

    glass.dataset.config = JSON.stringify({
      blurAmount: 0.12,
      refraction: 0.72,
      chromAberration: 0.035,
      edgeHighlight: 0.18,
      specular: 0.2,
      fresnel: 0.78,
      distortion: 0.025,
      cornerRadius: 10,
      zRadius: 8,
      opacity: 0.96,
      saturation: 0.1,
      tintStrength: 0.02,
      brightness: 0.04,
      shadowOpacity: 0.24,
      shadowSpread: 5,
      shadowOffsetY: 2,
      floating: false,
      button: false,
    });

    void import("@ybouane/liquidglass")
      .then(({ LiquidGlass }) =>
        LiquidGlass.init({ root, glassElements: [glass] }),
      )
      .then((instance) => {
        if (cancelled) {
          instance.destroy();
          return;
        }
        destroy = () => instance.destroy();
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("fallback");
      });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="sw-gold-bezel-root"
      data-webgl-state={state}
      aria-label="Storyworks"
      title={state === "fallback" ? "Storyworks · CSS bezel fallback" : "Storyworks"}
    >
      <div className="sw-gold-bezel-backdrop" aria-hidden="true" />
      <div ref={glassRef} className="sw-gold-bezel">
        <span className="sw-gold-bezel-label">Storyworks</span>
      </div>
    </div>
  );
}
