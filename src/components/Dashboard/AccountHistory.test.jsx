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
  it('ofrece reintentar una consulta fallida sin simular un historial vacío', () => {
    const retry = vi.fn();
    render(<AccountHistory donations={[]} memberships={[]} error onRetry={retry} />);
    expect(screen.queryByText(/Todavía no tenés/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Volver a intentar/ }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
