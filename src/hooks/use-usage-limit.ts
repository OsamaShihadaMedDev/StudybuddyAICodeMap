const STORAGE_KEY = "studybuddy_usage";
const SHEET_KEY = "studybuddy_usage_sheet_v1";
const CARDS_KEY = "studybuddy_usage_cards_v1";
const PRO_KEY = "studybuddy_pro";
const PRO_ACTIVATED_AT_KEY = "proActivatedAt";
const MAX_USES = 5;
const MAX_SHEETS = 5;
const MAX_CARDS = 10;
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PRO_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

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

function getUsageFor(key: string): UsageData {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data: UsageData = JSON.parse(raw);
      if (Date.now() - data.lastReset >= RESET_INTERVAL_MS) {
        const reset = { count: 0, lastReset: Date.now() };
        localStorage.setItem(key, JSON.stringify(reset));
        return reset;
      }
      return data;
    }
  } catch {}
  const initial = { count: 0, lastReset: Date.now() };
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}

function getUsage(): UsageData {
  return getUsageFor(SHEET_KEY);
}

export function isProUser(): boolean {
  try {
    if (localStorage.getItem(PRO_KEY) !== "true") return false;
    const activatedAtRaw = localStorage.getItem(PRO_ACTIVATED_AT_KEY);
    if (!activatedAtRaw) {
      // Legacy pro without timestamp — treat as just activated
      localStorage.setItem(PRO_ACTIVATED_AT_KEY, String(Date.now()));
      return true;
    }
    const activatedAt = parseInt(activatedAtRaw, 10);
    if (isNaN(activatedAt) || Date.now() - activatedAt > PRO_DURATION_MS) {
      localStorage.removeItem(PRO_KEY);
      localStorage.removeItem(PRO_ACTIVATED_AT_KEY);
      localStorage.setItem("proExpired", "true");
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isProExpired(): boolean {
  try {
    return localStorage.getItem("proExpired") === "true";
  } catch {
    return false;
  }
}

export function clearProExpired(): void {
  try {
    localStorage.removeItem("proExpired");
  } catch {}
}

export function activateProCode(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (validCodes.has(normalized)) {
    localStorage.setItem(PRO_KEY, "true");
    localStorage.setItem(PRO_ACTIVATED_AT_KEY, String(Date.now()));
    localStorage.removeItem("proExpired");
    return true;
  }
  return false;
}

export function checkSheetUsage(): { count: number; isLite: boolean } {
  if (isProUser()) {
    return { count: getUsageFor(SHEET_KEY).count, isLite: false };
  }
  const usage = getUsageFor(SHEET_KEY);
  return { count: usage.count, isLite: usage.count >= MAX_SHEETS };
}

export function incrementSheetUsage(): void {
  const usage = getUsageFor(SHEET_KEY);
  usage.count += 1;
  localStorage.setItem(SHEET_KEY, JSON.stringify(usage));
}

export function checkCardsUsage(): { count: number; isLite: boolean } {
  if (isProUser()) {
    return { count: getUsageFor(CARDS_KEY).count, isLite: false };
  }
  const usage = getUsageFor(CARDS_KEY);
  return { count: usage.count, isLite: usage.count >= MAX_CARDS };
}

export function incrementCardsUsage(): void {
  const usage = getUsageFor(CARDS_KEY);
  usage.count += 1;
  localStorage.setItem(CARDS_KEY, JSON.stringify(usage));
}

export const MAX_DAILY_SHEETS = MAX_SHEETS;
export const MAX_DAILY_CARDS = MAX_CARDS;

// Backward-compat aliases (point to sheet counter)
export const checkUsage = checkSheetUsage;
export const incrementUsage = incrementSheetUsage;
export const MAX_DAILY_USES = MAX_SHEETS;
