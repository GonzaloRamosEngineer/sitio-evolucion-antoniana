import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Tag, ArrowLeft, Info, CheckCircle, Globe, Mail, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBenefits } from '@/lib/storage';
import { toast } from '@/components/ui/use-toast';

const slugify = (s = '') =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const fmt = (d) => new Date(d).toLocaleDateString();

const BenefitDetailPage = () => {
  const { slug, id } = useParams(); // slug preferido, id compat
  const navigate = useNavigate();

  const [benefit, setBenefit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBenefit = async () => {
      setLoading(true);
      const all = await getBenefits();

      let found = null;

      if (slug) {
        found = (all || []).find((b) => (b.slug || slugify(b.titulo)) === slug);
      } else if (id) {
        found = (all || []).find((b) => String(b.id) === String(id));
        if (found) {
          const canonical = found.slug || slugify(found.titulo);
          navigate(`/beneficios/${canonical}`, { replace: true });
        }
      }

      setBenefit(found || null);
      setLoading(false);
    };

    fetchBenefit();
  }, [slug, id, navigate]);

  const handleCopyCode = async () => {
    const code = benefit?.codigo || benefit?.codigo_descuento || 'HOLA10';
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Código copiado', description: `Pegalo al comprar: ${code}` });
    } catch {
      toast({ title: 'No pude copiar el código', description: `Usá manualmente: ${code}` });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando beneficio...</p>
      </div>
    );
  }

  if (!benefit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-3xl font-bold mb-4">Beneficio no encontrado</h1>
        <p className="text-gray-600 mb-6">
          El beneficio que buscas no existe o ha sido eliminado.
        </p>
        <Link to="/beneficios">
          <Button>Volver a Beneficios</Button>
        </Link>
      </div>
    );
  }

  const canonical = benefit.slug || slugify(benefit.titulo);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Helmet>
        <title>{benefit.titulo} - Fundación Evolución Antoniana</title>
        <meta name="description" content={benefit.descripcion} />
        {/* <link rel="canonical" href={`https://www.evolucionantoniana.com/beneficios/${canonical}`} /> */}
      </Helmet>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Link
            to="/beneficios"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a todos los beneficios
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Imagen / header */}
              <div className="h-64 md:h-80 bg-gray-50 flex items-center justify-center">
                {benefit.imagen_url ? (
                  <img
                    src={benefit.imagen_url}
                    alt={benefit.titulo}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-sky-200 flex items-center justify-center">
                    <Tag className="h-24 w-24 text-blue-300" />
                  </div>
                )}
              </div>

              <div className="p-8 md:p-12">
                {/* Categoría */}
                {benefit.categoria && (
                  <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full mb-4 capitalize">
                    {benefit.categoria}
                  </span>
                )}

                {/* Título */}
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                  {benefit.titulo}
                </h1>

                {/* Descripción */}
                <div className="prose prose-lg max-w-none text-gray-700 mb-8">
                  <p>{benefit.descripcion}</p>
                </div>

                {/* Bloque informativo (todo gestionable desde DB) */}
                <div className="bg-gray-100 rounded-lg p-6 space-y-4 mb-8">
                  {/* Cómo obtenerlo */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">¿Cómo obtener el beneficio?</h3>
                      <p className="text-gray-600">
                        {benefit.instrucciones ||
                          'Ingresá a la web del comercio, elegí tus productos y aplicá el código al finalizar la compra.'}
                      </p>
                      {(benefit.codigo || benefit.codigo_descuento) && (
                        <p className="mt-2 text-gray-800">
                          Código:{' '}
                          <strong className="text-blue-600">
                            {benefit.codigo || benefit.codigo_descuento}
                          </strong>
                        </p>
                      )}
                      {benefit.descuento && (
                        <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-700">
                          <Percent className="h-4 w-4" />
                          {benefit.descuento}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Validez */}
                  {(benefit.fecha_inicio || benefit.fecha_fin) && (
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">Validez</h3>
                        <p className="text-gray-600">
                          {benefit.fecha_inicio && `Desde ${fmt(benefit.fecha_inicio)}`}
                          {benefit.fecha_fin && ` hasta ${fmt(benefit.fecha_fin)}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Términos */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                      <Info className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Términos y condiciones</h3>
                      <p className="text-gray-600 whitespace-pre-line break-words">
                        {benefit.terminos?.trim() ||
                          'Uso personal. Puede no acumular con otras promos. Sujeto a stock y políticas del comercio.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-4 mb-6">
                  {benefit.sitio_web && (
                    <a href={benefit.sitio_web} target="_blank" rel="noopener noreferrer">
                      <Button size="lg" variant="outline">
                        <Globe className="mr-2 h-5 w-5" />
                        Ir al sitio
                      </Button>
                    </a>
                  )}
                  {benefit.contacto_email && (
                    <a href={`mailto:${benefit.contacto_email}`}>
                      <Button size="lg" variant="outline">
                        <Mail className="mr-2 h-5 w-5" />
                        Contactar
                      </Button>
                    </a>
                  )}
                  <Button size="lg" onClick={handleCopyCode}>
                    Obtener código
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default BenefitDetailPage;
