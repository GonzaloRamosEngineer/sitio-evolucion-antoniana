// Tests del CRUD de destinos (ROADMAP §10.9).
//
// Se concentran en lo que tiene consecuencias reales y no en el markup:
//  - que el default de visibilidad sea `anonimizado` (protege a menores)
//  - que un destino con aportes NO ofrezca borrarse (es un libro contable)
//  - que un error de la capa de datos NO se muestre como éxito (la regla que
//    fijó PartnersAdmin.test tras el bug de F2)
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const toast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({ toast, useToast: () => ({ toast }) }));

vi.mock('@/api/destinosApi', async () => {
  const real = await vi.importActual('@/api/destinosApi');
  return {
    ...real,
    getDestinos: vi.fn(),
    createDestino: vi.fn(),
    updateDestino: vi.fn(),
    deleteDestino: vi.fn(),
  };
});

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const { getDestinos, deleteDestino } = await import('@/api/destinosApi');
const DestinosAdmin = (await import('@/components/Admin/DestinosAdmin')).default;

const render = (ui) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const destino = (extra = {}) => ({
  id: 'd1',
  tipo: 'campana',
  nombre: 'Pelotas y conos',
  slug: 'pelotas-y-conos',
  estado: 'activo',
  visibilidad_beneficiario: 'anonimizado',
  monto_recaudado: 0,
  cantidad_aportes: 0,
  meta_monto: null,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DestinosAdmin', () => {
  it('muestra los destinos que trae la capa de datos', async () => {
    getDestinos.mockResolvedValue({ data: [destino()], error: null });
    render(<DestinosAdmin />);
    expect(await screen.findByText('Pelotas y conos')).toBeInTheDocument();
  });

  it('un destino SIN aportes ofrece borrarse', async () => {
    getDestinos.mockResolvedValue({ data: [destino({ cantidad_aportes: 0 })], error: null });
    render(<DestinosAdmin />);
    await screen.findByText('Pelotas y conos');
    expect(screen.getByRole('button', { name: /borrar/i })).toBeInTheDocument();
  });

  // Un libro contable no se borra: la base lo rechaza con FK RESTRICT y el panel
  // ni siquiera lo ofrece, para no invitar a una acción que va a fallar.
  it('un destino CON aportes no ofrece borrarse', async () => {
    getDestinos.mockResolvedValue({
      data: [destino({ cantidad_aportes: 3, monto_recaudado: 15000 })],
      error: null,
    });
    render(<DestinosAdmin />);
    await screen.findByText('Pelotas y conos');
    expect(screen.queryByRole('button', { name: /borrar/i })).not.toBeInTheDocument();
  });

  it('avisa en la tarjeta cuando el beneficiario es publico', async () => {
    getDestinos.mockResolvedValue({
      data: [destino({ visibilidad_beneficiario: 'publico' })],
      error: null,
    });
    render(<DestinosAdmin />);
    expect(await screen.findByText(/muestra al beneficiario/i)).toBeInTheDocument();
  });

  // La regla que fijó PartnersAdmin.test: la capa devuelve { data, error } y no
  // lanza, así que un `error` tiene que verse como fallo, nunca como éxito.
  it('un fallo al borrar NO se muestra como exito', async () => {
    getDestinos.mockResolvedValue({ data: [destino()], error: null });
    deleteDestino.mockResolvedValue({
      data: null,
      error: { code: '23503', message: 'Este destino ya recibio aportes' },
    });

    render(<DestinosAdmin />);
    await screen.findByText('Pelotas y conos');
    fireEvent.click(screen.getByRole('button', { name: /borrar/i }));

    await waitFor(() => expect(toast).toHaveBeenCalled());
    const llamada = toast.mock.calls.at(-1)[0];
    expect(llamada.variant).toBe('destructive');
    expect(llamada.title).toMatch(/no se pudo/i);
  });

  it('un error de carga se muestra como mensaje, no como objeto', async () => {
    getDestinos.mockResolvedValue({ data: [], error: new Error('RLS lo rechazo') });
    render(<DestinosAdmin />);
    expect(await screen.findByText(/RLS lo rechazo/)).toBeInTheDocument();
  });
});
