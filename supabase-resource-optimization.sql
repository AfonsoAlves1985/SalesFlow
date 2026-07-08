-- SalesFlow resource optimization for Supabase Free/low-cost plans.
-- Safe to run after the base schema, even if the scope migration was not applied.

alter table public.categories
  add column if not exists company_id text not null default 'grupo-frz',
  add column if not exists workspace_id text not null default 'febracis-pa',
  add column if not exists space_id text not null default 'caixa-principal';

alter table public.unidades
  add column if not exists company_id text not null default 'grupo-frz',
  add column if not exists workspace_id text not null default 'febracis-pa',
  add column if not exists space_id text not null default 'caixa-principal';

alter table public.products
  add column if not exists company_id text not null default 'grupo-frz',
  add column if not exists workspace_id text not null default 'febracis-pa',
  add column if not exists space_id text not null default 'caixa-principal';

alter table public.comandas
  add column if not exists company_id text not null default 'grupo-frz',
  add column if not exists workspace_id text not null default 'febracis-pa',
  add column if not exists space_id text not null default 'caixa-principal';

alter table public.notifications
  add column if not exists company_id text not null default 'grupo-frz',
  add column if not exists workspace_id text not null default 'febracis-pa',
  add column if not exists space_id text not null default 'caixa-principal';

alter table public.stock_movements
  add column if not exists company_id text not null default 'grupo-frz',
  add column if not exists workspace_id text not null default 'febracis-pa',
  add column if not exists space_id text not null default 'caixa-principal';

alter table public.products
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table public.comandas
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

create unique index if not exists categories_scope_name_uidx
  on public.categories (company_id, workspace_id, space_id, name);

create unique index if not exists unidades_scope_name_uidx
  on public.unidades (company_id, workspace_id, space_id, name);

create index if not exists categories_scope_idx
  on public.categories (company_id, workspace_id, space_id);

create index if not exists unidades_scope_idx
  on public.unidades (company_id, workspace_id, space_id);

create index if not exists products_scope_updated_at_idx
  on public.products (company_id, workspace_id, space_id, updated_at desc);

create index if not exists comandas_scope_updated_at_idx
  on public.comandas (company_id, workspace_id, space_id, updated_at desc);

create index if not exists notifications_scope_timestamp_idx
  on public.notifications (company_id, workspace_id, space_id, timestamp desc);

create index if not exists stock_movements_scope_timestamp_idx
  on public.stock_movements (company_id, workspace_id, space_id, timestamp desc);

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

-- Keep Realtime payloads restricted to the lightweight signal table.
do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'products',
        'comandas',
        'notifications',
        'stock_movements',
        'categories',
        'unidades'
    ] loop
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
