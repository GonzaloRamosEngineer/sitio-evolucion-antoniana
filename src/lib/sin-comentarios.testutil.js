// Helper SOLO para tests. No lo importa ningún archivo de la app, así que nunca
// entra al bundle. El sufijo `.testutil.js` es a propósito: el `include` de
// `vitest.config.js` es `*.{test,spec}.{js,jsx}`, así que esto no se recolecta
// como suite ni aparece como "0 tests".
//
// POR QUÉ EXISTE, Y POR QUÉ ESTÁ COMPARTIDO
// ---------------------------------------------------------------------------
// Dos tests distintos leen código fuente y buscan patrones prohibidos:
// `fuente-unica-socio.test.js` (que la condición del socio salga de la capa de
// acceso) y `assets-externos.test.js` (que no se traigan archivos de otro
// dominio). Los dos se toparon con **el mismo problema, con dos días de
// diferencia**: fallaron por su propia documentación.
//
// El comentario que explica un bug **cita el código que se borró** —esa es la
// gracia de documentarlo— y un detector que mira el archivo entero no distingue
// «esto lo hace» de «esto explica lo que ya no hace». Un test así te obliga a
// elegir entre documentar el error o tener la protección, y en este repo las
// dos hacen falta.
//
// Cuando el mismo tropiezo aparece dos veces, la solución deja de ser local.

/**
 * El código sin comentarios.
 *
 * ⚠️ Es un limpiador TOSCO: no entiende comillas ni literales de expresión
 * regular, así que un `//` dentro de un string podría cortar de más. Se acepta
 * porque quien lo usa verifica después que el código sobrevivió (ver
 * `verificarQueSobrevivio`), y porque la alternativa —parsear JS de verdad— es
 * desproporcionada para lo que hace falta.
 */
export const sinComentarios = (src) =>
  String(src ?? '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    // El `[^:]` de adelante evita comerse el `//` de una URL (`https://…`),
    // que es el falso positivo obvio de un limpiador hecho a mano.
    .replace(/(^|[^:])\/\/[^\r\n]*/g, '$1');

/**
 * El control del limpiador: que después de limpiar sigan estando las marcas de
 * código conocidas.
 *
 * Sin esto, «limpia bien» y «borra todo» se ven idénticos desde afuera: un
 * limpiador que devuelva cadena vacía haría que TODOS los detectores devuelvan
 * `false` y el test pasaría en verde sin proteger nada.
 */
export const verificarQueSobrevivio = (codigo, ref, marcas = [/import /]) => {
  for (const marca of marcas) {
    if (!marca.test(codigo)) {
      throw new Error(`sinComentarios() destruyó el código de ${ref}: falta ${marca}`);
    }
  }
  return codigo;
};
