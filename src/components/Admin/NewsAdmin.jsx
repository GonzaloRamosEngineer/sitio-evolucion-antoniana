import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit, FileText, Image as ImageIcon, Calendar, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { getNews, addNews, updateNews, deleteNews } from '@/lib/storage';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { useSearch } from '@/components/Admin/shared/useSearch';

const NewsAdmin = () => {
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { query, setQuery, filtered: filteredNews } = useSearch(news, ['title']);
  const [editingNews, setEditingNews] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    body_md: '',
  });

  const loadNews = async () => {
    try {
      const data = await getNews();
      setNews(data);
    } catch (e) {
      console.error('Error cargando noticias:', e);
      setNews([]);
      toast({ variant: 'destructive', title: 'Error al cargar noticias', description: 'No se pudieron obtener las noticias.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadNews();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
        if (editingNews) {
            await updateNews(editingNews.id, formData);
            toast({ title: "Noticia actualizada ✅", description: "Los cambios se guardaron correctamente." });
        } else {
            await addNews({ ...formData });
            toast({ title: "Noticia creada ✅", description: "La noticia ya está disponible en la web." });
        }
        resetForm();
        loadNews();
        setIsDialogOpen(false);
    } catch (error) {
        toast({ title: "Error", description: "No se pudo procesar la solicitud", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEdit = (newsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      image_url: newsItem.image_url || '',
      body_md: newsItem.body_md || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta noticia? Esta acción no se puede deshacer.')) {
      setDeletingId(id);
      try {
        await deleteNews(id);
        loadNews();
        toast({ title: "Noticia eliminada", description: "El registro ha sido borrado." });
      } finally {
        setDeletingId(null);
      }
    }
  };

  const resetForm = () => {
    setEditingNews(null);
    setFormData({ title: '', content: '', image_url: '', body_md: '' });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader
          icon={FileText}
          title="Gestión de Novedades"
          description="Publica noticias y actualizaciones para la comunidad."
        />
        <ListSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={FileText}
        title="Gestión de Novedades"
        description="Publica noticias y actualizaciones para la comunidad."
        actions={
          <Button onClick={() => setIsDialogOpen(true)} variant="action">
            <Plus className="mr-2 h-4 w-4" />
            Nueva novedad
          </Button>
        }
      />

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Buscar por título..."
        count={filteredNews.length}
        countLabel={filteredNews.length === 1 ? 'noticia' : 'noticias'}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border-none p-0 bg-white shadow-2xl">
          <DialogHeader className="bg-brand-sand p-8 border-b border-gray-100">
            <DialogTitle className="text-2xl font-poppins font-bold text-brand-dark">
              {editingNews ? 'Editar Noticia' : 'Publicar Nueva Noticia'}
            </DialogTitle>
            <DialogDescription>
                Completa los campos para dar formato a la novedad.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-bold text-brand-dark">Título de la Noticia *</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Ej: Gran éxito en la colecta anual"
                className="h-12 border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="font-bold text-brand-dark">Resumen (Bajada) *</Label>
              <Textarea
                id="content"
                required
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                rows={3}
                placeholder="Un texto corto que atrape al lector en el listado principal."
                className="border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body_md" className="font-bold text-brand-dark flex items-center gap-2">
                <FileText className="w-4 h-4" /> Cuerpo de la Noticia (HTML/Markdown)
              </Label>
              <Textarea
                id="body_md"
                value={formData.body_md}
                onChange={(e) => handleChange('body_md', e.target.value)}
                rows={10}
                placeholder="Aquí va todo el desarrollo de la noticia..."
                className="border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl font-mono text-sm"
              />
              <p className="text-[10px] text-gray-400 italic">Soporta etiquetas HTML básicas y formato Markdown.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url" className="font-bold text-brand-dark flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> URL de Imagen de Portada
              </Label>
              <Input
                id="image_url"
                type="url"
                value={formData.image_url}
                onChange={(e) => handleChange('image_url', e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="h-12 border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl"
              />
            </div>

            <DialogFooter className="pt-6 gap-3">
              <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => setIsDialogOpen(false)} className="text-gray-500 font-bold">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} variant="action" className="px-8 rounded-xl">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingNews ? 'Guardar Cambios' : 'Publicar Ahora'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {filteredNews.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {news.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Todavía no hay noticias publicadas"
              description="Publicá la primera novedad para que aparezca en la web."
              action={
                <Button onClick={() => setIsDialogOpen(true)} variant="action">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva novedad
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description={`No se encontraron noticias para "${query}". Probá con otro término.`}
            />
          )}
        </div>
      ) : (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-sand border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-dark uppercase tracking-widest">Noticia</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-dark uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-brand-dark uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredNews.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-brand-sand/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                            {item.image_url ? (
                                <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-300">
                                    <ImageIcon size={16} />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-bold text-brand-dark group-hover:text-brand-primary transition-colors line-clamp-1">{item.title}</p>
                            <p className="text-xs text-gray-400 line-clamp-1">{item.content}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar size={14} className="text-brand-gold" />
                            {new Date(item.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-xl text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-sm border border-gray-100"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={deletingId === item.id}
                          className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-gray-100"
                          onClick={() => handleDelete(item.id)}
                        >
                          {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

export default NewsAdmin;