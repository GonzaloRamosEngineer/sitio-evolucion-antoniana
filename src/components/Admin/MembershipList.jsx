import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Heart, CheckCircle2, XCircle, Loader2,
  CreditCard, Calendar, UserCircle2, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { useSearch } from '@/components/Admin/shared/useSearch';

const MembershipList = () => {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const { toast } = useToast();
  const { query, setQuery, filtered: filteredMemberships } = useSearch(
    memberships,
    ['users.name', 'users.email', 'plan']
  );

  const fetchMemberships = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id, plan, amount, payment_method, status, created_at, preapproval_id, next_charge_date,
          users ( id, name, email )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemberships(data || []);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      setFetchError(true);
      toast({ title: "Error", description: "Error al cargar suscripciones.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMemberships();
    const channel = supabase.channel('realtime:memberships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, fetchMemberships)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchMemberships]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    const common = "px-3 py-1 rounded-full text-[10px] font-bold uppercase flex gap-1.5 items-center border-none shadow-sm";

    if (s === 'active')
      return <Badge className={`${common} bg-green-50 text-green-700`}><CheckCircle2 size={12}/> Activa</Badge>;
    if (s === 'paused')
      return <Badge className={`${common} bg-amber-50 text-amber-700`}><Loader2 size={12}/> Pausada</Badge>;
    if (s === 'cancelled')
      return <Badge className={`${common} bg-red-50 text-red-700`}><XCircle size={12}/> Cancelada</Badge>;

    return <Badge className={`${common} bg-blue-50 text-blue-700`}>{s || 'Pendiente'}</Badge>;
  };

  return (
    <div>
      <SectionHeader
        icon={Heart}
        title="Colaboraciones Recurrentes"
        description="Gestión de la red de padrinos y sostenimiento mensual."
      />

      {loading ? (
        <ListSkeleton rows={6} />
      ) : fetchError && memberships.length === 0 ? (
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-0">
            <EmptyState
              icon={AlertTriangle}
              title="Error al cargar las suscripciones"
              description="No se pudieron obtener los datos. Recargá la página o intentá nuevamente más tarde."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por padrino, email o plan..."
            count={filteredMemberships.length}
            countLabel="suscripciones"
          >
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              Activas: <span className="text-brand-primary">{memberships.filter(m => m.status === 'active').length}</span>
            </span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              MRR Est.: <span className="text-brand-action">
                ${memberships.filter(m => m.status === 'active').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString('es-AR')}
              </span>
            </span>
          </SearchBar>

          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-0">
              {filteredMemberships.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title="No hay registros de suscripción"
                  description={query ? 'Probá con otro término de búsqueda.' : 'Todavía no se registran colaboraciones recurrentes.'}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-sand border-b border-gray-100 text-brand-dark text-[10px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4">Padrino / Madrina</th>
                        <th className="px-6 py-4">Plan y Ciclo</th>
                        <th className="px-6 py-4 text-right">Aporte</th>
                        <th className="px-6 py-4 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredMemberships.map((m, i) => (
                        <motion.tr
                          key={m.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-brand-sand/20 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${m.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                  <UserCircle2 size={24}/>
                              </div>
                              <div>
                                  <p className="font-bold text-brand-dark leading-none mb-1">{m.users?.name || 'Usuario Externo'}</p>
                                  <p className="text-[10px] text-gray-400 font-mono tracking-tighter">{m.users?.email || 'Sin cuenta asociada'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-brand-dark line-clamp-1">{m.plan}</p>
                                <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                                    <span className="flex items-center gap-1"><CreditCard size={10}/> {m.payment_method}</span>
                                    <span className="flex items-center gap-1"><Calendar size={10}/> Prox: {m.next_charge_date ? formatDate(m.next_charge_date) : 'N/A'}</span>
                                </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex flex-col">
                                <span className="text-lg font-black text-brand-dark font-poppins">${Number(m.amount).toLocaleString('es-AR')}</span>
                                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">mensual</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                                {getStatusBadge(m.status)}
                            </div>
                          </td>
                        </motion.tr>
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

export default MembershipList;
