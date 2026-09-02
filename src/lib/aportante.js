// src/lib/aportante.js
//
// Quién dice ser quien aporta, y qué email viaja al checkout.
//
// POR QUÉ ESTO NO ESTÁ INLINE EN LA PÁGINA
// De esta decisión depende que un aporte se pueda atribuir a una persona, y el
// 2026-08-30 se midió cuánto cuesta equivocarse: de cinco donaciones reales,
// tres no dejaron ningún rastro (§10.18). La regla va en un lugar, con pruebas.

/**
 * El email que se manda cuando no hay ningún dato real.
 *
 * ⚠️ NO ES UN EMAIL DE NADIE, y el sistema lo trata como tal a propósito: el
 * webhook lo descarta explícitamente (`lib/pagador.js` en el servicio de pagos)
 * en vez de guardarlo en `donations.payer_email`. Guardarlo sería **peor que
 * guardar nada**: es idéntico para todas las personas anónimas, así que
 * cualquier reconciliación por email juntaría a varias en una sola identidad.
 *
 * Existe porque `/api/crear-preferencia` exige `payer.email` y responde 400 sin
 * él. Sacarlo cambia el contrato del endpoint que cobra, y eso es un cambio con
 * riesgo sobre el cobro que merece su propia verificación (§10.18, punto 4).
 */
export const PLACEHOLDER_ANONIMO = 'anon@fundacion.com';

/**
 * ¿Esto parece un email?
 *
 * Deliberadamente permisiva —algo, arroba, algo, punto, algo— y no una
 * implementación de RFC 5322. El costo de los dos errores no es simétrico: dar
 * por bueno un email raro no rompe nada (el webhook lo valida de nuevo antes de
 * guardarlo), mientras que rechazar uno real le hace perder a esa persona la
 * única forma de reclamar su aporte.
 */
export const esEmailPlausible = (valor) =>
  typeof valor === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());

/**
 * El email que viaja al checkout de MercadoPago.
 *
 * El orden expresa **para qué sirve cada uno**:
 *   1. el que la persona escribió a mano, si parece un email;
 *   2. el de la sesión, que Supabase ya verificó;
 *   3. el placeholder, que no identifica a nadie.
 *
 * ⚠️ **El escrito le gana al de la sesión, y eso es un cambio del 2026-09-02**
 * (§10.24). Antes, con sesión iniciada, esta función devolvía `user.email` y no
 * había forma de usar otro. Parecía lo correcto —el de la sesión está
 * verificado— hasta que apareció el caso real: el email del dueño del proyecto
 * está registrado en **MercadoPago Uruguay**, y una cuenta de otro país no
 * puede pagarle a un cobrador argentino. MercadoPago devolvía
 * `guest_site_mismatch` y la persona quedaba **sin ninguna salida dentro del
 * sitio**: el único email posible era el que no funcionaba.
 *
 * Y no cuesta nada, porque **la atribución no viaja por acá**. Verificado en el
 * servicio de pagos: `external_reference` se arma con `user_id`, `kind` y
 * `destino_id` (`lib/destino.js`), sin mirar `payer_email`. El aporte queda a
 * nombre de la sesión aunque el pago salga de otra cuenta de MercadoPago — que
 * es, además, lo que pasa cuando alguien paga con la tarjeta de un familiar.
 *
 * `payer_email` sirve para otra cosa: es el único rastro de identidad cuando NO
 * hay sesión (§10.18). Con sesión es un dato del medio de pago, no de quién
 * aporta.
 *
 * **Nunca devuelve vacío**: un dato accesorio no puede hacer fallar un cobro.
 * Un email mal escrito degrada al de la sesión —o al placeholder— en silencio.
 */
export const emailParaCheckout = (user, emailEscrito = '') => {
  if (esEmailPlausible(emailEscrito)) return emailEscrito.trim().toLowerCase();
  if (user?.email) return user.email;
  return PLACEHOLDER_ANONIMO;
};
