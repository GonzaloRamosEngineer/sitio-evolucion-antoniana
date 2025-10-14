import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { getNews, addNews, updateNews, deleteNews } from '@/lib/storage';

const NewsAdmin = () => {
  const [news, setNews] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    body_md: '',      // NUEVO: cuerpo largo (HTML/Markdown)
  });

  const loadNews = async () => {
    const data = await getNews();
    setNews(data);
  };
  
  useEffect(() => {
    loadNews();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingNews) {
      await updateNews(editingNews.id, formData);
      toast({
        title: "Noticia actualizada ✅",
        description: "La noticia ha sido actualizada correctamente",
      });
    } else {
      await addNews({ ...formData });
      toast({
        title: "Noticia creada ✅",
        description: "La nueva noticia ha sido publicada",
      });
    }

    resetForm();
    loadNews();
    setIsDialogOpen(false);
  };

  const handleEdit = (newsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      image_url: newsItem.image_url || '',
      body_md: newsItem.body_md || '',   // NUEVO
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta noticia?')) {
      await deleteNews(id);
      loadNews();
      toast({
        title: "Noticia eliminada",
        description: "La noticia ha sido eliminada permanentemente",
      });
    }
  };

  const resetForm = () => {
    setEditingNews(null);
    setFormData({
      title: '',
      content: '',
      image_url: '',
      body_md: '',      // NUEVO
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Novedades</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Noticia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingNews ? 'Editar Noticia' : 'Nueva Noticia'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="content">Contenido (bajada) *</Label>
                <Textarea
                  id="content"
                  required
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  rows={8}
                  placeholder="Resumen corto que se ve en la tarjeta (subtítulo)."
                />
              </div>

              {/* NUEVO: cuerpo largo */}
              <div>
                <Label htmlFor="body_md">Cuerpo (HTML/Markdown)</Label>
                <Textarea
                  id="body_md"
                  value={formData.body_md}
                  onChange={(e) => handleChange('body_md', e.target.value)}
                  rows={14}
                  placeholder='Ejemplo: 
<h3>Programa EPJA</h3>
<p>La cursada es gratuita, presencial y virtual.</p>
<p><a href="https://forms.gle/..." target="_blank" rel="noreferrer">Inscribirme ahora</a></p>'
                />
                <p className="text-xs text-gray-500 mt-1">
                  Podés pegar HTML simple o Markdown. Links y saltos de línea son soportados.
                </p>
              </div>

              <div>
                <Label htmlFor="image_url">URL de Imagen de Portada</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingNews ? 'Actualizar' : 'Publicar'} Noticia
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Fecha de Publicación</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {news.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                    No hay noticias publicadas
                  </td>
                </tr>
              ) : (
                news.map((newsItem, index) => (
                  <motion.tr
                    key={newsItem.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{newsItem.title}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(newsItem.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(newsItem)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(newsItem.id)}
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

export default NewsAdmin;
