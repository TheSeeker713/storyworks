const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || `${r.status}`);
  }
  return r.json() as Promise<T>;
}

export const api = {
  health: () => req<{ ok: boolean; vault_open?: boolean }>("/api/health"),
  openVault: (path: string) =>
    req<{ ok: boolean; path: string }>("/api/vault/open", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
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
  ollama: () => req<{ ok: boolean; models?: string[]; error?: string }>("/api/connectors/ollama"),
  stt: () =>
    req<{ ok: boolean; installed?: boolean; state?: string; error?: string; model?: string }>(
      "/api/connectors/stt",
    ),
};
