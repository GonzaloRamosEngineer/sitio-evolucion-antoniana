import fs from 'node:fs';
import path from 'node:path';

import { entidad } from '../src/config/entidad.js';

export const STATIC_IDENTITY_FILES = Object.freeze([
  'index.html',
  'public/robots.txt',
  'public/s/_template.html',
]);

const escapeHtmlAttribute = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const sitio = entidad.sitio.replace(/\/+$/, '');

const identityValues = Object.freeze({
  'home-title': `${entidad.nombre} | ${entidad.seo.tituloInicio}`,
  'home-description': entidad.seo.descripcionInicio,
  'social-description': entidad.seo.descripcionSocial,
  'site-name': entidad.nombre,
  'site-url': `${sitio}/`,
  'social-image': new URL(entidad.seo.imagenSocial, `${sitio}/`).href,
});

const replaceMetaValue = (html, key, value) => {
  const pattern = new RegExp(
    `(<meta[^>]*data-entity="${key}"[^>]*content=")[^"]*(")`,
    'g',
  );
  return html.replace(pattern, `$1${escapeHtmlAttribute(value)}$2`);
};

export const renderStaticIdentity = (relative, source) => {
  if (relative === 'index.html') {
    let output = source.replace(
      /(<title data-entity="home-title">)[^<]*(<\/title>)/,
      `$1${escapeHtmlAttribute(identityValues['home-title'])}$2`,
    );
    for (const [key, value] of Object.entries(identityValues)) {
      output = replaceMetaValue(output, key, value);
    }
    return output;
  }

  if (relative === 'public/robots.txt') {
    return source.replace(
      /(# entity-site-url\r?\nSitemap:\s*)[^\r\n]+/,
      `$1${sitio}/sitemap.xml`,
    );
  }

  if (relative === 'public/s/_template.html') {
    return replaceMetaValue(source, 'site-name', identityValues['site-name']);
  }

  return source;
};

export const auditStaticIdentity = (root = process.cwd()) =>
  STATIC_IDENTITY_FILES.flatMap((relative) => {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return [`Falta el estático sincronizado: ${relative}`];
    const source = fs.readFileSync(absolute, 'utf8');
    return source === renderStaticIdentity(relative, source)
      ? []
      : [`Identidad estática desactualizada: ${relative}`];
  });

export const syncStaticIdentity = (root = process.cwd()) => {
  const changed = [];
  for (const relative of STATIC_IDENTITY_FILES) {
    const absolute = path.join(root, relative);
    const source = fs.readFileSync(absolute, 'utf8');
    const output = renderStaticIdentity(relative, source);
    if (output === source) continue;
    fs.writeFileSync(absolute, output);
    changed.push(relative);
  }
  return changed;
};
