import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar as CalendarIcon, Loader2, Instagram, Facebook, 
  Linkedin, Twitter, Globe, Image as ImageIcon, Users, 
  Clock, MapPin, Info, Save, X 
} from 'lucide-react';
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
    }
  }, [initialData]);

  const validateUrl = (url) => url ? url.startsWith('https://') : true;

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

  const sectionLabel = (icon, text) => (
    <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
        <div className="p-1.5 bg-brand-sand rounded-lg text-brand-primary">
            {React.cloneElement(icon, { size: 16 })}
        </div>
        <span className="text-sm font-bold uppercase tracking-widest text-gray-400">{text}</span>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8 font-sans">
      
      {/* SECCIÓN 1: GENERAL */}
      <div>
        {sectionLabel(<Info />, "Información Principal")}
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="title" className="font-bold text-brand-dark">Título de la Actividad *</Label>
                <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Curso de Programación Solidaria"
                className="h-12 border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl transition-all"
                required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="font-bold text-brand-dark">Descripción Detallada *</Label>
                <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe los objetivos, requisitos y qué aprenderán los participantes..."
                className="min-h-[150px] border-gray-200 focus:border-brand-primary rounded-xl p-4 leading-relaxed"
                required
                />
            </div>
        </div>
      </div>

      {/* SECCIÓN 2: LOGÍSTICA */}
      <div>
        {sectionLabel(<Clock />, "Logística y Capacidad")}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="date" className="font-bold text-brand-dark">Fecha del Evento *</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={`w-full h-12 justify-start text-left font-normal border-gray-200 rounded-xl hover:bg-brand-sand/50 ${!date && "text-muted-foreground"}`}
                    >
                        <CalendarIcon className="mr-3 h-5 w-5 text-brand-primary" />
                        {date ? format(date, "PPP", { locale: es }) : <span>Selecciona el día</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        locale={es}
                        disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} 
                        className="p-3"
                    />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                <Label htmlFor="duration" className="font-bold text-brand-dark">Duración / Horario *</Label>
                <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        id="duration"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="Ej: 2 horas, de 18:00 a 20:00"
                        className="pl-12 h-12 border-gray-200 focus:border-brand-primary rounded-xl"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="modality" className="font-bold text-brand-dark">Modalidad *</Label>
                <Select value={modality} onValueChange={setModality} required>
                    <SelectTrigger className="h-12 border-gray-200 rounded-xl">
                        <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="presencial">Presencial (En Salta)</SelectItem>
                        <SelectItem value="virtual">Virtual (Online)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="status" className="font-bold text-brand-dark">Estado Público *</Label>
                <Select value={status} onValueChange={setStatus} required>
                    <SelectTrigger className="h-12 border-gray-200 rounded-xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="Próximamente" className="text-amber-600 font-medium">Próximamente</SelectItem>
                        <SelectItem value="Abierta" className="text-green-600 font-medium">Abierta (Inscripciones ON)</SelectItem>
                        <SelectItem value="Cerrada" className="text-red-600 font-medium">Cerrada (Inscripciones OFF)</SelectItem>
                        <SelectItem value="Finalizada" className="text-gray-400">Finalizada</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="mt-6 p-6 bg-brand-sand rounded-2xl border border-brand-primary/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                    <Label htmlFor="maxParticipants" className="font-bold text-brand-dark flex items-center gap-2">
                        <Users className="w-4 h-4" /> Cupos Disponibles *
                    </Label>
                    <Input
                        id="maxParticipants"
                        type="number"
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(e.target.value)}
                        placeholder="Ej: 50"
                        className="h-11 bg-white border-gray-200 rounded-xl"
                        min="1"
                        required={!unlimitedParticipants}
                        disabled={unlimitedParticipants}
                    />
                </div>
                <div className="flex items-center space-x-3 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm">
                    <Checkbox
                        id="unlimitedParticipants"
                        checked={unlimitedParticipants}
                        onCheckedChange={setUnlimitedParticipants}
                        className="h-5 w-5 border-gray-300 data-[state=checked]:bg-brand-primary"
                    />
                    <Label htmlFor="unlimitedParticipants" className="text-sm font-bold text-brand-dark cursor-pointer">
                        Sin límite de participantes
                    </Label>
                </div>
            </div>
        </div>
      </div>

      {/* SECCIÓN 3: IMÁGENES */}
      <div>
        {sectionLabel(<ImageIcon />, "Identidad Visual")}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="imageUrl" className="font-bold text-brand-dark">URL Portada (Listado)</Label>
                <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-11 border-gray-200 rounded-xl"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="imageDetailUrl" className="font-bold text-brand-dark">URL Detalle (Banner)</Label>
                <Input
                    id="imageDetailUrl"
                    value={imageDetailUrl}
                    onChange={(e) => setImageDetailUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-11 border-gray-200 rounded-xl"
                />
            </div>
        </div>
      </div>

      {/* SECCIÓN 4: SOCIAL */}
      <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100">
        {sectionLabel(<Globe />, "Promoción en Redes")}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2 group">
                <Label htmlFor="instagramUrl" className="font-bold text-brand-dark flex items-center gap-2 group-hover:text-[#E1306C] transition-colors">
                    <Instagram size={16}/> Instagram Post URL
                </Label>
                <Input id="instagramUrl" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} className="rounded-xl border-gray-200" placeholder="https://instagram.com/..." />
            </div>
            <div className="space-y-2 group">
                <Label htmlFor="facebookUrl" className="font-bold text-brand-dark flex items-center gap-2 group-hover:text-[#1877F2] transition-colors">
                    <Facebook size={16}/> Facebook Post URL
                </Label>
                <Input id="facebookUrl" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} className="rounded-xl border-gray-200" placeholder="https://facebook.com/..." />
            </div>
            <div className="space-y-2 group">
                <Label htmlFor="linkedinUrl" className="font-bold text-brand-dark flex items-center gap-2 group-hover:text-[#0A66C2] transition-colors">
                    <Linkedin size={16}/> LinkedIn Post URL
                </Label>
                <Input id="linkedinUrl" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="rounded-xl border-gray-200" placeholder="https://linkedin.com/..." />
            </div>
            <div className="space-y-2 group">
                <Label htmlFor="twitterUrl" className="font-bold text-brand-dark flex items-center gap-2 group-hover:text-[#1DA1F2] transition-colors">
                    <Twitter size={16}/> X / Twitter Post URL
                </Label>
                <Input id="twitterUrl" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} className="rounded-xl border-gray-200" placeholder="https://x.com/..." />
            </div>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-8 border-t border-gray-100">
        <Button 
            type="button" 
            variant="ghost" 
            onClick={onCancel} 
            disabled={isLoading}
            className="w-full sm:w-auto text-gray-400 font-bold hover:text-brand-dark"
        >
            <X className="mr-2 h-4 w-4" /> Cancelar
        </Button>
        <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full sm:w-auto bg-brand-primary hover:bg-brand-dark text-white font-bold h-12 px-12 rounded-xl shadow-lg transition-all transform active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
                <Save className="mr-2 h-5 w-5" />
                {initialData ? 'Guardar Cambios' : 'Publicar Actividad'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ActivityForm;