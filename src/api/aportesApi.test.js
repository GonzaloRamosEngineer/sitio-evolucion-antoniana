import { describe, it, expect, vi } from 'vitest';
import {
  validarAporte, aPayloadAporte, describirOrigen, hoyISO, ORIGENES_APORTE,
  referenciaSaldoInicial,
} from './aportesApi';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const base = {
  destino_id: 'd1',
  monto: '5000',
  fecha: '2026-08-16',
  nombre_aportante: 'Ana',
  email_aportante: '',
  notas: '',
};

// `validarAporte` espeja los CHECK de la base para que el usuario vea un mensaje
// claro en vez del error de Postgres. La base sigue siendo la que manda.
describe('validarAporte', () => {
  it('acepta un aporte minimo valido', () => {
    expect(validarAporte(base)).toEqual({});
  });

  // aportes.destino_id es NOT NULL: sin destino la base rechaza el insert.
  it('exige destino', () => {
    expect(validarAporte({ ...base, destino_id: '' }).destino_id).toBeTruthy();
  });

  // Espeja el CHECK `monto > 0`.
  it('rechaza monto cero, negativo o no numerico', () => {
    expect(validarAporte({ ...base, monto: '0' }).monto).toBeTruthy();
    expect(validarAporte({ ...base, monto: '-100' }).monto).toBeTruthy();
    expect(validarAporte({ ...base, monto: '' }).monto).toBeTruthy();
    expect(validarAporte({ ...base, monto: 'mil' }).monto).toBeTruthy();
  });

  it('exige fecha', () => {
    expect(validarAporte({ ...base, fecha: '' }).fecha).toBeTruthy();
  });

  // Un aporte en efectivo sin mail tiene que poder cargarse: perder el registro
  // es peor que no tener el mail.
  it('el mail es opcional', () => {
    expect(validarAporte({ ...base, email_aportante: '' })).toEqual({});
  });

  it('avisa si el mail que si pusieron esta mal', () => {
    expect(validarAporte({ ...base, email_aportante: 'ana' }).email_aportante).toBeTruthy();
  });
});

describe('aPayloadAporte', () => {
  // La RLS solo deja insertar `origen = 'manual'`. Que salga fijo del payload
  // y no del formulario evita que alguien marque como `donacion` algo que la
  // pasarela nunca vio.
  it('fuerza origen manual y no lo toma del formulario', () => {
    expect(aPayloadAporte({ ...base, origen: 'donacion' }).origen).toBe('manual');
  });

  it('convierte el monto a numero', () => {
    expect(aPayloadAporte(base).monto).toBe(5000);
  });

  // Los vacios van como null, nunca como '': una cadena vacia en la base es un
  // dato que parece existir y no existe.
  it('manda null en vez de cadena vacia', () => {
    const p = aPayloadAporte({ ...base, nombre_aportante: '  ', email_aportante: '', notas: '' });
    expect(p.nombre_aportante).toBeNull();
    expect(p.email_aportante).toBeNull();
    expect(p.notas).toBeNull();
  });

  // El CHECK `aportes_origen_chk` exige que un aporte manual no tenga ninguna
  // de las dos FK. Mandarlas rompería el insert.
  it('no manda donation_id ni membership_id', () => {
    const p = aPayloadAporte(base);
    expect(p).not.toHaveProperty('donation_id');
    expect(p).not.toHaveProperty('membership_id');
  });
});

describe('describirOrigen', () => {
  // Los value tienen que coincidir con el CHECK del esquema (migracion
  // 20260816140000): si alguno no coincide, el insert falla en runtime.
  it('cubre exactamente los origenes del esquema', () => {
    expect(Object.keys(ORIGENES_APORTE).sort()).toEqual(['donacion', 'manual', 'membresia']);
  });

  // Un origen desconocido no puede romper la lista: se muestra tal cual.
  it('degrada sin romperse ante un origen que no conoce', () => {
    expect(describirOrigen('cripto').label).toBe('cripto');
    expect(describirOrigen(null).label).toBe('sin origen');
  });
});

describe('hoyISO', () => {
  it('devuelve el formato que espera un input date', () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});


// El saldo inicial (§14.3). Lo que fijan estos tests no es que el tilde funcione:
// es que la referencia **no se pueda escribir a mano**. `referencia_externa` es la
// clave de idempotencia de las importaciones, y una referencia `mp:*` puesta en un
// aporte manual bloquearía para siempre la importación de ese movimiento real.
describe('saldo inicial', () => {
  const base = {
    destino_id: 'd1', monto: '1000000', fecha: '2024-10-10',
    nombre_aportante: 'Centro Juventud Antoniana', email_aportante: '', notas: '',
  };

  it('sin el tilde no pone ninguna referencia', () => {
    expect(aPayloadAporte(base, 'fondo-convenio-2024').referencia_externa).toBeNull();
  });

  it('con el tilde la deriva del slug del destino', () => {
    const p = aPayloadAporte({ ...base, es_saldo_inicial: true }, 'fondo-convenio-2024');
    expect(p.referencia_externa).toBe('saldo-inicial:fondo-convenio-2024');
  });

  it('🔒 la referencia NUNCA puede tener la forma de una importación', () => {
    // Aunque el formulario trajera basura: el valor sale del slug, no del form.
    const p = aPayloadAporte(
      { ...base, es_saldo_inicial: true, referencia_externa: 'mp:90165423466:-5626.66' },
      'fondo-convenio-2024'
    );
    expect(p.referencia_externa).toBe('saldo-inicial:fondo-convenio-2024');
    expect(p.referencia_externa.startsWith('mp:')).toBe(false);
  });

  it('sin destino conocido no inventa una referencia a medias', () => {
    // Una referencia como `saldo-inicial:undefined` colisionaría entre destinos:
    // el segundo saldo inicial sería rechazado por el UNIQUE sin motivo visible.
    expect(aPayloadAporte({ ...base, es_saldo_inicial: true }, undefined).referencia_externa)
      .toBeNull();
  });

  it('marca la carga como manual, para distinguirla de una importación', () => {
    expect(aPayloadAporte(base, 'x').carga_origen).toBe('manual');
  });

  it('referenciaSaldoInicial arma el formato esperado', () => {
    expect(referenciaSaldoInicial('institucional')).toBe('saldo-inicial:institucional');
  });
});
