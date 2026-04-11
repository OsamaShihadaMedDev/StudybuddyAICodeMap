const STORAGE_KEY = "studybuddy_usage";
const MAX_USES = 10;
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface UsageData {
  count: number;
  lastReset: number;
}

function getUsage(): UsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: UsageData = JSON.parse(raw);
      if (Date.now() - data.lastReset >= RESET_INTERVAL_MS) {
        const reset = { count: 0, lastReset: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
        return reset;
      }
      return data;
    }
  } catch {}
  const initial = { count: 0, lastReset: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

export function checkUsage(): { count: number; isLite: boolean } {
  const usage = getUsage();
  return { count: usage.count, isLite: usage.count >= MAX_USES };
}

export function incrementUsage(): void {
  const usage = getUsage();
  usage.count += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export const MAX_DAILY_USES = MAX_USES;
