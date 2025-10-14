// src/components/Layout/BackToTop.jsx
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BackToTop({ threshold = 300, label = 'Volver arriba' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll(); // estado inicial
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
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={toTop}
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full shadow-lg bg-white/80 backdrop-blur hover:bg-white dark:bg-background"
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
