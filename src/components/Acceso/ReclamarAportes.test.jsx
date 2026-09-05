// Lo que estos tests fijan es una sola regla, y es de seguridad (ROADMAP §10.18):
// **vincular algo tiene que ser un acto explícito de la persona.**
//
// El email de una donación anónima lo escribió quien pagó, en el checkout de
// MercadoPago, sin que nadie lo verificara. Si este componente reclamara solo
// al montarse, alcanzaría con escribir el mail de otro para transferirle un
// aporte. Por eso el test más importante de acá no es que el botón funcione,
// sino que **no pase nada hasta que alguien lo apriete**.
//
// ⚠️ La segunda regla, que llegó con §10.1.c: **una huella no es un aporte.**
// Una preinscripción vinculada reconoce a una persona y NO le da acceso a
// beneficios. El texto de la pantalla no puede prometer meses cuando no los
// hay, y hay un test que lo fija — es el tipo de promesa que después nadie
// puede cumplir.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const toast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  toast,
  useToast: () => ({ toast }),
}));

vi.mock('@/api/accesoApi', () => ({
  getMiAcceso: vi.fn(),
  getMiAntiguedad: vi.fn(),
  getDonacionesReclamables: vi.fn(),
  reclamarDonaciones: vi.fn(),
  getHuellasReclamables: vi.fn(),
  reclamarHuellas: vi.fn(),
}));

