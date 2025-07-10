import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CalendarDays, User, Heart } from 'lucide-react';
import WhatsappIcon from '@/components/icons/WhatsappIcon';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const BottomNavBar = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const navItems = [
    {
      name: 'WhatsApp',
      href: 'https://wa.me/543872131916?text=Hola%2C%20quiero%20sumarme%20a%20la%20red%20solidaria',
      icon: WhatsappIcon,
      isExternal: true,
    },
    {
      name: 'Donar',
      href: 'https://link.mercadopago.com.ar/evolucionantoniana',
      icon: Heart,
      isExternal: true,
    },
    {
      name: 'Actividades',
      href: '/activities',
      icon: CalendarDays,
      isExternal: false,
    },
    {
      name: 'Mi Perfil',
      href: isAuthenticated ? '/dashboard' : '/login',
      icon: User,
      isExternal: false,
    },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-blanco-fundacion dark:bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-50"
    >
      <nav className="h-full">
        <ul className="flex justify-around items-center h-full px-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const linkIsActive = !item.isExternal && isActive(item.href);
            
            const content = (
              <motion.div
                whileTap={{ scale: 0.90 }}
                className="flex flex-col items-center justify-center space-y-1 w-full h-full"
              >
                <IconComponent
                  className={cn(
                    'w-6 h-6 transition-colors',
                    linkIsActive ? 'text-primary-antoniano dark:text-primary' : 'text-marron-legado/70 dark:text-muted-foreground',
                     item.name === 'WhatsApp' && 'text-green-500',
                     item.name === 'Donar' && 'text-sky-500'
                  )}
                />
                <span
                  className={cn(
                    'text-xs font-medium transition-colors',
                    linkIsActive ? 'text-primary-antoniano dark:text-primary' : 'text-marron-legado/70 dark:text-muted-foreground'
                  )}
                >
                  {item.name}
                </span>
              </motion.div>
            );

            return (
              <li key={item.name} className="flex-1">
                {item.isExternal ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full h-full items-center justify-center rounded-lg"
                    aria-label={item.name}
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    to={item.href}
                    className="flex w-full h-full items-center justify-center rounded-lg"
                    aria-label={item.name}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </motion.div>
  );
};

export default BottomNavBar;