import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit3, ShieldCheck, Star, Crown, Mail, Fingerprint, Calendar, Clock, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import EditProfileModal from './EditProfileModal';
import { useMiAcceso, useMiAntiguedad } from '@/hooks/useContentQueries';
import {
  SIN_ACCESO, estadoAcceso, etiquetaEstado, nombreOrigen, formatearMeses, formatearFecha,
} from '@/lib/acceso';

/*
  QUÉ CAMBIÓ ACÁ Y POR QUÉ (§10.23, 2026-09-02)
  ---------------------------------------------------------------------
  Esta cabecera INVENTABA la condición del socio. Tenía su propia
  consulta a `memberships` y de ahí derivaba una taxonomía que no existe
  en ninguna parte del sistema:

      activeMembership ? 'MEMBRESÍA ACTIVA' : 'SOCIO NIVEL BASE'
      Rango: activeMembership ? 'Padrino' : 'Miembro'
      Socio desde: new Date(user.created_at).getFullYear()   // ¡la CUENTA!

  Tres problemas, y el tercero era un bug:

  1. **No hay tabla `socios` ni `categorias_socio`** (§10.1.a sigue
     abierto). «NIVEL BASE» y «RANGO: PADRINO» prometían una jerarquía
     que el sistema no tiene y que nadie podía subir de nivel.

  2. **«Socio desde» era el año de creación de la CUENTA**, no del primer
     aporte, con un `'2025'` hardcodeado de fallback. Por eso el mismo
     día esta pantalla decía «SOCIO DESDE 2025» y `/carnet` decía «parte
     de la comunidad desde el 2 de septiembre de 2026»: dos fuentes de
     verdad para la misma pregunta, como `/beneficios` y `/club`.

  3. **`.eq('status','active').maybeSingle()`** revienta con más de una
     fila, y desde que se permite una membresía viva POR DESTINO eso es
     alcanzable. El error se tragaba en un `logger.error` y la pantalla
     le decía «SOCIO NIVEL BASE» a alguien con dos suscripciones activas:
     el `else` que adivina, otra vez (`estadosPago.js`).

  AHORA: la condición sale de `mi_acceso()` / `mi_antiguedad()`, la misma
  capa que usa `/carnet` (§10). El dashboard **pregunta y punto** — es la
  regla 1 de §12.7 aplicada acá.

  ⚠️ Y la consulta a `memberships` NO se reemplazó por otra: se BORRÓ.
  `Dashboard.jsx` ya las carga con `useUserMemberships` para las tarjetas
  de suscripción, así que esta cabecera las recibe por prop. Había dos
  consultas de lo mismo, y solo una tenía el bug.
*/
const DashboardHeader = ({ user, onUpdateSuccess, memberships = [] }) => {
  const { data: acceso = SIN_ACCESO } = useMiAcceso(user?.id);
  const { data: antiguedad } = useMiAntiguedad(user?.id);

  const estado = estadoAcceso(acceso);
  const esSocio = Boolean(acceso?.tiene_acceso);

  /*
    Una suscripción cobrándose todavía NO es acceso, y tampoco es "no
    aportaste nunca". Es el estado que vio el dueño del proyecto al
    suscribirse: entre que MercadoPago crea el `preapproval` y que avisa
    del primer cobro pasan un par de minutos, y en esa ventana la
    pantalla le ofrecía «ACTIVAR MEMBRESÍA» a alguien que acababa de
    suscribirse. Sin este caso, el CTA miente en el peor momento.
  */
  const suscripcionEnCurso = (memberships ?? []).some((m) =>
    ['pending', 'active'].includes(m?.status));

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
              <div className={`absolute -inset-1.5 rounded-full opacity-70 blur-md transition duration-1000 ${esSocio ? 'bg-brand-gold animate-pulse' : 'bg-blue-400'}`} />
              
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white/10 shadow-2xl relative z-10">
                <AvatarImage src={user?.avatar_url || '/img/default-avatar.png'} className="object-cover" />
                <AvatarFallback className="bg-brand-sand text-brand-primary text-4xl font-bold">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>

              {esSocio && (
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
                  {/*
                    El badge dice el ESTADO del aporte, que es lo único
                    que el sistema sabe de verdad. «En tolerancia» tiene
                    su propio tono a propósito: quien está en los 30 días
                    de gracia sigue teniendo acceso, pero le conviene
                    enterarse (§10.17).
                  */}
                  <Badge
                    className={`py-1 px-4 text-[10px] font-black tracking-[0.2em] border-none shadow-lg uppercase ${
                      estado === 'vigente' ? 'bg-brand-gold text-brand-dark'
                      : estado === 'gracia' ? 'bg-amber-300 text-brand-dark'
                      : estado === 'vencido' ? 'bg-red-400/90 text-white'
                      : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {etiquetaEstado(acceso)}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-center lg:justify-start gap-2 text-brand-sand/80 font-mono text-sm tracking-wider">
                   <Mail className="w-4 h-4" /> {user?.email}
                </div>
              </div>

              {/* GRILLA DE DATOS DEL SOCIO */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center justify-center lg:justify-start gap-1.5">
                    <Fingerprint className="w-3 h-3" /> Documento
                  </p>
                  <p className="text-white font-bold text-lg">{user?.dni || '---'}</p>
                </div>
                
                {/*
                  Era «Rango: Padrino/Miembro», una jerarquía inventada.
                  Ahora dice de dónde viene el acceso, que es un dato real
                  de `aportes.origen` y el mismo que muestra el carnet.
                */}
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center justify-center lg:justify-start gap-1.5">
                    <ShieldCheck className="w-3 h-3" /> Origen del aporte
                  </p>
                  <p className="text-brand-gold font-bold text-lg tracking-tight">
                    {nombreOrigen(acceso?.origen) ?? '---'}
                  </p>
                </div>

                {/*
                  `socio_desde` sale del PRIMER APORTE, no de la fecha de
                  alta de la cuenta. Son cosas distintas y la diferencia se
                  nota: hay 23 cuentas y 6 aportes.
                */}
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center justify-center lg:justify-start gap-1.5">
                    <Calendar className="w-3 h-3" /> Aportando desde
                  </p>
                  <p className="text-white font-bold text-lg">
                    {formatearFecha(antiguedad?.socio_desde) ?? '---'}
                  </p>
                </div>

                <div className="col-span-2 md:col-span-1 space-y-1">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center justify-center lg:justify-start gap-1.5">
                    <Clock className="w-3 h-3" /> Tiempo aportado
                  </p>
                  <p className="text-white font-bold text-lg">
                    {antiguedad?.socio_desde ? formatearMeses(antiguedad.meses_aportados) : '---'}
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

              {/*
                TRES estados, no dos. El botón anterior era
                `!activeMembership && "ACTIVAR MEMBRESÍA"`, así que le
                pedía suscribirse a quien acababa de suscribirse y a quien
                aporta por donación.

                Y con acceso el destino es `/carnet`: la credencial existe
                y no se llegaba a ella desde acá — la misma familia de
                §12.10.20, piezas que funcionan sin estar conectadas.
              */}
              {esSocio ? (
                <Button
                  className="bg-brand-primary hover:bg-brand-dark text-white font-black rounded-2xl h-14 px-8 shadow-xl shadow-brand-primary/20 transition-all border-none"
                  asChild
                >
                  <Link to="/carnet">
                    <IdCard className="w-4 h-4 mr-2" />
                    VER MI CARNET
                  </Link>
                </Button>
              ) : suscripcionEnCurso ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center lg:text-left backdrop-blur-md">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-gold mb-1">
                    Suscripción en curso
                  </p>
                  <p className="text-sm text-white/70 leading-snug">
                    Tu acceso se habilita en cuanto se acredite el primer cobro.
                  </p>
                </div>
              ) : (
                <Button
                  className="bg-brand-primary hover:bg-brand-dark text-white font-black rounded-2xl h-14 px-8 shadow-xl shadow-brand-primary/20 transition-all border-none"
                  asChild
                >
                  <Link to="/collaborate">
                    <Star className="w-4 h-4 mr-2 fill-brand-gold text-brand-gold" />
                    ACTIVAR MEMBRESÍA
                  </Link>
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