// src/components/ui/sanitized-html.jsx
//
// Único lugar donde se inyecta HTML de la base al DOM (ROADMAP 6.6).
//
// El motivo no es sólo no repetir el `dangerouslySetInnerHTML`: es tener **un
// punto donde endurecer la sanitización**. En agosto de 2026 hubo que subir
// `dompurify` por tres bypasses de XSS, y ese día se vio el costo de tener la
// llamada suelta en cada página — cualquier mitigación (restringir etiquetas,
// prohibir atributos, quitar un vector puntual) habría que aplicarla N veces y
// alcanzaría con olvidarse de una para no haber mitigado nada.
//
// Se usa la configuración por defecto de DOMPurify a propósito: ya bloquea
// `<script>`, los `on*` y las URLs `javascript:`, y restringirla más rompería
// el contenido enriquecido que carga la Fundación (listas, citas, imágenes).
// Si en algún momento hace falta endurecerla, se hace acá.
import React from 'react';
import DOMPurify from 'dompurify';

/**
 * @param {string} html      HTML crudo que viene de la base.
 * @param {string} className Clases del contenedor (típicamente las de `prose`).
 * @param {string} as        Etiqueta del contenedor. Por defecto `div`.
 */
const SanitizedHtml = ({ html, className = '', as: Tag = 'div', ...props }) => {
  if (!html) return null;

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
      {...props}
    />
  );
};

export { SanitizedHtml };
