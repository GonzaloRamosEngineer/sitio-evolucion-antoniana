/**
 * Cómo se saluda a una persona con lo que el sistema sabe de ella.
 *
 * PARECE UN `split(' ')[0]` Y NO LO ES. El hero del panel hacía
 * `currentUser?.name?.split(' ')[0] || 'Miembro'`, y el 2026-09-09 mostró
 * **«Hola, gonzaramosmp@gmail.com»** desbordado a lo ancho de la pantalla en un
 * iPhone. Dos cosas se juntaron:
 *
 *  1. `useAuth` cae a `name: authUser.email` cuando no puede leer el perfil, así
 *     que `name` puede ser un email — y un email no tiene espacios, con lo cual
 *     `split(' ')[0]` devuelve los 22 caracteres completos.
 *  2. Un email es UNA palabra larguísima, y `tracking-tighter leading-none` sin
 *     `break-words` no la puede cortar: se sale de la caja.
 *
 * La tarjeta del perfil ya recortaba en la arroba (`email.split('@')[0]`) desde
 * antes; el hero era el que no. Estaban a tres centímetros y decían cosas
 * distintas del mismo dato, que es el patrón de §10.23.
 *
 * ⚠️ El `break-words` en el `<h1>` va IGUAL. Esto arregla el caso del email,
 * no el de alguien que se llame de verdad «Wolfeschlegelsteinhausenberger».
 */
export const primerNombre = (user, respaldo = 'Miembro') => {
  const crudo = (user?.name || user?.email || '').trim();
  if (!crudo) return respaldo;

  // Si lo que hay es un email —propio o por el respaldo de `useAuth`—, lo que
  // se muestra es lo de antes de la arroba, igual que en la tarjeta del perfil.
  const sinDominio = crudo.includes('@') ? crudo.split('@')[0] : crudo;

  return sinDominio.split(/\s+/)[0] || respaldo;
};
