// La cabecera del dashboard es la pantalla que le dice a una persona cómo está
// como socia, y hasta el 2026-09-02 se lo inventaba (§10.23). El test de
// `src/lib/fuente-unica-socio.test.js` impide que vuelva el patrón viejo leyendo
// el código; esto es lo otro que hacía falta: **montarla de verdad.**
//
// POR QUÉ HACÍA FALTA MONTARLA. Ningún test renderizaba este componente, y no se
// puede verificar en un navegador porque `/dashboard` está detrás de sesión: un
// Chrome headless cae en el login y la cabecera no se monta nunca. Así que un
// error de render acá —un hook sin provider, un icono que no existe— solo
// aparecería en producción, con el socio adentro.
//
// LO QUE FIJA: los cuatro estados del acceso, y sobre todo que el CTA no miente.
// El botón anterior era `!activeMembership && "ACTIVAR MEMBRESÍA"`, así que le
// pedía suscribirse a quien acababa de suscribirse.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// `useContentQueries` arrastra el cliente Supabase; no se usa porque los hooks
// de acceso están mockeados, pero tiene que existir para que el módulo importe.
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const useMiAcceso = vi.fn();
const useMiAntiguedad = vi.fn();
vi.mock('@/hooks/useContentQueries', () => ({
  useMiAcceso: (...a) => useMiAcceso(...a),
  useMiAntiguedad: (...a) => useMiAntiguedad(...a),
}));

// El modal de edición abre un diálogo con su propio estado; acá estorba.
vi.mock('@/components/Dashboard/EditProfileModal', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const DashboardHeader = (await import('@/components/Dashboard/DashboardHeader')).default;

const USUARIO = {
  id: 'u-1',
  name: 'Gonzalo Ramos',
  email: 'socio@test.com',
  dni: '12345678',
  // Presente A PROPÓSITO y con un año distinto al del primer aporte: si la
  // cabecera vuelve a leer de acá, el test de "Aportando desde" lo va a cantar.
  created_at: '2025-03-01T10:00:00Z',
};

const render = (props = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return rtlRender(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <DashboardHeader user={USUARIO} onUpdateSuccess={() => {}} {...props} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

const acceso = (over = {}) => ({
  data: { tiene_acceso: false, vence_el: null, origen: null, en_gracia: false, ...over },
});

beforeEach(() => {
  useMiAcceso.mockReset();
  useMiAntiguedad.mockReset();
  useMiAcceso.mockReturnValue(acceso());
  useMiAntiguedad.mockReturnValue({ data: null });
});

describe('DashboardHeader', () => {
  it('con aporte vigente muestra el estado, el origen y el camino al carnet', () => {
    useMiAcceso.mockReturnValue(acceso({ tiene_acceso: true, vence_el: '2026-10-02', origen: 'membresia' }));
    useMiAntiguedad.mockReturnValue({ data: { socio_desde: '2026-09-02', meses_aportados: 1 } });
    render();

    expect(screen.getByText(/Aporte vigente/i)).toBeTruthy();
    // El origen real, no un "rango" inventado.
    expect(screen.getByText('Cuota social')).toBeTruthy();
    // La fecha del PRIMER APORTE (2026), no la del alta de la cuenta (2025).
    expect(screen.getByText(/2 de septiembre de 2026/)).toBeTruthy();
    expect(screen.queryByText(/2025/)).toBeNull();
    expect(screen.getByText('1 mes')).toBeTruthy();

    // Con acceso, el CTA lleva a la credencial y NO ofrece suscribirse.
    const carnet = screen.getByRole('link', { name: /VER MI CARNET/i });
    expect(carnet.getAttribute('href')).toBe('/carnet');
    expect(screen.queryByText(/ACTIVAR MEMBRES/i)).toBeNull();
  });

  it('en período de gracia lo dice, y sigue tratándola como socia', () => {
    useMiAcceso.mockReturnValue(acceso({ tiene_acceso: true, vence_el: '2026-08-23', origen: 'membresia', en_gracia: true }));
    render();
    expect(screen.getByText(/En tolerancia/i)).toBeTruthy();
    // Tiene acceso: el camino al carnet sigue disponible.
    expect(screen.getByRole('link', { name: /VER MI CARNET/i })).toBeTruthy();
  });

  it('vencido lo distingue de "nunca aportó"', () => {
    useMiAcceso.mockReturnValue(acceso({ tiene_acceso: false, vence_el: '2026-07-01', origen: 'donacion' }));
    render();
    expect(screen.getByText(/Aporte vencido/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /ACTIVAR MEMBRES/i })).toBeTruthy();
  });

  it('sin aportes ofrece suscribirse y no muestra fechas inventadas', () => {
    render();
    expect(screen.getByText(/Sin aportes/i)).toBeTruthy();
    const cta = screen.getByRole('link', { name: /ACTIVAR MEMBRES/i });
    // ⚠️ `/collaborate`, en inglés. `/colaborar` NO existe y ya se pagó una vez
    // (§11.4 y `rutas-cta.test.js`).
    expect(cta.getAttribute('href')).toBe('/collaborate');
    // Sin antigüedad no se inventa un año: antes caía a un '2025' hardcodeado.
    expect(screen.queryByText(/2025/)).toBeNull();
  });

  it('con una suscripción pendiente NO le pide suscribirse otra vez', () => {
    // El caso real: entre que MercadoPago crea el preapproval y avisa del
    // primer cobro pasan minutos. Todavía no hay acceso, y ofrecerle "ACTIVAR
    // MEMBRESÍA" a quien acaba de pagar es el peor momento para mentirle.
    render({ memberships: [{ id: 'm-1', status: 'pending' }] });

    expect(screen.getByText(/Suscripción en curso/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /ACTIVAR MEMBRES/i })).toBeNull();
  });

  it('con VARIAS membresías no se rompe (el bug del maybeSingle)', () => {
    // La consulta vieja era `.eq('status','active').maybeSingle()`, que falla
    // con más de una fila — alcanzable desde que hay una membresía por destino.
    // El error se tragaba y la pantalla decía "SOCIO NIVEL BASE" a alguien con
    // dos suscripciones activas.
    useMiAcceso.mockReturnValue(acceso({ tiene_acceso: true, vence_el: '2026-10-02', origen: 'membresia' }));
    render({
      memberships: [
        { id: 'm-1', status: 'active' },
        { id: 'm-2', status: 'active' },
        { id: 'm-3', status: 'cancelled' },
      ],
    });
    expect(screen.getByText(/Aporte vigente/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /VER MI CARNET/i })).toBeTruthy();
  });

  it('no se cae si los hooks todavía no devolvieron nada', () => {
    // `useMiAcceso` queda en `isPending` mientras está deshabilitada (sin
    // userId), y su `data` es `undefined`: el default `SIN_ACCESO` es lo que
    // evita que el render explote.
    useMiAcceso.mockReturnValue({ data: undefined });
    useMiAntiguedad.mockReturnValue({ data: undefined });
    render();
    expect(screen.getByText(/Sin aportes/i)).toBeTruthy();
  });
});
