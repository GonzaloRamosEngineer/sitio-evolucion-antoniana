// Test de humo de cn(): el helper de clases usado en todo el design system.
// Verifica el merge de clases y la resolución de conflictos de Tailwind.
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

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
