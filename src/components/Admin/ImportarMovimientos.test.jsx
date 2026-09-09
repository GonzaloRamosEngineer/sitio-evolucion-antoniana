// src/components/Admin/ImportarMovimientos.test.jsx
//
// Test de regresión de un footgun que apareció usando la pantalla de verdad
// (ROADMAP §14.3, HISTORIAL §14.5).
//
// Después de importar, la pantalla se reanaliza sola para que lo que acaba de
// entrar figure como «Ya cargado» — la prueba visible de que reimportar no
// duplica. Pero al reanalizar se perdían las decisiones manuales, así que las
// filas **marcadas y no destildadas** —las del día del inicio del destino—
// volvían a nacer tildadas.
//
// O sea que después de una importación correcta, la pantalla ofrecía importar
// exactamente las filas que la persona acababa de excluir a propósito, con el
// botón en rojo. En el caso real esos dos movimientos eran $943.402,93 que el
// fondo nunca gastó, y que su saldo inicial ya tenía descontados.
//
// La regla que fija este archivo: **importar no puede volver a tildar lo que la
// persona destildó.**
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const toast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({ toast, useToast: () => ({ toast }) }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

// El destino arranca a mitad del 10/10, igual que el fondo del convenio: es lo
// que hace que las dos filas de ese día queden marcadas y NO destildadas solas.
const DESTINO = {
  id: 'd1',
  nombre: 'Fondo de ordenamiento institucional',
  fecha_inicio: '2024-10-10',
};

vi.mock('@/hooks/useContentQueries', () => ({
  useDestinos: () => ({ data: [DESTINO] }),
}));

// El `Select` de Radix no renderiza un `<select>` nativo y no se puede operar con
// fireEvent en jsdom (necesita PointerEvent). Se reemplaza por uno plano: lo que
// este archivo prueba es la lógica de la pantalla, no el widget.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }) => (
    <select
      data-testid="destino"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="">Elegí un destino</option>
      {children}
    </select>
  ),
  SelectContent: ({ children }) => children,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

vi.mock('@/api/importarApi', () => ({
  getReferenciasCargadas: vi.fn(async () => ({ data: [], error: null })),
  importarLote: vi.fn(async () => ({
    data: { aportes: 0, gastos: 1, errores: [] },
    error: null,
  })),
}));

const { getReferenciasCargadas, importarLote } = await import('@/api/importarApi');
const ImportarMovimientos = (await import('@/components/Admin/ImportarMovimientos')).default;

// Tres movimientos: uno anterior al inicio (se destilda solo), uno del día del
// inicio (se marca pero NO se destilda) y uno posterior (entra).
const EXTRACTO = [
  'Fecha\tDescripción\tID\tValor\tSaldo',
  '09-10-2024\tLiquidación de dinero\t111\t$ 1.000,00\t$ 11.000,00',
  '10-10-2024\tTransferencia enviada Centro Juventud\t222\t$ -5.000,00\t$ 6.000,00',
  '14-10-2024\tImpuesto por extracción\t333\t$ -1.000,00\t$ 5.000,00',
].join('\n');

const render = (ui) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

/** Deja la pantalla analizada, con el destino elegido y el lote listo. */
const prepararLote = async () => {
  render(<ImportarMovimientos />);

  fireEvent.change(screen.getByLabelText(/pegar el extracto/i), {
    target: { value: EXTRACTO },
  });
  fireEvent.click(screen.getByRole('button', { name: /analizar/i }));
  await waitFor(() => expect(getReferenciasCargadas).toHaveBeenCalled());

  fireEvent.change(screen.getByTestId('destino'), { target: { value: DESTINO.id } });
  await waitFor(() =>
    expect(screen.getByText(/anteriores al inicio del destino/i)).toBeInTheDocument()
  );
};

const botonImportar = () => screen.getByRole('button', { name: /^Importar \d+ movimiento/i });

beforeEach(() => {
  vi.clearAllMocks();
  getReferenciasCargadas.mockResolvedValue({ data: [], error: null });
  importarLote.mockResolvedValue({ data: { aportes: 0, gastos: 1, errores: [] }, error: null });
});

