-- =============================================================================
-- Fase 3 — Gestor de documentación interna versionada (Comisión Directiva)
-- =============================================================================
-- Documentación INTERNA y PRIVADA de la comisión (borradores, actas internas,
-- versiones de trabajo del estatuto, etc.). Independiente de legal_documents
-- (tabla pública del sitio): NO se tocan entre sí.
--
-- Cada "documento lógico" (documents) tiene N versiones inmutables
-- (document_versions); al subir un archivo nuevo se crea v(n+1) conservando las
-- anteriores (historial estilo git). Los archivos viven en un bucket PRIVADO de
-- Storage y se sirven con signed URLs.
--
-- Requiere is_board_member() y set_updated_at() (migración de Fase 1). Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- documents (metadata)
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  category        text,
  description     text,
  current_version integer not null default 0,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- document_versions (cada subida = una versión inmutable)
-- -----------------------------------------------------------------------------
create table if not exists public.document_versions (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null references public.documents(id) on delete cascade,
  version_number integer not null,
  file_path      text not null,
  file_name      text not null,
  mime_type      text,
  size_bytes     bigint,
  uploaded_by    uuid references public.users(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  unique (document_id, version_number)
);

create index if not exists idx_doc_versions_doc on public.document_versions(document_id);

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: solo board ve/escribe.
-- -----------------------------------------------------------------------------
alter table public.documents         enable row level security;
alter table public.document_versions enable row level security;

drop policy if exists documents_board_all on public.documents;
create policy documents_board_all on public.documents
  for all to authenticated
  using (public.is_board_member())
  with check (public.is_board_member());

drop policy if exists document_versions_board_all on public.document_versions;
create policy document_versions_board_all on public.document_versions
  for all to authenticated
  using (public.is_board_member())
  with check (public.is_board_member());

-- -----------------------------------------------------------------------------
-- add_document_version(): calcula version_number de forma atómica, inserta la
-- versión y actualiza documents.current_version. SECURITY DEFINER con chequeo
-- de board adentro (evita carreras si dos personas suben a la vez).
-- El archivo ya fue subido a Storage por el cliente; acá solo se registra.
-- -----------------------------------------------------------------------------
create or replace function public.add_document_version(
  p_document_id uuid,
  p_file_path   text,
  p_file_name   text,
  p_mime_type   text,
  p_size_bytes  bigint,
  p_notes       text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if not public.is_board_member() then
    raise exception 'No autorizado';
  end if;

  select coalesce(max(version_number), 0) + 1
    into v_next
    from public.document_versions
    where document_id = p_document_id;

  insert into public.document_versions
    (document_id, version_number, file_path, file_name, mime_type, size_bytes, uploaded_by, notes)
  values
    (p_document_id, v_next, p_file_path, p_file_name, p_mime_type, p_size_bytes, auth.uid(), p_notes);

  update public.documents
    set current_version = v_next
    where id = p_document_id;

  return v_next;
end;
$$;

revoke all on function public.add_document_version(uuid, text, text, text, bigint, text) from public;
grant execute on function public.add_document_version(uuid, text, text, text, bigint, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Bucket privado de Storage + políticas (solo board lee/escribe).
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('comision-docs', 'comision-docs', false, 52428800) -- 50 MB
on conflict (id) do nothing;

drop policy if exists comision_docs_select on storage.objects;
create policy comision_docs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'comision-docs' and public.is_board_member());

drop policy if exists comision_docs_insert on storage.objects;
create policy comision_docs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comision-docs' and public.is_board_member());

drop policy if exists comision_docs_update on storage.objects;
create policy comision_docs_update on storage.objects
  for update to authenticated
  using (bucket_id = 'comision-docs' and public.is_board_member())
  with check (bucket_id = 'comision-docs' and public.is_board_member());

drop policy if exists comision_docs_delete on storage.objects;
create policy comision_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'comision-docs' and public.is_board_member());
