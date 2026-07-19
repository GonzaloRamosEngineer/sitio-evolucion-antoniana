// Test de humo del Eyebrow: etiqueta editorial del lenguaje visual de la Home.
// Verifica que renderiza el texto y aplica el color de marca según `light`.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Eyebrow } from '@/components/ui/eyebrow';

describe('Eyebrow', () => {
  it('renderiza su contenido', () => {
    render(<Eyebrow>Quiénes somos</Eyebrow>);
    expect(screen.getByText('Quiénes somos')).toBeInTheDocument();
  });

  it('usa el color dorado en variante light', () => {
    render(<Eyebrow light>Sobre fondo oscuro</Eyebrow>);
    expect(screen.getByText('Sobre fondo oscuro')).toHaveClass('text-brand-gold');
  });
});
