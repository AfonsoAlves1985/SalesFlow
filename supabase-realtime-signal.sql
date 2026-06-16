-- Sinal leve de sincronização em tempo real para reduzir egress do Supabase.
-- Execute uma vez no SQL Editor do Supabase.

create table if not exists public.app_state_version (
    id text primary key,
    version text not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.app_state_version enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'app_state_version'
          and policyname = 'Acesso público completo ao sinal de sincronização'
    ) then
        create policy "Acesso público completo ao sinal de sincronização"
        on public.app_state_version
        for all
        using (true)
        with check (true);
    end if;
end $$;

insert into public.app_state_version (id, version)
values ('global', extract(epoch from now())::text)
on conflict (id) do nothing;

do $$
begin
    alter publication supabase_realtime add table public.app_state_version;
exception
    when duplicate_object then null;
end $$;

-- Mantenha o Realtime somente na tabela leve. Isso evita enviar eventos/payloads
-- de tabelas grandes e reduz egress no plano Free.
do $$
declare
    table_name text;
begin
    foreach table_name in array array['products', 'comandas', 'notifications', 'stock_movements'] loop
        if exists (
            select 1
            from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = table_name
        ) then
            execute format('alter publication supabase_realtime drop table public.%I', table_name);
        end if;
    end loop;
end $$;

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;
