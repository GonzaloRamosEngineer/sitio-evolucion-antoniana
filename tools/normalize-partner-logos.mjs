// tools/normalize-partner-logos.mjs
//
// Normaliza los logos de partners para la vidriera de la Home:
//   1. Baja los logos (partners aprobados) desde Supabase.
//   2. Recorta el aire de cada PNG (transparencia / fondo plano).
//   3. Re-escala cada logo a una masa visual constante y lo centra en un
//      lienzo transparente uniforme de 280x120 (se muestra a ~140x60).
//   4. Escribe public/img/partners/<slug>.png y el mapa id → ruta en
//      src/data/partnerLogoOverrides.json (Home.jsx lo usa con fallback
//      al logo_url crudo para partners sin normalizar).
//
// Requiere `sharp` (no es dependencia del proyecto):
//   npm exec --yes --package=sharp -- node tools/normalize-partner-logos.mjs
// o correrlo desde una carpeta con sharp instalado.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUPABASE_URL = 'https://lbtyxnbyetsvngsxczkt.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidHl4bmJ5ZXRzdm5nc3hjemt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NzkwOTMsImV4cCI6MjA2NDU1NTA5M30.5x5oYFyZbUxNAgPgbP4F3HeKemi8RBfv-3OKkDpeTz4';

const BOX_W = 280;
const BOX_H = 120;
const TARGET_AREA = BOX_W * BOX_H * 0.34; // masa visual objetivo por logo
const OUT_DIR = resolve(ROOT, 'public/img/partners');
const OVERRIDES_PATH = resolve(ROOT, 'src/data/partnerLogoOverrides.json');

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/partners?select=id,nombre,slug,logo_url&estado=eq.aprobado`,
  { headers: { apikey: ANON_KEY } }
);
if (!res.ok) throw new Error(`No pude leer partners: HTTP ${res.status}`);
const partners = (await res.json()).filter((p) => p.logo_url);

mkdirSync(OUT_DIR, { recursive: true });
const overrides = {};

for (const partner of partners) {
  try {
    const imgRes = await fetch(partner.logo_url);
    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const orig = await sharp(buf).metadata();

    const trimmed = await sharp(buf).trim({ threshold: 12 }).png().toBuffer();
    const t = await sharp(trimmed).metadata();

    let scale = Math.sqrt(TARGET_AREA / (t.width * t.height));
    scale = Math.min(scale, (BOX_W - 8) / t.width, (BOX_H - 8) / t.height);
    const w = Math.max(1, Math.round(t.width * scale));
    const h = Math.max(1, Math.round(t.height * scale));

    const logo = await sharp(trimmed).resize(w, h).png().toBuffer();
    const slug = slugify(partner.slug || partner.nombre);
    await sharp({
      create: { width: BOX_W, height: BOX_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: logo, gravity: 'centre' }])
      .png({ compressionLevel: 9 })
      .toFile(resolve(OUT_DIR, `${slug}.png`));

    overrides[partner.id] = `/img/partners/${slug}.png`;
    const airPct = Math.round(100 - ((t.width * t.height) / (orig.width * orig.height)) * 100);
    console.log(`${partner.nombre}: ${orig.width}x${orig.height} (${airPct}% aire) → ${w}x${h} en lienzo`);
  } catch (err) {
    console.error(`FALLO ${partner.nombre}:`, err.message);
  }
}

writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + '\n');
console.log(`OK: ${Object.keys(overrides).length} logos → ${OUT_DIR}`);
