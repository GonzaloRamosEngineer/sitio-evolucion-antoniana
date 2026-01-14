import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { updateUserProfile } from '@/api/userApi';
import { 
  Loader2, Edit3, Save, X, User, 
  Fingerprint, Phone, Calendar, VenusMars, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EditProfileModal = ({ user, onUpdateSuccess, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dni: '',
    birth_date: '',
    gender: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        dni: user.dni || '',
        birth_date: user.birth_date ? new Date(user.birth_date).toISOString().split('T')[0] : '',
        gender: user.gender || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData((prev) => ({ ...prev, gender: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    const { data: updatedProfile, error } = await updateUserProfile(user.id, formData);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error al actualizar',
        description: 'No se pudo guardar tu perfil. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: '¡Perfil actualizado! ✅',
        description: 'Tus datos se han guardado correctamente.',
        className: "bg-brand-dark text-white border-none rounded-2xl shadow-2xl"
      });
      onUpdateSuccess({ ...user, ...updatedProfile });
      setIsEditing(false);
      setIsOpen(false);
    }
  };

  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) setIsEditing(false);
  };

  const SectionLabel = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <Icon size={14} className="text-brand-primary" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{text}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full border-brand-primary text-brand-primary hover:bg-brand-sand rounded-xl font-bold transition-all">
            <Edit3 className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[550px] bg-white rounded-[2rem] shadow-2xl border-none p-0 overflow-hidden">
        <DialogHeader className="bg-brand-dark p-8 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <DialogTitle className="text-2xl font-bold font-poppins relative z-10 flex items-center gap-3">
            <ShieldCheck className="text-brand-gold" />
            Configuración de Perfil
          </DialogTitle>
          <DialogDescription className="text-gray-400 relative z-10">
            Gestiona la información de tu cuenta para tu carnet de miembro.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {/* EMAIL - READ ONLY */}
          <div className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={12} /> Cuenta Vinculada (No editable)
            </Label>
            <div className="flex items-center gap-2 text-brand-dark font-medium">
                <Mail size={16} className="text-gray-400" />
                {user?.email}
            </div>
          </div>

          {/* SECCIÓN IDENTIDAD */}
          <div className="space-y-4">
            <SectionLabel icon={User} text="Identidad" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold text-brand-dark ml-1">Nombre Completo</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  disabled={!isEditing} 
                  placeholder="Tu nombre"
                  className={`h-11 rounded-xl transition-all ${isEditing ? 'border-brand-primary ring-2 ring-brand-primary/5 bg-white' : 'bg-gray-50 border-gray-100'}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni" className="text-xs font-bold text-brand-dark ml-1">Documento (DNI)</Label>
                <div className="relative">
                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      id="dni" 
                      value={formData.dni} 
                      onChange={handleChange} 
                      disabled={!isEditing}
                      placeholder="Sin puntos"
                      className={`h-11 pl-10 rounded-xl transition-all ${isEditing ? 'border-brand-primary ring-2 ring-brand-primary/5 bg-white' : 'bg-gray-50 border-gray-100'}`}
                    />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN CONTACTO Y PERSONAL */}
          <div className="space-y-4">
            <SectionLabel icon={Phone} text="Contacto y Personal" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold text-brand-dark ml-1">Teléfono</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  disabled={!isEditing}
                  placeholder="+54..."
                  className={`h-11 rounded-xl transition-all ${isEditing ? 'border-brand-primary ring-2 ring-brand-primary/5 bg-white' : 'bg-gray-50 border-gray-100'}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date" className="text-xs font-bold text-brand-dark ml-1">Fecha de Nacimiento</Label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input 
                      id="birth_date" 
                      type="date" 
                      value={formData.birth_date} 
                      onChange={handleChange} 
                      disabled={!isEditing}
                      className={`h-11 pl-10 rounded-xl transition-all ${isEditing ? 'border-brand-primary ring-2 ring-brand-primary/5 bg-white' : 'bg-gray-50 border-gray-100'}`}
                    />
                </div>
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="gender" className="text-xs font-bold text-brand-dark ml-1">Género</Label>
                <Select 
                    disabled={!isEditing} 
                    value={formData.gender} 
                    onValueChange={handleSelectChange}
                >
                    <SelectTrigger className={`h-11 rounded-xl transition-all ${isEditing ? 'border-brand-primary ring-2 ring-brand-primary/5 bg-white' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-center gap-2">
                            <VenusMars size={16} className="text-gray-400" />
                            <SelectValue placeholder="Selecciona una opción" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro / Prefiero no decir</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          {!isEditing ? (
            <Button 
                onClick={() => setIsEditing(true)} 
                className="w-full sm:flex-1 bg-brand-primary hover:bg-brand-dark text-white font-bold h-12 rounded-2xl shadow-lg transition-all transform active:scale-95"
            >
              <Edit3 className="w-4 h-4 mr-2" /> Habilitar Edición
            </Button>
          ) : (
            <>
              <Button 
                variant="ghost" 
                onClick={() => setIsEditing(false)} 
                disabled={isLoading} 
                className="w-full sm:w-auto text-gray-400 font-bold hover:text-brand-dark order-2 sm:order-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading} 
                className="w-full sm:flex-1 bg-brand-primary hover:bg-brand-dark text-white font-bold h-12 rounded-2xl shadow-xl shadow-brand-primary/20 order-1 sm:order-2"
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                Guardar Cambios
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;