import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Trash2, Edit, Tag, Image as ImageIcon, 
  ArrowUpDown, Calendar, CheckCircle2, AlertCircle,
  Layers, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { getBenefits, addBenefit, updateBenefit, deleteBenefit } from '@/lib/storage';

const categories = [
  { value: 'educacion', label: 'Educación' },
  { value: 'salud', label: 'Salud' },
  { value: 'deportes', label: 'Deportes' },
  { value: 'gastronomia', label: 'Gastronomía' },
  { value: 'bienestar', label: 'Bienestar' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'cultura', label: 'Cultura' },
  { value: 'otros', label: 'Otros' },
];

const BenefitsAdmin = () => {
  const [benefits, setBenefits] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'educacion',
    imagen_url: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'activo',
    orden: 1000,
  });

  const loadBenefits = async () => {
    const data = await getBenefits();
    setBenefits(data);
  };

  useEffect(() => {
    loadBenefits();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      orden: Number.isFinite(Number(formData.orden)) ? Number(formData.orden) : 1000,
    };

    try {
      if (editingBenefit) {
        await updateBenefit(editingBenefit.id, payload);
        toast({ 
          title: 'Beneficio actualizado ✅', 
          description: 'Los cambios se han guardado correctamente.' 
        });
      } else {
        await addBenefit(payload);
        toast({ 
          title: 'Beneficio creado ✅', 
          description: 'El nuevo beneficio ya está disponible.' 
        });
      }
      resetForm();
      loadBenefits();
      setIsDialogOpen(false);
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: 'Hubo un problema al guardar el beneficio.', 
        variant: 'destructive' 
      });
    }
  };

  const handleEdit = (benefit) => {
    setEditingBenefit(benefit);
    setFormData({
      titulo: benefit.titulo,
      descripcion: benefit.descripcion,
      categoria: benefit.categoria,
      imagen_url: benefit.imagen_url || '',
      fecha_inicio: benefit.fecha_inicio || '',
      fecha_fin: benefit.fecha_fin || '',
      estado: benefit.estado,
      orden: benefit.orden ?? 1000,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este beneficio? Esta acción es permanente.')) {
      await deleteBenefit(id);
      loadBenefits();
      toast({ 
        title: 'Beneficio eliminado', 
        description: 'El registro ha sido borrado de la base de datos.' 
      });
    }
  };

  const resetForm = () => {
    setEditingBenefit(null);
    setFormData({
      titulo: '',
      descripcion: '',
      categoria: 'educacion',
      imagen_url: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado: 'activo',
      orden: 1000,
    });
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
            <div className="bg-brand-sand p-2 rounded-xl">
                <Tag className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-brand-dark font-poppins">Gestión de Beneficios</h2>
                <p className="text-sm text-gray-500">Administra los convenios y descuentos para la red solidaria.</p>
            </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-xl shadow-md transition-all">
          <Plus className="mr-2 h-5 w-5" />
          Nuevo Beneficio
        </Button>
      </div>

      {/* DIALOGO DE EDICIÓN / CREACIÓN */}
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
              {editingBenefit ? 'Editar Beneficio' : 'Crear Nuevo Beneficio'}
            </DialogTitle>
            <DialogDescription>
                Completa la información que verán los usuarios en la sección de beneficios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="titulo" className="font-bold text-brand-dark">Título del Beneficio *</Label>
                <Input
                  id="titulo"
                  required
                  value={formData.titulo}
                  onChange={(e) => handleChange('titulo', e.target.value)}
                  placeholder="Ej: 20% de descuento en Librería"
                  className="h-11 border-gray-200 focus:border-brand-primary rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria" className="font-bold text-brand-dark">Categoría *</Label>
                <Select value={formData.categoria} onValueChange={(value) => handleChange('categoria', value)}>
                  <SelectTrigger className="h-11 border-gray-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="focus:bg-brand-sand">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="font-bold text-brand-dark">Descripción detallada *</Label>
              <Textarea
                id="descripcion"
                required
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                rows={3}
                placeholder="Explica cómo se aplica el beneficio y qué incluye..."
                className="border-gray-200 focus:border-brand-primary rounded-xl p-4"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="imagen_url" className="font-bold text-brand-dark flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> URL de la Imagen
                </Label>
                <Input
                  id="imagen_url"
                  type="url"
                  value={formData.imagen_url}
                  onChange={(e) => handleChange('imagen_url', e.target.value)}
                  placeholder="https://ejemplo.com/foto.jpg"
                  className="h-11 border-gray-200 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado" className="font-bold text-brand-dark">Estado de Publicación</Label>
                <Select value={formData.estado} onValueChange={(value) => handleChange('estado', value)}>
                  <SelectTrigger className="h-11 border-gray-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="activo" className="text-green-600 font-medium">Activo (Visible)</SelectItem>
                    <SelectItem value="inactivo" className="text-gray-400">Inactivo (Oculto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="space-y-1">
                <Label htmlFor="fecha_inicio" className="text-[10px] uppercase font-bold text-gray-400">Inicia el</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) => handleChange('fecha_inicio', e.target.value)}
                  className="h-9 border-none bg-white rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fecha_fin" className="text-[10px] uppercase font-bold text-gray-400">Finaliza el</Label>
                <Input
                  id="fecha_fin"
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => handleChange('fecha_fin', e.target.value)}
                  className="h-9 border-none bg-white rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="orden" className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" /> Prioridad (Orden)
                </Label>
                <Input
                  id="orden"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={formData.orden}
                  onChange={(e) => handleChange('orden', e.target.value)}
                  className="h-9 border-none bg-white rounded-lg text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-6 gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(false);
                }}
                className="font-bold text-gray-400 hover:text-brand-dark"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-10 rounded-xl shadow-lg transition-all">
                {editingBenefit ? 'Actualizar Beneficio' : 'Crear Beneficio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TABLA DE CONTENIDO */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-sand border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-dark uppercase tracking-widest">Beneficio</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-dark uppercase tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-dark uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-brand-dark uppercase tracking-widest">Prioridad</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-brand-dark uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {benefits.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">
                    No hay beneficios registrados en la base de datos.
                  </td>
                </tr>
              ) : (
                benefits.sort((a, b) => (a.orden || 1000) - (b.orden || 1000)).map((benefit, index) => (
                  <motion.tr
                    key={benefit.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-brand-sand/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                            {benefit.imagen_url ? (
                                <img src={benefit.imagen_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-300">
                                    <Tag size={18} />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-bold text-brand-dark group-hover:text-brand-primary transition-colors">{benefit.titulo}</p>
                            <p className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">{benefit.descripcion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 capitalize font-medium">
                        {benefit.categoria}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {benefit.estado === 'activo' ? (
                            <>
                                <CheckCircle2 size={14} className="text-green-500" />
                                <span className="text-xs font-bold text-green-600 uppercase">Activo</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle size={14} className="text-gray-300" />
                                <span className="text-xs font-bold text-gray-400 uppercase">Inactivo</span>
                            </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className="text-xs font-mono font-bold bg-gray-100 px-2 py-1 rounded text-gray-500 border border-gray-200">
                            #{benefit.orden ?? 1000}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 rounded-xl text-brand-primary hover:bg-brand-primary hover:text-white border border-gray-100 shadow-sm" 
                          onClick={() => handleEdit(benefit)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-500 hover:text-white border border-gray-100 shadow-sm"
                          onClick={() => handleDelete(benefit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

export default BenefitsAdmin;