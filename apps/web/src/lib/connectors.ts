import { api } from "@/lib/api";

export type SttUiState = "working" | "not_installed" | "unknown" | "unreachable";

export type ConnectorBootResult = {
  ollamaSummary: string;
  sttSummary: string;
  sttState: SttUiState;
};

/** Resolve Ollama to a terminal label. Timeout / network / API errors become a resolved string, never "checking…". */
export async function resolveOllamaSummary(): Promise<string> {
  try {
    const o = await api.ollama();
    if (!o.ok) return `down (${o.error || "unreachable"})`;
    return `ok · ${(o.models || []).length} models`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unreachable";
    if (msg.startsWith("timeout")) return "timed out (API or Ollama did not answer)";
    return `unreachable (${msg})`;
  }
}

/** Resolve STT install probe to a terminal label. Same rule: timeout is a resolved state. */
export async function resolveSttStatus(): Promise<{ summary: string; state: SttUiState }> {
  try {
    const s = await api.stt();
    if (s.ok && s.installed) {
      return {
        summary: `working (${s.model || "mlx_whisper"})`,
        state: "working",
      };
    }
    const detail = s.error ? ` — ${s.error}` : "";
    return {
      summary: `not installed${detail}`,
      state: "not_installed",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unreachable";
    if (msg.startsWith("timeout")) {
      return {
        summary: "timed out (API or STT probe did not answer)",
        state: "unreachable",
      };
    }
    return {
      summary: `unreachable (${msg})`,
      state: "unreachable",
    };
  }
}

/**
 * Boot checks. Ollama first so a slow/blocking STT probe cannot leave Ollama stuck on "checking…".
 * Both always finish with a non-checking label.
 */
export async function runConnectorBootChecks(
  onProgress?: (partial: Partial<ConnectorBootResult> & { phase: string }) => void,
): Promise<ConnectorBootResult> {
  onProgress?.({ phase: "ollama", ollamaSummary: "checking…" });
  const ollamaSummary = await resolveOllamaSummary();
  onProgress?.({ phase: "ollama-done", ollamaSummary });

  onProgress?.({ phase: "stt", sttSummary: "checking…" });
  const stt = await resolveSttStatus();
  onProgress?.({
    phase: "stt-done",
    sttSummary: stt.summary,
    sttState: stt.state,
  });

  return {
    ollamaSummary,
    sttSummary: stt.summary,
    sttState: stt.state,
  };
}
