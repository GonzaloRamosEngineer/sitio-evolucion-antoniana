// Este test existe por un hallazgo del 2026-09-05: el panel `/dashboard` pedía
// una textura a `https://grainy-gradients.vercel.app/noise.svg` —un dominio que
// no controlamos— en cada carga. Y esa URL devuelve **404**, así que la textura
// nunca se vio: era una petición a un tercero a cambio de nada.
//
// CÓMO APARECIÓ: no lo encontró ningún test ni ningún chequeo. Apareció en la
// consola del navegador del dueño del proyecto, en rojo, mientras probaba otra
// cosa. Un `404` de un asset **no rompe la página**: React renderiza igual, el
// build pasa, el lint pasa y los 364 tests pasan.
//
// POR QUÉ IMPORTA MÁS QUE UN 404. Era una pantalla **con sesión iniciada**
// pidiéndole un archivo a un dominio ajeno. Un asset de terceros no es gratis
// aunque sea decorativo: quien lo sirve ve la visita, y el día que devuelva algo
// distinto de un 404 lo estaríamos pintando adentro de nuestra página.
//
// LA DEFENSA: leer el código y rechazar cualquier asset con URL absoluta a otro
// dominio. Los assets propios van en `public/` y se sirven desde nuestro origen.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sinComentarios } from '@/lib/sin-comentarios.testutil';

const RAIZ = process.cwd();

/** Todos los archivos de código bajo `src/`, más el index. */
const archivos = () => {
  const salida = [];
  const caminar = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) caminar(p);
      else if (/\.(jsx?|css)$/.test(e.name) && !/\.test\.jsx?$/.test(e.name)) salida.push(p);
    }
  };
  caminar(path.join(RAIZ, 'src'));
  salida.push(path.join(RAIZ, 'index.html'));
  return salida;
};

/**
 * Un asset traído de otro dominio, escrito literal en el código.
 *
 * ⚠️ Deliberadamente NARROW, y esa es la parte difícil: `src/` está lleno de
 * URLs absolutas legítimas —`placeholder="https://ejemplo.com/foto.jpg"` en los
 * formularios del ABM, los links a redes de `entidad.js`, el `wa.me` del nav— y
 * un detector que las marque a todas es un detector que alguien va a apagar.
 *
 * Solo cuenta lo que el navegador **descarga solo**: un `url(...)` de CSS o de
 * clase Tailwind, y un `src`/`href` de recurso escrito a mano. Un `href` de
 * navegación no entra: mandar a alguien a Instagram es distinto de traerse un
 * archivo de Instagram.
 */
