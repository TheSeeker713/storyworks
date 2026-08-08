const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

/** Default for vault/project calls. Connectors always use an AbortSignal so UI never sticks on "checking…". */
const DEFAULT_TIMEOUT_MS = 15_000;
/** Server ollama_health uses httpx timeout 2s; keep client budget tight. */
const OLLAMA_TIMEOUT_MS = 5_000;
/** Server stt_status may subprocess-import mlx_whisper (timeout 30s). Client must wait longer than that. */
const STT_TIMEOUT_MS = 35_000;
/** Native folder dialog waits on the user; keep a long client budget. */
const PICK_DIRECTORY_TIMEOUT_MS = 600_000;

async function req<T>(path: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!r.ok) {
      const text = await r.text();
      let detail = text || `${r.status}`;
      try {
        const parsed = JSON.parse(text) as { detail?: unknown };
        if (typeof parsed.detail === "string") detail = parsed.detail;
        else if (parsed.detail != null) detail = JSON.stringify(parsed.detail);
      } catch {
        // plain text / HTML (e.g. Next proxy "Internal Server Error" when API is dead)
      }
      throw new Error(detail);
    }
    return r.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`timeout after ${timeoutMs}ms`);
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: () => req<{ ok: boolean; vault_open?: boolean }>("/api/health"),
  openVault: (path: string) =>
    req<{ ok: boolean; path: string }>("/api/vault/open", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  pickDirectory: () =>
    req<{ ok: boolean; cancelled?: boolean; path?: string | null }>(
      "/api/vault/pick-directory",
      { method: "POST" },
      PICK_DIRECTORY_TIMEOUT_MS,
    ),
  vault: () => req<{ ok: boolean; path: string; settings: Record<string, unknown> }>("/api/vault"),
  backup: (slug = "ui") =>
    req<{ ok: boolean; backup: string }>(`/api/vault/backup?slug=${encodeURIComponent(slug)}`, {
      method: "POST",
    }),
  patchSettings: (patch: Record<string, unknown>) =>
    req<Record<string, unknown>>("/api/vault/settings", {
      method: "PATCH",
      body: JSON.stringify({ patch }),
    }),
  listProjects: () => req<{ projects: { slug: string; name: string; archived: boolean }[] }>("/api/projects"),
  createProject: (name: string) =>
    req<{ slug: string; name: string }>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  writeContent: (
    slug: string,
    body: {
      id?: string;
      type?: string;
      title?: string;
      subject?: string;
      body?: string;
      canvas?: Record<string, unknown>;
      expected_hash?: string;
      dirty?: boolean;
    },
  ) =>
    req<{
      ok: boolean;
      id: string;
      content_hash?: string;
      conflict?: boolean;
      body?: string;
      meta?: { title?: string };
    }>(`/api/projects/${slug}/content`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  readContent: (slug: string, id: string) =>
    req<{ id: string; body: string; content_hash: string; meta: { title?: string } }>(
      `/api/projects/${slug}/content/${id}`,
    ),
  getBoard: (boardId: string) => req<Record<string, unknown>>(`/api/boards/${boardId}`),
  putBoard: (boardId: string, document: Record<string, unknown>) =>
    req<{ ok: boolean }>(`/api/boards/${boardId}`, {
      method: "PUT",
      body: JSON.stringify({ document }),
    }),
  ollama: () =>
    req<{ ok: boolean; models?: string[]; error?: string }>(
      "/api/connectors/ollama",
      undefined,
      OLLAMA_TIMEOUT_MS,
    ),
  stt: () =>
    req<{ ok: boolean; installed?: boolean; state?: string; error?: string; model?: string }>(
      "/api/connectors/stt",
      undefined,
      STT_TIMEOUT_MS,
    ),
  museSuggest: (body: { text: string; title: string; projectName: string }) =>
    req<{ ok: boolean; suggestion?: string; error?: string; disabled?: boolean }>("/api/muse/suggest", {
      method: "POST",
      body: JSON.stringify({
        text: body.text,
        title: body.title,
        project_name: body.projectName,
      }),
    }),
};
