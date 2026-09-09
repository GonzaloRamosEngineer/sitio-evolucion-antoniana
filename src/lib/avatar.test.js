// El default de esta función es una afirmación sobre una persona, así que el
// caso importante no es «mujer→mujer»: es «no dijo→no inventes».
import { describe, it, expect } from 'vitest';
import { avatarPorDefecto, avatarDe } from './avatar';

describe('avatarPorDefecto', () => {
  it('devuelve el dibujo que corresponde a cada género declarado', () => {
    expect(avatarPorDefecto('masculino')).toBe('/img/default-avatar.png');
    expect(avatarPorDefecto('femenino')).toBe('/img/default-avatar-femenino.png');
  });

  it('🔒 NO cae al masculino cuando la persona no lo declaró', () => {
    // El bug que esto cierra: el default era el varón para todo el mundo.
    // `null` significa «usá las iniciales», que no afirma nada.
    for (const valor of ['otro', null, undefined, '', '   ', 'no_binario', 'x']) {
      expect(avatarPorDefecto(valor)).toBeNull();
    }
  });

  it('no se rompe por mayúsculas ni espacios sueltos en la base', () => {
    expect(avatarPorDefecto(' Femenino ')).toBe('/img/default-avatar-femenino.png');
    expect(avatarPorDefecto('MASCULINO')).toBe('/img/default-avatar.png');
  });
});

describe('avatarDe', () => {
  it('la foto propia le gana al dibujo', () => {
    // La URL viene firmada desde `useAvatarUrl`: el bucket es privado.
    expect(avatarDe({ gender: 'masculino' }, 'https://x/f.webp?token=a')).toBe('https://x/f.webp?token=a');
    expect(avatarDe({ gender: 'otro' }, 'https://x/f.webp?token=a')).toBe('https://x/f.webp?token=a');
  });

  it('🔒 NO usa `avatar_url` de la fila: esa columna no existe', () => {
    // Leerla es lo que hacía que el dibujo del varón fuera la única respuesta.
    expect(avatarDe({ avatar_url: 'https://viejo/f.jpg', gender: 'femenino' }))
      .toBe('/img/default-avatar-femenino.png');
  });

  it('sin foto usa el dibujo del género, y sin género devuelve null', () => {
    expect(avatarDe({ gender: 'femenino' })).toBe('/img/default-avatar-femenino.png');
    expect(avatarDe({ gender: 'otro' })).toBeNull();
    expect(avatarDe({})).toBeNull();
    expect(avatarDe(null)).toBeNull();
  });
});
