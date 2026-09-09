-- =====================================================================
-- La foto de perfil del socio: columna `users.avatar_path` + bucket
-- privado `avatares` con sus políticas (§10.23.e).
--
-- POR QUÉ `avatar_path` Y NO `avatar_url`
-- `DashboardHeader` y `UserProfileCard` leían `user.avatar_url` desde el
-- scaffold de Hostinger, contra una columna que NUNCA EXISTIÓ: siempre
-- venía `undefined` y por eso el panel mostraba el dibujo por defecto a
-- todo el mundo. Se podría haber creado esa columna con ese nombre, pero
-- **el bucket es privado y acá no se guarda una URL**: se guarda la ruta
-- del objeto, y la URL se firma en cada lectura y vence. Una columna
-- llamada `avatar_url` con una ruta adentro es la clase de mentira que
-- este repo ya pagó dos veces (`socio_desde` que era la fecha de la
-- cuenta, «Rango: Padrino» que no existía). El nombre dice qué hay.
--
-- POR QUÉ EL BUCKET ES PRIVADO
-- Es la cara de una persona. Un bucket público la deja en internet
-- abierto para siempre, y la foto solo se muestra en el panel de su
-- propio dueño: no hay un solo caso de uso que necesite que sea pública.
-- Es la misma regla que gobierna `gastos` desde `20260816150000` —lo que
-- no pueda ser público no se escribe donde se publica— aplicada al revés.
--
-- UN ARCHIVO POR PERSONA, EN SU PROPIA CARPETA: `<user_id>/avatar.webp`.
-- De eso depende toda la seguridad de acá: las cuatro policies comparan
-- `(storage.foldername(name))[1]` con `auth.uid()`, así que nadie puede
-- leer, pisar ni borrar la foto de otro. Y al ser un nombre fijo, subir
-- de nuevo REEMPLAZA en vez de acumular versiones que nadie limpia.
--
-- ⚠️ NO se le da acceso al admin ni a la Comisión, a propósito. Hoy
-- ningún panel muestra la foto de un tercero, y una policy que habilita
-- algo que nadie usa es superficie de ataque sin contraparte. El día que
-- el admin necesite verlas, se agrega la policy con su motivo.
--
-- Idempotente y convergente desde la versión anterior: la columna va con
-- `add column if not exists` porque el baseline (20260719120000) ya está
-- aplicado en producción y agregarla allá no la agregaría en ningún lado
-- (la trampa que costó `aportes.payment_id` el 2026-08-30).
-- =====================================================================

alter table public.users add column if not exists avatar_path text;

comment on column public.users.avatar_path is
  'Ruta del objeto en el bucket privado `avatares` (`<user_id>/avatar.webp`), no una URL: la URL se firma al leer y vence. NULL = sin foto, se usa el dibujo por género o las iniciales (src/lib/avatar.js).';

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage.buckets no existe: se omiten el bucket avatares y sus policies. Esperado en un Postgres pelado (validación de RLS); NO esperado en un proyecto Supabase.';
    return;
  end if;

  -- Privado. 2 MB por archivo: el cliente sube un WebP de 512x512 que
  -- pesa decenas de KB, así que 2 MB ya es holgado y acota lo que puede
  -- subir alguien que hable con la API sin pasar por nuestra pantalla.
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatares', 'avatares', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
  on conflict (id) do update
    set public = false,
        file_size_limit = 2097152,
        allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

  -- Cada quien, y solo cada quien, con su propia carpeta.
  execute $ddl$ drop policy if exists avatares_select on storage.objects $ddl$;
  execute $ddl$
    create policy avatares_select on storage.objects
      for select to authenticated
      using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  $ddl$;

  execute $ddl$ drop policy if exists avatares_insert on storage.objects $ddl$;
  execute $ddl$
    create policy avatares_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  $ddl$;

  -- `update` hace falta además de `insert`: subir con `upsert: true` sobre
  -- un objeto que ya existe es un UPDATE, no un INSERT. Sin esta policy,
  -- la primera foto entra y la segunda falla — y falla recién en manos de
  -- alguien que quiso cambiarla, que es el peor momento para descubrirlo.
  execute $ddl$ drop policy if exists avatares_update on storage.objects $ddl$;
  execute $ddl$
    create policy avatares_update on storage.objects
      for update to authenticated
      using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  $ddl$;

  execute $ddl$ drop policy if exists avatares_delete on storage.objects $ddl$;
  execute $ddl$
    create policy avatares_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  $ddl$;
end
$$;
