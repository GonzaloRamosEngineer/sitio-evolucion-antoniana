// Test de humo del honeypot anti-spam (Sesión C, ítem 2.8).
// Garantiza que el campo trampa se renderiza oculto pero presente en el DOM,
// con el name="website" que las Edge Functions/inserts esperan, y que propaga
// onChange. Si esto se rompe, el filtro anti-bot deja de funcionar en silencio.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Honeypot } from '@/components/Forms/Honeypot';

describe('Honeypot', () => {
  it('renderiza el input trampa con name="website"', () => {
    render(<Honeypot value="" onChange={() => {}} />);
    const input = screen.getByLabelText('No completar este campo');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('name', 'website');
    expect(input).toHaveAttribute('tabindex', '-1');
  });

  it('propaga onChange al escribir', () => {
    const onChange = vi.fn();
    render(<Honeypot value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('No completar este campo'), {
      target: { value: 'soy-un-bot' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
