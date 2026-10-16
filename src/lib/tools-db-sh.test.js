// `tools/db.sh` — la carga de `.env.db` (credenciales de producción).
//
// Vive en `src/lib/` solo porque es donde vitest busca tests; prueba un script
// de `tools/`. Corre el script DE VERDAD con bash —con `/bin/bash` si existe,
// que en macOS es el 3.2 donde `. <(...)` dejaba las variables vacías— sobre
// una copia en un directorio temporal, con un `.env.db` falso guardado con
// CRLF y un `docker` de mentira en el PATH que informa, SIN imprimir valores:
//   * si cada variable llegó cargada y sin `\r`;
//   * qué archivos había en TMPDIR mientras corría, y con qué permisos.
// Así se verifica que el temporal existe solo durante la corrida, es 0600 y se
// borra también cuando el script sale con error.
import { spawnSync } from 'node:child_process';
import {
  chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const BASH = existsSync('/bin/bash') ? '/bin/bash' : 'bash';
const SCRIPT = resolve(__dirname, '../../tools/db.sh');
const VARS = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
const SECRETO = 's3cr3t-que-no-debe-aparecer';

// El `docker` falso: imprime el estado de cada variable y el contenido de
// TMPDIR (nombre y permisos), nunca un valor.
const DOCKER_FALSO = `#!/bin/sh
for v in ${VARS.join(' ')}; do
  eval "val=\\$$v"
  if [ -z "$val" ]; then echo "VAR $v=vacia"
  elif printf '%s' "$val" | grep -q "$(printf '\\r')"; then echo "VAR $v=con-CR"
  else echo "VAR $v=ok"; fi
done
for f in "$TMPDIR"/*; do
  [ -e "$f" ] && echo "TMP $(basename "$f") $(ls -l "$f" | cut -c1-10)"
done
echo "OK · docker falso"
`;

let dir;
let tmpCorrida;
const correr = (envDb, comando = 'check') => {
  if (envDb !== null) writeFileSync(join(dir, '.env.db'), envDb);
  return spawnSync(BASH, [join(dir, 'tools', 'db.sh'), comando], {
    encoding: 'utf8',
    env: { PATH: `${join(dir, 'bin')}:/usr/bin:/bin`, TMPDIR: tmpCorrida, HOME: dir },
  });
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'db-sh-test-'));
  tmpCorrida = join(dir, 'tmp');
  mkdirSync(join(dir, 'tools'));
  mkdirSync(join(dir, 'bin'));
  mkdirSync(tmpCorrida);
  copyFileSync(SCRIPT, join(dir, 'tools', 'db.sh'));
  writeFileSync(join(dir, 'bin', 'docker'), DOCKER_FALSO);
  chmodSync(join(dir, 'bin', 'docker'), 0o755);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

const ENV_CRLF =
  ['PGHOST=db.ejemplo.test', 'PGPORT=5432', 'PGDATABASE=postgres', 'PGUSER=postgres', `PGPASSWORD=${SECRETO}`]
    .join('\r\n') + '\r\n';

describe('tools/db.sh — carga de .env.db', () => {
  it(`carga las 5 variables desde un archivo con CRLF, sin \\r (${BASH})`, () => {
    const r = correr(ENV_CRLF);
    expect(r.status).toBe(0);
    for (const v of VARS) expect(r.stdout).toContain(`VAR ${v}=ok`);
    expect(r.stdout).toContain('OK · docker falso');
  });

  it('el temporal existe SOLO durante la corrida, con permisos 0600', () => {
    const r = correr(ENV_CRLF);
    const temporales = r.stdout.split('\n').filter((l) => l.startsWith('TMP '));
    expect(temporales).toHaveLength(1);
    expect(temporales[0]).toMatch(/^TMP db-env\.\S+ -rw-------$/);
    expect(readdirSync(tmpCorrida)).toEqual([]);
  });

  it('borra el temporal también cuando el script sale con error', () => {
    const r = correr('PGHOST=db.ejemplo.test\r\nPGPASSWORD=' + SECRETO + '\r\n');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/falta PGPORT en \.env\.db/);
    expect(readdirSync(tmpCorrida)).toEqual([]);
  });

  it('no imprime ningún valor, ni en la salida normal ni en los errores', () => {
    for (const r of [correr(ENV_CRLF), correr('PGHOST=x\r\nPGPASSWORD=' + SECRETO + '\r\n')]) {
      expect(r.stdout + r.stderr).not.toContain(SECRETO);
      expect(r.stdout + r.stderr).not.toContain('db.ejemplo.test');
    }
  });

  it('sin .env.db corta antes de crear ningún temporal', () => {
    const r = correr(null);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/falta .*\.env\.db/);
    expect(readdirSync(tmpCorrida)).toEqual([]);
  });
});
