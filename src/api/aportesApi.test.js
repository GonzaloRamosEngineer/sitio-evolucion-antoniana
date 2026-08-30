import { describe, it, expect, vi } from 'vitest';
import {
  validarAporte, aPayloadAporte, describirOrigen, hoyISO, ORIGENES_APORTE,
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
