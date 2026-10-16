// P0 (migración 20261016110000): `donations` y `memberships` las escribe SOLO
// el webhook de Mercado Pago con service_role. Desde el navegador se leen y
// nada más: si una pantalla vuelve a insertar o actualizar ahí, en producción
// falla con 42501 — y antes de eso, que una sesión pudiera escribirlas era
// exactamente el agujero (darse acceso con una donación `approved` inventada).
//
// Este test lo fija en el código: recorre `src/` y `api/` buscando cualquier
// `.from('donations'|'memberships')` seguido de una escritura en la misma
// cadena. La única excepción conocida es `src/hooks/useMembership.jsx`, que
// tiene un insert y un update **y no lo importa nadie**; el segundo test exige
// que siga así.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const RAIZ = resolve(__dirname, '../..');
const MUERTO = 'src/hooks/useMembership.jsx';

const archivos = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === 'node_modules' ? [] : archivos(p);
    return /\.(js|jsx|ts|tsx)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });

const fuentes = [...archivos(join(RAIZ, 'src')), ...archivos(join(RAIZ, 'api'))].map((p) => ({
  ruta: relative(RAIZ, p),
  texto: readFileSync(p, 'utf8'),
}));

// Desde el `.from(...)` hasta el `;` o la siguiente sentencia: una cadena de
// Supabase. Alcanza para `.from('donations')\n  .insert(...)`.
const ESCRITURA = /\.from\(\s*['"`](donations|memberships)['"`]\s*\)[^;]*?\.(insert|update|upsert|delete)\(/gs;

describe('nadie escribe donations/memberships desde el navegador', () => {
  it('ningún archivo activo inserta, actualiza ni borra esas tablas', () => {
    const encontrados = fuentes
      .filter((f) => f.ruta !== MUERTO)
      .flatMap((f) => [...f.texto.matchAll(ESCRITURA)].map((m) => `${f.ruta}: ${m[1]}.${m[2]}`));
    expect(encontrados).toEqual([]);
  });

  it('el detector encuentra las escrituras que sí existen (control positivo)', () => {
    const muerto = fuentes.find((f) => f.ruta === MUERTO);
    expect(muerto).toBeTruthy();
    expect([...muerto.texto.matchAll(ESCRITURA)].map((m) => m[2]).sort()).toEqual(['insert', 'update']);
  });

  it('useMembership.jsx (el único con escrituras) no lo importa nadie', () => {
    const importadores = fuentes.filter(
      (f) => f.ruta !== MUERTO && /from\s+['"](@\/hooks\/useMembership|\.\.?\/(hooks\/)?useMembership)['"]/.test(f.texto),
    );
    expect(importadores.map((f) => f.ruta)).toEqual([]);
  });
});
