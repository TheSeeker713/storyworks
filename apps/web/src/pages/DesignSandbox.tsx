/**
 * Phase 1 design sandbox — expand here. Do not ship production chrome from this route
 * until human design sign-off.
 */
export default function DesignSandbox() {
  return (
    <div className="stack">
      <div>
        <div className="wire-label">Phase 1 workbench</div>
        <h1 style={{ margin: "0 0 0.35rem" }}>Design sandbox</h1>
        <p className="muted" style={{ margin: 0 }}>
          Live in-browser exploration for visual / UX decisions. Phase 0 left this stub for the
          next agent. Preserve the writing path at <code>/</code> while iterating here.
        </p>
      </div>
      <div className="design-sandbox">
        <h2 style={{ marginTop: 0, color: "var(--gold)" }}>Storyworks</h2>
        <p>
          Gold wire direction · light mode only · reflecting borders / WebGL accents TBD.
        </p>
        <ul>
          <li>Layouts & information architecture</li>
          <li>Muse chrome experiments</li>
          <li>Project browser treatments</li>
        </ul>
        <p className="muted">Replace this stub with interactive design experiments.</p>
      </div>
    </div>
  );
}