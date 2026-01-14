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
  ChevronDown,
  User
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

  const logoUrl = '/img/transparente.png'; // Asegúrate de que esta ruta sea correcta o usa un placeholder si falla

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

  // 🔒 Ajuste: cerrar menús en cambio de ruta
  React.useEffect(() => {
    setOpenNos(false);
    setOpenColab(false);
    setIsMenuOpen(false);
    setOpenMob({ nosotros: false, colabora: false });
  }, [location.pathname]);

  // 🔒 Ajuste: cerrar en scroll / click fuera / cambio de orientación
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
      className="relative h-full flex items-center"
      onMouseEnter={() => openWithIntent(setOpen, timerRef)}
      onMouseLeave={() => closeWithIntent(setOpen, timerRef)}
    >
      {/* Click al padre: navega. Hover: abre submenú */}
      <Link
        to={item.href}
        className={`
            px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-1 group
            ${isGroupActive(item) 
                ? 'text-brand-primary bg-brand-sand font-semibold' 
                : 'text-gray-600 hover:text-brand-action hover:bg-gray-50'
            }
        `}
      >
        {item.name}
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${open ? 'rotate-180 text-brand-action' : 'text-gray-400'}`} />
      </Link>

      {/* Submenú Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 top-full pt-4 z-50 w-48"
            onMouseEnter={() => openWithIntent(setOpen, timerRef)}
            onMouseLeave={() => closeWithIntent(setOpen, timerRef)}
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden p-1">
                {item.subitems.map((sub) => (
                <Link
                    key={sub.href}
                    to={sub.href}
                    className="block px-4 py-2.5 text-sm rounded-lg text-gray-600 hover:text-brand-primary hover:bg-brand-sand transition-colors font-medium"
                >
                    {sub.name}
                </Link>
                ))}
            </div>
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
      className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]"
      onMouseLeave={() => { setOpenNos(false); setOpenColab(false); }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* --- LOGO --- */}
          <Link to="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="w-10 h-10 flex items-center justify-center bg-brand-primary rounded-lg text-white font-bold text-xl shadow-lg shadow-brand-primary/30"
            >
               {/* Si tienes logo imagen, usa esto, sino la inicial */}
               {/* <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> */}
               E
            </motion.div>
            <div className="flex flex-col">
              <span className="text-lg font-poppins font-bold text-brand-primary leading-none tracking-tight">
                Evolución <span className="text-brand-action">Antoniana</span>
              </span>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest leading-none mt-1">
                Fundación
              </span>
            </div>
          </Link>

          {/* --- MENÚ DESKTOP --- */}
          <div className="hidden lg:flex items-center gap-1">
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
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative
                    ${isActive(item.href) 
                        ? 'text-brand-primary font-bold' 
                        : 'text-gray-600 hover:text-brand-action hover:bg-gray-50'
                    }
                  `}
                >
                  {item.name}
                  {isActive(item.href) && (
                      <motion.div 
                        layoutId="nav-underline"
                        className="absolute bottom-1.5 left-4 right-4 h-0.5 bg-brand-primary rounded-full" 
                      />
                  )}
                </Link>
              )
            )}
          </div>

          {/* --- USUARIO / AUTH --- */}
          <div className="flex items-center gap-3">
            {/* ThemeSwitch (Si lo usas, descomentar) */}
            {/* <ThemeSwitch /> */}
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="relative p-0.5 rounded-full ring-2 ring-brand-gold/50 hover:ring-brand-gold transition-all"
                  >
                    <Avatar className="h-9 w-9 border-2 border-white">
                      <AvatarFallback className="bg-brand-primary text-white font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 mt-3 border-gray-100 shadow-xl rounded-xl bg-white p-2"
                  align="end"
                  forceMount
                >
                  <div className="flex items-center gap-3 p-3 mb-2 bg-brand-sand rounded-lg">
                    <div className="bg-white p-1.5 rounded-full text-brand-primary">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col space-y-0.5 overflow-hidden">
                      <p className="font-bold text-sm text-brand-dark truncate">
                        {user?.name || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-brand-sand focus:text-brand-primary">
                    <Link to="/dashboard" className="flex items-center py-2.5 px-3">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Mi Panel</span>
                    </Link>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator className="bg-gray-100 my-1" />
                      <p className="text-[10px] uppercase font-bold text-gray-400 px-3 py-1 tracking-wider">Administración</p>
                      
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-brand-sand focus:text-brand-primary">
                        <Link to="/admin" className="flex items-center py-2 px-3">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Panel General</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-brand-sand focus:text-brand-primary">
                        <Link to="/admin?tab=activities" className="flex items-center py-2 px-3">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          <span>Actividades</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-brand-sand focus:text-brand-primary">
                        <Link to="/admin?tab=legal_documents" className="flex items-center py-2 px-3">
                          <FileText className="mr-2 h-4 w-4" />
                          <span>Documentos</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator className="bg-gray-100 my-1" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-lg cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 py-2.5 px-3"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden lg:flex items-center gap-3">
                <Button
                  variant="ghost"
                  asChild
                  className="text-brand-dark hover:text-brand-action hover:bg-transparent font-medium"
                >
                  <Link to="/login">Ingresar</Link>
                </Button>
                <Button
                  className="bg-brand-action text-white hover:bg-red-800 rounded-full px-5 font-bold shadow-md hover:shadow-lg transition-all"
                  asChild
                >
                  <Link to="/register">Registrarse</Link>
                </Button>
              </div>
            )}

            {/* BOTÓN MENÚ MÓVIL */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="lg:hidden text-brand-dark p-2 rounded-md hover:bg-gray-100 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.button>
          </div>
        </div>

        {/* --- MENÚ MÓVIL --- */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-100 bg-white overflow-hidden shadow-inner"
            >
              <div className="px-4 pt-4 pb-6 space-y-2">
                {navigation.map((item) =>
                  !item.subitems ? (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-brand-primary text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <div key={item.name} className="rounded-xl bg-gray-50/50 border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3">
                        <Link
                          to={item.href}
                          className="font-medium text-brand-dark flex-1"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          className="p-2 text-brand-primary"
                          onClick={() =>
                            setOpenMob((s) => ({ ...s, [item.key]: !s[item.key] }))
                          }
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${openMob[item.key] ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {openMob[item.key] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-white border-t border-gray-100"
                          >
                            {item.subitems.map((sub) => (
                              <Link
                                key={sub.href}
                                to={sub.href}
                                className="block px-8 py-3 text-sm text-gray-600 hover:text-brand-action hover:bg-gray-50 border-l-4 border-transparent hover:border-brand-action transition-all"
                                onClick={() => {
                                  setIsMenuOpen(false);
                                  setOpenMob({ nosotros: false, colabora: false });
                                }}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                )}

                {/* Mobile Auth Buttons */}
                {!isAuthenticated && (
                    <div className="pt-4 mt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                        <Button variant="outline" className="w-full border-gray-300 text-gray-700" asChild>
                            <Link to="/login" onClick={() => setIsMenuOpen(false)}>Ingresar</Link>
                        </Button>
                        <Button className="w-full bg-brand-action text-white" asChild>
                            <Link to="/register" onClick={() => setIsMenuOpen(false)}>Registrarse</Link>
                        </Button>
                    </div>
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