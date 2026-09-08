// src/components/Layout/Header.test.jsx
//
// Lo que fija este archivo es la navegación pública, y en particular dos cosas
// que se rompieron el 2026-09-06 al sumar el grupo «Transparencia»:
//
//  1. **«Transparencia» tiene que llevar a la rendición de cuentas**, no a la
//     documentación institucional. Apuntaba a los papeles, así que lo único que
//     muestra plata entrando y saliendo no estaba en el menú principal: se
//     llegaba desde el pie o desde «Colaborá» (ROADMAP §14).
//  2. **Cada grupo abre SOLO su submenú.** El desktop elegía el estado con
//     `item.key === "nosotros" ? openNos : openColab`, que funciona con
//     exactamente dos grupos y con el tercero hace que dos compartan el mismo
//     estado: abrir uno abría el otro. Es invisible para el build y para el
//     lint, y en una captura estática ni se nota.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isAdmin: false, logout: vi.fn() }),
}));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const Header = (await import('@/components/Layout/Header')).default;

const montar = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );

/** El enlace del menú de escritorio con ese nombre exacto. */
const enlace = (nombre) =>
  screen.getAllByRole('link', { name: new RegExp(`^${nombre}`, 'i') })[0];

describe('Header — la navegación pública', () => {
  it('🔒 «Transparencia» lleva a la rendición de cuentas', () => {
    montar();
    expect(enlace('Transparencia')).toHaveAttribute('href', '/rendicion');
  });

  it('🔒 abrir un grupo NO abre los otros', () => {
    montar();

    // Con el submenú cerrado, su contenido no está en el árbol.
    expect(screen.queryByRole('link', { name: /Documentación oficial/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Partners/i })).toBeNull();

    fireEvent.mouseEnter(enlace('Transparencia').parentElement);

    // El suyo se abre...
    expect(screen.getByRole('link', { name: /Documentación oficial/i }))
      .toHaveAttribute('href', '/legal-documents');
    // ...y los de los otros grupos siguen cerrados. Este es el control que el
    // ternario de dos ramas no pasaba.
    expect(screen.queryByRole('link', { name: /^Partners/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Beneficios/i })).toBeNull();
  });

  it('los grupos que ya existían siguen abriendo el suyo', () => {
    montar();
    fireEvent.mouseEnter(enlace('Nosotros').parentElement);
    expect(screen.getByRole('link', { name: /^Partners/i })).toHaveAttribute('href', '/partners');
    expect(screen.queryByRole('link', { name: /Documentación oficial/i })).toBeNull();
  });

  it('la rendición y los documentos son las dos mitades del mismo grupo', () => {
    montar();
    fireEvent.mouseEnter(enlace('Transparencia').parentElement);
    const grupo = enlace('Transparencia').closest('div');
    expect(within(grupo).getByRole('link', { name: /Documentación oficial/i })).toBeInTheDocument();
  });
});
