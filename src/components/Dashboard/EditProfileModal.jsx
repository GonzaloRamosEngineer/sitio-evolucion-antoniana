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
import { useToast } from '@/components/ui/use-toast';
import { updateUserProfile } from '@/api/userApi';
import { Loader2, Edit3, Save, X } from 'lucide-react';

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
        title: '¡Perfil actualizado!',
        description: 'Tus datos se han guardado correctamente.',
        className: "bg-green-600 text-white border-none"
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full border-brand-primary text-brand-primary hover:bg-brand-sand">
            <Edit3 className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden">
        <DialogHeader className="bg-brand-sand p-6 border-b border-gray-100">
          <DialogTitle className="text-xl font-bold text-brand-dark font-poppins">Configuración de Perfil</DialogTitle>
          <DialogDescription className="text-gray-500">
            Mantén tus datos actualizados para una mejor experiencia.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email (No editable)</Label>
            <Input id="email" value={user?.email || ''} className="bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed" disabled />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1">
                <Label htmlFor="name" className="text-sm font-semibold text-brand-dark">Nombre Completo</Label>
                <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    disabled={!isEditing} 
                    className="focus:border-brand-primary focus:ring-brand-primary"
                />
             </div>
             <div className="space-y-1">
                <Label htmlFor="dni" className="text-sm font-semibold text-brand-dark">DNI</Label>
                <Input 
                    id="dni" 
                    value={formData.dni} 
                    onChange={handleChange} 
                    disabled={!isEditing}
                    className="focus:border-brand-primary focus:ring-brand-primary"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1">
                <Label htmlFor="phone" className="text-sm font-semibold text-brand-dark">Teléfono</Label>
                <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    disabled={!isEditing}
                    className="focus:border-brand-primary focus:ring-brand-primary"
                />
             </div>
             <div className="space-y-1">
                <Label htmlFor="birth_date" className="text-sm font-semibold text-brand-dark">Fecha de Nacimiento</Label>
                <Input 
                    id="birth_date" 
                    type="date" 
                    value={formData.birth_date} 
                    onChange={handleChange} 
                    disabled={!isEditing}
                    className="focus:border-brand-primary focus:ring-brand-primary"
                />
             </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100 flex-row gap-2 justify-end">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="antoniano" className="w-full sm:w-auto bg-brand-primary text-white">
              <Edit3 className="w-4 h-4 mr-2" /> Habilitar Edición
            </Button>
          ) : (
            <>
               <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isLoading} className="text-gray-500">
                  Cancelar
               </Button>
               <Button onClick={handleSave} disabled={isLoading} variant="antoniano" className="bg-brand-action text-white">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
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