describe('ImportarMovimientos — las decisiones manuales', () => {
  it('el corte por fecha destilda lo anterior y MARCA lo del día del inicio', async () => {
    await prepararLote();

    // Anterior al inicio: fuera. Del día del inicio: adentro pero señalado.
    expect(screen.getByText(/Anterior al inicio de este destino/i)).toBeInTheDocument();
    // Regex específica: el chip del resumen dice «1 del día del inicio: revisalos
    // a mano» y también matchearía una versión más laxa.
    expect(screen.getByText(/Del día del inicio: puede ser/i)).toBeInTheDocument();
    // Entran los dos que no son anteriores: el del día del inicio y el posterior.
    expect(botonImportar()).toHaveTextContent('Importar 2 movimientos');
  });

  it('🔒 importar NO vuelve a tildar lo que se destildó a mano', async () => {
    await prepararLote();

    // La persona destilda la fila del día del inicio, que es la peligrosa.
    fireEvent.click(screen.getByLabelText(/Transferencia enviada Centro Juventud/i));
    await waitFor(() => expect(botonImportar()).toHaveTextContent('Importar 1 movimiento'));

    fireEvent.click(botonImportar());

    // Tras importar, la pantalla se reanaliza sola. El botón NO puede volver a
    // ofrecer la fila excluida: antes decía "Importar 1 movimiento" otra vez, y
    // ese movimiento era justo el que se acababa de sacar.
    await waitFor(() => expect(importarLote).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getReferenciasCargadas).toHaveBeenCalledTimes(2));

    const excluida = screen.getByLabelText(/Transferencia enviada Centro Juventud/i);
    expect(excluida).not.toBeChecked();
  });

  /*
    TILDAR EN BLOQUE POR TIPO. Existe porque un lote va a UN destino y un extracto
    trae las dos cosas mezcladas: los egresos del fondo restringido y los ingresos
    nuevos, que son de libre disponibilidad y NO pertenecen a él. En los 22
    resúmenes reales de la Fundación separar a mano es destildar 109 filas — con
    eso nadie lo hace y todo termina en un solo destino, mezclado.
  */
  it('«solo los gastos» deja tildados los gastos y ninguno más', async () => {
    await prepararLote();
    fireEvent.click(screen.getByRole('button', { name: /Solo los \d+ gastos/i }));
    // Los dos gastos: el del día del inicio y el posterior.
    await waitFor(() => expect(botonImportar()).toHaveTextContent('Importar 2 movimientos'));
  });

  it('🔒 «solo los aportes» NO revive lo anterior al inicio del destino', async () => {
    // El único aporte del lote es anterior al 10/10, así que el corte lo había
    // destildado. Si el tildado en bloque lo pisara, una acción pensada para
    // ahorrar clics desharía en uno la única protección automática que hay.
    await prepararLote();
    fireEvent.click(screen.getByRole('button', { name: /Solo los \d+ aportes/i }));

    const anterior = screen.getByLabelText(/Liquidación de dinero/i);
    expect(anterior).not.toBeChecked();
    expect(botonImportar()).toBeDisabled();
  });

  it('🔒 «Todo» tampoco lo revive', async () => {
    await prepararLote();
    fireEvent.click(screen.getByRole('button', { name: /^Todo$/i }));
    expect(screen.getByLabelText(/Liquidación de dinero/i)).not.toBeChecked();
    await waitFor(() => expect(botonImportar()).toHaveTextContent('Importar 2 movimientos'));
  });

  // Control positivo: sin esto, "nunca vuelve a tildar nada" y "conserva las
  // decisiones" se ven idénticos desde afuera, y una pantalla que dejara todo
  // destildado para siempre pasaría el test de arriba.
  it('🔒 elegir otro extracto SÍ borra las decisiones: los índices ya no son los mismos', async () => {
    await prepararLote();

    fireEvent.click(screen.getByLabelText(/Transferencia enviada Centro Juventud/i));
    await waitFor(() => expect(botonImportar()).toHaveTextContent('Importar 1 movimiento'));

    // Se vuelve a pegar y a analizar: es una fuente nueva.
    fireEvent.change(screen.getByLabelText(/pegar el extracto/i), {
      target: { value: EXTRACTO },
    });
    fireEvent.click(screen.getByRole('button', { name: /analizar/i }));
    await waitFor(() => expect(getReferenciasCargadas).toHaveBeenCalledTimes(2));

    await waitFor(() => expect(botonImportar()).toHaveTextContent('Importar 2 movimientos'));
  });
});
