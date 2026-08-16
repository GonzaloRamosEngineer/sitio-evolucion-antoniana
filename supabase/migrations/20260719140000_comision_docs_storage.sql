-- =====================================================================
-- Bucket privado `comision-docs` y sus políticas (ROADMAP §10 fase 0).
--
-- POR QUÉ ESTÁ SEPARADO DEL BASELINE
-- El baseline (20260719120000) sale de `supabase db dump --schema public`, y
-- estos objetos viven en `storage`, así que el dump nunca los capturó. Estaban
-- únicamente en `20260612150000_phase3_documents_storage.sql`, que **precedía**
-- al baseline y por lo tanto fallaba en una base desde cero (referenciaba
-- `public.users`, que todavía no existía). Al eliminar esa migración —su
-- contenido de esquema `public` ya está íntegro en el baseline— estas cuatro
-- políticas y el bucket se habrían perdido en cualquier reconstrucción,
-- dejando el módulo de documentos de la Comisión sin permisos.
--
-- POR QUÉ VA GUARDADA
-- `storage.buckets` y `storage.objects` los crea el servicio storage-api, no la
-- imagen de Postgres. En un proyecto Supabase real existen desde el minuto cero;
-- en el Postgres pelado que usa `supabase/checks/` para validar las RLS, no.
-- Sin la guarda, esta migración rompería esa validación. Con la guarda, el set
-- completo se aplica limpio en los dos entornos.
--
-- El salto se anuncia con RAISE NOTICE a propósito: que no exista storage es
-- normal al validar RLS, pero sería un problema serio si pasara en un proyecto
-- real, y un salto silencioso no daría manera de enterarse.
--
-- Idempotente: `on conflict do nothing` + `drop policy if exists`.
-- =====================================================================

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage.buckets no existe: se omiten el bucket comision-docs y sus policies. Esperado en un Postgres pelado (validación de RLS); NO esperado en un proyecto Supabase.';
    return;
  end if;

  -- Bucket privado, 50 MB por archivo.
  insert into storage.buckets (id, name, public, file_size_limit)
  values ('comision-docs', 'comision-docs', false, 52428800)
  on conflict (id) do nothing;

  -- Solo la Comisión Directiva lee y escribe. `public.is_board_member()` la
  -- define el baseline; el bucket es privado, así que sin estas policies el
  -- módulo de documentos queda inaccesible (RLS deniega por defecto).
  execute $ddl$ drop policy if exists comision_docs_select on storage.objects $ddl$;
  execute $ddl$
    create policy comision_docs_select on storage.objects
      for select to authenticated
      using (bucket_id = 'comision-docs' and public.is_board_member())
  $ddl$;

  execute $ddl$ drop policy if exists comision_docs_insert on storage.objects $ddl$;
  execute $ddl$
    create policy comision_docs_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'comision-docs' and public.is_board_member())
  $ddl$;

  execute $ddl$ drop policy if exists comision_docs_update on storage.objects $ddl$;
  execute $ddl$
    create policy comision_docs_update on storage.objects
      for update to authenticated
      using (bucket_id = 'comision-docs' and public.is_board_member())
      with check (bucket_id = 'comision-docs' and public.is_board_member())
  $ddl$;

  execute $ddl$ drop policy if exists comision_docs_delete on storage.objects $ddl$;
  execute $ddl$
    create policy comision_docs_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'comision-docs' and public.is_board_member())
  $ddl$;
end
$$;
