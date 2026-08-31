// Lo que estas pruebas fijan es la regla de la que depende que un aporte se
// pueda atribuir a una persona (ROADMAP §10.18), y una garantía dura:
// **este dato nunca puede hacer fallar un cobro.**
import { describe, it, expect } from 'vitest';
import { emailParaCheckout, esEmailPlausible, PLACEHOLDER_ANONIMO } from '@/lib/aportante';

describe('esEmailPlausible', () => {
  it('acepta emails normales y raros pero reales', () => {
    expect(esEmailPlausible('maria@gmail.com')).toBe(true);
    expect(esEmailPlausible("o'brien+dona@sub.dominio.com.ar")).toBe(true);
    expect(esEmailPlausible('  con.espacios@mail.com  ')).toBe(true);
  });

  it('rechaza lo que no tiene forma de email', () => {
    for (const malo of ['', '   ', 'no-es-email', 'falta@dominio', 'espacio adentro@x.com', null, undefined, 42, {}]) {
      expect(esEmailPlausible(malo)).toBe(false);
    }
  });
});

describe('emailParaCheckout', () => {
  const conSesion = { email: 'Socia@Gmail.com' };

  it('con sesión gana el email de la cuenta, aunque haya texto escrito', () => {
    // El de la cuenta ya lo verificó Supabase; el escrito a mano, nadie.
    expect(emailParaCheckout(conSesion, 'otro@mail.com')).toBe('Socia@Gmail.com');
  });

  it('sin sesión usa el que se escribió, normalizado', () => {
    expect(emailParaCheckout(null, '  Juan@Perez.AR ')).toBe('juan@perez.ar');
  });

  it('sin sesión y sin nada escrito, cae al placeholder', () => {
    expect(emailParaCheckout(null, '')).toBe(PLACEHOLDER_ANONIMO);
    expect(emailParaCheckout(null)).toBe(PLACEHOLDER_ANONIMO);
  });

  it('un email mal escrito degrada a placeholder, NO rompe el cobro', () => {
    // Es exactamente lo que pasaba antes de que existiera el campo: no se
    // pierde nada, y sobre todo no se pierde la donación.
    expect(emailParaCheckout(null, 'no-es-email')).toBe(PLACEHOLDER_ANONIMO);
    expect(emailParaCheckout(null, '@@@')).toBe(PLACEHOLDER_ANONIMO);
  });

  it('🔒 NUNCA devuelve vacío: /api/crear-preferencia responde 400 sin payer.email', () => {
    for (const caso of [
      [null, ''], [null, '   '], [undefined, undefined], [{}, ''], [{ email: null }, 'x'],
      [null, null], [{ email: '' }, 'roto'],
    ]) {
      const r = emailParaCheckout(...caso);
      expect(typeof r).toBe('string');
      expect(r.length).toBeGreaterThan(0);
    }
  });

  it('el placeholder es el que el webhook descarta, no un email cualquiera', () => {
    // Si esta constante se cambia sin cambiar `lib/pagador.js` en el servicio
    // de pagos, el placeholder se empezaría a guardar como si fuera el email de
    // una persona — y sería el MISMO para todas las anónimas.
    expect(PLACEHOLDER_ANONIMO).toBe('anon@fundacion.com');
  });
});
