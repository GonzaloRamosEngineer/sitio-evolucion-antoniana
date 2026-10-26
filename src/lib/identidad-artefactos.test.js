import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ARTIFACT_GENERATORS,
  ARTIFACT_IDENTITY_FILE,
  auditArtifactIdentity,
  syncArtifactIdentity,
} from '../../tools/artifact-identity-lib.mjs';

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('sincronización de identidad para artefactos', () => {
  it('confirma que identidad, rutas y generadores versionados están alineados', () => {
    expect(auditArtifactIdentity()).toEqual([]);
  });

  it('detecta y repara la configuración generada sin ocultar generadores faltantes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'entidad-artefactos-'));
    temporaryRoots.push(root);
    const identityPath = path.join(root, ARTIFACT_IDENTITY_FILE);
    fs.mkdirSync(path.dirname(identityPath), { recursive: true });
    fs.writeFileSync(identityPath, '{}\n');
    for (const relative of ARTIFACT_GENERATORS) {
      const destination = path.join(root, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(
        destination,
        'from artifact_identity import ENTITY, display_url, site_url\n',
      );
    }

    expect(auditArtifactIdentity(root)).toContain(
      `Identidad de artefactos desactualizada: ${ARTIFACT_IDENTITY_FILE}`,
    );
    expect(syncArtifactIdentity(root)).toEqual([ARTIFACT_IDENTITY_FILE]);
    expect(auditArtifactIdentity(root)).toEqual([]);
  });
});
