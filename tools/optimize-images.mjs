// tools/optimize-images.mjs
//
// Optimiza los assets pesados de `public/` (ROADMAP 6.1). Idempotente: se puede
// re-correr, siempre regenera desde el original.
//
// `sharp` no es dependencia del proyecto (pesa y solo hace falta para esto).
// Instalalo, corré y desinstalá:
//   npm i -D sharp && node tools/optimize-images.mjs && npm un -D sharp
//   node tools/optimize-images.mjs --dry     (solo reporta, no escribe)
//
// OJO: el `npm exec --yes --package=sharp -- node tools/...` que documentaba
// `normalize-partner-logos.mjs` NO funciona — npm exec deja el paquete en un
// temp que un script ESM del proyecto no puede resolver.
//
// Criterio: las imágenes de contenido van a WebP, redimensionadas al ancho al
// que realmente se muestran (estaban a resolución de cámara para verse a 400px).
//
// `public/og-default.png` queda EXPRESAMENTE afuera. Es la imagen de OpenGraph:
// la piden los scrapers de redes, nunca un visitante del sitio, así que
// comprimirla no le ahorra un byte a ningún usuario real. A cambio arriesga las
// previews de compartir —que solo se pueden validar en producción— y la
// cuantización a paleta puede meter banding en una imagen de marca. Mal negocio.
import sharp from 'sharp';
import { statSync, existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

/**
 * `maxWidth` sale del tamaño de render real (mirando las clases de Tailwind en
 * el JSX), duplicado para pantallas 2x.
 */
const TARGETS = [
  {
    src: 'public/img/mercadolibre_solidario.png',
    out: 'public/img/mercadolibre_solidario.webp',
    maxWidth: 1200,
    note: 'Collaborate — imagen de campaña',
  },
  {
    src: 'public/img/hogar_abuelos.png',
    out: 'public/img/hogar_abuelos.webp',
    maxWidth: 1200,
    note: 'About — foto de programa',
  },
  {
    src: 'public/img/logotransparente.png',
    out: 'public/img/logotransparente.webp',
    maxWidth: 320, // se muestra a 80px (w-20) en Login/Register
    note: 'Login/Register — logo',
  },
  {
    src: 'public/img/juan_carlos_palavecino.png',
    out: 'public/img/juan_carlos_palavecino.webp',
    maxWidth: 640,
    note: 'About — retrato de autoridad',
  },
];

const kb = (bytes) => (bytes / 1024).toFixed(0);

let totalBefore = 0;
let totalAfter = 0;

for (const target of TARGETS) {
  const srcPath = join(ROOT, target.src);
  if (!existsSync(srcPath)) {
    console.log(`· omitido (no existe): ${target.src}`);
    continue;
  }

  const before = statSync(srcPath).size;
  const meta = await sharp(srcPath).metadata();

  let pipeline = sharp(srcPath).resize({
    width: Math.min(target.maxWidth, meta.width),
    height: target.height,
    fit: target.height ? 'cover' : 'inside',
    withoutEnlargement: true,
  });

  pipeline = target.keepPng
    ? pipeline.png({ compressionLevel: 9, palette: true })
    : pipeline.webp({ quality: 82 });

  const buffer = await pipeline.toBuffer();
  totalBefore += before;
  totalAfter += buffer.length;

  const saved = (100 - (buffer.length / before) * 100).toFixed(0);
  console.log(
    `${target.src}\n` +
      `   ${meta.width}x${meta.height} ${kb(before)}KB → ${kb(buffer.length)}KB  (-${saved}%)  ${target.note}`
  );

  if (DRY) continue;

  // Escribimos después de leer el original entero en memoria, así el caso
  // "mismo archivo de entrada y salida" (og-default) no se corrompe.
  const { writeFileSync } = await import('fs');
  writeFileSync(join(ROOT, target.out), buffer);

  // Si cambió de formato, el original queda huérfano.
  if (target.out !== target.src) unlinkSync(srcPath);
}

console.log(
  `\nTotal: ${kb(totalBefore)}KB → ${kb(totalAfter)}KB ` +
    `(-${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}%)` +
    (DRY ? '  [dry run, no se escribió nada]' : '')
);
