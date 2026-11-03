-- Run in Supabase > SQL Editor (safe to re-run).
-- Keeps the free tier from pausing the project: a GitHub Action calls keep_alive() several times a day.
-- It upserts a single row with the current time, so every call leaves a real, committed write
-- (an insert immediately followed by a delete wasn't enough to count as activity).
-- The table has no RLS policies, so nobody can read or write it through the API directly.
create table if not exists heartbeats (id bigint generated always as identity primary key, at timestamptz not null default now());
alter table heartbeats enable row level security;

drop function if exists keep_alive();
create function keep_alive() returns timestamptz
language sql security definer set search_path = public as $$
  insert into heartbeats (id, at) overriding system value values (1, now())
  on conflict (id) do update set at = excluded.at
  returning at;
$$;

revoke all on function keep_alive() from public;
grant execute on function keep_alive() to anon;
