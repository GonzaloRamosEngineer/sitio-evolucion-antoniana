// api/share/pagina.test.js
// -----------------------------------------------------------------------------
// EL BARRIDO, HECHO PERMANENTE.
//
// Revisar a mano una vez que todas las rutas compartibles tienen preview sirve
// para hoy; la ruta número 26 que alguien agregue el mes que viene vuelve a
// romperlo en silencio, y el síntoma —una tarjeta genérica en WhatsApp— no lo
// ve nadie hasta que un tercero comparte el link.
//
// Este test cruza las TRES fuentes que tienen que coincidir:
//
//   src/App.jsx    qué rutas existen de verdad
//   PAGINAS        qué título y descripción tiene cada página estática
//   vercel.json    qué rutas el bot de la red social recibe con OG propio
//
// Si aparece una ruta pública y nadie la declara, falla acá. Si se declara una
// página sin su rewrite, también: sin el rewrite la fila de PAGINAS no la lee
// nadie, que es la forma silenciosa de que esto se rompa.
//
// Correr con `npm test` (vitest.config.js incluye `api/**`). No necesita red ni
// Supabase: solo lee archivos y compara.
// -----------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { PAGINAS, resolverRuta } from './pagina.js';

const RAIZ = path.resolve(__dirname, '../..');
const APP_JSX = fs.readFileSync(path.join(RAIZ, 'src/App.jsx'), 'utf8');
const VERCEL = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
const INDEX_HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

/**
 * Rutas que NO deben tener preview propia, y por qué. Esta lista es la mitad
 * importante del test: sin ella, "toda ruta necesita OG" mandaría a declarar
 * una tarjeta para /dashboard, y compartir un link privado no debería contar de
 * qué se trata la pantalla que hay detrás.
 */
const RUTAS_SIN_PREVIEW = {
  '/': 'el OG institucional ya está en index.html, estático y correcto',
  '/login': 'auth',
  '/register': 'auth',
  '/request-password-reset': 'auth',
  '/update-password': 'auth, se llega con un token en la URL',
  '/agradecimiento': 'final del flujo de aporte, ya declarada noindex',
  '/confirm-attendance': 'link personal con token de asistencia',
  '/dashboard': 'detrás de sesión',
  '/carnet': 'detrás de sesión',
  '/comercio': 'detrás de sesión (panel del comercio)',
  '/comision': 'detrás de sesión (comisión directiva)',
  '/admin/education': 'detrás de sesión (admin)',
  '/admin/activities/new': 'detrás de sesión (admin)',
  '/admin/activities/edit/:id': 'detrás de sesión (admin)',
  '/admin/*': 'detrás de sesión (admin)',
  '*': 'catch-all 404',
};

/**
 * Rutas de detalle: el OG sale de la base, no de PAGINAS. Cada una tiene que
 * llegar a la función de su recurso.
 */
const RUTAS_DE_DETALLE = {
  '/novedades/:slug': '/api/share/news/slug',
  '/beneficios/:slug': '/api/share/benefits/slug',
  '/partners/:slug': '/api/share/partners',
  '/activities/:id': '/api/share/activities/slug',
  // Compatibilidad: las funciones detectan UUID y filtran por id.
  '/novedades/id/:id': '/api/share/news/slug',
  '/novedades/uuid/:id': '/api/share/news/slug',
  '/beneficios/id/:id': '/api/share/benefits/slug',
};

/** Todas las rutas declaradas en App.jsx, tal cual están escritas. */
const rutasDeApp = [...APP_JSX.matchAll(/<Route\s[^>]*?path="([^"]+)"/gs)].map(
  (m) => m[1]
);

/** Los rewrites que solo disparan para un bot de preview (los que tienen `has`). */
const rewritesDeBot = VERCEL.rewrites.filter((r) => Array.isArray(r.has));

const rewriteDe = (source) => rewritesDeBot.find((r) => r.source === source);

