-- El panel de usuarios requiere que un administrador pueda verificar cuentas
-- y asignar roles. Antes solo existía la policy de edición del perfil propio:
-- Postgres filtraba el UPDATE a otra persona y la UI lo interpretaba como éxito.

DROP POLICY IF EXISTS users_admin_update ON public.users;
CREATE POLICY users_admin_update
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());
