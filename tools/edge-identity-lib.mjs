import fs from 'node:fs';
import path from 'node:path';

import { entidad } from '../src/config/entidad.js';

export const EDGE_IDENTITY_FILE = 'supabase/functions/_shared/entidad.generated.ts';

const literal = (value) => JSON.stringify(value);

export const renderEdgeIdentity = () => `// Archivo generado desde src/config/entidad.js. No editar manualmente.
// Ejecutar \`npm run sync:identity\` después de modificar el contrato de entidad.

export const ENTIDAD = Object.freeze({
  nombre: ${literal(entidad.nombre)},
  sitio: ${literal(entidad.sitio.replace(/\/+$/, ''))},
  contactoEmail: ${literal(entidad.contacto.email)},
});

export const sitioEntidad = (override?: string | null) =>
  override?.trim().replace(/\\/+$/, '') || ENTIDAD.sitio;

export const remitenteEntidad = (override?: string | null) => {
  const remitente = override?.trim();
  if (!remitente) return \`\${ENTIDAD.nombre} <\${ENTIDAD.contactoEmail}>\`;
  return remitente.includes('<') ? remitente : \`\${ENTIDAD.nombre} <\${remitente}>\`;
};
`;

export const auditEdgeIdentity = (root = process.cwd()) => {
  const absolute = path.join(root, EDGE_IDENTITY_FILE);
  if (!fs.existsSync(absolute)) return [`Falta la identidad Edge generada: ${EDGE_IDENTITY_FILE}`];
  return fs.readFileSync(absolute, 'utf8') === renderEdgeIdentity()
    ? []
    : [`Identidad Edge desactualizada: ${EDGE_IDENTITY_FILE}`];
};

export const syncEdgeIdentity = (root = process.cwd()) => {
  const absolute = path.join(root, EDGE_IDENTITY_FILE);
  const output = renderEdgeIdentity();
  if (fs.existsSync(absolute) && fs.readFileSync(absolute, 'utf8') === output) return [];
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, output);
  return [EDGE_IDENTITY_FILE];
};
