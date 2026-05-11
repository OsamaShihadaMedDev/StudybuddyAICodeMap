import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { extractPdfText } from "./lib/pdf.js";
import { chunkText } from "./lib/chunker.js";
import { embedBatch } from "./lib/embedder.js";
import { supabase } from "./lib/supabase.js";

const GUIDELINE_ID = "nice-ng136";
const GUIDELINE_NAME =
  "NICE NG136 — Hypertension in adults: diagnosis and management";
const SOURCE_URL = "https://www.nice.org.uk/guidance/ng136";
const PDF_PATH = resolve(process.cwd(), "pdfs", "NICE-NG136.pdf");
const GROUP_SIZE = 50;
const GROUP_DELAY_MS = 1000;

type Row = {
  guideline_id: string;
  guideline_name: string;
  source_url: string;
  section_title: string | null;
  chunk_index: number;
  content: string;
  embedding: number[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function getResumeIndex(): Promise<{ existingCount: number; resumeFrom: number }> {
  const { count, error: countErr } = await supabase
    .from("guideline_chunks")
    .select("id", { count: "exact", head: true })
    .eq("guideline_id", GUIDELINE_ID);
  if (countErr) {
    throw new Error(`Failed to count existing rows: ${countErr.message}`);
  }
  if ((count ?? 0) === 0) {
    return { existingCount: 0, resumeFrom: 0 };
  }
  const { data, error } = await supabase
    .from("guideline_chunks")
    .select("chunk_index")
    .eq("guideline_id", GUIDELINE_ID)
    .order("chunk_index", { ascending: false })
    .limit(1);
  if (error) {
    throw new Error(`Failed to read max chunk_index: ${error.message}`);
  }
  const maxIdx = data?.[0]?.chunk_index ?? -1;
  return { existingCount: count ?? 0, resumeFrom: maxIdx + 1 };
}

async function main(): Promise<void> {
  const startedAt = Date.now();

  if (!existsSync(PDF_PATH)) {
    console.error(`[ingest] PDF not found at ${PDF_PATH}`);
    console.error(
      `[ingest] Place the file at scripts/rag-spike/pdfs/NICE-NG136.pdf and re-run.`,
    );
    process.exit(1);
  }

  console.log(`[ingest] Reading PDF: ${PDF_PATH}`);
  const raw = await extractPdfText(PDF_PATH);
  const chunks = chunkText(raw);
  console.log(`[ingest] Extracted ${chunks.length} chunks from PDF`);

  if (chunks.length === 0) {
    console.error(`[ingest] No chunks produced — aborting.`);
    process.exit(1);
  }

  const { existingCount, resumeFrom } = await getResumeIndex();
  if (existingCount === 0) {
    console.log(`[ingest] No existing chunks. Starting fresh.`);
  } else if (resumeFrom >= chunks.length) {
    console.log(
      `[ingest] Already ingested (${existingCount} rows for guideline_id='${GUIDELINE_ID}', max chunk_index=${resumeFrom - 1}).`,
    );
    console.log(
      `[ingest] Delete existing rows first if you want to re-ingest: ` +
        `DELETE FROM guideline_chunks WHERE guideline_id = '${GUIDELINE_ID}';`,
    );
    process.exit(0);
  } else {
    console.log(
      `[ingest] Found ${existingCount} existing chunks. Resuming from chunk index ${resumeFrom}.`,
    );
  }

  const remaining = chunks.slice(resumeFrom);
  const totalGroups = Math.ceil(remaining.length / GROUP_SIZE);

  let groupsSucceeded = 0;
  let chunksInsertedThisRun = 0;

  for (let g = 0; g < totalGroups; g++) {
    const groupStart = g * GROUP_SIZE;
    const groupSlice = remaining.slice(groupStart, groupStart + GROUP_SIZE);
    const absoluteStart = resumeFrom + groupStart;
    const absoluteEnd = absoluteStart + groupSlice.length - 1;
    const groupNum = g + 1;
    const groupStartedAt = Date.now();

    let embeddings: number[][];
    try {
      embeddings = await embedBatch(groupSlice.map((c) => c.content));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `[ingest] Group ${groupNum}/${totalGroups} (chunks ${absoluteStart}-${absoluteEnd}) failed during embedding: ${msg}`,
      );
      printFinalSummary(groupsSucceeded, chunksInsertedThisRun, startedAt);
      process.exit(1);
    }

    const rows: Row[] = groupSlice.map((c, j) => ({
      guideline_id: GUIDELINE_ID,
      guideline_name: GUIDELINE_NAME,
      source_url: SOURCE_URL,
      section_title: c.section_title,
      chunk_index: absoluteStart + j,
      content: c.content,
      embedding: embeddings[j],
    }));

    const { error: insertErr } = await supabase
      .from("guideline_chunks")
      .insert(rows);
    if (insertErr) {
      console.error(
        `[ingest] Group ${groupNum}/${totalGroups} (chunks ${absoluteStart}-${absoluteEnd}) failed during insert: ${insertErr.message}`,
      );
      printFinalSummary(groupsSucceeded, chunksInsertedThisRun, startedAt);
      process.exit(1);
    }

    groupsSucceeded++;
    chunksInsertedThisRun += rows.length;
    const groupSec = ((Date.now() - groupStartedAt) / 1000).toFixed(1);
    console.log(
      `[ingest] Group ${groupNum}/${totalGroups}: ${rows.length} chunks embedded + inserted (${groupSec}s)`,
    );

    if (g < totalGroups - 1) {
      await sleep(GROUP_DELAY_MS);
    }
  }

  const totalNow = existingCount + chunksInsertedThisRun;
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[ingest] ✓ Done. Total chunks in DB: ${totalNow}. Time elapsed: ${elapsedSec}s.`,
  );
}

function printFinalSummary(
  groupsSucceeded: number,
  chunksInserted: number,
  startedAt: number,
): void {
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.error(
    `[ingest] Run summary: ${groupsSucceeded} groups succeeded, ${chunksInserted} chunks inserted this run (${elapsedSec}s).`,
  );
  console.error(
    `[ingest] To resume, just re-run: npm run ingest — it will pick up at the next un-ingested chunk_index.`,
  );
}

main().catch((e) => {
  console.error(`[ingest] Unhandled error:`, e);
  process.exit(1);
});
