-- ==============================================================================
-- PONTO SINISTRO: Esquema de Banco de Dados Supabase (PostgreSQL + RLS)
-- Cole este script no painel SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela de Configurações do Usuário
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  punches_per_day int not null default 2,
  entry_min_minutes int not null default 525, -- 08:45
  entry_max_minutes int not null default 555, -- 09:15
  work_min_minutes int not null default 450,  -- 07:30
  work_max_minutes int not null default 510,  -- 08:30
  target_daily_minutes int not null default 480, -- 08:00
  cycle_cutoff_day int not null default 1,
  compensation_preference text not null default 'ask',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS em user_settings
alter table public.user_settings enable row level security;

-- Políticas de RLS para user_settings
create policy "Usuários podem ver apenas suas próprias configurações"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Usuários podem inserir suas próprias configurações"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar suas próprias configurações"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- 3. Tabela de Dias de Ponto (Work Days)
create table if not exists public.work_days (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  day_type text not null default 'workday', -- 'workday', 'weekend', 'holiday', 'time_off'
  holiday_name text,
  planned_entry int,
  planned_exit int,
  actual_entry int,
  actual_exit int,
  planned_duration int not null default 480,
  actual_duration int,
  is_completed boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, date)
);

-- Habilitar RLS em work_days
alter table public.work_days enable row level security;

-- Políticas de RLS para work_days
create policy "Usuários podem ver apenas seus próprios dias"
  on public.work_days for select
  using (auth.uid() = user_id);

create policy "Usuários podem inserir seus próprios dias"
  on public.work_days for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar seus próprios dias"
  on public.work_days for update
  using (auth.uid() = user_id);

create policy "Usuários podem deletar seus próprios dias"
  on public.work_days for delete
  using (auth.uid() = user_id);

-- 4. Gatilhos automáticos para atualizar timestamp (updated_at)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.handle_updated_at();

create trigger set_work_days_updated_at
  before update on public.work_days
  for each row execute procedure public.handle_updated_at();

