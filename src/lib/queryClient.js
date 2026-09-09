// src/lib/queryClient.js
//
// Caché de estado servidor (ROADMAP 4.2). Reemplaza el patrón de
// `useEffect` + `useState(loading/error)` repetido en 18 páginas, y la caché
// casera de `sessionStorage('activities_loaded')` que había en Activities.
import { QueryClient } from '@tanstack/react-query';

/**
 * Puente entre el contrato de la capa de datos y TanStack Query.
 *
 * Nuestra capa devuelve `{ data, error }` y **nunca lanza** (ver `dataResult.js`),
 * pero TanStack necesita que el `queryFn` **lance** para marcar la query como
 * fallida y activar retry/estado de error. Así que la conversión inversa se hace
 * acá, en el borde — nunca en la capa: si la capa volviera a lanzar, perderíamos
 * todo lo que ganamos en F2.
 *
 * Uso:  useQuery({ queryKey: ['news'], queryFn: () => unwrap(getNews()) })
 */
export const unwrap = async (resultPromise) => {
  const { data, error } = await resultPromise;
  if (error) throw error;
  return data;
};

/** Claves de query centralizadas: evita typos y hace fácil invalidar por prefijo. */
export const queryKeys = {
  news: ['news'],
  // Anidada bajo 'news' a propósito: invalidar `['news']` alcanza a los detalles.
  newsItem: (slugOrId) => ['news', 'item', slugOrId],
  partners: ['partners'],
  benefits: ['benefits'],
  // La vidriera es OTRA clave que `benefits`, a propósito: son dos tablas
  // distintas y compartir la clave haría que invalidar el ABM viejo pise el
  // catálogo nuevo con datos de la forma vieja (ROADMAP §12.10.8).
  beneficiosVidriera: ['club', 'beneficios', 'vidriera'],
  // Anidada bajo 'acceso' a propósito: reclamar un aporte cambia el acceso Y la
  // elegibilidad del club, así que una sola invalidación por prefijo alcanza.
  elegibilidadClub: (userId) => ['acceso', userId, 'elegibilidad-club'],
  activities: ['activities'],
  // Lleva `userId` en la clave a propósito: el precio DEPENDE de quién mira
  // (categoría de miembro y descuento). Sin eso, al cambiar de sesión la
  // siguiente persona vería el precio con descuento de la anterior.
  precioActividad: (activityId, userId) => ['activities', activityId, 'precio', userId ?? 'anon'],
  userRegistrations: (userId) => ['registrations', userId],
  userMemberships: (userId) => ['memberships', userId],
  userDonations: (userId) => ['donations', userId],
  // Por usuario a propósito: si la clave fuera global, al cambiar de sesión el
  // socio nuevo vería el estado de acceso del anterior hasta que expire la caché.
  // La URL FIRMADA de la foto de perfil. Clave propia y NO anidada bajo
  // 'acceso': la foto no cambia cuando cambia el aporte, y meterla ahí haría
  // que reclamar una donación volviera a firmar la imagen al pasar.
  avatar: (path) => ['avatar', path],
  acceso: (userId) => ['acceso', userId],
  antiguedad: (userId) => ['acceso', userId, 'antiguedad'],
  // Anidada bajo 'acceso' a propósito: reclamar una donación cambia el acceso,
  // la antigüedad y esta misma lista, así que una sola invalidación por prefijo
  // tiene que alcanzar a las tres.
  reclamables: (userId) => ['acceso', userId, 'reclamables'],
  // Mismo prefijo, misma razón: reclamar una huella no cambia el acceso, pero
  // el botón que la ofrece vive al lado del de aportes y los dos tienen que
  // apagarse juntos. Una sola invalidación por prefijo alcanza a las dos listas.
  huellas: (userId) => ['acceso', userId, 'huellas'],
  // La condición institucional (§10.1.a) también va por usuario y bajo el mismo
  // prefijo: el primer aporte que otorga acceso DA DE ALTA al miembro, así que
  // reclamar cambia las dos cosas a la vez y no pueden quedar desfasadas.
  membresia: (userId) => ['acceso', userId, 'membresia'],
  reglasMembresia: ['reglas-membresia'],
  padron: ['miembros'],
  huellasSinCuenta: ['huellas-sin-cuenta'],
  categoriasMiembro: ['categorias-miembro'],
  foundationMetrics: ['fundacion_metrics'],
  preinscriptions: ['preinscriptions'],
  destinos: ['destinos'],
  // Anidada bajo 'destinos' a propósito, igual que newsItem: invalidar
  // `['destinos']` alcanza también a los detalles.
  destino: (slug) => ['destinos', 'item', slug],
  aportes: ['aportes'],
  gastos: ['gastos'],
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Contenido institucional que cambia poco: 5 min sin refetch. Esto es lo
      // que reemplaza a la caché casera — al volver a una página ya visitada, se
      // muestra el dato cacheado al instante en vez de un spinner.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      // Sin refetch al enfocar la ventana: en un sitio institucional molesta más
      // de lo que aporta (y multiplica las llamadas a Supabase sin necesidad).
      refetchOnWindowFocus: false,
      // Un solo reintento: los errores que llegan acá suelen ser de RLS o de
      // datos, no transitorios, así que reintentar de más solo demora el error.
      retry: 1,
    },
  },
});
