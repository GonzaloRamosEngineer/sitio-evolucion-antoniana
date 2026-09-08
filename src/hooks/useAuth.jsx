import React, { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { queryClient } from '@/lib/queryClient';
import { logger } from '@/lib/logger';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (authUser) => {
    if (!authUser?.id) { 
      setUser(null); 
      // setLoading(false) se maneja en handleAuthStateChange
      return null;
    }
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, name, email, phone, role, is_verified, created_at, dni, birth_date, gender')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { 
        logger.error('Error fetching user profile:', error.message);
        setUser({ ...authUser, name: authUser.email, email: authUser.email, isAdmin: false, role: 'user' }); 
        toast({
          title: "Error al cargar perfil",
          description: "No se pudo obtener tu información de perfil completa.",
          variant: "destructive",
        });
        return null; 
      }
      
      if (profile) {
        setUser({
          ...authUser, 
          ...profile,  
          isAdmin: profile.role === 'admin',
        });
      } else {
         logger.warn("User profile not found in public.users for ID:", authUser.id);
         const metadataRole = authUser.user_metadata?.role || (authUser.app_metadata?.claims_admin ? 'admin' : 'user');
         setUser({
           ...authUser,
           name: authUser.user_metadata?.name || authUser.email,
           email: authUser.email,
           isAdmin: metadataRole === 'admin',
           role: metadataRole,
         });
      }
      return profile;

    } catch (error) {
      logger.error('Error in fetchUserProfile:', error.message);
      setUser({ ...authUser, name: authUser.email, email: authUser.email, isAdmin: false, role: 'user' }); 
      toast({
        title: "Error Crítico de Perfil",
        description: "Ocurrió un error inesperado al buscar tu perfil.",
        variant: "destructive",
      });
      return null;
    }
    // setLoading(false) se maneja en handleAuthStateChange
  }, [toast]); 
  
  /*
    ⚠️ `loading` DESMONTA LA APLICACIÓN, ASÍ QUE SOLO PUEDE MOVERSE CUANDO CAMBIA
    QUIÉN ESTÁ LOGUEADO.

    `ProtectedRoute` devuelve un spinner EN LUGAR de `children` mientras
    `loading` es true. O sea que cada vez que este provider lo pone en true, la
    pantalla protegida entera **se desmonta y se vuelve a montar**: se pierde el
    formulario a medio llenar, el lote de movimientos ya analizado, el scroll,
    todo. Desde afuera se ve exactamente como una recarga de página.

    Antes esto pasaba con CUALQUIER evento de auth, y `onAuthStateChange` emite
    varios que no cambian la identidad de nadie: `INITIAL_SESSION` (que además
    llega duplicado, porque `syncSession` lo dispara a mano) y `TOKEN_REFRESHED`
    (una vez por hora, cuando falta menos de 90s para que venza el access token —
    ver `EXPIRY_MARGIN_MS` en auth-js).

    Es la segunda vez que este archivo pisa el mismo pozo: ya se había quitado un
    listener propio de `visibilitychange` **por este mismo daño** (ver la nota más
    abajo). Se quitó el disparador y se dejó el mecanismo, así que el síntoma
    volvió por otra puerta.

    La regla, entonces: **un evento que no cambia el id del usuario no toca
    `loading` ni relee el perfil.**
  */
  const idActual = useRef(null);
  const yaResolvio = useRef(false);

  const handleAuthStateChange = useCallback(async (event, session) => {
    const authUser = session?.user || null;
    const mismaIdentidad = yaResolvio.current && authUser?.id === idActual.current;

    if (mismaIdentidad) {
      // `USER_UPDATED` sí cambió el perfil, pero la persona ya está adentro: se
      // relee sin tocar `loading`, para no desmontar lo que esté haciendo.
      if (event === 'USER_UPDATED') await fetchUserProfile(authUser);
      return;
    }

    setLoading(true);
    if (authUser) {
      await fetchUserProfile(authUser);
    } else {
      setUser(null);
    }
    idActual.current = authUser?.id ?? null;
    yaResolvio.current = true;
    setLoading(false);
  }, [fetchUserProfile]);

  const refreshUser = useCallback(async () => {
    // Sin `setLoading(true)`: quien pide refrescar el perfil no está pidiendo que
    // se le borre la pantalla. Va como `USER_UPDATED` justamente para forzar la
    // relectura aunque sea la misma persona, que es lo que se está pidiendo.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      logger.error("Error refreshing session in refreshUser:", sessionError.message);
      await handleAuthStateChange('REFRESH_ERROR', null); // Asegura que el estado se actualice
      toast({
        title: "Error de Sesión",
        description: "No se pudo refrescar la sesión actual.",
        variant: "destructive",
      });
      return;
    }
    await handleAuthStateChange('USER_UPDATED', session);
  }, [handleAuthStateChange, toast]);

  useEffect(() => {
    const syncSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error){
        logger.error("Error in syncSession getSession:", error.message);
      }
      await handleAuthStateChange('INITIAL_SESSION', session);
    };
  
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthStateChange(event, session);
    });
  
    syncSession(); 
  
    return () => {
      if (listener?.subscription) { 
        listener.subscription.unsubscribe();
      }
    };
  }, [handleAuthStateChange]);


  // NOTA: se quitó el refresco automático en 'visibilitychange'. Disparaba
  // refreshUser() (setLoading(true)) cada vez que se volvía a la pestaña, lo que
  // desmontaba las páginas protegidas y hacía perder formularios a medio completar
  // (alta de noticias/partners). Supabase ya renueva el token por su cuenta
  // (autoRefreshToken) y notifica vía onAuthStateChange, así que era redundante.
  //
  // ⚠️ Y ESO ARREGLÓ EL DISPARADOR, NO EL MECANISMO. `onAuthStateChange` emite
  // eventos que no cambian la identidad de nadie, y hasta el 2026-09-06 cada uno
  // de ellos volvía a poner `loading` en true — o sea que el mismo desmontaje
  // seguía pasando, solo que por otra puerta y más espaciado. La guarda por id de
  // arriba es la que cierra el mecanismo; `src/hooks/useAuth.test.jsx` la fija.

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data.user;
    } catch (error) {
      logger.error('Error in login:', error.message);
      if (error.message.includes("Invalid login credentials")) {
        throw new Error('Credenciales inválidas. Por favor, verifica tu email y contraseña.');
      } else if (error.message.includes("Email not confirmed")) {
        throw new Error('Por favor, confirma tu email antes de iniciar sesión.');
      }
      throw new Error(error.message || 'Error al iniciar sesión.');
    }
  };

  const register = async (userData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone,
            role: 'user' 
          }
        }
      });
      if (error) throw error;
      return data.user;
    } catch (error) {
      logger.error('Error in register:', error.message);
      if (error.message.includes("User already registered")) {
        throw new Error('Este email ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.');
      } else if (error.message.includes("Database error saving new user")) {
         throw new Error('Hubo un problema al crear tu perfil en la base de datos. Inténtalo de nuevo.');
      }
      throw new Error(error.message || 'Error al registrar el usuario.');
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Limpiar la caché de queries es obligatorio: si no, lo que vio un usuario
      // (por ejemplo los partners no aprobados que ve un admin) seguiría
      // cacheado para quien se loguee después en el mismo tab.
      //
      // Antes acá había un barrido de claves de `sessionStorage`
      // (`dashboard_loaded_*`, `activities_loaded`): quedó muerto al migrar a
      // TanStack Query (ROADMAP 4.2), ya nadie las escribe.
      queryClient.clear();
    } catch (error) {
      logger.error('Error in logout:', error.message);
      setUser(null); 
      setLoading(false); 
      toast({ title: "Error", description: "Error al cerrar sesión.", variant: "destructive" });
    }
  };
  
  const sendPasswordResetEmail = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
    } catch (error) {
      logger.error('Error sending password reset email:', error.message);
      throw new Error(error.message || "No se pudo enviar el correo de reestablecimiento.");
    } 
  };

  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return data.user;
    } catch (error) {
      logger.error('Error updating password:', error.message);
      throw new Error(error.message || "No se pudo actualizar la contraseña.");
    }
  };

  const value = {
    user,
    setUser,
    login,
    register,
    logout,
    sendPasswordResetEmail,
    updatePassword,
    loading,
    isAuthenticated: !!user,
    isAdmin: !!user?.isAdmin,
    role: user?.role,
    isBoardMember: user?.role === 'admin' || user?.role === 'comision_directiva',
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};