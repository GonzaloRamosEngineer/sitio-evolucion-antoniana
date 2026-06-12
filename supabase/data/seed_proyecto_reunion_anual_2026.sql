-- =============================================================================
-- CARGA DE DATOS (no es migración de esquema) — Comisión Directiva
-- =============================================================================
-- Crea dos proyectos reales con sus tareas:
--   1) Reunión Anual Especial 2026 / Regularización Documental FEVA (bloques A-E, G)
--   2) Regularización Documental FEVA — Ejercicio 2025 (modelado como 2022-2024)
--
-- REQUISITOS: correr ANTES las migraciones de Fase 2 y 2b (projects, tasks y los
-- campos status_label / assignee_text / priority).
--
-- IDEMPOTENTE: si un proyecto con ese nombre ya existe, NO se vuelve a insertar.
-- created_by se resuelve por email del gestor; si no se encuentra, queda NULL.
-- Ajustá el email si tu cuenta admin usa otro.
-- =============================================================================

do $$
declare
  v_creator uuid;
  v_proj    uuid;
begin
  select id into v_creator
  from public.users
  where email = 'g.ramos@evolucionantoniana.com'
  limit 1;

  -- ===========================================================================
  -- PROYECTO 1 — Reunión Anual Especial 2026
  -- ===========================================================================
  if not exists (
    select 1 from public.projects
    where name = 'Reunión Anual Especial 2026 / Regularización Documental FEVA'
  ) then
    insert into public.projects (name, description, status, start_date, created_by)
    values (
      'Reunión Anual Especial 2026 / Regularización Documental FEVA',
      'Preparar, formalizar, digitalizar y presentar online ante IGPJ Salta la documentación anual obligatoria (ejercicios 2022, 2023 y 2024) y el Plan Trienal de Acción 2026-2028, sus bases presupuestarias y el informe de aseguramiento. Acta N° 021 - Reunión Anual Especial. Sede: Las Heras 2680, Salta. CUIT 30-71758392-9, PJ N° 2199.',
      'activo',
      '2026-06-12',
      v_creator
    )
    returning id into v_proj;

    insert into public.tasks
      (project_id, title, description, status, status_label, assignee_text, priority, created_by)
    values
      -- Bloque A — Acta y formalización
      (v_proj, 'A01 · Redactar Acta N° 021 - Reunión Anual Especial', 'Texto validado: quórum, orden del día, aprobación documental, autoridades, Plan Trienal y autorización digital.', 'hecho', 'Listo', 'Gonzalo / Consejo', 'alta', v_creator),
      (v_proj, 'A02 · Verificar período Plan Trienal 2026-2028 en el acta', 'Evitar cualquier mención residual a 2025-2027. Dep: A01.', 'hecho', 'Listo', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'A03 · Incorporar constancia de quórum', 'Totalidad del Consejo presente. Dep: A01.', 'hecho', 'Listo', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'A04 · Autorización a Gonzalo para trámite online', 'Autorizado a cargar, seguir y subsanar el trámite digital. Dep: A01.', 'hecho', 'Listo', 'Gonzalo / Consejo', 'alta', v_creator),
      (v_proj, 'A05 · Pasar acta a libro / formato definitivo', 'Debe quedar con libro, tomo y folio. Dep: A01.', 'en_progreso', 'Pendiente formal', 'Presidente / Secretario', 'alta', v_creator),
      (v_proj, 'A06 · Firmar acta por todo el Consejo', 'Firmantes: Damián, Cinthia, Pablo, Carlos Díaz, Daniel Tognini, Martín Palavecino, Luis Paz. Dep: A05.', 'en_progreso', 'Pendiente formal', 'Consejo completo', 'alta', v_creator),
      (v_proj, 'A07 · Firma de fundadores comparecientes', 'Recomendado, no sustituye al Consejo. Dep: A05.', 'en_progreso', 'Pendiente formal', 'Juan Carlos / Gonzalo', 'media', v_creator),
      (v_proj, 'A08 · Digitalizar acta firmada completa', 'PDF legible, todas las firmas visibles. Dep: A06.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'A09 · Declaración de fidelidad de copia (libro/tomo/folio)', 'Requisito oficial sobre copias de acta. Dep: A05.', 'en_progreso', 'Pendiente formal', 'Presidente / Secretario', 'alta', v_creator),
      (v_proj, 'A10 · Certificación de firma o mecanismo del portal', 'Ver si el trámite online lo reemplaza o si igual pide certificación. Dep: A09.', 'en_progreso', 'Pendiente formal', 'Presidente / Secretario / Escribano / IGPJ', 'media', v_creator),
      (v_proj, 'A11 · Formulario de presentación firmado por Presidente', 'Requisito oficial. Primer documento del expediente.', 'pendiente', 'Pendiente', 'Presidente', 'alta', v_creator),
      (v_proj, 'A12 · Pago de tasas / estampillas', 'Estampilla por fojas + tasa retributiva (según portal IGPJ).', 'pendiente', 'Pendiente', 'Gonzalo / Presidente', 'alta', v_creator),

      -- Bloque B — Ejercicio 2022
      (v_proj, 'B01 · Memoria ejercicio 2022', 'Debe firmarse por Presidente y Secretario.', 'en_progreso', 'Listo para firma', 'Presidente / Secretario', 'alta', v_creator),
      (v_proj, 'B02 · Inventario ejercicio 2022', 'Declara inexistencia de bienes físicos propios si corresponde. Firma Presidente y Secretario.', 'en_progreso', 'Listo para firma', 'Presidente / Secretario', 'alta', v_creator),
      (v_proj, 'B03 · Estado Contable ejercicio 2022', 'Firmado por Contador Público y certificado por CPCE (según confirmación).', 'hecho', 'Listo', 'Contador / CPCE', 'alta', v_creator),
      (v_proj, 'B04 · Escanear Memoria 2022 firmada', 'PDF final para carga online. Dep: B01.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'B05 · Escanear Inventario 2022 firmado', 'PDF final para carga online. Dep: B02.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'B06 · Verificar PDF final Estado Contable 2022', 'Controlar certificación CPCE completa. Dep: B03.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),

      -- Bloque C — Ejercicio 2023
      (v_proj, 'C01 · Memoria ejercicio 2023', 'Debe firmarse por Presidente y Secretario.', 'en_progreso', 'Listo para firma', 'Presidente / Secretario', 'alta', v_creator),
      (v_proj, 'C02 · Inventario ejercicio 2023', 'Debe firmarse por Presidente y Secretario.', 'en_progreso', 'Listo para firma', 'Presidente / Secretario', 'alta', v_creator),
      (v_proj, 'C03 · Estado Contable ejercicio 2023', 'Firmado por Contador Público y certificado por CPCE (según confirmación).', 'hecho', 'Listo', 'Contador / CPCE', 'alta', v_creator),
      (v_proj, 'C04 · Escanear Memoria 2023 firmada', 'PDF final para carga online. Dep: C01.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'C05 · Escanear Inventario 2023 firmado', 'PDF final para carga online. Dep: C02.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'C06 · Verificar PDF final Estado Contable 2023', 'Controlar certificación CPCE completa. Dep: C03.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),

      -- Bloque D — Ejercicio 2024
      (v_proj, 'D01 · Memoria ejercicio 2024', 'Debe firmarse por Presidente y Secretario.', 'en_progreso', 'Listo para firma', 'Presidente / Secretario', 'alta', v_creator),
      (v_proj, 'D02 · Inventario ejercicio 2024', 'Debe firmarse por Presidente y Secretario.', 'en_progreso', 'Listo para firma', 'Presidente / Secretario', 'alta', v_creator),
      (v_proj, 'D03 · Estado Contable ejercicio 2024', 'Central para cerrar la regularización 2022-2024. Certificado por CPCE.', 'hecho', 'Listo', 'Contador / CPCE', 'alta', v_creator),
      (v_proj, 'D04 · Escanear Memoria 2024 firmada', 'PDF final para carga online. Dep: D01.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'D05 · Escanear Inventario 2024 firmado', 'PDF final para carga online. Dep: D02.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'D06 · Verificar PDF final Estado Contable 2024', 'Controlar certificación CPCE completa. Dep: D03.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),

      -- Bloque E — Plan Trienal 2026-2028
      (v_proj, 'E01 · Plan Trienal de Acción 2026-2028', 'Firmado por miembros del Consejo (según confirmación). Dep: acta punto 3.', 'hecho', 'Listo', 'Consejo de Administración', 'alta', v_creator),
      (v_proj, 'E02 · Bases presupuestarias 2026-2028', 'Firmadas y certificadas por contador. Dep: E01.', 'hecho', 'Listo', 'Contador Público', 'alta', v_creator),
      (v_proj, 'E03 · Informe de aseguramiento de cumplimiento', 'Emitido y legalizado. Dep: E01 + E02.', 'hecho', 'Listo', 'Contador Público', 'alta', v_creator),
      (v_proj, 'E04 · Legalización CPCE / actuación profesional', 'Incorporar PDF de legalización al expediente. Dep: E02 / E03.', 'hecho', 'Listo', 'CPCE / Contador', 'alta', v_creator),
      (v_proj, 'E05 · Escanear / ordenar PDF final Plan Trienal', 'Legible y con firmas. Dep: E01.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'E06 · Verificar consistencia 2026-2028 en todos los documentos', 'Control final antes de subir. Dep: E01-E04.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),

      -- Bloque G — Carpeta digital y carga online
      (v_proj, 'G01 · Crear carpeta digital del proyecto', 'Ordenar todos los PDFs por número.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'G02 · Nombrar archivos con estándar único', 'Evita observaciones y confusiones. Dep: documentos firmados.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'G03 · Convertir documentos firmados a PDF', 'Escaneo legible (color o escala de grises clara). Dep: firmas.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'G04 · Revisar que cada PDF esté completo', 'Sin páginas cortadas, firmas visibles, certificaciones completas. Dep: G03.', 'en_progreso', 'Pendiente formal', 'Gonzalo', 'media', v_creator),
      (v_proj, 'G05 · Completar trámite online en portal IGPJ', 'Gonzalo autorizado en acta. Dep: A11 + A12 + PDFs.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G06 · Subir formulario firmado', 'Primer documento del expediente. Dep: A11.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G07 · Subir acta firmada', 'Documento principal. Dep: A08.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G08 · Subir memorias 2022-2024', 'Una por año. Dep: B04 + C04 + D04.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G09 · Subir inventarios 2022-2024', 'Uno por año. Dep: B05 + C05 + D05.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G10 · Subir estados contables 2022-2024', 'Con certificación CPCE. Dep: B06 + C06 + D06.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G11 · Subir Plan Trienal 2026-2028', 'Firmado por Consejo. Dep: E05.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G12 · Subir bases presupuestarias', 'Firmadas/certificadas por contador. Dep: E02.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G13 · Subir informe de aseguramiento', 'Firmado/legalizado. Dep: E03.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G14 · Subir legalización CPCE', 'Actuación profesional / legalización digital. Dep: E04.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G15 · Subir comprobantes de tasas', 'Según portal. Dep: A12.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G16 · Enviar trámite', 'Solo cuando esté todo cargado y revisado. Dep: G05-G15.', 'pendiente', 'Pendiente', 'Gonzalo', 'alta', v_creator),
      (v_proj, 'G17 · Guardar constancia de presentación', 'Descargar comprobante / número de expediente. Dep: G16.', 'pendiente', 'Pendiente', 'Gonzalo', 'media', v_creator),
      (v_proj, 'G18 · Seguimiento del expediente', 'Revisar observaciones. Dep: G17.', 'pendiente', 'Pendiente', 'Gonzalo', 'baja', v_creator),
      (v_proj, 'G19 · Responder observaciones / subsanar', 'Solo si IGPJ observa algo. Dep: G18.', 'pendiente', 'Pendiente eventual', 'Gonzalo + Presidente/Secretario/Contador', 'baja', v_creator);
  end if;

  -- ===========================================================================
  -- PROYECTO 2 — Ejercicio 2025 (modelado como 2022-2024)
  -- ===========================================================================
  if not exists (
    select 1 from public.projects
    where name = 'Regularización Documental FEVA — Ejercicio 2025'
  ) then
    insert into public.projects (name, description, status, created_by)
    values (
      'Regularización Documental FEVA — Ejercicio 2025',
      'Documentación anual del ejercicio 2025 (Memoria, Inventario y Estado Contable), modelada como los ejercicios 2022-2024. Se trata una vez confeccionada, certificada y disponible la documentación correspondiente.',
      'activo',
      v_creator
    )
    returning id into v_proj;

    insert into public.tasks
      (project_id, title, description, status, status_label, assignee_text, priority, created_by)
    values
      (v_proj, '01 · Memoria ejercicio 2025', 'Debe firmarse por Presidente y Secretario. Requiere balance 2025.', 'pendiente', 'Pendiente', 'Presidente / Secretario', 'alta', v_creator),
      (v_proj, '02 · Inventario ejercicio 2025', 'Debe firmarse por Presidente y Secretario. Requiere balance 2025.', 'pendiente', 'Pendiente', 'Presidente / Secretario', 'alta', v_creator),
      (v_proj, '03 · Estado Contable ejercicio 2025', 'Firmado por Contador Público y certificado por CPCE. Requiere cierre/certificación 2025.', 'pendiente', 'Pendiente', 'Contador / CPCE', 'alta', v_creator),
      (v_proj, '04 · Escanear Memoria 2025 firmada', 'PDF final para carga online. Dep: 01.', 'pendiente', 'Pendiente', 'Gonzalo', 'media', v_creator),
      (v_proj, '05 · Escanear Inventario 2025 firmado', 'PDF final para carga online. Dep: 02.', 'pendiente', 'Pendiente', 'Gonzalo', 'media', v_creator),
      (v_proj, '06 · Verificar PDF final Estado Contable 2025', 'Controlar certificación CPCE completa. Dep: 03.', 'pendiente', 'Pendiente', 'Gonzalo', 'media', v_creator);
  end if;

end $$;
