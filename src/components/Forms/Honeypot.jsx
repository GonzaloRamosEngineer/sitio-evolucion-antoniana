// src/components/Forms/Honeypot.jsx
// Campo trampa anti-bots para formularios públicos (anónimos, sin captcha).
// Invisible para personas (fuera de pantalla, sin tab, sin autofill); los bots
// que completan todos los inputs lo llenan. Si llega con valor, el submit se
// descarta simulando éxito para no delatar el filtro.
import React from 'react';

const Honeypot = ({ value, onChange }) => (
  <div
    aria-hidden="true"
    className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
  >
    <label htmlFor="hp-website">No completar este campo</label>
    <input
      id="hp-website"
      name="website"
      type="text"
      tabIndex={-1}
      autoComplete="off"
      value={value}
      onChange={onChange}
    />
  </div>
);

export { Honeypot };
