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

  it('control NEGATIVO: una ruta inventada se detecta como inexistente', () => {
    // Hacer fallar la verificación una vez antes de creerle (§11.6.3): si esto
    // no detectara `/colaborar`, el test de arriba no estaría midiendo nada.
    const rutas = rutasReales();
    expect(rutas.has('/colaborar')).toBe(false);
    expect(rutas.has('/ruta-que-no-existe')).toBe(false);
  });
});
