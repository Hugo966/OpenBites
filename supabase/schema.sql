-- Run once in Supabase > SQL Editor.
-- Single table: each row is a food, dish, day type or menu (the types in src/core/types.ts, stored in `data`).
create table objetos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tipo text not null check (tipo in ('alimento', 'plato', 'tipoDia', 'menu')),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table objetos enable row level security;
create policy "solo lo mío" on objetos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Since 2026-10-30 new tables are not exposed to the Data API automatically: explicit grant for signed-in users only.
grant select, insert, update, delete on objetos to authenticated;
