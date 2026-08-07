import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DailyBackground from "../design/DailyBackground";
import ModuleStage, { MODULES, type WritingModule } from "../design/ModuleStage";
import {
  loadManifest,
  readOpacity,
  resolvePlaylist,
  todaysItem,
  writeOpacity,
  type BgManifestItem,
  type PlaylistState,
} from "../design/backgroundPlaylist";

/**
 * Phase 1B design sandbox — full-bleed studio shell.
 * Experiments only; production `/` and editor stay Phase 0 wire until human clear.
 */
export default function DesignSandbox() {
  const [items, setItems] = useState<BgManifestItem[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistState | null>(null);
  const [opacity, setOpacity] = useState(() => readOpacity());
  const [module, setModule] = useState<WritingModule>("novel");
  const [transitioning, setTransitioning] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const transitionTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadManifest().then((manifest) => {
      if (cancelled) return;
      setItems(manifest.items);
      setPlaylist(resolvePlaylist(manifest.items));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimer.current != null) {
        window.clearTimeout(transitionTimer.current);
      }
    };
  }, []);

  const today = playlist ? todaysItem(items, playlist) : null;

  function selectModule(next: WritingModule) {
    if (next === module) return;
    const dir = MODULES.findIndex((m) => m.id === next) - MODULES.findIndex((m) => m.id === module);
    setParallax({ x: dir * 18, y: Math.abs(dir) * 6 });
    setTransitioning(true);
    setModule(next);
    if (transitionTimer.current != null) {
      window.clearTimeout(transitionTimer.current);
    }
    transitionTimer.current = window.setTimeout(() => {
      setTransitioning(false);
      setParallax({ x: 0, y: 0 });
      transitionTimer.current = null;
    }, 520);
  }

  function onOpacity(value: number) {
    setOpacity(value);
    writeOpacity(value);
  }

  return (
    <div className="design-shell">
      <DailyBackground
        item={today}
        opacity={opacity}
        parallaxX={parallax.x}
        parallaxY={parallax.y}
        transitioning={transitioning}
      />

      <header className="design-chrome">
        <div className="design-chrome-brand">
          <Link to="/" className="design-brand" title="Back to Projects">
            Storyworks
          </Link>
          <span className="wire-label design-chrome-tag">Phase 1B · /design</span>
        </div>

        <nav className="module-switcher" aria-label="Writing modules">
          {MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={module === m.id ? "active" : ""}
              title={`${m.label}: ${m.blurb}`}
              aria-pressed={module === m.id}
              onClick={() => selectModule(m.id)}
            >
              {m.label}
            </button>
          ))}
        </nav>

        <div className="design-settings" title="Background opacity and today’s playlist asset">
          <label className="design-opacity">
            <span className="wire-label">BG opacity</span>
            <input
              type="range"
              min={0.15}
              max={1}
              step={0.01}
              value={opacity}
              onChange={(e) => onOpacity(Number(e.target.value))}
              title="Dim or reveal the daily background"
              aria-valuetext={`${Math.round(opacity * 100)} percent`}
            />
            <span className="design-opacity-value">{Math.round(opacity * 100)}%</span>
          </label>
          <div className="design-asset-id" title="Today’s background asset id from the daily playlist">
            <span className="wire-label">Today’s asset</span>
            <code>{today?.id ?? "fallback"}</code>
          </div>
        </div>
      </header>

      <main className="design-main">
        <ModuleStage active={module} animating={transitioning} />
      </main>

      <footer className="design-footer muted">
        Full-bleed sandbox · webp playlist behind solid modules · R3F drawers come next · production
        routes untouched
      </footer>
    </div>
  );
}
