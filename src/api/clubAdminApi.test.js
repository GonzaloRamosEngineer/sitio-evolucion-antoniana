import { describe, it, expect } from 'vitest';
import {
  slugify,
  validarComercio,
  validarBeneficio,
  beneficioAPayload,
} from '@/api/clubAdminApi';

describe('slugify', () => {
  it('produce un slug que el CHECK de la migración acepta', () => {
    const s = slugify('DigitalMatch Global');
    expect(s).toBe('digitalmatch-global');
    expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('saca acentos y signos, que es donde se rompe el CHECK', () => {
    expect(slugify('Café & Té — Salta')).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slugify('  ¡Hola!  ')).toBe('hola');
  });
});

describe('validarComercio', () => {
  it('acepta uno válido', () => {
    expect(validarComercio({ nombre: 'DigitalMatch Global', slug: 'digitalmatch-global' })).toEqual({});
  });

  it('exige nombre y slug', () => {
    const e = validarComercio({ nombre: '  ', slug: '' });
    expect(e.nombre).toBeTruthy();
    expect(e.slug).toBeTruthy();
  });

  // Sin esto el error llega como un fallo de CHECK de Postgres, sin traducir.
  it('rechaza un slug con mayúsculas, espacios o acentos', () => {
    expect(validarComercio({ nombre: 'X', slug: 'Digital Match' }).slug).toBeTruthy();
    expect(validarComercio({ nombre: 'X', slug: 'café' }).slug).toBeTruthy();
    expect(validarComercio({ nombre: 'X', slug: '-mal-' }).slug).toBeTruthy();
  });
});

describe('validarBeneficio', () => {
  const base = {
    titulo: '30% en desarrollo web',
    tipo: 'porcentaje',
    valor: 30,
    limite_por_persona: '',
    ventana: '',
    limite_total: '',
    stock: '',
    vigencia_desde: '',
    vigencia_hasta: '',
    hora_desde: '',
    hora_hasta: '',
  };

  it('acepta uno válido', () => {
    expect(validarBeneficio(base)).toEqual({});
  });

  it('un porcentaje o un monto fijo necesitan valor', () => {
    expect(validarBeneficio({ ...base, valor: '' }).valor).toBeTruthy();
    expect(validarBeneficio({ ...base, tipo: 'monto_fijo', valor: '' }).valor).toBeTruthy();
  });

  it('un 2x1 o un regalo NO necesitan valor', () => {
    expect(validarBeneficio({ ...base, tipo: '2x1', valor: '' })).toEqual({});
    expect(validarBeneficio({ ...base, tipo: 'regalo', valor: '' })).toEqual({});
  });

  it('un porcentaje no pasa de 100', () => {
    expect(validarBeneficio({ ...base, valor: 130 }).valor).toBeTruthy();
    expect(validarBeneficio({ ...base, valor: 100 })).toEqual({});
  });

  // El CHECK `club_beneficios_limite_chk` exige los dos o ninguno.
  it('el límite y la ventana van juntos o ninguno', () => {
    expect(validarBeneficio({ ...base, limite_por_persona: 1, ventana: '' }).ventana).toBeTruthy();
    expect(validarBeneficio({ ...base, limite_por_persona: '', ventana: 'dia' }).limite_por_persona).toBeTruthy();
    expect(validarBeneficio({ ...base, limite_por_persona: 1, ventana: 'total' })).toEqual({});
  });

  it('rechaza fechas y horas dadas vuelta', () => {
    expect(validarBeneficio({ ...base, vigencia_desde: '2026-09-10', vigencia_hasta: '2026-09-01' }).vigencia_hasta).toBeTruthy();
    expect(validarBeneficio({ ...base, hora_desde: '18:00', hora_hasta: '09:00' }).hora_hasta).toBeTruthy();
  });
});

describe('beneficioAPayload', () => {
  // Los '' del formulario tienen que llegar como NULL: un '' en una columna
  // numérica o de fecha revienta el insert con un error de Postgres.
  it('convierte los vacíos en null y los números en números', () => {
    const p = beneficioAPayload({
      comercio_id: 'c1',
      titulo: '  30% OFF  ',
      descripcion: '',
      terminos: '  texto  ',
      tipo: 'porcentaje',
      valor: '30',
      requiere_acceso: true,
      limite_por_persona: '1',
      ventana: 'total',
      limite_total: '',
      stock: '',
      vigencia_desde: '',
      vigencia_hasta: '',
      dias_semana: [],
      hora_desde: '',
      hora_hasta: '',
      estado: 'activo',
      orden: '',
    });

    expect(p.titulo).toBe('30% OFF');
    expect(p.terminos).toBe('texto');
    expect(p.descripcion).toBeNull();
    expect(p.valor).toBe(30);
    expect(p.limite_por_persona).toBe(1);
    expect(p.ventana).toBe('total');
    expect(p.limite_total).toBeNull();
    expect(p.stock).toBeNull();
    expect(p.vigencia_desde).toBeNull();
    expect(p.dias_semana).toBeNull(); // array vacío -> null, no []
    expect(p.hora_desde).toBeNull();
    expect(p.orden).toBe(0);
  });

  it('conserva los días de la semana cuando hay', () => {
    expect(beneficioAPayload({ ...{ tipo: '2x1', titulo: 'x', estado: 'activo' }, dias_semana: [1, 2] }).dias_semana)
      .toEqual([1, 2]);
  });
});
