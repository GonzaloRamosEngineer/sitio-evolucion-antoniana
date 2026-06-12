import React from 'react';

// Skeleton de carga para listas/tablas del panel (reemplaza los spinners centrados).
const ListSkeleton = ({ rows = 5 }) => (
  <div className="space-y-3" role="status" aria-label="Cargando...">
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
      <div className="h-10 w-full md:w-96 bg-gray-100 rounded-xl animate-pulse" />
    </div>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-100 rounded animate-pulse w-1/3" />
            <div className="h-3 bg-gray-50 rounded animate-pulse w-1/2" />
          </div>
          <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse hidden sm:block" />
        </div>
      ))}
    </div>
  </div>
);

export default ListSkeleton;
