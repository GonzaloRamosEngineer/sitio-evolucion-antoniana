import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, Instagram, Facebook, Linkedin, Instagram as TwitterIcon } from 'lucide-react';

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

  const validateUrl = (url) => {
    if (url && !url.startsWith('https://')) {
      return false;
    }
    return true;
  };

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
        toast({
            title: "Campos incompletos",
            description: "Por favor, completa todos los campos requeridos.",
            variant: "destructive",
        });
        setLoading(false);
        return;
    }
    
    if (!unlimitedParticipants && parseInt(formState.max_participants) <= 0) {
        toast({
            title: "Valor inválido",
            description: "Los cupos máximos deben ser un número positivo.",
            variant: "destructive",
        });
        setLoading(false);
        return;
    }

    const activityData = {
      ...formState,
      max_participants: unlimitedParticipants ? null : parseInt(formState.max_participants),
      date: formState.date,
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
        const { error: updateError } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', activity.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('activities')
          .insert([{ ...activityData, created_at: new Date().toISOString() }]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: `Actividad ${activity ? 'actualizada' : 'creada'}`,
        description: `La actividad "${activityData.title}" ha sido ${activity ? 'actualizada' : 'creada'} exitosamente.`,
        className: "bg-green-500 text-white dark:bg-green-600 dark:text-white"
      });
      onSave(); 
      onClose(); 
    } catch (error) {
      console.error('Error saving activity:', error);
      toast({
        title: "Error al Guardar",
        description: error.message || "Hubo un problema al guardar la actividad.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-blanco-fundacion dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-poppins text-primary-antoniano dark:text-primary">
            {activity ? 'Editar Actividad' : 'Nueva Actividad'}
          </DialogTitle>
          <DialogDescription className="text-marron-legado/90 dark:text-gray-400">
            {activity ? 'Modifica los datos de la actividad.' : 'Completa los datos para crear una nueva actividad.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="title" className="text-marron-legado dark:text-gray-300">Título</Label>
            <Input id="title" name="title" value={formState.title} onChange={handleChange} required className="border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600" />
          </div>
          <div>
            <Label htmlFor="description" className="text-marron-legado dark:text-gray-300">Descripción</Label>
            <textarea
              id="description"
              name="description"
              className="flex w-full rounded-md border border-marron-legado/30 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-antoniano focus-visible:ring-offset-2 min-h-[100px] dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={formState.description}
              onChange={handleChange}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-marron-legado dark:text-gray-300">Fecha</Label>
              <Input id="date" name="date" type="date" value={formState.date} onChange={handleChange} required className="border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600" />
            </div>
            <div>
              <Label htmlFor="duration" className="text-marron-legado dark:text-gray-300">Duración</Label>
              <Input id="duration" name="duration" placeholder="Ej: 2 horas" value={formState.duration} onChange={handleChange} required className="border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="modality" className="text-marron-legado dark:text-gray-300">Modalidad</Label>
              <Select name="modality" value={formState.modality} onValueChange={(value) => handleSelectChange('modality', value)}>
                <SelectTrigger className="w-full border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <SelectValue placeholder="Selecciona modalidad" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:text-white">
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max_participants" className="text-marron-legado dark:text-gray-300">Cupos Máximos</Label>
              <Input id="max_participants" name="max_participants" type="number" min="1" value={formState.max_participants} onChange={handleChange} required={!unlimitedParticipants} disabled={unlimitedParticipants} className="border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="unlimitedParticipantsDialog"
              checked={unlimitedParticipants}
              onCheckedChange={handleCheckboxChange}
              className="border-marron-legado data-[state=checked]:bg-primary-antoniano data-[state=checked]:text-white dark:border-gray-600 dark:data-[state=checked]:bg-primary"
            />
            <Label htmlFor="unlimitedParticipantsDialog" className="text-sm font-medium text-marron-legado dark:text-gray-300">
              Sin límite de participantes
            </Label>
          </div>
           <div>
            <Label htmlFor="status" className="text-marron-legado dark:text-gray-300">Estado</Label>
            <Select name="status" value={formState.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger className="w-full border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:text-white">
                  <SelectItem value="Próximamente">Próximamente</SelectItem>
                  <SelectItem value="Abierta">Abierta (Inscripciones Abiertas)</SelectItem>
                  <SelectItem value="Cerrada">Cerrada (Inscripciones Cerradas)</SelectItem>
                  <SelectItem value="Finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
          </div>
          <div>
            <Label htmlFor="image_url" className="text-marron-legado dark:text-gray-300">URL Imagen Tarjeta (Opcional)</Label>
            <Input id="image_url" name="image_url" placeholder="https://ejemplo.com/imagen.jpg" value={formState.image_url} onChange={handleChange} className="border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600" />
            <p className="text-xs text-muted-foreground pt-1 dark:text-gray-400">Ideal: 382x224px.</p>
          </div>
          <div>
            <Label htmlFor="image_detail_url" className="text-marron-legado dark:text-gray-300">URL Imagen Detalle (Opcional)</Label>
            <Input id="image_detail_url" name="image_detail_url" placeholder="https://ejemplo.com/detalle.jpg" value={formState.image_detail_url} onChange={handleChange} className="border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600" />
             <p className="text-xs text-muted-foreground pt-1 dark:text-gray-400">Ideal para imagen grande.</p>
          </div>

          <div className="pt-2">
            <h4 className="text-sm font-medium text-marron-legado dark:text-gray-300 mb-2">Enlaces a Redes Sociales (Opcional)</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="instagram_url" className="text-xs text-marron-legado dark:text-gray-400 flex items-center"><Instagram className="w-3.5 h-3.5 mr-1.5 text-pink-500"/>Instagram</Label>
                <Input id="instagram_url" name="instagram_url" placeholder="https://instagram.com/..." value={formState.instagram_url} onChange={handleChange} className="border-marron-legado/30 focus:border-primary-antoniano text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600" />
              </div>
              <div>
                <Label htmlFor="facebook_url" className="text-xs text-marron-legado dark:text-gray-400 flex items-center"><Facebook className="w-3.5 h-3.5 mr-1.5 text-blue-600"/>Facebook</Label>
                <Input id="facebook_url" name="facebook_url" placeholder="https://facebook.com/..." value={formState.facebook_url} onChange={handleChange} className="border-marron-legado/30 focus:border-primary-antoniano text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600" />
              </div>
              <div>
                <Label htmlFor="linkedin_url" className="text-xs text-marron-legado dark:text-gray-400 flex items-center"><Linkedin className="w-3.5 h-3.5 mr-1.5 text-blue-700"/>LinkedIn</Label>
                <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/..." value={formState.linkedin_url} onChange={handleChange} className="border-marron-legado/30 focus:border-primary-antoniano text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600" />
              </div>
              <div>
                <Label htmlFor="twitter_url" className="text-xs text-marron-legado dark:text-gray-400 flex items-center"><TwitterIcon className="w-3.5 h-3.5 mr-1.5 text-sky-500"/>X / Twitter</Label>
                <Input id="twitter_url" name="twitter_url" placeholder="https://x.com/..." value={formState.twitter_url} onChange={handleChange} className="border-marron-legado/30 focus:border-primary-antoniano text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600" />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary-antoniano text-white hover:bg-primary-antoniano/90 dark:bg-primary dark:hover:bg-primary/90">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (activity ? 'Actualizar Actividad' : 'Crear Actividad')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityFormDialog;