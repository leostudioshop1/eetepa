-- ==================== SCHEMA SUPABASE - MASTER HORÁRIO EETEPA ====================
create extension if not exists "pgcrypto";

-- 1. Turmas
create table if not exists public.turmas (
  id text primary key,
  nome text not null,
  turno text not null check (turno in ('manha', 'tarde', 'noite')),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Disciplinas
create table if not exists public.disciplinas (
  id text primary key,
  nome text not null unique,
  carga_horaria integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Grade de Horários (1 registro por célula: turma + dia + horario)
create table if not exists public.grade_horarios (
  id uuid primary key default gen_random_uuid(),
  turma_id text not null references public.turmas(id) on delete cascade,
  dia text not null check (dia in ('segunda', 'terca', 'quarta', 'quinta', 'sexta')),
  horario text not null,
  disciplina text not null,
  professor_id text not null,
  professor_nome text not null,
  cor text not null default '#4f46e5',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (turma_id, dia, horario)
);

-- 4. Dispositivos de Acesso
create table if not exists public.dispositivos_acesso (
  dispositivo_id text primary key,
  user_agent text,
  plataforma text,
  idioma text,
  resolucao text,
  primeiro_acesso timestamptz not null default now(),
  ultimo_acesso timestamptz not null default now(),
  tempo_uso_segundos bigint not null default 0,
  sessoes integer not null default 0
);

-- 5. Sessões de Uso
create table if not exists public.sessoes_uso (
  id uuid primary key default gen_random_uuid(),
  dispositivo_id text not null references public.dispositivos_acesso(dispositivo_id) on delete cascade,
  inicio timestamptz not null default now(),
  fim timestamptz,
  tempo_uso_segundos integer not null default 0,
  user_agent text,
  plataforma text
);

-- Função atômica para incrementar tempo de uso e sessões sem condição de corrida
create or replace function public.registrar_uso_dispositivo(
  p_dispositivo_id text,
  p_delta_segundos bigint,
  p_nova_sessao boolean,
  p_user_agent text default '',
  p_plataforma text default '',
  p_idioma text default '',
  p_resolucao text default ''
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.dispositivos_acesso (
    dispositivo_id, user_agent, plataforma, idioma, resolucao,
    primeiro_acesso, ultimo_acesso, tempo_uso_segundos, sessoes
  )
  values (
    p_dispositivo_id, p_user_agent, p_plataforma, p_idioma, p_resolucao,
    now(), now(), greatest(0, coalesce(p_delta_segundos, 0)),
    case when p_nova_sessao then 1 else 0 end
  )
  on conflict (dispositivo_id) do update set
    user_agent = coalesce(nullif(excluded.user_agent, ''), dispositivos_acesso.user_agent),
    plataforma = coalesce(nullif(excluded.plataforma, ''), dispositivos_acesso.plataforma),
    idioma = coalesce(nullif(excluded.idioma, ''), dispositivos_acesso.idioma),
    resolucao = coalesce(nullif(excluded.resolucao, ''), dispositivos_acesso.resolucao),
    ultimo_acesso = now(),
    tempo_uso_segundos = dispositivos_acesso.tempo_uso_segundos + greatest(0, coalesce(p_delta_segundos, 0)),
    sessoes = dispositivos_acesso.sessoes + case when p_nova_sessao then 1 else 0 end;
end;
$$;

-- RLS
alter table public.turmas enable row level security;
alter table public.disciplinas enable row level security;
alter table public.grade_horarios enable row level security;
alter table public.dispositivos_acesso enable row level security;
alter table public.sessoes_uso enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all_turmas') then
    create policy allow_all_turmas on public.turmas for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_all_disciplinas') then
    create policy allow_all_disciplinas on public.disciplinas for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_all_grade') then
    create policy allow_all_grade on public.grade_horarios for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_all_dispositivos') then
    create policy allow_all_dispositivos on public.dispositivos_acesso for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_all_sessoes') then
    create policy allow_all_sessoes on public.sessoes_uso for all using (true) with check (true);
  end if;
end $$;
