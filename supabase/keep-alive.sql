-- Run in Supabase > SQL Editor (safe to re-run).
-- Keeps the free tier from pausing the project: a GitHub Action calls keep_alive() every 5 days,
-- which inserts a row and deletes it. The table has no RLS policies, so nobody can read or write it through the API.
create table if not exists heartbeats (id bigint generated always as identity primary key, at timestamptz not null default now());
alter table heartbeats enable row level security;

create or replace function keep_alive() returns void
language sql security definer set search_path = public as $$
  insert into heartbeats default values;
  delete from heartbeats where true; -- Supabase requires a WHERE clause on DELETE
$$;

revoke all on function keep_alive() from public;
grant execute on function keep_alive() to anon;
