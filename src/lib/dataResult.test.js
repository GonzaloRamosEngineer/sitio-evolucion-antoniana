// Tests del contrato único de la capa de datos (ROADMAP 4.1).
// Lo que se garantiza acá es lo que cada consumidor da por sentado:
// siempre `{ data, error }`, nunca lanza, y `data` de una lista siempre iterable.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listResult, rowResult, voidResult, attempt } from '@/lib/dataResult';

const pgError = { message: 'permission denied', code: '42501' };

describe('listResult', () => {
  it('devuelve la lista con error null cuando sale bien', () => {
    expect(listResult({ data: [1, 2], error: null }, 'ctx')).toEqual({
      data: [1, 2],
      error: null,
    });
  });

  it('normaliza data null a lista vacía', () => {
    expect(listResult({ data: null, error: null }, 'ctx')).toEqual({
      data: [],
      error: null,
    });
  });

  it('en error devuelve lista vacía y conserva el error', () => {
    // Clave del contrato: `data` sigue siendo iterable, así un consumidor que
    // renderiza antes de mirar `error` muestra vacío en vez de romperse.
    const result = listResult({ data: null, error: pgError }, 'ctx');
    expect(result.data).toEqual([]);
    expect(result.error).toBe(pgError);
  });
});

describe('rowResult', () => {
  it('devuelve la fila con error null cuando sale bien', () => {
    expect(rowResult({ data: { id: 1 }, error: null }, 'ctx')).toEqual({
      data: { id: 1 },
      error: null,
    });
  });

  it('trata "no hay fila" como éxito con data null, no como error', () => {
    // Con `.maybeSingle()` el vacío no es error: permite al consumidor
    // distinguir "no encontrado" de "se cayó la consulta".
    expect(rowResult({ data: null, error: null }, 'ctx')).toEqual({
      data: null,
      error: null,
    });
  });

  it('en error devuelve data null y conserva el error', () => {
    const result = rowResult({ data: null, error: pgError }, 'ctx');
    expect(result.data).toBeNull();
    expect(result.error).toBe(pgError);
  });
});

describe('voidResult', () => {
  it('devuelve data null y error null cuando sale bien', () => {
    expect(voidResult({ error: null }, 'ctx')).toEqual({ data: null, error: null });
  });

  it('conserva el error', () => {
    expect(voidResult({ error: pgError }, 'ctx')).toEqual({
      data: null,
      error: pgError,
    });
  });
});

describe('attempt', () => {
  it('envuelve el valor devuelto', async () => {
    await expect(attempt(async () => 'ok', 'ctx')).resolves.toEqual({
      data: 'ok',
      error: null,
    });
  });

  it('captura la excepción en vez de propagarla', async () => {
    const boom = new Error('boom');
    await expect(attempt(async () => { throw boom; }, 'ctx')).resolves.toEqual({
      data: null,
      error: boom,
    });
  });

  it('preserva la instancia original y sus flags propios', async () => {
    // De esto depende que `isColdStart` de WebhookError llegue al consumidor.
    class WebhookishError extends Error {
      constructor() {
        super('dormido');
        this.isColdStart = true;
      }
    }
    const { error } = await attempt(async () => {
      throw new WebhookishError();
    }, 'ctx');

    expect(error).toBeInstanceOf(WebhookishError);
    expect(error.isColdStart).toBe(true);
  });
});

describe('logging de fallos', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loguea el contexto una sola vez por fallo', () => {
    listResult({ data: null, error: pgError }, 'getPartners');
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('[data] getPartners:', pgError);
  });

  it('no loguea nada cuando sale bien', () => {
    listResult({ data: [], error: null }, 'getPartners');
    rowResult({ data: null, error: null }, 'getNewsBySlug');
    expect(console.error).not.toHaveBeenCalled();
  });
});
