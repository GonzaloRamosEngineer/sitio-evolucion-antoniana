import { describe, expect, it } from 'vitest';

import { auditLanguage } from '../../tools/language-audit-lib.mjs';

describe('línea base ejecutable de lenguaje', () => {
  const report = auditLanguage();

  it('no incorpora marca o dominio literal fuera de la deuda inventariada', () => {
    expect(report.unexpectedBrandFiles).toEqual([]);
  });

  it('elimina Partner(s) del lenguaje público inventariado', () => {
    expect(report.partnerFiles).toEqual([]);
    expect(report.unexpectedPartnerFiles).toEqual([]);
  });

  it('mantiene “Club de beneficios” fuera de todo runtime', () => {
    expect(report.clubDeBeneficiosFiles).toEqual([]);
  });

  it('mantiene los estáticos sincronizados con el contrato de entidad', () => {
    expect(report.staticIdentityErrors).toEqual([]);
  });

  it('mantiene la identidad Edge sincronizada con el contrato de entidad', () => {
    expect(report.edgeIdentityErrors).toEqual([]);
  });
});
