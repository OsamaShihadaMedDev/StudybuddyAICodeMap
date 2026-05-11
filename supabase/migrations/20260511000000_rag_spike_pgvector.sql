-- Enable pgvector extension
create extension if not exists vector;

-- Guideline chunks table
create table if not exists public.guideline_chunks (
  id uuid primary key default gen_random_uuid(),
  guideline_id text not null,
  guideline_name text not null,
  source_url text,
  section_title text,
  chunk_index int not null,
  content text not null,
  embedding vector(768) not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Index for guideline lookups
create index if not exists idx_guideline_chunks_guideline_id
  on public.guideline_chunks (guideline_id);

-- Enable RLS — guidelines are read-only reference data
alter table public.guideline_chunks enable row level security;

-- Anyone (anon + authenticated) can read guideline chunks
create policy "Anyone can read guideline chunks"
  on public.guideline_chunks
  for select
  using (true);

-- Note: no insert/update/delete policy — only service_role writes (bypasses RLS)

-- Similarity search function
create or replace function public.match_guideline_chunks(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  guideline_id text,
  guideline_name text,
  section_title text,
  content text,
  similarity float
)
language sql stable as $$
  select
    gc.id,
    gc.guideline_id,
    gc.guideline_name,
    gc.section_title,
    gc.content,
    1 - (gc.embedding <=> query_embedding) as similarity
  from public.guideline_chunks gc
  where 1 - (gc.embedding <=> query_embedding) > match_threshold
  order by gc.embedding <=> query_embedding
  limit match_count;
$$;
