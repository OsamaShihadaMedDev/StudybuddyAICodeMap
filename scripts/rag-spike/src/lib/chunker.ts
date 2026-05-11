export type Chunk = { content: string; section_title: string | null };

const HEADING_NUMBERED_RE = /^\d+(\.\d+)*\s+\S/;
const PAGE_HEADER_RE = /^Page\s+\d+\s+of\s+\d+$/i;
const URL_ONLY_RE = /^https?:\/\/\S+$/i;
const COPYRIGHT_RE = /(©|\(c\)|copyright)/i;
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z])/;

const MIN_CHUNK = 200;
const MAX_CHUNK = 1500;
const TARGET_SPLIT = 800;

function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  if (HEADING_NUMBERED_RE.test(trimmed)) return true;
  if (
    trimmed.length < 80 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed)
  ) {
    return true;
  }
  return false;
}

function normalize(raw: string): string {
  // Strip trailing spaces per line and normalize CRLF
  const lines = raw.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+$/g, ""));

  // Drop obvious page headers/footers, lone URLs, lone copyright lines
  const kept = lines.filter((l) => {
    const t = l.trim();
    if (t.length === 0) return true;
    if (PAGE_HEADER_RE.test(t)) return false;
    if (URL_ONLY_RE.test(t)) return false;
    if (COPYRIGHT_RE.test(t) && t.length < 120) return false;
    return true;
  });

  // Collapse 3+ blank lines down to 2 (preserve paragraph breaks)
  return kept.join("\n").replace(/\n{3,}/g, "\n\n");
}

function splitLong(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const sentences = text.split(SENTENCE_SPLIT_RE);
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (buf.length === 0) {
      buf = s;
      continue;
    }
    if (buf.length + 1 + s.length <= TARGET_SPLIT) {
      buf = buf + " " + s;
    } else {
      out.push(buf);
      buf = s;
    }
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

export function chunkText(rawText: string): Chunk[] {
  const text = normalize(rawText);
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0);

  // Walk paragraphs, tracking current section heading
  let currentHeading: string | null = null;
  const candidates: Chunk[] = [];
  for (const p of paragraphs) {
    // A paragraph is treated as a heading if its FIRST line looks like a heading
    // and the paragraph is short (single-line heading case)
    const firstLine = p.split("\n")[0].trim();
    const isShort = p.length < 120 && !p.includes("\n\n");
    if (isShort && isHeading(firstLine) && firstLine === p.trim()) {
      currentHeading = firstLine;
      continue;
    }
    candidates.push({ content: p, section_title: currentHeading });
  }

  // Merge short chunks forward within the same section
  const merged: Chunk[] = [];
  for (const c of candidates) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.content.length < MIN_CHUNK &&
      last.section_title === c.section_title
    ) {
      last.content = last.content + "\n\n" + c.content;
    } else {
      merged.push({ ...c });
    }
  }

  // Split overly long chunks at sentence boundaries
  const finalChunks: Chunk[] = [];
  for (const c of merged) {
    const pieces = splitLong(c.content);
    for (const piece of pieces) {
      finalChunks.push({ content: piece, section_title: c.section_title });
    }
  }

  return finalChunks;
}
