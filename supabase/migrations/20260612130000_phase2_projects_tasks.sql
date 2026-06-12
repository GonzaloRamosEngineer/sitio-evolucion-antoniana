-- =============================================================================
-- Fase 2 — Gestor de proyectos y tareas (Comisión Directiva)
-- =============================================================================
-- Tablas projects y tasks. Solo los miembros del board (admin + comisión
-- directiva) ven y operan estos datos, vía is_board_member() (definido en la
-- migración de Fase 1). Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'activo'
              check (status in ('activo', 'en_pausa', 'cerrado')),
  start_date  date,
  end_date    date,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- tasks (kanban: pendiente / en_progreso / hecho)
-- -----------------------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'pendiente'
              check (status in ('pendiente', 'en_progreso', 'hecho')),
  assignee_id uuid references public.users(id) on delete set null,
  due_date    date,
  position    integer not null default 0,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_tasks_project  on public.tasks(project_id);
create index if not exists idx_tasks_assignee on public.tasks(assignee_id);
create index if not exists idx_tasks_status   on public.tasks(status);

-- -----------------------------------------------------------------------------
-- Triggers updated_at (set_updated_at() viene de la migración de Fase 1)
-- -----------------------------------------------------------------------------
drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: solo board ve/escribe. El resto (user, educacion_manager, anon) nada.
-- -----------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;

drop policy if exists projects_board_all on public.projects;
create policy projects_board_all on public.projects
  for all
  to authenticated
  using (public.is_board_member())
  with check (public.is_board_member());

drop policy if exists tasks_board_all on public.tasks;
create policy tasks_board_all on public.tasks
  for all
  to authenticated
  using (public.is_board_member())
  with check (public.is_board_member());

-- -----------------------------------------------------------------------------
-- Board ve board: necesario para asignar tareas a colegas de la comisión.
-- Política SELECT *adicional* sobre users (las policies SELECT se combinan con
-- OR, así que esto sólo amplía: un board member puede leer las filas de otros
-- board members; NO expone usuarios comunes ni cambia el acceso existente).
-- -----------------------------------------------------------------------------
drop policy if exists users_board_select on public.users;
create policy users_board_select on public.users
  for select
  to authenticated
  using (public.is_board_member() and role in ('admin', 'comision_directiva'));
