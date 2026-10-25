import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePublicSlug } from './_slug-resolver.js';

const params = {
  supabaseUrl: 'https://supabase.example',
  anonKey: 'anon-test',
  resourceType: 'partner',
  lookup: 'alianza-anterior',
};

describe('resolver de slugs para previews', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('usa el RPC como camino normal', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => [
        { resource_id: 'p1', canonical_slug: 'alianza-actual', matched_by: 'alias' },
      ],
    })));

    await expect(resolvePublicSlug(params)).resolves.toMatchObject({
      resource_id: 'p1',
      canonical_slug: 'alianza-actual',
      matched_by: 'alias',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('usa lectura directa solo durante un rollout donde todavia falta el RPC', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ code: 'PGRST202' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 'p1', slug: 'alianza-anterior' }],
        }),
    );

    await expect(resolvePublicSlug(params)).resolves.toEqual({
      resource_id: 'p1',
      canonical_slug: 'alianza-anterior',
      matched_by: 'canonical',
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('no oculta otros errores del RPC', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ code: 'XX000' }),
    })));

    await expect(resolvePublicSlug(params)).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
