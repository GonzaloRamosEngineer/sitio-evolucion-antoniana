import { describe, it, expect } from 'vitest';
import {
  segundosRestantes,
  formatearCuenta,
  agruparCodigo,
  estadoCanje,
  etiquetaBeneficio,
  mensajeDeError,
  sanearInstrucciones,
  mapearABeneficio,
  accionVidriera,
  normalizarCodigo,
  esCodigoValido,
} from '@/lib/club';

const ahora = new Date('2026-08-30T12:00:00Z');
const en = (segundos) => new Date(ahora.getTime() + segundos * 1000).toISOString();

describe('segundosRestantes', () => {
  it('cuenta lo que falta y nunca baja de cero', () => {
    expect(segundosRestantes(en(90), ahora)).toBe(90);
    expect(segundosRestantes(en(-30), ahora)).toBe(0);
  });

  it('sin fecha o con basura devuelve 0, no NaN', () => {
    expect(segundosRestantes(null, ahora)).toBe(0);
    expect(segundosRestantes('no-es-una-fecha', ahora)).toBe(0);
  });
});

describe('formatearCuenta', () => {
  it('formatea M:SS con el segundo siempre en dos dígitos', () => {
    expect(formatearCuenta(300)).toBe('5:00');
    expect(formatearCuenta(65)).toBe('1:05');
    expect(formatearCuenta(9)).toBe('0:09');
    expect(formatearCuenta(0)).toBe('0:00');
  });

  it('un valor raro no imprime NaN en la pantalla del socio', () => {
    expect(formatearCuenta(undefined)).toBe('0:00');
    expect(formatearCuenta(-10)).toBe('0:00');
  });
});

describe('agruparCodigo', () => {
  it('parte el código en dos mitades para dictarlo', () => {
    expect(agruparCodigo('ZK4M2P')).toBe('ZK4 M2P');
  });

  it('si no mide 6 lo deja como está, no inventa espacios', () => {
    expect(agruparCodigo('ZK4M')).toBe('ZK4M');
    expect(agruparCodigo('')).toBe('');
  });
});

describe('estadoCanje', () => {
  it('confirmado y anulado ganan sobre el reloj', () => {
    expect(estadoCanje({ estado: 'confirmado', expira_en: en(-500) }, ahora)).toBe('confirmado');
    expect(estadoCanje({ estado: 'anulado', expira_en: en(300) }, ahora)).toBe('anulado');
  });

  // Lo que la persona ve manda: un 'pendiente' con el reloj en cero ya venció,
  // aunque el reaper todavía no haya pasado por la base.
  it('un pendiente con el reloj en cero se muestra como vencido', () => {
    expect(estadoCanje({ estado: 'pendiente', expira_en: en(-1) }, ahora)).toBe('vencido');
  });

  it('avisa cuando queda menos de un minuto', () => {
    expect(estadoCanje({ estado: 'pendiente', expira_en: en(120) }, ahora)).toBe('vigente');
    expect(estadoCanje({ estado: 'pendiente', expira_en: en(45) }, ahora)).toBe('por_vencer');
  });

  it('sin canje no rompe', () => {
    expect(estadoCanje(null, ahora)).toBe('ninguno');
  });
});

describe('etiquetaBeneficio', () => {
  it('arma la etiqueta de cada tipo', () => {
    expect(etiquetaBeneficio({ tipo: 'porcentaje', valor: 30 })).toBe('30% OFF');
    expect(etiquetaBeneficio({ tipo: '2x1' })).toBe('2x1');
    expect(etiquetaBeneficio({ tipo: 'regalo' })).toBe('Regalo');
  });

  it('un porcentaje sin valor no muestra "null% OFF"', () => {
    expect(etiquetaBeneficio({ tipo: 'porcentaje', valor: null })).toBeNull();
    expect(etiquetaBeneficio({})).toBeNull();
  });
});

describe('mensajeDeError', () => {
  it('prefiere el texto que ya redactó la Edge Function', () => {
    expect(mensajeDeError({ error: 'Este beneficio se agotó.' })).toBe('Este beneficio se agotó.');
  });

  // Nunca mostrar el código crudo: 'limite_alcanzado' no le dice nada a nadie.
  it('traduce el código cuando no vino texto', () => {
    expect(mensajeDeError({ codigo_error: 'limite_alcanzado' })).toBe('Ya usaste este beneficio.');
  });

  it('ante algo desconocido cae a un mensaje entendible', () => {
    expect(mensajeDeError({ codigo_error: 'algo_nuevo' })).toBe('No se pudo completar la operación.');
    expect(mensajeDeError(null)).toBe('No se pudo completar la operación.');
  });
});

