// Guarda de los scripts de la reclasificación histórica de aportes (2026-10).
//
// El bloque de verificación está COPIADO en el pre chequeo y en el script que
// aplica: el primero se corre solo, en una transacción READ ONLY, y el segundo
// tiene que repetirlo dentro de su propia transacción (el SQL Editor de
// Supabase no tiene `\i`). Una copia que se desincroniza es un pre chequeo que
// aprueba una cosa y una aplicación que verifica otra. Este test lo impide.
//
// El ensayo de punta a punta, contra una réplica de producción en Postgres 15,
// es `supabase/checks/reclasificacion-replica.sh`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const leer = (nombre) =>
  readFileSync(resolve(__dirname, '../../supabase/data', nombre), 'utf8');

const bloque = (sql) => {
  const ini = sql.indexOf('-- >>> BLOQUE-VERIFICACION-2026-10');
  const fin = sql.indexOf('-- <<< BLOQUE-VERIFICACION-2026-10');
  if (ini < 0 || fin < 0) return null;
  return sql.slice(ini, fin);
};

const precheck = leer('precheck_reclasificacion_aportes_2026_10.sql');
const aplicar = leer('aplicar_reclasificacion_aportes_2026_10.sql');
const revertir = leer('revertir_reclasificacion_aportes_2026_10.sql');

describe('reclasificación de aportes 2026-10', () => {
  it('el bloque de verificación es idéntico en el pre chequeo y en la aplicación', () => {
    expect(bloque(precheck)).not.toBeNull();
    expect(bloque(aplicar)).toBe(bloque(precheck));
  });

  it('el pre chequeo no puede escribir: READ ONLY y termina en ROLLBACK', () => {
    expect(precheck).toMatch(/BEGIN TRANSACTION READ ONLY;/);
    expect(precheck.trim()).toMatch(/ROLLBACK;$/);
    expect(precheck).not.toMatch(/reclasificar_aportes_v2\(true/);
  });

  it('la aplicación bloquea, verifica, aplica, re-verifica y valida el CHECK, todo en una transacción', () => {
    const orden = [
      'BEGIN;',
      'LOCK TABLE public.aportes',
      'LOCK TABLE public.donations',
      '-- >>> BLOQUE-VERIFICACION-2026-10',
      'reclasificar_aportes_v2(true',
      'POST CHEQUEO',
      'VALIDATE CONSTRAINT aportes_acceso_solo_cuotas_chk',
      'COMMIT;',
    ].map((marca) => aplicar.indexOf(marca));
    expect(orden.every((i) => i >= 0)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });

  it('la verificación fija los 8 aportes automáticos y los 135 manuales relevados', () => {
    const b = bloque(precheck);
    expect(b.match(/"id":"[0-9a-f-]{36}"/g)).toHaveLength(8);
    expect(b).toMatch(/v_n <> 135 OR v_suma <> 1238997\.77/);
    expect(b).toMatch(/RAISE EXCEPTION E'PRE CHEQUEO FALLÓ/);
  });

  it('revertir no borra: restaura desde aportes_correcciones', () => {
    expect(revertir).toMatch(/revertir_reclasificacion_aportes\('2026-10-cuotas-v2'\)/);
    expect(revertir).not.toMatch(/\bDELETE\b/i);
  });
});
