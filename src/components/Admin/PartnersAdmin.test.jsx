// Test de regresión del bug que destapó F2 (ROADMAP 4.1).
//
// Antes, la capa de datos devolvía `null` en error en vez de lanzar, así que el
// `try/catch` del panel no corría nunca y el admin veía "Partner aprobado ✅"
// aunque la RLS hubiera rechazado la operación. Estos tests fijan la regla:
// **si la capa devuelve `error`, el panel NO puede mostrar éxito.**
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// `fireEvent` en vez de `user-event`: alcanza para clicks y no suma una
// dependencia nueva (el proyecto fija versiones por compatibilidad con vite@4).
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const toast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  toast,
  useToast: () => ({ toast }),
}));

vi.mock('@/lib/storage', () => ({
  getPartners: vi.fn(),
  addPartner: vi.fn(),
  updatePartner: vi.fn(),
  deletePartner: vi.fn(),
}));

// `useContentQueries` importa el cliente Supabase (para las actividades).
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const { getPartners, updatePartner, deletePartner } = await import('@/lib/storage');
const PartnersAdmin = (await import('@/components/Admin/PartnersAdmin')).default;

/**
 * El panel lee vía TanStack Query (ROADMAP 4.2), así que necesita su provider.
 * Cliente nuevo por test: sin caché compartida entre casos y sin retry, para que
 * un fallo falle de una en vez de reintentar.
 */
const render = (ui) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const pendingPartner = {
  id: 'p1',
  nombre: 'ACME',
  descripcion: 'Una empresa',
  contacto_email: 'a@acme.com',
  estado: 'pendiente',
  orden: 1,
};

const dbError = { message: 'permission denied', code: '42501' };

/** ¿Se mostró algún toast con "✅" o sin variant destructive? */
const successToasts = () =>
  toast.mock.calls
    .map(([arg]) => arg)
    .filter((arg) => arg && arg.variant !== 'destructive');

const destructiveToasts = () =>
  toast.mock.calls.map(([arg]) => arg).filter((arg) => arg?.variant === 'destructive');

beforeEach(() => {
  vi.clearAllMocks();
  getPartners.mockResolvedValue({ data: [pendingPartner], error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PartnersAdmin — manejo de error de la capa de datos', () => {
  it('renderiza los partners que devuelve la capa', async () => {
    render(<PartnersAdmin />);
    expect(await screen.findByText('ACME')).toBeInTheDocument();
  });

  it('avisa y no rompe si falla la carga', async () => {
    // `data` es `[]` incluso en error, así que la tabla no explota.
    getPartners.mockResolvedValue({ data: [], error: dbError });
    render(<PartnersAdmin />);

    await waitFor(() => expect(destructiveToasts()).toHaveLength(1));
    expect(destructiveToasts()[0].title).toMatch(/error al cargar/i);
    expect(successToasts()).toHaveLength(0);
  });

  it('NO muestra éxito si aprobar falla', async () => {
    updatePartner.mockResolvedValue({ data: null, error: dbError });
    render(<PartnersAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: /aprobar acme/i }));

    await waitFor(() => expect(destructiveToasts()).toHaveLength(1));
    // El corazón de la regresión: cero toasts de éxito.
    expect(successToasts()).toHaveLength(0);
    expect(getPartners).toHaveBeenCalledTimes(1); // no recarga si falló
  });

  it('muestra éxito y recarga si aprobar sale bien', async () => {
    updatePartner.mockResolvedValue({ data: { ...pendingPartner, estado: 'aprobado' }, error: null });
    render(<PartnersAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: /aprobar acme/i }));

    await waitFor(() => expect(getPartners).toHaveBeenCalledTimes(2));
    expect(successToasts().some((t) => /aprobado/i.test(t.title))).toBe(true);
    expect(destructiveToasts()).toHaveLength(0);
  });

  it('NO muestra éxito si rechazar falla', async () => {
    updatePartner.mockResolvedValue({ data: null, error: dbError });
    render(<PartnersAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: /rechazar acme/i }));

    // Ojo: el toast de "rechazado" exitoso también es `destructive` por diseño,
    // así que acá comparamos el título, no la variante.
    await waitFor(() =>
      expect(toast.mock.calls.some(([a]) => /no se pudo rechazar/i.test(a?.title))).toBe(true)
    );
    expect(toast.mock.calls.some(([a]) => /^partner rechazado/i.test(a?.title))).toBe(false);
  });

  it('NO muestra éxito si eliminar falla, y libera el spinner', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deletePartner.mockResolvedValue({ data: null, error: dbError });
    render(<PartnersAdmin />);

    const deleteButton = await screen.findByRole('button', { name: /eliminar acme/i });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(destructiveToasts()).toHaveLength(1));
    expect(successToasts()).toHaveLength(0);
    expect(getPartners).toHaveBeenCalledTimes(1); // no recarga si falló
    // `deletingId` volvió a null: el botón no queda trabado en loading.
    expect(await screen.findByRole('button', { name: /eliminar acme/i })).toBeEnabled();
  });

  it('elimina y recarga cuando sale bien', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deletePartner.mockResolvedValue({ data: null, error: null });
    render(<PartnersAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: /eliminar acme/i }));

    await waitFor(() => expect(getPartners).toHaveBeenCalledTimes(2));
    expect(successToasts().some((t) => /eliminado/i.test(t.title))).toBe(true);
  });
});
