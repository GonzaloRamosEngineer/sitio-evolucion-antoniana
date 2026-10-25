import { describe, expect, it } from 'vitest';

import {
  CAMPOS_ENTIDAD_REQUERIDOS,
  CONTRATO_ENTIDAD_VERSION,
  entidad,
  validarContratoEntidad,
} from '@/config/entidad';

describe('contrato compartido de entidad', () => {
  it('versiona y valida la configuración activa', () => {
    expect(CONTRATO_ENTIDAD_VERSION).toBe(1);
    expect(CAMPOS_ENTIDAD_REQUERIDOS.length).toBeGreaterThanOrEqual(20);
    expect(validarContratoEntidad(entidad)).toEqual([]);
  });

  it('falla con mensajes accionables si una instalación queda incompleta', () => {
    const incompleta = {
      ...entidad,
      nombre: '',
      sitio: 'no-es-url',
      contacto: { ...entidad.contacto, email: 'invalido' },
    };

    expect(validarContratoEntidad(incompleta)).toEqual(expect.arrayContaining([
      'Falta entidad.nombre',
      'entidad.sitio debe ser una URL absoluta',
      'entidad.contacto.email no es válido',
    ]));
  });
});
