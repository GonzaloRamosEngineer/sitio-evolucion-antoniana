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
import { Loader2, Edit, Save } from 'lucide-react';

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
        className: "bg-green-500 text-white dark:bg-green-600 dark:text-primary-foreground"
      });
      onUpdateSuccess({ ...user, ...updatedProfile });
      setIsEditing(false);
      setIsOpen(false);
    }
  };

  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setIsEditing(false); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full mt-4 border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario dark:border-primary dark:text-primary dark:hover:bg-accent">
            <Edit className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-blanco-fundacion dark:bg-card">
        <DialogHeader>
          <DialogTitle className="text-primary-antoniano dark:text-primary">Editar Perfil</DialogTitle>
          <DialogDescription className="text-marron-legado/90 dark:text-muted-foreground">
            Realizá cambios en tu perfil aquí. Hacé clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right text-marron-legado dark:text-foreground">Email</Label>
            <Input id="email" value={user?.email || ''} className="col-span-3 bg-muted/50 dark:bg-input/50" disabled />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-marron-legado dark:text-foreground">Nombre</Label>
            <Input id="name" value={formData.name} onChange={handleChange} className="col-span-3" disabled={!isEditing} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right text-marron-legado dark:text-foreground">Teléfono</Label>
            <Input id="phone" value={formData.phone} onChange={handleChange} className="col-span-3" disabled={!isEditing} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dni" className="text-right text-marron-legado dark:text-foreground">DNI</Label>
            <Input id="dni" value={formData.dni} onChange={handleChange} className="col-span-3" disabled={!isEditing} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="birth_date" className="text-right text-marron-legado dark:text-foreground">Nacimiento</Label>
            <Input id="birth_date" type="date" value={formData.birth_date} onChange={handleChange} className="col-span-3" disabled={!isEditing} />
          </div>
        </div>
        <DialogFooter>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="w-full" variant="antoniano">
              <Edit className="w-4 h-4 mr-2" /> Habilitar Edición
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isLoading} className="w-full" variant="antoniano">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Cambios
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;