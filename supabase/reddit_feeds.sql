-- One row per project. Written by /api/reddit/ingest (service role), read by /api/reddit.
create table if not exists public.reddit_feeds (
  project_slug text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.reddit_feeds enable row level security; -- no policies: only the service role can touch it
