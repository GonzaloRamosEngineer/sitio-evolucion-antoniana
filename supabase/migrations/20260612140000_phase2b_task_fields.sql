-- =============================================================================
-- Fase 2b — Campos extra en tasks para reflejar proyectos reales
-- =============================================================================
-- El kanban macro sigue en tasks.status (pendiente/en_progreso/hecho). Se suman:
--  - status_label: estado fino/oficial del trámite (texto libre; la UI ofrece un
--    set estándar: Listo, Listo para firma, Pendiente formal, Pendiente,
--    Pendiente eventual, No aplica ahora).
--  - assignee_text: responsable en texto libre (muchos no son usuarios del
--    sistema: Presidente, Secretario, Contador, CPCE, Consejo...).
--  - priority: alta/media/baja (opcional).
-- assignee_id (FK a users) se conserva para usos futuros; no se elimina.
-- Idempotente.
-- =============================================================================

alter table public.tasks add column if not exists status_label  text;
alter table public.tasks add column if not exists assignee_text text;
alter table public.tasks add column if not exists priority      text;

alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks
  add constraint tasks_priority_check
  check (priority is null or priority in ('alta', 'media', 'baja'));