describe('barrido de rutas: App.jsx ↔ PAGINAS ↔ vercel.json', () => {
  it('encuentra las rutas de App.jsx (si esto falla, cambió la forma de declararlas)', () => {
    // Guarda del propio parser: un `<Route>` escrito distinto haría que el test
    // "pase" revisando una lista vacía, que es peor que fallar.
    expect(rutasDeApp.length).toBeGreaterThanOrEqual(30);
    expect(rutasDeApp).toContain('/rendicion');
    expect(rutasDeApp).toContain('/club/postular');
  });

  it('toda ruta de App.jsx está clasificada: página estática, detalle, o excluida con motivo', () => {
    const sinClasificar = rutasDeApp.filter(
      (ruta) =>
        !(ruta in PAGINAS) &&
        !(ruta in RUTAS_DE_DETALLE) &&
        !(ruta in RUTAS_SIN_PREVIEW)
    );
    expect(
      sinClasificar,
      'Ruta nueva sin decidir su preview. Agregala a PAGINAS en api/share/pagina.js ' +
        '(con su rewrite en vercel.json) o a RUTAS_SIN_PREVIEW con el motivo.'
    ).toEqual([]);
  });

  it('PAGINAS no declara páginas que no existen como ruta', () => {
    const fantasmas = Object.keys(PAGINAS).filter((r) => !rutasDeApp.includes(r));
    expect(fantasmas, 'Filas de PAGINAS sin ruta en App.jsx').toEqual([]);
  });

  it('cada página estática tiene su rewrite por User-Agent apuntando a pagina.js', () => {
    for (const ruta of Object.keys(PAGINAS)) {
      const rw = rewriteDe(ruta);
      expect(rw, `Falta el rewrite de bot para ${ruta} en vercel.json`).toBeDefined();
      expect(rw.destination).toBe(
        `/api/share/pagina?p=${ruta.replace(/^\//, '')}`
      );
    }
  });

  it('cada ruta de detalle tiene su rewrite apuntando a la función de su recurso', () => {
    for (const [ruta, fn] of Object.entries(RUTAS_DE_DETALLE)) {
      const rw = rewriteDe(ruta);
      expect(rw, `Falta el rewrite de bot para ${ruta}`).toBeDefined();
      expect(rw.destination.startsWith(fn)).toBe(true);
    }
  });

  it('las rutas privadas no tienen rewrite de preview', () => {
    for (const ruta of Object.keys(RUTAS_SIN_PREVIEW)) {
      expect(
        rewriteDe(ruta),
        `${ruta} está en RUTAS_SIN_PREVIEW pero tiene un rewrite de bot`
      ).toBeUndefined();
    }
  });

  it('no hay rewrites de bot huérfanos', () => {
    const declaradas = new Set([
      ...Object.keys(PAGINAS),
      ...Object.keys(RUTAS_DE_DETALLE),
    ]);
    const huerfanos = rewritesDeBot
      .map((r) => r.source)
      .filter((s) => !declaradas.has(s));
    expect(huerfanos, 'Rewrites de bot que no corresponden a ninguna ruta declarada').toEqual([]);
  });
});

describe('la lista de bots', () => {
  it('es idéntica en todos los rewrites', () => {
    const listas = new Set(rewritesDeBot.map((r) => JSON.stringify(r.has)));
    expect(
      listas.size,
      'Hay más de una lista de User-Agents: una ruta va a tener preview y otra no'
    ).toBe(1);
  });

  it('incluye a WhatsApp y a los scrapers de las redes que se usan', () => {
    const ua = rewritesDeBot[0].has[0].value;
    for (const bot of [
      'WhatsApp',
      'facebookexternalhit',
      'Twitterbot',
      'LinkedInBot',
      'TelegramBot',
    ]) {
      expect(ua).toContain(bot);
    }
  });

  it('NO incluye buscadores', () => {
    // El stub del bot lleva `canonical` y —en las funciones de detalle—
    // `noindex`. Mandar ahí a Googlebot le servía una página no indexable en
    // lugar de la SPA: sacaba del índice a novedades y beneficios. Los
    // buscadores renderizan JavaScript y leen los <Helmet>.
    const ua = rewritesDeBot[0].has[0].value;
    expect(ua).not.toContain('Googlebot');
    expect(ua).not.toContain('bingbot');
  });
});

