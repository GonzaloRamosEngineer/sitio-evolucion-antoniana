// Tests del selector de destino (ROADMAP §10.7).
//
// Se concentran en las tres reglas que tienen consecuencias reales, no en el
// markup: que sin destinos no bloquee el aporte, que con uno solo no muestre un
// desplegable inútil, y que el progreso salga de los contadores del destino.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SelectorDestino from './SelectorDestino';

const destino = (extra = {}) => ({
  id: 'd1',
  nombre: 'Sostenimiento institucional',
  descripcion: null,
  meta_monto: null,
  monto_recaudado: 0,
  ...extra,
});

describe('SelectorDestino', () => {
  // La regla que protege el cobro: si la consulta de destinos falla o todavía
  // no hay ninguno, este componente desaparece y se dona como antes.
  it('sin destinos no renderiza nada', () => {
    const { container } = render(
      <SelectorDestino id="x" destinos={[]} value={null} onChange={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  // Es el estado en el que arranca toda entidad nueva: solo el institucional.
  // Un select de una sola opción no es una elección.
  it('con UN destino muestra la frase, no un desplegable', () => {
    render(
      <SelectorDestino id="x" destinos={[destino()]} value="d1" onChange={vi.fn()} />
    );

    expect(screen.getByText('Sostenimiento institucional')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('con VARIOS destinos ofrece elegir', () => {
    render(
      <SelectorDestino
        id="x"
        destinos={[destino(), destino({ id: 'd2', nombre: 'Pelotas y conos' })]}
        value="d1"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('muestra el avance cuando el destino tiene meta', () => {
    render(
      <SelectorDestino
        id="x"
        destinos={[destino({ meta_monto: 200000, monto_recaudado: 50000 })]}
        value="d1"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText(/\$50\.000 de \$200\.000/)).toBeInTheDocument();
  });

  // Un destino sin meta (típico de un padrinable) no tiene contra qué medirse:
  // una barra al 0% eterna comunicaría fracaso donde no lo hay.
  it('sin meta no muestra barra de progreso', () => {
    render(
      <SelectorDestino
        id="x"
        destinos={[destino({ monto_recaudado: 90000 })]}
        value="d1"
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  // Recaudar de más es una buena noticia, pero una barra al 140% se sale de la
  // caja y se ve como un bug.
  it('el avance se recorta en 100 aunque se haya superado la meta', () => {
    render(
      <SelectorDestino
        id="x"
        destinos={[destino({ meta_monto: 100000, monto_recaudado: 140000 })]}
        value="d1"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
