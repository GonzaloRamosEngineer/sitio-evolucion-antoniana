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
    expect(screen.getByText(concepto)).toBeVisible();
    expect(screen.getByText('Sin comprobante')).toBeVisible();
    expect(screen.getAllByText('$800,00')).toHaveLength(2);
  });
});

/*
  TRES ESTADOS DE RESPALDO, NO DOS.

  La página mostraba «Con comprobante / Sin comprobante» mirando sólo
  `tiene_comprobante`, que es una columna GENERADA: dice si hay archivo. Los 25
  gastos importados del fondo del convenio aparecían como si no tuvieran nada,
  cuando el sistema tenía guardado el id exacto de la operación bancaria desde
  el momento de importarlos. Era un hueco de presentación, no de documentación.

  Y la distinción importa en las dos direcciones: declarar «Extracto de cuenta
  N° 90165423466» es más creíble que no decir nada, y menos que tener la factura
  adjunta. Un binario no puede decir eso.
*/
describe('Rendición pública — cómo se muestra el respaldo', () => {
  const conGasto = (extra) => useGastos.mockReturnValue({
    data: [{ id: 'g1', destino_id: '1', concepto: 'Un gasto', monto: 200, fecha: '2026-09-08', ...extra }],
    isPending: false,
  });

  it('🔒 un comprobante DECLARADO no se muestra como «sin comprobante»', () => {
    conGasto({ tiene_comprobante: false, tipo_comprobante: 'extracto', comprobante_numero: '90165423466' });
    show();
    expect(screen.getByText(/Extracto de cuenta #90165423466/)).toBeVisible();
    expect(screen.queryByText('Sin comprobante')).not.toBeInTheDocument();
  });

  it('🔒 declara el LÍMITE de lo publicado, en vez de exagerar el respaldo', () => {
    // Los estados contables certificados llegan al ejercicio 2024 y esta página
    // muestra movimientos de 2026. Decir «todo está auditado» sería más lindo y
    // falso, y una rendición que exagera su respaldo pierde lo que vino a
    // construir. El aviso va en la página, no en una nota al pie.
    //
    // ⚠️ Este test ya falló una vez (2026-09-09) y NO por un bug: una pasada de
    // redacción comprimió los tres puntos a una línea cada uno y el límite se
    // fue con el recorte, dejando «Ejercicios certificados» sin fecha de corte.
    // Por eso el matcher es la AFIRMACIÓN («no están en un balance publicado»)
    // y no la frase entera: sobrevive a una reescritura de estilo y falla
    // cuando desaparece la declaración. Si vuelve a fallar, la pregunta no es
    // qué texto esperaba el test — es si la página todavía declara su límite.
    conGasto({ tiene_comprobante: false, tipo_comprobante: 'extracto', comprobante_numero: '1' });
    show();
    expect(screen.getByText(/no están en un balance publicado/i)).toBeVisible();
    expect(screen.getByText(/Mercado Libre Solidario/)).toBeVisible();
  });

  it('con archivo adjunto no arrastra la aclaración', () => {
    conGasto({ tiene_comprobante: true, tipo_comprobante: 'factura', comprobante_numero: 'A-0001' });
    show();
    expect(screen.getByText(/Factura #A-0001/)).toBeVisible();
  });

  it('sin nada declarado ni adjunto sigue diciendo que no hay respaldo', () => {
    conGasto({ tiene_comprobante: false });
    show();
    expect(screen.getByText('Sin comprobante')).toBeVisible();
  });
});
