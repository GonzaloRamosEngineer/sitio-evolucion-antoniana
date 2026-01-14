// src/components/Layout/ScrollToTop.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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

    // Un delay minúsculo para que React complete el renderizado del DOM
    const id = setTimeout(scrollNow, 10);
    return () => clearTimeout(id);
  }, [pathname, search, hash, behavior]);

  return null;
}