import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, Loader2, Instagram, Facebook, Linkedin, Instagram as TwitterIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const ActivityForm = ({ onSave, onCancel, initialData, isLoading }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(null);
  const [duration, setDuration] = useState('');
  const [modality, setModality] = useState('');
  const [status, setStatus] = useState('Abierta');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [unlimitedParticipants, setUnlimitedParticipants] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageDetailUrl, setImageDetailUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setDate(initialData.date ? new Date(initialData.date) : null);
      setDuration(initialData.duration || '');
      setModality(initialData.modality || '');
      setStatus(initialData.status || 'Abierta');
      setUnlimitedParticipants(initialData.max_participants === null || initialData.max_participants === -1);
      setMaxParticipants(initialData.max_participants === null || initialData.max_participants === -1 ? '' : initialData.max_participants?.toString() || '');
      setImageUrl(initialData.image_url || '');
      setImageDetailUrl(initialData.image_detail_url || '');
      setInstagramUrl(initialData.instagram_url || '');
      setFacebookUrl(initialData.facebook_url || '');
      setLinkedinUrl(initialData.linkedin_url || '');
      setTwitterUrl(initialData.twitter_url || '');
    } else {
      setTitle('');
      setDescription('');
      setDate(null);
      setDuration('');
      setModality('');
      setStatus('Abierta');
      setMaxParticipants('');
      setUnlimitedParticipants(false);
      setImageUrl('');
      setImageDetailUrl('');
      setInstagramUrl('');
      setFacebookUrl('');
      setLinkedinUrl('');
      setTwitterUrl('');
    }
  }, [initialData]);

  const validateUrl = (url) => {
    if (url && !url.startsWith('https://')) {
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const urlsToValidate = [
      { name: 'Instagram', value: instagramUrl },
      { name: 'Facebook', value: facebookUrl },
      { name: 'LinkedIn', value: linkedinUrl },
      { name: 'X/Twitter', value: twitterUrl },
    ];

    for (const urlField of urlsToValidate) {
      if (urlField.value && !validateUrl(urlField.value)) {
        toast({
          title: "URL Inválida",
          description: `La URL de ${urlField.name} debe comenzar con "https://".`,
          variant: "destructive",
        });
        return;
      }
    }
    
    if (!title || !description || !date || !duration || !modality || !status || (!unlimitedParticipants && !maxParticipants)) {
      toast({
        title: "Campos Incompletos",
        description: "Por favor, completa todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }
    
    const activityData = {
      title,
      description,
      date: date ? format(date, "yyyy-MM-dd") : null,
      duration,
      modality,
      status,
      max_participants: unlimitedParticipants ? null : parseInt(maxParticipants, 10),
      image_url: imageUrl || null,
      image_detail_url: imageDetailUrl || null,
      instagram_url: instagramUrl || null,
      facebook_url: facebookUrl || null,
      linkedin_url: linkedinUrl || null,
      twitter_url: twitterUrl || null,
    };
    onSave(activityData);
  };

  const inputVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3 }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <motion.div variants={inputVariants} className="space-y-2">
        <Label htmlFor="title" className="text-marron-legado dark:text-gray-300">Título de la Actividad</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Taller de Oratoria Consciente"
          className="border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          required
        />
      </motion.div>

      <motion.div variants={inputVariants} transition={{ delay: 0.05 }} className="space-y-2">
        <Label htmlFor="description" className="text-marron-legado dark:text-gray-300">Descripción Completa</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalla en qué consiste la actividad, objetivos, a quién está dirigida, etc."
          className="min-h-[120px] border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          required
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={inputVariants} transition={{ delay: 0.1 }} className="space-y-2">
          <Label htmlFor="date" className="text-marron-legado dark:text-gray-300">Fecha del Evento</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-full justify-start text-left font-normal border-border hover:bg-celeste-complementario/50 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${!date && "text-muted-foreground dark:text-gray-400"}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary-antoniano/80 dark:text-primary/80" />
                {date ? format(date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card dark:bg-gray-800" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                locale={es}
                disabled={(d) => d < new Date(new Date().setDate(new Date().getDate() -1))} 
                className="dark:text-white"
              />
            </PopoverContent>
          </Popover>
        </motion.div>

        <motion.div variants={inputVariants} transition={{ delay: 0.15 }} className="space-y-2">
          <Label htmlFor="duration" className="text-marron-legado dark:text-gray-300">Duración Estimada</Label>
          <Input
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Ej: 2 horas, De 10 a 12 hs"
            className="border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            required
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={inputVariants} transition={{ delay: 0.2 }} className="space-y-2">
          <Label htmlFor="modality" className="text-marron-legado dark:text-gray-300">Modalidad</Label>
          <Select value={modality} onValueChange={setModality} required>
            <SelectTrigger className="w-full border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600">
              <SelectValue placeholder="Selecciona la modalidad" />
            </SelectTrigger>
            <SelectContent className="bg-card dark:bg-gray-800 dark:text-white">
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div variants={inputVariants} transition={{ delay: 0.25 }} className="space-y-2">
          <Label htmlFor="maxParticipants" className="text-marron-legado dark:text-gray-300">Cupos Máximos</Label>
          <Input
            id="maxParticipants"
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            placeholder="Ej: 30"
            className="border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            min="1"
            required={!unlimitedParticipants}
            disabled={unlimitedParticipants}
          />
        </motion.div>
      </div>

      <motion.div variants={inputVariants} transition={{ delay: 0.27 }} className="flex items-center space-x-2">
        <Checkbox
          id="unlimitedParticipants"
          checked={unlimitedParticipants}
          onCheckedChange={setUnlimitedParticipants}
          className="border-marron-legado data-[state=checked]:bg-primary-antoniano data-[state=checked]:text-white dark:border-gray-600 dark:data-[state=checked]:bg-primary"
        />
        <Label htmlFor="unlimitedParticipants" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-marron-legado dark:text-gray-300">
          Sin límite de participantes
        </Label>
      </motion.div>

      <motion.div variants={inputVariants} transition={{ delay: 0.3 }} className="space-y-2">
        <Label htmlFor="status" className="text-marron-legado dark:text-gray-300">Estado de la Actividad</Label>
        <Select value={status} onValueChange={setStatus} required>
          <SelectTrigger className="w-full border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600">
            <SelectValue placeholder="Selecciona un estado" />
          </SelectTrigger>
          <SelectContent className="bg-card dark:bg-gray-800 dark:text-white">
            <SelectItem value="Próximamente">Próximamente</SelectItem>
            <SelectItem value="Abierta">Abierta (Inscripciones Abiertas)</SelectItem>
            <SelectItem value="Cerrada">Cerrada (Inscripciones Cerradas)</SelectItem>
            <SelectItem value="Finalizada">Finalizada</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={inputVariants} transition={{ delay: 0.35 }} className="space-y-2">
        <Label htmlFor="imageUrl" className="text-marron-legado dark:text-gray-300">URL de Imagen para Tarjeta (Opcional)</Label>
        <Input
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://ejemplo.com/imagen_tarjeta.jpg"
          className="border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
        <p className="text-xs text-muted-foreground dark:text-gray-400">Ideal: 382x224px. Se usará en listados.</p>
      </motion.div>

      <motion.div variants={inputVariants} transition={{ delay: 0.4 }} className="space-y-2">
        <Label htmlFor="imageDetailUrl" className="text-marron-legado dark:text-gray-300">URL de Imagen para Detalle (Opcional)</Label>
        <Input
          id="imageDetailUrl"
          value={imageDetailUrl}
          onChange={(e) => setImageDetailUrl(e.target.value)}
          placeholder="https://ejemplo.com/imagen_detalle_vertical.jpg"
          className="border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
        <p className="text-xs text-muted-foreground dark:text-gray-400">Ideal para imágenes más grandes o verticales en la vista detallada.</p>
      </motion.div>

      <motion.h3 variants={inputVariants} transition={{ delay: 0.45 }} className="text-lg font-semibold text-primary-antoniano dark:text-primary mt-4 pt-4 border-t border-border dark:border-gray-600">
        Enlaces a Redes Sociales (Opcional)
      </motion.h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={inputVariants} transition={{ delay: 0.5 }} className="space-y-2">
          <Label htmlFor="instagramUrl" className="text-marron-legado dark:text-gray-300 flex items-center"><Instagram className="w-4 h-4 mr-2 text-pink-500"/> Instagram URL</Label>
          <Input
            id="instagramUrl"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/publicacion"
            className="border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </motion.div>
        <motion.div variants={inputVariants} transition={{ delay: 0.55 }} className="space-y-2">
          <Label htmlFor="facebookUrl" className="text-marron-legado dark:text-gray-300 flex items-center"><Facebook className="w-4 h-4 mr-2 text-blue-600"/> Facebook URL</Label>
          <Input
            id="facebookUrl"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/publicacion"
            className="border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </motion.div>
        <motion.div variants={inputVariants} transition={{ delay: 0.6 }} className="space-y-2">
          <Label htmlFor="linkedinUrl" className="text-marron-legado dark:text-gray-300 flex items-center"><Linkedin className="w-4 h-4 mr-2 text-blue-700"/> LinkedIn URL</Label>
          <Input
            id="linkedinUrl"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/publicacion"
            className="border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </motion.div>
        <motion.div variants={inputVariants} transition={{ delay: 0.65 }} className="space-y-2">
          <Label htmlFor="twitterUrl" className="text-marron-legado dark:text-gray-300 flex items-center"><TwitterIcon className="w-4 h-4 mr-2 text-sky-500"/> X / Twitter URL</Label>
          <Input
            id="twitterUrl"
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            placeholder="https://x.com/publicacion"
            className="border-border focus:border-primary-antoniano focus:ring-primary-antoniano dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </motion.div>
      </div>


      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.3 }}
        className="flex justify-end space-x-4 pt-6"
      >
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="text-marron-legado border-marron-legado/50 hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
          Cancelar
        </Button>
        <Button type="submit" variant="antoniano" disabled={isLoading} className="text-white dark:text-primary-foreground min-w-[120px]">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? 'Guardar Cambios' : 'Crear Actividad')}
        </Button>
      </motion.div>
    </form>
  );
};

export default ActivityForm;