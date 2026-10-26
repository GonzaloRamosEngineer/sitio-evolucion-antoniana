import { describe, expect, it } from 'vitest';

import { entidad, tituloPagina } from '../../src/config/entidad.js';
import handler from './preinscripcion.js';

const pedir = async (method = 'GET') => {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = String(body);
      return this;
    },
    end(body) {
      if (body) this.body = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
      return this;
    },
  };

  await handler(
    {
      method,
      headers: {
        host: 'www.evolucionantoniana.com',
        'x-forwarded-proto': 'https',
      },
    },
    res,
  );

  return res;
};

describe('preview heredado de preinscripción', () => {
  it('usa la identidad configurada y apunta a la ruta canónica', async () => {
    const res = await pedir();
    const canonical = 'https://www.evolucionantoniana.com/educacion/preinscripcion';

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(`<title>${tituloPagina('Preinscripción — Educación Permanente (EPJA)')}</title>`);
    expect(res.body).toContain(`<meta property="og:site_name" content="${entidad.nombre}" />`);
    expect(res.body).toContain(`<meta property="og:url" content="${canonical}" />`);
    expect(res.body).toContain(`<link rel="canonical" href="${canonical}" />`);
    expect(res.body).not.toContain('/api/share/preinscripcion</');
  });

  it('mantiene HEAD sin cuerpo para los scrapers que lo consultan', async () => {
    const res = await pedir('HEAD');

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('');
  });
});
