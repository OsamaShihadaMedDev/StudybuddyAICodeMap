# RAG Spike

Standalone proof-of-concept for the StudyBuddy grounded generation feature.
Ingests one guideline (NICE NG136 — Hypertension) into Supabase pgvector,
then tests retrieval and generation end-to-end.

## Prereqs

- Root `.env` must contain `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`
- The migration `supabase/migrations/20260511000000_rag_spike_pgvector.sql` must have been pushed: `supabase db push`
- `pdfs/NICE-NG136.pdf` must be in place

## Install

```
cd scripts/rag-spike
npm install
```

## Run

One-time ingestion (takes ~2-5 minutes on free-tier rate limits):
```
npm run ingest
```

Test retrieval with any query:
```
npm run retrieve "what is stage 2 hypertension"
npm run retrieve "drug treatment for type 2 diabetes"   # should return nothing — out of scope
```

Test full generation:
```
npm run generate "make 5 flashcards on hypertension diagnosis"
npm run generate "what are the BP thresholds in NICE guidelines"
```

## What to look for

After running, verify:

1. **Ingestion** — open Supabase dashboard, table editor, `guideline_chunks` table. Should see ~50-150 rows. Spot-check that `content` looks like real guideline text (not garbled), `section_title` is populated for most rows.

2. **Retrieval** — top result similarity should be > 0.7 for in-scope queries (anything about hypertension diagnosis/treatment). Out-of-scope queries (diabetes, asthma) should return either nothing or low-similarity results.

3. **Generation** — flashcards should be grounded in the guideline. Each card should cite a source. Check whether the content actually matches what the cited source chunk says (the model may still drift on Flash-Lite — that's expected).

## Reset

If you need to wipe and re-ingest from scratch:
```sql
DELETE FROM guideline_chunks WHERE guideline_id = 'nice-ng136';
```

The ingestion script is **resumable** — if it fails partway, just re-run `npm run ingest` and it will continue from the last successfully inserted chunk. You only need to manually delete rows if you want a clean restart (e.g., after changing the chunker logic).
