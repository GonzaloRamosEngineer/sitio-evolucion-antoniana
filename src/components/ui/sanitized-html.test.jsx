// Tests de <SanitizedHtml> (ROADMAP 6.6).
//
// Hasta que existió este componente, la sanitización del contenido de la base
// **no tenía ninguna cobertura**: eran tres llamadas sueltas a
// `DOMPurify.sanitize()` repartidas en las páginas de detalle. Estos tests no
// prueban DOMPurify (eso ya está probado río arriba); prueban que **este
// componente efectivamente lo aplique** y que no se pueda romper esa garantía
// sin que algo se ponga en rojo.
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SanitizedHtml } from '@/components/ui/sanitized-html';

describe('SanitizedHtml', () => {
  it('conserva el HTML enriquecido legítimo', () => {
    const { container } = render(
      <SanitizedHtml html="<p>Hola <strong>mundo</strong></p><ul><li>uno</li></ul>" />
    );

    expect(container.querySelector('strong')).not.toBeNull();
    expect(container.querySelector('li')).not.toBeNull();
    expect(screen.getByText('mundo')).toBeInTheDocument();
  });

  it('elimina las etiquetas <script>', () => {
    const { container } = render(
      <SanitizedHtml html={'<p>texto</p><script>window.__pwned = true;</script>'} />
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('texto');
  });

  it('elimina los manejadores inline (onerror, onclick)', () => {
    const { container } = render(
      <SanitizedHtml html={'<img src="x" onerror="window.__pwned = true"><p onclick="alert(1)">hola</p>'} />
    );

    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('[onclick]')).toBeNull();
  });

  it('neutraliza los href con javascript:', () => {
    const { container } = render(
      <SanitizedHtml html={'<a href="javascript:alert(1)">click</a>'} />
    );

    const href = container.querySelector('a')?.getAttribute('href');
    expect(href ?? '').not.toContain('javascript:');
  });

  it('no renderiza nada si no hay contenido', () => {
    // Importa porque las tres páginas dependen de esto: se sacó el guard
    // `{item.body_md && (...)}` de cada una al migrar a este componente.
    const { container: vacio } = render(<SanitizedHtml html="" />);
    const { container: nulo } = render(<SanitizedHtml html={null} />);
    const { container: indef } = render(<SanitizedHtml html={undefined} />);

    expect(vacio.firstChild).toBeNull();
    expect(nulo.firstChild).toBeNull();
    expect(indef.firstChild).toBeNull();
  });

  it('respeta la etiqueta contenedora y las clases', () => {
    const { container } = render(
      <SanitizedHtml as="article" className="prose" html="<p>x</p>" />
    );

    const root = container.firstChild;
    expect(root.tagName).toBe('ARTICLE');
    expect(root).toHaveClass('prose');
  });
});
