// @vitest-environment node
// «Mi aporte» por WhatsApp: la frontera entre MatchBot y la base de la entidad.
//
// Lo que importa acá no es el formato: es que NADIE sin el secreto reciba datos, que un
// pedido mal formado no llegue a la base, y que un error de la base no viaje hasta el bot.
// Cada rechazo trae su aceptación al lado (un handler que rechaza todo se ve igual de
// «seguro» que uno correcto), y la firma se verifica contra `node:crypto` y no contra sí
// misma: si MatchBot y esta función firmaran distinto, producción daría 401 y las pruebas
// con la misma implementación en ambos lados no se enterarían.
import { createHmac } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { completarEnlaces, handleEstadoCuenta, signEstadoCuenta } from './estadoCuenta.ts';

const SECRET = 'un-secreto-de-prueba-con-mas-de-treinta-y-dos-caracteres';
const SITIO = 'https://sitio.ejemplo.org';
const AHORA = 1_790_000_000_000; // ms
const TS = String(Math.floor(AHORA / 1000));

// Exactamente lo que arma `executeAccountStatus` de MatchBot.
const cuerpo = (extra: Record<string, unknown> = {}, phone = '5493875550001') =>
  JSON.stringify({ action: 'account_status', phone, ...extra });
const firmaIndependiente = (secret: string, ts: string, raw: string) =>
  `v1=${createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')}`;

const STATUS_OK = {
  found: true,
  client_name: 'Ana (Padrino N° 3)',
  open_charges: [{ service: 'Renovación de cuota mensual', amount: 5000, currency: 'ARS', due_date: '2026-11-02', overdue: false, payment_url: null, payment_details: null }],
  last_payment: null,
  summary: { overdue_count: 0, pending_count: 1, next_due: null },
};

function armar(opts: { secret?: string; status?: unknown; throwError?: boolean } = {}) {
  const accountStatus = vi.fn(async () => {
    if (opts.throwError) throw new Error('boom: 5493875550001 password authentication failed');
    return opts.status ?? STATUS_OK;
  });
  const handler = (req: Request) =>
    handleEstadoCuenta(req, { secret: opts.secret ?? SECRET, sitio: SITIO, accountStatus, now: () => AHORA });
  return { accountStatus, handler };
}

async function pedido(raw: string, over: { secret?: string; ts?: string; sig?: string | null; method?: string } = {}) {
  const ts = over.ts ?? TS;
  const sig = over.sig === undefined ? await signEstadoCuenta(over.secret ?? SECRET, ts, raw) : over.sig;
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-matchbot-timestamp': ts };
  if (sig) headers['x-matchbot-signature'] = sig;
  return new Request('https://x.test/estado-de-cuenta', { method: over.method ?? 'POST', headers, body: over.method === 'GET' ? undefined : raw });
}

describe('firma', () => {
  it('es la que firma MatchBot: v1= + HMAC-SHA256 de «<ts>.<cuerpo>» (implementación independiente)', async () => {
    const raw = cuerpo();
    expect(await signEstadoCuenta(SECRET, TS, raw)).toBe(firmaIndependiente(SECRET, TS, raw));
  });
});

