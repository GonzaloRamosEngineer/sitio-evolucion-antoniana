#!/usr/bin/env node
// Auditoria read-only de los slugs publicos que participan en la Etapa 5.
// Lee exclusivamente columnas publicas mediante la anon key y nunca imprime
// credenciales. Sale con codigo 1 ante errores de red y 2 ante colisiones.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizePublicSlug = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseEnv = (filename) => {
  if (!fs.existsSync(filename)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filename, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, '$2');
        return [key, value];
      }),
  );
};

export const auditRows = ({ resourceType, rows, titleField }) => {
  const groups = new Map();
  const invalid = [];
  const changes = [];
  let missing = 0;

  for (const row of rows) {
    const current = String(row.slug ?? '').trim();
    const source = current || row[titleField] || '';
    const normalized = normalizePublicSlug(source);

    if (!current) missing += 1;
    if (current && !CONTRACT.test(current)) {
      invalid.push({ id: row.id, current, normalized });
    }
    if (current && current !== normalized) {
      changes.push({ id: row.id, current, normalized });
    }

    if (normalized) {
      const matches = groups.get(normalized) ?? [];
      matches.push({ id: row.id, current });
      groups.set(normalized, matches);
    }
  }

  const collisions = [...groups.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([normalized, matches]) => ({ normalized, matches }));

  return { resourceType, total: rows.length, missing, invalid, changes, collisions };
};

const resources = [
  { resourceType: 'activity', table: 'activities', titleField: 'title' },
  { resourceType: 'news', table: 'news', titleField: 'title' },
  { resourceType: 'partner', table: 'partners', titleField: 'nombre' },
  { resourceType: 'benefit', table: 'club_beneficios', titleField: 'titulo' },
];

const run = async () => {
  const fileEnv = parseEnv(path.join(ROOT, '.env.local'));
  const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY en el entorno o .env.local.');
  }

  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const reports = [];

  for (const resource of resources) {
    const select = `id,slug,${resource.titleField}`;
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${resource.table}?select=${encodeURIComponent(select)}`,
      { headers },
    );
    if (!response.ok) {
      throw new Error(`${resource.table}: Supabase respondio ${response.status}.`);
    }
    reports.push(auditRows({ ...resource, rows: await response.json() }));
  }

  console.log('RECURSO   FILAS  FALTAN  INVALIDOS  CAMBIAN  COLISIONES');
  for (const report of reports) {
    console.log(
      `${report.resourceType.padEnd(10)}${String(report.total).padStart(5)}` +
        `${String(report.missing).padStart(8)}${String(report.invalid.length).padStart(10)}` +
        `${String(report.changes.length).padStart(9)}${String(report.collisions.length).padStart(11)}`,
    );
  }

  const changes = reports.flatMap((report) =>
    report.changes.map((change) => ({ resourceType: report.resourceType, ...change })),
  );
  if (changes.length) {
    console.log('\nCAMBIOS PREVISTOS');
    for (const change of changes) {
      console.log(`${change.resourceType} ${change.id}`);
      console.log(`  ${change.current}`);
      console.log(`  -> ${change.normalized}`);
    }
  }

  const collisions = reports.flatMap((report) =>
    report.collisions.map((collision) => ({ resourceType: report.resourceType, ...collision })),
  );
  if (collisions.length) {
    console.error('\nCOLISIONES: no aplicar la migracion.');
    console.error(JSON.stringify(collisions, null, 2));
    process.exitCode = 2;
    return;
  }

  console.log('\nPRECHECK OK: no hay colisiones de normalizacion.');
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(`AUDITORIA FALLIDA: ${error.message}`);
    process.exitCode = 1;
  });
}
