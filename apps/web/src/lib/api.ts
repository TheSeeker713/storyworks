const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const DEFAULT_TIMEOUT_MS = 15_000;
const OLLAMA_TIMEOUT_MS = 5_000;
const STT_TIMEOUT_MS = 35_000;
const PICK_DIRECTORY_TIMEOUT_MS = 600_000;

export type ProjectModule = "draft" | "novel" | "screenplay" | "notes" | "journal" | "blog";

export type ProjectRow = {
  slug: string;
  name: string;
  archived: boolean;
  module?: string;
  updated_at?: string;
};

export type CodexEntrySummary = {
  id: string;
  type: string;
  title: string;
  subject?: string;
  updated_at?: string;
};

export type CodexProgression = {
  id: string;
  mode: string;
  manuscript_point: string;
  ordinal: number;
  text: string;
  created_at?: string;
};

export type CodexEntry = CodexEntrySummary & {
  fields: Record<string, unknown>;
  facets: Record<string, string>;
  progressions: CodexProgression[];
  body?: string;
  created_at?: string;
};

export type SearchHit = {
  project_slug: string;
  id: string;
  title: string;
  type?: string;
  snippet?: string;
};

export type ProjectMeta = {
  slug: string;
  name: string;
  module: string;
  blog_stage?: string | null;
  set_aside?: unknown[];
  updated_at?: string;
};

export type JournalBook = {
  id: string;
  title: string;
  privacy?: string;
  updated_at?: string;
  recovery_key?: string;
  recovery_warning?: string;
};

