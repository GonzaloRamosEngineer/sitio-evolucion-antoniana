// El caso que dio origen a `erroresPago.js`: el 2026-09-02 alguien intentó
// suscribirse y vio el JSON crudo de MercadoPago dentro de un cartel rojo.
//
// Lo que estos tests fijan no es «hay un mensaje»: es que **el JSON no vuelve a
// llegar a la pantalla** y que el diagnóstico accionable se dice. La diferencia
// entre las dos cosas es la que costó una suscripción.
import { describe, it, expect } from 'vitest';
import { mensajeErrorPago } from '@/lib/erroresPago';

/** El error tal como lo arma `membershipApi` cuando el webhook devuelve 400. */
const errorDeWebhook = (payload, { status = 400 } = {}) =>
  Object.assign(new Error(JSON.stringify(payload)), {
    name: 'WebhookError',
    status,
    payload,
    isColdStart: false,
  });

describe('mensajeErrorPago', () => {
  // ---- EL CASO REAL, con la forma exacta que devolvió MercadoPago ----
  it('reconoce guest_site_mismatch y dice qué hacer', () => {
    const error = errorDeWebhook({
      message: 'invalid_request',
      error: 'bad_request',
      status: 400,
      cause: [{ code: 2034, description: 'guest_site_mismatch' }],
    });

    const { titulo, descripcion, codigo } = mensajeErrorPago(error, { accion: 'suscripcion' });

    expect(codigo).toBe('sitio_distinto');
    expect(titulo).toMatch(/otro país/i);
    // Lo accionable: qué hacer ahora. Sin esto el mensaje es tan inútil como el JSON.
    expect(descripcion).toMatch(/otro email/i);
  });

  it('lo reconoce igual si la firma viene anidada en otra parte', () => {
    // La forma del error de MP no es un contrato nuestro: el reconocimiento no
    // puede depender de que la firma esté en `cause[0].description`.
    const error = errorDeWebhook({ detalle: { extra: ['GUEST_SITE_MISMATCH'] } });
    expect(mensajeErrorPago(error).codigo).toBe('sitio_distinto');
  });

  it('lo reconoce aunque solo quede el mensaje aplastado a string', () => {
    // Un error que no pasó por `readError` (o de una versión anterior) tiene la
    // firma solo dentro de `message`.
    const error = Object.assign(new Error('{"cause":[{"description":"guest_site_mismatch"}]}'), {
      status: 400,
    });
    expect(mensajeErrorPago(error).codigo).toBe('sitio_distinto');
  });

  // ---- LO QUE MÁS VALE: el camino de descarte ----
  it('para un error desconocido usa el texto de MercadoPago, no la estructura', () => {
    const error = errorDeWebhook({
      message: 'Collector user without key enabled for QR',
      error: 'bad_request',
      cause: [],
    });
    const { descripcion } = mensajeErrorPago(error);
    expect(descripcion).toMatch(/Collector user without key/);
    expect(descripcion).not.toMatch(/[{}[\]]/);
  });

  it('prefiere cause[].description, que es más específico que message', () => {
    const error = errorDeWebhook({
      message: 'invalid_request',
      cause: [{ code: 999, description: 'El plan no admite ese periodo' }],
    });
    expect(mensajeErrorPago(error).descripcion).toMatch(/El plan no admite ese periodo/);
  });

  it("no muestra 'bad_request' como si fuera una explicación", () => {
    // Es la categoría HTTP, no lo que pasó. Cambiar un JSON incomprensible por
    // una palabra incomprensible no es traducir.
    const error = errorDeWebhook({ message: 'bad_request', error: 'bad_request' });
    const { descripcion } = mensajeErrorPago(error, { accion: 'suscripcion' });
    expect(descripcion).not.toMatch(/bad_request/);
    expect(descripcion).toMatch(/Volvé a intentar/i);
  });

  // ---- LA REGRESIÓN QUE IMPORTA ----
  it('NUNCA devuelve el JSON crudo, ni cuando no entiende nada', () => {
    const casos = [
      errorDeWebhook({ raro: { muy: { anidado: [1, 2, 3] } } }),
      Object.assign(new Error('{"a":{"b":1}}'), { status: 400 }),
      Object.assign(new Error('[{"x":1}]'), { status: 500 }),
      new Error(''),
      null,
      undefined,
    ];
    for (const error of casos) {
      const { titulo, descripcion } = mensajeErrorPago(error);
      expect(titulo, `titulo con JSON: ${titulo}`).not.toMatch(/[{[]"/);
      expect(descripcion, `descripcion con JSON: ${descripcion}`).not.toMatch(/[{[]"/);
      // Y siempre dice algo: un cartel vacío es igual de inútil.
      expect(descripcion.length).toBeGreaterThan(10);
    }
  });

  // ---- CONTROL POSITIVO: el cold-start no se pisa ----
  it('respeta el mensaje de cold-start, que ya era correcto', () => {
    const error = Object.assign(new Error('El servicio de pagos está iniciándose...'), {
      isColdStart: true,
    });
    const { titulo, codigo } = mensajeErrorPago(error);
    expect(codigo).toBe('cold_start');
    expect(titulo).toMatch(/iniciándose/i);
  });

  // ---- La acción cambia el encabezado, no el diagnóstico ----
  it('distingue donación de suscripción en el mensaje genérico', () => {
    const error = errorDeWebhook({ nada: 'reconocible' });
    expect(mensajeErrorPago(error, { accion: 'donacion' }).titulo).toMatch(/donación/i);
    expect(mensajeErrorPago(error, { accion: 'suscripcion' }).titulo).toMatch(/suscripción/i);
  });
});
