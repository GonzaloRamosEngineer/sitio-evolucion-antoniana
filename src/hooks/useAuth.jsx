import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

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
        .select('id, name, email, phone, role, is_verified, created_at')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { 
        console.error('Error fetching user profile:', error.message);
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
         console.warn("User profile not found in public.users for ID:", authUser.id);
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
      console.error('Error in fetchUserProfile:', error.message);
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
  
  const handleAuthStateChange = useCallback(async (event, session) => {
    setLoading(true); 
    const authUser = session?.user || null;

    if (authUser) {
      await fetchUserProfile(authUser); 
    } else {
      setUser(null);
    }
    setLoading(false); 
  }, [fetchUserProfile]);

  const refreshUser = useCallback(async () => {
    setLoading(true); 
    const { data: { session }, error: sessionError } = await supabase.auth.getSession(); 
    if (sessionError) {
      console.error("Error refreshing session in refreshUser:", sessionError.message);
      // setUser(null) y setLoading(false) serán manejados por handleAuthStateChange
      await handleAuthStateChange('REFRESH_ERROR', null); // Asegura que el estado se actualice
      toast({
        title: "Error de Sesión",
        description: "No se pudo refrescar la sesión actual.",
        variant: "destructive",
      });
      return;
    }
    await handleAuthStateChange('MANUAL_REFRESH', session);
  }, [handleAuthStateChange, toast]);

  useEffect(() => {
    const syncSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error){
        console.error("Error in syncSession getSession:", error.message);
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


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUser]);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Error in login:', error.message);
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
      console.error('Error in register:', error.message);
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
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('dashboard_loaded_') || key === 'activities_loaded') {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error in logout:', error.message);
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
      console.error('Error sending password reset email:', error.message);
      throw new Error(error.message || "No se pudo enviar el correo de reestablecimiento.");
    } 
  };

  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Error updating password:', error.message);
      throw new Error(error.message || "No se pudo actualizar la contraseña.");
    }
  };

  const value = {
    user, 
    login,
    register,
    logout,
    sendPasswordResetEmail,
    updatePassword,
    loading,
    isAuthenticated: !!user,
    isAdmin: !!user?.isAdmin,
    role: user?.role,
    refreshUser 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};