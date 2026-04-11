const STORAGE_KEY = "studybuddy_history";
const MAX_ITEMS = 50;

export interface StudyHistoryItem {
  id: string;
  topic: string;
  input: string;
  output: string;
  timestamp: number;
  modeInfo?: {
    examMode: string;
    difficulty: string;
    focus: string;
    length: string;
  };
}

function getHistory(): StudyHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function extractTopic(input: string): string {
  const firstLine = input.trim().split("\n")[0].trim();
  return firstLine.length > 60 ? firstLine.slice(0, 57) + "…" : firstLine;
}

export function saveToHistory(
  input: string,
  output: string,
  modeInfo?: StudyHistoryItem["modeInfo"]
): void {
  const history = getHistory();
  const item: StudyHistoryItem = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    topic: extractTopic(input),
    input,
    output,
    timestamp: Date.now(),
    modeInfo,
  };
  history.unshift(item);
  if (history.length > MAX_ITEMS) history.length = MAX_ITEMS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function loadHistory(): StudyHistoryItem[] {
  return getHistory();
}

export function deleteFromHistory(id: string): void {
  const history = getHistory().filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
