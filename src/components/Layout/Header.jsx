import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import {
  Menu,
  X,
  LogOut,
  Settings,
  CalendarDays,
  LayoutDashboard,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeSwitch } from '@/components/ThemeSwitch';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // desktop: control de submenús + timers para hover-intent
  const [openNos, setOpenNos] = useState(false);
  const [openColab, setOpenColab] = useState(false);
  const nosTimer = useRef(null);
  const colabTimer = useRef(null);

  // mobile: acordeones para submenús
  const [openMob, setOpenMob] = useState({ nosotros: false, colabora: false });

  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Inicio', href: '/' },
    { name: 'Novedades', href: '/novedades' },
    {
      name: 'Nosotros',
      href: '/about',
      key: 'nosotros',
      subitems: [
        
        { name: 'Partners', href: '/partners' },
      ],
    },
    { name: 'Actividades', href: '/activities' },
    {
      name: 'Colaborá',
      href: '/collaborate',
      key: 'colabora',
      subitems: [{ name: 'Beneficios', href: '/beneficios' }],
    },
    { name: 'Transparencia', href: '/legal-documents' },
    
  ];

  // Activo para enlaces simples
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  // Activo para grupos (padres)
  const isGroupActive = (item) => {
    if (!item.subitems) return isActive(item.href);
    if (item.key === 'nosotros') {
      return ['/about', '/activities', '/partners'].some((p) =>
        location.pathname.startsWith(p)
      );
    }
    if (item.key === 'colabora') {
      return ['/collaborate', '/beneficios'].some((p) =>
        location.pathname.startsWith(p)
      );
    }
    return isActive(item.href);
  };

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  const logoUrl = '/img/transparente.png';

  // helpers hover-intent
  const clearTimer = (ref) => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  };
  const openWithIntent = (setOpen, timerRef) => {
    clearTimer(timerRef);
    setOpen(true);
  };
  const closeWithIntent = (setOpen, timerRef, delay = 220) => {
    clearTimer(timerRef);
    timerRef.current = setTimeout(() => setOpen(false), delay);
  };

  // 🔒 Ajuste mínimo 1: cerrar menús en cambio de ruta
  React.useEffect(() => {
    setOpenNos(false);
    setOpenColab(false);
    setIsMenuOpen(false);
    setOpenMob({ nosotros: false, colabora: false });
  }, [location.pathname]);

  // 🔒 Ajuste mínimo 2: cerrar en scroll / click fuera / cambio de orientación
  React.useEffect(() => {
    const close = () => { setOpenNos(false); setOpenColab(false); };
    const onDocClick = (e) => {
      if (!e.target.closest?.('header')) close();
    };
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('orientationchange', close);
    document.addEventListener('click', onDocClick);
    return () => {
      window.removeEventListener('scroll', close);
      window.removeEventListener('orientationchange', close);
      document.removeEventListener('click', onDocClick);
    };
  }, []);

  // Submenú de escritorio (custom)
  const DesktopSubmenu = ({ item, open, setOpen, timerRef }) => (
    <div
      className="relative"
      onMouseEnter={() => openWithIntent(setOpen, timerRef)}
      onMouseLeave={() => closeWithIntent(setOpen, timerRef)}
    >
      {/* Click al padre: navega. Hover: abre submenú */}
      <Button
        variant="ghost"
        asChild
        className="text-marron-legado dark:text-foreground/80 hover:bg-celeste-complementario dark:hover:bg-accent hover:text-primary-antoniano dark:hover:text-primary"
      >
        <Link
          to={item.href}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 relative group ${
            isGroupActive(item) ? 'text-primary-antoniano dark:text-primary' : ''
          }`}
        >
          {item.name}
          <span
            className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary-antoniano dark:bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ${
              isGroupActive(item) ? 'scale-x-100' : ''
            }`}
          />
        </Link>
      </Button>

      {/* Submenú */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
            // ✅ Ajuste mínimo 3: quitar mt-1 para evitar “gap” de hover
            className="absolute left-0 top-full z-50 min-w-[220px] rounded-md border border-border bg-white dark:bg-card text-foreground shadow-lg p-1"
            // mantener abierto mientras el mouse está encima
            onMouseEnter={() => openWithIntent(setOpen, timerRef)}
            onMouseLeave={() => closeWithIntent(setOpen, timerRef)}
          >
            {item.subitems.map((sub) => (
              <Link
                key={sub.href}
                to={sub.href}
                className="block w-full px-3 py-2 text-sm rounded-md hover:bg-celeste-complementario/60 dark:hover:bg-accent/60"
              >
                {sub.name}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-blanco-fundacion/80 dark:bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-50 shadow-sm"
      // ✅ Ajuste mínimo 4: cerrar al salir del header (desktop)
      onMouseLeave={() => { setOpenNos(false); setOpenColab(false); }}
    >
      <nav className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="w-12 h-12 flex items-center justify-center"
            >
              <img
                src={logoUrl}
                alt="Fundación Evolución Antoniana Logo"
                className="w-full h-full object-contain"
              />
            </motion.div>
            <div className="hidden sm:block">
              <span className="text-2xl font-poppins font-bold text-primary-antoniano dark:text-primary">
                Fundación
              </span>
              <span className="text-2xl font-poppins font-semibold text-marron-legado/80 dark:text-foreground/80 ml-1">
                Evolución Antoniana
              </span>
            </div>
          </Link>

          {/* Menú Desktop */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) =>
              item.subitems ? (
                <DesktopSubmenu
                  key={item.name}
                  item={item}
                  open={item.key === 'nosotros' ? openNos : openColab}
                  setOpen={item.key === 'nosotros' ? setOpenNos : setOpenColab}
                  timerRef={item.key === 'nosotros' ? nosTimer : colabTimer}
                />
              ) : (
                <motion.div key={item.name} whileTap={{ scale: 0.97 }}>
                  <Button
                    variant="ghost"
                    asChild
                    className="text-marron-legado dark:text-foreground/80 hover:bg-celeste-complementario dark:hover:bg-accent hover:text-primary-antoniano dark:hover:text-primary"
                  >
                    <Link
                      to={item.href}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 relative group ${
                        isActive(item.href) ? 'text-primary-antoniano dark:text-primary' : ''
                      }`}
                    >
                      {item.name}
                      <span
                        className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary-antoniano dark:bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ${
                          isActive(item.href) ? 'scale-x-100' : ''
                        }`}
                      />
                    </Link>
                  </Button>
                </motion.div>
              )
            )}
          </div>

          {/* Usuario / Auth */}
          <div className="flex items-center space-x-2">
            <ThemeSwitch />
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="relative h-10 w-10 rounded-full p-0 focus-visible:ring-primary-antoniano focus:outline-none"
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary-antoniano/50 hover:border-primary-antoniano dark:border-primary/50 dark:hover:border-primary transition-all">
                      <AvatarFallback className="bg-celeste-complementario dark:bg-accent text-primary-antoniano dark:text-primary font-semibold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 mt-2 border-border shadow-xl rounded-lg bg-card"
                  align="end"
                  forceMount
                >
                  <div className="flex items-center justify-start gap-2 p-3 border-b border-border">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-celeste-complementario dark:bg-accent text-primary-antoniano dark:text-primary font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5 leading-none">
                      <p className="font-poppins font-medium text-sm text-foreground">
                        {user?.name || 'Usuario'}
                      </p>
                      <p className="w-[150px] truncate text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <DropdownMenuItem asChild className="hover:bg-accent cursor-pointer">
                    <Link to="/dashboard" className="flex items-center text-sm py-2 px-3">
                      <LayoutDashboard className="mr-2 h-4 w-4 text-primary-antoniano dark:text-primary" />
                      <span className="text-foreground">Mi Panel</span>
                    </Link>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild className="hover:bg-accent cursor-pointer">
                        <Link to="/admin" className="flex items-center text-sm py-2 px-3">
                          <Settings className="mr-2 h-4 w-4 text-primary-antoniano dark:text-primary" />
                          <span className="text-foreground">Panel Admin</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="hover:bg-accent cursor-pointer">
                        <Link to="/admin?tab=activities" className="flex items-center text-sm py-2 px-3">
                          <CalendarDays className="mr-2 h-4 w-4 text-primary-antoniano dark:text-primary" />
                          <span className="text-foreground">Gestionar Actividades</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="hover:bg-accent cursor-pointer">
                        <Link to="/admin?tab=legal_documents" className="flex items-center text-sm py-2 px-3">
                          <FileText className="mr-2 h-4 w-4 text-primary-antoniano dark:text-primary" />
                          <span className="text-foreground">Documentos Legales</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator className="bg-border" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="hover:bg-accent cursor-pointer text-sm py-2 px-3"
                  >
                    <LogOut className="mr-2 h-4 w-4 text-destructive" />
                    <span className="text-destructive">Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden lg:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  asChild
                  className="text-primary-antoniano dark:text-primary hover:bg-celeste-complementario dark:hover:bg-accent px-4"
                >
                  <Link to="/login">Iniciar Sesión</Link>
                </Button>
                <Button
                  className="bg-primary-antoniano text-white dark:bg-primary rounded-full px-6 py-2 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
                  asChild
                >
                  <Link to="/register">Registrarse</Link>
                </Button>
              </div>
            )}

            {/* Botón menú móvil */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="lg:hidden text-primary-antoniano dark:text-primary hover:bg-celeste-complementario dark:hover:bg-accent p-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-antoniano"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Abrir menú de navegación"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.button>
          </div>
        </div>

        {/* Menú móvil */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border bg-blanco-fundacion/95 dark:bg-card/95"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation.map((item) =>
                  !item.subitems ? (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`block px-3 py-3 rounded-md text-base font-medium transition-colors ${
                        isActive(item.href)
                          ? 'text-primary-antoniano dark:text-primary bg-celeste-complementario dark:bg-accent font-semibold'
                          : 'text-marron-legado dark:text-foreground hover:text-primary-antoniano dark:hover:text-primary hover:bg-celeste-complementario/70 dark:hover:bg-accent/70'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <div key={item.name} className="rounded-md">
                      <div className="flex items-stretch">
                        <Link
                          to={item.href}
                          className="flex-1 px-3 py-3 rounded-l-md text-base font-medium text-marron-legado dark:text-foreground hover:text-primary-antoniano dark:hover:text-primary hover:bg-celeste-complementario/70 dark:hover:bg-accent/70"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          aria-label={`Abrir submenú de ${item.name}`}
                          className="px-3 py-3 rounded-r-md text-base font-medium text-marron-legado/80 dark:text-foreground/80 hover:text-primary-antoniano dark:hover:text-primary hover:bg-celeste-complementario/70 dark:hover:bg-accent/70"
                          onClick={() =>
                            setOpenMob((s) => ({ ...s, [item.key]: !s[item.key] }))
                          }
                        >
                          <span className="text-sm">{openMob[item.key] ? '－' : '＋'}</span>
                        </button>
                      </div>

                      <AnimatePresence>
                        {openMob[item.key] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pl-4"
                          >
                            {item.subitems.map((sub) => (
                              <Link
                                key={sub.href}
                                to={sub.href}
                                className="block px-5 py-2 text-sm rounded-md text-marron-legado dark:text-foreground hover:text-primary-antoniano dark:hover:text-primary hover:bg-celeste-complementario/60 dark:hover:bg-accent/60"
                                onClick={() => {
                                  setIsMenuOpen(false);
                                  setOpenMob({ nosotros: false, colabora: false });
                                }}
                              >
                                ↳ {sub.name}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
};

export default Header;
