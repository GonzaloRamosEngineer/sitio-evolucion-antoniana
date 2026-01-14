// src/components/Layout/BackToTop.jsx
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BackToTop({ threshold = 400, label = 'Volver arriba' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  const toTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Haptic feedback para móviles
    if (navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-[96px] right-6 z-[60] md:bottom-8 md:right-8"
        >
          <Button
            onClick={toTop}
            size="icon"
            className="h-12 w-12 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] border-none bg-brand-primary hover:bg-brand-dark text-white transition-all duration-300"
            aria-label={label}
          >
            <ChevronUp className="h-6 w-6 stroke-[3px]" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}