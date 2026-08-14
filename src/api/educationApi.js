// src/api/educationApi.js
// Contrato único: devuelve `{ data, error }` y no lanza (ver `src/lib/dataResult.js`).
import { supabase } from '@/lib/supabase';
import { attempt, listResult, rowResult, voidResult } from '@/lib/dataResult';

/**
 * Registra una nueva preinscripción educativa. Funciona con usuario logueado y
 * anónimo: si hay sesión, vincula la fila al usuario.
 * @param {Object} formData - Los datos validados provenientes del EducationForm.
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createPreinscription = async (formData) => {
  // `getSession()` puede fallar (token corrupto en localStorage, por ejemplo) y
  // el contrato dice que esta función no lanza. Si falla, seguimos como anónimo:
  // la preinscripción vale igual, solo queda sin vincular al usuario.
  const { data: sessionResult } = await attempt(
    () => supabase.auth.getSession(),
    'createPreinscription/getSession'
  );
  const session = sessionResult?.data?.session ?? null;

  const payload = {
    // Datos obligatorios
    email: formData.email.trim().toLowerCase(),
    full_name: formData.full_name.trim().toUpperCase(),
    dni: formData.dni.replace(/\D/g, ''), // Limpiamos puntos o guiones del DNI
    age: parseInt(formData.age), // Aseguramos formato integer para la DB
    last_year_completed: formData.last_year_completed,
    phone: formData.phone.trim(),
    location: formData.location,
    level_to_start: formData.level_to_start,
    relationship_club: formData.relationship_club,
    preferred_modality: formData.preferred_modality,

    // Datos opcionales (si vienen vacíos, enviamos null)
    interest_area: formData.interest_area || null,
    preferred_schedule: formData.preferred_schedule || null,
    message: formData.message?.trim() || null,

    // Metadatos de sistema
    user_id: session?.user?.id || null, // Vinculación automática si existe sesión
    status: 'pending', // Estado inicial por defecto
    created_at: new Date().toISOString(),
  };

  return rowResult(
    await supabase.from('education_preinscriptions').insert([payload]).select().maybeSingle(),
    'createPreinscription'
  );
};

/** Obtiene todas las preinscripciones (solo para administradores). */
export const getPreinscriptions = async () =>
  listResult(
    await supabase
      .from('education_preinscriptions')
      .select('*')
      .order('created_at', { ascending: false }),
    'getPreinscriptions'
  );

/** Actualiza el estado de una preinscripción. */
export const updatePreinscriptionStatus = async (id, newStatus) =>
  voidResult(
    await supabase.from('education_preinscriptions').update({ status: newStatus }).eq('id', id),
    'updatePreinscriptionStatus'
  );
