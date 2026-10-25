import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { RUTAS_EXTERNAS, urlDelSitio } from '../../supabase/functions/_shared/rutas.ts';

const RAIZ = path.resolve(__dirname, '../..');
const leerFuncion = (nombre) =>
  fs.readFileSync(path.join(RAIZ, 'supabase/functions', nombre, 'index.ts'), 'utf8');

describe('rutas emitidas por Edge Functions', () => {
  it('comparte los destinos canónicos y construye URLs sin doble barra', () => {
    expect(RUTAS_EXTERNAS).toEqual({
      ACTUALIZAR_CLAVE: '/actualizar-clave',
      PANEL_COMERCIO: '/comercios/panel',
      CONFIRMAR_ASISTENCIA: '/actividades/confirmar-asistencia',
    });
    expect(urlDelSitio('https://www.evolucionantoniana.com/', RUTAS_EXTERNAS.PANEL_COMERCIO))
      .toBe('https://www.evolucionantoniana.com/comercios/panel');
  });

  it('ningún emisor conserva rutas heredadas literales', () => {
    const fuentes = [
      leerFuncion('create-user'),
      leerFuncion('resend-verification'),
      leerFuncion('club-invitar-operador'),
      leerFuncion('send-activity-confirmation'),
    ].join('\n');

    expect(fuentes).not.toMatch(/\/update-password|\/confirm-attendance|[`"']\/comercio[`"']/);
  });
});
