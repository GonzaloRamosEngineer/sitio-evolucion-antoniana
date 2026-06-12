-- =============================================================================
-- Fase 1 — Rol "comision_directiva" + helpers reutilizables
-- =============================================================================
-- Contexto: la columna public.users.role es texto libre. Agregamos el rol nuevo
-- de forma segura con un CHECK constraint (no enum, para que sumar roles a futuro
-- sea un solo ALTER y no bloquee la tabla). El trigger prevent_privilege_escalation
-- existente NO se toca: decide QUIÉN puede cambiar el rol; el CHECK decide QUÉ
-- valores son válidos. Ambos trabajan en capas.
--
-- Supuesto verificado: public.users.id es el mismo UUID que auth.users.id
-- (useAuth.jsx hace .eq('id', authUser.id)). Las RLS de fases siguientes usan
-- auth.uid() = users.id en base a esto.
--
-- Idempotente: se puede correr más de una vez sin romper.
-- =============================================================================

-- A.1 — Normalizar datos previos (defensivo): cualquier rol fuera del set pasa a 'user'.
update public.users
set role = 'user'
where role is null
   or role not in ('admin', 'user', 'educacion_manager', 'comision_directiva');

-- A.2 — Conjunto cerrado de roles válidos.
alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'user', 'educacion_manager', 'comision_directiva'));

-- A.3 — Default explícito para altas públicas (signUp).
alter table public.users
  alter column role set default 'user';

-- -----------------------------------------------------------------------------
-- Helper: is_board_member()
-- Devuelve true si el usuario autenticado es admin o comisión directiva.
-- SECURITY DEFINER para que la lectura de public.users dentro de las policies
-- NO dispare las RLS de users (evita recursión y errores de permiso).
-- Reutilizado por las RLS de proyectos/tareas (Fase 2) y documentos (Fase 3).
-- -----------------------------------------------------------------------------
create or replace function public.is_board_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin', 'comision_directiva')
  );
$$;

revoke all on function public.is_board_member() from public;
grant execute on function public.is_board_member() to authenticated;

-- -----------------------------------------------------------------------------
-- Helper: set_updated_at()
-- Trigger genérico que mantiene la columna updated_at al día.
-- Reutilizado por las tablas de Fase 2 y Fase 3.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
