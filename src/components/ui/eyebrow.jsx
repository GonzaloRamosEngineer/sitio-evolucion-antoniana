// src/components/ui/eyebrow.jsx
// Etiqueta editorial: filete dorado + versalitas. Lenguaje visual de la Home;
// usarla en los heroes/secciones públicas para mantener un mismo tono.
import React from "react";

const Eyebrow = ({ children, light = false, className = "" }) => (
  <p
    className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] ${
      light ? "text-brand-gold" : "text-brand-action"
    } ${className}`}
  >
    <span aria-hidden="true" className="inline-block w-8 h-px bg-brand-gold" />
    {children}
  </p>
);

export { Eyebrow };
