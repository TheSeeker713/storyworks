export type Project = {
  id: string;
  name: string;
  slug: string;
  archived: boolean;
  archive_reason: string | null;
  created_at: number;
  updated_at: number;
};

export type Document = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  updated_at: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  ollama: () => request<{ ok: boolean; error?: string }>("/api/connectors/ollama"),
  openclaw: () =>
    request<{ ok: boolean; installed?: boolean; version?: string; error?: string }>(
      "/api/connectors/openclaw"
    ),
  listProjects: (archived = false) =>
    request<{ projects: Project[] }>(`/api/projects?archived=${archived}`),
  createProject: (name: string) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  archive: (id: string) =>
    request<Project>(`/api/projects/${id}/archive`, { method: "POST" }),
  restore: (id: string) =>
    request<Project>(`/api/projects/${id}/restore`, { method: "POST" }),
  deleteProject: (id: string, typed_name: string) =>
    request<{ ok: boolean }>(`/api/projects/${id}/delete`, {
      method: "POST",
      body: JSON.stringify({ typed_name }),
    }),
  getDocument: (id: string) => request<Document>(`/api/projects/${id}/document`),
  saveDocument: (id: string, body: string, title?: string) =>
    request<Document>(`/api/projects/${id}/document`, {
      method: "PUT",
      body: JSON.stringify({ body, title }),
    }),
  museSuggest: (payload: { text: string; title?: string; project_name?: string }) =>
    request<{ ok: boolean; suggestion?: string; error?: string }>("/api/muse/suggest", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};