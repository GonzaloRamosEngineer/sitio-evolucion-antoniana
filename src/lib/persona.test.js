// El caso que originó esto: «Hola, gonzaramosmp@gmail.com» desbordando la
// pantalla de un iPhone, porque `useAuth` cae al email como nombre y un email
// no tiene espacios que cortar.
import { describe, it, expect } from 'vitest';
import { primerNombre } from './persona';

describe('primerNombre', () => {
  it('de un nombre completo toma el primero', () => {
    expect(primerNombre({ name: 'Gonzalo Andrés Ramos' })).toBe('Gonzalo');
  });

  it('🔒 de un email NO devuelve el email entero', () => {
    // `split(' ')[0]` sobre un email devuelve el email completo: 22 caracteres
    // sin un solo espacio, en un h1 con tracking-tighter.
    expect(primerNombre({ name: 'gonzaramosmp@gmail.com' })).toBe('gonzaramosmp');
    expect(primerNombre({ email: 'gonzaramosmp@gmail.com' })).toBe('gonzaramosmp');
  });

  it('el nombre le gana al email', () => {
    expect(primerNombre({ name: 'Gonzalo Ramos', email: 'otro@x.com' })).toBe('Gonzalo');
  });

  it('sin nada usa el respaldo, y no una cadena vacía', () => {
    // Un «Hola, » suelto es peor que un «Hola, Miembro».
    expect(primerNombre({})).toBe('Miembro');
    expect(primerNombre(null)).toBe('Miembro');
    expect(primerNombre({ name: '   ' })).toBe('Miembro');
    expect(primerNombre({ name: '' }, 'Socia')).toBe('Socia');
  });

  it('tolera espacios de más y nombres con varios espacios', () => {
    expect(primerNombre({ name: '  Gonzalo   Ramos ' })).toBe('Gonzalo');
  });
});
