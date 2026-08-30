// src/lib/storage.js
//
// Capa de datos de partners, beneficios y novedades.
// Contrato único: todas las funciones devuelven `{ data, error }` y no lanzan.
// Ver `src/lib/dataResult.js` para el detalle del contrato (ROADMAP 4.1).
import { supabase } from '@/lib/supabase';
import { listResult, rowResult, voidResult } from '@/lib/dataResult';

const PARTNER_FIELDS =
  'id, nombre, descripcion, colaboracion_detalle, logo_url, sitio_web, contacto_email, estado, slug, created_at, orden';

const BENEFIT_FIELDS = `
  id,
  titulo,
  descripcion,
  categoria,
  imagen_url,
  partner_id,
  fecha_inicio,
  fecha_fin,
  estado,
  created_at,
  slug,
  instrucciones,
  terminos,
  codigo,
  codigo_descuento,
  descuento,
  sitio_web,
  contacto_email,
  orden,
  requiere_acceso
`;

const NEWS_FIELDS = 'id, title, content, image_url, created_at, slug, body_md';

/* =======================
 * PARTNERS
 * ======================= */

// Trae partners (incluye slug, colaboracion_detalle y orden)
export const getPartners = async () =>
  listResult(
    await supabase
      .from('partners')
      .select(PARTNER_FIELDS)
      .order('orden', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    'getPartners'
  );

export const addPartner = async (partner) => {
  const payload = {
    nombre: partner?.nombre,
    descripcion: partner?.descripcion,
    colaboracion_detalle: partner?.colaboracion_detalle || null,
    contacto_email: partner?.contacto_email,
    sitio_web: partner?.sitio_web || null,
    logo_url: partner?.logo_url || null,
    orden: partner?.orden ?? 1000,
  };

  // Insert anónimo desde el formulario público: la RLS permite escribir pero no
  // leer la fila recién creada, así que no pedimos `.select()` de vuelta.
  // (El `{ returning: 'minimal' }` que había acá era herencia de supabase-js v1;
  //  en v2 el insert ya no devuelve filas salvo que se pida `.select()`.)
  return voidResult(await supabase.from('partners').insert([payload]), 'addPartner');
};

export const updatePartner = async (id, updates) =>
  rowResult(
    await supabase.from('partners').update(updates).eq('id', id).select().maybeSingle(),
    'updatePartner'
  );

export const deletePartner = async (id) =>
  voidResult(await supabase.from('partners').delete().eq('id', id), 'deletePartner');

export const getPartnerBySlug = async (slug) => {
  if (!slug) return { data: null, error: null };
  return rowResult(
    await supabase.from('partners').select(PARTNER_FIELDS).eq('slug', slug).maybeSingle(),
    'getPartnerBySlug'
  );
};

// Usado por detalle de beneficio
export const getPartnerById = async (id) => {
  if (!id) return { data: null, error: null };
  return rowResult(
    await supabase
      .from('partners')
      .select('id, nombre, logo_url, sitio_web, slug, estado, orden')
      .eq('id', id)
      .maybeSingle(),
    'getPartnerById'
  );
};

/* =======================
 * BENEFITS
 * ======================= */

export const getBenefits = async () =>
  listResult(
    await supabase
      .from('benefits')
      .select(BENEFIT_FIELDS)
      .order('orden', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    'getBenefits'
  );

export const addBenefit = async (benefit) =>
  rowResult(
    await supabase
      .from('benefits')
      .insert([{ ...benefit, orden: benefit?.orden ?? 1000 }])
      .select()
      .maybeSingle(),
    'addBenefit'
  );

export const updateBenefit = async (id, updates) =>
  rowResult(
    await supabase.from('benefits').update(updates).eq('id', id).select().maybeSingle(),
    'updateBenefit'
  );

export const deleteBenefit = async (id) =>
  voidResult(await supabase.from('benefits').delete().eq('id', id), 'deleteBenefit');

/* =======================
 * NEWS
 * ======================= */

export const getNews = async () =>
  listResult(
    await supabase
      .from('news')
      .select(NEWS_FIELDS)
      .order('created_at', { ascending: false }),
    'getNews'
  );

export const getNewsById = async (id) => {
  if (!id) return { data: null, error: null };
  return rowResult(
    await supabase.from('news').select(NEWS_FIELDS).eq('id', id).maybeSingle(),
    'getNewsById'
  );
};

export const getNewsBySlug = async (slug) => {
  if (!slug) return { data: null, error: null };
  return rowResult(
    await supabase.from('news').select(NEWS_FIELDS).eq('slug', slug).maybeSingle(),
    'getNewsBySlug'
  );
};

export const addNews = async (newsItem) =>
  rowResult(
    await supabase.from('news').insert([newsItem]).select().maybeSingle(),
    'addNews'
  );

export const updateNews = async (id, updates) =>
  rowResult(
    await supabase.from('news').update(updates).eq('id', id).select().maybeSingle(),
    'updateNews'
  );

export const deleteNews = async (id) =>
  voidResult(await supabase.from('news').delete().eq('id', id), 'deleteNews');
