// Este test existe por un bug de diseño del 2026-09-02: `/dashboard` y `/carnet`
// le decían cosas CONTRADICTORIAS a la misma persona el mismo día.
//
// El carnet contestaba «quién es esta persona y cómo está» desde la capa de
// acceso (§10): `mi_acceso()` y `mi_antiguedad()`, o sea desde `aportes`. El
// dashboard nunca migró a esa capa y se armaba su propia respuesta con `users` y
// `memberships`, inventando una taxonomía que no existe en el sistema:
//
//     'MEMBRESÍA ACTIVA' / 'SOCIO NIVEL BASE'
//     Rango: 'Padrino' / 'Miembro'
//     Socio desde: new Date(user.created_at).getFullYear()   // ¡la CUENTA!
//
// Resultado, el mismo día: el dashboard decía «SOCIO DESDE 2025» (el año de alta
// de la cuenta) y el carnet «parte de la comunidad desde el 2 de septiembre de
// 2026» (el primer aporte). Es el mismo patrón que `/beneficios` vs `/club`, y
// el mismo que arreglar una vez no alcanza: lo que hay que impedir es que
// VUELVA.
//
// POR QUÉ NO LO ATAJÓ NINGÚN TEST. No hay error, no hay excepción, no hay ruta
// rota. Dos pantallas que leen dos tablas distintas y muestran dos números
// distintos compilan perfecto y pasan todo. La única defensa era mirar las dos
// pantallas al lado, que es exactamente cómo se encontró.
//
// LA DEFENSA REAL es estructural: leer el código de las pantallas que hablan de
// la condición del socio y verificar que la pregunten a la capa de acceso, y que
// no la deriven de otro lado.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();

/**
 * El código del archivo SIN comentarios.
 *
 * ⚠️ Esto no es una comodidad, es una corrección: la primera versión de este
 * test falló sobre `DashboardHeader.jsx` **por su propia documentación**. El
 * comentario que explica el bug CITA el código que se borró («'Padrino'»,
 * «user.created_at»), y un detector que mira el archivo entero no distingue
 * «esto lo hace» de «esto explica lo que ya no hace». Un test así te obliga a
 * elegir entre documentar el error o tener la protección, y las dos hacen
 * falta.
 *
 * El limpiador es deliberadamente tosco —no entiende comillas ni literales de
 * expresión regular— y por eso lleva su propio control: `codigoDe()` verifica
 * que después de limpiar sigan estando las marcas de código conocidas. Si el
 * limpiador se come algo que no debía, ese control lo delata en vez de dejar
 * pasar un falso negativo silencioso.
 */
const sinComentarios = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    // El `[^:]` de adelante evita comerse el `//` de una URL (`https://…`),
    // que es el falso positivo obvio de un limpiador hecho a mano.
    .replace(/(^|[^:])\/\/[^\r\n]*/g, '$1');

