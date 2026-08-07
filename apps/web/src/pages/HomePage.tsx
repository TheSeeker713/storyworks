import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Project } from "../api";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [archived, setArchived] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [typedName, setTypedName] = useState("");

  async function refresh() {
    const [live, arch] = await Promise.all([
      api.listProjects(false),
      api.listProjects(true),
    ]);
    setProjects(live.projects);
    setArchived(arch.projects.filter((p) => p.archived));
  }

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await api.createProject(name.trim());
      setName("");
      await refresh();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="stack">
      <div>
        <div className="wire-label">Phase 0 · wire UI</div>
        <h1 style={{ margin: "0 0 0.35rem" }}>Projects</h1>
        <p className="muted" style={{ margin: 0 }}>
          Create a story project and write immediately. Manuscripts stay in local{" "}
          <code>projects/</code> (gitignored from the app repo).
        </p>
      </div>

      <form className="row panel gold-edge" onSubmit={onCreate}>
        <input
          type="text"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Project name"
        />
        <button className="btn primary" type="submit">
          Create project
        </button>
      </form>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <section className="panel">
        <div className="wire-label">Available</div>
        {projects.length === 0 ? (
          <p className="muted">No projects yet.</p>
        ) : (
          <ul className="project-list">
            {projects.map((p) => (
              <li key={p.id}>
                <div>
                  <Link to={`/project/${p.id}`}>{p.name}</Link>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {p.slug}
                  </div>
                </div>
                <button
                  className="btn"
                  type="button"
                  onClick={() => api.archive(p.id).then(refresh)}
                >
                  Archive
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="wire-label">Archived</div>
        {archived.length === 0 ? (
          <p className="muted">None.</p>
        ) : (
          <ul className="project-list">
            {archived.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {p.archive_reason || "archived"}
                  </div>
                </div>
                <div className="row">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => api.restore(p.id).then(refresh)}
                  >
                    Restore
                  </button>
                  <button
                    className="btn danger"
                    type="button"
                    onClick={() => {
                      setDeleteTarget(p);
                      setTypedName("");
                    }}
                  >
                    Delete project
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {deleteTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal stack">
            <h2 style={{ margin: 0 }}>Delete project</h2>
            <p className="muted">
              This cannot be undone from the UI. Type the full project name to confirm:{" "}
              <strong>{deleteTarget.name}</strong>
            </p>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Type project name"
            />
            <div className="row">
              <button className="btn" type="button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                className="btn danger"
                type="button"
                disabled={typedName !== deleteTarget.name}
                onClick={async () => {
                  await api.deleteProject(deleteTarget.id, typedName);
                  setDeleteTarget(null);
                  await refresh();
                }}
              >
                Delete project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}