import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Edit3, ShieldCheck, Star, Crown, Loader2, User as UserIcon, Mail, Fingerprint, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import EditProfileModal from './EditProfileModal';

const DashboardHeader = ({ user, onUpdateSuccess }) => {
  const [activeMembership, setActiveMembership] = useState(null);
  const [loadingMember, setLoadingMember] = useState(true);

  // Lógica para verificar membresía activa
  useEffect(() => {
    const fetchMembership = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('memberships')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!error && data) {
          setActiveMembership(data);
        }
      } catch (err) {
        console.error("Error validando membresía:", err);
      } finally {
        setLoadingMember(false);
      }
    };

    fetchMembership();
  }, [user?.id]);

  const getInitials = (name) => {
    if (!name && user?.email) return user.email[0].toUpperCase();
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) return names[0][0]?.toUpperCase();
    return (names[0][0] + names[names.length - 1][0])?.toUpperCase();
  };

  return (
    <div className="w-full mb-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-brand-dark shadow-2xl border border-white/5"
      >
        {/* Capas de diseño de fondo (Efecto Lujo) */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-transparent to-brand-gold/10" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-brand-gold/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 p-6 md:p-10">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            
            {/* FOTO DE PERFIL / AVATAR CON AURA */}
            <div className="relative group">
              <div className={`absolute -inset-1.5 rounded-full opacity-70 blur-md transition duration-1000 ${activeMembership ? 'bg-brand-gold animate-pulse' : 'bg-blue-400'}`} />
              
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white/10 shadow-2xl relative z-10">
                <AvatarImage src={user?.avatar_url || '/img/default-avatar.png'} className="object-cover" />
                <AvatarFallback className="bg-brand-sand text-brand-primary text-4xl font-bold">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>

              {activeMembership && (
                <div className="absolute -bottom-2 -right-2 bg-brand-gold p-2.5 rounded-full shadow-lg border-4 border-brand-dark z-20">
                  <Crown className="w-6 h-6 text-brand-dark" />
                </div>
              )}
            </div>

            {/* INFORMACIÓN DEL CARNET */}
            <div className="flex-1 text-center lg:text-left space-y-6">
              <div>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-3">
                  <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase font-poppins">
                    {user?.name || user?.email?.split('@')[0] || 'Usuario'}
                  </h2>
                  <Badge className={`py-1 px-4 text-[10px] font-black tracking-[0.2em] border-none shadow-lg ${activeMembership ? "bg-brand-gold text-brand-dark" : "bg-white/10 text-white/60"}`}>
                    {activeMembership ? 'MEMBRESÍA ACTIVA' : 'SOCIO NIVEL BASE'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-center lg:justify-start gap-2 text-brand-sand/80 font-mono text-sm tracking-wider">
                   <Mail className="w-4 h-4" /> {user?.email}
                </div>
              </div>

              {/* GRILLA DE DATOS DEL SOCIO */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 py-6 border-y border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center justify-center lg:justify-start gap-1.5">
                    <Fingerprint className="w-3 h-3" /> Documento
                  </p>
                  <p className="text-white font-bold text-lg">{user?.dni || '---'}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center justify-center lg:justify-start gap-1.5">
                    <ShieldCheck className="w-3 h-3" /> Rango
                  </p>
                  <p className="text-brand-gold font-bold text-lg uppercase tracking-tighter">
                    {user?.role === 'admin' ? 'Administrador' : (activeMembership ? 'Padrino' : 'Miembro')}
                  </p>
                </div>

                <div className="col-span-2 md:col-span-1 space-y-1">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center justify-center lg:justify-start gap-1.5">
                    <Calendar className="w-3 h-3" /> Socio desde
                  </p>
                  <p className="text-white font-bold text-lg">
                    {user?.created_at ? new Date(user.created_at).getFullYear() : '2025'}
                  </p>
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex flex-col gap-4 w-full lg:w-auto">
              <EditProfileModal user={user} onUpdateSuccess={onUpdateSuccess}>
                <Button 
                  variant="outline" 
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-2xl h-14 px-8 font-bold transition-all backdrop-blur-md"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>
              </EditProfileModal>

              {!activeMembership && (
                <Button 
                  className="bg-brand-primary hover:bg-brand-dark text-white font-black rounded-2xl h-14 px-8 shadow-xl shadow-brand-primary/20 transition-all border-none"
                  asChild
                >
                  <a href="/collaborate">
                    <Star className="w-4 h-4 mr-2 fill-brand-gold text-brand-gold" />
                    ACTIVAR MEMBRESÍA
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Marca de agua sutil del logo */}
          <div className="absolute top-6 right-8 opacity-[0.03] pointer-events-none hidden md:block">
             <img src="/img/logo-fundacion.png" alt="" className="w-40 grayscale brightness-200" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardHeader;