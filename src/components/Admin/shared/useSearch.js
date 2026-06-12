import { useMemo, useState } from 'react';

// Búsqueda en memoria sobre una lista, por múltiples campos (soporta "a.b" anidado).
export function useSearch(items, keys) {
  const [query, setQuery] = useState('');
  const keysSignature = keys.join('|');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const parts = keysSignature.split('|');
    return items.filter((item) =>
      parts.some((key) => {
        const value = key.split('.').reduce((obj, part) => obj?.[part], item);
        return value != null && String(value).toLowerCase().includes(q);
      })
    );
  }, [items, keysSignature, query]);

  return { query, setQuery, filtered };
}

export default useSearch;
