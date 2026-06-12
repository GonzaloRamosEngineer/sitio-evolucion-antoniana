import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Barra de búsqueda + contador de resultados, estilo unificado para todas las listas.
const SearchBar = ({ value, onChange, placeholder = 'Buscar...', count, countLabel = 'resultados', children }) => (
  <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-6">
    <div className="relative w-full md:max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl h-10"
      />
    </div>
    <div className="flex items-center gap-3 shrink-0">
      {typeof count === 'number' && (
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
          <span className="text-brand-primary">{count}</span> {countLabel}
        </span>
      )}
      {children}
    </div>
  </div>
);

export default SearchBar;
