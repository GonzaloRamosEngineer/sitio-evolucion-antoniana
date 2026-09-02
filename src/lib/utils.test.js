// Tests de los helpers de src/lib/utils.js: cn() (clases del design system) y
// el escapado de HTML que usan los formularios públicos al armar mails.
import { describe, it, expect } from 'vitest';
import { cn, escapeHtml, escapeHtmlMultiline, palabraMasLarga } from '@/lib/utils';

describe('cn', () => {
  it('combina clases sueltas', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('descarta valores falsy y condicionales', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c');
  });

  it('resuelve conflictos de Tailwind quedándose con la última', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

describe('escapeHtml', () => {
  it('neutraliza el markup inyectado', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('escapa comillas y ampersands', () => {
    expect(escapeHtml(`Ana & "Bob" don't`)).toBe(
      'Ana &amp; &quot;Bob&quot; don&#39;t'
    );
  });

  it('trata null/undefined como cadena vacía', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('no escapa los saltos de línea', () => {
    expect(escapeHtml('a\nb')).toBe('a\nb');
  });
});

describe('escapeHtmlMultiline', () => {
  it('convierte los saltos de línea en <br> después de escapar', () => {
    expect(escapeHtmlMultiline('<b>uno\ndos')).toBe('&lt;b&gt;uno<br>dos');
  });

  it('normaliza CRLF', () => {
    expect(escapeHtmlMultiline('uno\r\ndos')).toBe('uno<br>dos');
  });
});

describe('palabraMasLarga', () => {
  it('mide la palabra más larga, no el largo total — que es el punto', () => {
    // El caso real: 18 caracteres sin espacios, desbordaba el título.
    expect(palabraMasLarga('DigitalMatchGlobal')).toBe(18);
    // Más del doble de largo TOTAL, pero envuelve perfecto: 11 es su máximo.
    expect(palabraMasLarga('Fundación Cooperadora del Hospital')).toBe(11);
  });

  it('ignora espacios de sobra y saltos', () => {
    expect(palabraMasLarga('  hola   mundoLargo  ')).toBe(10);
    expect(palabraMasLarga('uno\ndoscientos')).toBe(10);
  });

  it('no explota con vacío ni con nulo', () => {
    for (const v of ['', '   ', null, undefined]) expect(palabraMasLarga(v)).toBe(0);
  });
});
