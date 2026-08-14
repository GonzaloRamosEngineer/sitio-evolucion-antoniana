// src/hooks/useContentQueries.js
//
// Hooks de lectura del contenido institucional (ROADMAP 4.2).
// Cada uno envuelve la función correspondiente de la capa de datos con
// `unwrap`, porque TanStack necesita que el queryFn lance (ver `queryClient.js`).
//
// Los filtros van acá y no en cada página: antes cada consumidor repetía el
// mismo `.filter(estado === 'aprobado')`, con el riesgo de que se desincronizaran.
import { useQuery } from '@tanstack/react-query';
import { getNews, getPartners, getBenefits } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { listResult } from '@/lib/dataResult';
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

export const useNews = ({ select, ...options } = {}) =>
  useQuery({
    queryKey: queryKeys.news,
    queryFn: () => unwrap(getNews()),
    select,
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
