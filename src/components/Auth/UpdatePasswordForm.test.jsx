import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const updatePassword = vi.fn();
const getSession = vi.fn();
let onAuthStateChange;

globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ updatePassword, loading: false }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange: (callback) => {
        onAuthStateChange = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));

const UpdatePasswordForm = (await import('./UpdatePasswordForm')).default;

const mount = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <UpdatePasswordForm />
  </MemoryRouter>,
);

describe('UpdatePasswordForm', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: { session: null } });
    updatePassword.mockReset();
  });

  it('acepta el enlace PKCE actual de Supabase para poder elegir una contraseña', async () => {
    mount('/actualizar-clave?code=codigo-de-recuperacion');

    expect(await screen.findByRole('heading', { name: /Ingresá tu nueva contraseña/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Actualizar Contraseña/i })).toBeEnabled();
  });

  it('también habilita el formulario cuando Supabase confirma la recuperación', async () => {
    mount('/actualizar-clave');
    await act(async () => {
      onAuthStateChange('PASSWORD_RECOVERY', { user: { id: 'persona-1' } });
    });

    expect(await screen.findByRole('heading', { name: /Ingresá tu nueva contraseña/i })).toBeInTheDocument();
  });
});
