/**
 * QUÉ FOTO SE MUESTRA CUANDO LA PERSONA NO SUBIÓ UNA (§10.23.d)
 * ---------------------------------------------------------------------------
 * Hasta el 2026-09-09 la respuesta era una sola: `/img/default-avatar.png`,
 * que es la ilustración de **un varón** con la camiseta de la Fundación. O sea
 * que el panel le mostraba un varón a todo el mundo, socias incluidas, y nadie
 * lo había notado porque el dueño del proyecto es varón y la pantalla acertaba
 * con él.
 *
 * ⚠️ EL ARREGLO NO ES «AGREGAR LA FEMENINA». Si el par fuera
 * `femenino → mujer` y **todo lo demás → varón**, el default seguiría siendo
 * varón: alguien que puso «Otro / Prefiero no decir» —o que no completó el
 * campo, que es optativo— recibiría una ilustración que afirma algo que no
 * dijo. Por eso este módulo devuelve `null` para todo lo que no sea masculino
 * o femenino, y `null` significa **caer a las iniciales**, que es la única
 * opción que no inventa un dato de la persona.
 *
 * `users.gender` ya existía (se puebla desde `raw_user_meta_data` en el alta) y
 * el selector del modal escribe exactamente estos tres valores; el tercero,
 * `'otro'`, es el que hace falta respetar.
 *
 * ⚠️ Y ojo con lo que ESTO NO ES: no hay foto real de nadie. `users` **no tiene
 * columna `avatar_url`** —`user.avatar_url` es resto del scaffold de Hostinger
 * y siempre viene `undefined`—, así que hoy esto elige entre dos dibujos y las
 * iniciales. El día que se pueda subir una foto, la foto gana y esta función
 * sigue siendo el fallback, no la regla principal.
 */
const POR_GENERO = Object.freeze({
  masculino: '/img/default-avatar.png',
  femenino: '/img/default-avatar-femenino.png',
});

/**
 * @param {string|null|undefined} genero  `users.gender`
 * @returns {string|null} la ruta del dibujo, o `null` para usar las iniciales.
 */
export const avatarPorDefecto = (genero) =>
  POR_GENERO[String(genero ?? '').trim().toLowerCase()] ?? null;

/**
 * La foto que se muestra: la propia si existe, y si no el dibujo que
 * corresponda. `null` = iniciales.
 */
export const avatarDe = (user) => user?.avatar_url || avatarPorDefecto(user?.gender);
