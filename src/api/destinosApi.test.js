import { describe, it, expect } from 'vitest';
import {
  slugify, validarDestino, destinoEfectivo, TIPOS_DESTINO, ESTADOS_DESTINO, VISIBILIDADES,
} from './destinosApi';

describe('slugify', () => {
  it('pasa a minusculas y separa con guiones', () => {
    expect(slugify('Pelotas y Conos')).toBe('pelotas-y-conos');
  });

  it('saca acentos y enie', () => {
    expect(slugify('Campaña de Educación')).toBe('campana-de-educacion');
    expect(slugify('Órtesis para Ramón')).toBe('ortesis-para-ramon');
  });

  it('colapsa separadores y recorta los de los bordes', () => {
    expect(slugify('  ¡Hola,   mundo!  ')).toBe('hola-mundo');
    expect(slugify('a---b')).toBe('a-b');
  });

  it('tolera vacio y undefined', () => {
    expect(slugify('')).toBe('');
    expect(slugify()).toBe('');
  });

  it('acota el largo a 80', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it('no deja caracteres fuera de [a-z0-9-]', () => {
    expect(slugify('Ñandú & Co. #1 (2026)')).toMatch(/^[a-z0-9-]*$/);
  });
});

// Los `value` de estas listas se mandan tal cual a la base: si alguno no
// coincide con su CHECK, el insert falla en runtime con un error feo. Esto ata
// las opciones de la UI al esquema (migración 20260816140000).
describe('las opciones coinciden con los CHECK del esquema', () => {
  it('tipos', () => {
    expect(TIPOS_DESTINO.map((t) => t.value).sort())
      .toEqual(['campana', 'institucional', 'padrinable']);
  });

  it('estados', () => {
    expect(ESTADOS_DESTINO.map((e) => e.value).sort())
      .toEqual(['activo', 'borrador', 'cerrado', 'pausado']);
  });

  it('visibilidades', () => {
    expect(VISIBILIDADES.map((v) => v.value).sort())
      .toEqual(['anonimizado', 'publico']);
  });

  // El default de la base es 'anonimizado' para que un olvido no exponga a
  // nadie. La UI tiene que ofrecerlo primero, por el mismo motivo.
  it('la primera visibilidad ofrecida es la segura', () => {
    expect(VISIBILIDADES[0].value).toBe('anonimizado');
  });

  it('cada opcion trae su texto de ayuda', () => {
    for (const lista of [TIPOS_DESTINO, ESTADOS_DESTINO, VISIBILIDADES]) {
      for (const o of lista) expect(o.ayuda?.length).toBeGreaterThan(0);
    }
  });
});

// `validarDestino` espeja los CHECK de la base para que el usuario vea un
// mensaje claro en vez del error de Postgres. La base sigue siendo la que manda:
// esto es UX, no la frontera de seguridad.
describe('validarDestino', () => {
  const base = {
    nombre: 'X', admite_puntual: true, admite_recurrente: false,
    meta_monto: '', cupos_totales: '', fecha_inicio: '', fecha_fin: '',
  };

  it('acepta un destino minimo valido', () => {
    expect(validarDestino(base)).toEqual({});
  });

  it('exige nombre', () => {
    expect(validarDestino({ ...base, nombre: '   ' }).nombre).toBeTruthy();
  });

  // Espeja destinos_admite_algo_chk: un destino que no admite ninguna forma de
  // aporte no puede recibir nada, asi que es un error de carga.
  it('rechaza un destino que no admite ninguna forma de aporte', () => {
    const e = validarDestino({ ...base, admite_puntual: false, admite_recurrente: false });
    expect(e.admite).toBeTruthy();
  });

  it('rechaza meta y cupos no positivos', () => {
    expect(validarDestino({ ...base, meta_monto: '0' }).meta_monto).toBeTruthy();
    expect(validarDestino({ ...base, cupos_totales: '-5' }).cupos_totales).toBeTruthy();
  });

  it('rechaza un cierre anterior al inicio', () => {
    const e = validarDestino({ ...base, fecha_inicio: '2026-06-01', fecha_fin: '2026-01-01' });
    expect(e.fecha_fin).toBeTruthy();
  });

  it('acepta fechas coherentes y opcionales vacios', () => {
    expect(validarDestino({ ...base, fecha_inicio: '2026-01-01', fecha_fin: '2026-06-01' })).toEqual({});
  });
});

// `destinoEfectivo` se deriva en cada render en vez de sincronizarse con un
// efecto: la lista llega asincrónica y puede cambiar debajo del usuario.
describe('destinoEfectivo', () => {
  const lista = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('respeta lo que el usuario eligio si sigue en la lista', () => {
    expect(destinoEfectivo('b', lista)).toBe('b');
  });

  // El caso que evita el bug: mostrar A y enviar B. Si la campaña elegida se
  // cierra, la eleccion cae al primero y la pantalla lo muestra en el mismo
  // render, no uno despues.
  it('cae al primero si lo elegido ya no esta', () => {
    expect(destinoEfectivo('z', lista)).toBe('a');
  });

  it('cae al primero cuando todavia no eligio nada', () => {
    expect(destinoEfectivo(null, lista)).toBe('a');
  });

  // El primero es el de menor `orden`: la lista viene ordenada por la decision
  // de la entidad, y respetarla es mejor que imponer un default nuestro.
  it('el default es el primero de la lista, no el institucional', () => {
    const conInstitucional = [{ id: 'campana' }, { id: 'inst', tipo: 'institucional' }];
    expect(destinoEfectivo(null, conInstitucional)).toBe('campana');
  });

  it('devuelve null sin destinos, para que la UI no se rompa', () => {
    expect(destinoEfectivo('a', [])).toBeNull();
    expect(destinoEfectivo(null)).toBeNull();
  });
});
