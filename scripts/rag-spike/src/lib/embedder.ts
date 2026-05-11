import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./env.js";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

const SUB_BATCH_SIZE = 50;
const SUB_BATCH_DELAY_MS = 1000;
const OUTPUT_DIM = 768;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type BatchEmbedResponse = {
  embeddings?: { values?: number[] }[];
};

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += SUB_BATCH_SIZE) {
    const slice = texts.slice(i, i + SUB_BATCH_SIZE);
    const subBatchNum = Math.floor(i / SUB_BATCH_SIZE) + 1;

    const requests = slice.map((text) => ({
      content: { role: "user", parts: [{ text }] },
      outputDimensionality: OUTPUT_DIM,
    }));

    let response: BatchEmbedResponse;
    try {
      response = (await (
        embeddingModel as unknown as {
          batchEmbedContents: (req: { requests: unknown[] }) => Promise<BatchEmbedResponse>;
        }
      ).batchEmbedContents({ requests })) as BatchEmbedResponse;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Sub-batch ${subBatchNum} (texts ${i}-${i + slice.length - 1}) failed: ${msg}`,
      );
    }

    const embeddings = response.embeddings ?? [];
    if (embeddings.length !== slice.length) {
      throw new Error(
        `Sub-batch ${subBatchNum}: expected ${slice.length} embeddings, got ${embeddings.length}`,
      );
    }
    for (let j = 0; j < slice.length; j++) {
      const values = embeddings[j]?.values;
      if (!values || values.length === 0) {
        throw new Error(
          `Sub-batch ${subBatchNum}: embedding for text index ${i + j} had no values`,
        );
      }
      out[i + j] = values;
    }

    if (i + SUB_BATCH_SIZE < texts.length) {
      await sleep(SUB_BATCH_DELAY_MS);
    }
  }

  return out;
}

export async function embedText(text: string): Promise<number[]> {
  const [v] = await embedBatch([text]);
  return v;
}
