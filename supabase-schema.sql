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
