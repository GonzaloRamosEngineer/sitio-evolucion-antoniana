// El 2026-09-09 el dueño del proyecto quedó encerrado en esta pantalla desde un
// iPhone: el modal ocupa el alto entero, la X de shadcn hereda el foreground
// oscuro y este modal la pinta sobre un header `bg-brand-dark` — navy sobre
// navy. El control existía y respondía al toque; simplemente no se veía.
//
// LO QUE FIJA: que SIEMPRE haya una salida visible. No prueba el color (eso es
// CSS y se miró en el navegador), prueba que los controles de salida existan y
// sean alcanzables por su nombre accesible, que es lo que un test puede sostener.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/api/userApi', () => ({ updateUserProfile: vi.fn() }));
// El recortador abre la cámara y toca Storage; acá estorba.
vi.mock('./AvatarUpload', () => ({ default: () => <div>AvatarUpload</div> }));
const toast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }));

const EditProfileModal = (await import('./EditProfileModal')).default;

const USUARIO = { id: 'u-1', name: 'Gonzalo Ramos', email: 'socio@test.com', dni: '36934775' };
const abrir = () => {
  render(<EditProfileModal user={USUARIO} onUpdateSuccess={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /Editar Perfil/i }));
};

beforeEach(() => { toast.mockReset(); });

describe('EditProfileModal', () => {
  it('🔒 abierto ofrece DOS salidas: la X y un «Cerrar» con la palabra escrita', () => {
    abrir();
    // La X de shadcn, que se llama «Close» por su `sr-only`.
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    // Y la salida del pie, que es la que se encuentra en un celular: el modal
    // ocupa la pantalla y el pie es lo último que se lee.
    expect(screen.getByRole('button', { name: /^Cerrar$/i })).toBeInTheDocument();
  });

  it('«Cerrar» cierra de verdad el diálogo', () => {
    abrir();
    expect(screen.getByText(/Configuración de Perfil/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Cerrar$/i }));
    expect(screen.queryByText(/Configuración de Perfil/i)).toBeNull();
  });

  it('los campos arrancan bloqueados hasta «Habilitar Edición»', () => {
    // De esto depende que «Cerrar» sea seguro: no hay nada sin guardar que
    // perder, porque nada se puede tocar todavía.
    abrir();
    expect(screen.getByDisplayValue('Gonzalo Ramos')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Habilitar Edición/i }));
    expect(screen.getByDisplayValue('Gonzalo Ramos')).toBeEnabled();
  });

  it('en modo edición la X sigue estando (Cancelar solo sale del modo)', () => {
    // «Cancelar» vuelve a los campos bloqueados, NO cierra el modal. Si la X
    // no estuviera, en mobile no habría salida durante la edición.
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Habilitar Edición/i }));
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.getByRole('button', { name: /^Cerrar$/i })).toBeInTheDocument();
  });
});