describe('autenticación — rechaza lo ilegítimo y NUNCA llega a la base', () => {
  it('un pedido bien firmado pasa (par de todos los rechazos de abajo)', async () => {
    const { handler, accountStatus } = armar();
    const res = await handler(await pedido(cuerpo()));
    expect(res.status).toBe(200);
    expect(accountStatus).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['sin firma', { sig: null }],
    ['firma de otro secreto', { secret: 'otro-secreto-distinto-que-tambien-pasa-los-treinta-y-dos' }],
    ['firma con el cuerpo cambiado', { sig: firmaIndependiente(SECRET, TS, cuerpo({}, '5493875559999')) }],
    ['firma sin el prefijo v1=', { sig: firmaIndependiente(SECRET, TS, cuerpo()).slice(3) }],
    ['timestamp con formato inválido', { ts: 'ayer' }],
  ])('401: %s', async (_nombre, over) => {
    const { handler, accountStatus } = armar();
    const res = await handler(await pedido(cuerpo(), over as any));
    expect(res.status).toBe(401);
    expect(accountStatus).not.toHaveBeenCalled();
  });

  it('401 con timestamp vencido (más de 5 minutos) aunque la firma sea correcta', async () => {
    const viejo = String(Math.floor(AHORA / 1000) - 301);
    const { handler, accountStatus } = armar();
    const res = await handler(await pedido(cuerpo(), { ts: viejo }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('stale_timestamp');
    expect(accountStatus).not.toHaveBeenCalled();
  });

  it('acepta un reloj desfasado dentro de la ventana (par del anterior)', async () => {
    const casi = String(Math.floor(AHORA / 1000) - 299);
    const { handler } = armar();
    expect((await handler(await pedido(cuerpo(), { ts: casi }))).status).toBe(200);
  });

  it('falla CERRADA sin secreto configurado o con uno corto: 503, y nunca datos', async () => {
    for (const secret of ['', 'corto']) {
      const { handler, accountStatus } = armar({ secret });
      const res = await handler(await pedido(cuerpo(), { secret: SECRET }));
      expect(res.status).toBe(503);
      expect(accountStatus).not.toHaveBeenCalled();
    }
  });

  it('sólo POST', async () => {
    const { handler } = armar();
    const res = await handler(await pedido(cuerpo(), { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('413 si el cuerpo excede el máximo, antes de firmar o consultar nada', async () => {
    const { handler, accountStatus } = armar();
    const res = await handler(await pedido(cuerpo({ relleno: 'x'.repeat(3000) })));
    expect(res.status).toBe(413);
    expect(accountStatus).not.toHaveBeenCalled();
  });
});

describe('validación del pedido (ya autenticado)', () => {
  it.each([
    ['JSON inválido', 'no es json', 'invalid_json'],
    ['acción desconocida', JSON.stringify({ action: 'borrar_todo', phone: '5493875550001' }), 'unknown_action'],
    ['sin teléfono', JSON.stringify({ action: 'account_status' }), 'invalid_phone'],
    ['teléfono corto', cuerpo({}, '12345'), 'invalid_phone'],
    ['teléfono con letras', cuerpo({}, '54938755500ab'), 'invalid_phone'],
    ['teléfono demasiado largo', cuerpo({}, '1234567890123456'), 'invalid_phone'],
  ])('400: %s', async (_n, raw, error) => {
    const { handler, accountStatus } = armar();
    const res = await handler(await pedido(raw));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(error);
    expect(accountStatus).not.toHaveBeenCalled();
  });

  it('acepta el teléfono con + y separadores (par de los rechazos)', async () => {
    const { handler, accountStatus } = armar();
    const res = await handler(await pedido(cuerpo({}, '+54 9 387 555-0001')));
    expect(res.status).toBe(200);
    expect(accountStatus).toHaveBeenCalledWith('+54 9 387 555-0001', []);
  });

  it('charge_ids: sólo UUID válidos y como mucho 5', async () => {
    const buenos = Array.from({ length: 7 }, (_, i) => `aaaaaaaa-aaaa-aaaa-aaaa-00000000000${i}`);
    const { handler, accountStatus } = armar();
    await handler(await pedido(cuerpo({ charge_ids: ['no-es-uuid', 42, ...buenos] })));
    expect(accountStatus).toHaveBeenCalledWith('5493875550001', buenos.slice(0, 5));
  });
});

describe('respuesta', () => {
  it('forma que lee MatchBot (ok + tool + status) y sin caché', async () => {
    const { handler } = armar();
    const res = await handler(await pedido(cuerpo()));
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.tool).toBe('account.status');
    expect(body.status.client_name).toBe('Ana (Padrino N° 3)');
  });

  it('los «no encontrado» pasan tal cual: la base ya decidió (not_a_client, ambiguous, restricted)', async () => {
    for (const reason of ['not_a_client', 'ambiguous', 'restricted', 'invalid_phone']) {
      const { handler } = armar({ status: { found: false, reason } });
      const body = await (await handler(await pedido(cuerpo()))).json();
      expect(body.status).toEqual({ found: false, reason });
    }
  });

  it('un error de la base devuelve 503 genérico: no filtra el mensaje ni el teléfono', async () => {
    const { handler } = armar({ throwError: true });
    const res = await handler(await pedido(cuerpo()));
    const texto = await res.text();
    expect(res.status).toBe(503);
    expect(JSON.parse(texto)).toEqual({ ok: false, error: 'unavailable' });
    expect(texto).not.toContain('5493875550001');
    expect(texto).not.toContain('password');
  });
});

describe('completarEnlaces', () => {
  it('pone el destino canónico de renovación y el de «mi cuenta» en los cobros abiertos', () => {
    const r = completarEnlaces(STATUS_OK, SITIO);
    expect(r.open_charges[0].payment_url).toBe(`${SITIO}/colaborar`);
    expect(r.open_charges[0].payment_details).toContain(`${SITIO}/mi/cuenta`);
    expect(r.open_charges[0].payment_url.startsWith('https://')).toBe(true); // lo exige parseAccountStatus
  });

  it('no pisa un enlace que la base ya trajo', () => {
    const conEnlace = { ...STATUS_OK, open_charges: [{ ...STATUS_OK.open_charges[0], payment_url: 'https://otro.test/pagar' }] };
    expect(completarEnlaces(conEnlace, SITIO).open_charges[0].payment_url).toBe('https://otro.test/pagar');
  });

  it('no inventa cobros: sin cobros abiertos queda igual, y un «no encontrado» no se toca', () => {
    const alDia = { ...STATUS_OK, open_charges: [] };
    expect(completarEnlaces(alDia, SITIO)).toEqual(alDia);
    const no = { found: false, reason: 'not_a_client' };
    expect(completarEnlaces(no, SITIO)).toBe(no);
  });

  it('tolera un sitio con barra final (sin doble barra)', () => {
    expect(completarEnlaces(STATUS_OK, `${SITIO}/`).open_charges[0].payment_url).toBe(`${SITIO}/colaborar`);
  });

  it('no muta el objeto que recibe', () => {
    const copia = JSON.parse(JSON.stringify(STATUS_OK));
    completarEnlaces(STATUS_OK, SITIO);
    expect(STATUS_OK).toEqual(copia);
  });
});
