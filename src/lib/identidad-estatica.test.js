import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  auditStaticIdentity,
  STATIC_IDENTITY_FILES,
  syncStaticIdentity,
} from '../../tools/static-identity-lib.mjs';

const temporaryRoots = [];

const copyStaticFixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'entidad-estatica-'));
  temporaryRoots.push(root);
  for (const relative of STATIC_IDENTITY_FILES) {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.resolve(relative), destination);
  }
  return root;
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('sincronización de identidad estática', () => {
  it('confirma que los archivos versionados reflejan el contrato', () => {
    expect(auditStaticIdentity()).toEqual([]);
  });

  it('detecta y repara un valor institucional desactualizado', () => {
    const root = copyStaticFixture();
    const indexPath = path.join(root, 'index.html');
    fs.writeFileSync(
      indexPath,
      fs.readFileSync(indexPath, 'utf8').replace(
        /(<title data-entity="home-title">)[^<]+/,
        '$1Marca anterior',
      ),
    );

    expect(auditStaticIdentity(root)).toContain('Identidad estática desactualizada: index.html');
    expect(syncStaticIdentity(root)).toEqual(['index.html']);
    expect(auditStaticIdentity(root)).toEqual([]);
  });
});
