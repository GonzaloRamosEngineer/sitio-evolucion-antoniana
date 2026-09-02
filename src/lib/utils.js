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