const PATRONES = [
  // Tailwind arbitrario: bg-[url('https://…')]
  /\[url\((['"]?)https?:\/\//i,
  // CSS: background: url(https://…)
  /\burl\((['"]?)https?:\/\/(?!fonts\.(googleapis|gstatic)\.com)/i,
  // <img src="https://…">, <script src="…"> literales
  /<(?:img|script|source|video|audio)\b[^>]*\bsrc=["']https?:\/\//i,
];

/*
  `<link>` se mira aparte y TAG POR TAG, no con un patrón suelto.

  ⚠️ La primera versión usaba `/<link\b[^>]*href=["']https?:/` y marcó **ocho
  páginas**: todas por su `<link rel="canonical" href="https://evolucion...">`,
  que es SEO y no un asset — el navegador no descarga nada. Un detector que
  marca de más es un detector que alguien apaga, así que solo cuentan los `rel`
  que efectivamente hacen bajar un archivo.
*/
const REL_QUE_DESCARGA = /rel=["'](stylesheet|preload|prefetch|icon|shortcut icon|apple-touch-icon|manifest)["']/i;

const linksQueDescargan = (src) =>
  (src.match(/<link\b[^>]*>/gi) ?? []).filter(
    (tag) =>
      REL_QUE_DESCARGA.test(tag) &&
      /\bhref=["']https?:\/\//i.test(tag) &&
      !/fonts\.(googleapis|gstatic)\.com/i.test(tag),
  );

/*
  Se limpia el archivo antes de mirarlo: el comentario que explica este mismo
  hallazgo CITA la línea borrada, y sin esto el test falla por su propia
  documentación. Pasó igual en `fuente-unica-socio.test.js`, y por eso el
  limpiador vive en un archivo compartido.
*/
const assetsExternos = (src) => {
  const codigo = sinComentarios(src);
  return [
    ...PATRONES.filter((re) => re.test(codigo)).map((re) => codigo.match(re)?.[0] ?? String(re)),
    ...linksQueDescargan(codigo),
  ];
};

describe('assets de terceros', () => {
  // ---- CONTROL POSITIVO DEL DETECTOR --------------------------------
  // Si los patrones están mal escritos no encuentran nada, y la aserción de
  // abajo pasa en verde sin proteger nada. Se les da de comer la línea EXACTA
  // que se borró, más las otras formas que tienen que atajar.
  it('el detector encuentra las formas que tiene que atajar', () => {
    const casos = [
      `<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04]"></div>`,
      `.hero { background: url(https://cdn.ajeno.com/x.png); }`,
      `<img src="https://cdn.ajeno.com/logo.png" alt="" />`,
      `<script src="https://cdn.ajeno.com/analytics.js"></script>`,
      `<link rel="stylesheet" href="https://cdn.ajeno.com/estilos.css">`,
    ];
    for (const c of casos) {
      expect(assetsExternos(c).length, `no detectó: ${c}`).toBeGreaterThan(0);
    }
  });

  // ---- CONTROL NEGATIVO: lo legítimo NO se marca --------------------
  // Un detector que marca de más es un detector que alguien apaga. Estas son
  // todas formas REALES que hoy están en el repo y tienen que pasar.
  it('no marca las URLs absolutas legítimas', () => {
    const legitimos = [
      `<Input placeholder="https://ejemplo.com/foto.jpg" />`,
      `<a href="https://instagram.com/evoluantoniana">Instagram</a>`,
      `redes: { x: 'https://x.com/evoluantoniana' }`,
      `const url = \`https://wa.me/\${tel}\`;`,
      `<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">`,
      `<img src={partner.logo_url} alt="" />`,
      `const API = 'https://lbtyxnbyetsvngsxczkt.supabase.co';`,
      // El que hizo fallar la primera versión del detector: SEO, no un asset.
      `<link rel="canonical" href="https://evolucionantoniana.com/nosotros" />`,
      // Y la documentación de un asset que YA se borró no es un asset.
      `/* Acá había bg-[url('https://grainy-gradients.vercel.app/noise.svg')] */`,
    ];
    for (const c of legitimos) {
      expect(assetsExternos(c), `marcó de más: ${c}`).toEqual([]);
    }
  });

  // ---- CONTROL POSITIVO DEL ANDAMIO --------------------------------
  it('encuentra archivos para revisar', () => {
    // Sin esto, un `readdirSync` que devuelva vacío haría pasar todo el test.
    const lista = archivos();
    expect(lista.length).toBeGreaterThan(50);
    expect(lista.some((f) => f.endsWith('index.html'))).toBe(true);
  });

  // ---- LO QUE SE PROTEGE -------------------------------------------
  it('ningún archivo trae un asset de otro dominio', () => {
    const hallazgos = [];
    for (const f of archivos()) {
      const encontrados = assetsExternos(fs.readFileSync(f, 'utf8'));
      if (encontrados.length) {
        hallazgos.push(`${path.relative(RAIZ, f)} -> ${encontrados.join(', ')}`);
      }
    }
    expect(
      hallazgos,
      'Assets traídos de un dominio ajeno. El navegador los descarga solo, así que ' +
      'quien los sirva ve cada visita —incluidas las de pantallas con sesión— y el día ' +
      'que devuelva otra cosa la estaríamos pintando adentro de nuestra página. Los ' +
      'assets propios van en public/ y se sirven desde nuestro origen; una textura, ' +
      'como data: URI en el CSS propio.',
    ).toEqual([]);
  });
});
