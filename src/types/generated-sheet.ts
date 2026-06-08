export interface Flashcard {
  tag: string;        // e.g. "Next Step", "Diagnosis", "Mechanism", "Complication"
  question: string;   // full question text, tag already stripped
  answer: string;     // answer text
}

export interface GeneratedSheet {
  summary: string;
  memoryHooks: string[];
  clinicalApproach: string;
  keyPoints: string[];
  examTraps: string[];
  flashcards: Flashcard[];
  referenceNote: string;
  // emoji picked by the AI for the topic — extracted from flashcards block
  topicEmoji?: string;
}

// Lightweight type used when loading a saved sheet from study_history.
// The output column stores JSON.stringify(GeneratedSheet).
// Old rows (pre-migration) store raw text blobs — use isJsonSheet() to
// distinguish them.
export type StoredSheetOutput = string;

/**
 * Returns true if the stored output string is a JSON-serialised
 * GeneratedSheet (post-migration). Returns false for legacy text blobs.
 */
export function isJsonSheet(output: string): boolean {
  return output.trimStart().startsWith("{");
}

/**
 * Safely parse a stored output string into a GeneratedSheet.
 * Returns null if parsing fails or the value is a legacy blob.
 */
export function parseStoredSheet(output: string): GeneratedSheet | null {
  if (!isJsonSheet(output)) return null;
  try {
    return JSON.parse(output) as GeneratedSheet;
  } catch {
    return null;
  }
}