export type ContentScene = {
  id: string;
  title: string;
  ordinal?: number;
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
  createProject: (name: string, module: ProjectModule | string = "draft") =>
    req<ProjectRow>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name, module }),
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
    req<{ books: JournalBook[] }>(`/api/projects/${slug}/books`),
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
      tags?: string[];
      scenes?: ContentScene[];
      auto_tag?: boolean;
    },
  ) =>
    req<{
      ok: boolean;
      id: string;
      content_hash?: string;
      conflict?: boolean;
      body?: string;
      meta?: { title?: string };
      auto_tags?: unknown;
    }>(`/api/projects/${slug}/content`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  readContent: (slug: string, id: string) =>
    req<{ id: string; body: string; content_hash: string; meta: { title?: string; scenes?: ContentScene[] } }>(
      `/api/projects/${slug}/content/${id}`,
    ),
  getContentScenes: (slug: string, contentId: string) =>
    req<{ scenes: ContentScene[] }>(`/api/projects/${slug}/content/${contentId}/scenes`),
  getProjectMeta: (slug: string) => req<ProjectMeta>(`/api/projects/${slug}/meta`),
  patchProjectMeta: (slug: string, patch: Record<string, unknown>) =>
    req<ProjectMeta>(`/api/projects/${slug}/meta`, {
      method: "PATCH",
      body: JSON.stringify({ patch }),
    }),
  search: (q: string, limit = 40) =>
    req<{ hits: SearchHit[] }>(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  listCodex: (slug: string, type?: string) =>
    req<{ entries: CodexEntrySummary[]; suggested_order: string[] }>(
      `/api/projects/${slug}/codex${type ? `?type=${encodeURIComponent(type)}` : ""}`,
    ),
  createCodex: (
    slug: string,
    body: {
      type: string;
      name: string;
      description?: string;
      fields?: Record<string, unknown>;
      facets?: Record<string, string>;
    },
  ) =>
    req<CodexEntry>(`/api/projects/${slug}/codex`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getCodex: (slug: string, type: string, id: string) =>
    req<CodexEntry>(`/api/projects/${slug}/codex/${encodeURIComponent(type)}/${encodeURIComponent(id)}`),
  patchCodex: (
    slug: string,
    type: string,
    id: string,
    body: {
      name?: string;
      description?: string;
      fields?: Record<string, unknown>;
      facets?: Record<string, string>;
    },
  ) =>
    req<CodexEntry>(`/api/projects/${slug}/codex/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  addCodexProgression: (
    slug: string,
    type: string,
    id: string,
    body: {
      mode: "addition" | "replacement" | string;
      manuscript_point: string;
      text: string;
      ordinal?: number;
    },
  ) =>
    req<CodexEntry>(
      `/api/projects/${slug}/codex/${encodeURIComponent(type)}/${encodeURIComponent(id)}/progressions`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),
  aiCodexProgressions: (slug: string, type: string, id: string, storyOrdinal = 0) =>
    req<{ progressions: CodexProgression[] }>(
      `/api/projects/${slug}/codex/${encodeURIComponent(type)}/${encodeURIComponent(id)}/ai-progressions?story_ordinal=${storyOrdinal}`,
    ),
  createJournalBook: (slug: string, body: { title: string; privacy?: string; password?: string }) =>
    req<JournalBook>(`/api/projects/${slug}/journal/books`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  unlockJournalBook: (
    slug: string,
    bookId: string,
    body: { password?: string; recovery_key?: string },
  ) =>
    req<{ ok: boolean; privacy: string; book_id: string; session_dek?: string }>(
      `/api/projects/${slug}/journal/books/${encodeURIComponent(bookId)}/unlock`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),
  sealJournalText: (slug: string, bookId: string, sessionDek: string, text: string) =>
    req<{ ciphertext: string }>(
      `/api/projects/${slug}/journal/books/${encodeURIComponent(bookId)}/seal`,
      { method: "POST", body: JSON.stringify({ session_dek: sessionDek, text }) },
    ),
  openJournalText: (slug: string, bookId: string, sessionDek: string, ciphertext: string) =>
    req<{ text: string }>(
      `/api/projects/${slug}/journal/books/${encodeURIComponent(bookId)}/open`,
      { method: "POST", body: JSON.stringify({ session_dek: sessionDek, ciphertext }) },
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
  bumpProvenance: (slug: string, contentId: string, body: { muse_words?: number; ai_words?: number }) =>
    req<{ ok: boolean; provenance: { muse_words: number; ai_words: number }; summary: ProvenanceSummary }>(
      `/api/projects/${slug}/content/${encodeURIComponent(contentId)}/provenance`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  getProvenance: (slug: string, contentId: string) =>
    req<{ ok: boolean; summary: ProvenanceSummary; provenance: { muse_words?: number; ai_words?: number } }>(
      `/api/projects/${slug}/content/${encodeURIComponent(contentId)}/provenance`,
    ),
  listSandbox: (slug: string, contentId?: string) =>
    req<{ items: SandboxItem[] }>(
      `/api/projects/${slug}/ai/sandbox${contentId ? `?content_id=${encodeURIComponent(contentId)}` : ""}`,
    ),
  createSandbox: (slug: string, body: { content_id: string; kind: string; body: string; title?: string }) =>
    req<{ ok: boolean; item: SandboxItem }>(`/api/projects/${slug}/ai/sandbox`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  sandboxAction: (slug: string, draftId: string, action: "approve" | "set_aside" | "dismiss", mode = "append") =>
    req<{ ok: boolean; item?: SandboxItem; content?: { body: string; meta?: Record<string, unknown> } }>(
      `/api/projects/${slug}/ai/sandbox/${encodeURIComponent(draftId)}`,
      { method: "POST", body: JSON.stringify({ action, mode }) },
    ),
  agentTool: (body: {
    tool: string;
    text?: string;
    query?: string;
    stage?: string;
    content_id?: string;
    project_slug?: string;
  }) =>
    req<{
      ok: boolean;
      text?: string;
      error?: string;
      disabled?: boolean;
      sandbox?: SandboxItem;
      hits?: SearchHit[];
    }>("/api/ai/agent", { method: "POST", body: JSON.stringify(body) }),
  settingsAgent: (request: string, apply = true) =>
    req<{ ok: boolean; patch?: Record<string, unknown>; applied?: boolean; settings?: Record<string, unknown>; error?: string }>(
      "/api/ai/settings",
      { method: "POST", body: JSON.stringify({ request, apply }) },
    ),
  transcribeUpload: async (blob: Blob, filename = "dictate.webm") => {
    const fd = new FormData();
    fd.append("file", blob, filename);
    const res = await fetch("/api/stt/transcribe-upload", { method: "POST", body: fd });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `STT upload failed (${res.status})`);
    }
    return (await res.json()) as { ok: boolean; text?: string; error?: string };
  },
  exportProject: (slug: string, format: string) =>
    req<{
      ok: boolean;
      format: string;
      filename: string;
      content: string;
      media_type: string;
      encoding?: string;
    }>(`/api/projects/${slug}/export?format=${encodeURIComponent(format)}`, { method: "POST" }),
};

export type ProvenanceSummary = {
  total_words: number;
  author_words: number;
  muse_words: number;
  ai_words: number;
};

export type SandboxItem = {
  id: string;
  content_id: string;
  kind: string;
  title: string;
  body: string;
  status: string;
  created_at?: string;
};
