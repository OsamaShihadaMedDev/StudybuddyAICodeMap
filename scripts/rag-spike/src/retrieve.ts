import { embedText } from "./lib/embedder.js";
import { supabase } from "./lib/supabase.js";

const DEFAULT_QUERY = "blood pressure thresholds for diagnosing hypertension";
const MATCH_THRESHOLD = 0.5;
const MATCH_COUNT = 5;
const PREVIEW_CHARS = 500;

type Match = {
  id: string;
  guideline_id: string;
  guideline_name: string;
  section_title: string | null;
  content: string;
  similarity: number;
};

function preview(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}

async function main(): Promise<void> {
  const query = process.argv[2] ?? DEFAULT_QUERY;
  console.log(`[retrieve] Query: "${query}"`);

  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_guideline_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });

  if (error) {
    console.error(`[retrieve] RPC failed: ${error.message}`);
    process.exit(1);
  }

  const matches = (data ?? []) as Match[];

  if (matches.length === 0) {
    console.log(
      `[retrieve] No matches above threshold ${MATCH_THRESHOLD}. ` +
        `The query may be out of scope, or the threshold may be too high.`,
    );
    return;
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    console.log(`[Result ${i + 1}]  similarity: ${m.similarity.toFixed(3)}`);
    console.log(`Section: ${m.section_title ?? "(no section)"}`);
    console.log(`Content: ${preview(m.content, PREVIEW_CHARS)}`);
    console.log(`---`);
  }
}

main().catch((e) => {
  console.error(`[retrieve] Unhandled error:`, e);
  process.exit(1);
});