describe('normalizarCodigo', () => {
  // El rechazo más tonto posible en la caja es que el campo no acepte lo que el
  // cajero escribió tal como se lo dictaron.
  it('acepta minúsculas y espacios y devuelve el código limpio', () => {
    expect(normalizarCodigo('zk4 m2p')).toBe('ZK4M2P');
  });

  it('descarta los caracteres que el alfabeto no usa', () => {
    expect(normalizarCodigo('ZK4-M2P!')).toBe('ZK4M2P');
    expect(normalizarCodigo('O0I1L')).toBe(''); // los ambiguos no existen
  });

  it('no deja pasar más de 6', () => {
    expect(normalizarCodigo('ZK4M2PXYZ')).toBe('ZK4M2P');
  });
});

describe('esCodigoValido', () => {
  it('acepta el alfabeto sin ambiguos y rechaza el resto', () => {
    expect(esCodigoValido('ZK4M2P')).toBe(true);
    expect(esCodigoValido('ZK4M2O')).toBe(false); // O no existe
    expect(esCodigoValido('ZK4M2')).toBe(false);
    expect(esCodigoValido('')).toBe(false);
  });
});

/* ============================================================
   LA VIDRIERA — lo que estas pruebas fijan es la garantía dura de §12.10.13:
   **el catálogo público no puede publicar un código, por ninguna vía.**

   Se prueba con el dato REAL que estaba publicado el 2026-09-02, no con un
   ejemplo inventado: la fuga viajaba por tres campos y el tercero era texto
   libre. Un test que solo mire la columna `codigo` habría pasado igual.
   ============================================================ */
describe('sanearInstrucciones', () => {
  it('saca la frase que menciona el código — el caso real de DigitalMatch', () => {
    const real =
      'Ingresá al sitio de DigitalMatch Global → Completá el formulario → ' +
      'Indicá que sos parte de la Fundación Evolución Antoniana → ' +
      'Usá el código DMGlobal para aplicar el 30% OFF.';
    const limpio = sanearInstrucciones(real);
    expect(limpio).not.toMatch(/DMGlobal/);
    expect(limpio).not.toMatch(/c[óo]digo/i);
    // Y el resto de la instrucción sobrevive: no sirve de nada una vidriera
    // que se queda sin explicar cómo usar el beneficio.
    expect(limpio).toMatch(/Completá el formulario/);
    expect(limpio).toMatch(/Fundación Evolución Antoniana/);
  });

  it('también corta cupón, promo y voucher, con y sin tilde', () => {
    for (const t of ['Usá el cupón X1.', 'Pedí el codigo ABC.', 'El voucher es Z9.', 'Promo PROMO22.']) {
      expect(sanearInstrucciones(t)).toBeNull();
    }
  });

  it('no toca un texto que no menciona ningún código', () => {
    const t = 'Mostrá tu carnet en el mostrador.';
    expect(sanearInstrucciones(t)).toBe(t);
  });

  it('tolera vacío y nulo sin explotar', () => {
    for (const v of [null, undefined, '', '   ']) expect(sanearInstrucciones(v)).toBeNull();
  });
});

