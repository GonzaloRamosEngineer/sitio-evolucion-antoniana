// src/components/Layout/BackToTop.jsx
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BackToTop({ threshold = 300, label = 'Volver arriba' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  const toTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (navigator.vibrate) navigator.vibrate(20);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25 }}
          // 🔽 antes era bottom-6 → ahora bottom-[88px] (sube un poquito sobre la barra)
          className="fixed bottom-[88px] right-5 z-50 md:bottom-6 md:right-6"
        >
          <Button
            onClick={toTop}
            size="icon"
            variant="outline"
            className="
              h-11 w-11 rounded-full shadow-lg border-2
              border-[hsl(var(--azul-antoniano))] 
              text-[hsl(var(--azul-antoniano))] 
              bg-white/80 backdrop-blur 
              hover:bg-[hsl(var(--azul-antoniano))] hover:text-white 
              dark:bg-background dark:border-primary dark:text-primary 
              dark:hover:bg-primary dark:hover:text-[hsl(var(--blanco-fundacion))]
              transition-colors duration-200
            "
            aria-label={label}
            title={label}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
          <span className="sr-only">{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
