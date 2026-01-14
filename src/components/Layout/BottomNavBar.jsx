// src/components/Layout/BottomNavBar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CalendarDays, User, Heart, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const BottomNavBar = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const navItems = [
    {
      name: 'WhatsApp',
      href: 'https://wa.me/543872131916?text=Hola%2C%20quiero%20sumarme%20a%20la%20red%20solidaria',
      icon: MessageCircle, // Usamos MessageCircle para un look más moderno
      isExternal: true,
      color: 'text-green-500'
    },
    {
      name: 'Donar',
      href: 'https://link.mercadopago.com.ar/evolucionantoniana',
      icon: Heart,
      isExternal: true,
      color: 'text-brand-action'
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
      className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-lg border-t border-gray-100 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] z-50 pb-safe"
    >
      <nav className="h-full max-w-md mx-auto">
        <ul className="flex justify-around items-center h-full px-4">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const linkIsActive = !item.isExternal && isActive(item.href);
            
            const content = (
              <motion.div
                whileTap={{ scale: 0.85 }}
                className="flex flex-col items-center justify-center relative py-1"
              >
                {linkIsActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -top-2 w-1 h-1 bg-brand-primary rounded-full"
                  />
                )}
                <IconComponent
                  className={cn(
                    'w-6 h-6 transition-all duration-300',
                    linkIsActive ? 'text-brand-primary' : 'text-gray-400',
                    item.isExternal && item.name === 'WhatsApp' && 'group-hover:text-green-500',
                    item.isExternal && item.name === 'Donar' && 'text-brand-action'
                  )}
                  strokeWidth={linkIsActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-tighter mt-1 transition-colors',
                    linkIsActive ? 'text-brand-primary' : 'text-gray-400'
                  )}
                >
                  {item.name}
                </span>
              </motion.div>
            );

            return (
              <li key={item.name} className="flex-1 group">
                {item.isExternal ? (
                  <a href={item.href} target="_blank" rel="noreferrer" className="flex w-full h-full items-center justify-center">
                    {content}
                  </a>
                ) : (
                  <Link to={item.href} className="flex w-full h-full items-center justify-center">
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