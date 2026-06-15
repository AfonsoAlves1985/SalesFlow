-- ==========================================
-- SCRIPT DE ESQUEMA DO SUPABASE POSTGRESQL --
-- ==========================================
-- Sistema: SalesFlow Coletor & Dispatcher
-- Utilização: Copie e cole este script na área "SQL Editor" do seu painel do Supabase.

-- Habilitar a extensão UUID se necessário
create extension if not exists "uuid-ossp";

-- 1. Tabela de Categorias
create table if not exists public.categories (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS e criar políticas públicas/anônimas para maior facilidade de integração
alter table public.categories enable row level security;
create policy "Acesso público completo a categorias" on public.categories for all using (true) with check (true);

-- 2. Tabela de Unidades Operacionais
create table if not exists public.unidades (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.unidades enable row level security;
create policy "Acesso público completo a unidades" on public.unidades for all using (true) with check (true);

-- 3. Tabela de Produtos (Catálogo do Cardápio)
create table if not exists public.products (
    id text primary key, -- Mantém o mesmo ID string gerado pelo front-end
    code text not null unique,
    name text not null,
    price numeric(10,2) default 0.00 not null,
    stock integer default 0 not null,
    category text not null,
    image text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Adicionar índice de buscas no catálogo
create index if not exists products_code_idx on public.products (code);
create index if not exists products_category_idx on public.products (category);

alter table public.products enable row level security;
create policy "Permitir acesso completo a produtos" on public.products for all using (true) with check (true);

-- 4. Tabela de Comandas e Consumos
create table if not exists public.comandas (
    id text primary key, -- Mantém os códigos amigáveis customizados de comanda
    client_name text not null,
    client_type text not null, -- 'Aluno', 'Colaborador', 'Diretoria'
    client_email text,
    client_phone text,
    course_or_training text not null,
    month text not null,
    status text default 'Pendente'::text not null, -- 'Pendente' ou 'Pago'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    closed_at timestamp with time zone,
    units text, -- Unidade da comanda
    closure_reminder_active boolean default false,
    items jsonb default '[]'::jsonb not null -- Detalhes e assinaturas dos itens consumidos
);

-- Adicionar índices de busca rápida do operador
create index if not exists comandas_status_idx on public.comandas (status);
create index if not exists comandas_created_at_idx on public.comandas (created_at desc);

alter table public.comandas enable row level security;
create policy "Permitir acesso completo a comandas" on public.comandas for all using (true) with check (true);

-- 5. Tabela de Históricos de Logs de Notificações enviadas (WhatsApp/SMS)
create table if not exists public.notifications (
    id text primary key,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
    recipient text not null,
    course text not null,
    contact text not null,
    type text not null, -- 'WhatsApp', 'Email', 'SMS'
    message text not null,
    status text not null, -- 'Sucesso' ou 'Falha'
    sender text
);

create index if not exists notifications_timestamp_idx on public.notifications (timestamp desc);

alter table public.notifications enable row level security;
create policy "Permitir leitura e escrita de logs de disparos" on public.notifications for all using (true) with check (true);

-- ========================================================
-- Valores Iniciais Recomendados para Carga Inicial (Seed) --
-- ========================================================
insert into public.categories (name) values 
('Bebidas'), 
('Alimentos'), 
('Papelaria'), 
('Vestuário'), 
('Acessórios')
on conflict (name) do nothing;

insert into public.unidades (name) values 
('Sede Principal'), 
('Filial Norte'), 
('Filial Sul')
on conflict (name) do nothing;

-- 6. Tabela de Usuários do Sistema
create table if not exists public.system_users (
    id text primary key,
    username text not null unique,
    name text not null,
    email text not null,
    role text not null check (role in ('admin', 'cashier')),
    status text not null default 'invited'::text check (status in ('active', 'invited')),
    password text,
    invitation_code text,
    needs_password_change boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.system_users enable row level security;
create policy "Acesso público completo a usuarios do sistema" on public.system_users for all using (true) with check (true);

-- 7. Tabela de Turnos de Caixa
create table if not exists public.cashier_shifts (
    id text primary key,
    opened_at timestamp with time zone not null,
    opened_by text not null,
    closed_at timestamp with time zone,
    closed_by text,
    initial_balance numeric(10,2) not null default 0.00,
    final_balance numeric(10,2),
    actual_cash_in_hand numeric(10,2),
    notes text,
    is_active boolean default true
);

create index if not exists cashier_shifts_opened_at_idx on public.cashier_shifts (opened_at desc);
create index if not exists cashier_shifts_is_active_idx on public.cashier_shifts (is_active);

alter table public.cashier_shifts enable row level security;
create policy "Acesso público completo a turnos de caixa" on public.cashier_shifts for all using (true) with check (true);

-- 8. Tabela de Movimentação de Estoque (Fluxo de Entrada/Saída)
create table if not exists public.stock_movements (
    id text primary key,
    product_id text not null,
    product_name text not null,
    product_code text not null,
    type text not null check (type in ('entrada', 'saida', 'ajuste')),
    quantity integer not null default 0,
    price numeric(10,2) not null default 0.00,
    total_value numeric(10,2) not null default 0.00,
    reference text not null,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists stock_movements_timestamp_idx on public.stock_movements (timestamp desc);
create index if not exists stock_movements_type_idx on public.stock_movements (type);
create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id);

alter table public.stock_movements enable row level security;
create policy "Acesso público completo a movimentos de estoque" on public.stock_movements for all using (true) with check (true);

-- 9. Sinal leve de sincronização em tempo real
-- O app assina esta tabela pequena no Realtime em vez de ouvir todas as tabelas pesadas.
create table if not exists public.app_state_version (
    id text primary key,
    version text not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.app_state_version enable row level security;
create policy "Acesso público completo ao sinal de sincronização" on public.app_state_version for all using (true) with check (true);

insert into public.app_state_version (id, version)
values ('global', extract(epoch from now())::text)
on conflict (id) do nothing;

do $$
begin
    alter publication supabase_realtime add table public.app_state_version;
exception
    when duplicate_object then null;
end $$;
