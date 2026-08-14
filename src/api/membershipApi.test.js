// Tests de la resiliencia del proxy a Render (ROADMAP 4.3).
// El free-tier de Render duerme: hay que reintentar los fallos transitorios y
// distinguirlos de un error real del negocio (4xx), que no se reintenta.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// El módulo importa el cliente Supabase en el nivel superior; no lo usa en las
// funciones que probamos acá, así que lo stubbeamos para que el test sea hermético.
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { createOneTimeDonation, WebhookError, COLD_START_MESSAGE } from '@/api/membershipApi';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const donate = () =>
  createOneTimeDonation({ userId: 'u1', emailUsuario: 'a@b.com', amount: 1000 });

/** Deja correr los backoff entre reintentos (800ms + 2500ms) con timers falsos. */
const flushRetries = () => vi.advanceTimersByTimeAsync(5000);

describe('callWebhook (vía createOneTimeDonation)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('devuelve el JSON cuando el primer intento sale bien', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { init_point: 'https://mp/checkout' }));

    const promise = donate();
    await flushRetries();

    await expect(promise).resolves.toEqual({
      data: { init_point: 'https://mp/checkout' },
      error: null,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reintenta un 503 y devuelve el resultado del intento exitoso', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { init_point: 'https://mp/checkout' }));

    const promise = donate();
    await flushRetries();

    await expect(promise).resolves.toEqual({
      data: { init_point: 'https://mp/checkout' },
      error: null,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reintenta los fallos de red y termina avisando del cold-start', async () => {
    fetch.mockRejectedValue(new Error('Failed to fetch'));

    const promise = donate();
    await flushRetries();
    const { data, error } = await promise;

    expect(data).toBeNull();
    expect(error).toMatchObject({ isColdStart: true, message: COLD_START_MESSAGE });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('no reintenta un 4xx y propaga el mensaje del servidor', async () => {
    fetch.mockResolvedValue(jsonResponse(400, { error: 'Monto inválido' }));

    const promise = donate();
    await flushRetries();
    const { data, error } = await promise;

    expect(data).toBeNull();
    expect(error).toMatchObject({
      isColdStart: false,
      status: 400,
      message: 'Monto inválido',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('aborta el intento que se cuelga y lo trata como transitorio', async () => {
    // Un fetch que nunca resuelve: solo el AbortSignal del timeout lo corta.
    fetch.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );

    const promise = donate();
    // 10s del primer intento + 25s de cada reintento + los dos backoff.
    await vi.advanceTimersByTimeAsync(70000);
    const { error } = await promise;

    expect(error).toBeInstanceOf(WebhookError);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('serializa el error del servidor cuando no es un string', async () => {
    fetch.mockResolvedValue(jsonResponse(422, { error: { code: 'invalid_payer' } }));

    const promise = donate();
    await flushRetries();
    const { error } = await promise;

    expect(error.message).toBe('{"code":"invalid_payer"}');
  });

  it('nunca lanza: los fallos vuelven en `error` (contrato de la capa)', async () => {
    fetch.mockRejectedValue(new Error('boom'));

    const promise = donate();
    await flushRetries();

    // Si escapara una excepción, este await rompería el test en vez de resolver.
    await expect(promise).resolves.toMatchObject({ data: null });
  });
});