const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const codigoDe = (rel) => {
  const bruto = leer(rel);
  const codigo = sinComentarios(bruto);
  // Control del limpiador: si se llevó el código por delante, decilo acá y no
  // dejes que los detectores devuelvan `false` por archivo vacío.
  if (!/return \(/.test(codigo) || !/import /.test(codigo)) {
    throw new Error(`sinComentarios() destruyó el código de ${rel}`);
  }
  return codigo;
};

/**
 * Las pantallas que le dicen a una persona CÓMO ESTÁ como socia.
 *
 * ⚠️ La lista es corta a propósito y no incluye `Dashboard.jsx`: esa página SÍ
 * consulta `memberships` con `useUserMemberships`, y está bien — lista las
 * suscripciones, que es otra pregunta («qué suscripciones tengo») y no la
 * condición. Lo que no puede volver a pasar es que una pantalla DERIVE la
 * condición de esa lista.
 */
const SUPERFICIES = [
  'src/components/Dashboard/DashboardHeader.jsx',
  'src/pages/CarnetPage.jsx',
];

/**
 * Los detectores. Cada uno es una función sobre el texto del archivo, así que se
 * pueden probar contra un fragmento inventado — que es lo que hace el control
 * negativo de más abajo. Un detector que nunca se vio encontrar nada no sirve.
 */
const DETECTORES = {
  consultaMemberships: (src) =>
    /from\(\s*['"]memberships['"]\s*\)/.test(src),

  // «Socio desde» sacado de la cuenta y no del primer aporte.
  antiguedadDeLaCuenta: (src) =>
    /user[?.]*\.created_at/.test(src),

  // La jerarquía que no existe: no hay tabla `socios` ni `categorias_socio`.
  rangoInventado: (src) =>
    /NIVEL BASE|'Padrino'|"Padrino"/.test(src),

  preguntaALaCapaDeAcceso: (src) =>
    /useMiAcceso|mi_acceso/.test(src) && /@\/lib\/acceso/.test(src),
};

describe('una sola fuente de verdad sobre la condición del socio', () => {
  // ---- CONTROL POSITIVO DEL ANDAMIO ---------------------------------
  // Si un archivo se renombra, `leer` explota y el test falla ruidoso. Pero si
  // alguien lo vacía o lo reduce a un stub, los detectores devolverían `false`
  // y TODO pasaría en verde por el motivo equivocado. Esto lo impide.
  it('las superficies existen y tienen contenido real', () => {
    for (const rel of SUPERFICIES) {
      const src = leer(rel);
      expect(src.length, `${rel} quedó vacío o es un stub`).toBeGreaterThan(1500);
      expect(src, `${rel} no renderiza nada`).toMatch(/return \(/);
    }
  });

  // ---- CONTROL NEGATIVO DE LOS DETECTORES ---------------------------
  // Lo que este test promete es «detecto el patrón viejo». Si los detectores
  // están mal escritos, no detectan nada y las afirmaciones de abajo son
  // decorativas. Así que se les da de comer el código EXACTO que se borró.
  it('los detectores encuentran el patrón viejo (si no, no prueban nada)', () => {
    const codigoViejo = `
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      {activeMembership ? 'MEMBRESÍA ACTIVA' : 'SOCIO NIVEL BASE'}
      {user?.role === 'admin' ? 'Administrador' : (activeMembership ? 'Padrino' : 'Miembro')}
      {user?.created_at ? new Date(user.created_at).getFullYear() : '2025'}
    `;
    expect(DETECTORES.consultaMemberships(codigoViejo)).toBe(true);
    expect(DETECTORES.antiguedadDeLaCuenta(codigoViejo)).toBe(true);
    expect(DETECTORES.rangoInventado(codigoViejo)).toBe(true);
    expect(DETECTORES.preguntaALaCapaDeAcceso(codigoViejo)).toBe(false);
  });

  it('el limpiador saca los comentarios y NO el código', () => {
    const conComentario = `
      /* Antes decia: {activeMembership ? 'Padrino' : 'Miembro'} */
      // y tambien user.created_at
      const acceso = useMiAcceso(user?.id);
      import x from '@/lib/acceso';
      return (
    `;
    const limpio = sinComentarios(conComentario);
    expect(DETECTORES.rangoInventado(limpio)).toBe(false);
    expect(DETECTORES.antiguedadDeLaCuenta(limpio)).toBe(false);
    // El código sobrevivió: sin esto, "limpia bien" y "borra todo" se ven igual.
    expect(limpio).toMatch(/useMiAcceso/);
    expect(limpio).toMatch(/return \(/);
  });

  // ---- LO QUE SE PROTEGE -------------------------------------------
  it.each(SUPERFICIES)('%s pregunta a la capa de acceso', (rel) => {
    expect(
      DETECTORES.preguntaALaCapaDeAcceso(codigoDe(rel)),
      `${rel} tiene que resolver la condición con mi_acceso()/mi_antiguedad() y ` +
      'las reglas de presentación de src/lib/acceso.js, no con sus propias reglas.',
    ).toBe(true);
  });

  it.each(SUPERFICIES)('%s no consulta memberships para decidir la condición', (rel) => {
    expect(
      DETECTORES.consultaMemberships(codigoDe(rel)),
      `${rel} volvió a consultar memberships. Una fila de memberships dice que hay ` +
      'una suscripción, NO que haya acceso: entre suscribirse y que se acredite el ' +
      'primer cobro pasan minutos, y una suscripción activa con la tarjeta vencida ' +
      'tampoco otorga nada. La condición la contesta acceso_vigente().',
    ).toBe(false);
  });

  it.each(SUPERFICIES)('%s no saca la antigüedad de la fecha de la cuenta', (rel) => {
    expect(
      DETECTORES.antiguedadDeLaCuenta(codigoDe(rel)),
      `${rel} usa user.created_at. Esa es la fecha de alta de la CUENTA, no del ` +
      'primer aporte: hay 23 cuentas y 6 aportes. La antigüedad sale de ' +
      'antiguedad_socio().socio_desde.',
    ).toBe(false);
  });

  it.each(SUPERFICIES)('%s no promete una jerarquía que no existe', (rel) => {
    expect(
      DETECTORES.rangoInventado(codigoDe(rel)),
      `${rel} volvió a mostrar un rango o nivel de socio. No hay tabla socios ni ` +
      'categorias_socio (§10.1.a sigue abierto), así que sería una promesa sin ' +
      'respaldo y sin forma de subir de nivel. Si se implementa la fase 4 de §10.3, ' +
      'este test se actualiza junto con la tabla — no antes.',
    ).toBe(false);
  });
});
