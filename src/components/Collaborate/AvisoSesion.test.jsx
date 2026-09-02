// El aviso informa y ofrece; no bloquea (ROADMAP §10.18).
//
// Pedir cuenta antes de donar era el camino 3 de §10.17 y sigue siendo el peor
// para una fundación que necesita que donar sea fácil. Estas pruebas fijan que
// este componente no se convierta en eso: no tiene ningún control que impida
// aportar, y el email es opcional de verdad.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

import AvisoSesion from '@/components/Collaborate/AvisoSesion';

const enRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const props = (extra = {}) => ({
  user: null,
  email: '',
  onEmailChange: vi.fn(),
  ...extra,
});

describe('AvisoSesion — sin sesión', () => {
  it('explica para qué sirve iniciar sesión y ofrece las dos puertas', () => {
    enRouter(<AvisoSesion {...props()} />);

    expect(screen.getByText(/Iniciá sesión antes de aportar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Crear una cuenta/i })).toBeInTheDocument();
  });

  it('el link apunta a /login', () => {
    enRouter(<AvisoSesion {...props()} />);
    // El <Link> envuelve al botón; se busca el ancla más cercana.
    const enlace = screen.getByRole('button', { name: /Iniciar sesión/i }).closest('a');
    expect(enlace).toHaveAttribute('href', '/login');
  });

  it('🔑 y lleva el `state.from` que hace volver a /collaborate', () => {
    // Esta prueba existe porque la de arriba NO alcanza: el `state` no aparece
    // en el href, así que un link sin él pasaría igual. Y sin `state.from`,
    // LoginPage manda al panel que corresponda al rol — la persona inicia
    // sesión y pierde el aporte que iba a hacer, que es justo lo que este
    // componente vino a evitar.
    const MostrarState = () => {
      const location = useLocation();
      return <pre data-testid="state">{JSON.stringify(location.state)}</pre>;
    };

    render(
      <MemoryRouter initialEntries={['/collaborate']}>
        <Routes>
          <Route path="/collaborate" element={<AvisoSesion {...props()} />} />
          <Route path="/login" element={<MostrarState />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    expect(JSON.parse(screen.getByTestId('state').textContent)).toEqual({
      from: { pathname: '/collaborate' },
    });
  });

  it('ofrece el email como opcional, con el porqué', () => {
    enRouter(<AvisoSesion {...props()} />);

    expect(screen.getByLabelText(/Dejanos tu email/i)).toBeInTheDocument();
    expect(screen.getByText(/Es opcional/i)).toBeInTheDocument();
  });

  it('avisa si el email está mal escrito, pero NO impide nada', () => {
    enRouter(<AvisoSesion {...props({ email: 'no-es-email' })} />);

    expect(screen.getByText(/no parece un email/i)).toBeInTheDocument();
    // Lo que importa: el aviso no deshabilita nada ni pretende frenar el aporte.
    expect(screen.getByLabelText(/Dejanos tu email/i)).not.toBeDisabled();
    expect(screen.queryAllByRole('button').every((b) => !b.disabled)).toBe(true);
  });

  it('no molesta con el error mientras el campo está vacío', () => {
    enRouter(<AvisoSesion {...props({ email: '' })} />);
    expect(screen.queryByText(/no parece un email/i)).not.toBeInTheDocument();
  });

  it('un email válido no muestra ningún error', () => {
    enRouter(<AvisoSesion {...props({ email: 'maria@gmail.com' })} />);
    expect(screen.queryByText(/no parece un email/i)).not.toBeInTheDocument();
  });

  it('propaga lo que se escribe', () => {
    const onEmailChange = vi.fn();
    enRouter(<AvisoSesion {...props({ onEmailChange })} />);

    fireEvent.change(screen.getByLabelText(/Dejanos tu email/i), {
      target: { value: 'nuevo@mail.com' },
    });
    expect(onEmailChange).toHaveBeenCalledWith('nuevo@mail.com');
  });
});

describe('AvisoSesion — con sesión', () => {
  const user = { id: 'u1', name: 'María Gómez', email: 'maria@gmail.com' };

  it('confirma a nombre de quién va, sin volver a explicar nada', () => {
    enRouter(<AvisoSesion {...props({ user })} />);

    expect(screen.getByText(/María Gómez/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tu carnet/i })).toBeInTheDocument();
    // Ya hizo lo correcto: no se le repite la explicación ni se le pide el mail.
    expect(screen.queryByText(/Iniciá sesión antes de aportar/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Dejanos tu email/i)).not.toBeInTheDocument();
  });

  it('cae al email si la cuenta no tiene nombre', () => {
    enRouter(<AvisoSesion {...props({ user: { id: 'u1', email: 'sinnombre@mail.com' } })} />);
    expect(screen.getByText(/sinnombre@mail.com/)).toBeInTheDocument();
  });
});

describe('AvisoSesion — con sesión, pagar con otro email (§10.24)', () => {
  /*
    POR QUÉ ESTA OPCIÓN EXISTE, porque sin el contexto parece una perilla de
    más: el email de la sesión del dueño del proyecto está registrado en
    MercadoPago URUGUAY, y una cuenta de otro país no puede pagarle a un
    cobrador argentino. MercadoPago devolvía `guest_site_mismatch` y —con el
    email de la sesión fijo— el ÚNICO email posible era el que no funcionaba.
    No había salida dentro del sitio.
  */
  const conSesion = (extra = {}) => props({ user: { email: 'socia@test.com' }, ...extra });

  it('por defecto NO muestra el campo: es una salida, no un paso', () => {
    enRouter(<AvisoSesion {...conSesion()} />);
    expect(screen.queryByLabelText(/Email para el pago/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pagar con otro email/i })).toBeInTheDocument();
  });

  it('al abrirla aparece el campo, con el email de la sesión como referencia', () => {
    enRouter(<AvisoSesion {...conSesion()} />);
    fireEvent.click(screen.getByRole('button', { name: /Pagar con otro email/i }));

    const campo = screen.getByLabelText(/Email para el pago/i);
    expect(campo).toBeInTheDocument();
    expect(campo).toHaveAttribute('placeholder', 'socia@test.com');
  });

  it('aclara que el aporte igual queda a nombre de la persona', () => {
    // Es la duda obvia al ver el campo, y la respuesta es verificable: la
    // atribución viaja en `external_reference`, no en `payer_email`.
    enRouter(<AvisoSesion {...conSesion()} />);
    fireEvent.click(screen.getByRole('button', { name: /Pagar con otro email/i }));
    expect(screen.getByText(/aporte igual queda a tu nombre/i)).toBeInTheDocument();
  });

  it('si ya hay un email escrito, el campo aparece abierto', () => {
    // Si no, el valor viajaría al checkout sin que se vea de dónde salió.
    enRouter(<AvisoSesion {...conSesion({ email: 'otro@mail.com' })} />);
    expect(screen.getByLabelText(/Email para el pago/i)).toHaveValue('otro@mail.com');
  });

  it('avisa si está mal escrito, y dice qué se va a usar en su lugar', () => {
    enRouter(<AvisoSesion {...conSesion({ email: 'no-es-email' })} />);
    expect(screen.getByText(/no parece un email/i)).toBeInTheDocument();
    expect(screen.getByText(/se usa socia@test.com/i)).toBeInTheDocument();
  });

  it('sigue confirmando a nombre de quién va el aporte', () => {
    // Lo que ya funcionaba no se perdió al agregar la opción.
    enRouter(<AvisoSesion {...conSesion()} />);
    expect(screen.getByText(/Vas a aportar como/i)).toBeInTheDocument();
  });
});
