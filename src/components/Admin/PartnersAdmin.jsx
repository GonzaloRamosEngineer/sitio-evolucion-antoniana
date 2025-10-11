import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Trash2, ExternalLink, Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { getPartners, updatePartner, deletePartner, addPartner } from '@/lib/storage';

const PartnersAdmin = () => {
  const [partners, setPartners] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    contacto_email: '',
    sitio_web: '',
    logo_url: '',
    estado: 'pendiente',
  });

  const loadPartners = async () => {
    const data = await getPartners();
    setPartners(data);
  };
  
  useEffect(() => {
    loadPartners();
  }, []);

  const resetForm = () => {
    setEditingPartner(null);
    setFormData({
      nombre: '',
      descripcion: '',
      contacto_email: '',
      sitio_web: '',
      logo_url: '',
      estado: 'pendiente',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingPartner) {
      await updatePartner(editingPartner.id, formData);
      toast({ title: "Partner actualizado ✅" });
    } else {
      await addPartner(formData);
      toast({ title: "Partner creado ✅" });
    }
    resetForm();
    loadPartners();
    setIsDialogOpen(false);
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setFormData({
      nombre: partner.nombre,
      descripcion: partner.descripcion,
      contacto_email: partner.contacto_email,
      sitio_web: partner.sitio_web || '',
      logo_url: partner.logo_url || '',
      estado: partner.estado,
    });
    setIsDialogOpen(true);
  };

  const handleApprove = async (id) => {
    await updatePartner(id, { estado: 'aprobado' });
    loadPartners();
    toast({
      title: "Partner aprobado ✅",
      description: "El partner ha sido aprobado y ahora es visible públicamente",
    });
  };

  const handleReject = async (id) => {
    await updatePartner(id, { estado: 'rechazado' });
    loadPartners();
    toast({
      title: "Partner rechazado",
      description: "El partner ha sido rechazado",
      variant: "destructive",
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este partner?')) {
      await deletePartner(id);
      loadPartners();
      toast({
        title: "Partner eliminado",
        description: "El partner ha sido eliminado permanentemente",
      });
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (estado) => {
    const badges = {
      pendiente: 'bg-amber-100 text-amber-800',
      aprobado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800',
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Partners</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPartner ? 'Editar Partner' : 'Nuevo Partner'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input id="nombre" required value={formData.nombre} onChange={(e) => handleChange('nombre', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea id="descripcion" required value={formData.descripcion} onChange={(e) => handleChange('descripcion', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="contacto_email">Email de Contacto *</Label>
                <Input id="contacto_email" type="email" required value={formData.contacto_email} onChange={(e) => handleChange('contacto_email', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sitio_web">Sitio Web</Label>
                <Input id="sitio_web" type="url" value={formData.sitio_web} onChange={(e) => handleChange('sitio_web', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="logo_url">URL del Logo</Label>
                <Input id="logo_url" type="url" value={formData.logo_url} onChange={(e) => handleChange('logo_url', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select value={formData.estado} onValueChange={(value) => handleChange('estado', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="aprobado">Aprobado</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">{editingPartner ? 'Actualizar' : 'Crear'} Partner</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Fecha</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {partners.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">No hay partners registrados</td></tr>
              ) : (
                partners.map((partner, index) => (
                  <motion.tr key={partner.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-bold">{partner.nombre.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{partner.nombre}</p>
                          {partner.sitio_web && (
                            <a href={partner.sitio_web} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />Sitio web
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{partner.contacto_email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(partner.estado)}`}>{partner.estado}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(partner.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {partner.estado === 'pendiente' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleApprove(partner.id)} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(partner.id)} className="text-red-600 hover:text-red-700"><X className="h-4 w-4" /></Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleEdit(partner)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(partner.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PartnersAdmin;