import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  auditEdgeIdentity,
  EDGE_IDENTITY_FILE,
  syncEdgeIdentity,
} from '../../tools/edge-identity-lib.mjs';
import {
  ENTIDAD,
  remitenteEntidad,
  sitioEntidad,
} from '../../supabase/functions/_shared/entidad.generated.ts';

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('sincronización de identidad para Edge Functions', () => {
  it('confirma que el módulo versionado refleja el contrato', () => {
    expect(auditEdgeIdentity()).toEqual([]);
  });

  it('aplica fallbacks institucionales y respeta overrides operativos', () => {
    expect(sitioEntidad()).toBe(ENTIDAD.sitio);
    expect(sitioEntidad('https://preview.example.org///')).toBe('https://preview.example.org');
    expect(remitenteEntidad()).toBe(`${ENTIDAD.nombre} <${ENTIDAD.contactoEmail}>`);
    expect(remitenteEntidad('correo@example.org')).toBe(`${ENTIDAD.nombre} <correo@example.org>`);
    expect(remitenteEntidad('Otro nombre <correo@example.org>')).toBe(
      'Otro nombre <correo@example.org>',
    );
  });

  it('detecta y repara un módulo generado desactualizado', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'entidad-edge-'));
    temporaryRoots.push(root);
    const destination = path.join(root, EDGE_IDENTITY_FILE);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, '// identidad anterior\n');

    expect(auditEdgeIdentity(root)).toEqual([
      `Identidad Edge desactualizada: ${EDGE_IDENTITY_FILE}`,
    ]);
    expect(syncEdgeIdentity(root)).toEqual([EDGE_IDENTITY_FILE]);
    expect(auditEdgeIdentity(root)).toEqual([]);
  });
});
