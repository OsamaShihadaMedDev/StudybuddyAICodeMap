import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./lib/env.js";
import { embedText } from "./lib/embedder.js";
import { supabase } from "./lib/supabase.js";

const DEFAULT_QUERY = "make 5 flashcards on diagnosing hypertension";
const MATCH_THRESHOLD = 0.5;
const MATCH_COUNT = 5;
const COMPACT_PREVIEW = 200;
const GEN_MODEL = "gemini-3-flash-lite";

type Match = {
  id: string;
  guideline_id: string;
  guideline_name: string;
  section_title: string | null;
  content: string;
  similarity: number;
};

const SOURCE_LABELS = ["A", "B", "C", "D", "E"];

function compact(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max).trimEnd() + "...";
}

function buildPrompt(query: string, matches: Match[]): string {
  const labelled = matches.map((m, i) => {
    const label = SOURCE_LABELS[i] ?? String(i);
    const section = m.section_title ?? "(no section)";
    return `[Source ${label}]\nsection: "${section}"\ncontent: "${m.content}"`;
  });
  const allowedLabels = matches
    .map((_, i) => `[Source ${SOURCE_LABELS[i] ?? String(i)}]`)
    .join(", ");

  return [
    `You are a senior medical educator generating flashcards for a medical student.`,
    ``,
    `You are given retrieved excerpts from a clinical guideline. Use ONLY the information in these sources to generate flashcards. Do not introduce facts that are not present in the sources.`,
    ``,
    `Each flashcard MUST end with a citation tag in the exact format [Source X], where X is one of the labels of the retrieved sources you actually used. Allowed labels: ${allowedLabels}. Do NOT invent or relabel sources.`,
    ``,
    `If a card cannot be supported by the provided sources, omit it rather than guessing.`,
    ``,
    `Format each flashcard as:`,
    `Q: <question>`,
    `A: <answer> [Source X]`,
    ``,
    `--- Sources ---`,
    labelled.join("\n\n"),
    ``,
    `--- User request ---`,
    query,
  ].join("\n");
}

async function main(): Promise<void> {
  const query = process.argv[2] ?? DEFAULT_QUERY;
  console.log(`[generate] Query: "${query}"`);

  const queryEmbedding = await embedText(query);
  const { data, error } = await supabase.rpc("match_guideline_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });
  if (error) {
    console.error(`[generate] Retrieval RPC failed: ${error.message}`);
    process.exit(1);
  }
  const matches = (data ?? []) as Match[];

  console.log(`--- Retrieved sources ---`);
  if (matches.length === 0) {
    console.log(
      `(none above threshold ${MATCH_THRESHOLD} — generation will likely refuse to produce cards)`,
    );
  } else {
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const label = SOURCE_LABELS[i] ?? String(i);
      console.log(
        `[Source ${label}] (sim ${m.similarity.toFixed(3)}) ${m.section_title ?? "(no section)"}`,
      );
      console.log(`  ${compact(m.content, COMPACT_PREVIEW)}`);
    }
  }

  const prompt = buildPrompt(query, matches);

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEN_MODEL });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  console.log(`--- Generated output ---`);
  console.log(text);
}

main().catch((e) => {
  console.error(`[generate] Unhandled error:`, e);
  process.exit(1);
});
