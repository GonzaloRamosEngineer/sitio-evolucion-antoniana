import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Heart, CheckCircle2, XCircle, Loader2, UserX, 
  Search, CreditCard, Calendar, Repeat, UserCircle2 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const MembershipList = () => {
  const [memberships, setMemberships] = useState([]);
  const [filteredMemberships, setFilteredMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchMemberships = useCallback(async () => {
    setLoading(true);
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
      setFilteredMemberships(data || []);
    } catch (error) {
      console.error('Error fetching memberships:', error);
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

  useEffect(() => {
    const filtered = memberships.filter(m => 
      m.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.plan?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMemberships(filtered);
  }, [searchTerm, memberships]);

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

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      <p className="text-gray-500 font-medium">Conciliando suscripciones mensuales...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar por padrino, email o plan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="flex gap-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 border-r">
                Suscripciones: <span className="text-brand-primary">{memberships.filter(m => m.status === 'active').length} activas</span>
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                MRR Est.: <span className="text-brand-action">
                    ${memberships.filter(m => m.status === 'active').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString('es-AR')}
                </span>
            </div>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-brand-primary text-white p-8 relative overflow-hidden">
            {/* Decoración */}
            <Repeat className="absolute -right-10 -bottom-10 w-48 h-48 text-white/10 rotate-12" />
            
            <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white p-3 rounded-2xl shadow-lg">
                    <Heart className="w-8 h-8 text-brand-action" />
                </div>
                <div>
                    <CardTitle className="text-2xl font-poppins font-bold uppercase tracking-tight">Colaboraciones Recurrentes</CardTitle>
                    <CardDescription className="text-blue-100">Gestión de la red de padrinos y sostenimiento mensual.</CardDescription>
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="p-0">
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
                {filteredMemberships.length === 0 ? (
                  <tr><td colSpan="4" className="p-12 text-center text-gray-400 italic">No hay registros de suscripción.</td></tr>
                ) : (
                  filteredMemberships.map((m, i) => (
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

export default MembershipList;