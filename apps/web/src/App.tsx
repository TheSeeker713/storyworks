import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import DesignSandbox from "./pages/DesignSandbox";
import EditorPage from "./pages/EditorPage";
import HomePage from "./pages/HomePage";
import { useEffect, useState } from "react";
import { api } from "./api";

export default function App() {
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [openclawOk, setOpenclawOk] = useState<boolean | null>(null);
  const location = useLocation();
  const wide = location.pathname.startsWith("/design");

  useEffect(() => {
    api.ollama().then((r) => setOllamaOk(!!r.ok)).catch(() => setOllamaOk(false));
    api.openclaw().then((r) => setOpenclawOk(!!r.ok)).catch(() => setOpenclawOk(false));
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Storyworks
        </NavLink>
        <span className={`health-pill ${ollamaOk ? "ok" : "bad"}`}>
          Ollama {ollamaOk == null ? "…" : ollamaOk ? "ok" : "down"}
        </span>
        <span className={`health-pill ${openclawOk ? "ok" : "bad"}`}>
          OpenClaw {openclawOk == null ? "…" : openclawOk ? "ok" : "n/a"}
        </span>
        <nav className="nav">
          <NavLink to="/" end>
            Projects
          </NavLink>
          <NavLink to="/design">Design</NavLink>
        </nav>
      </header>
      <main className={`main${wide ? " main-wide" : ""}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/:id" element={<EditorPage />} />
          <Route path="/design" element={<DesignSandbox />} />
        </Routes>
      </main>
    </div>
  );
}