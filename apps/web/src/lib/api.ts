const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const DEFAULT_TIMEOUT_MS = 15_000;
const OLLAMA_TIMEOUT_MS = 5_000;
const STT_TIMEOUT_MS = 35_000;
const PICK_DIRECTORY_TIMEOUT_MS = 600_000;

export type ProjectRow = {
  slug: string;
  name: string;
  archived: boolean;
  module?: string;
  updated_at?: string;
};

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
        // plain text
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
  listProjects: (archived = false) =>
    req<{ projects: ProjectRow[] }>(`/api/projects?archived=${archived ? "true" : "false"}`),
  createProject: (name: string) =>
    req<ProjectRow>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  archiveProject: (slug: string) =>
    req<ProjectRow>(`/api/projects/${slug}/archive`, { method: "POST" }),
  restoreProject: (slug: string) =>
    req<ProjectRow>(`/api/projects/${slug}/restore`, { method: "POST" }),
  deleteProject: (slug: string, typedName: string) =>
    req<{ ok: boolean; slug: string }>(`/api/projects/${slug}/delete`, {
      method: "POST",
      body: JSON.stringify({ typed_name: typedName }),
    }),
  listBooks: (slug: string) =>
    req<{ books: { id: string; title: string }[] }>(`/api/projects/${slug}/books`),
  listFolders: (slug: string, bookId: string) =>
    req<{ folders: { id: string; title: string; book_id: string }[] }>(
      `/api/projects/${slug}/books/${bookId}/folders`,
    ),
  listContent: (slug: string) =>
    req<{ content: { id: string; title: string; type: string; book_id?: string; folder_id?: string }[] }>(
      `/api/projects/${slug}/content`,
    ),
  history: (slug: string) =>
    req<{ history: { sha: string; date: string; message: string }[] }>(`/api/projects/${slug}/history`),
  checkpoint: (slug: string, message = "autosave") =>
    req<{ ok: boolean; committed?: boolean; reason?: string; message?: string; error?: string }>(
      `/api/projects/${slug}/checkpoint?message=${encodeURIComponent(message)}`,
      { method: "POST" },
    ),
  writeContent: (
    slug: string,
    body: {
      id?: string;
      type?: string;
      title?: string;
      subject?: string;
      body?: string;
      book_id?: string;
      folder_id?: string;
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
