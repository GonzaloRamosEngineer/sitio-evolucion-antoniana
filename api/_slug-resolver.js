export const resolvePublicSlug = async ({
  supabaseUrl,
  anonKey,
  resourceType,
  lookup,
}) => {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_public_slug`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_resource_type: resourceType, p_lookup: lookup }),
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // El fallback solo se habilita si Supabase confirma que falta el RPC.
    }
    if (response.status === 404 && payload?.code === 'PGRST202') {
      const tables = {
        activity: 'activities',
        news: 'news',
        partner: 'partners',
        benefit: 'club_beneficios',
      };
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          lookup,
        );
      const table = tables[resourceType];
      if (!table) return null;
      const field = isUuid ? 'id' : 'slug';
      const fallback = await fetch(
        `${supabaseUrl}/rest/v1/${table}?select=id,slug&${field}=eq.${encodeURIComponent(lookup)}&limit=1`,
        { headers },
      );
      if (!fallback.ok) {
        const error = new Error(`Slug fallback responded ${fallback.status}`);
        error.status = fallback.status;
        throw error;
      }
      const legacyRows = await fallback.json();
      const item = Array.isArray(legacyRows) ? legacyRows[0] ?? null : null;
      return item
        ? {
            resource_id: item.id,
            canonical_slug: item.slug,
            matched_by: isUuid ? 'id' : 'canonical',
          }
        : null;
    }
    const error = new Error(`Slug resolver responded ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
};
