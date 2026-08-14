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

/**
 * Resiliencia del proxy a Render (ROADMAP 4.3).
 *
 * El free-tier de Render duerme tras un rato sin tráfico: el primer request
 * después de la inactividad paga un "cold-start" de decenas de segundos. Sin
 * timeout el fetch queda colgado indefinidamente; sin retry, un cold-start se
 * ve exactamente igual que una caída real y el usuario recibe un mensaje
 * genérico que no le dice qué hacer.
 *
 * Estrategia: primer intento corto (si duerme, cortamos rápido en vez de
 * quedarnos colgados), reintentos con ventana larga para darle tiempo a
 * despertar, y mensaje explícito de cold-start cuando el fallo es de red o del
 * servidor. Los 4xx NO se reintentan: son errores reales del negocio.
 * Peor caso ≈ 63s antes de rendirse.
 */
const FIRST_ATTEMPT_TIMEOUT_MS = 10000;
const RETRY_TIMEOUT_MS = 25000;
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [800, 2500];

export const COLD_START_MESSAGE =
  'El servicio de pagos está iniciándose y puede tardar hasta un minuto. ' +
  'Esperá unos segundos y volvé a intentar.';

/** Error de la capa de pagos, con la info que el llamador necesita para el mensaje. */
export class WebhookError extends Error {
  constructor(message, { cause, isColdStart = false, status = null } = {}) {
    super(message);
    this.name = 'WebhookError';
    this.isColdStart = isColdStart;
    this.status = status;
    if (cause) this.cause = cause;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** `AbortSignal.timeout` no está en todos los browsers objetivo → AbortController. */
async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Extrae el mensaje de error del body, o '' si no hay JSON válido / campo `error`. */
async function readErrorMessage(res) {
  try {
    const data = await res.json();
    if (!data?.error) return '';
    return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  } catch {
    return '';
  }
}

async function callWebhook(path, options = {}) {
  const url = buildUrl(path);
  const init = {
    method: options.method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  let transientError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await sleep(RETRY_BACKOFF_MS[attempt - 2] ?? RETRY_BACKOFF_MS.at(-1));
    }

    let res;
    try {
      res = await fetchWithTimeout(
        url,
        init,
        attempt === 1 ? FIRST_ATTEMPT_TIMEOUT_MS : RETRY_TIMEOUT_MS
      );
    } catch (err) {
      // Abort por timeout o fallo de red: reintentable y típico de cold-start.
      transientError = err;
      continue;
    }

    // 5xx (incluye el 502/504 que devuelve el proxy mientras Render levanta):
    // reintentable. Si el server manda un mensaje propio, lo conservamos.
    if (res.status >= 500) {
      const detail = await readErrorMessage(res);
      transientError = new WebhookError(detail || COLD_START_MESSAGE, {
        status: res.status,
        isColdStart: !detail
      });
      continue;
    }

    if (!res.ok) {
      const detail = await readErrorMessage(res);
      throw new WebhookError(detail || 'Error en la operación', { status: res.status });
    }

    try {
      return await res.json();
    } catch {
      return {}; // respuesta OK sin JSON válido
    }
  }

  throw transientError instanceof WebhookError
    ? transientError
    : new WebhookError(COLD_START_MESSAGE, { cause: transientError, isColdStart: true });
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
