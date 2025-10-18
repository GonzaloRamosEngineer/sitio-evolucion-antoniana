// src/api/membershipApi.js
import { supabase } from '@/lib/supabase';

/* ============================
   Lectura directa desde Supabase
   ============================ */
export const getUserMemberships = async (userId, { onlyActive = false } = {}) => {
  if (!userId) return [];
  try {
    let query = supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (onlyActive) query = query.eq('status', 'active');

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching user memberships from API:', err);
    return [];
  }
};

export const getUserMembership = async (userId) => {
  if (!userId) return null;
  try {
    const data = await getUserMemberships(userId);
    if (!data || data.length === 0) return null;
    return data[0];
  } catch (err) {
    console.error('Error fetching user membership from API:', err);
    return null;
  }
};

/* ==========================================
   Acciones contra el microservicio en Render
   ========================================== */

/**
 * WEBHOOK_BASE opcional:
 * - Si existe VITE_WEBHOOK_BASE_URL => usa base absoluta (ej: https://mp-supabase-webhook.onrender.com)
 * - Si NO existe => usa ruta relativa y Vercel reescribe /api/* hacia Render (ver vercel.json)
 */
const WEBHOOK_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WEBHOOK_BASE_URL
    ? String(import.meta.env.VITE_WEBHOOK_BASE_URL).replace(/\/$/, '')
    : '') || '';

/** Une base + path garantizando un solo "/" y que siempre empiece con "/" */
function buildUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${WEBHOOK_BASE}${p}`.replace(/([^:]\/)\/+/g, '$1');
}

async function callWebhook(path, options = {}) {
  const url = buildUrl(path);

  const res = await fetch(url, {
    method: options.method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const msg = data?.error ? JSON.stringify(data.error) : 'Error en la operación';
    throw new Error(msg);
  }
  return data;
}

/* ============================
   CRUD de suscripciones Render
   ============================ */
export const pauseMembership = (preapprovalId) =>
  callWebhook(`/api/suscripciones/${preapprovalId}/pausar`);

export const resumeMembership = (preapprovalId) =>
  callWebhook(`/api/suscripciones/${preapprovalId}/activar`);

export const cancelMembership = (preapprovalId) =>
  callWebhook(`/api/suscripciones/${preapprovalId}/cancelar`);

/**
 * Crear suscripción recurrente (Render)
 */
export const createSubscription = async ({ userId, emailUsuario, amount = 50, currency = 'ARS' }) => {
  return callWebhook(`/api/crear-suscripcion`, {
    method: 'POST',
    body: {
      reason: 'Beca mensual Fundación Evolución Antoniana',
      payer_email: emailUsuario,
      user_id: userId,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(amount),
        currency_id: currency
      }
    }
  });
};

/**
 * Crear donación única (Render)
 */
export const createOneTimeDonation = async ({ userId, emailUsuario, amount }) => {
  return callWebhook(`/api/crear-preferencia`, {
    method: 'POST',
    body: {
      amount: Number(amount),
      description: 'Donación única a la Fundación Evolución Antoniana',
      user_id: userId,
      payer: {
        name: 'Invitado',
        surname: '',
        email: emailUsuario
      }
    }
  });
};
