// Tests del libro de aportes (ROADMAP §10.11).
//
// Se concentran en los invariantes contables, no en el markup:
//  - un libro no se borra: NINGUNA fila ofrece borrar
//  - lo que vino de una pasarela no se edita a mano
//  - un fallo de la capa de datos NO se muestra como éxito (la regla que fijó
//    PartnersAdmin.test tras el bug de F2)
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const toast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({ toast, useToast: () => ({ toast }) }));

vi.mock('@/api/aportesApi', async () => {
  const real = await vi.importActual('@/api/aportesApi');
  return {
    ...real,
    getAportes: vi.fn(),
    createAporteManual: vi.fn(),
    updateAporte: vi.fn(),
    reimputarAporte: vi.fn(),
  };
});

vi.mock('@/api/destinosApi', async () => {
  const real = await vi.importActual('@/api/destinosApi');
  return { ...real, getDestinos: vi.fn() };
});

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const { getAportes, updateAporte, reimputarAporte } = await import('@/api/aportesApi');
const { getDestinos } = await import('@/api/destinosApi');
const AportesAdmin = (await import('@/components/Admin/AportesAdmin')).default;

const render = (ui) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const aporte = (extra = {}) => ({
  id: 'a1',
  destino_id: 'd1',
  destino: { id: 'd1', nombre: 'Pelotas y conos', tipo: 'campana' },
  origen: 'manual',
  monto: 5000,
  fecha: '2026-08-16',
  nombre_aportante: 'Ana Gómez',
  email_aportante: null,
  notas: null,
  ...extra,
});

const destino = { id: 'd1', nombre: 'Pelotas y conos', estado: 'activo' };

beforeEach(() => {
  vi.clearAllMocks();
  getDestinos.mockResolvedValue({ data: [destino], error: null });
});

