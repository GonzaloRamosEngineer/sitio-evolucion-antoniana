// El botón abre WhatsApp con el mensaje de SU página, y el menú del bot tiene que
// poder entender ese mensaje: la palabra clave y la ausencia de dígitos se fijan acá.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WhatsAppCTA from '@/components/WhatsAppCTA';
import { entidad, whatsappUrl, whatsappUrlPara } from '@/config/entidad';

const textoDe = (url) => decodeURIComponent(new URL(url).searchParams.get('text'));

describe('WhatsAppCTA', () => {
  it('abre el chat del número de la entidad con el mensaje de la página', () => {
    render(<WhatsAppCTA mensaje="colaborar" />);
    const enlace = screen.getByRole('link', { name: /escribinos por whatsapp/i });
    const url = new URL(enlace.href);
    expect(url.host).toBe('wa.me');
    expect(url.pathname).toBe(`/${entidad.contacto.telefonoE164.replace(/\D/g, '')}`);
    expect(textoDe(enlace.href)).toBe(entidad.contacto.whatsappMensajes.colaborar);
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('muestra el horario de la atención humana desde la configuración', () => {
    render(<WhatsAppCTA mensaje="educacion" />);
    expect(screen.getByText(/el equipo atiende lunes a viernes, de 9 a 18/i)).toBeInTheDocument();
  });

  it('una clave desconocida cae al mensaje general y no a un chat vacío', () => {
    expect(whatsappUrlPara('no-existe')).toBe(whatsappUrl);
  });
});

describe('mensajes precargados por página', () => {
  const claves = Object.keys(entidad.contacto.whatsappMensajes);

  it('hay uno por cada página donde se muestra el botón', () => {
    expect(claves.sort()).toEqual(['actividades', 'beneficios', 'colaborar', 'educacion']);
  });

  it.each(claves)('%s no lleva dígitos (el bot compara por subcadena)', (clave) => {
    expect(entidad.contacto.whatsappMensajes[clave]).not.toMatch(/\d/);
  });
});