describe('el HTML que ve el bot', () => {
  const pedir = async (query, { host = 'www.evolucionantoniana.com' } = {}) => {
    const { default: handler } = await import('./pagina.js');
    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      setHeader(k, v) {
        this.headers[k.toLowerCase()] = v;
      },
      status(c) {
        this.statusCode = c;
        return this;
      },
      send(b) {
        this.body = String(b);
        return this;
      },
      end(b) {
        if (b) this.body = Buffer.isBuffer(b) ? b.toString('utf8') : String(b);
        return this;
      },
    };
    await handler({ method: 'GET', headers: { host }, query }, res);
    return res;
  };

  it('devuelve el título y la descripción de la página pedida, no la institucional', async () => {
    const res = await pedir({ p: 'rendicion' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(
      '<meta property="og:title" content="Rendición de cuentas | Evolución Antoniana" />'
    );
    expect(res.body).toContain('lo recaudado, lo gastado');
    // Lo que se rompía antes: la tarjeta genérica del index.
    expect(res.body).not.toContain('Educación, Deporte y Tecnología');
  });

  it('apunta el og:url y el canonical a la URL humana, nunca a /api/share/', async () => {
    const res = await pedir({ p: 'club/postular' });
    const esperada = 'https://www.evolucionantoniana.com/club/postular';
    expect(res.body).toContain(`<meta property="og:url" content="${esperada}" />`);
    expect(res.body).toContain(`<link rel="canonical" href="${esperada}" />`);
    expect(res.body).not.toContain('/api/share/');
  });

  it('cada página declarada devuelve un OG completo y distinto del de las otras', async () => {
    const titulos = new Set();
    for (const ruta of Object.keys(PAGINAS)) {
      const res = await pedir({ p: ruta.replace(/^\//, '') });
      expect(res.statusCode, ruta).toBe(200);
      for (const meta of [
        'og:title',
        'og:description',
        'og:url',
        'og:image',
        'og:site_name',
      ]) {
        expect(res.body, `${ruta} sin ${meta}`).toContain(`property="${meta}"`);
      }
      expect(res.body, `${ruta} sin twitter:card`).toContain('twitter:card');
      const titulo = res.body.match(/og:title" content="([^"]+)"/)[1];
      expect(titulos.has(titulo), `Título repetido: ${titulo}`).toBe(false);
      titulos.add(titulo);
    }
    expect(titulos.size).toBe(Object.keys(PAGINAS).length);
  });

  it('la imagen OG es absoluta y el archivo existe en el repo', async () => {
    const res = await pedir({ p: 'beneficios' });
    const img = res.body.match(/og:image" content="([^"]+)"/)[1];
    expect(img.startsWith('https://')).toBe(true);
    const relativa = img.replace('https://www.evolucionantoniana.com', '');
    expect(
      fs.existsSync(path.join(RAIZ, 'public', relativa)),
      `og:image apunta a ${relativa}, que no está en public/`
    ).toBe(true);
  });

  it('la tarjeta de cada sección existe, mide 1200x630 y no se repite', async () => {
    // Un og:image que da 404 le muestra a WhatsApp una tarjeta SIN foto, y una
    // que no mide 1200x630 sale recortada: los dos fallos son invisibles hasta
    // que alguien comparte el link.
    const vistas = new Map();
    for (const ruta of Object.keys(PAGINAS)) {
      const res = await pedir({ p: ruta.replace(/^\//, '') });
      const img = res.body.match(/og:image" content="([^"]+)"/)[1];
      const relativa = img.replace(/^https?:\/\/[^/]+/, '');
      const archivo = path.join(RAIZ, 'public', relativa);

      expect(fs.existsSync(archivo), `${ruta}: falta ${relativa}`).toBe(true);

      // Ancho y alto reales: bytes 16-23 de la cabecera PNG, big-endian.
      const b = fs.readFileSync(archivo);
      expect(b.subarray(1, 4).toString(), `${relativa} no es un PNG`).toBe('PNG');
      expect(
        [b.readUInt32BE(16), b.readUInt32BE(20)],
        `${relativa} no mide 1200x630`
      ).toEqual([1200, 630]);

      // La institucional se comparte entre las utilitarias; las tarjetas
      // propias no: dos secciones con la misma imagen es una que quedó sin
      // regenerar.
      if (relativa.startsWith('/img/og/')) {
        expect(
          vistas.get(relativa),
          `${relativa} está declarada en ${ruta} y en ${vistas.get(relativa)}`
        ).toBeUndefined();
        vistas.set(relativa, ruta);
      }
    }
    expect(vistas.size, 'Se esperaban tarjetas propias en varias secciones').toBeGreaterThanOrEqual(11);
  });

  it('ningún PNG de public/img/og/ quedó huérfano', () => {
    // El caso al revés: se renombró una ruta, se regeneró la tarjeta y la vieja
    // quedó versionada sin que nadie la use.
    const dir = path.join(RAIZ, 'public/img/og');
    const enDisco = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
    const declaradas = new Set(
      Object.values(PAGINAS)
        .map((p) => p.imagen)
        .filter(Boolean)
        .map((i) => path.basename(i))
    );
    const huerfanos = enDisco.filter((f) => !declaradas.has(f));
    expect(huerfanos, 'PNG en public/img/og/ que ninguna fila de PAGINAS usa').toEqual([]);
  });

  it('no cachea, y declara que la respuesta varía por User-Agent', async () => {
    const res = await pedir({ p: 'club' });
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers.vary).toBe('User-Agent');
    expect(res.headers['content-type']).toContain('text/html');
  });

  it('escapa el contenido en los atributos de las metas', async () => {
    const res = await pedir({ p: 'contact' });
    // La descripción de /contact trae un mail; ninguna meta debe quedar con un
    // `"` crudo que corte el atributo.
    const metas = res.body.match(/<meta[^>]*>/g);
    for (const m of metas) {
      expect(m.split('content="')[1]?.split('"')[0] ?? '').not.toContain('<');
    }
  });

  it('404 si el ?p= no corresponde a una página declarada', async () => {
    for (const p of ['dashboard', 'no-existe', '', '../etc/passwd']) {
      const res = await pedir({ p });
      expect(res.statusCode, `?p=${p} debería ser 404`).toBe(404);
    }
  });

  it('resolverRuta tolera la barra inicial y la final', () => {
    expect(resolverRuta('rendicion')).toBe('/rendicion');
    expect(resolverRuta('/rendicion')).toBe('/rendicion');
    expect(resolverRuta('/rendicion/')).toBe('/rendicion');
    expect(resolverRuta('club/postular')).toBe('/club/postular');
    expect(resolverRuta('constructor')).toBe(null);
    expect(resolverRuta(undefined)).toBe(null);
  });

  it('responde HEAD sin cuerpo (los scrapers preflightean)', async () => {
    const { default: handler } = await import('./pagina.js');
    const res = {
      statusCode: 0,
      headers: {},
      body: '',
      setHeader(k, v) {
        this.headers[k.toLowerCase()] = v;
      },
      status(c) {
        this.statusCode = c;
        return this;
      },
      send() {
        return this;
      },
      end(b) {
        if (b) this.body = String(b);
        return this;
      },
    };
    await handler(
      { method: 'HEAD', headers: { host: 'x.test' }, query: { p: 'club' } },
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('');
  });
});

describe('index.html sigue siendo el fallback institucional', () => {
  it('trae OG completo para la home y para toda ruta sin preview propia', () => {
    for (const meta of ['og:title', 'og:description', 'og:image', 'og:url']) {
      expect(INDEX_HTML).toContain(`property="${meta}"`);
    }
    expect(INDEX_HTML).toContain('twitter:card');
  });
});