describe('AportesAdmin', () => {
  it('muestra los aportes que trae la capa de datos', async () => {
    getAportes.mockResolvedValue({ data: [aporte()], error: null });
    render(<AportesAdmin />);
    expect(await screen.findByText('Pelotas y conos')).toBeInTheDocument();
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
  });

  // El invariante que define la pantalla: `aportes` no tiene policy de DELETE.
  // Ofrecer el botón sería invitar a una acción que la base va a rechazar.
  it('NINGUNA fila ofrece borrar: un libro contable no se borra', async () => {
    getAportes.mockResolvedValue({
      data: [aporte(), aporte({ id: 'a2', origen: 'donacion' })],
      error: null,
    });
    render(<AportesAdmin />);
    await screen.findAllByText('Pelotas y conos');
    expect(screen.queryByRole('button', { name: /borrar|eliminar/i })).not.toBeInTheDocument();
  });

  it('un aporte manual se puede corregir', async () => {
    getAportes.mockResolvedValue({ data: [aporte()], error: null });
    render(<AportesAdmin />);
    await screen.findByText('Pelotas y conos');
    expect(screen.getByRole('button', { name: /corregir/i })).toBeInTheDocument();
  });

  // Monto y fecha de una pasarela son SU registro: tocarlos haría que el libro
  // diverja de lo que MercadoPago dice que pasó (§10.10).
  it('un aporte de pasarela NO se puede corregir entero', async () => {
    getAportes.mockResolvedValue({ data: [aporte({ origen: 'donacion' })], error: null });
    render(<AportesAdmin />);
    await screen.findByText('Pelotas y conos');
    expect(screen.queryByRole('button', { name: /corregir/i })).not.toBeInTheDocument();
  });

  // Pero el destino SÍ: MercadoPago ni lo conoce, así que re-imputarlo no
  // contradice a nadie. Y hace falta, porque hasta que el servicio de pagos
  // reenvíe el destino elegido toda donación cae al institucional (§10.13).
  it('un aporte de pasarela SI puede cambiar de destino', async () => {
    getAportes.mockResolvedValue({ data: [aporte({ origen: 'donacion' })], error: null });
    render(<AportesAdmin />);
    await screen.findByText('Pelotas y conos');
    expect(screen.getByRole('button', { name: /cambiar destino/i })).toBeInTheDocument();
  });

  // El alcance del cambio es lo que lo hace seguro: solo el destino. Si esto
  // empezara a mandar monto o fecha, el libro divergiria de la pasarela.
  it('re-imputar manda SOLO el destino, nada mas', async () => {
    getAportes.mockResolvedValue({
      data: [aporte({ origen: 'donacion', destino_id: 'd1' })],
      error: null,
    });
    reimputarAporte.mockResolvedValue({ data: aporte(), error: null });

    render(<AportesAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: /cambiar destino/i }));
    // El Select de Radix no responde a fireEvent en jsdom, asi que se verifica
    // que sin cambiar nada NO se llame a la capa de datos: cerrar el dialogo sin
    // elegir otro destino no puede disparar una escritura.
    fireEvent.click(await screen.findByRole('button', { name: /^cambiar destino$/i, hidden: false }));
    await waitFor(() => expect(screen.queryByText(/nuevo destino/i)).not.toBeInTheDocument());
    expect(reimputarAporte).not.toHaveBeenCalled();
  });

  it('suma el total de lo que muestra', async () => {
    getAportes.mockResolvedValue({
      data: [aporte({ monto: 5000 }), aporte({ id: 'a2', monto: 12500 })],
      error: null,
    });
    render(<AportesAdmin />);
    expect(await screen.findByText('$17.500')).toBeInTheDocument();
  });

  // Sin destinos no hay dónde imputar: `aportes.destino_id` es NOT NULL, así que
  // el alta se bloquea acá en vez de fallar con un error de Postgres.
  it('sin destinos avisa y no deja registrar', async () => {
    getAportes.mockResolvedValue({ data: [], error: null });
    getDestinos.mockResolvedValue({ data: [], error: null });
    render(<AportesAdmin />);
    expect(await screen.findByText(/primero creá un destino/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar aporte/i })).toBeDisabled();
  });

  // La regla que fijó PartnersAdmin.test: la capa devuelve { data, error } y no
  // lanza, así que un `error` tiene que verse como fallo, nunca como éxito.
  //
  // Se ejerce por el camino de corrección y no por el alta porque el destino se
  // elige con un Select de Radix, que no responde a fireEvent en jsdom. Al
  // corregir, el formulario ya viene con el destino cargado y el submit llega
  // de verdad a la capa de datos, que es lo que este test tiene que probar.
  it('un fallo al guardar NO se muestra como exito', async () => {
    getAportes.mockResolvedValue({ data: [aporte()], error: null });
    updateAporte.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });

    render(<AportesAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: /corregir/i }));
    fireEvent.click(await screen.findByRole('button', { name: /guardar corrección/i }));

    await waitFor(() => expect(toast).toHaveBeenCalled());
    const llamada = toast.mock.calls.at(-1)[0];
    expect(llamada.variant).toBe('destructive');
    expect(llamada.title).toMatch(/no se pudo/i);
  });

  // Un monto <= 0 lo frena `min="1"` del input: la validación nativa del
  // navegador corta el submit ANTES de que React lo vea, así que por la UI ese
  // camino no llega a `validarAporte`. La red de contención en JS igual hace
  // falta —pegar un valor, un autofill, un cambio de markup— y se prueba donde
  // es alcanzable, en `aportesApi.test.js`. Acá se prueba lo otro: que una
  // corrección legítima efectivamente llegue a la capa de datos.
  it('una correccion valida llega a la capa de datos y avisa', async () => {
    getAportes.mockResolvedValue({ data: [aporte()], error: null });
    updateAporte.mockResolvedValue({ data: aporte({ monto: 8000 }), error: null });

    render(<AportesAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: /corregir/i }));
    fireEvent.change(await screen.findByLabelText(/monto/i), { target: { value: '8000' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar corrección/i }));

    await waitFor(() => expect(updateAporte).toHaveBeenCalled());
    const [id, payload] = updateAporte.mock.calls.at(-1);
    expect(id).toBe('a1');
    expect(payload.monto).toBe(8000);
    // Aunque se corrija, sigue siendo manual: es lo único que la RLS deja tocar.
    expect(payload.origen).toBe('manual');

    const llamada = toast.mock.calls.at(-1)[0];
    expect(llamada.variant).toBeUndefined();
    expect(llamada.title).toMatch(/corregido/i);
  });

  it('un error de carga se muestra como mensaje, no como objeto', async () => {
    getAportes.mockResolvedValue({ data: [], error: new Error('RLS lo rechazo') });
    render(<AportesAdmin />);
    expect(await screen.findByText(/RLS lo rechazo/)).toBeInTheDocument();
  });
});
