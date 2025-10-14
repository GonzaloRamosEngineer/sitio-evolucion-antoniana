// src/components/Layout/ScrollToTop.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resetea el scroll al top en cada cambio de ruta.
 * Si hay hash (#ancla), intenta scrollear a ese elemento.
 */
export default function ScrollToTop({ behavior = 'smooth' }) {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const scrollNow = () => {
      if (hash) {
        const target = document.querySelector(hash);
        if (target) {
          target.scrollIntoView({ behavior, block: 'start' });
          return;
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior });
    };

    // pequeño delay para asegurar que el DOM ya montó
    const id = setTimeout(scrollNow, 0);
    return () => clearTimeout(id);
  }, [pathname, search, hash, behavior]);

  return null;
}
