// El 2026-09-09 el panel entero mostró «Error al cargar perfil» —con el email en
// lugar del nombre y el documento en «Sin registrar»— porque el select pedía
// `avatar_path` y la migración no estaba aplicada en la base real. Un campo
// nuevo para la FOTO se llevó puestos el nombre, el DNI y la antigüedad.
//
// Esto fija el puente entre los dos estados de la base. Cuando la migración
// esté aplicada en producción, se borran el puente y estos tests juntos.
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const { conColumnasDePerfil, esColumnaFaltante, COLUMNAS_PERFIL } = await import('./userApi');

describe('esColumnaFaltante', () => {
  it('reconoce el 42703 de Postgres y nada más', () => {
    expect(esColumnaFaltante({ code: '42703' })).toBe(true);
    // PGRST116 es «no hay filas», que NO es lo mismo y ya se maneja aparte.
    expect(esColumnaFaltante({ code: 'PGRST116' })).toBe(false);
    expect(esColumnaFaltante(null)).toBe(false);
    expect(esColumnaFaltante(undefined)).toBe(false);
  });
});

describe('conColumnasDePerfil', () => {
  it('con la base al día pide avatar_path y consulta UNA sola vez', async () => {
    const consultar = vi.fn().mockResolvedValue({ data: { id: 'u1', avatar_path: null }, error: null });
    const r = await conColumnasDePerfil(consultar);

    expect(consultar).toHaveBeenCalledOnce();
    expect(consultar).toHaveBeenCalledWith(COLUMNAS_PERFIL);
    expect(r.data).toEqual({ id: 'u1', avatar_path: null });
  });

  it('🔒 si falta la columna reintenta sin ella y el perfil SIGUE cargando', async () => {
    const consultar = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: '42703', message: 'column users.avatar_path does not exist' } })
      .mockResolvedValueOnce({ data: { id: 'u1', name: 'Gonzalo Ramos', dni: '36934775' }, error: null });

    const r = await conColumnasDePerfil(consultar);

    expect(consultar).toHaveBeenCalledTimes(2);
    expect(consultar.mock.calls[1][0]).not.toContain('avatar_path');
    expect(r.error).toBeNull();
    // Lo que importa: vuelven el nombre y el DNI, que es lo que se había perdido.
    expect(r.data.name).toBe('Gonzalo Ramos');
    expect(r.data.dni).toBe('36934775');
    // Y la clave NO está: es la señal de que la subida no se puede ofrecer.
    expect('avatar_path' in r.data).toBe(false);
  });

  it('un error que NO es de columna faltante se devuelve tal cual, sin reintentar', async () => {
    // Si se reintentara con cualquier error, un problema de red se convertiría
    // en dos consultas y el error real quedaría tapado por el segundo.
    const error = { code: 'PGRST301', message: 'JWT expired' };
    const consultar = vi.fn().mockResolvedValue({ data: null, error });

    const r = await conColumnasDePerfil(consultar);

    expect(consultar).toHaveBeenCalledOnce();
    expect(r.error).toBe(error);
  });
});
