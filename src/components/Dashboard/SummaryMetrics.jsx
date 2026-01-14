import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, Target, TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const MetricCard = ({ icon: Icon, title, value, loading, format, gradient, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="h-full"
    >
      <Card className={`overflow-hidden shadow-2xl border-none relative h-full rounded-[2.5rem] ${gradient}`}>
        <div className="absolute inset-0 bg-white/5 opacity-50" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <Icon className="absolute -right-6 -bottom-6 w-40 h-40 text-white opacity-10 rotate-12 pointer-events-none" />
        
        <CardContent className="p-10 relative z-10">
          <div className="flex items-center justify-between mb-8">
             <div className="p-4 bg-white/20 backdrop-blur-xl rounded-[1.5rem] text-white shadow-lg border border-white/20">
                <Icon className="w-8 h-8" />
             </div>
             <Sparkles className="text-white/30 w-5 h-5 animate-pulse" />
          </div>
          
          <div className="space-y-2">
             <p className="text-white/70 text-xs font-black uppercase tracking-[0.2em]">{title}</p>
             <div className="flex items-baseline gap-2">
                {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                ) : (
                    <h3 className="text-5xl font-black font-poppins text-white tracking-tighter leading-none">
                        {format ? format(value) : value}
                    </h3>
                )}
             </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const SummaryMetrics = ({ metrics, loading }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
         <div className="w-2 h-8 bg-brand-gold rounded-full" />
         <h2 className="text-2xl font-black font-poppins text-brand-dark tracking-tight">Estado de Misión</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <MetricCard
          icon={DollarSign}
          title="Inversión Social"
          value={metrics.total_donado}
          loading={loading}
          format={(val) => `$${(val || 0).toLocaleString('es-AR')}`}
          gradient="bg-gradient-to-br from-brand-primary to-[#1E3A8A]"
          delay={0.1}
        />
        <MetricCard
          icon={Target}
          title="Impactos Directos"
          value={metrics.total_suscripciones_activas}
          loading={loading}
          format={(val) => val || '0'}
          gradient="bg-gradient-to-br from-brand-action to-[#991B1B]"
          delay={0.2}
        />
      </div>
    </div>
  );
};

export default SummaryMetrics;