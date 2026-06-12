import React from 'react';

// Estado vacío consistente: icono + mensaje + acción opcional.
const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    {Icon && (
      <div className="p-4 rounded-2xl bg-brand-sand text-gray-300 mb-4">
        <Icon className="w-8 h-8" />
      </div>
    )}
    <p className="font-semibold text-brand-dark">{title}</p>
    {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
