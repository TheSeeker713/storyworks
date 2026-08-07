export type WritingModule = "prompt" | "note" | "novel" | "screenplay" | "journal";

export const MODULES: { id: WritingModule; label: string; blurb: string }[] = [
  {
    id: "prompt",
    label: "Prompt",
    blurb: "A solid prompt surface for sparks and constraints — not a chat dump.",
  },
  {
    id: "note",
    label: "Note",
    blurb: "Quick notes with a flat panel. No card chrome; just ink on solid ground.",
  },
  {
    id: "novel",
    label: "Novel",
    blurb: "Long-form prose well. Ghost Muse line shows Tab accept / other key dismiss.",
  },
  {
    id: "screenplay",
    label: "Screenplay",
    blurb: "Script-shaped mock with solid backing — margins for sluglines later.",
  },
  {
    id: "journal",
    label: "Journal",
    blurb: "Day log surface. Same solid panel rule as the other writing modules.",
  },
];

type Props = {
  active: WritingModule;
  animating: boolean;
};

const SAMPLE: Record<WritingModule, { body: string; ghost?: string }> = {
  prompt: {
    body: "Write the moment she realizes the harbor is empty — without naming the ship.",
  },
  note: {
    body: "Call sheet idea: rain on glass, one practical lamp, no score until the cutaway.",
  },
  novel: {
    body: "The harbor lights blurred into one long ribbon.",
    ghost: " She did not look back.",
  },
  screenplay: {
    body: "INT. ATELIER — NIGHT\n\nRain ticks the skylight. A single desk lamp pools gold on blank pages.",
  },
  journal: {
    body: "Stopped polishing chrome. Want the room to feel like a studio again — image behind, paper in front.",
  },
};

export default function ModuleStage({ active, animating }: Props) {
  const meta = MODULES.find((m) => m.id === active)!;
  const sample = SAMPLE[active];

  return (
    <div
      className={`module-stage module-${active}${animating ? " is-animating" : ""}`}
      data-module={active}
      title={`${meta.label} module — solid writing panel over daily background`}
    >
      <div className="module-stage-label" title="Module identity and purpose">
        <span className="aide-label wire-label">Writing module · maxed surface</span>
        <h2>{meta.label}</h2>
        <p className="muted">{meta.blurb}</p>
      </div>
      <div
        className="module-panel"
        role="region"
        aria-label={`${meta.label} writing surface`}
        title={`${meta.label}: solid flat panel (not translucent)`}
      >
        <span className="aide-label wire-label">Solid panel · sample ink</span>
        <pre className="module-body">
          {sample.body}
          {sample.ghost ? <span className="ghost-text">{sample.ghost}</span> : null}
        </pre>
        {active === "novel" && (
          <p
            className="module-muse-hint muted"
            title="Muse behavior lock: Tab accepts ghost text; any other key dismisses"
          >
            Muse mock · Tab accept · any other key dismiss
          </p>
        )}
      </div>
    </div>
  );
}
