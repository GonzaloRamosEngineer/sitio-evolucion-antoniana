-- =============================================================================
-- Sincronizar confirmación de email de Supabase Auth → public.users.is_verified
-- =============================================================================
-- Problema: cuando un usuario confirma su email via Supabase Auth (clic en el
-- link de confirmación), auth.users.email_confirmed_at se setea, pero
-- public.users.is_verified nunca se actualizaba → todos mostraban "Pendiente".
--
-- Solución en dos partes:
--  1. Trigger que detecta cuando email_confirmed_at se setea y actualiza is_verified.
--  2. Backfill de usuarios que ya confirmaron su email antes de este trigger.
--
-- SECURITY DEFINER: necesario porque el trigger corre en el schema auth, que
-- está fuera del alcance de las RLS de public.
-- =============================================================================

-- 1) Función trigger: sincroniza email_confirmed_at → is_verified
create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo actúa cuando email_confirmed_at pasa de NULL a un valor concreto
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.users
    set is_verified = true
    where id = new.id;
  end if;
  return new;
end;
$$;

-- 2) Trigger sobre auth.users (idempotente)
drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row execute function public.handle_email_confirmed();

-- 3) Backfill: usuarios que ya tenían email confirmado pero is_verified en false/null
update public.users u
set is_verified = true
from auth.users au
where u.id = au.id
  and au.email_confirmed_at is not null
  and u.is_verified is not true;
