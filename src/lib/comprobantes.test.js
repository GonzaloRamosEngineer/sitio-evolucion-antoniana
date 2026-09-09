// Tests del vocabulario de comprobantes (ROADMAP §14.4).
//
// Lo que se fija acá es cómo la rendición pública habla de su propio respaldo, y
// eso tiene dos formas de salir mal en direcciones opuestas:
//
//  · **Exagerarlo**: dar a entender que hay una factura adjunta cuando sólo hay
//    un número declarado. Es la que destruye la confianza si alguien la
//    descubre.
//  · **Subvaluarlo**: mostrar «Sin comprobante» en un gasto que trae el id de la
//    operación bancaria, verificable contra el resumen de cuenta. Es la que se
//    cometió durante dos días con los 25 gastos del fondo del convenio.
import { describe, it, expect } from 'vitest';
import { respaldoDe, describirComprobante, describirTipoComprobante, TIPOS_COMPROBANTE } from './comprobantes';

describe('TIPOS_COMPROBANTE — genérico a propósito', () => {
  it('no tiene la letra A/B/C: eso es normativa argentina y va en el número', () => {
    const valores = TIPOS_COMPROBANTE.map((t) => t.value);
    expect(valores).not.toContain('factura_a');
    expect(valores).toContain('factura');
  });

  it('incluye `extracto`, que es lo que respalda un movimiento importado', () => {
    expect(describirTipoComprobante('extracto')).toBe('Extracto de cuenta');
  });

  it('un tipo desconocido no rompe: devuelve null', () => {
    expect(describirTipoComprobante('inventado')).toBeNull();
  });
});

describe('respaldoDe — tres estados, y el del medio no es un hueco', () => {
  it('🔒 un extracto declarado es respaldo, no ausencia de respaldo', () => {
    // Es el caso de los 25 gastos importados del fondo del convenio: traen el id
    // de la operación bancaria, verificable contra el resumen de cuenta.
    expect(respaldoDe({ tiene_comprobante: false, tipo_comprobante: 'extracto', comprobante_numero: '90165423466' }))
      .toEqual({ estado: 'declarado', etiqueta: 'Extracto de cuenta #90165423466' });
  });

  it('con archivo adjunto es el estado máximo', () => {
    expect(respaldoDe({ tiene_comprobante: true, tipo_comprobante: 'factura', comprobante_numero: 'A-0001' }))
      .toEqual({ estado: 'archivo', etiqueta: 'Factura #A-0001' });
  });

  it('🔒 sin nada sigue diciendo que no hay respaldo: el hueco se marca', () => {
    expect(respaldoDe({ tiene_comprobante: false })).toEqual({ estado: 'ninguno', etiqueta: 'Sin comprobante' });
    expect(respaldoDe(null).estado).toBe('ninguno');
  });

  it('usa # y no «N°»: es un id de operación, no un número de factura', () => {
    expect(respaldoDe({ tipo_comprobante: 'extracto', comprobante_numero: '1' }).etiqueta).toContain('#1');
  });

  it('un tipo sin número no inventa un #', () => {
    expect(respaldoDe({ tipo_comprobante: 'recibo' }).etiqueta).toBe('Recibo');
  });
});

describe('describirComprobante — la frase larga, para el panel', () => {
  it('🔒 dice que el archivo falta, en vez de dar a entender que está', () => {
    // Esta es la mitad que hace honesta a la otra: declarar no es adjuntar. En el
    // panel interno la aclaración sí va, porque ahí el trabajo pendiente es
    // conseguir el archivo.
    expect(describirComprobante({ tiene_comprobante: false, tipo_comprobante: 'recibo', comprobante_numero: '0001' }))
      .toBe('Recibo N° 0001 (declarado, sin archivo adjunto)');
  });

  it('con archivo no arrastra la aclaración', () => {
    expect(describirComprobante({ tiene_comprobante: true, tipo_comprobante: 'factura' })).toBe('Factura');
  });

  it('sin nada declarado ni adjunto lo dice', () => {
    expect(describirComprobante({})).toBe('Sin comprobante');
  });
});
