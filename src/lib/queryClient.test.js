// Tests del puente entre la capa de datos y TanStack Query (ROADMAP 4.2).
//
// `unwrap` es la pieza donde se cruzan las dos convenciones: nuestra capa nunca
// lanza y devuelve `{data, error}`; TanStack necesita que el queryFn **lance**
// para marcar la query como fallida. Si esto se rompe, los errores se ven como
// datos vacíos y ninguna página muestra su estado de error.
import { describe, it, expect } from 'vitest';
import { unwrap, queryKeys } from '@/lib/queryClient';

describe('unwrap', () => {
  it('devuelve `data` cuando no hay error', async () => {
    await expect(unwrap(Promise.resolve({ data: [1, 2], error: null }))).resolves.toEqual([1, 2]);
  });

  it('lanza el error para que TanStack lo registre como fallo', async () => {
    const dbError = { message: 'permission denied', code: '42501' };
    await expect(unwrap(Promise.resolve({ data: [], error: dbError }))).rejects.toBe(dbError);
  });

  it('lanza aunque `data` traiga el vacío del tipo', async () => {
    // La capa devuelve `data: []` incluso en error (contrato de F2). Si `unwrap`
    // mirara `data` en vez de `error`, un fallo se vería como "lista vacía" y la
    // página mostraría el estado vacío en lugar del de error.
    const dbError = { message: 'boom' };
    await expect(unwrap(Promise.resolve({ data: [], error: dbError }))).rejects.toBe(dbError);
  });

  it('deja pasar data null legítima (fila no encontrada)', async () => {
    await expect(unwrap(Promise.resolve({ data: null, error: null }))).resolves.toBeNull();
  });
});

describe('queryKeys', () => {
  it('las claves por entidad son estables', () => {
    // Si estas claves cambian sin querer, se rompe la invalidación cruzada
    // (por ejemplo la de `useActivities` tras una mutación del panel admin).
    expect(queryKeys.activities).toEqual(['activities']);
    expect(queryKeys.partners).toEqual(['partners']);
    expect(queryKeys.news).toEqual(['news']);
    expect(queryKeys.benefits).toEqual(['benefits']);
  });

  it('las claves por usuario incluyen el id', () => {
    expect(queryKeys.userRegistrations('u1')).toEqual(['registrations', 'u1']);
  });
});
