import { describe, it, expect } from 'vitest';
import {
  SIN_ACCESO,
  beneficioBloqueado,
  diasHasta,
  estadoAcceso,
  formatearMeses,
  nombreOrigen,
  nombreConcepto,
  fuenteDelAcceso,
  formatearCuotas,
  formatearPesos,
  etiquetaEstado,
  claseEstado,
} from '@/lib/acceso';

describe('beneficioBloqueado', () => {
  const abierto = { requiere_acceso: false };
  const exclusivo = { requiere_acceso: true };
  const conAcceso = { tiene_acceso: true };

  it('no bloquea un beneficio abierto, aunque no haya sesión', () => {
    expect(beneficioBloqueado(abierto, SIN_ACCESO)).toBe(false);
    expect(beneficioBloqueado(abierto, undefined)).toBe(false);
  });

  it('bloquea un beneficio exclusivo sin acceso vigente', () => {
    expect(beneficioBloqueado(exclusivo, SIN_ACCESO)).toBe(true);
    expect(beneficioBloqueado(exclusivo, undefined)).toBe(true);
  });

  it('no bloquea un beneficio exclusivo con acceso vigente', () => {
    expect(beneficioBloqueado(exclusivo, conAcceso)).toBe(false);
  });

  // El default de `requiere_acceso` en la base es false, pero un beneficio
  // viejo puede llegar sin la propiedad: no debe bloquearse por eso.
  it('trata la ausencia del campo como beneficio abierto', () => {
    expect(beneficioBloqueado({ titulo: 'x' }, SIN_ACCESO)).toBe(false);
  });
});

describe('estadoAcceso', () => {
  it('distingue los cuatro estados', () => {
    expect(estadoAcceso(SIN_ACCESO)).toBe('sin_aportes');
    expect(estadoAcceso(undefined)).toBe('sin_aportes');
    expect(estadoAcceso({ tiene_acceso: true, vence_el: '2030-01-01' })).toBe('vigente');
    expect(estadoAcceso({ tiene_acceso: true, vence_el: '2020-01-01', en_gracia: true })).toBe('gracia');
    expect(estadoAcceso({ tiene_acceso: false, vence_el: '2020-01-01' })).toBe('vencido');
  });

  // Quien aportó y venció NO es lo mismo que quien nunca aportó: uno vuelve y
  // el otro todavía no entró. La pantalla les habla distinto.
  it('separa vencido de sin_aportes por la presencia de vence_el', () => {
    expect(estadoAcceso({ tiene_acceso: false, vence_el: null })).toBe('sin_aportes');
  });
});

describe('diasHasta', () => {
  const hoy = new Date(2026, 7, 30); // 30-08-2026, mes 0-indexado

  it('cuenta los días que faltan', () => {
    expect(diasHasta('2026-09-09', hoy)).toBe(10);
  });

  it('devuelve negativo si ya pasó', () => {
    expect(diasHasta('2026-08-20', hoy)).toBe(-10);
  });

  it('devuelve 0 el mismo día', () => {
    expect(diasHasta('2026-08-30', hoy)).toBe(0);
  });

  it('tolera null y fechas inválidas', () => {
    expect(diasHasta(null, hoy)).toBeNull();
    expect(diasHasta('no-es-fecha', hoy)).toBeNull();
  });
});

describe('formatearMeses', () => {
  it('usa singular, plural y años', () => {
    expect(formatearMeses(0)).toBe('menos de un mes');
    expect(formatearMeses(1)).toBe('1 mes');
    expect(formatearMeses(7)).toBe('7 meses');
    expect(formatearMeses(12)).toBe('1 año');
    expect(formatearMeses(19)).toBe('1 año y 7 meses');
    expect(formatearMeses(24)).toBe('2 años');
    expect(formatearMeses(25)).toBe('2 años y 1 mes');
  });

  it('tolera undefined', () => {
    expect(formatearMeses(undefined)).toBe('menos de un mes');
  });
});

describe('nombreOrigen', () => {
  // Los valores salen de `aportes.origen` en la base. Que acá diga 'cuota'
  // —como decía antes de conocer el esquema real— hacía que el carnet
  // etiquetara toda cuota social como "Donación".
  it('traduce los tres orígenes reales del esquema', () => {
    expect(nombreOrigen('membresia')).toBe('Cuota social');
    expect(nombreOrigen('donacion')).toBe('Donación');
    expect(nombreOrigen('manual')).toBe('Aporte registrado por la Fundación');
  });

  it('devuelve null para lo desconocido, para no inventar una etiqueta', () => {
    expect(nombreOrigen('cuota')).toBeNull();
    expect(nombreOrigen(null)).toBeNull();
    expect(nombreOrigen(undefined)).toBeNull();
  });
});

describe('regla 2026-10: donante, concepto y cuotas', () => {
  const sinAcceso = { tiene_acceso: false, vence_el: null, en_gracia: false };
  const donante = { es_donante: true, total_aportado: 20000 };

  it('quien solo donó es "donante", no "sin aportes"', () => {
    expect(estadoAcceso(sinAcceso, donante)).toBe('donante');
    expect(etiquetaEstado(sinAcceso, donante)).toBe('Donante');
    expect(claseEstado(sinAcceso, donante)).toMatch(/brand-gold/);
  });

  it('sin resumen (o sin donaciones) sigue siendo "sin aportes"', () => {
    expect(estadoAcceso(sinAcceso)).toBe('sin_aportes');
    expect(estadoAcceso(sinAcceso, { es_donante: false })).toBe('sin_aportes');
  });

  it('si tuvo cuota, manda el estado de la cuota aunque además done', () => {
    expect(estadoAcceso({ tiene_acceso: false, vence_el: '2026-07-01' }, donante)).toBe('vencido');
    expect(estadoAcceso({ tiene_acceso: true, vence_el: '2026-11-01' }, donante)).toBe('vigente');
  });

  it('nombra el CONCEPTO, y cae al canal solo si la base no lo informa', () => {
    expect(nombreConcepto('cuota_mensual')).toBe('Cuota mensual');
    expect(nombreConcepto('donacion_extraordinaria')).toBe('Donación extraordinaria');
    expect(nombreConcepto('adelanto_cuotas')).toBe('Adelanto de cuotas');
    expect(nombreConcepto('otra')).toBeNull();
    // Una cuota que entró por `donations`: el canal diría «Donación».
    expect(fuenteDelAcceso({ origen: 'donacion', concepto: 'cuota_mensual' })).toBe('Cuota mensual');
    expect(fuenteDelAcceso({ origen: 'membresia', concepto: null })).toBe('Cuota social');
    expect(fuenteDelAcceso(null)).toBeNull();
  });

  it('las cuotas se cuentan como cuotas, con singular', () => {
    expect(formatearCuotas(0)).toBe('0 cuotas');
    expect(formatearCuotas(1)).toBe('1 cuota');
    expect(formatearCuotas(6)).toBe('6 cuotas');
    expect(formatearCuotas(undefined)).toBe('0 cuotas');
  });

  it('formatea pesos como en Argentina', () => {
    expect(formatearPesos(30000)).toBe('$30.000');
    expect(formatearPesos(null)).toBe('$0');
  });

  it('SIN_ACCESO trae concepto en null', () => {
    expect(SIN_ACCESO.concepto).toBeNull();
  });
});

