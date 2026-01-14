import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, X, Trash2, ExternalLink, Plus, Edit, 
  Handshake, Mail, Globe, Clock, AlertCircle, 
  CheckCircle2, ArrowUpDown, Search, Image as ImageIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter, DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { getPartners, updatePartner, deletePartner, addPartner } from '@/lib/storage';

const PartnersAdmin = () => {
  const [partners, setPartners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    colaboracion_detalle: '',
    contacto_email: '',
    sitio_web: '',
    logo_url: '',
    estado: 'pendiente',
    orden: 1000,
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
      nombre: '', descripcion: '', colaboracion_detalle: '',
      contacto_email: '', sitio_web: '', logo_url: '',
      estado: 'pendiente', orden: 1000,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      sitio_web: formData.sitio_web || null,
      logo_url: formData.logo_url || null,
      colaboracion_detalle: formData.colaboracion_detalle || null,
      orden: Number.isFinite(Number(formData.orden)) ? Number(formData.orden) : 1000,
    };

    try {
      if (editingPartner) {
        await updatePartner(editingPartner.id, payload);
        toast({ title: 'Partner actualizado ✅', description: 'Los datos se sincronizaron correctamente.' });
      } else {
        await addPartner(payload);
        toast({ title: 'Partner creado ✅', description: 'El nuevo aliado ha sido registrado.' });
      }
      resetForm();
      loadPartners();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo procesar la solicitud.', variant: 'destructive' });
    }
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setFormData({
      nombre: partner.nombre,
      descripcion: partner.descripcion,
      colaboracion_detalle: partner.colaboracion_detalle || '',
      contacto_email: partner.contacto_email,
      sitio_web: partner.sitio_web || '',
      logo_url: partner.logo_url || '',
      estado: partner.estado,
      orden: partner.orden ?? 1000,
    });
    setIsDialogOpen(true);
  };

  const handleApprove = async (id) => {
    await updatePartner(id, { estado: 'aprobado' });
    loadPartners();
    toast({ title: 'Partner aprobado ✅', description: 'Ahora es visible en la sección de aliados.' });
  };

  const handleReject = async (id) => {
    await updatePartner(id, { estado: 'rechazado' });
    loadPartners();
    toast({ title: 'Partner rechazado', description: 'El estado se ha actualizado a rechazado.', variant: 'destructive' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este aliado? Esta acción es permanente.')) {
      await deletePartner(id);
      loadPartners();
      toast({ title: 'Partner eliminado', description: 'El registro ha sido borrado.' });
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const filteredPartners = partners.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.contacto_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-brand-sand p-2 rounded-xl">
            <Handshake className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand-dark font-poppins">Gestión de Partners</h2>
            <p className="text-sm text-gray-500">Administra las empresas y organizaciones aliadas.</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-xl shadow-md transition-all">
          <Plus className="mr-2 h-5 w-5" />
          Nuevo Partner
        </Button>
      </div>

      {/* BUSCADOR */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
            placeholder="Buscar por nombre o email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 border-gray-200 focus:border-brand-primary rounded-xl bg-white shadow-sm"
        />
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-none p-0 bg-white shadow-2xl">
          <DialogHeader className="bg-brand-sand p-8 border-b border-gray-100">
            <DialogTitle className="text-2xl font-poppins font-bold text-brand-dark">
              {editingPartner ? 'Editar Aliado' : 'Registrar Nuevo Aliado'}
            </DialogTitle>
            <DialogDescription>
                Información institucional y detalles de colaboración.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="nombre" className="font-bold text-brand-dark">Nombre de la Organización *</Label>
                <Input
                  id="nombre"
                  required
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="Ej: Banco Macro, Techint, etc."
                  className="h-11 border-gray-200 focus:border-brand-primary rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado" className="font-bold text-brand-dark">Estado</Label>
                <Select value={formData.estado} onValueChange={(value) => handleChange('estado', value)}>
                  <SelectTrigger className="h-11 border-gray-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl">
                    <SelectItem value="pendiente" className="text-amber-600 font-medium">Pendiente</SelectItem>
                    <SelectItem value="aprobado" className="text-green-600 font-medium">Aprobado</SelectItem>
                    <SelectItem value="rechazado" className="text-red-600 font-medium">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="font-bold text-brand-dark">Descripción Institucional *</Label>
              <Textarea
                id="descripcion"
                required
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                rows={3}
                placeholder="Breve reseña de la organización..."
                className="border-gray-200 focus:border-brand-primary rounded-xl p-4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="colaboracion_detalle" className="font-bold text-brand-dark">Detalle de la Alianza (Opcional)</Label>
              <Textarea
                id="colaboracion_detalle"
                value={formData.colaboracion_detalle}
                onChange={(e) => handleChange('colaboracion_detalle', e.target.value)}
                placeholder="¿Cómo nos ayudan? Ej: Aportan infraestructura, becas, etc."
                rows={3}
                className="border-gray-200 focus:border-brand-primary rounded-xl p-4 bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contacto_email" className="font-bold text-brand-dark flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Institucional *
                </Label>
                <Input
                  id="contacto_email"
                  type="email"
                  required
                  value={formData.contacto_email}
                  onChange={(e) => handleChange('contacto_email', e.target.value)}
                  placeholder="contacto@empresa.com"
                  className="h-11 border-gray-200 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sitio_web" className="font-bold text-brand-dark flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Sitio Web
                </Label>
                <Input
                  id="sitio_web"
                  type="url"
                  value={formData.sitio_web}
                  onChange={(e) => handleChange('sitio_web', e.target.value)}
                  placeholder="https://www.aliado.com"
                  className="h-11 border-gray-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="space-y-2">
                    <Label htmlFor="logo_url" className="text-xs uppercase font-bold text-gray-400 flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" /> URL del Logo (Transparente preferible)
                    </Label>
                    <Input id="logo_url" type="url" value={formData.logo_url} onChange={(e) => handleChange('logo_url', e.target.value)} className="h-10 border-gray-200 bg-white rounded-xl text-sm" placeholder="https://..." />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="orden" className="text-xs uppercase font-bold text-gray-400 flex items-center gap-2">
                        <ArrowUpDown className="w-3 h-3" /> Prioridad de visualización
                    </Label>
                    <Input id="orden" type="number" min={1} value={formData.orden} onChange={(e) => handleChange('orden', e.target.value)} className="h-10 border-gray-200 bg-white rounded-xl text-sm" />
                </div>
            </div>

            <DialogFooter className="pt-6 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-gray-400 hover:text-brand-dark">
                Cancelar
              </Button>
              <Button type="submit" className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-10 rounded-xl shadow-lg transition-all h-12">
                {editingPartner ? 'Actualizar Registro' : 'Registrar Aliado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TABLA DE CONTENIDO */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-sand border-b border-gray-100 text-brand-dark text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Organización</th>
                <th className="px-6 py-4">Contacto / Web</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-center">Prioridad</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">
                    No se encontraron aliados registrados.
                  </td>
                </tr>
              ) : (
                filteredPartners.sort((a, b) => (a.orden || 1000) - (b.orden || 1000)).map((partner, index) => (
                  <motion.tr
                    key={partner.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-brand-sand/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                            {partner.logo_url ? (
                                <img src={partner.logo_url} alt="" className="w-full h-full object-contain p-1" />
                            ) : (
                                <span className="text-brand-primary font-bold text-xl font-poppins">{partner.nombre.charAt(0)}</span>
                            )}
                        </div>
                        <div className="max-w-[200px]">
                            <p className="font-bold text-brand-dark group-hover:text-brand-primary transition-colors">{partner.nombre}</p>
                            <p className="text-[10px] text-gray-400 line-clamp-1">{partner.descripcion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Mail size={12} className="text-brand-gold" /> {partner.contacto_email}
                        </div>
                        {partner.sitio_web && (
                            <a href={partner.sitio_web} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline text-xs">
                                <Globe size={12} /> Sitio Web <ExternalLink size={10} />
                            </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border-none shadow-sm ${
                        partner.estado === 'aprobado' ? 'bg-green-50 text-green-700' : 
                        partner.estado === 'pendiente' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {partner.estado}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className="text-xs font-mono font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            #{partner.orden ?? 1000}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {partner.estado === 'pendiente' && (
                          <div className="flex gap-1 mr-2 pr-2 border-r border-gray-200">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => handleApprove(partner.id)}>
                              <CheckCircle2 size={16} />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleReject(partner.id)}>
                              <AlertCircle size={16} />
                            </Button>
                          </div>
                        )}
                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-brand-primary hover:bg-brand-primary hover:text-white border border-gray-100 shadow-sm" onClick={() => handleEdit(partner)}>
                          <Edit size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-500 hover:text-white border border-gray-100 shadow-sm" onClick={() => handleDelete(partner.id)}>
                          <Trash2 size={16} />
                        </Button>
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