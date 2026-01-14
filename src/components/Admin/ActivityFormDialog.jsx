import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, Instagram, Facebook, Linkedin, 
  Twitter, Info, Calendar, Clock, Users, 
  ImageIcon, Globe, Save, X 
} from 'lucide-react';
import { motion } from 'framer-motion';

const ActivityFormDialog = ({ isOpen, onClose, onSave, activity }) => {
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    date: '',
    duration: '',
    modality: 'presencial',
    max_participants: '',
    image_url: '',
    image_detail_url: '',
    status: 'Abierta',
    instagram_url: '',
    facebook_url: '',
    linkedin_url: '',
    twitter_url: '',
  });
  const [unlimitedParticipants, setUnlimitedParticipants] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (activity) {
        const isUnlimited = activity.max_participants === null || activity.max_participants === -1;
        setFormState({
          title: activity.title || '',
          description: activity.description || '',
          date: activity.date ? new Date(activity.date).toISOString().split('T')[0] : '',
          duration: activity.duration || '',
          modality: activity.modality || 'presencial',
          max_participants: isUnlimited ? '' : activity.max_participants?.toString() || '',
          image_url: activity.image_url || '',
          image_detail_url: activity.image_detail_url || '',
          status: activity.status || 'Abierta',
          instagram_url: activity.instagram_url || '',
          facebook_url: activity.facebook_url || '',
          linkedin_url: activity.linkedin_url || '',
          twitter_url: activity.twitter_url || '',
        });
        setUnlimitedParticipants(isUnlimited);
      } else {
        setFormState({
          title: '', description: '', date: '', duration: '',
          modality: 'presencial', max_participants: '', image_url: '',
          image_detail_url: '', status: 'Abierta', instagram_url: '',
          facebook_url: '', linkedin_url: '', twitter_url: '',
        });
        setUnlimitedParticipants(false);
      }
    }
  }, [activity, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked) => {
    setUnlimitedParticipants(checked);
    if (checked) {
      setFormState(prev => ({ ...prev, max_participants: '' }));
    }
  };

  const validateUrl = (url) => url ? url.startsWith('https://') : true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const urlsToValidate = [
      { name: 'Instagram', value: formState.instagram_url },
      { name: 'Facebook', value: formState.facebook_url },
      { name: 'LinkedIn', value: formState.linkedin_url },
      { name: 'X/Twitter', value: formState.twitter_url },
    ];

    for (const urlField of urlsToValidate) {
      if (urlField.value && !validateUrl(urlField.value)) {
        toast({
          title: "URL Inválida",
          description: `La URL de ${urlField.name} debe comenzar con "https://".`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    if (!formState.title || !formState.description || !formState.date || !formState.duration || (!unlimitedParticipants && !formState.max_participants) || !formState.status) {
        toast({ title: "Campos incompletos", description: "Por favor completa los requeridos.", variant: "destructive" });
        setLoading(false);
        return;
    }

    const activityData = {
      ...formState,
      max_participants: unlimitedParticipants ? null : parseInt(formState.max_participants),
      image_url: formState.image_url || null,
      image_detail_url: formState.image_detail_url || null,
      instagram_url: formState.instagram_url || null,
      facebook_url: formState.facebook_url || null,
      linkedin_url: formState.linkedin_url || null,
      twitter_url: formState.twitter_url || null,
    };
    
    if (activity && activity.id) {
        delete activityData.current_participants; 
    } else {
        activityData.current_participants = 0;
    }

    try {
      let error;
      if (activity && activity.id) {
        const { error: updateError } = await supabase.from('activities').update(activityData).eq('id', activity.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('activities').insert([{ ...activityData, created_at: new Date().toISOString() }]);
        error = insertError;
      }

      if (error) throw error;

      toast({ title: `¡Éxito!`, description: `Cambios guardados correctamente.`, className: "bg-green-600 text-white border-none" });
      onSave(); 
      onClose(); 
    } catch (error) {
      toast({ title: "Error al Guardar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0">
        <div className="p-1.5 bg-brand-sand rounded-lg text-brand-primary">
            <Icon size={14} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{text}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl rounded-[2rem] border-none p-0 bg-white shadow-2xl overflow-hidden">
        <DialogHeader className="bg-brand-dark p-8 text-white">
          <DialogTitle className="text-2xl font-poppins font-bold">
            {activity ? 'Editar Actividad' : 'Nueva Actividad'}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            {activity ? 'Modifica los parámetros del evento seleccionado.' : 'Crea un nuevo evento para los miembros de la fundación.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <SectionHeader icon={Info} text="Contenido Principal" />
          <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="title" className="font-bold text-brand-dark">Título *</Label>
                <Input id="title" name="title" value={formState.title} onChange={handleChange} required className="h-11 rounded-xl border-gray-200 focus:border-brand-primary" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description" className="font-bold text-brand-dark">Descripción *</Label>
                <textarea
                  id="description"
                  name="description"
                  className="flex w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary min-h-[120px]"
                  value={formState.description}
                  onChange={handleChange}
                  required
                />
            </div>
          </div>

          <SectionHeader icon={Calendar} text="Logística y Estado" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold text-brand-dark">Fecha *</Label>
              <Input name="date" type="date" value={formState.date} onChange={handleChange} required className="h-11 rounded-xl border-gray-200" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-brand-dark">Duración *</Label>
              <Input name="duration" placeholder="Ej: 2 horas" value={formState.duration} onChange={handleChange} required className="h-11 rounded-xl border-gray-200" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-brand-dark">Modalidad</Label>
              <Select value={formState.modality} onValueChange={(v) => handleSelectChange('modality', v)}>
                <SelectTrigger className="h-11 rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-brand-dark">Estado Público</Label>
              <Select value={formState.status} onValueChange={(v) => handleSelectChange('status', v)}>
                <SelectTrigger className="h-11 rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Próximamente">Próximamente</SelectItem>
                  <SelectItem value="Abierta">Abierta</SelectItem>
                  <SelectItem value="Cerrada">Cerrada</SelectItem>
                  <SelectItem value="Finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-brand-sand/50 rounded-2xl border border-brand-primary/5 flex flex-col sm:flex-row gap-4 items-center mt-4">
            <div className="flex-1 w-full space-y-1">
                <Label className="text-[10px] font-black text-gray-500 uppercase">Cupos Máximos</Label>
                <Input name="max_participants" type="number" value={formState.max_participants} onChange={handleChange} required={!unlimitedParticipants} disabled={unlimitedParticipants} className="h-10 rounded-lg bg-white border-gray-200" />
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm self-end sm:self-center">
              <Checkbox id="unlimitedDialog" checked={unlimitedParticipants} onCheckedChange={handleCheckboxChange} className="border-gray-300" />
              <Label htmlFor="unlimitedDialog" className="text-xs font-bold text-brand-dark cursor-pointer">Ilimitados</Label>
            </div>
          </div>

          <SectionHeader icon={ImageIcon} text="Imágenes" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
                <Label className="text-[10px] font-bold text-gray-400 uppercase">URL Portada</Label>
                <Input name="image_url" value={formState.image_url} onChange={handleChange} className="h-10 rounded-lg border-gray-200" placeholder="https://..." />
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] font-bold text-gray-400 uppercase">URL Detalle</Label>
                <Input name="image_detail_url" value={formState.image_detail_url} onChange={handleChange} className="h-10 rounded-lg border-gray-200" placeholder="https://..." />
            </div>
          </div>

          <SectionHeader icon={Globe} text="Redes Sociales" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative group">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-pink-500 transition-colors" />
                  <Input name="instagram_url" value={formState.instagram_url} onChange={handleChange} className="pl-10 h-10 rounded-lg border-gray-200 text-xs" placeholder="URL Instagram" />
              </div>
              <div className="relative group">
                  <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                  <Input name="facebook_url" value={formState.facebook_url} onChange={handleChange} className="pl-10 h-10 rounded-lg border-gray-200 text-xs" placeholder="URL Facebook" />
              </div>
              <div className="relative group">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-700 transition-colors" />
                  <Input name="linkedin_url" value={formState.linkedin_url} onChange={handleChange} className="pl-10 h-10 rounded-lg border-gray-200 text-xs" placeholder="URL LinkedIn" />
              </div>
              <div className="relative group">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-sky-500 transition-colors" />
                  <Input name="twitter_url" value={formState.twitter_url} onChange={handleChange} className="pl-10 h-10 rounded-lg border-gray-200 text-xs" placeholder="URL X/Twitter" />
              </div>
          </div>

          <DialogFooter className="pt-8 gap-2 border-t border-gray-50 mt-6">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="font-bold text-gray-400">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-8 rounded-xl shadow-lg transition-all h-12 min-w-[160px]">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4"/> Guardar</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityFormDialog;