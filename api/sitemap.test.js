import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './sitemap.js';

const makeResponse = () => {
  const response = {
    headers: {},
    statusCode: 200,
    body: '',
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    end(body = '') {
      this.body = body;
      return this;
    },
  };
  return response;
};

const rowsFor = (url) => {
  if (url.includes('/activities?')) return [{ id: 'a1', slug: 'actividad-ejemplo' }];
  if (url.includes('/news?')) return [{ id: 'n1', slug: 'novedad-ejemplo' }];
  if (url.includes('/partners?')) return [{ id: 'p1', slug: 'alianza-ejemplo' }];
  if (url.includes('/club_beneficios?')) return [{ id: 'b1', slug: 'beneficio-ejemplo' }];
  return [];
};

describe('sitemap.xml dinámico', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('incluye páginas estáticas y slugs publicados con URLs canónicas', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://supabase.example');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-test');
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => rowsFor(String(url)),
    })));

    const res = makeResponse();
    await handler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/xml; charset=utf-8');
    expect(res.body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(res.body).toContain('<loc>https://www.evolucionantoniana.com/</loc>');
    expect(res.body).toContain(
      '<loc>https://www.evolucionantoniana.com/actividades/actividad-ejemplo</loc>',
    );
    expect(res.body).toContain(
      '<loc>https://www.evolucionantoniana.com/novedades/novedad-ejemplo</loc>',
    );
    expect(res.body).toContain(
      '<loc>https://www.evolucionantoniana.com/alianzas/alianza-ejemplo</loc>',
    );
    expect(res.body).toContain(
      '<loc>https://www.evolucionantoniana.com/beneficios/beneficio-ejemplo</loc>',
    );
    expect(res.body).not.toContain('/login');
    expect(res.body).not.toContain('/ingresar');
    expect(res.body).not.toContain('/dashboard');
    expect(res.body).not.toContain('/mi/cuenta');
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('HEAD conserva headers sin enviar el XML', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://supabase.example');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-test');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    })));

    const res = makeResponse();
    await handler({ method: 'HEAD' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/xml; charset=utf-8');
    expect(res.body).toBe('');
  });

  it('no publica un sitemap parcial si falla una consulta', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://supabase.example');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-test');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => [],
    })));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = makeResponse();
    await handler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(502);
    expect(res.body).toBe('No se pudo generar sitemap.xml');
  });
});
