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
  activities: ['activities'],
  userRegistrations: (userId) => ['registrations', userId],
  userMemberships: (userId) => ['memberships', userId],
  userDonations: (userId) => ['donations', userId],
  // Por usuario a propósito: si la clave fuera global, al cambiar de sesión el
  // socio nuevo vería el estado de acceso del anterior hasta que expire la caché.
  acceso: (userId) => ['acceso', userId],
  antiguedad: (userId) => ['acceso', userId, 'antiguedad'],
  foundationMetrics: ['fundacion_metrics'],
  preinscriptions: ['preinscriptions'],
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
