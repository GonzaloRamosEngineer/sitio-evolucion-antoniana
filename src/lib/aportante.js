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
 * El orden expresa confiabilidad:
 *   1. el de la sesión, que Supabase ya verificó;
 *   2. el que escribió a mano quien no tiene sesión, si parece un email;
 *   3. el placeholder, que no identifica a nadie.
 *
 * **Nunca devuelve vacío**: un dato accesorio no puede hacer fallar un cobro.
 * Un email mal escrito degrada a placeholder en silencio, que es exactamente lo
 * mismo que pasaba antes de que existiera el campo — no se pierde nada.
 */
export const emailParaCheckout = (user, emailEscrito = '') => {
  if (user?.email) return user.email;
  if (esEmailPlausible(emailEscrito)) return emailEscrito.trim().toLowerCase();
  return PLACEHOLDER_ANONIMO;
};
