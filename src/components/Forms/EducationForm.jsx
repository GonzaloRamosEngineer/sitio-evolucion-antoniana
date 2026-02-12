import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Send, ShieldCheck, GraduationCap, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createPreinscription } from '@/api/educationApi';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const educationSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  full_name: z.string().min(5, "Ingresa nombre y apellido completo"),
  dni: z.string().min(7, "DNI debe tener al menos 7 dígitos"),
  age: z.string().refine((val) => !isNaN(val) && parseInt(val) >= 14, "Debes ser mayor de 14 años"),
  last_year_completed: z.string().min(1, "Selecciona tu último nivel cursado"),
  phone: z.string().min(8, "Ingresa un teléfono o WhatsApp válido").max(20, "Número demasiado largo"),
  location: z.string().min(1, "Selecciona tu localidad"),
  location_custom: z.string().optional(), 
  level_to_start: z.string().min(1, "Selecciona el nivel que deseas iniciar"),
  interest_area: z.string().optional(),
  interest_custom: z.string().optional(), 
  relationship_club: z.string().min(1, "Indica tu vínculo con la institución"),
  preferred_modality: z.string().min(1, "Selecciona una modalidad de cursado"),
  preferred_schedule: z.string().optional(),
  message: z.string().optional(),
});

const EducationForm = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      last_year_completed: "", location: "", level_to_start: "",
      relationship_club: "", preferred_modality: "", preferred_schedule: "", interest_area: ""
    }
  });

  const selectedLocation = watch("location");
  const selectedInterest = watch("interest_area");

  const onFormSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // 🧠 LÓGICA DE NORMALIZACIÓN DE TELÉFONO PARA WHATSAPP (Mantenida)
      let cleanPhone = data.phone.replace(/\D/g, ''); 
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      if (!cleanPhone.startsWith('54')) cleanPhone = `549${cleanPhone}`;
      else if (cleanPhone.startsWith('54') && !cleanPhone.startsWith('549')) cleanPhone = `549${cleanPhone.substring(2)}`;

      const payload = {
        ...data,
        age: parseInt(data.age),
        phone: cleanPhone,
        location: data.location === 'otro' ? data.location_custom : data.location,
        interest_area: data.interest_area === 'otro' ? data.interest_custom : data.interest_area,
      };

      delete payload.location_custom;
      delete payload.interest_custom;

      await createPreinscription(payload);
      toast({ title: "¡Formulario Recibido!", description: "Tus datos han sido registrados correctamente.", className: "bg-brand-dark text-white rounded-2xl" });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({ title: "Error al enviar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✨ ESTILO MINIMALISTA: Gris clarito de fondo, letras en azul de la fundación
  const inputBaseStyle = "rounded-xl border-gray-100 bg-gray-50/50 text-brand-dark placeholder:text-gray-400 focus:bg-white focus:ring-brand-primary/20 transition-all h-12";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-10">
      
      {/* SECCIÓN 1: IDENTIDAD */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Users size={16} className="text-brand-primary" />
            <Label className="text-brand-primary font-black uppercase text-[10px] tracking-[0.2em]">Datos del Aspirante</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Nombre Completo *</Label>
            <Input placeholder="Ej: Juan Pérez" {...register('full_name')} className={inputBaseStyle} />
            {errors.full_name && <p className="text-red-500 text-[9px] font-bold ml-1">{errors.full_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">DNI *</Label>
                <Input placeholder="Sin puntos" {...register('dni')} className={inputBaseStyle} />
                {errors.dni && <p className="text-red-500 text-[9px] font-bold ml-1">{errors.dni.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Edad *</Label>
                <Input placeholder="Años" {...register('age')} className={inputBaseStyle} />
                {errors.age && <p className="text-red-500 text-[9px] font-bold ml-1">{errors.age.message}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Email *</Label>
            <Input placeholder="correo@ejemplo.com" {...register('email')} className={inputBaseStyle} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">WhatsApp *</Label>
            <Input placeholder="387..." {...register('phone')} className={inputBaseStyle} />
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: ACADÉMICA */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <GraduationCap size={16} className="text-brand-primary" />
            <Label className="text-brand-primary font-black uppercase text-[10px] tracking-[0.2em]">Situación Académica</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Último año cursado *</Label>
              <Select onValueChange={(val) => setValue('last_year_completed', val)}>
                <SelectTrigger className={inputBaseStyle}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin-ingreso">Sin Ingreso a Secundaria</SelectItem>
                  <SelectItem value="egb3">7mo / 8vo / 9no (EGB 3)</SelectItem>
                  <SelectItem value="1-2-polimodal">1ro / 2do Año (Polimodal)</SelectItem>
                  <SelectItem value="secundaria-incompleta">Secundaria Incompleta</SelectItem>
                </SelectContent>
              </Select>
          </div>

          <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Nivel a iniciar *</Label>
              <Select onValueChange={(val) => setValue('level_to_start', val)}>
                <SelectTrigger className={inputBaseStyle}><SelectValue placeholder="Elegir nivel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primaria">Primaria</SelectItem>
                  <SelectItem value="secundaria">Secundaria</SelectItem>
                  <SelectItem value="asesoramiento">Asesoramiento</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </div>

        <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Orientación</Label>
            <Select onValueChange={(val) => setValue('interest_area', val)}>
                <SelectTrigger className={inputBaseStyle}><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="economia">Economía</SelectItem>
                  <SelectItem value="humanidades">Humanidades</SelectItem>
                  <SelectItem value="informatica">Informática</SelectItem>
                  <SelectItem value="otro">Otro (especificar)</SelectItem>
                </SelectContent>
            </Select>

            <AnimatePresence>
              {selectedInterest === 'otro' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Input placeholder="Escribí aquí la orientación..." {...register('interest_custom')} className={inputBaseStyle + " border-brand-primary/20 bg-white"} />
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>

      {/* SECCIÓN 3: CONTEXTO */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <MapPin size={16} className="text-brand-primary" />
            <Label className="text-brand-primary font-black uppercase text-[10px] tracking-[0.2em]">Contexto</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Localidad *</Label>
            <Select onValueChange={(val) => setValue('location', val)}>
              <SelectTrigger className={inputBaseStyle}><SelectValue placeholder="¿Dónde vivís?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="salta-capital">Salta Capital</SelectItem>
                <SelectItem value="valles">Valles Lerma</SelectItem>
                <SelectItem value="otro">Otro (especificar)</SelectItem>
              </SelectContent>
            </Select>

            <AnimatePresence>
              {selectedLocation === 'otro' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Input placeholder="Especificá tu localidad..." {...register('location_custom')} className={inputBaseStyle + " border-brand-primary/20 bg-white"} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Vínculo con el Club *</Label>
            <Select onValueChange={(val) => setValue('relationship_club', val)}>
              <SelectTrigger className={inputBaseStyle}><SelectValue placeholder="Tu relación" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="socio">Socio/a</SelectItem>
                <SelectItem value="hincha">Hincha</SelectItem>
                <SelectItem value="vecino">Vecino/a</SelectItem>
                <SelectItem value="ninguno">Ninguno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Modalidad *</Label>
            <Select onValueChange={(val) => setValue('preferred_modality', val)}>
              <SelectTrigger className={inputBaseStyle}><SelectValue placeholder="Elegir modalidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Horario</Label>
            <Select onValueChange={(val) => setValue('preferred_schedule', val)}>
              <SelectTrigger className={inputBaseStyle}><SelectValue placeholder="Turno" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mañana">Mañana</SelectItem>
                <SelectItem value="tarde">Tarde</SelectItem>
                <SelectItem value="noche">Noche</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Mensaje adicional</Label>
        <Textarea 
          placeholder="Escribí aquí..." 
          {...register('message')} 
          className="rounded-xl border-gray-100 bg-gray-50/50 text-brand-dark min-h-[100px] focus:bg-white focus:ring-brand-primary/20 transition-all" 
        />
      </div>

      {/* LEYENDA LINDA DE OTRAS ACTIVIDADES */}
      <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-primary text-white p-2 rounded-lg">
             <Users size={18} />
          </div>
          <div>
            <p className="text-[11px] font-black text-brand-dark uppercase leading-none">¿Querés sumarte a más?</p>
            <p className="text-[10px] text-gray-500 italic">Conocé todos los talleres y proyectos vigentes.</p>
          </div>
        </div>
        <a 
          href="https://www.evolucionantoniana.com/activities" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-white text-brand-primary text-[10px] font-bold px-4 py-2 rounded-full shadow-sm hover:bg-brand-primary hover:text-white transition-all uppercase"
        >
          Ver Actividades
        </a>
      </div>

      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full h-16 bg-brand-primary hover:bg-brand-dark text-white font-black rounded-2xl shadow-xl shadow-brand-primary/20 text-lg transition-all active:scale-95"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin h-5 w-5" />
            <span>PROCESANDO...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Send size={20} />
            <span>ENVIAR PREINSCRIPCIÓN</span>
          </div>
        )}
      </Button>

      <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest justify-center pt-4 border-t border-gray-50">
        <ShieldCheck size={14} className="text-brand-gold" />
        Sistema de Registro Seguro - Fundación Evolución Antoniana
      </div>
    </form>
  );
};

export default EducationForm;