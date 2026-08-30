// Tests del panel de gastos (ROADMAP §10.9, fase 2).
//
// Se concentran en lo que tiene consecuencias sobre gente real:
//  - publicar es una acción aparte, y publica el gasto entero
//  - un gasto sin comprobante NO se esconde, se marca
//  - un libro contable no se borra
//  - un fallo de la capa de datos NO se muestra como éxito
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const toast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({ toast, useToast: () => ({ toast }) }));

vi.mock('@/api/gastosApi', async () => {
  const real = await vi.importActual('@/api/gastosApi');
  return {
    ...real,
    getGastos: vi.fn(),
    createGasto: vi.fn(),
    updateGasto: vi.fn(),
    setPublicado: vi.fn(),
    subirComprobante: vi.fn(),
    quitarComprobante: vi.fn(),
    urlComprobante: vi.fn(),
  };
});

vi.mock('@/api/destinosApi', async () => {
  const real = await vi.importActual('@/api/destinosApi');
  return { ...real, getDestinos: vi.fn() };
});

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const { getGastos, setPublicado, updateGasto } = await import('@/api/gastosApi');
const { getDestinos } = await import('@/api/destinosApi');
const GastosAdmin = (await import('@/components/Admin/GastosAdmin')).default;

const render = (ui) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const gasto = (extra = {}) => ({
  id: 'g1',
  destino_id: 'd1',
  destino: { id: 'd1', nombre: 'Pelotas y conos', tipo: 'campana', estado: 'activo' },
  concepto: 'Compra de pelotas',
  monto: 30000,
  fecha: '2026-08-16',
  categoria: null,
  proveedor: null,
  notas: null,
  publicado: false,
  tiene_comprobante: false,
  comprobante_path: null,
  comprobante_nombre: null,
  ...extra,
});

const destino = {
  id: 'd1', nombre: 'Pelotas y conos', estado: 'activo',
  monto_recaudado: 100000, monto_rendido: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  getDestinos.mockResolvedValue({ data: [destino], error: null });
});

