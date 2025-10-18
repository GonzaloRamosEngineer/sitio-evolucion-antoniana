import { supabase } from '@/lib/supabase';

export const getUserMemberships = async (userId, { onlyActive = false } = {}) => {
  if (!userId) return [];
  try {
    let query = supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (onlyActive) {
      query = query.eq('status', 'active');
    }

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

/* NUEVO: acciones contra el microservicio en Render */
const WEBHOOK_BASE = import.meta.env.VITE_WEBHOOK_BASE_URL; 
// ejemplo .env: VITE_WEBHOOK_BASE_URL=https://mp-supabase-webhook.onrender.com

async function callWebhook(path) {
  const res = await fetch(`${WEBHOOK_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error ? JSON.stringify(data.error) : 'Error en la operación');
  return data;
}

export const pauseMembership = (preapprovalId) =>
  callWebhook(`/api/suscripciones/${preapprovalId}/pausar`);

export const resumeMembership = (preapprovalId) =>
  callWebhook(`/api/suscripciones/${preapprovalId}/activar`);

export const cancelMembership = (preapprovalId) =>
  callWebhook(`/api/suscripciones/${preapprovalId}/cancelar`);
