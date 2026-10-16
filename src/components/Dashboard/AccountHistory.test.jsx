import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AccountHistory from './AccountHistory';

describe('Historial del panel', () => {
  it('distingue una suscripción activa de un pago acreditado', () => {
    render(<AccountHistory donations={[{ id: '1', amount: 5000, status: 'approved' }]} memberships={[{ id: '1', amount: 7500, status: 'active' }]} />);
    expect(screen.getByText('Validado')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
  it('permite consultar y volver a plegar los movimientos anteriores', () => {
    render(<AccountHistory donations={Array.from({ length: 7 }, (_, id) => ({ id, amount: 5000, status: 'pending', created_at: `2026-09-0${id + 1}` }))} memberships={[]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: /Ver todos/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menos' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
  it('una cuenta que SOLO donó ve su historial aunque no tenga ninguna membresía', () => {
    render(<AccountHistory donations={[{ id: 'd1', amount: 20000, status: 'approved', donation_type: 'única', payment_id: '181921612108', created_at: '2026-10-02' }]} memberships={[]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Donación extraordinaria')).toBeInTheDocument();
    expect(screen.getByText('Validado')).toBeInTheDocument();
    expect(screen.queryByText(/Todavía no tenés movimientos/)).not.toBeInTheDocument();
  });
  it('el cobro de una cuota que aterrizó en donations se llama cuota, no donación', () => {
    render(<AccountHistory donations={[{ id: 'd2', amount: 5000, status: 'approved', donation_type: 'suscripción' }]} memberships={[]} />);
    expect(screen.getByText('Cuota mensual')).toBeInTheDocument();
    expect(screen.queryByText(/Donación/)).not.toBeInTheDocument();
  });
  it('muestra reintegros y contracargos sin esconderlos', () => {
    render(<AccountHistory donations={[
      { id: 'a', amount: 5000, status: 'approved', monto_reintegrado: 2000, created_at: '2026-10-03' },
      { id: 'b', amount: 8000, status: 'charged_back', created_at: '2026-10-02' },
      { id: 'c', amount: 9000, status: 'refunded', created_at: '2026-10-01' },
    ]} memberships={[]} />);
    expect(screen.getByText('Reintegro parcial: $2.000')).toBeInTheDocument();
    expect(screen.getByText('Contracargo')).toBeInTheDocument();
    expect(screen.getByText('Reintegrado')).toBeInTheDocument();
  });
  it('ofrece reintentar una consulta fallida sin simular un historial vacío', () => {
    const retry = vi.fn();
    render(<AccountHistory donations={[]} memberships={[]} error onRetry={retry} />);
    expect(screen.queryByText(/Todavía no tenés/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Volver a intentar/ }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
