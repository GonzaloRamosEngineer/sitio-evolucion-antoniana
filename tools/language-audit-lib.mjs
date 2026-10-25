import fs from 'node:fs';
import path from 'node:path';

import {
  BRAND_LITERAL_ALLOWLIST,
  PUBLIC_PARTNER_ALLOWLIST,
} from './language-baseline.mjs';

const RUNTIME_ROOTS = ['src', 'api', 'supabase/functions', 'public'];
const SOURCE_EXTENSION = /\.(?:js|jsx|ts|tsx|html|txt)$/;
const BRAND_LITERAL = /Fundación Evolución Antoniana|Evolución Antoniana|evolucionantoniana\.com/;
const CLUB_DE_BENEFICIOS = /club de beneficios/i;
const PUBLIC_PARTNER_TERM = new RegExp(
  [
    'Partners que nos acompañan',
    'Partners de la fundación',
    'nuestros partners',
    'Postularse como Partner',
    'red de partners',
    'Postular como[\\s\\S]{0,100}Partner',
    'Partners evolutivos',
    'Partner verificado',
    "label:\\s*['\"]Partners['\"]",
    "name:\\s*['\"]Partners['\"]",
    "\\|\\|\\s*['\"]partner['\"]",
    'documentos legales, partners, beneficios',
  ].join('|'),
  'i',
);

const walk = (absolute) => {
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) =>
    walk(path.join(absolute, entry.name))
  );
};

const isRuntimeSource = (relative) =>
  SOURCE_EXTENSION.test(relative) &&
  !/\.(?:test|spec)\.[^.]+$/.test(relative) &&
  !relative.endsWith('.map');

const filesMatching = (root, regex, filter = () => true) => {
  const matches = [];
  for (const runtimeRoot of RUNTIME_ROOTS) {
    for (const absolute of walk(path.join(root, runtimeRoot))) {
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (!isRuntimeSource(relative) || !filter(relative)) continue;
      if (regex.test(fs.readFileSync(absolute, 'utf8'))) matches.push(relative);
    }
  }
  const indexHtml = path.join(root, 'index.html');
  if (fs.existsSync(indexHtml) && regex.test(fs.readFileSync(indexHtml, 'utf8'))) {
    matches.push('index.html');
  }
  return [...new Set(matches)].sort();
};

export const auditLanguage = (root = process.cwd()) => {
  const brandFiles = filesMatching(
    root,
    BRAND_LITERAL,
    (relative) => relative !== 'src/config/entidad.js',
  );
  const partnerFiles = filesMatching(
    root,
    PUBLIC_PARTNER_TERM,
    (relative) => relative.startsWith('src/pages/') || relative.startsWith('src/components/'),
  );
  const clubDeBeneficiosFiles = filesMatching(root, CLUB_DE_BENEFICIOS);
  const brandAllowlist = new Set(BRAND_LITERAL_ALLOWLIST);
  const partnerAllowlist = new Set(PUBLIC_PARTNER_ALLOWLIST);

  return {
    brandFiles,
    partnerFiles,
    clubDeBeneficiosFiles,
    unexpectedBrandFiles: brandFiles.filter((file) => !brandAllowlist.has(file)),
    unexpectedPartnerFiles: partnerFiles.filter((file) => !partnerAllowlist.has(file)),
  };
};
