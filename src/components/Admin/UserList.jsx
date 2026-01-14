// src/components/Admin/UserList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { 
  UserCheck, UserX, ShieldCheck, Mail, Phone, Calendar, 
  Search, Filter, Loader2, Fingerprint 
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
      setFilteredUsers(data || []);
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

  // Buscador local
  useEffect(() => {
    const filtered = users.filter(u => 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.dni?.includes(searchTerm)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      <p className="text-sm text-gray-500 font-medium">Sincronizando usuarios...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Barra de Herramientas del Listado */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar por nombre, email o DNI..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl"
          />
        </div>
        <div className="flex gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
           Total: <span className="text-brand-primary">{filteredUsers.length} usuarios</span>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
        <CardHeader className="bg-brand-dark text-white p-8">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-2xl">
                <Users className="w-8 h-8 text-brand-gold" />
            </div>
            <div>
                <CardTitle className="text-2xl font-poppins font-bold">Gestión de Usuarios</CardTitle>
                <CardDescription className="text-gray-300">
                  Base de datos central de miembros, administradores y voluntarios.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-sand border-b border-gray-100 text-brand-dark text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4 hidden md:table-cell">Documento/Nac.</th>
                  <th className="px-6 py-4">Estado / Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">
                      No se encontraron usuarios con esos criterios.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-brand-sand/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-gray-100">
                            <AvatarFallback className="bg-brand-primary text-white text-xs font-bold">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                              {u.name || 'Sin Nombre'}
                            </p>
                            <p className="text-xs text-gray-400">Desde {formatDate(u.created_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center text-sm text-gray-600 gap-2">
                             <Mail className="w-3.5 h-3.5 text-brand-gold" /> {u.email}
                          </div>
                          {u.phone && (
                            <div className="flex items-center text-xs text-gray-500 gap-2">
                               <Phone className="w-3.5 h-3.5 text-brand-gold" /> {u.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          {u.dni && (
                            <div className="flex items-center text-xs text-gray-600 gap-2">
                               <Fingerprint className="w-3.5 h-3.5 text-gray-400" /> {u.dni}
                            </div>
                          )}
                          {u.birth_date && (
                            <div className="flex items-center text-xs text-gray-600 gap-2">
                               <Calendar className="w-3.5 h-3.5 text-gray-400" /> {formatDate(u.birth_date)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Badge 
                            variant={u.role === 'admin' ? 'destructive' : 'secondary'} 
                            className={`flex items-center justify-center gap-1.5 px-2 py-1 border-none shadow-sm ${u.role !== 'admin' && 'bg-blue-50 text-blue-700'}`}
                          >
                            {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            <span className="capitalize">{u.role === 'admin' ? 'Admin' : 'Miembro'}</span>
                          </Badge>
                          
                          <Badge 
                            variant="outline" 
                            className={`flex items-center justify-center gap-1.5 px-2 py-1 ${u.is_verified ? 'border-green-200 text-green-700 bg-green-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}
                          >
                            {u.is_verified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span>{u.is_verified ? 'Verificado' : 'Pendiente'}</span>
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserList;