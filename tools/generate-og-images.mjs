// tools/generate-og-images.mjs
// -----------------------------------------------------------------------------
// Genera una imagen OG propia (1200x630) por sección del sitio, en
// `public/img/og/`. Las consume la tabla `PAGINAS` de `api/share/pagina.js`.
//
// POR QUÉ. `public/img/og-image-1200x630.png` es el logo centrado sobre blanco,
// sin una palabra: sirve como tarjeta institucional de la home, pero usarla en
// las quince secciones hacía que /rendicion, /beneficios y /club se vieran
// idénticas en WhatsApp. Quien recibe el link no ve la URL, ve la tarjeta: si la
// tarjeta no dice qué es, el link no dice qué es.
//
// CÓMO. Se maqueta cada tarjeta en HTML con el lenguaje visual del hero del
// sitio (azul de marca, filete dorado arriba, Poppins/Inter) y se captura con
// Chrome headless. No hace falta `sharp`: `--screenshot` con
// `--window-size=1200,630` sale ya en la medida exacta, sin reescalar.
//
// EL FONDO ES PLANO Y NO EL DEGRADADO `hero-glow` DEL SITIO, y es una decisión
// de peso, no de gusto: PNG no comprime un degradado suave de 756.000 píxeles.
// Con el degradado cada tarjeta pesaba 354 KB; plana pesa 137 KB, y puestas una
// al lado de la otra no se distinguen —el `hero-glow` va de #1e4d8a a #163A68,
// que a esta escala es casi el mismo azul—. Once tarjetas: 1,5 MB en vez de
// 3,9 MB versionados.
//
//   node tools/generate-og-images.mjs            regenera todas
//   node tools/generate-og-images.mjs rendicion  solo esa
//   node tools/generate-og-images.mjs --keep-html deja el HTML para mirarlo
//
// Es IDEMPOTENTE: se puede re-correr y da lo mismo. Los PNG se versionan (los
// pide un scraper, no un visitante: no van por el bundle).
//
// ⚠️ LAS TIPOGRAFÍAS SE EMBEBEN. Chrome headless no siempre alcanza a bajar
// Google Fonts antes del screenshot, y el fallo es silencioso: la tarjeta sale
// con la sans del sistema y parece bien hasta que se compara. Se descargan los
// woff2 una vez, se cachean en el temp del sistema y se inyectan como data URI,
// así el render no depende de la red ni del timing.
// -----------------------------------------------------------------------------
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(ROOT, 'public/img/og');
const TMP = path.join(os.tmpdir(), 'og-evolucion');
const CACHE_FUENTES = path.join(TMP, 'fuentes');

const { PAGINAS } = await import(
  'file:///' + path.join(ROOT, 'api/share/pagina.js').replaceAll('\\', '/')
);

// Paleta de marca, de tailwind.config.js. Si cambia allá, cambia acá: son
// literales a propósito, este script no compila Tailwind.
const COLOR = {
  primary: '#163A68', // brand.primary — el fondo
  gold: '#C98E2A', // brand.gold — filete, kicker y halo
  white: '#FFFFFF',
  // brand.dark (#0F294A) aparece como rgba en la sombra de la pastilla del logo.
};

/**
 * Las secciones que llevan tarjeta propia, y la bajada corta que va EN la
 * imagen.
 *
 * El título grande NO se repite acá: sale de `PAGINAS[ruta].titulo`, así que la
 * tarjeta y el `og:title` no pueden divergir. La `bajada` sí es propia: la
 * descripción de `PAGINAS` está escrita para el texto de la preview (hasta 180
 * caracteres) y a 34px en una tarjeta no entra ni se lee.
 *
 * Las que faltan —/contact, /privacy, /terms, /legal-documents— se quedan con la
 * tarjeta institucional a propósito: son utilitarias y legales, no las que se
 * comparten para invitar a alguien. Agregar una es agregar una fila acá y
 * `imagen:` en su fila de PAGINAS.
 */
const TARJETAS = {
  '/rendicion': { bajada: 'Cada peso que entra, cada peso que sale, con su respaldo.' },
  '/beneficios': { bajada: 'Descuentos reales en comercios de Salta para quienes sostienen la Fundación.' },
  '/club': { bajada: 'Tu aporte, convertido en beneficios que se usan todos los días.' },
  '/novedades': { bajada: 'Lo que está pasando en la Fundación, contado por nosotros.' },
  '/activities': { bajada: 'Talleres, torneos y encuentros abiertos a la comunidad.' },
  '/collaborate': { bajada: 'Como voluntario, aliado o donante: hay una forma para cada uno.' },
  '/about': { bajada: 'Quiénes somos, de dónde venimos y para qué estamos.' },
  '/preinscripcion': { bajada: 'Terminá el secundario en el Centro Juventud Antoniana.' },
  '/partners': { bajada: 'Las marcas que eligen sostener el proyecto.' },
  '/postular-partner': { bajada: 'Sumá tu marca a la red y llegá a nuestra comunidad.' },
  '/club/postular': { bajada: 'Ofrecé un beneficio y llegá a clientes nuevos.' },
};

// --- Tipografías --------------------------------------------------------------

// Los mismos pesos que carga index.html. Se pide el CSS a Google Fonts con un
// User-Agent de Chrome (con otro devuelve formatos viejos) y se embebe cada
// woff2 que ese CSS referencie: así no hay URLs de gstatic escritas a mano, que
// caducan y rompen el script sin aviso.
const CSS_FUENTES =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Poppins:wght@700;800&display=block';
const UA_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function fuentesEmbebidas() {
  fs.mkdirSync(CACHE_FUENTES, { recursive: true });
  const cacheCss = path.join(CACHE_FUENTES, 'embebido.css');
  if (fs.existsSync(cacheCss)) return fs.readFileSync(cacheCss, 'utf8');

  const r = await fetch(CSS_FUENTES, { headers: { 'User-Agent': UA_CHROME } });
  if (!r.ok) throw new Error(`Google Fonts devolvió HTTP ${r.status}`);
  let css = await r.text();

  const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
  if (!urls.length) throw new Error('El CSS de Google Fonts no trajo ningún woff2');

  for (const url of urls) {
    const local = path.join(CACHE_FUENTES, path.basename(new URL(url).pathname));
    if (!fs.existsSync(local)) {
      const f = await fetch(url, { headers: { 'User-Agent': UA_CHROME } });
      if (!f.ok) throw new Error(`No se pudo bajar ${url}: HTTP ${f.status}`);
      fs.writeFileSync(local, Buffer.from(await f.arrayBuffer()));
    }
    const b64 = fs.readFileSync(local).toString('base64');
    css = css.replaceAll(url, `data:font/woff2;base64,${b64}`);
  }

  console.log(`  ${urls.length} archivo(s) de fuente embebido(s)`);
  fs.writeFileSync(cacheCss, css, 'utf8');
  return css;
}

// --- Maquetado ----------------------------------------------------------------

const escapar = (s = '') =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

/** El logo va embebido: un `file://` relativo también funcionaría, pero
 *  embeberlo hace que el HTML volcado con `--keep-html` se abra desde cualquier
 *  parte y se vea igual. */
const logoDataUri = () => {
  const b64 = fs
    .readFileSync(path.join(ROOT, 'public/img/transparente.png'))
    .toString('base64');
  return `data:image/png;base64,${b64}`;
};

/** El título largo se parte para que no queden líneas huérfanas de una palabra. */
function tamanoTitulo(titulo) {
  if (titulo.length <= 14) return 108;
  if (titulo.length <= 24) return 88;
  if (titulo.length <= 34) return 72;
  return 60;
}

function html({ titulo, bajada, fuentes, logo }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<style>
${fuentes}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
.tarjeta{
  position:relative;width:1200px;height:630px;
  background:${COLOR.primary};
  border-top:12px solid ${COLOR.gold};
  display:flex;flex-direction:column;justify-content:space-between;
  padding:64px 88px 56px;color:${COLOR.white};
}
/* Halo detrás del logo: da profundidad sin competir con el texto. */
.halo{position:absolute;top:-160px;right:-160px;width:620px;height:620px;border-radius:50%;
  background:radial-gradient(circle, rgba(201,142,42,.20) 0%, rgba(201,142,42,0) 68%)}
.marca{display:flex;align-items:center;gap:22px;position:relative}
/* El logo es azul y granate sobre transparente: sobre el degradado no se lee.
   Va dentro de una pastilla blanca, como en el header del sitio. */
.chapa{width:96px;height:96px;border-radius:24px;background:${COLOR.white};
  display:flex;align-items:center;justify-content:center;flex:0 0 auto;
  box-shadow:0 10px 30px rgba(15,41,74,.35)}
.chapa img{width:74px;height:74px;object-fit:contain}
.marca-texto{display:flex;flex-direction:column;gap:4px}
.marca-nombre{font-family:'Poppins',sans-serif;font-weight:700;font-size:26px;letter-spacing:.01em}
.marca-tipo{font-family:'Inter',sans-serif;font-weight:600;font-size:15px;
  letter-spacing:.24em;text-transform:uppercase;color:${COLOR.gold}}
.cuerpo{position:relative;display:flex;flex-direction:column;gap:26px;max-width:1010px}
h1{font-family:'Poppins',sans-serif;font-weight:800;line-height:1.04;
  letter-spacing:-.02em;font-size:var(--tamano);text-wrap:balance}
/* text-wrap:pretty evita la última línea de una sola palabra, que en una
   tarjeta de dos renglones se lee como un error de maquetado. */
.bajada{font-family:'Inter',sans-serif;font-weight:400;font-size:34px;line-height:1.38;
  color:rgba(255,255,255,.84);max-width:1010px;text-wrap:pretty}
.pie{position:relative;display:flex;align-items:center;gap:20px;
  font-family:'Inter',sans-serif;font-weight:600;font-size:22px;
  letter-spacing:.02em;color:rgba(255,255,255,.72)}
.filete{width:56px;height:4px;border-radius:2px;background:${COLOR.gold};flex:0 0 auto}
</style></head>
<body><div class="tarjeta" style="--tamano:${tamanoTitulo(titulo)}px">
  <div class="halo"></div>
  <div class="marca">
    <div class="chapa"><img src="${logo}" alt="" /></div>
    <div class="marca-texto">
      <span class="marca-tipo">Fundación</span>
      <span class="marca-nombre">Evolución Antoniana</span>
    </div>
  </div>
  <div class="cuerpo">
    <h1>${escapar(titulo)}</h1>
    <p class="bajada">${escapar(bajada)}</p>
  </div>
  <div class="pie"><span class="filete"></span><span>evolucionantoniana.com</span></div>
</div></body></html>`;
}

// --- Captura ------------------------------------------------------------------

const CHROMES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const chrome = CHROMES.find((c) => fs.existsSync(c));
if (!chrome) {
  console.error(
    'No encontré Chrome. Pasá la ruta con CHROME_PATH=... node tools/generate-og-images.mjs'
  );
  process.exit(1);
}

/** Ancho y alto reales del PNG: bytes 16-23 de la cabecera, big-endian.
 *  Se verifica porque un `--window-size` que Chrome no respeta produce un PNG
 *  más chico y la tarjeta sale recortada sin que nada avise (ROADMAP §B). */
function medidasPng(archivo) {
  const b = fs.readFileSync(archivo);
  if (b.subarray(1, 4).toString() !== 'PNG') throw new Error('No es un PNG');
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}

// --- Main ---------------------------------------------------------------------

const args = process.argv.slice(2);
const guardarHtml = args.includes('--keep-html');
const filtro = args.filter((a) => !a.startsWith('--'));

fs.mkdirSync(SALIDA, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

console.log('Bajando/leyendo tipografías…');
const fuentes = await fuentesEmbebidas();
const logo = logoDataUri();

const nombreArchivo = (ruta) => `${ruta.replace(/^\//, '').replaceAll('/', '-')}-1200x630.png`;

let generadas = 0;
const fallas = [];

for (const [ruta, tarjeta] of Object.entries(TARJETAS)) {
  const slug = ruta.replace(/^\//, '');
  if (filtro.length && !filtro.some((f) => slug.includes(f))) continue;

  const pagina = PAGINAS[ruta];
  if (!pagina) {
    fallas.push(`${ruta}: no está en PAGINAS (api/share/pagina.js)`);
    continue;
  }

  const destino = path.join(SALIDA, nombreArchivo(ruta));
  const htmlTmp = path.join(TMP, `${slug.replaceAll('/', '-')}.html`);
  fs.writeFileSync(
    htmlTmp,
    html({ titulo: pagina.titulo, bajada: tarjeta.bajada, fuentes, logo }),
    'utf8'
  );

  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      '--virtual-time-budget=3000',
      `--screenshot=${destino}`,
      `file:///${htmlTmp.replaceAll('\\', '/')}`,
    ],
    { stdio: 'ignore' }
  );

  const { ancho, alto } = medidasPng(destino);
  if (ancho !== 1200 || alto !== 630) {
    fallas.push(`${ruta}: el PNG salió ${ancho}x${alto}, no 1200x630`);
    continue;
  }

  if (!guardarHtml) fs.unlinkSync(htmlTmp);
  const kb = Math.round(fs.statSync(destino).size / 1024);
  console.log(`  ✓ ${nombreArchivo(ruta).padEnd(34)} ${ancho}x${alto}  ${kb} KB`);
  generadas++;
}

console.log(`\n${generadas} imagen(es) en public/img/og/`);
if (fallas.length) {
  console.error('\nFallas:');
  fallas.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log(
  'Recordá que cada fila de PAGINAS tiene que declarar su `imagen:`; ' +
    '`npm test` verifica que el archivo exista.'
);
