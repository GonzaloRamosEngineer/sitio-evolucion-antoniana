// Este test existe por un bug propio del 2026-09-02: `accionVidriera` mandaba a
// `/colaborar` y esa ruta NO EXISTE — la real es `/collaborate`, en inglés.
//
// POR QUÉ NO LO ATAJÓ NADA. El link no falla: React Router cae en el catch-all y
// renderiza el 404, que mide 25.865 bytes y tiene `<nav>` y `<footer>`. Ni el
// build, ni el lint, ni los 282 tests, ni mirar el tamaño de la respuesta lo
// delatan. Es exactamente la trampa que ROADMAP §11.4 documentó cuando un check
// de navegador apuntó a la misma ruta inexistente — y se repitió igual, porque
// hasta hoy la única defensa era acordarse.
//
// LA DEFENSA REAL es esta: leer las rutas de `App.jsx` y cruzarlas contra cada
// `href` que las reglas de presentación pueden emitir. Si alguien agrega un CTA
// a una ruta que no existe, o renombra una ruta y deja el CTA viejo, este test
// falla antes del deploy.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { accionVidriera } from '@/lib/club';

const RAIZ = process.cwd();

/** Las rutas declaradas en App.jsx, que son la única fuente de verdad. */
const rutasReales = () => {
  const app = fs.readFileSync(path.join(RAIZ, 'src', 'App.jsx'), 'utf8');
  const rutas = new Set();
  for (const m of app.matchAll(/path=["']([^"']+)["']/g)) rutas.add(m[1]);
  return rutas;
};

/** Todos los hrefs que `accionVidriera` puede devolver, en todos sus estados. */
const hrefsPosibles = () => {
  const hrefs = new Set();
  for (const requiere of [true, false])
    for (const acceso of [
      { tiene_acceso: true, en_gracia: false },
      { tiene_acceso: true, en_gracia: true },
      { tiene_acceso: false, en_gracia: false },
      null,
    ])
      for (const haySesion of [true, false]) {
        const a = accionVidriera({
          beneficio: { requiere_acceso: requiere },
          acceso,
          haySesion,
        });
        // `href: null` significa "no navega, dispara el canje" — no es una ruta.
        if (a?.cta?.href) hrefs.add(a.cta.href);
      }
  return hrefs;
};

describe('los CTA de la vidriera apuntan a rutas que existen', () => {
  it('App.jsx se puede leer y declara rutas (si esto falla, el test de abajo miente)', () => {
    // Control POSITIVO. Sin esto, un `App.jsx` movido de lugar haría que
    // `rutasReales()` devuelva un Set vacío y el test de abajo pasaría por
    // vacuidad — el modo de falla de §11.4 metido en el propio test.
    const rutas = rutasReales();
    expect(rutas.size).toBeGreaterThan(10);
    expect(rutas.has('/collaborate')).toBe(true);
  });

  it('cada href que emite accionVidriera es una ruta declarada', () => {
    const rutas = rutasReales();
    const hrefs = [...hrefsPosibles()];
    expect(hrefs.length).toBeGreaterThan(0); // que haya algo que verificar
    const inexistentes = hrefs.filter((h) => !rutas.has(h));
    expect(inexistentes).toEqual([]);
  });

  // ---------------------------------------------------------------------
  // §12.10.14 / §12.10.20 — los enlaces del club, cruzados contra App.jsx.
  //
  // Los dos hallazgos que motivan esto no los encontró ningún test: los
  // encontró NAVEGAR el sitio. `/club` existió como página huérfana —cero
  // enlaces en todo `src/`— y el perfil de un aliado mandaba al beneficio sin
  // que el beneficio volviera. Un enlace que falta no rompe nada, no tira
  // ningún error, y «una página que funciona y no está enlazada se verifica
  // igual que una que anda».
  //
  // Este bloque no puede detectar un enlace FALTANTE —para eso hay que mirar la
  // pantalla—, pero sí que el destino exista, que es la mitad automatizable.
  // ---------------------------------------------------------------------
  it('las rutas del club que se enlazan entre sí existen todas', () => {
    const rutas = rutasReales();
    const delClub = ['/club', '/club/postular', '/beneficios', '/comercio', '/carnet'];
    const inexistentes = delClub.filter((r) => !rutas.has(r));
    expect(inexistentes).toEqual([]);
  });

  it('cada `to="/..."` de las pantallas del club apunta a una ruta declarada', () => {
    // Se leen los `to=` reales de los archivos, no una lista escrita a mano: un
    // valor escrito a mano no puede detectar que el valor está mal — que es
    // exactamente cómo el test de `/colaborar` pasaba en verde estando de
    // acuerdo con el bug.
    const rutas = rutasReales();
    const archivos = [
      'src/pages/club/ClubPage.jsx',
      'src/pages/club/PostularComercioPage.jsx',
      'src/pages/CarnetPage.jsx',
      'src/pages/BenefitsPage.jsx',
    ];

    const encontrados = [];
    for (const rel of archivos) {
      const txt = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
      for (const m of txt.matchAll(/\sto=["'](\/[^"'{]*)["']/g)) {
        encontrados.push({ rel, href: m[1] });
      }
    }

    // Control POSITIVO: si los archivos se renombraran, esto sería 0 y el
    // filtro de abajo pasaría por vacuidad.
    expect(encontrados.length).toBeGreaterThan(3);

    const rotos = encontrados.filter(({ href }) => {
      // Las rutas con parámetro (`/beneficios/algo`) matchean por su padre
      // declarado con `:slug`; acá solo se cruzan las estáticas.
      const base = `/${href.split('/')[1] ?? ''}`;
      return !rutas.has(href) && !rutas.has(`${base}/:slug`) && !rutas.has(base);
    });
    expect(rotos).toEqual([]);
  });

  it('control NEGATIVO: una ruta inventada se detecta como inexistente', () => {
    // Hacer fallar la verificación una vez antes de creerle (§11.6.3): si esto
    // no detectara `/colaborar`, el test de arriba no estaría midiendo nada.
    const rutas = rutasReales();
    expect(rutas.has('/colaborar')).toBe(false);
    expect(rutas.has('/ruta-que-no-existe')).toBe(false);
  });
});