describe('GastosAdmin', () => {
  it('muestra los gastos que trae la capa de datos', async () => {
    getGastos.mockResolvedValue({ data: [gasto()], error: null });
    render(<GastosAdmin />);
    expect(await screen.findByText('Compra de pelotas')).toBeInTheDocument();
  });

  // Gastado y rendido son dos números distintos y los dos verdaderos: mostrar
  // solo uno esconde la brecha que esta pantalla existe para cerrar.
  it('distingue lo gastado de lo rendido', async () => {
    // Montos elegidos para que ni el total gastado ni el rendido coincidan con
    // el monto de ninguna fila: si coincidieran, la aserción pasaría por
    // encontrar la fila y no el total, que es lo que se quiere probar.
    getGastos.mockResolvedValue({
      data: [
        gasto({ concepto: 'Pelotas', monto: 30000, publicado: true }),
        gasto({ id: 'g2', concepto: 'Conos', monto: 20000, publicado: true }),
        gasto({ id: 'g3', concepto: 'Bolsos', monto: 12000, publicado: false }),
      ],
      error: null,
    });
    render(<GastosAdmin />);
    await screen.findByText('Pelotas');
    expect(screen.getByText('$62.000')).toBeInTheDocument(); // gastado: los tres
    expect(screen.getByText('$50.000')).toBeInTheDocument(); // rendido: solo los publicados
  });

  // El invariante del libro: `gastos` no tiene el GRANT de DELETE.
  it('NINGUNA fila ofrece borrar', async () => {
    getGastos.mockResolvedValue({ data: [gasto(), gasto({ id: 'g2', publicado: true })], error: null });
    render(<GastosAdmin />);
    await screen.findAllByText('Compra de pelotas');
    expect(screen.queryByRole('button', { name: /borrar|eliminar/i })).not.toBeInTheDocument();
  });

  it('un gasto interno ofrece publicarse; uno publicado, despublicarse', async () => {
    getGastos.mockResolvedValue({ data: [gasto()], error: null });
    const { unmount } = render(<GastosAdmin />);
    await screen.findByText('Compra de pelotas');
    expect(screen.getByRole('button', { name: /^publicar$/i })).toBeInTheDocument();
    unmount();

    getGastos.mockResolvedValue({ data: [gasto({ publicado: true })], error: null });
    render(<GastosAdmin />);
    await screen.findByText('Compra de pelotas');
    expect(screen.getByRole('button', { name: /despublicar/i })).toBeInTheDocument();
  });

  // Publicar es un acto hacia afuera, y el aviso tiene que decir que se publica
  // TODO el gasto: no hay publicación por columna.
  it('al publicar avisa que se publican todos los datos', async () => {
    getGastos.mockResolvedValue({ data: [gasto()], error: null });
    setPublicado.mockResolvedValue({ data: gasto({ publicado: true }), error: null });

    render(<GastosAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }));

    await waitFor(() => expect(setPublicado).toHaveBeenCalledWith('g1', true));
    const llamada = toast.mock.calls.at(-1)[0];
    expect(llamada.title).toMatch(/publicado/i);
    expect(llamada.description).toMatch(/todos sus datos/i);
  });

  // Mostrar el hueco es más honesto que esconder la fila, y es lo que hace
  // creíble al resto de la rendición.
  it('un gasto sin comprobante se marca y ofrece adjuntarlo', async () => {
    getGastos.mockResolvedValue({ data: [gasto({ tiene_comprobante: false })], error: null });
    render(<GastosAdmin />);
    await screen.findByText('Compra de pelotas');
    expect(screen.getByText(/adjuntar comprobante/i)).toBeInTheDocument();
    expect(screen.getByText(/sin comprobante/i)).toBeInTheDocument();
  });

  it('un gasto con comprobante lo ofrece abrir, no adjuntar', async () => {
    getGastos.mockResolvedValue({
      data: [gasto({ tiene_comprobante: true, comprobante_path: 'gastos/g1/x.pdf', comprobante_nombre: 'factura.pdf' })],
      error: null,
    });
    render(<GastosAdmin />);
    await screen.findByText('Compra de pelotas');
    expect(screen.getByRole('button', { name: /factura\.pdf/i })).toBeInTheDocument();
    expect(screen.queryByText(/adjuntar comprobante/i)).not.toBeInTheDocument();
  });

  // La regla que fijó PartnersAdmin.test: la capa devuelve { data, error } y no
  // lanza, así que un `error` tiene que verse como fallo, nunca como éxito.
  it('un fallo al publicar NO se muestra como exito', async () => {
    getGastos.mockResolvedValue({ data: [gasto()], error: null });
    setPublicado.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });

    render(<GastosAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }));

    await waitFor(() => expect(toast).toHaveBeenCalled());
    const llamada = toast.mock.calls.at(-1)[0];
    expect(llamada.variant).toBe('destructive');
    expect(llamada.title).toMatch(/no se pudo/i);
  });

  it('una correccion valida llega a la capa de datos', async () => {
    getGastos.mockResolvedValue({ data: [gasto()], error: null });
    updateGasto.mockResolvedValue({ data: gasto({ monto: 25000 }), error: null });

    render(<GastosAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: /corregir/i }));
    fireEvent.change(await screen.findByLabelText(/monto/i), { target: { value: '25000' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar corrección/i }));

    await waitFor(() => expect(updateGasto).toHaveBeenCalled());
    const [id, payload] = updateGasto.mock.calls.at(-1);
    expect(id).toBe('g1');
    expect(payload.monto).toBe(25000);
  });

  it('un error de carga se muestra como mensaje, no como objeto', async () => {
    getGastos.mockResolvedValue({ data: [], error: new Error('RLS lo rechazo') });
    render(<GastosAdmin />);
    expect(await screen.findByText(/RLS lo rechazo/)).toBeInTheDocument();
  });
});
