-- Pegar en Supabase > SQL Editor y ejecutar una vez.
-- Evita que el plan gratis pause el proyecto: GitHub Actions llama a latido() cada 5 días,
-- que mete una fila y la borra. La tabla no tiene políticas RLS: nadie la lee ni escribe por la API.
create table latido (id bigint generated always as identity primary key, at timestamptz not null default now());
alter table latido enable row level security;

create function latido() returns void
language sql security definer set search_path = public as $$
  insert into latido default values;
  delete from latido;
$$;

revoke all on function latido() from public;
grant execute on function latido() to anon;
