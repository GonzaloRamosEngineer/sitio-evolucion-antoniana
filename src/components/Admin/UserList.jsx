// src/components/Admin/UserList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  UserCheck,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  Fingerprint,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { useSearch } from '@/components/Admin/shared/useSearch';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const { toast } = useToast();
  const { query, setQuery, filtered: filteredUsers } = useSearch(users, ['name', 'email', 'dni']);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setFetchError(true);
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

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div>
      <SectionHeader
        icon={Users}
        title="Usuarios"
        description="Base de datos central de miembros, administradores y voluntarios."
      />

      {loading ? (
        <ListSkeleton rows={6} />
      ) : fetchError && users.length === 0 ? (
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-0">
            <EmptyState
              icon={AlertTriangle}
              title="Error al cargar los usuarios"
              description="No se pudieron obtener los datos. Recargá la página o intentá nuevamente más tarde."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre, email o DNI..."
            count={filteredUsers.length}
            countLabel="usuarios"
          />

          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No se encontraron usuarios"
                  description={query ? 'Probá con otro término de búsqueda.' : 'Todavía no hay usuarios registrados.'}
                />
              ) : (
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
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-brand-sand/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                <AvatarFallback className="bg-brand-primary text-white text-xs font-bold">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-brand-dark">{u.name || 'Sin Nombre'}</p>
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
                                {u.is_verified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                <span>{u.is_verified ? 'Verificado' : 'Pendiente'}</span>
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default UserList;
