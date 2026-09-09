// src/api/avatarApi.js
//
// La foto de perfil del socio: subirla, quitarla y firmar su URL para verla.
//
// EL ORDEN DE LAS OPERACIONES ES LO ÚNICO DELICADO, y son las dos reglas
// opuestas que `src/lib/comprobantes.js` ya tiene escritas para los
// comprobantes. Se repiten acá porque el dueño del dato es otro (la persona,
// no la Comisión) y el bucket es otro, pero el razonamiento es idéntico:
//
//  · Al SUBIR: primero el archivo, después la fila. Si la fila falla se borra
//    el archivo, así el bucket no junta huérfanos.
//  · Al QUITAR: primero la fila, después el archivo. Si la fila falla el
//    archivo sigue ahí y no pasa nada; al revés quedaría una fila prometiendo
//    una foto borrada, que se ve bien hasta que el navegador pide la imagen.
//
// EL BUCKET ES PRIVADO (`20260909020000_avatar_socio.sql`), así que acá no hay
// URLs públicas: se guarda la RUTA y se firma al leer. Las policies comparan la
// primera carpeta de la ruta con `auth.uid()`, de modo que la ruta NO es un
// detalle de presentación — es la frontera de seguridad. Por eso la arma esta
// capa y no el componente.
import { supabase } from '@/lib/supabase';
import { updateUserProfile } from '@/api/userApi';
import { attempt, voidResult } from '@/lib/dataResult';

export const BUCKET_AVATARES = 'avatares';

/**
 * Un archivo por persona, con nombre fijo, en su propia carpeta.
 *
 * ⚠️ El nombre fijo es deliberado: subir de nuevo REEMPLAZA. Con un nombre
 * único por subida el bucket acumularía todas las fotos viejas de cada socio
 * —que nadie limpia y siguen siendo su cara— y habría que borrar la anterior a
 * mano en cada cambio, que es exactamente el paso que alguien va a olvidar.
 */
export const rutaAvatar = (userId) => `${userId}/avatar.webp`;

/**
 * Cuánto vive la URL firmada. Diez minutos es lo que ya usan `documentsApi` y
 * `gastosApi` para lo mismo; alcanza de sobra para pintar una imagen y no deja
 * un link útil dando vueltas si alguien lo copia.
 */
export const SEGUNDOS_URL_FIRMADA = 600;

/**
 * Sube el blob recortado y recién después lo registra en `users.avatar_path`.
 *
 * @param {string} userId
 * @param {Blob} blob  El WebP de 512x512 que produjo el recortador.
 * @returns {Promise<{data: object|null, error: any}>} la fila actualizada.
 */
export const subirAvatar = async (userId, blob) => {
  if (!userId || !blob) {
    return { data: null, error: new Error('subirAvatar necesita un userId y un blob') };
  }

  const path = rutaAvatar(userId);

  const subida = await attempt(
    () => supabase.storage
      .from(BUCKET_AVATARES)
      .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true })
      .then(({ error }) => { if (error) throw error; return null; }),
    'subirAvatar/upload',
  );
  if (subida.error) return { data: null, error: subida.error };

  const resultado = await updateUserProfile(userId, { avatar_path: path });

  // Misma limpieza que en `comprobantes.js`: sin esto queda un archivo que
  // ninguna fila reclama.
  if (resultado.error) {
    await supabase.storage.from(BUCKET_AVATARES).remove([path]);
  }
  return resultado;
};

/** Desvincula primero, borra después. Ver el encabezado: es el orden inverso. */
export const quitarAvatar = async (userId, path) => {
  if (!userId) return { data: null, error: new Error('quitarAvatar necesita un userId') };

  const resultado = await updateUserProfile(userId, { avatar_path: null });
  if (resultado.error) return resultado;

  if (path) {
    await supabase.storage.from(BUCKET_AVATARES).remove([path]);
  }
  return resultado;
};

/**
 * Firma la URL para poder mostrar la foto.
 *
 * Devuelve `{data: null}` sin error cuando no hay ruta: «esta persona no tiene
 * foto» no es una falla, y el consumidor tiene que poder distinguirlo de «la
 * consulta se cayó» — la misma distinción que §10.23.b.
 */
export const urlAvatar = async (path) => {
  if (!path) return { data: null, error: null };

  const { data, error } = await supabase.storage
    .from(BUCKET_AVATARES)
    .createSignedUrl(path, SEGUNDOS_URL_FIRMADA);

  if (error) return voidResult({ error }, 'urlAvatar');
  return { data: data?.signedUrl ?? null, error: null };
};
