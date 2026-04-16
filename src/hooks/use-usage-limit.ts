const STORAGE_KEY = "studybuddy_usage";
const PRO_KEY = "studybuddy_pro";
const MAX_USES = 5;
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;

const validCodes = new Set([
  "X7A9K2QZ","M4P8L1DX","Q9Z2W6TR","B7N3X8FV","K2R5T9LP",
  "Z8X4M1QA","J3L9V7KC","T6P2W8RY","H9D4X2MN","R5Q8Z3LB",
  "V2K7T1XF","N8M4P9ZA","C3X7L2QR","P9T5B1KM","D4W8Z6NX",
  "Y7R3M2QP","L2X9V5ZT","F8Q1K4RB","A6T3N9XM","U5Z8P2LC",
  "X1M7K9RD","Q4L2Z8VT","B9P5X3KF","R2T8M6ZA","J7W4N1QP",
  "H3Z9L5XM","T1K8Q2VR","D7M4P9XB","V8R2L1ZT","N5X9K3QA",
  "C6T2M8RP","P1Z7X4KL","Y9Q5R2MN","F3K8T1ZX","A7M4L9QP",
  "U2X6R8ZT","X9P1K3MF","Q7Z4L2RN","B5T8M1XA","R3K9P6QZ",
]);

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

export function isProUser(): boolean {
  try {
    return localStorage.getItem(PRO_KEY) === "true";
  } catch {
    return false;
  }
}

export function activateProCode(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (validCodes.has(normalized)) {
    localStorage.setItem(PRO_KEY, "true");
    return true;
  }
  return false;
}

export function checkUsage(): { count: number; isLite: boolean } {
  if (isProUser()) {
    return { count: getUsage().count, isLite: false };
  }
  const usage = getUsage();
  return { count: usage.count, isLite: usage.count >= MAX_USES };
}

export function incrementUsage(): void {
  const usage = getUsage();
  usage.count += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export const MAX_DAILY_USES = MAX_USES;
