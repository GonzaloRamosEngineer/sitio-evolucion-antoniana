import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Gift, CheckCircle2, AlertCircle, Loader2, UserX,
  Landmark, Calendar, DollarSign, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { useSearch } from '@/components/Admin/shared/useSearch';

const DonationList = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const { toast } = useToast();
  const { query, setQuery, filtered: filteredDonations } = useSearch(
    donations,
    ['users.name', 'payment_id', 'amount']
  );

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          id, amount, donation_type, payment_provider, payment_id, status, created_at,
          users ( id, name, email )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error('Error fetching donations:', error);
      setFetchError(true);
      toast({ title: "Error", description: "No se pudieron cargar las donaciones.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDonations();
    const channel = supabase.channel('realtime:donations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, fetchDonations)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchDonations]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusConfig = (status) => {
    const s = status?.toLowerCase() || '';
    if (['completed', 'approved', 'succeeded'].includes(s))
      return { label: 'Aprobado', bg: 'bg-green-50 text-green-700 border-green-100', icon: CheckCircle2 };
    if (['pending'].includes(s))
      return { label: 'Pendiente', bg: 'bg-amber-50 text-amber-700 border-amber-100', icon: Loader2 };
    return { label: 'Fallido', bg: 'bg-red-50 text-red-700 border-red-100', icon: AlertCircle };
  };

  return (
    <div>
      <SectionHeader
        icon={Gift}
        title="Donaciones Únicas"
        description="Monitoreo de ingresos directos y aportes extraordinarios."
      />

      {loading ? (
        <ListSkeleton rows={6} />
      ) : fetchError && donations.length === 0 ? (
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-0">
            <EmptyState
              icon={AlertTriangle}
              title="Error al cargar las donaciones"
              description="No se pudieron obtener los registros. Recargá la página o intentá nuevamente más tarde."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por donante, monto o ID de pago..."
            count={filteredDonations.length}
            countLabel="donaciones"
          >
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              Recaudación: <span className="text-brand-primary">
                ${donations.reduce((acc, curr) => acc + (curr.status === 'approved' ? Number(curr.amount) : 0), 0).toLocaleString('es-AR')}
              </span>
            </span>
          </SearchBar>

          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-0">
              {filteredDonations.length === 0 ? (
                <EmptyState
                  icon={Gift}
                  title="No se registran movimientos"
                  description={query ? 'Probá con otro término de búsqueda.' : 'Todavía no hay donaciones registradas.'}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-sand border-b border-gray-100 text-brand-dark text-[10px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4">Donante</th>
                        <th className="px-6 py-4">Información de Pago</th>
                        <th className="px-6 py-4 text-right">Monto</th>
                        <th className="px-6 py-4 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredDonations.map((d, i) => {
                        const status = getStatusConfig(d.status);
                        return (
                          <motion.tr
                            key={d.id}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-brand-sand/20 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${d.users ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                                    {d.users ? <DollarSign size={18}/> : <UserX size={18}/>}
                                </div>
                                <div>
                                    <p className="font-bold text-brand-dark">{d.users?.name || 'Donante Anónimo'}</p>
                                    <p className="text-[10px] text-gray-400 font-mono tracking-tighter">{d.users?.email || 'Aporte directo sin cuenta'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Landmark size={12} className="text-brand-gold"/>
                                        <span className="capitalize">{d.payment_provider}</span>
                                        {d.payment_id && <span className="text-[10px] bg-gray-100 px-1.5 rounded font-mono">ID: {d.payment_id}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                                        <Calendar size={10}/> {formatDate(d.created_at)}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <span className="text-xl font-black text-brand-dark font-poppins">${Number(d.amount).toLocaleString('es-AR')}</span>
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex justify-center">
                                <Badge className={`${status.bg} border px-3 py-1 rounded-full text-[10px] font-bold uppercase flex gap-1.5 items-center shadow-none`}>
                                    <status.icon size={12} className={d.status === 'pending' ? 'animate-spin' : ''}/>
                                    {status.label}
                                </Badge>
                               </div>
                            </td>
                          </motion.tr>
                        );
                      })}
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

export default DonationList;
