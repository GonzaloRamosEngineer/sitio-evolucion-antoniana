import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CarnetPage from './CarnetPage';
import { useMiAcceso, useMiAntiguedad, useMiMembresia } from '@/hooks/useContentQueries';
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Persona de prueba', dni: '12345678' } }) }));
vi.mock('@/hooks/useContentQueries', () => ({ useMiAcceso: vi.fn(), useMiAntiguedad: vi.fn(), useMiMembresia: vi.fn() }));
vi.mock('@/components/Acceso/ReclamarAportes', () => ({ default: () => null }));
const show = () => render(<HelmetProvider><MemoryRouter><CarnetPage /></MemoryRouter></HelmetProvider>);
beforeEach(() => {
  useMiAcceso.mockReturnValue({ data: { tiene_acceso: true, vence_el: '2026-10-02', en_gracia: false, origen: 'donacion' }, isPending: false });
  useMiAntiguedad.mockReturnValue({ data: { socio_desde: '2026-09-02', meses_aportados: 1 }, isPending: false });
  useMiMembresia.mockReturnValue({ data: { numero: 5, estado: 'activo', categoria: 'General' }, isPending: false });
});
afterEach(() => vi.useRealTimers());
describe('Carnet', () => {
  it('no presenta una credencial ni invita a pagar si no pudo verificar el acceso', () => {
    const refetch = vi.fn();
    const membershipRetry = vi.fn();
    useMiAcceso.mockReturnValue({ isError: true, refetch });
    useMiMembresia.mockReturnValue({ refetch: membershipRetry });
    show();
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos verificar tu carnet');
    expect(screen.queryByText('Sin acceso')).not.toBeInTheDocument();
    expect(screen.queryByText('Credencial digital')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a intentar' }));
    expect(refetch).toHaveBeenCalledOnce();
    expect(membershipRetry).toHaveBeenCalledOnce();
  });
  it('espera la condición institucional antes de presentar la credencial', () => {
    useMiMembresia.mockReturnValue({ isPending: true });
    show();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu carnet');
    expect(screen.queryByText('Credencial digital')).not.toBeInTheDocument();
  });
  it('distingue tolerancia de acceso vigente', () => {
    useMiAcceso.mockReturnValue({ data: { tiene_acceso: true, en_gracia: true, vence_el: '2026-08-30' } });
    show();
    expect(screen.getByText('En tolerancia')).toBeInTheDocument();
    expect(screen.queryByText('Acceso vigente')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Regularizar mi aporte' })).toHaveAttribute('href', '/collaborate');
  });
  it('mantiene separadas la suspensión institucional y la vigencia del aporte', () => {
    useMiMembresia.mockReturnValue({ data: { estado: 'suspendido', numero: 5 } });
    show();
    expect(screen.getByText('Acceso vigente')).toBeInTheDocument();
    expect(screen.getByText(/No es un tema de pagos/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Consultar mi condición' })).toHaveAttribute('href', '/contact');
  });
  it('mantiene el reloj en vivo sin anunciar cada segundo al lector de pantalla', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T12:00:00Z'));
    const { container } = show();
    const clock = container.querySelector('time');
    expect(clock).toHaveAttribute('datetime', '2026-09-08T12:00:00.000Z');
    act(() => vi.advanceTimersByTime(1000));
    expect(clock).toHaveAttribute('datetime', '2026-09-08T12:00:01.000Z');
    expect(clock).toHaveAttribute('aria-live', 'off');
  });
});
