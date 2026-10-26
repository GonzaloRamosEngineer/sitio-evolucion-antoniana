// src/components/WhatsAppCTA.jsx
// Banda de contacto por WhatsApp para el final de las páginas donde la gente
// suele tener dudas. El mensaje precargado depende de la página (`mensaje` es
// una clave de entidad.contacto.whatsappMensajes) y el bot de la entidad lo
// responde a cualquier hora; el horario de la atención humana sale de la config.
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Eyebrow } from '@/components/ui/eyebrow';
import { entidad, whatsappUrlPara } from '@/config/entidad';

const WhatsAppCTA = ({
  mensaje,
  titulo = '¿Preferís consultarlo por WhatsApp?',
  className = '',
}) => (
  <aside
    aria-label="Consultar por WhatsApp"
    className={`border border-brand-dark/10 bg-white rounded-sm p-6 sm:p-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between ${className}`}
  >
    <div className="max-w-xl">
      <Eyebrow>WhatsApp</Eyebrow>
      <h2 className="mt-3 font-poppins text-xl font-semibold text-brand-dark">{titulo}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Elegí tu consulta en el menú y te respondemos al momento. Si necesitás hablar con una
        persona, el equipo atiende {entidad.contacto.horarioAtencion.toLowerCase()}.
      </p>
    </div>
    <a
      href={whatsappUrlPara(mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 py-2.5 text-sm font-bold text-[#0b3d1f] shadow-sm transition-colors hover:bg-[#1fb458] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark focus-visible:ring-offset-2"
    >
      <MessageCircle aria-hidden="true" className="h-5 w-5" />
      Escribinos por WhatsApp
    </a>
  </aside>
);

export default WhatsAppCTA;
