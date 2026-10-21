-- Pegar en Supabase > SQL Editor y ejecutar una vez.
-- Una sola tabla: cada fila es un alimento, plato, tipo de día o menú (los tipos de src/core/types.ts en `data`).
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
