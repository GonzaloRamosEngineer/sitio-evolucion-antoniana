import { supabase } from '@/lib/supabase';
import { rowResult } from '@/lib/dataResult';

export const PUBLIC_RESOURCE_TYPES = Object.freeze({
  ACTIVIDAD: 'activity',
  NOVEDAD: 'news',
  ALIANZA: 'partner',
  BENEFICIO: 'benefit',
});

const RESOURCE_TABLES = Object.freeze({
  [PUBLIC_RESOURCE_TYPES.ACTIVIDAD]: 'activities',
  [PUBLIC_RESOURCE_TYPES.NOVEDAD]: 'news',
  [PUBLIC_RESOURCE_TYPES.ALIANZA]: 'partners',
  [PUBLIC_RESOURCE_TYPES.BENEFICIO]: 'club_beneficios',
});

const isUuid = (value = '') =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isMissingResolver = (error) =>
  error?.code === 'PGRST202' || /resolve_public_slug/i.test(error?.message || '');

/**
 * Resuelve UUID, slug canonico o alias historico en la base. El RPC es
 * SECURITY INVOKER: la respuesta conserva las RLS del recurso consultado.
 */
export const resolvePublicSlug = async (resourceType, lookup) => {
  if (!resourceType || !lookup) return { data: null, error: null };
  const rawRpcResult = await supabase
    .rpc('resolve_public_slug', {
      p_resource_type: resourceType,
      p_lookup: String(lookup),
    })
    .maybeSingle();
  const rpcResult = rawRpcResult.error
    ? { data: null, error: rawRpcResult.error }
    : rowResult(rawRpcResult, `resolvePublicSlug:${resourceType}`);

  if (!rpcResult.error || !isMissingResolver(rpcResult.error)) return rpcResult;

  // Compatibilidad de rollout: permite desplegar el frontend antes de crear
  // el RPC. Desaparece del camino normal apenas la migracion queda aplicada.
  const table = RESOURCE_TABLES[resourceType];
  if (!table) return rpcResult;
  const field = isUuid(lookup) ? 'id' : 'slug';
  const legacyResult = rowResult(
    await supabase.from(table).select('id,slug').eq(field, String(lookup)).maybeSingle(),
    `resolvePublicSlugFallback:${resourceType}`,
  );
  if (legacyResult.error || !legacyResult.data) return legacyResult;
  return {
    data: {
      resource_id: legacyResult.data.id,
      canonical_slug: legacyResult.data.slug,
      matched_by: field === 'id' ? 'id' : 'canonical',
    },
    error: null,
  };
};
