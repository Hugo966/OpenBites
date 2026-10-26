-- Run in Supabase > SQL Editor (safe to re-run).
-- Keeps the free tier from pausing the project: a GitHub Action calls latido() every 5 days,
-- which inserts a row and deletes it. The table has no RLS policies, so nobody can read or write it through the API.
create table if not exists latido (id bigint generated always as identity primary key, at timestamptz not null default now());
alter table latido enable row level security;

create or replace function latido() returns void
language sql security definer set search_path = public as $$
  insert into latido default values;
  delete from latido where true; -- Supabase requires a WHERE clause on DELETE
$$;

revoke all on function latido() from public;
grant execute on function latido() to anon;
