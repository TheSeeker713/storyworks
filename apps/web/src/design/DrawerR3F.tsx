import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Mesh } from "three";

type Props = {
  open: boolean;
  onClose: () => void;
};

function DrawerCard() {
  const mesh = useRef<Mesh>(null!);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * 0.35;
    mesh.current.rotation.x = Math.sin(performance.now() * 0.0006) * 0.08;
  });

  return (
    <mesh ref={mesh} position={[0, 0, 0]} castShadow>
      <boxGeometry args={[2.2, 2.8, 0.12]} />
      <meshStandardMaterial color="#f7f2e6" metalness={0.08} roughness={0.55} />
      {/* Accent edge — gold plane as a simple “card face” placeholder texture */}
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[1.85, 2.4]} />
        <meshStandardMaterial color="#c9a227" metalness={0.25} roughness={0.4} />
      </mesh>
    </mesh>
  );
}

/**
 * Side-drawer prototype: R3F/WebGL is for panel/card systems only — not the daily BG.
 */
export default function DrawerR3F({ open, onClose }: Props) {
  return (
    <div
      className={`design-drawer${open ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label="R3F side drawer prototype"
    >
      <button
        type="button"
        className="design-drawer-scrim"
        title="Close drawer"
        aria-label="Close drawer"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <aside className="design-drawer-panel" title="WebGL drawer card prototype">
        <header className="design-drawer-head">
          <div>
            <span className="wire-label aide-label">R3F drawer</span>
            <h2>Side panel prototype</h2>
            <p className="muted">
              WebGL plane/card only. Daily backgrounds stay webp behind the shell.
            </p>
          </div>
          <button
            type="button"
            className="btn"
            title="Close the R3F drawer"
            onClick={onClose}
            tabIndex={open ? 0 : -1}
          >
            Close
          </button>
        </header>
        <div className="design-drawer-canvas" title="Interactive WebGL card surface">
          {open && (
            <Canvas
              camera={{ position: [0, 0, 5.2], fov: 35 }}
              dpr={[1, 1.75]}
              gl={{ antialias: true, alpha: true }}
            >
              <color attach="background" args={["#f3f1ec"]} />
              <ambientLight intensity={0.85} />
              <directionalLight position={[3, 4, 5]} intensity={1.15} />
              <Suspense fallback={null}>
                <DrawerCard />
              </Suspense>
            </Canvas>
          )}
        </div>
        <p className="design-drawer-footnote muted">
          Placeholder card · production textures later · Codex / Writers Room placement TBD
        </p>
      </aside>
    </div>
  );
}
