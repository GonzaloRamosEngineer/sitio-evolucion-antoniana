import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { getBenefits, addBenefit, updateBenefit, deleteBenefit, getPartners } from '@/lib/storage';
import { Link } from 'react-router-dom';

const categories = [
  { value: 'educacion', label: 'Educación' },
  { value: 'salud', label: 'Salud' },
  { value: 'deportes', label: 'Deportes' },
  { value: 'gastronomia', label: 'Gastronomía' },
  { value: 'bienestar', label: 'Bienestar' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'cultura', label: 'Cultura' },
];

const emptyForm = {
  titulo: '',
  descripcion: '',
  categoria: 'educacion',
  imagen_url: '',
  fecha_inicio: '',
  fecha_fin: '',
  estado: 'activo',
  // nuevos:
  slug: '',
  instrucciones: '',
  terminos: '',
  codigo: '',
  codigo_descuento: '',
  descuento: '',
  sitio_web: '',
  contacto_email: '',
  partner_id: '',
};

const nullify = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v])
  );

const BenefitsAdmin = () => {
  const [benefits, setBenefits] = useState([]);
  const [partners, setPartners] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadData = async () => {
    const [bens, parts] = await Promise.all([getBenefits(), getPartners()]);
    setBenefits(bens);
    setPartners(parts);
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingBenefit(null);
    setFormData(emptyForm);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = nullify({
      ...formData,
      // asegurar fechas en formato date o null
      fecha_inicio: formData.fecha_inicio || null,
      fecha_fin: formData.fecha_fin || null,
    });

    if (editingBenefit) {
      await updateBenefit(editingBenefit.id, payload);
      toast({
        title: 'Beneficio actualizado ✅',
        description: 'El beneficio ha sido actualizado correctamente',
      });
    } else {
      await addBenefit(payload);
      toast({
        title: 'Beneficio creado ✅',
        description: 'El nuevo beneficio ha sido agregado',
      });
    }

    resetForm();
    setIsDialogOpen(false);
    loadData();
  };

  const handleEdit = (benefit) => {
    setEditingBenefit(benefit);
    setFormData({
      titulo: benefit.titulo || '',
      descripcion: benefit.descripcion || '',
      categoria: benefit.categoria || 'educacion',
      imagen_url: benefit.imagen_url || '',
      fecha_inicio: benefit.fecha_inicio || '',
      fecha_fin: benefit.fecha_fin || '',
      estado: benefit.estado || 'activo',
      // nuevos:
      slug: benefit.slug || '',
      instrucciones: benefit.instrucciones || '',
      terminos: benefit.terminos || '',
      codigo: benefit.codigo || '',
      codigo_descuento: benefit.codigo_descuento || '',
      descuento: benefit.descuento || '',
      sitio_web: benefit.sitio_web || '',
      contacto_email: benefit.contacto_email || '',
      partner_id: benefit.partner_id || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este beneficio?')) {
      await deleteBenefit(id);
      loadData();
      toast({
        title: 'Beneficio eliminado',
        description: 'El beneficio ha sido eliminado permanentemente',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Beneficios</h2>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Beneficio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBenefit ? 'Editar Beneficio' : 'Nuevo Beneficio'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    required
                    value={formData.titulo}
                    onChange={(e) => handleChange('titulo', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="categoria">Categoría *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => handleChange('categoria', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  required
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="imagen_url">URL de Imagen</Label>
                  <Input
                    id="imagen_url"
                    type="url"
                    value={formData.imagen_url || ''}
                    onChange={(e) => handleChange('imagen_url', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="estado">Estado *</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => handleChange('estado', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio || ''}
                    onChange={(e) => handleChange('fecha_inicio', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_fin">Fecha Fin</Label>
                  <Input
                    id="fecha_fin"
                    type="date"
                    value={formData.fecha_fin || ''}
                    onChange={(e) => handleChange('fecha_fin', e.target.value)}
                  />
                </div>
              </div>

              {/* Relación con Partner (opcional) */}
              <div>
                <Label htmlFor="partner_id">Partner (opcional)</Label>
                <Select
                  value={formData.partner_id || ''}
                  onValueChange={(value) => handleChange('partner_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin partner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin partner</SelectItem>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campos de detalle gestionables */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instrucciones">Instrucciones</Label>
                  <Textarea
                    id="instrucciones"
                    value={formData.instrucciones || ''}
                    onChange={(e) => handleChange('instrucciones', e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="terminos">Términos y condiciones</Label>
                  <Textarea
                    id="terminos"
                    value={formData.terminos || ''}
                    onChange={(e) => handleChange('terminos', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo || ''}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="codigo_descuento">Código (alternativo)</Label>
                  <Input
                    id="codigo_descuento"
                    value={formData.codigo_descuento || ''}
                    onChange={(e) => handleChange('codigo_descuento', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="descuento">Descuento (texto)</Label>
                  <Input
                    id="descuento"
                    placeholder="Ej: 10% OFF, 2x1, etc."
                    value={formData.descuento || ''}
                    onChange={(e) => handleChange('descuento', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sitio_web">Sitio web</Label>
                  <Input
                    id="sitio_web"
                    type="url"
                    value={formData.sitio_web || ''}
                    onChange={(e) => handleChange('sitio_web', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contacto_email">Email de contacto</Label>
                  <Input
                    id="contacto_email"
                    type="email"
                    value={formData.contacto_email || ''}
                    onChange={(e) => handleChange('contacto_email', e.target.value)}
                  />
                </div>
              </div>

              {/* Slug opcional (si lo dejás vacío, el trigger lo genera del título) */}
              <div>
                <Label htmlFor="slug">Slug (opcional)</Label>
                <Input
                  id="slug"
                  placeholder="si lo dejás vacío se autogenera"
                  value={formData.slug || ''}
                  onChange={(e) => handleChange('slug', e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingBenefit ? 'Actualizar' : 'Crear'} Beneficio
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancelar
                </Button>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Título</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Categoría</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Slug</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Fecha</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {benefits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No hay beneficios registrados
                  </td>
                </tr>
              ) : (
                benefits.map((benefit, index) => (
                  <motion.tr
                    key={benefit.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{benefit.titulo}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{benefit.descripcion}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                        {benefit.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          benefit.estado === 'activo'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {benefit.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {benefit.slug ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {benefit.slug}
                          </span>
                          <Link
                            to={`/beneficios/${benefit.slug}`}
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {benefit.created_at ? new Date(benefit.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(benefit)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(benefit.id)}
                          className="text-red-600 hover:text-red-700"
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
