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