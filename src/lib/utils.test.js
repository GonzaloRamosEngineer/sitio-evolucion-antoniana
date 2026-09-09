// Tests de los helpers de src/lib/utils.js: cn() (clases del design system) y
// el escapado de HTML que usan los formularios públicos al armar mails.
import { describe, it, expect } from 'vitest';
import { cn, escapeHtml, escapeHtmlMultiline, palabraMasLarga, pesos } from '@/lib/utils';

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

describe('pesos — dos decimales SIEMPRE', () => {
  it('🔒 no deja un monto con un solo decimal', () => {
    // El bug real: el panel mostraba «$78.748,7» y son «$78.748,70». Se lee como
    // siete centavos cuando son setenta, en una pantalla cuyo trabajo es que
    // alguien cruce el libro contra un extracto bancario.
    expect(pesos(78748.7)).toBe('$78.748,70');
  });

  it('🔒 también en montos redondos: dice que el importe es exacto', () => {
    // «$400.000» deja la duda de si se redondeó; «$400.000,00» no.
    expect(pesos(400000)).toBe('$400.000,00');
  });

  it('no arrastra más de dos decimales', () => {
    expect(pesos(1.005)).toBe('$1,01');
  });

  it('trata null, undefined y vacío como cero en vez de mostrar NaN', () => {
    expect(pesos(null)).toBe('$0,00');
    expect(pesos(undefined)).toBe('$0,00');
    expect(pesos('')).toBe('$0,00');
  });

  it('acepta el string que viene de un input', () => {
    expect(pesos('400000')).toBe('$400.000,00');
  });
});
