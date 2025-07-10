import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { UserCheck, UserX, ShieldCheck, ShieldAlert } from 'lucide-react';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
    
    const channel = supabase.channel('realtime:public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return <p>Cargando usuarios...</p>;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
        <CardDescription>Lista de todos los usuarios registrados</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p>No hay usuarios registrados aún.</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1 mb-3 sm:mb-0">
                  <h3 className="font-semibold text-lg">{user.name || 'Nombre no disponible'}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500">
                    Registrado: {formatDate(user.created_at)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Teléfono: {user.phone || 'No provisto'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0">
                  <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="flex items-center">
                    {user.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5 mr-1" /> : <UserCheck className="w-3.5 h-3.5 mr-1" />}
                    {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </Badge>
                  <Badge variant={user.is_verified ? 'default' : 'outline'} className="flex items-center">
                     {user.is_verified ? <UserCheck className="w-3.5 h-3.5 mr-1" /> : <UserX className="w-3.5 h-3.5 mr-1" />}
                    {user.is_verified ? 'Verificado' : 'Pendiente'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserList;