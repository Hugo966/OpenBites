-- Run once in Supabase > SQL Editor.
-- Single table: each row is a food, dish, day type or menu (the types in src/core/types.ts, stored in `data`).
create table objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('food', 'dish', 'dayType', 'menu')),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table objects enable row level security;
create policy "own rows only" on objects for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Since 2026-10-30 new tables are not exposed to the Data API automatically: explicit grant for signed-in users only.
grant select, insert, update, delete on objects to authenticated;
