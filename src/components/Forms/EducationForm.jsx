import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Send, ShieldCheck, GraduationCap, MapPin, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createPreinscription } from '@/api/educationApi';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Esquema de validación estricto con Zod
const educationSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  full_name: z.string().min(5, "Ingresa nombre y apellido completo"),
  dni: z.string().min(7, "DNI debe tener al menos 7 dígitos"),
  age: z.string().refine((val) => !isNaN(val) && parseInt(val) >= 14, "Debes ser mayor de 14 años"),
  last_year_completed: z.string().min(1, "Selecciona tu último nivel cursado"),
  phone: z.string().min(8, "Ingresa un teléfono o WhatsApp válido"),
  location: z.string().min(1, "Selecciona tu localidad"),
  location_custom: z.string().optional(), // Campo dinámico para "Otros"
  level_to_start: z.string().min(1, "Selecciona el nivel que deseas iniciar"),
  interest_area: z.string().optional(),
  interest_custom: z.string().optional(), // Campo dinámico para "Otros"
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
      last_year_completed: "",
      location: "",
      level_to_start: "",
      relationship_club: "",
      preferred_modality: "",
      preferred_schedule: "",
      interest_area: ""
    }
  });

  // Observamos los valores para activar los campos "Otros"
  const selectedLocation = watch("location");
  const selectedInterest = watch("interest_area");

  const onFormSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Procesamiento de datos dinámicos antes del envío
      const payload = {
        ...data,
        age: parseInt(data.age),
        // Si eligió 'otro', usamos el valor del campo de texto personalizado
        location: data.location === 'otro' ? data.location_custom : data.location,
        interest_area: data.interest_area === 'otro' ? data.interest_custom : data.interest_area,
      };

      // Limpiamos los campos auxiliares de Zod que no van a la DB
      delete payload.location_custom;
      delete payload.interest_custom;

      await createPreinscription(payload);
      
      toast({ 
        title: "¡Formulario Recibido!", 
        description: "Tus datos han sido registrados correctamente.",
        className: "bg-brand-dark text-white rounded-2xl"
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      toast({ 
        title: "Error al enviar", 
        description: "No pudimos procesar la preinscripción. Por favor, intenta más tarde.",
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-10">
      
      {/* SECCIÓN 1: IDENTIDAD Y CONTACTO */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Users size={16} className="text-brand-primary" />
            <Label className="text-brand-primary font-black uppercase text-[10px] tracking-[0.2em]">Datos del Aspirante</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-500 ml-1">Nombre y Apellido *</Label>
            <Input placeholder="Ej: Juan Pérez" {...register('full_name')} className="rounded-xl border-gray-200 h-12" />
            {errors.full_name && <p className="text-red-500 text-[10px] font-bold px-2">{errors.full_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 ml-1">DNI *</Label>
                <Input placeholder="Sin puntos" {...register('dni')} className="rounded-xl border-gray-200 h-12" />
                {errors.dni && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.dni.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 ml-1">Edad *</Label>
                <Input placeholder="Años" {...register('age')} className="rounded-xl border-gray-200 h-12" />
                {errors.age && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.age.message}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-500 ml-1">Correo Electrónico *</Label>
            <Input placeholder="correo@ejemplo.com" {...register('email')} className="rounded-xl border-gray-200 h-12" />
            {errors.email && <p className="text-red-500 text-[10px] font-bold px-2">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-500 ml-1">WhatsApp / Teléfono *</Label>
            <Input placeholder="387..." {...register('phone')} className="rounded-xl border-gray-200 h-12" />
            {errors.phone && <p className="text-red-500 text-[10px] font-bold px-2">{errors.phone.message}</p>}
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: TRAYECTORIA EDUCATIVA */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <GraduationCap size={16} className="text-brand-primary" />
            <Label className="text-brand-primary font-black uppercase text-[10px] tracking-[0.2em]">Situación Académica</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 ml-1">Último año cursado de secundaria *</Label>
              <Select onValueChange={(val) => setValue('last_year_completed', val)}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Seleccionar opción" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin-ingreso">Sin Ingreso a Secundaria</SelectItem>
                  <SelectItem value="egb3">7mo / 8vo / 9no (EGB 3)</SelectItem>
                  <SelectItem value="1-2-polimodal">1ro / 2do Año (Polimodal)</SelectItem>
                  <SelectItem value="secundaria-incompleta">Secundaria Incompleta (+3 años)</SelectItem>
                </SelectContent>
              </Select>
              {errors.last_year_completed && <p className="text-red-500 text-[10px] font-bold">{errors.last_year_completed.message}</p>}
          </div>

          <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 ml-1">Nivel que desea iniciar *</Label>
              <Select onValueChange={(val) => setValue('level_to_start', val)}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Nivel a cursar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primaria">Primaria</SelectItem>
                  <SelectItem value="secundaria">Secundaria</SelectItem>
                  <SelectItem value="asesoramiento">No estoy seguro/a (Quiero asesoramiento)</SelectItem>
                </SelectContent>
              </Select>
              {errors.level_to_start && <p className="text-red-500 text-[10px] font-bold">{errors.level_to_start.message}</p>}
          </div>
        </div>

        <div className="space-y-3">
            <Label className="text-xs font-bold text-gray-500 ml-1">Orientación de interés</Label>
            <Select onValueChange={(val) => setValue('interest_area', val)}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Elegir orientación (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="economia">Economía y Administración</SelectItem>
                  <SelectItem value="humanidades">Humanidades</SelectItem>
                  <SelectItem value="informatica">Informática</SelectItem>
                  <SelectItem value="naturales">Ciencias Naturales</SelectItem>
                  <SelectItem value="artes">Artes</SelectItem>
                  <SelectItem value="otro">Otro (especificar cuál)</SelectItem>
                </SelectContent>
            </Select>

            {/* Campo dinámico "Otro" para Orientación */}
            <AnimatePresence>
              {selectedInterest === 'otro' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Input 
                    placeholder="¿Qué otra orientación te interesa? *" 
                    {...register('interest_custom')} 
                    className="rounded-xl border-brand-primary/30 h-12 bg-brand-primary/5 focus:ring-brand-primary"
                  />
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>

      {/* SECCIÓN 3: PREFERENCIAS Y VÍNCULO */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <MapPin size={16} className="text-brand-primary" />
            <Label className="text-brand-primary font-black uppercase text-[10px] tracking-[0.2em]">Contexto y Preferencias</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-xs font-bold text-gray-500 ml-1">Localidad o Zona *</Label>
            <Select onValueChange={(val) => setValue('location', val)}>
              <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="¿Dónde vivís?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="salta-capital">Salta Capital</SelectItem>
                <SelectItem value="zona-norte">Zona Norte / Sur / Este / Oeste</SelectItem>
                <SelectItem value="valles">San Lorenzo / Cerrillos / Rosario</SelectItem>
                <SelectItem value="otro">Otro (especificar cuál)</SelectItem>
              </SelectContent>
            </Select>
            {errors.location && <p className="text-red-500 text-[10px] font-bold">{errors.location.message}</p>}

            {/* Campo dinámico "Otro" para Localidad */}
            <AnimatePresence>
              {selectedLocation === 'otro' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Input 
                    placeholder="Especificá tu zona o localidad *" 
                    {...register('location_custom')} 
                    className="rounded-xl border-brand-primary/30 h-12 bg-brand-primary/5 focus:ring-brand-primary"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-500 ml-1">Vínculo con el Club / Fundación *</Label>
            <Select onValueChange={(val) => setValue('relationship_club', val)}>
              <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Tu relación con la institución" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="socio">Socio/a</SelectItem>
                <SelectItem value="hincha">Hincha/Simpatizante</SelectItem>
                <SelectItem value="empleado">Empleado</SelectItem>
                <SelectItem value="vecino">Vecino/a del barrio</SelectItem>
                <SelectItem value="ninguno">Ninguno</SelectItem>
              </SelectContent>
            </Select>
            {errors.relationship_club && <p className="text-red-500 text-[10px] font-bold">{errors.relationship_club.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-500 ml-1">Modalidad preferida *</Label>
            <Select onValueChange={(val) => setValue('preferred_modality', val)}>
              <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Elegir modalidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="presencial">Presencial (Sede Centro Juventud Antoniana)</SelectItem>
                <SelectItem value="virtual">Virtual / Distancia</SelectItem>
              </SelectContent>
            </Select>
            {errors.preferred_modality && <p className="text-red-500 text-[10px] font-bold">{errors.preferred_modality.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-500 ml-1">Horario preferido</Label>
            <Select onValueChange={(val) => setValue('preferred_schedule', val)}>
              <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Turno de preferencia" /></SelectTrigger>
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
        <Label className="text-xs font-bold text-gray-500 ml-1 text-xs">Mensaje o Consulta adicional</Label>
        <Textarea 
          placeholder="Si tenés alguna duda específica, escribila aquí..." 
          {...register('message')} 
          className="rounded-2xl border-gray-200 min-h-[120px] focus:ring-brand-primary" 
        />
      </div>

      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full h-16 bg-brand-primary hover:bg-brand-dark text-white font-black rounded-2xl shadow-xl shadow-brand-primary/20 text-lg transition-all active:scale-95"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin h-5 w-5" />
            <span>PROCESANDO ENLACE...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Send size={20} />
            <span>ENVIAR PREINSCRIPCIÓN OFICIAL</span>
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