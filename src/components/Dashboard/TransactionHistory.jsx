import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  History, ShieldCheck, CreditCard, 
  CheckCircle2, Clock, Info, ArrowDownRight,
  ExternalLink, Gem, Heart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TransactionHistory = ({ donations = [], memberships = [], loading = false }) => {
  
  // Consolidamos y ordenamos todas las transacciones por fecha
  const allTransactions = useMemo(() => {
    const combined = [
      ...donations.map(d => ({ ...d, type: 'donation' })),
      ...memberships.map(m => ({ ...m, type: 'membership' }))
    ];
    return combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [donations, memberships]);

  const formatDate = (dateString) => {
    if (!dateString) return '---';
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12"
    >
      <Card className="border-none shadow-[0_30px_100px_rgba(0,0,0,0.06)] rounded-[3rem] bg-white overflow-hidden border border-gray-50">
        <CardHeader className="p-8 md:p-12 bg-brand-dark text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -mr-20 -mt-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-brand-gold">
                <ShieldCheck size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Protocolo de Transparencia</span>
              </div>
              <CardTitle className="text-3xl font-black font-poppins tracking-tighter uppercase">
                Historial de Impacto
              </CardTitle>
              <p className="text-gray-400 text-sm font-light italic">
                Registro auditado de tus aportes únicos y membresías activas.
              </p>
            </div>
            <div className="flex -space-x-2">
               <div className="h-14 w-14 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <History className="text-brand-gold w-6 h-6" />
               </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                  <th className="px-10 py-6">Operación</th>
                  <th className="px-10 py-6">Identificador</th>
                  <th className="px-10 py-6">Monto</th>
                  <th className="px-10 py-6 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="4" className="px-10 py-10 bg-gray-50/20"></td>
                    </tr>
                  ))
                ) : allTransactions.length > 0 ? (
                  allTransactions.map((item) => (
                    <tr key={item.id} className="group hover:bg-brand-sand/5 transition-all duration-300">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${item.type === 'donation' ? 'bg-blue-50 text-blue-600' : 'bg-brand-gold/10 text-brand-gold'}`}>
                                {item.type === 'donation' ? <Heart size={16}/> : <Gem size={16}/>}
                            </div>
                            <div>
                                <p className="text-sm font-black text-brand-dark uppercase tracking-tight">
                                    {item.type === 'donation' ? 'Donación Única' : 'Aporte Mensual'}
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium tracking-wide">
                                    {formatDate(item.created_at)}
                                </p>
                            </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-col gap-1">
                            <code className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 w-fit">
                                {item.payment_id || item.preapproval_id || 'PROCESANDO'}
                            </code>
                            <span className="text-[9px] text-gray-300 uppercase font-bold tracking-tighter">Mercado Pago Ref.</span>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-1">
                            <span className="text-xl font-black font-poppins text-brand-dark">
                                ${Number(item.amount).toLocaleString('es-AR')}
                            </span>
                            <ArrowDownRight size={14} className="text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex justify-end">
                          {item.status === 'approved' || item.status === 'active' ? (
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 text-green-600 border border-green-100 shadow-sm transition-transform group-hover:scale-105">
                              <CheckCircle2 size={12} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Validado</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 shadow-sm italic">
                              <Clock size={12} className="animate-spin-slow" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{item.status}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-10 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-6 bg-gray-50 rounded-full border-2 border-dashed border-gray-200">
                            <CreditCard className="text-gray-200 w-12 h-12" />
                        </div>
                        <p className="text-gray-400 font-bold italic text-sm tracking-tight">Tu legado está esperando su primera huella.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-start gap-4">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 text-brand-primary">
                <ExternalLink size={16} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-brand-dark font-black uppercase tracking-widest leading-none">Verificación Externa</p>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic">
                  Todos los cobros son procesados por Mercado Pago. Puedes verificar cada identificador en tu cuenta personal de la pasarela de pagos para mayor seguridad.
                </p>
              </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TransactionHistory;