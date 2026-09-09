// Lo que se prueba acá no es «devuelve un número»: es que el rectángulo que se
// va a guardar NUNCA se sale del bitmap. Un `drawImage` con la fuente afuera no
// falla, rellena con transparente — y eso es una franja gris al lado de la cara
// de alguien, descubierta después de subir la foto.
import { describe, it, expect } from 'vitest';
import { escalaCover, limitarOffset, rectoFuente, reencuadrar, offsetCentrado, LADO_SALIDA } from './recorte';

describe('escalaCover', () => {
  it('lleva el lado CORTO al tamaño del visor', () => {
    // Horizontal: manda el alto.
    expect(escalaCover(300, 1200, 600)).toBe(0.5);
    // Vertical: manda el ancho.
    expect(escalaCover(300, 600, 1200)).toBe(0.5);
    // Cuadrada: los dos dan lo mismo.
    expect(escalaCover(300, 600, 600)).toBe(0.5);
  });

  it('devuelve 0 con medidas que todavía no existen', () => {
    // El caso real: el <img> no disparó `load` y `naturalWidth` es 0.
    expect(escalaCover(300, 0, 0)).toBe(0);
    expect(escalaCover(0, 600, 600)).toBe(0);
    expect(escalaCover(300, 600, undefined)).toBe(0);
  });
});

describe('limitarOffset', () => {
  const base = { lado: 300, iw: 1200, ih: 600, escala: 0.5 }; // pintada 600x300

  it('no deja arrastrar más allá del borde de la imagen', () => {
    // A la derecha del todo: ox no puede pasar de 0.
    expect(limitarOffset({ ...base, ox: 50, oy: 0 }).ox).toBe(0);
    // A la izquierda del todo: ox no puede bajar de 300 - 600 = -300.
    expect(limitarOffset({ ...base, ox: -9999, oy: 0 }).ox).toBe(-300);
  });

  it('con la imagen justo del tamaño del visor no hay nada que arrastrar', () => {
    const r = limitarOffset({ lado: 300, iw: 300, ih: 300, escala: 1, ox: -80, oy: 40 });
    expect(r).toEqual({ ox: 0, oy: 0 });
  });

  it('trata un offset no numérico como 0 en vez de propagar NaN', () => {
    // Un NaN acá viaja hasta `drawImage` y pinta un cuadro vacío.
    expect(limitarOffset({ ...base, ox: NaN, oy: undefined })).toEqual({ ox: 0, oy: 0 });
  });
});

describe('rectoFuente', () => {
  it('sin zoom ni arrastre toma la franja central del lado corto', () => {
    // 1200x600 en un visor de 300: escala cover 0.5, la imagen pintada mide
    // 600x300, así que centrarla es ox = -150.
    const r = rectoFuente({ lado: 300, iw: 1200, ih: 600, escala: 0.5, ox: -150, oy: 0 });
    expect(r).toEqual({ sx: 300, sy: 0, sw: 600, sh: 600 });
  });

  it('el zoom recorta MENOS imagen, no más', () => {
    const sinZoom = rectoFuente({ lado: 300, iw: 600, ih: 600, escala: 0.5, ox: 0, oy: 0 });
    const conZoom = rectoFuente({ lado: 300, iw: 600, ih: 600, escala: 1, ox: -150, oy: -150 });
    expect(sinZoom.sw).toBe(600); // toda la imagen
    expect(conZoom.sw).toBe(300); // la mitad
  });

  it('🔒 el rectángulo NUNCA se sale del bitmap, ni forzando el arrastre', () => {
    const casos = [
      { lado: 300, iw: 1200, ih: 600, escala: 0.5, ox: 9999, oy: 9999 },
      { lado: 300, iw: 1200, ih: 600, escala: 0.5, ox: -9999, oy: -9999 },
      { lado: 288, iw: 1254, ih: 1254, escala: 288 / 1254, ox: -0.0001, oy: -0.0001 },
      { lado: 288, iw: 4032, ih: 3024, escala: 288 / 3024, ox: -1e9, oy: 0 },
    ];
    for (const c of casos) {
      const r = rectoFuente(c);
      expect(r.sx).toBeGreaterThanOrEqual(0);
      expect(r.sy).toBeGreaterThanOrEqual(0);
      expect(r.sx + r.sw).toBeLessThanOrEqual(c.iw + 1e-9);
      expect(r.sy + r.sh).toBeLessThanOrEqual(c.ih + 1e-9);
    }
  });

  it('devuelve null con medidas incompletas, en vez de un recorte inventado', () => {
    expect(rectoFuente({ lado: 300, iw: 0, ih: 0, escala: 1, ox: 0, oy: 0 })).toBeNull();
    expect(rectoFuente({ lado: 300, iw: 600, ih: 600, escala: 0, ox: 0, oy: 0 })).toBeNull();
  });

  it('el recorte es cuadrado siempre, que es lo que el avatar necesita', () => {
    const r = rectoFuente({ lado: 288, iw: 4032, ih: 3024, escala: 288 / 3024, ox: -100, oy: 0 });
    expect(r.sw).toBeCloseTo(r.sh, 6);
    expect(LADO_SALIDA).toBe(512);
  });
});

describe('reencuadrar', () => {
  const base = { lado: 300, iw: 600, ih: 600 };

  it('🔒 el punto del centro del visor sigue en el centro después del zoom', () => {
    // Esto es TODO el sentido de la función: sin ella la cara se escapa a una
    // esquina en cada paso del deslizador.
    const antes = { ...base, escala: 0.5, ox: -30, oy: -60 };
    const centroAntes = { x: (-antes.ox + 150) / 0.5, y: (-antes.oy + 150) / 0.5 };

    const { ox, oy } = reencuadrar({ ...antes, escalaNueva: 1 });
    const centroDespues = { x: (-ox + 150) / 1, y: (-oy + 150) / 1 };

    expect(centroDespues.x).toBeCloseTo(centroAntes.x, 6);
    expect(centroDespues.y).toBeCloseTo(centroAntes.y, 6);
  });

  it('respeta el límite del borde aunque el centro pida más', () => {
    // Alejando hasta el mínimo, el único encuadre válido es el centrado.
    const r = reencuadrar({ ...base, escala: 2, ox: -900, oy: 0, escalaNueva: 0.5 });
    expect(r).toEqual({ ox: 0, oy: 0 });
  });

  it('con una escala imposible no toca el encuadre', () => {
    expect(reencuadrar({ ...base, escala: 0, ox: -10, oy: -20, escalaNueva: 1 })).toEqual({ ox: -10, oy: -20 });
  });
});

describe('offsetCentrado', () => {
  it('centra la franja que sobra del lado largo', () => {
    // 1200x600 a escala 0.5 mide 600x300 en un visor de 300: sobran 300 de ancho.
    expect(offsetCentrado({ lado: 300, iw: 1200, ih: 600, escala: 0.5 })).toEqual({ ox: -150, oy: 0 });
  });
});
