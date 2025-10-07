import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, User, LogOut, Settings, CalendarDays, LayoutDashboard, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeSwitch } from '@/components/ThemeSwitch';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Inicio', href: '/' },
    { name: 'Sobre Nosotros', href: '/about' },
    { name: 'Actividades', href: '/activities' },
    { name: 'Colaborá', href: '/collaborate' },
    { name: 'Documentos Legales', href: '/legal-documents' },
    { name: 'Contacto', href: '/contact' }
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    navigate('/'); 
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';
  
  const logoUrl = "/img/transparente.png"; 

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-blanco-fundacion/80 dark:bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-50 shadow-sm"
    >
      <nav className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="w-12 h-12 flex items-center justify-center"
            >
              <img src={logoUrl} alt="Fundación Evolución Antoniana Logo" className="w-full h-full object-contain" />
            </motion.div>
            <div className="hidden sm:block">
              <span className="text-2xl font-poppins font-bold text-primary-antoniano dark:text-primary">Fundación</span>
              <span className="text-2xl font-poppins font-semibold text-marron-legado/80 dark:text-foreground/80 ml-1">Evolución Antoniana</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <motion.div key={item.name} whileTap={{ scale: 0.97 }}>
                <Button variant="ghost" asChild className="text-marron-legado dark:text-foreground/80 hover:bg-celeste-complementario dark:hover:bg-accent hover:text-primary-antoniano dark:hover:text-primary">
                  <Link
                    to={item.href}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 relative group ${
                      isActive(item.href)
                        ? 'text-primary-antoniano dark:text-primary'
                        : ''
                    }`}
                  >
                    {item.name}
                    <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary-antoniano dark:bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ${isActive(item.href) ? 'scale-x-100' : ''}`}></span>
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>

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
                <DropdownMenuContent className="w-56 mt-2 border-border shadow-xl rounded-lg bg-card" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-3 border-b border-border">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-celeste-complementario dark:bg-accent text-primary-antoniano dark:text-primary font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5 leading-none">
                      <p className="font-poppins font-medium text-sm text-foreground">{user?.name || 'Usuario'}</p>
                      <p className="w-[150px] truncate text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenuItem asChild className="hover:bg-accent cursor-pointer">
                    <motion.div whileTap={{ scale: 0.98 }} className="w-full">
                      <Link to="/dashboard" className="flex items-center text-sm py-2 px-3">
                        <LayoutDashboard className="mr-2 h-4 w-4 text-primary-antoniano dark:text-primary" />
                        <span className="text-foreground">Mi Panel</span>
                      </Link>
                    </motion.div>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild className="hover:bg-accent cursor-pointer">
                        <motion.div whileTap={{ scale: 0.98 }} className="w-full">
                          <Link to="/admin" className="flex items-center text-sm py-2 px-3">
                            <Settings className="mr-2 h-4 w-4 text-primary-antoniano dark:text-primary" />
                            <span className="text-foreground">Panel Admin</span>
                          </Link>
                        </motion.div>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="hover:bg-accent cursor-pointer">
                        <motion.div whileTap={{ scale: 0.98 }} className="w-full">
                          <Link to="/admin?tab=activities" className="flex items-center text-sm py-2 px-3">
                            <CalendarDays className="mr-2 h-4 w-4 text-primary-antoniano dark:text-primary" />
                            <span className="text-foreground">Gestionar Actividades</span>
                          </Link>
                        </motion.div>
                      </DropdownMenuItem>
                       <DropdownMenuItem asChild className="hover:bg-accent cursor-pointer">
                        <motion.div whileTap={{ scale: 0.98 }} className="w-full">
                          <Link to="/admin?tab=legal_documents" className="flex items-center text-sm py-2 px-3">
                            <FileText className="mr-2 h-4 w-4 text-primary-antoniano dark:text-primary" />
                            <span className="text-foreground">Documentos Legales</span>
                          </Link>
                        </motion.div>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={handleLogout} className="hover:bg-accent cursor-pointer text-sm py-2 px-3">
                    <motion.div whileTap={{ scale: 0.98 }} className="flex items-center w-full">
                      <LogOut className="mr-2 h-4 w-4 text-destructive" />
                      <span className="text-destructive">Cerrar Sesión</span>
                    </motion.div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden lg:flex items-center space-x-2">
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button variant="ghost" asChild className="text-primary-antoniano dark:text-primary hover:bg-celeste-complementario dark:hover:bg-accent hover:text-primary-antoniano dark:hover:text-primary px-4">
                    <Link to="/login">Iniciar Sesión</Link>
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button asChild className="bg-primary-antoniano text-white dark:bg-primary dark:text-primary-foreground hover:bg-primary-antoniano/90 dark:hover:bg-primary/90 rounded-full px-6 py-2 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105">
                    <Link to="/register">Registrarse</Link>
                  </Button>
                </motion.div>
              </div>
            )}

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

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border bg-blanco-fundacion/95 dark:bg-card/95"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation.map((item) => (
                  <motion.div key={item.name} whileTap={{ scale: 0.98 }}>
                    <Link
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
                  </motion.div>
                ))}
                
                {!isAuthenticated && (
                  <div className="pt-4 pb-2 space-y-2 border-t border-border mt-2">
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button variant="outline" className="w-full border-primary-antoniano dark:border-primary text-primary-antoniano dark:text-primary hover:bg-celeste-complementario dark:hover:bg-accent" asChild>
                        <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                          Iniciar Sesión
                        </Link>
                      </Button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button className="w-full bg-primary-antoniano dark:bg-primary text-white dark:text-primary-foreground hover:bg-primary-antoniano/90 dark:hover:bg-primary/90" asChild>
                        <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                          Registrarse
                        </Link>
                      </Button>
                    </motion.div>
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