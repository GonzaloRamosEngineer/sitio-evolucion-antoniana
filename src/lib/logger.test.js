// Tests del logger (ROADMAP 6.4).
//
// Lo que fijan: qué sobrevive al build de producción y qué no. Es un módulo
// chico pero su comportamiento depende de `import.meta.env.PROD`, que se
// resuelve en build — o sea, exactamente el tipo de cosa que se rompe sin que
// nadie se entere hasta que un log de depuración termina en producción.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalProd = import.meta.env.PROD;

/**
 * Asigna `import.meta.env.PROD` directo en vez de usar `vi.stubEnv`: stubEnv
 * convierte el valor a string, y `"false"` es truthy — con eso los dos casos
 * (dev y prod) daban "producción" y los tests pasaban por el motivo equivocado.
 */
const loadLogger = async (isProd) => {
  vi.resetModules();
  import.meta.env.PROD = isProd;
  return (await import('@/lib/logger')).logger;
};

beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  import.meta.env.PROD = originalProd;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('en desarrollo', () => {
  it('deja pasar los cuatro niveles', async () => {
    const logger = await loadLogger(false);

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(console.debug).toHaveBeenCalledWith('d');
    expect(console.info).toHaveBeenCalledWith('i');
    expect(console.warn).toHaveBeenCalledWith('w');
    expect(console.error).toHaveBeenCalledWith('e');
  });
});

describe('en producción', () => {
  it('anula debug e info', async () => {
    const logger = await loadLogger(true);

    logger.debug('no debería salir');
    logger.info('tampoco');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });

  it('conserva warn y error', async () => {
    // A propósito: son la única herramienta de soporte cuando alguien reporta
    // un problema y se le pide que abra la consola.
    const logger = await loadLogger(true);

    logger.warn('ojo');
    logger.error('rompió', { code: '42501' });

    expect(console.warn).toHaveBeenCalledWith('ojo');
    expect(console.error).toHaveBeenCalledWith('rompió', { code: '42501' });
  });

  it('los no-op no rompen ni devuelven nada raro', async () => {
    const logger = await loadLogger(true);
    expect(logger.debug('x')).toBeUndefined();
  });
});
