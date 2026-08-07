import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, Document, Project } from "../api";

const MUSE_IDLE_MS = 2500;

function wordCount(text: string): number {
  const parts = text.trim().match(/\S+/g);
  return parts ? parts.length : 0;
}

export default function EditorPage() {
  const { id = "" } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [body, setBody] = useState("");
  const [museOn, setMuseOn] = useState(true);
  const [suggestion, setSuggestion] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [museState, setMuseState] = useState<"idle" | "thinking" | "ready" | "error">("idle");
  const saveTimer = useRef<number | null>(null);
  const museTimer = useRef<number | null>(null);
  const bodyRef = useRef(body);
  const suggestionRef = useRef(suggestion);
  bodyRef.current = body;
  suggestionRef.current = suggestion;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, d] = await Promise.all([api.getProject(id), api.getDocument(id)]);
      if (cancelled) return;
      setProject(p);
      setDoc(d);
      setBody(d.body);
    })().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [id]);

  const persist = useCallback(
    async (next: string) => {
      setSaveState("saving");
      try {
        const saved = await api.saveDocument(id, next, doc?.title);
        setDoc(saved);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [id, doc?.title]
  );

  const scheduleSave = useCallback(
    (next: string) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void persist(next);
      }, 600);
    },
    [persist]
  );

  const requestMuse = useCallback(async () => {
    if (!museOn || suggestionRef.current) return;
    setMuseState("thinking");
    try {
      const res = await api.museSuggest({
        text: bodyRef.current,
        title: doc?.title,
        project_name: project?.name,
      });
      if (res.ok && res.suggestion) {
        setSuggestion(res.suggestion);
        setMuseState("ready");
      } else {
        setMuseState("error");
      }
    } catch {
      setMuseState("error");
    }
  }, [museOn, doc?.title, project?.name]);

  const scheduleMuse = useCallback(() => {
    if (museTimer.current) window.clearTimeout(museTimer.current);
    setSuggestion("");
    setMuseState("idle");
    if (!museOn) return;
    museTimer.current = window.setTimeout(() => {
      void requestMuse();
    }, MUSE_IDLE_MS);
  }, [museOn, requestMuse]);

  function onChange(next: string) {
    setBody(next);
    scheduleSave(next);
    scheduleMuse();
  }

  function acceptSuggestion() {
    if (!suggestion) return;
    const next = body + (body && !body.endsWith(" ") && !body.endsWith("\n") ? " " : "") + suggestion;
    setSuggestion("");
    setMuseState("idle");
    onChange(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestion) {
      if (e.key === "Tab") {
        e.preventDefault();
        acceptSuggestion();
        return;
      }
      // Any other key dismisses suggestion; typing proceeds normally
      setSuggestion("");
      setMuseState("idle");
    }
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (museTimer.current) window.clearTimeout(museTimer.current);
    };
  }, []);

  if (!project || !doc) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div className="editor-layout">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="wire-label">Writing surface</div>
          <h1 style={{ margin: 0 }}>{project.name}</h1>
        </div>
        <Link className="btn" to="/">
          All projects
        </Link>
      </div>

      <div className="row status">
        <label className="toggle">
          <input
            type="checkbox"
            checked={museOn}
            onChange={(e) => {
              setMuseOn(e.target.checked);
              setSuggestion("");
              if (e.target.checked) scheduleMuse();
            }}
          />
          Muse
        </label>
        <span>words {wordCount(body)}</span>
        <span>save {saveState}</span>
        <span>muse {museState}</span>
        {suggestion && <span>Tab accept · other key dismiss</span>}
      </div>

      <div className="editor-wrap gold-edge">
        <div className="ghost" aria-hidden>
          {body}
          {suggestion ? <span className="suggestion">{suggestion}</span> : null}
        </div>
        <textarea
          className="editor"
          value={body}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck
          placeholder="Begin writing…"
          aria-label="Manuscript editor"
        />
      </div>

      <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
        Autosaves to SQLite and <code>projects/{project.slug}/manuscript.md</code>. Local project
        git commits via Project Committer.
      </p>
    </div>
  );
}