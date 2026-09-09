// Tests del panel de gastos (ROADMAP §10.9, fase 2).
//
// Se concentran en lo que tiene consecuencias sobre gente real:
//  - publicar es una acción aparte, y publica el gasto entero
//  - un gasto sin comprobante NO se esconde, se marca
//  - un libro contable no se borra
//  - un fallo de la capa de datos NO se muestra como éxito
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent, within } from '@testing-library/react';
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
    // ⚠️ Con dos decimales SIEMPRE. Estas dos aserciones decían '$62.000' y
    // '$50.000', o sea que FIJABAN EL BUG: el panel formateaba sin decimales y
    // mostraba «$78.748,7» donde el monto era «$78.748,70» — siete centavos en
    // lugar de setenta, en la pantalla que sirve para cruzar el libro contra un
    // extracto. Ahora el formateo sale de `pesos()` en `src/lib/utils.js`.
    expect(screen.getByText('$62.000,00')).toBeInTheDocument(); // gastado: los tres
    expect(screen.getByText('$50.000,00')).toBeInTheDocument(); // rendido: solo los publicados
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
    // `getAllByText` y no `getByText`: desde que hay chips de filtro (2026-09-08)
    // «Sin comprobante» aparece dos veces —el chip y la tarjeta del resumen— y las
    // dos son correctas. Lo que este test fija es que el hueco se MUESTRA, no
    // dónde: se comprueba que está en la tarjeta, que es la que lo cuenta.
    expect(screen.getAllByText(/sin comprobante/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Se muestran igual, marcados')).toBeInTheDocument();
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

  /*
    LA ESTRUCTURA DEL FORMULARIO.

    Esta pantalla está detrás de sesión, así que el chequeo con Chrome headless de
    §B **no verifica ni una línea** de ella: `ProtectedRoute` redirige antes de que
    el componente se monte. Montarla en un test es lo único que queda, y alcanza
    para lo que se rompe de verdad.

    Lo que se rompió acá fue anidado: el bloque del comprobante vivía DENTRO de la
    grilla de dos columnas de categoría/proveedor, o sea que era su tercer item.
    Quedaba en la mitad izquierda de la segunda fila y, al partirse a su vez en dos
    columnas, cada campo ocupaba un cuarto del ancho del modal con la mitad derecha
    vacía. Ni el build ni el lint ni los tests de comportamiento lo ven: el
    formulario funciona perfecto, se ve mal.
  */
  it('🔒 todos los campos son hijos directos de la grilla del formulario', async () => {
    getGastos.mockResolvedValue({ data: [gasto()], error: null });
    render(<GastosAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: /corregir/i }));
    await screen.findByLabelText(/categoría/i);

    const formulario = document.querySelector('form');
    expect(formulario.className).toMatch(/grid/);

    // Una sola grilla y sin anidar: con esto, el ancho de cada campo lo decide su
    // `col-span` y no la posición que le tocó dentro de otra grilla.
    for (const id of [
      'gasto-destino', 'gasto-fecha', 'gasto-concepto', 'gasto-monto',
      'gasto-categoria', 'gasto-proveedor', 'gasto-tipo-comp', 'gasto-num-comp',
      'gasto-notas',
    ]) {
      const campo = document.getElementById(id);
      expect(campo, `falta el campo ${id}`).not.toBeNull();
      expect(campo.closest('div').parentElement, `${id} no cuelga del form`).toBe(formulario);
    }
  });

  // Lo que el dueño pidió el 2026-09-06 y resultó ser una regla del proyecto:
  // publicar un gasto publica la fila entera, así que los campos que la persona
  // escribe tienen que decir en pantalla que son públicos.
  it('🔒 concepto y proveedor avisan que se publican', async () => {
    getGastos.mockResolvedValue({ data: [gasto()], error: null });
    render(<GastosAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: /corregir/i }));

    expect(await screen.findByText(/se lee en la rendición pública/i)).toBeInTheDocument();
    expect(screen.getByText(/no una persona/i)).toBeInTheDocument();
  });

  /*
    FILTRAR POR ESTADO Y PUBLICAR EN BLOQUE. Aparecieron cuando el importador
    metió 25 gastos de golpe: la pregunta de quien entra acá dejó de ser «cuál
    dice tal palabra» y pasó a ser «cuáles me faltan».
  */
  it('el filtro «sin publicar» deja solo los internos', async () => {
    getGastos.mockResolvedValue({
      data: [gasto({ id: 'g1', concepto: 'Interno uno', publicado: false }),
        gasto({ id: 'g2', concepto: 'Ya publicado', publicado: true })],
      error: null,
    });
    render(<GastosAdmin />);
    await screen.findByText('Interno uno');
    expect(screen.getByText('Ya publicado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Sin publicar/i }));

    expect(screen.getByText('Interno uno')).toBeInTheDocument();
    expect(screen.queryByText('Ya publicado')).toBeNull();
  });

  it('🔒 publicar en bloque PIDE CONFIRMACIÓN y dice cuánta plata sale', async () => {
    // La regla de esta pantalla es que publicar sea deliberado. Con 21 gastos,
    // 21 clics idénticos no son deliberación: a partir del quinto nadie lee.
    getGastos.mockResolvedValue({
      data: [gasto({ id: 'g1', monto: 30000, publicado: false }),
        gasto({ id: 'g2', concepto: 'Otro gasto', monto: 20000, publicado: false })],
      error: null,
    });
    render(<GastosAdmin />);
    await screen.findByText('Compra de pelotas');

    fireEvent.click(screen.getByRole('button', { name: /Publicar los 2 sin publicar/i }));

    // Nada se publicó todavía: primero informa.
    expect(setPublicado).not.toHaveBeenCalled();
    // `within(dialog)` y no `screen`: la tarjeta «Gastado» del panel muestra el
    // mismo $50.000, y buscar en toda la pantalla haría pasar el test sin que el
    // diálogo dijera nada — que es justo lo que se quiere fijar.
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/\$50\.000/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/Pelotas y conos/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Publicar 2$/i }));
    await waitFor(() => expect(setPublicado).toHaveBeenCalledTimes(2));
    expect(setPublicado).toHaveBeenCalledWith('g1', true);
    expect(setPublicado).toHaveBeenCalledWith('g2', true);
  });

  it('cancelar la confirmación del lote no publica nada', async () => {
    getGastos.mockResolvedValue({
      data: [gasto({ id: 'g1', publicado: false }),
        gasto({ id: 'g2', concepto: 'Otro', publicado: false })],
      error: null,
    });
    render(<GastosAdmin />);
    await screen.findByText('Compra de pelotas');
    fireEvent.click(screen.getByRole('button', { name: /Publicar los 2 sin publicar/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^Cancelar$/i }));
    expect(setPublicado).not.toHaveBeenCalled();
  });

  it('un error de carga se muestra como mensaje, no como objeto', async () => {
    getGastos.mockResolvedValue({ data: [], error: new Error('RLS lo rechazo') });
    render(<GastosAdmin />);
    expect(await screen.findByText(/RLS lo rechazo/)).toBeInTheDocument();
  });
});
