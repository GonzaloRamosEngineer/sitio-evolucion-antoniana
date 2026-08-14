// Tests de storage.js contra un Supabase mockeado.
//
// Los tests de dataResult.js prueban los helpers; estos prueban que la capa los
// **use bien**: que cada función devuelva `{ data, error }`, que no lance nunca y
// que un fallo de la base no se filtre como excepción (ROADMAP 4.1).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Query builder encadenable: cada método devuelve `this` y el thenable final
// resuelve con lo que le pusimos en `queryResult`.
let queryResult;
const lastCall = { table: null, method: null };

const makeQuery = () => {
  const query = {
    select: vi.fn(() => query),
    insert: vi.fn((rows) => {
      lastCall.method = 'insert';
      lastCall.rows = rows;
      return query;
    }),
    update: vi.fn((patch) => {
      lastCall.method = 'update';
      lastCall.patch = patch;
      return query;
    }),
    delete: vi.fn(() => {
      lastCall.method = 'delete';
      return query;
    }),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(queryResult)),
    // Sin `.maybeSingle()` la query se awaitea directo (los getters de listas).
    then: (resolve, reject) => Promise.resolve(queryResult).then(resolve, reject),
  };
  return query;
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      lastCall.table = table;
      return makeQuery();
    }),
  },
}));

const {
  getPartners,
  addPartner,
  updatePartner,
  deletePartner,
  getPartnerById,
  getBenefits,
  getNewsBySlug,
} = await import('@/lib/storage');

const dbError = { message: 'permission denied', code: '42501' };

beforeEach(() => {
  queryResult = { data: null, error: null };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getters de listas', () => {
  it('devuelven las filas en `data`', async () => {
    queryResult = { data: [{ id: 'p1' }], error: null };
    await expect(getPartners()).resolves.toEqual({
      data: [{ id: 'p1' }],
      error: null,
    });
  });

  it('en error devuelven lista vacía y el error, sin lanzar', async () => {
    queryResult = { data: null, error: dbError };
    // Antes `getPartners` lanzaba; ahora el fallo viaja en `error`.
    const { data, error } = await getBenefits();
    expect(data).toEqual([]);
    expect(error).toBe(dbError);
  });
});

describe('getters de fila única', () => {
  it('devuelven null sin error cuando no hay fila', async () => {
    queryResult = { data: null, error: null };
    await expect(getNewsBySlug('no-existe')).resolves.toEqual({
      data: null,
      error: null,
    });
  });

  it('cortocircuitan sin pegarle a la base si falta el identificador', async () => {
    const { supabase } = await import('@/lib/supabase');
    supabase.from.mockClear();

    await expect(getPartnerById(undefined)).resolves.toEqual({
      data: null,
      error: null,
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('mutaciones', () => {
  it('addPartner no pide la fila de vuelta y reporta éxito con data null', async () => {
    queryResult = { data: null, error: null };
    const result = await addPartner({ nombre: 'ACME', contacto_email: 'a@b.com' });

    expect(result).toEqual({ data: null, error: null });
    expect(lastCall.table).toBe('partners');
    expect(lastCall.method).toBe('insert');
    // Default de `orden` aplicado en la capa, no en el consumidor.
    expect(lastCall.rows[0].orden).toBe(1000);
  });

  it('addPartner devuelve el error en vez de `null` a secas', async () => {
    queryResult = { data: null, error: dbError };
    // El contrato viejo devolvía `null`, indistinguible de "no hubo fila":
    // por eso ApplyPartnerPage no podía saber por qué había fallado.
    await expect(addPartner({ nombre: 'ACME' })).resolves.toEqual({
      data: null,
      error: dbError,
    });
  });

  it('updatePartner devuelve la fila actualizada', async () => {
    queryResult = { data: { id: 'p1', estado: 'aprobado' }, error: null };
    await expect(updatePartner('p1', { estado: 'aprobado' })).resolves.toEqual({
      data: { id: 'p1', estado: 'aprobado' },
      error: null,
    });
  });

  it('deletePartner propaga el error en vez de devolverlo como valor', async () => {
    queryResult = { data: null, error: dbError };
    // El contrato viejo devolvía el error *como valor de retorno* (y `null` en
    // éxito), o sea al revés que el resto de la capa.
    await expect(deletePartner('p1')).resolves.toEqual({
      data: null,
      error: dbError,
    });
  });
});
