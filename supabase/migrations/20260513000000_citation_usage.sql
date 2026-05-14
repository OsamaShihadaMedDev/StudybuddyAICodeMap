-- Citation usage tracking table
-- Tracks how many cited generations a user has used per calendar day (UTC)
create table if not exists citation_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint citation_usage_user_date_unique unique (user_id, usage_date)
);

-- RLS
alter table citation_usage enable row level security;

create policy "Users can read own citation usage"
  on citation_usage for select
  using (auth.uid() = user_id);

create policy "Users can upsert own citation usage"
  on citation_usage for insert
  with check (auth.uid() = user_id);

create policy "Users can update own citation usage"
  on citation_usage for update
  using (auth.uid() = user_id);
