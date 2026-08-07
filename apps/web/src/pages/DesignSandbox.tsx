import { useState } from "react";

type Tab = "tokens" | "projects" | "editor" | "muse" | "danger" | "ia";

const TABS: { id: Tab; label: string }[] = [
  { id: "tokens", label: "Tokens" },
  { id: "projects", label: "Projects" },
  { id: "editor", label: "Editor" },
  { id: "muse", label: "Muse" },
  { id: "danger", label: "Archive / delete" },
  { id: "ia", label: "IA notes" },
];

const SWATCHES: { name: string; value: string }[] = [
  { name: "--bg", value: "#f3f1ec" },
  { name: "--bg-deep", value: "#e8e4db" },
  { name: "--panel", value: "#fffcf6" },
  { name: "--ink", value: "#1c1a17" },
  { name: "--muted", value: "#5f5a52" },
  { name: "--line", value: "#c4bba8" },
  { name: "--gold", value: "#a67c2d" },
  { name: "--gold-bright", value: "#c9a227" },
  { name: "--gold-soft", value: "#e6d5a8" },
  { name: "--danger", value: "#8b2e2e" },
];

/**
 * Phase 1 design sandbox — experiments only. Do not treat as production chrome
 * until human sign-off.
 */
export default function DesignSandbox() {
  const [tab, setTab] = useState<Tab>("tokens");
  const [projectVariant, setProjectVariant] = useState<"wire" | "cards" | "rail">("wire");
  const [editorVariant, setEditorVariant] = useState<"plain" | "reflect" | "ink">("reflect");
  const [museVariant, setMuseVariant] = useState<"minimal" | "pill">("pill");
  const [railActive, setRailActive] = useState("Harbor Draft");
  const [showDelete, setShowDelete] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <div className="stack main-wide">
      <header className="design-hero">
        <div className="wire-label">Phase 1 · live workbench</div>
        <h1>Storyworks</h1>
        <p className="muted" style={{ margin: 0, maxWidth: "40rem" }}>
          Click through chrome experiments here. Production routes at <code>/</code> and{" "}
          <code>/project/:id</code> stay on the Phase 0 writing path until you sign off design.
        </p>
      </header>

      <div className="design-tabs" role="tablist" aria-label="Design experiments">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`design-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="design-stage" role="tabpanel">
        {tab === "tokens" && <TokensPanel />}
        {tab === "projects" && (
          <ProjectsPanel
            variant={projectVariant}
            setVariant={setProjectVariant}
            railActive={railActive}
            setRailActive={setRailActive}
          />
        )}
        {tab === "editor" && (
          <EditorPanel variant={editorVariant} setVariant={setEditorVariant} />
        )}
        {tab === "muse" && <MusePanel variant={museVariant} setVariant={setMuseVariant} />}
        {tab === "danger" && (
          <DangerPanel
            showDelete={showDelete}
            setShowDelete={setShowDelete}
            typed={typed}
            setTyped={setTyped}
          />
        )}
        {tab === "ia" && <IaPanel />}
      </section>
    </div>
  );
}

function TokensPanel() {
  return (
    <div className="stack">
      <div>
        <div className="wire-label">Foundations</div>
        <h2 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)" }}>Design tokens</h2>
        <p className="muted" style={{ margin: 0 }}>
          Fraunces + Manrope · gold reflecting edge · light only.
        </p>
      </div>
      <div className="token-grid">
        {SWATCHES.map((s) => (
          <div key={s.name} className="token-swatch">
            <div className="chip" style={{ background: s.value }} />
            <div className="meta">
              {s.name}
              <br />
              {s.value}
            </div>
          </div>
        ))}
      </div>
      <div className="type-specimen panel">
        <p className="display">The manuscript waits in the gold margin.</p>
        <p className="ui muted">UI copy · Manrope · word count 1,204 · Muse ready</p>
      </div>
      <div className="motion-demo panel gold-edge">
        <div className="motion-bar" />
        <div className="motion-bar" />
        <div className="motion-bar" />
        <span className="motion-label">idle pulse · rise-in · fade-in</span>
      </div>
    </div>
  );
}

function ProjectsPanel({
  variant,
  setVariant,
  railActive,
  setRailActive,
}: {
  variant: "wire" | "cards" | "rail";
  setVariant: (v: "wire" | "cards" | "rail") => void;
  railActive: string;
  setRailActive: (v: string) => void;
}) {
  const items = [
    { name: "Harbor Draft", slug: "harbor-draft" },
    { name: "Elysara Notes", slug: "elysara-notes" },
    { name: "Screen test", slug: "screen-test" },
  ];

  return (
    <div className="stack">
      <div>
        <div className="wire-label">Experiment</div>
        <h2 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)" }}>
          Project browser
        </h2>
      </div>
      <div className="variant-picker">
        {(["wire", "cards", "rail"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={variant === v ? "active" : ""}
            onClick={() => setVariant(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {variant === "wire" && (
        <ul className="project-list mock-list wire">
          {items.map((p) => (
            <li key={p.slug}>
              <div>
                <strong>{p.name}</strong>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {p.slug}
                </div>
              </div>
              <button type="button" className="btn">
                Archive
              </button>
            </li>
          ))}
        </ul>
      )}

      {variant === "cards" && (
        <ul className="mock-list cards">
          {items.map((p) => (
            <li key={p.slug}>
              <div className="wire-label">Project</div>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>
                {p.name}
              </strong>
              <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.35rem" }}>
                {p.slug}
              </div>
            </li>
          ))}
        </ul>
      )}

      {variant === "rail" && (
        <div className="mock-list rail">
          <div className="rail-nav">
            {items.map((p) => (
              <button
                key={p.slug}
                type="button"
                className={railActive === p.name ? "active" : ""}
                onClick={() => setRailActive(p.name)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div>
            <div className="wire-label">Selected</div>
            <h3 style={{ margin: "0 0 0.5rem", fontFamily: "var(--font-display)" }}>
              {railActive}
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              Rail layout keeps the list persistent while a preview pane holds actions.
            </p>
            <div className="row" style={{ marginTop: "1rem" }}>
              <button type="button" className="btn primary">
                Open
              </button>
              <button type="button" className="btn">
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditorPanel({
  variant,
  setVariant,
}: {
  variant: "plain" | "reflect" | "ink";
  setVariant: (v: "plain" | "reflect" | "ink") => void;
}) {
  const cls =
    variant === "plain" ? "mock-editor" : variant === "reflect" ? "mock-editor reflect" : "mock-editor ink-well";

  return (
    <div className="stack">
      <div>
        <div className="wire-label">Experiment</div>
        <h2 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)" }}>
          Writing surface
        </h2>
      </div>
      <div className="variant-picker">
        {(["plain", "reflect", "ink"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={variant === v ? "active" : ""}
            onClick={() => setVariant(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <div className={cls}>
        The harbor lights blurred into one long ribbon.
        <span className="ghost-text"> She did not look back.</span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
        Ghost text is Muse-shaped. Production editor behavior stays Tab accept / other key dismiss.
      </p>
    </div>
  );
}

function MusePanel({
  variant,
  setVariant,
}: {
  variant: "minimal" | "pill";
  setVariant: (v: "minimal" | "pill") => void;
}) {
  return (
    <div className="stack">
      <div>
        <div className="wire-label">Experiment</div>
        <h2 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)" }}>Muse chrome</h2>
      </div>
      <div className="variant-picker">
        {(["minimal", "pill"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={variant === v ? "active" : ""}
            onClick={() => setVariant(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <div className={`muse-chrome ${variant === "pill" ? "pill-bar" : "minimal"}`}>
        <label className="toggle">
          <input type="checkbox" defaultChecked readOnly /> Muse
        </label>
        <span>words 248</span>
        <span>save saved</span>
        {variant === "minimal" ? (
          <span className="hint">Tab accept · other key dismiss</span>
        ) : (
          <span>suggestion ready · Tab accept · other key dismiss</span>
        )}
      </div>
      <div className="mock-editor reflect">
        Rain ticked the window.
        <span className="ghost-text"> Somewhere below, a door closed softly.</span>
      </div>
    </div>
  );
}

function DangerPanel({
  showDelete,
  setShowDelete,
  typed,
  setTyped,
}: {
  showDelete: boolean;
  setShowDelete: (v: boolean) => void;
  typed: string;
  setTyped: (v: string) => void;
}) {
  const name = "Harbor Draft";
  return (
    <div className="stack">
      <div>
        <div className="wire-label">Experiment</div>
        <h2 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)" }}>
          Archive / delete
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          Same locks as production: archive first, type full name, button label Delete project.
        </p>
      </div>
      <div className="panel gold-edge stack">
        <strong>{name}</strong>
        <span className="muted">archived · reason user</span>
        <div className="row">
          <button type="button" className="btn">
            Restore
          </button>
          <button type="button" className="btn danger" onClick={() => setShowDelete(true)}>
            Delete project
          </button>
        </div>
      </div>
      {showDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal stack">
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Delete project</h2>
            <p className="muted">
              Type the full project name to confirm: <strong>{name}</strong>
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type project name"
            />
            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowDelete(false);
                  setTyped("");
                }}
              >
                Cancel
              </button>
              <button type="button" className="btn danger" disabled={typed !== name}>
                Delete project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IaPanel() {
  return (
    <div className="stack">
      <div>
        <div className="wire-label">Design awareness only</div>
        <h2 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)" }}>
          Information architecture
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          Not built in Phase 1 — placement sketches for later production.
        </p>
      </div>
      <div className="panel stack">
        <p style={{ margin: 0 }}>
          <strong>Codex</strong> — side drawer from the editor (characters / places / lore), not a
          separate home competing with Projects.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Writers Room</strong> — full-height panel from the editor chrome (Approval Inbox),
          never auto-inserting into the manuscript.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Modules</strong> — novel / screenplay / notes / journal as document kinds under a
          project, listed in the rail or a quiet subnav — not a dashboard of widgets.
        </p>
      </div>
    </div>
  );
}