describe('mapearABeneficio', () => {
  const fila = {
    id: 'b1',
    titulo: '30% en sitios web',
    descripcion: 'Para socios con aporte vigente.',
    terminos: 'No acumulable.',
    tipo: 'porcentaje',
    valor: 30,
    requiere_acceso: true,
    slug: '30-en-sitios-web',
    instrucciones: 'Completá el formulario → Usá el código DMGlobal.',
    imagen_url: null,
    vigencia_desde: '2026-09-01',
    vigencia_hasta: '2026-12-31',
    estado: 'activo',
    club_comercios: {
      id: 'c1',
      nombre: 'DigitalMatch Global',
      slug: 'digitalmatch-global',
      rubro: 'Tecnología',
      logo_url: null,
      partner_id: 'p1',
      partners: {
        logo_url: 'https://cdn/logo.png',
        sitio_web: 'https://digitalmatchglobal.com/',
        contacto_email: 'info@digitalmatchglobal.com',
      },
    },
  };

  it('NUNCA devuelve un código, por ninguna de las tres vías', () => {
    const b = mapearABeneficio(fila);
    // 1 y 2: las columnas no se mapean, así que la clave no existe.
    expect(b).not.toHaveProperty('codigo');
    expect(b).not.toHaveProperty('codigo_descuento');
    // 3: el texto libre pasa por el saneo.
    expect(JSON.stringify(b)).not.toMatch(/DMGlobal/);
  });

  it('aunque la fila traiga un codigo pegado por error, no se propaga', () => {
    // Blindaje contra el futuro: si alguien agrega la columna a la tabla nueva
    // o el select la trae, la vidriera igual no la publica.
    const b = mapearABeneficio({ ...fila, codigo: 'FUGA123', codigo_descuento: 'FUGA456' });
    expect(JSON.stringify(b)).not.toMatch(/FUGA/);
  });

  it('la categoría sale del rubro del comercio, no de una columna propia', () => {
    expect(mapearABeneficio(fila).categoria).toBe('Tecnología');
  });

  it('el logo cae a partners cuando el comercio lo tiene en NULL', () => {
    // Es el estado REAL de la base: club_comercios.logo_url está vacío.
    expect(mapearABeneficio(fila).imagen_url).toBe('https://cdn/logo.png');
  });

  it('respeta el override de imagen del beneficio cuando existe', () => {
    const b = mapearABeneficio({ ...fila, imagen_url: 'https://cdn/propia.png' });
    expect(b.imagen_url).toBe('https://cdn/propia.png');
  });

  it('traduce la vigencia y el descuento a la forma que la página ya consume', () => {
    const b = mapearABeneficio(fila);
    expect(b.fecha_inicio).toBe('2026-09-01');
    expect(b.fecha_fin).toBe('2026-12-31');
    expect(b.descuento).toBe('30% OFF');
    expect(b.sitio_web).toBe('https://digitalmatchglobal.com/');
    expect(b.contacto_email).toBe('info@digitalmatchglobal.com');
  });

  it('no explota con una fila sin comercio ni con null', () => {
    expect(mapearABeneficio(null)).toBeNull();
    const b = mapearABeneficio({ id: 'x', titulo: 'T', tipo: 'regalo', estado: 'activo' });
    expect(b.categoria).toBeNull();
    expect(b.imagen_url).toBeNull();
    expect(b.comercio).toBeNull();
    expect(b.descuento).toBe('Regalo');
  });
});

describe('accionVidriera', () => {
  const exclusivo = { requiere_acceso: true };
  const abierto = { requiere_acceso: false };
  const conAcceso = { tiene_acceso: true, en_gracia: false };
  const enGracia = { tiene_acceso: true, en_gracia: true };
  const sinAcceso = { tiene_acceso: false, en_gracia: false };

  it('visitante sin sesión: no puede canjear y se lo invita a entrar', () => {
    const a = accionVidriera({ beneficio: exclusivo, acceso: sinAcceso, haySesion: false });
    expect(a.estado).toBe('sin_sesion');
    expect(a.puedeCanjear).toBe(false);
    expect(a.cta.href).toBe('/login');
  });

  it('con sesión pero sin aporte: se le dice QUÉ falta y adónde ir', () => {
    const a = accionVidriera({ beneficio: exclusivo, acceso: sinAcceso, haySesion: true });
    expect(a.estado).toBe('sin_acceso');
    expect(a.puedeCanjear).toBe(false);
    expect(a.cta.href).toBe('/colaborar');
    expect(a.mensaje).toMatch(/aporte vigente/);
  });

  it('socio con acceso vigente: recién acá se habilita el botón real', () => {
    const a = accionVidriera({ beneficio: exclusivo, acceso: conAcceso, haySesion: true });
    expect(a.estado).toBe('puede_canjear');
    expect(a.puedeCanjear).toBe(true);
    expect(a.cta.href).toBeNull(); // no navega: dispara el canje
  });

  it('en gracia puede canjear, y se le avisa', () => {
    const a = accionVidriera({ beneficio: exclusivo, acceso: enGracia, haySesion: true });
    expect(a.estado).toBe('en_gracia');
    expect(a.puedeCanjear).toBe(true);
    expect(a.mensaje).toMatch(/gracia/);
  });

  it('un beneficio abierto igual exige sesión: el código se emite a nombre de alguien', () => {
    // Es la corrección de §11.7.11: sin sesión no hay a quién emitirle el canje.
    expect(accionVidriera({ beneficio: abierto, acceso: sinAcceso, haySesion: false }).puedeCanjear)
      .toBe(false);
    expect(accionVidriera({ beneficio: abierto, acceso: sinAcceso, haySesion: true }).puedeCanjear)
      .toBe(true);
  });

  it('nunca devuelve un código, en ningún estado', () => {
    for (const b of [exclusivo, abierto])
      for (const ac of [conAcceso, enGracia, sinAcceso])
        for (const s of [true, false]) {
          const a = accionVidriera({ beneficio: b, acceso: ac, haySesion: s });
          expect(a).not.toHaveProperty('codigo');
        }
  });
});