vi.mock('@/api/miembroApi', () => ({
  getMiMembresia: vi.fn(),
  getReglasMembresia: vi.fn(),
  getPadron: vi.fn(),
  getCategoriasMiembro: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const { getDonacionesReclamables, getHuellasReclamables, reclamarHuellas } =
  await import('@/api/accesoApi');
const ReclamarAportes = (await import('@/components/Acceso/ReclamarAportes')).default;

const render = (ui) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const USER = 'aaaaaaaa-0000-0000-0000-000000000001';

const donacion = (extra = {}) => ({
  donation_id: '11111111-0000-0000-0000-000000000001',
  fecha: '2026-01-14T03:03:01Z',
  monto: 5000,
  meses_estimados: 1,
  ...extra,
});

const huella = (extra = {}) => ({
  tabla: 'education_preinscriptions',
  etiqueta: 'Preinscripción a Educación',
  cantidad: 1,
  desde: '2026-02-13',
  hasta: '2026-02-13',
  ...extra,
});

describe('ReclamarAportes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHuellasReclamables.mockResolvedValue({ data: [], error: null });
    reclamarHuellas.mockResolvedValue({
      data: [{ tabla: 'donations', etiqueta: 'Donación', vinculadas: 1, meses_nuevos: 1, vence_el: '2026-09-30' }],
      error: null,
    });
  });

  it('no renderiza nada cuando no hay nada que reclamar (el caso de casi todos)', async () => {
    getDonacionesReclamables.mockResolvedValue({ data: [], error: null });

    const { container } = render(<ReclamarAportes userId={USER} />);

    await waitFor(() => expect(getDonacionesReclamables).toHaveBeenCalled());
    await waitFor(() => expect(getHuellasReclamables).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('no consulta nada sin sesión: las funciones solo tienen permiso para authenticated', () => {
    getDonacionesReclamables.mockResolvedValue({ data: [], error: null });

    const { container } = render(<ReclamarAportes userId={undefined} />);

    expect(getDonacionesReclamables).not.toHaveBeenCalled();
    expect(getHuellasReclamables).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('🔒 NO reclama solo al montarse: hace falta apretar el botón', async () => {
    getDonacionesReclamables.mockResolvedValue({ data: [donacion()], error: null });

    render(<ReclamarAportes userId={USER} />);

    await screen.findByText(/Encontramos algo hecho con tu email/i);
    // El punto entero del diseño: ofrecer no es otorgar.
    expect(reclamarHuellas).not.toHaveBeenCalled();
  });

  it('muestra el monto y los meses, y vincula al apretar', async () => {
    getDonacionesReclamables.mockResolvedValue({ data: [donacion()], error: null });

    render(<ReclamarAportes userId={USER} />);

    await screen.findByText(/Encontramos algo hecho con tu email/i);
    expect(screen.getByText(/1 mes de acceso/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Es mío, vincularlo/i }));

    await waitFor(() => expect(reclamarHuellas).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/quedó vinculado/i) })
      )
    );
  });

  it('cuenta juntos aportes y huellas, y pluraliza sobre el total', async () => {
    getDonacionesReclamables.mockResolvedValue({ data: [donacion()], error: null });
    getHuellasReclamables.mockResolvedValue({ data: [huella({ cantidad: 2 })], error: null });

    render(<ReclamarAportes userId={USER} />);

    // 1 aporte + 2 preinscripciones = 3
    await screen.findByText(/Encontramos 3 cosas hechas con tu email/i);
    expect(screen.getByText(/Preinscripción a Educación/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Son míos, vincularlos/i })).toBeInTheDocument();
  });

  it('🔒 con SOLO huellas no promete acceso: dice que sirve para reconocerte', async () => {
    // El caso real de 152 de las 156 personas que dejaron su email en Educación:
    // no donaron nunca. Prometerles "sumás meses de acceso" sería mentir.
    getDonacionesReclamables.mockResolvedValue({ data: [], error: null });
    getHuellasReclamables.mockResolvedValue({ data: [huella()], error: null });

    render(<ReclamarAportes userId={USER} />);

    await screen.findByText(/Encontramos algo hecho con tu email/i);
    expect(screen.getByText(/sirve para que te reconozcamos/i)).toBeInTheDocument();
    expect(screen.queryByText(/de acceso/i)).not.toBeInTheDocument();
  });

  it('al vincular solo huellas, el aviso NO habla de meses de acceso', async () => {
    getDonacionesReclamables.mockResolvedValue({ data: [], error: null });
    getHuellasReclamables.mockResolvedValue({ data: [huella()], error: null });
    reclamarHuellas.mockResolvedValue({
      data: [
        {
          tabla: 'education_preinscriptions',
          etiqueta: 'Preinscripción a Educación',
          vinculadas: 1,
          meses_nuevos: 0,
          vence_el: null,
        },
      ],
      error: null,
    });

    render(<ReclamarAportes userId={USER} />);
    await screen.findByText(/Encontramos algo hecho con tu email/i);
    fireEvent.click(screen.getByRole('button', { name: /Es mío/i }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringMatching(/asociadas a tu cuenta/i),
        })
      )
    );
    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringMatching(/de acceso/i) })
    );
  });

  it('pluraliza con más de un aporte y suma los montos', async () => {
    getDonacionesReclamables.mockResolvedValue({
      data: [
        donacion(),
        donacion({ donation_id: '22222222-0000-0000-0000-000000000002', monto: 7500, meses_estimados: 1 }),
      ],
      error: null,
    });

    render(<ReclamarAportes userId={USER} />);

    await screen.findByText(/Encontramos 2 cosas hechas con tu email/i);
    expect(screen.getByText(/\$12\.500/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Son míos, vincularlos/i })).toBeInTheDocument();
  });

  it('vinculadas: 0 avisa sin alarmar — es lo que devuelve un segundo clic', async () => {
    getDonacionesReclamables.mockResolvedValue({ data: [donacion()], error: null });
    reclamarHuellas.mockResolvedValue({ data: [], error: null });

    render(<ReclamarAportes userId={USER} />);
    await screen.findByText(/Encontramos algo hecho con tu email/i);
    fireEvent.click(screen.getByRole('button', { name: /Es mío/i }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/No quedaba nada por vincular/i) })
      )
    );
    // Un "ya estaba" no es un error: no debe salir en rojo.
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('un fallo de la base se muestra como error y no como éxito', async () => {
    getDonacionesReclamables.mockResolvedValue({ data: [donacion()], error: null });
    reclamarHuellas.mockResolvedValue({
      data: null,
      error: new Error('Falta verificar el email de la cuenta antes de reclamar.'),
    });

    render(<ReclamarAportes userId={USER} />);
    await screen.findByText(/Encontramos algo hecho con tu email/i);
    fireEvent.click(screen.getByRole('button', { name: /Es mío/i }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: expect.stringMatching(/verificar el email/i),
        })
      )
    );
  });
});
