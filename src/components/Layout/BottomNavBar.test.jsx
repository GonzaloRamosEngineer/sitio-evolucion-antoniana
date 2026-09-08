import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import BottomNavBar from './BottomNavBar';
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
describe('Navegación mobile', () => {
  it('lleva al formulario de aporte y conserva el estado de navegación', () => {
    render(<MemoryRouter initialEntries={['/collaborate']}><BottomNavBar /></MemoryRouter>);
    const donate = screen.getByRole('link', { name: 'Donar' });
    expect(donate).toHaveAttribute('href', '/collaborate');
    expect(donate).toHaveAttribute('aria-current', 'page');
    expect(donate).not.toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Mi Perfil' })).toHaveAttribute('href', '/dashboard');
  });
});
