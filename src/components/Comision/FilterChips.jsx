import React from 'react';
import { cn } from '@/lib/utils';

// Fila de chips de filtro scrolleable (mobile-first). Cada opción: { value, label, count? }.
// Un solo valor activo a la vez.
const FilterChips = ({ options, value, onChange, className }) => (
  <div className={cn('flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1', className)}>
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
            active
              ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary/40 hover:text-brand-primary'
          )}
        >
          {opt.label}
          {typeof opt.count === 'number' && (
            <span className={cn('text-xs font-bold', active ? 'text-white/80' : 'text-gray-400')}>
              {opt.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default FilterChips;
