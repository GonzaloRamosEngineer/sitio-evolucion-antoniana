import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

/**
 * Escapa texto para interpolarlo en el `html_content` de los mails que arman los
 * formularios públicos. Sin esto, cualquiera puede inyectar markup (o un enlace
 * disfrazado) en el mail que recibe la Fundación.
 */
export function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Igual que `escapeHtml`, pero preserva los saltos de línea como `<br>`. */
export function escapeHtmlMultiline(value) {
	return escapeHtml(value).replace(/\r?\n/g, '<br>');
}
/**
 * La palabra más larga de un texto, en caracteres.
 *
 * POR QUÉ EXISTE. Un título grande en una columna angosta desborda cuando el
 * dato trae una palabra que no entra — "DigitalMatchGlobal", 18 caracteres sin
 * espacios. Lo que NO sirve es medir el largo total: "Fundación Cooperadora del
 * Hospital" son 34 caracteres y envuelve perfecto, porque tiene espacios.
 *
 * Con esto, la pantalla puede elegir el tamaño del título según lo que de
 * verdad puede desbordar. Y la alternativa que se descartó: `hyphens-auto`
 * parte la palabra con guión —"DigitalMatchGlo-bal"— y **partir un nombre
 * propio con guión es peor que el recorte que venía a arreglar** (§12.10.21).
 */
export function palabraMasLarga(texto) {
  return String(texto ?? '')
    .trim()
    .split(/\s+/)
    .reduce((max, palabra) => Math.max(max, palabra.length), 0);
}

/**
 * Un monto en pesos, siempre con dos decimales.
 *
 * ⚠️ POR QUÉ ESTO ES UNA FUNCIÓN COMPARTIDA Y NO UNA LÍNEA EN CADA PANTALLA.
 *
 * Al 2026-09-08 había **cuatro** formateadores distintos en el proyecto y no
 * coincidían: `Rendicion` fijaba dos decimales, `ImportarMovimientos` fijaba el
 * mínimo, y `AportesAdmin` y `GastosAdmin` **no fijaban ninguno**. Con eso, el
 * panel de gastos mostraba
 *
 *     $78.748,7      cuando el monto es      $78.748,70
 *
 * y eso no es un detalle tipográfico: **se lee como siete centavos cuando son
 * setenta.** En una pantalla cuyo trabajo es que alguien cruce el libro contra un
 * extracto bancario, un decimal que aparece y desaparece hace dudar del número
 * entero. Lo encontró el dueño mirando la línea del saldo al corregir un gasto.
 *
 * Dos decimales SIEMPRE, incluso en montos redondos: `$400.000,00` dice «esto es
 * un importe exacto», y `$400.000` deja la pregunta de si se redondeó.
 */
export function pesos(n) {
  const v = Number(n || 0);
  // ⚠️ EL SIGNO VA ANTES DEL PESO: `-$1.428,00`, no `$-1.428,00`.
  // Interpolando el número formateado directamente sale el signo en el medio,
  // que en castellano se lee como un error de la página antes que como un
  // negativo. Apareció en producción el 2026-09-08, en el único destino donde
  // lo rendido supera lo recaudado.
  const signo = v < 0 ? '-' : '';
  return `${signo}$${Math.abs(v).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
