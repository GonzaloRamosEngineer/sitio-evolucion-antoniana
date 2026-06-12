import React from 'react';

// Header liviano y consistente para cada sección del panel:
// icono + título + descripción a la izquierda, acciones (botones) a la derecha.
const SectionHeader = ({ icon: Icon, title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <div className="shrink-0 p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-xl font-poppins font-bold text-brand-dark leading-tight truncate">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export default SectionHeader;
