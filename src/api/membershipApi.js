// src/api/membershipApi.js
// Contrato único: devuelve `{ data, error }` y no lanza (ver `src/lib/dataResult.js`).
import { supabase } from '@/lib/supabase';
import { listResult, attempt } from '@/lib/dataResult';
import { entidad } from '@/config/entidad';

/* ============================
   Lectura directa desde Supabase
   ============================ */
export const getUserMemberships = async (userId, { onlyActive = false } = {}) => {
  if (!userId) return { data: [], error: null };

  let query = supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (onlyActive) query = query.eq('status', 'active');

  return listResult(await query, 'getUserMemberships');
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
  constructor(message, { cause, isColdStart = false, status = null, payload = null } = {}) {
    super(message);
    this.name = 'WebhookError';
    this.isColdStart = isColdStart;
    this.status = status;
    /*
      El cuerpo del error TAL COMO LLEGÓ, sin aplastar.

      El servicio de pagos reenvía la respuesta entera de MercadoPago
      (`res.status(400).json({ error: data })`), así que acá abajo el `error`
      suele ser un OBJETO y no un string. Antes se resolvía con
      `JSON.stringify` y ese string terminaba, tal cual, dentro del cartel rojo
      que veía la persona (§10.24).

      Se conserva estructurado para que `src/lib/erroresPago.js` pueda buscar
      la firma del problema —`guest_site_mismatch` y compañía— en cualquier
      parte del objeto. La forma del error de MercadoPago no es un contrato
      nuestro, así que leerlo por rutas fijas se rompería en silencio.
    */
    this.payload = payload;
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

/**
 * El error del body, en las dos formas que hacen falta:
 *   - `mensaje`: texto plano, para el log y para `Error.message`.
 *   - `payload`: la estructura sin tocar, para que se le pueda reconocer la
 *     firma más adelante.
 *
 * Devuelve los dos vacíos si el body no es JSON o no trae `error`.
 */
async function readError(res) {
  try {
    const data = await res.json();
    if (!data?.error) return { mensaje: '', payload: null };
    if (typeof data.error === 'string') return { mensaje: data.error, payload: data };
    // ⚠️ El `JSON.stringify` sigue acá a propósito, pero ahora SOLO alimenta
    // `Error.message` (útil en un log). Lo que se le muestra a una persona sale
    // de `erroresPago.js` leyendo `payload`, nunca de este string.
    return { mensaje: JSON.stringify(data.error), payload: data.error };
  } catch {
    return { mensaje: '', payload: null };
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
      const { mensaje, payload } = await readError(res);
      transientError = new WebhookError(mensaje || COLD_START_MESSAGE, {
        status: res.status,
        isColdStart: !mensaje,
        payload
      });
      continue;
    }

    if (!res.ok) {
      const { mensaje, payload } = await readError(res);
      throw new WebhookError(mensaje || 'Error en la operación', {
        status: res.status,
        payload
      });
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
// `callWebhook` es la primitiva de bajo nivel y sí lanza (necesita distinguir
// reintentable de definitivo dentro del loop). Las funciones exportadas lo
// envuelven con `attempt` para cumplir el contrato de la capa: el `WebhookError`
// llega entero al consumidor, con su flag `isColdStart`.
export const pauseMembership = (preapprovalId) =>
  attempt(
    () => callWebhook(`/api/suscripciones/${preapprovalId}/pausar`),
    'pauseMembership'
  );

export const resumeMembership = (preapprovalId) =>
  attempt(
    () => callWebhook(`/api/suscripciones/${preapprovalId}/activar`),
    'resumeMembership'
  );

export const cancelMembership = (preapprovalId) =>
  attempt(
    () => callWebhook(`/api/suscripciones/${preapprovalId}/cancelar`),
    'cancelMembership'
  );

/* ============================
   El destino del aporte
   ============================ */
/**
 * Campo que lleva el destino elegido hasta el microservicio (ROADMAP §10.7).
 *
 * ⚠️ ACÁ NO SE MANDA `external_reference`, Y ES DELIBERADO — corrige lo que se
 * hizo el 2026-08-16 por la mañana.
 *
 * El microservicio ya arma el suyo con un esquema propio, verificable en los
 * datos de producción: `anon:suscripcion` y `user:<uuid>:suscripcion`. Ese
 * string es cómo el webhook vuelve a identificar al usuario cuando MercadoPago
 * le avisa del cobro. Si el front manda un `external_reference` propio y el
 * microservicio lo prioriza sobre el suyo, **se pierde la identificación del
 * usuario en cada suscripción**: la plata entra y no se sabe de quién es.
 *
 * Hoy no hay suscripciones reales, así que el daño fue cero — pero el
 * `external_reference` correcto lo tiene que seguir armando quien conoce ese
 * esquema, que es el microservicio. Lo que se manda desde acá es el dato crudo,
 * y él decide cómo codificarlo (lo natural sería extender su propio esquema:
 * `user:<uuid>:suscripcion:destino:<uuid>`).
 *
 * Sin destino se devuelve `{}` y el body queda IDÉNTICO al de siempre: una
 * función nueva no puede cambiar el payload del cobro que ya funciona.
 */
const camposDestino = (destinoId) => (destinoId ? { destino_id: destinoId } : {});

/** Título que ve el aportante en el checkout de MercadoPago. */
const tituloAporte = (destinoNombre, porDefecto) =>
  `${destinoNombre || porDefecto} — ${entidad.nombre}`;

/**
 * Crear suscripción recurrente (Render)
 */
export const createSubscription = ({
  userId,
  emailUsuario,
  amount = 50,
  currency = 'ARS',
  destinoId = null,
  destinoNombre = null
}) =>
  attempt(
    () =>
      callWebhook(`/api/crear-suscripcion`, {
        method: 'POST',
        body: {
          reason: tituloAporte(destinoNombre, 'Aporte mensual'),
          payer_email: emailUsuario,
          user_id: userId,
          ...camposDestino(destinoId),
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: Number(amount),
            currency_id: currency
          }
        }
      }),
    'createSubscription'
  );

/**
 * Crear donación única (Render)
 */
export const createOneTimeDonation = ({
  userId,
  emailUsuario,
  amount,
  destinoId = null,
  destinoNombre = null
}) =>
  attempt(
    () =>
      callWebhook(`/api/crear-preferencia`, {
        method: 'POST',
        body: {
          amount: Number(amount),
          description: tituloAporte(destinoNombre, 'Donación'),
          user_id: userId,
          ...camposDestino(destinoId),
          payer: {
            name: 'Invitado',
            surname: '',
            email: emailUsuario
          }
        }
      }),
    'createOneTimeDonation'
  );
