import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Gift, CheckCircle2, AlertCircle, Loader2, UserX, 
  Search, Landmark, Calendar, DollarSign, Fingerprint 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const DonationList = () => {
  const [donations, setDonations] = useState([]);
  const [filteredDonations, setFilteredDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchDonations = useCallback(async () => {
    setLoading(true);
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
      setFilteredDonations(data || []);
    } catch (error) {
      console.error('Error fetching donations:', error);
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

  useEffect(() => {
    const filtered = donations.filter(d => 
      d.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.payment_id?.includes(searchTerm) ||
      d.amount.toString().includes(searchTerm)
    );
    setFilteredDonations(filtered);
  }, [searchTerm, donations]);

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

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      <p className="text-gray-500 font-medium">Cargando registros financieros...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar por donante, monto o ID de pago..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="text-sm font-bold text-brand-dark px-4 py-2 bg-brand-sand rounded-xl border">
          Recaudación Total: <span className="text-brand-primary">
            ${donations.reduce((acc, curr) => acc + (curr.status === 'approved' ? Number(curr.amount) : 0), 0).toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-brand-dark text-white p-8">
            <div className="flex items-center gap-4">
                <div className="bg-brand-action p-3 rounded-2xl shadow-lg">
                    <Gift className="w-8 h-8 text-white" />
                </div>
                <div>
                    <CardTitle className="text-2xl font-poppins font-bold uppercase tracking-tight">Donaciones Únicas</CardTitle>
                    <CardDescription className="text-gray-300">Monitoreo de ingresos directos y aportes extraordinarios.</CardDescription>
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="p-0">
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
                {filteredDonations.length === 0 ? (
                  <tr><td colSpan="4" className="p-12 text-center text-gray-400 italic">No se registran movimientos.</td></tr>
                ) : (
                  filteredDonations.map((d, i) => {
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationList;