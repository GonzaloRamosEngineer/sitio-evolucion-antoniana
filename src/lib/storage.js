import { supabase } from '@/lib/customSupabaseClient';

/* =======================
 * PARTNERS
 * ======================= */

// Trae partners (incluye slug y colaboracion_detalle)
export const getPartners = async () => {
  const { data, error } = await supabase
    .from('partners')
    .select(
      'id, nombre, descripcion, colaboracion_detalle, logo_url, sitio_web, contacto_email, estado, slug, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching partners:', error);
    return [];
  }
  return data || [];
};

// Crear postulación pública de partner:
// NO encadenar .select() para evitar SELECT bloqueado por RLS (estado = 'pendiente')
export const addPartner = async (partner) => {
  const payload = {
    nombre: partner?.nombre,
    descripcion: partner?.descripcion,
    colaboracion_detalle: partner?.colaboracion_detalle || null,
    contacto_email: partner?.contacto_email,
    sitio_web: partner?.sitio_web || null,
    logo_url: partner?.logo_url || null,
    // NO es necesario enviar estado/slug (defaults/trigger en DB)
  };

  const { error, status } = await supabase
    .from('partners')
    .insert([payload], { returning: 'minimal' });

  if (error) {
    console.error('Error adding partner:', error);
    return null;
  }

  return { ok: true, status };
};

// Admin: actualizar (requiere policy/admin del lado DB)
export const updatePartner = async (id, updates) => {
  const { data, error } = await supabase
    .from('partners')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating partner:', error);
    return null;
  }
  return data ? data[0] : null;
};

// Admin: eliminar (requiere policy/admin del lado DB)
export const deletePartner = async (id) => {
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (error) {
    console.error('Error deleting partner:', error);
    return error;
  }
  return null;
};

// Obtener un partner por slug (útil para vistas de detalle)
export const getPartnerBySlug = async (slug) => {
  const { data, error } = await supabase
    .from('partners')
    .select(
      'id, nombre, descripcion, colaboracion_detalle, logo_url, sitio_web, contacto_email, estado, slug, created_at'
    )
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching partner by slug:', error);
    return null;
  }
  return data || null;
};

/* =======================
 * BENEFITS
 * ======================= */

export const getBenefits = async () => {
  const { data, error } = await supabase
    .from('benefits')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching benefits:', error);
    return [];
  }
  return data || [];
};

export const addBenefit = async (benefit) => {
  const { data, error } = await supabase.from('benefits').insert([benefit]).select();
  if (error) {
    console.error('Error adding benefit:', error);
    return null;
  }
  return data ? data[0] : null;
};

export const updateBenefit = async (id, updates) => {
  const { data, error } = await supabase
    .from('benefits')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) {
    console.error('Error updating benefit:', error);
    return null;
  }
  return data ? data[0] : null;
};

export const deleteBenefit = async (id) => {
  const { error } = await supabase.from('benefits').delete().eq('id', id);
  if (error) {
    console.error('Error deleting benefit:', error);
    return error;
  }
  return null;
};

/* =======================
 * NEWS
 * ======================= */

export const getNews = async () => {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching news:', error);
    return [];
  }
  return data || [];
};

export const getNewsById = async (id) => {
  const { data, error } = await supabase.from('news').select('*').eq('id', id).single();
  if (error) {
    console.error('Error fetching news by id:', error);
    return null;
  }
  return data || null;
};

export const addNews = async (newsItem) => {
  const { data, error } = await supabase.from('news').insert([newsItem]).select();
  if (error) {
    console.error('Error adding news:', error);
    return null;
  }
  return data ? data[0] : null;
};

export const updateNews = async (id, updates) => {
  const { data, error } = await supabase.from('news').update(updates).eq('id', id).select();
  if (error) {
    console.error('Error updating news:', error);
    return null;
  }
  return data ? data[0] : null;
};

export const deleteNews = async (id) => {
  const { error } = await supabase.from('news').delete().eq('id', id);
  if (error) {
    console.error('Error deleting news:', error);
    return error;
  }
  return null;
};
