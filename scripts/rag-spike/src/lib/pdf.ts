import { readFile } from "node:fs/promises";
// Import the inner module directly to avoid pdf-parse's index.js running its
// debug/test harness when no buffer is passed at import time.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractPdfText(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  const data = await pdfParse(buf);
  return data.text;
}
