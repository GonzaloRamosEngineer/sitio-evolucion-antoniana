import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const GuestRegistrationForm = ({ activityId, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'El nombre es requerido.';
    if (!email.trim()) {
      newErrors.email = 'El email es requerido.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'El formato del email no es válido.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit({ name, email });
    } catch (error) {
      // El error se maneja en el componente padre (Activities.jsx o ActivityDetailPage.jsx)
      // Aquí solo nos aseguramos de detener el loading
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="space-y-2">
        <Label htmlFor="guest-name" className="text-marron-legado">Nombre Completo</Label>
        <Input
          id="guest-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Ana Pérez"
          className="border-marron-legado/30 focus:border-primary-antoniano"
          disabled={loading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="guest-email" className="text-marron-legado">Correo Electrónico</Label>
        <Input
          id="guest-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ej: ana.perez@ejemplo.com"
          className="border-marron-legado/30 focus:border-primary-antoniano"
          disabled={loading}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="w-full sm:w-auto border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario">
          Cancelar
        </Button>
        <Button type="submit" variant="antoniano" disabled={loading} className="w-full sm:w-auto text-white">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Confirmar Inscripción'
          )}
        </Button>
      </div>
    </form>
  );
};

export default GuestRegistrationForm;