/** Daily webp playlist — shuffle once, one image per calendar day, loop/reshuffle. */

export type BgManifestItem = {
  id: string;
  file: string;
  src?: string;
};

export type BgManifest = {
  version: number;
  generated?: string;
  items: BgManifestItem[];
};

export type PlaylistState = {
  seedOrder: string[];
  cycleIndex: number;
  dayKey: string;
};

const STORAGE_KEY = "storyworks.design.bgPlaylist.v1";
const OPACITY_KEY = "storyworks.design.bgOpacity.v1";

export function calendarDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shuffleIds(ids: string[]): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

function readStored(): PlaylistState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlaylistState;
    if (!Array.isArray(parsed.seedOrder) || typeof parsed.cycleIndex !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(state: PlaylistState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Align playlist with manifest + calendar day. Same image all day; advance on day change. */
export function resolvePlaylist(items: BgManifestItem[], now = new Date()): PlaylistState {
  const ids = items.map((i) => i.id);
  const today = calendarDayKey(now);
  const stored = readStored();

  if (ids.length === 0) {
    const empty: PlaylistState = { seedOrder: [], cycleIndex: 0, dayKey: today };
    writeStored(empty);
    return empty;
  }

  let seedOrder = stored?.seedOrder?.filter((id) => ids.includes(id)) ?? [];
  // New assets appeared or first run — reshuffle full set
  if (seedOrder.length !== ids.length) {
    seedOrder = shuffleIds(ids);
  }

  let cycleIndex = stored?.cycleIndex ?? 0;
  if (cycleIndex < 0 || cycleIndex >= seedOrder.length) {
    cycleIndex = 0;
  }

  const dayKey = stored?.dayKey ?? today;
  if (dayKey !== today) {
    cycleIndex = (cycleIndex + 1) % seedOrder.length;
    if (cycleIndex === 0) {
      // Wrapped: reshuffle once then continue from start
      seedOrder = shuffleIds(ids);
    }
  }

  const next: PlaylistState = { seedOrder, cycleIndex, dayKey: today };
  writeStored(next);
  return next;
}

export function todaysItem(
  items: BgManifestItem[],
  state: PlaylistState,
): BgManifestItem | null {
  if (items.length === 0 || state.seedOrder.length === 0) return null;
  const id = state.seedOrder[state.cycleIndex];
  return items.find((i) => i.id === id) ?? null;
}

export function assetUrl(item: BgManifestItem): string {
  return `/backgrounds/${item.file}`;
}

export function readOpacity(defaultValue = 0.72): number {
  try {
    const raw = localStorage.getItem(OPACITY_KEY);
    if (raw == null) return defaultValue;
    const n = Number(raw);
    if (Number.isNaN(n)) return defaultValue;
    return Math.min(1, Math.max(0.15, n));
  } catch {
    return defaultValue;
  }
}

export function writeOpacity(value: number): void {
  localStorage.setItem(OPACITY_KEY, String(value));
}

export async function loadManifest(): Promise<BgManifest> {
  try {
    const res = await fetch("/backgrounds/manifest.json", { cache: "no-cache" });
    if (!res.ok) {
      return { version: 1, items: [] };
    }
    const data = (await res.json()) as BgManifest;
    return {
      version: data.version ?? 1,
      generated: data.generated,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch {
    return { version: 1, items: [] };
  }
}
