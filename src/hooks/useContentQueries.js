// src/hooks/useContentQueries.js
//
// Hooks de lectura del contenido institucional (ROADMAP 4.2).
// Cada uno envuelve la función correspondiente de la capa de datos con
// `unwrap`, porque TanStack necesita que el queryFn lance (ver `queryClient.js`).
//
// Los filtros van acá y no en cada página: antes cada consumidor repetía el
// mismo `.filter(estado === 'aprobado')`, con el riesgo de que se desincronizaran.
import { useQuery } from '@tanstack/react-query';
import { getNews, getNewsById, getNewsBySlug, getPartners, getBenefits } from '@/lib/storage';
import { getPreinscriptions } from '@/api/educationApi';
import { getUserRegistrations } from '@/api/activitiesApi';
import { getUserMemberships } from '@/api/membershipApi';
import { supabase } from '@/lib/supabase';
import { listResult, rowResult } from '@/lib/dataResult';
import { unwrap, queryKeys } from '@/lib/queryClient';

/**
 * Compone el `select` propio del hook con el que pase el caller.
 *
 * Sin esto, como las opciones del caller se esparcen al final, un `select`
 * de quien consume **reemplazaría** el filtro del hook en silencio (por ejemplo
 * la Home pidiendo `.slice(0, 10)` se quedaría con partners sin aprobar).
 * Acá el filtro del hook siempre corre primero y el del caller compone encima.
 */
const composeSelect = (builtIn, callerSelect) =>
  callerSelect ? (raw) => callerSelect(builtIn(raw)) : builtIn;

/** Las rutas de detalle aceptan UUID (links viejos) o slug. */
const isUuid = (value = '') =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const useNews = ({ select, ...options } = {}) =>
  useQuery({
    queryKey: queryKeys.news,
    queryFn: () => unwrap(getNews()),
    select,
    ...options,
  });

/**
 * Una novedad por slug o por UUID. Query propia (no un `select` sobre el
 * listado) porque el detalle se puede abrir directo desde un link compartido,
 * sin haber pasado por /novedades.
 */
export const useNewsItem = (routeParam, options = {}) =>
  useQuery({
    queryKey: queryKeys.newsItem(routeParam),
    queryFn: () => unwrap(isUuid(routeParam) ? getNewsById(routeParam) : getNewsBySlug(routeParam)),
    enabled: Boolean(routeParam),
    ...options,
  });

/** Partners aprobados, que es lo único que muestran las páginas públicas. */
export const useApprovedPartners = ({ select, ...options } = {}) =>
  useQuery({
    queryKey: queryKeys.partners,
    queryFn: () => unwrap(getPartners()),
    // El `select` filtra sobre el dato cacheado sin volver a pedirlo, así que la
    // vista pública y el panel admin comparten una sola entrada de caché.
    select: composeSelect((rows) => rows.filter((p) => p.estado === 'aprobado'), select),
    ...options,
  });

/** Todos los partners (panel admin). Misma queryKey, sin filtrar. */
export const useAllPartners = ({ select, ...options } = {}) =>
  useQuery({
    queryKey: queryKeys.partners,
    queryFn: () => unwrap(getPartners()),
    select,
    ...options,
  });

export const useActiveBenefits = ({ select, ...options } = {}) =>
  useQuery({
    queryKey: queryKeys.benefits,
    queryFn: () => unwrap(getBenefits()),
    select: composeSelect((rows) => rows.filter((b) => b.estado === 'activo'), select),
    ...options,
  });

export const useAllBenefits = ({ select, ...options } = {}) =>
  useQuery({
    queryKey: queryKeys.benefits,
    queryFn: () => unwrap(getBenefits()),
    select,
    ...options,
  });

/**
 * Actividades. Usa `select('*')` a propósito y no columnas explícitas: así no se
 * rompe si la columna `slug` todavía no existe en la base (ver la nota de la
 * migración de slugs en ROADMAP §8).
 */
const fetchActivities = async () =>
  listResult(
    await supabase.from('activities').select('*').order('date', { ascending: true }),
    'getActivities'
  );

export const useActivitiesQuery = ({ select, ...options } = {}) =>
  useQuery({
    queryKey: queryKeys.activities,
    queryFn: () => unwrap(fetchActivities()),
    select,
    ...options,
  });

/* ============================
   Datos de panel (no públicos)
   ============================ */

/** Preinscripciones educativas (panel de educación). */
export const usePreinscriptions = ({ select, ...options } = {}) =>
  useQuery({
    queryKey: queryKeys.preinscriptions,
    queryFn: () => unwrap(getPreinscriptions()),
    select,
    ...options,
  });

/**
 * Inscripciones y membresías del usuario logueado (Dashboard).
 * `enabled` evita que la query corra con `userId` undefined mientras auth
 * todavía está resolviendo: sin eso se dispararía una consulta inútil y quedaría
 * cacheada bajo una clave con `undefined`.
 */
export const useUserRegistrations = (userId, options = {}) =>
  useQuery({
    queryKey: queryKeys.userRegistrations(userId),
    queryFn: () => unwrap(getUserRegistrations(userId)),
    enabled: Boolean(userId),
    ...options,
  });

export const useUserMemberships = (userId, options = {}) =>
  useQuery({
    queryKey: queryKeys.userMemberships(userId),
    queryFn: () => unwrap(getUserMemberships(userId, { onlyActive: false })),
    enabled: Boolean(userId),
    ...options,
  });

const fetchUserDonations = async (userId) =>
  listResult(
    await supabase
      .from('donations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    'getUserDonations'
  );

export const useUserDonations = (userId, options = {}) =>
  useQuery({
    queryKey: queryKeys.userDonations(userId),
    queryFn: () => unwrap(fetchUserDonations(userId)),
    enabled: Boolean(userId),
    ...options,
  });

/** Métricas institucionales (una sola fila). */
const fetchFoundationMetrics = async () =>
  rowResult(
    await supabase.from('fundacion_metrics').select('*').maybeSingle(),
    'getFoundationMetrics'
  );

export const useFoundationMetrics = (options = {}) =>
  useQuery({
    queryKey: queryKeys.foundationMetrics,
    queryFn: () => unwrap(fetchFoundationMetrics()),
    ...options,
  });
