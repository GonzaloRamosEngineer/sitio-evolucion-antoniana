import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Rendicion from './Rendicion';
import { useDestinosActivos, useGastos } from '@/hooks/useContentQueries';
vi.mock('@/hooks/useContentQueries', () => ({ useDestinosActivos: vi.fn(), useGastos: vi.fn() }));
const show = () => render(<HelmetProvider><MemoryRouter><Rendicion /></MemoryRouter></HelmetProvider>);
beforeEach(() => {
  useDestinosActivos.mockReturnValue({ data: [{ id: '1', nombre: 'Educación', monto_recaudado: 1000, monto_rendido: 200 }], isPending: false });
  useGastos.mockReturnValue({ data: [], isPending: false });
});
describe('Rendición pública', () => {
  it('no muestra ceros ni un estado vacío mientras carga el resumen', () => {
    useDestinosActivos.mockReturnValue({ isPending: true });
    show();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando resumen');
    expect(screen.queryByText('$0,00')).not.toBeInTheDocument();
    expect(screen.queryByText('Todavía no hay destinos activos')).not.toBeInTheDocument();
  });
  it('permite reintentar el resumen si falla', () => {
    const refetch = vi.fn();
    useDestinosActivos.mockReturnValue({ isError: true, refetch });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a intentar' }));
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.queryByText('$0,00')).not.toBeInTheDocument();
  });
  it('distingue un error en gastos de un destino sin gastos', () => {
    const refetch = vi.fn();
    useGastos.mockReturnValue({ isError: true, refetch });
    show();
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar el detalle');
    expect(screen.queryByText('Todavía no se publicaron gastos de este destino.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar gastos' }));
    expect(refetch).toHaveBeenCalledOnce();
  });
  it('conserva el concepto completo y hace visible la ausencia de comprobante', () => {
    const concepto = 'Materiales educativos para el taller de acompañamiento deportivo';
    useGastos.mockReturnValue({ data: [{ id: 'g1', destino_id: '1', concepto, monto: 200, fecha: '2026-09-08', tiene_comprobante: false }], isPending: false });
    show();
    fireEvent.click(screen.getByText('Ver gastos publicados (1)'));
    expect(screen.getByText(concepto)).toBeVisible();
    expect(screen.getByText('Sin comprobante')).toBeVisible();
    expect(screen.getAllByText('$800,00')).toHaveLength(2);
  });
});
