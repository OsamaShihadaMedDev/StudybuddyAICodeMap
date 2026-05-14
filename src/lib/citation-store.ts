import type { CitationResult } from "@/lib/citation";

const STORAGE_KEY = "studybuddy_citations_by_topic";

type Store = Record<string, CitationResult[]>;

function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase();
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    // Normalize legacy single-citation entries into arrays
    const out: Store = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) out[k] = v as CitationResult[];
      else if (v && typeof v === "object") out[k] = [v as CitationResult];
    }
    return out;
  } catch {
    return {};
  }
}

export function saveCitationsForTopic(
  topic: string,
  citations: CitationResult[]
): void {
  if (!citations.length) return;
  try {
    const store = loadStore();
    store[normalizeTopic(topic)] = citations;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function getCitationsForTopic(topic: string): CitationResult[] {
  const store = loadStore();
  return store[normalizeTopic(topic)] ?? [];
}
