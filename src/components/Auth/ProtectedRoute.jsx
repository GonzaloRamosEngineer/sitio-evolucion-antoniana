import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const ProtectedRoute = ({ children, requireAdmin = false, allowedRoles = null }) => {
  const { isAuthenticated, isAdmin, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blanco-fundacion">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-antoniano"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    // Si requiere admin y no lo es, redirigir a dashboard o a una página de "acceso denegado"
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  // Restricción por roles permitidos (ej: ["admin", "educacion_manager"]).
  // Los admin siempre pasan. OJO: esto es solo una barrera de UI;
  // la seguridad real debe estar en las políticas RLS de Supabase.
  if (allowedRoles && !isAdmin && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;