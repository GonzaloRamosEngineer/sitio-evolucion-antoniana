import fs from 'node:fs';
import path from 'node:path';

import { entidad } from '../src/config/entidad.js';
import { ROUTE_PATHS } from '../src/config/rutas.js';

export const ARTIFACT_IDENTITY_FILE = 'tools/entity-artifacts.generated.json';
export const ARTIFACT_GENERATORS = Object.freeze([
  'tools/generate-comunidad-brochure.py',
  'tools/generate-alianzas-brochure.py',
]);

const artifactIdentity = Object.freeze({
  nombre: entidad.nombre,
  nombreCorto: entidad.nombreCorto,
  tipoDisplay: entidad.tipoDisplay,
  sitio: entidad.sitio.replace(/\/+$/, ''),
  logo: entidad.logo,
  ubicacion: entidad.ubicacion.display,
  contacto: Object.freeze({
    email: entidad.contacto.email,
    telefono: entidad.contacto.telefono,
  }),
  comunidad: Object.freeze({
    nombre: entidad.comunidadEvolucion.nombre,
    propuesta: entidad.comunidadEvolucion.propuesta,
    descripcion: entidad.comunidadEvolucion.descripcion,
  }),
  rutas: Object.freeze({
    postularAlianza: ROUTE_PATHS.POSTULAR_ALIANZA,
    postularComercio: ROUTE_PATHS.POSTULAR_COMERCIO,
  }),
});

export const renderArtifactIdentity = () => `${JSON.stringify(artifactIdentity, null, 2)}\n`;

export const auditArtifactIdentity = (root = process.cwd()) => {
  const errors = [];
  const absolute = path.join(root, ARTIFACT_IDENTITY_FILE);
  if (!fs.existsSync(absolute)) {
    errors.push(`Falta la identidad de artefactos generada: ${ARTIFACT_IDENTITY_FILE}`);
  } else if (fs.readFileSync(absolute, 'utf8') !== renderArtifactIdentity()) {
    errors.push(`Identidad de artefactos desactualizada: ${ARTIFACT_IDENTITY_FILE}`);
  }

  const forbidden = /Fundación Evolución Antoniana|Evolución Antoniana|evolucionantoniana\.com|\/club\/postular|\/postular-partner/;
  for (const relative of ARTIFACT_GENERATORS) {
    const generator = path.join(root, relative);
    if (!fs.existsSync(generator)) {
      errors.push(`Falta el generador de artefacto: ${relative}`);
      continue;
    }
    const source = fs.readFileSync(generator, 'utf8');
    if (!source.includes('from artifact_identity import ENTITY, display_url, site_url')) {
      errors.push(`Generador sin identidad compartida: ${relative}`);
    }
    if (forbidden.test(source)) errors.push(`Generador con identidad o ruta heredada: ${relative}`);
  }
  return errors;
};

export const syncArtifactIdentity = (root = process.cwd()) => {
  const absolute = path.join(root, ARTIFACT_IDENTITY_FILE);
  const output = renderArtifactIdentity();
  if (fs.existsSync(absolute) && fs.readFileSync(absolute, 'utf8') === output) return [];
  fs.writeFileSync(absolute, output);
  return [ARTIFACT_IDENTITY_FILE];
};
