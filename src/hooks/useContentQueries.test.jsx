// Tests de los hooks de contenido (ROADMAP 4.2).
//
// Lo que fijan: que los filtros de negocio (partners aprobados, beneficios
// activos) vivan en el hook y **no se puedan perder** si el consumidor pasa su
// propio `select`. Esa era una trampa del primer diseño: como las opciones del
// caller se esparcen al final, un `select` de la Home reemplazaba el filtro en
// silencio y habría mostrado partners sin aprobar en la portada.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/storage', () => ({
  getNews: vi.fn(),
  getNewsById: vi.fn(),
  getNewsBySlug: vi.fn(),
  getPartners: vi.fn(),
  getBenefits: vi.fn(),
}));

vi.mock('@/api/educationApi', () => ({ getPreinscriptions: vi.fn() }));
vi.mock('@/api/activitiesApi', () => ({ getUserRegistrations: vi.fn() }));
vi.mock('@/api/membershipApi', () => ({ getUserMemberships: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const { getPartners, getBenefits, getNews, getNewsById, getNewsBySlug } = await import(
  '@/lib/storage'
);
const { getUserRegistrations } = await import('@/api/activitiesApi');
const {
  useApprovedPartners,
  useAllPartners,
  useActiveBenefits,
  useNews,
  useNewsItem,
  useUserRegistrations,
} = await import('@/hooks/useContentQueries');

const PARTNERS = [
  { id: '1', nombre: 'Aprobado A', estado: 'aprobado' },
  { id: '2', nombre: 'Pendiente B', estado: 'pendiente' },
  { id: '3', nombre: 'Aprobado C', estado: 'aprobado' },
];

const BENEFITS = [
  { id: '1', titulo: 'Activo', estado: 'activo' },
  { id: '2', titulo: 'Inactivo', estado: 'inactivo' },
];

/** Provider con retry apagado: en tests un fallo debe fallar ya, no reintentar. */
const wrapper = ({ children }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  vi.clearAllMocks();
  getPartners.mockResolvedValue({ data: PARTNERS, error: null });
  getBenefits.mockResolvedValue({ data: BENEFITS, error: null });
  getNews.mockResolvedValue({ data: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }], error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useApprovedPartners', () => {
  it('filtra los no aprobados', async () => {
    const { result } = renderHook(() => useApprovedPartners(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data.map((p) => p.nombre)).toEqual(['Aprobado A', 'Aprobado C']);
  });

  it('un `select` del caller NO puede saltear el filtro de aprobados', async () => {
    // Esto es la regresión: la Home pide `.slice(0, 1)` y debe recibir el
    // recorte de los **aprobados**, no de la lista cruda (donde el segundo
    // elemento es un pendiente).
    const { result } = renderHook(
      () => useApprovedPartners({ select: (rows) => rows.slice(0, 2) }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data.map((p) => p.nombre)).toEqual(['Aprobado A', 'Aprobado C']);
    expect(result.current.data.some((p) => p.estado !== 'aprobado')).toBe(false);
  });
});

describe('useActiveBenefits', () => {
  it('filtra los inactivos y respeta el select del caller', async () => {
    const { result } = renderHook(
      () => useActiveBenefits({ select: (rows) => rows.map((b) => b.titulo) }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(['Activo']);
  });
});

describe('useAllPartners', () => {
  it('no filtra (es la vista del panel admin)', async () => {
    const { result } = renderHook(() => useAllPartners(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
  });
});

describe('propagación de errores', () => {
  it('un error de la capa deja la query en isError, no en lista vacía', async () => {
    // Sin `unwrap` esto se vería como `data: []` con `isSuccess: true`, y la
    // página mostraría su estado vacío en vez del de error.
    getPartners.mockResolvedValue({ data: [], error: { message: 'permission denied' } });

    const { result } = renderHook(() => useApprovedPartners(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toMatchObject({ message: 'permission denied' });
    expect(result.current.data).toBeUndefined();
  });
});

describe('caché compartida', () => {
  it('dos hooks sobre la misma entidad hacen UNA sola llamada', async () => {
    // Es el punto de 4.2: la Home y PartnersPage comparten entrada de caché en
    // vez de pedir lo mismo dos veces.
    const { result } = renderHook(
      () => ({
        publicas: useApprovedPartners(),
        admin: useAllPartners(),
      }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.publicas.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.admin.isSuccess).toBe(true));

    expect(getPartners).toHaveBeenCalledTimes(1);
    // Misma caché, distinta vista.
    expect(result.current.publicas.data).toHaveLength(2);
    expect(result.current.admin.data).toHaveLength(3);
  });
});

describe('useNews', () => {
  it('devuelve todo por defecto y recorta con el select del caller', async () => {
    const { result } = renderHook(() => useNews({ select: (rows) => rows.slice(0, 3) }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
  });
});

describe('useNewsItem', () => {
  const UUID = '3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';

  it('resuelve por id cuando el parámetro es un UUID', async () => {
    getNewsById.mockResolvedValue({ data: { id: UUID }, error: null });

    const { result } = renderHook(() => useNewsItem(UUID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getNewsById).toHaveBeenCalledWith(UUID);
    expect(getNewsBySlug).not.toHaveBeenCalled();
  });

  it('resuelve por slug cuando no lo es', async () => {
    getNewsBySlug.mockResolvedValue({ data: { slug: 'una-noticia' }, error: null });

    const { result } = renderHook(() => useNewsItem('una-noticia'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getNewsBySlug).toHaveBeenCalledWith('una-noticia');
    expect(getNewsById).not.toHaveBeenCalled();
  });

  it('no consulta nada sin parámetro de ruta', async () => {
    renderHook(() => useNewsItem(undefined), { wrapper });

    // Un `await` para darle la chance de disparar si el `enabled` estuviera mal.
    await new Promise((r) => setTimeout(r, 20));
    expect(getNewsById).not.toHaveBeenCalled();
    expect(getNewsBySlug).not.toHaveBeenCalled();
  });
});

describe('queries por usuario: guard `enabled`', () => {
  it('NO consulta mientras no hay userId', async () => {
    // Sin el `enabled`, esto dispararía una consulta con `undefined` y quedaría
    // cacheada bajo una clave inútil — y en el Dashboard se ejecuta en cada
    // render mientras auth resuelve.
    const { result } = renderHook(() => useUserRegistrations(undefined), { wrapper });

    await new Promise((r) => setTimeout(r, 20));
    expect(getUserRegistrations).not.toHaveBeenCalled();
    // Una query deshabilitada sigue en `isPending`: por eso el Dashboard combina
    // este estado con `Boolean(userId)` para no dejar el spinner colgado.
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('consulta en cuanto hay userId', async () => {
    getUserRegistrations.mockResolvedValue({ data: [{ id: 'r1' }], error: null });

    const { result } = renderHook(() => useUserRegistrations('u1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getUserRegistrations).toHaveBeenCalledWith('u1');
    expect(result.current.data).toEqual([{ id: 'r1' }]);
  });
});

describe('detalle desde la caché del listado', () => {
  it('resuelve un partner por slug sin pedir nada extra', async () => {
    // Es lo que hace PartnerDetailPage: navegar del listado al detalle no
    // dispara una consulta nueva.
    const { result } = renderHook(
      () =>
        useAllPartners({
          select: (rows) => rows.find((p) => p.nombre === 'Pendiente B') ?? null,
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({ id: '2' });
    expect(getPartners).toHaveBeenCalledTimes(1);
  });

  it('devuelve null si el slug no existe, sin romper', async () => {
    const { result } = renderHook(
      () => useAllPartners({ select: (rows) => rows.find((p) => p.slug === 'no-existe') ?? null }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});
