// `tools/cuotas-2026-10.sh` — la regla 2026-10 en UNA transacción.
//
// Vive en `src/lib/` porque es donde vitest busca tests. Corre el script real
// en modo `emitir` (no se conecta a nada) y verifica lo que hace segura a la
// aplicación atómica: una sola transacción, los bloqueos en el orden del
// webhook, las piezas en el orden correcto y el mismo cuerpo de reclasificación
// que la aplicación standalone. El ensayo de punta a punta, contra Postgres 15,
// es `supabase/checks/reclasificacion-replica.sh`.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const RAIZ = resolve(__dirname, '../..');
const dir = mkdtempSync(join(tmpdir(), 'cuotas-tool-'));
const VERIFICADO = join(dir, 'verificado.psql');
writeFileSync(VERIFICADO, "\\set verificado '{}'\n");
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const emitir = (modo, env = { VERIFICADO }) =>
  spawnSync('bash', [join(RAIZ, 'tools/cuotas-2026-10.sh'), 'emitir', modo], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: dir, ...env },
  });

const lineas = (s, l) => s.split('\n').filter((x) => x === l).length;
const enOrden = (s, marcas) => {
  const pos = marcas.map((m) => s.indexOf(m));
  return pos.every((p) => p >= 0) && pos.every((p, i) => i === 0 || p > pos[i - 1]);
};

const MIG1 = readFileSync(join(RAIZ, 'supabase/migrations/20261016120000_cuotas_concepto_y_reintegros.sql'), 'utf8');
const MIG2 = readFileSync(join(RAIZ, 'supabase/migrations/20261016120100_reclasificar_aportes_historicos.sql'), 'utf8');
const APLICAR = readFileSync(join(RAIZ, 'supabase/data/aplicar_reclasificacion_aportes_2026_10.sql'), 'utf8');
const cuerpo = APLICAR.slice(
  APLICAR.indexOf('-- >>> CUERPO-RECLASIFICACION-2026-10'),
  APLICAR.indexOf('-- <<< CUERPO-RECLASIFICACION-2026-10'),
);

describe('tools/cuotas-2026-10.sh', () => {
  it('las migraciones no abren ni cierran transacciones propias (si no, no sería una sola)', () => {
    for (const m of [MIG1, MIG2]) {
      // Fuera de los cuerpos $...$ (donde BEGIN/END son bloques plpgsql, no
      // transacciones) y de los comentarios.
      const nivelSuperior = m
        .replace(/(\$[a-zA-Z_]*\$)[\s\S]*?\1/g, '')
        .replace(/--[^\n]*/g, '');
      expect(nivelSuperior).not.toMatch(/^\s*(BEGIN|COMMIT|ROLLBACK|END)\s*;|START TRANSACTION/im);
      expect(nivelSuperior).toMatch(/CREATE|ALTER/); // control: el recorte no vació el archivo
    }
  });

  it('aplicar: UNA transacción, bloqueos en el orden del webhook, piezas en orden, COMMIT al final', () => {
    const r = emitir('aplicar');
    expect(r.status).toBe(0);
    const s = r.stdout;
    expect(lineas(s, 'BEGIN;')).toBe(1);
    expect(lineas(s, 'COMMIT;')).toBe(1);
    expect(lineas(s, 'ROLLBACK;')).toBe(0);
    expect(enOrden(s, [
      "\\set verificado",
      '\\set ON_ERROR_STOP on',
      'BEGIN;',
      'LOCK TABLE public.donations, public.memberships, public.aportes IN ACCESS EXCLUSIVE MODE;',
      MIG1.slice(0, 200),
      MIG2.slice(0, 200),
      cuerpo,
      'COMMIT;',
    ])).toBe(true);
    expect(s.trim().endsWith('COMMIT;')).toBe(true);
  });

  it('simular: lo mismo, pero termina en ROLLBACK y nunca en COMMIT', () => {
    const s = emitir('simular').stdout;
    expect(lineas(s, 'BEGIN;')).toBe(1);
    expect(lineas(s, 'COMMIT;')).toBe(0);
    expect(s.trim().endsWith('ROLLBACK;')).toBe(true);
    expect(s).toContain(cuerpo);
  });

  it('revertir: primero los datos (usan funciones que la lógica borra), después la lógica y el post chequeo', () => {
    const s = emitir('revertir').stdout;
    expect(lineas(s, 'BEGIN;')).toBe(1);
    expect(enOrden(s, [
      'BEGIN;',
      'LOCK TABLE public.donations, public.memberships, public.aportes IN ACCESS EXCLUSIVE MODE;',
      "SELECT public.revertir_reclasificacion_aportes('2026-10-cuotas-v2')",
      'REVERSIÓN DE LÓGICA de la regla 2026-10',
      'POST REVERSIÓN OK',
      'COMMIT;',
    ])).toBe(true);
    expect(emitir('simular-reversion').stdout.trim().endsWith('ROLLBACK;')).toBe(true);
  });

  it('sin lo verificado no emite nada aplicable', () => {
    const r = emitir('aplicar', { VERIFICADO: join(dir, 'no-existe.psql') });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/falta lo verificado/);
    expect(r.stdout).not.toContain('BEGIN;');
  });

  it('la reversión de lógica no reabre la P0 ni trae datos de personas', () => {
    const rev = readFileSync(join(RAIZ, 'supabase/data/revertir_logica_cuotas_2026_10.sql'), 'utf8');
    expect(rev).not.toMatch(/GRANT\s+(INSERT|UPDATE|DELETE|TRUNCATE|ALL)[^;]*ON\s+(TABLE\s+)?public\.(donations|memberships)/i);
    expect(rev).not.toMatch(/CREATE POLICY/i);
    expect(rev).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  });
});
