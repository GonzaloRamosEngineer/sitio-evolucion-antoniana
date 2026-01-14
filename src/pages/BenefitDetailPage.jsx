// C:\Users\gandr\Downloads\SitioWebEvolucionAntonianaProduccion\src\pages\BenefitDetailPage.jsx

import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Tag,
  ArrowLeft,
  Info,
  CheckCircle2,
  Globe,
  Mail,
  Percent,
  ArrowRight,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBenefits, getPartnerById } from "@/lib/storage";
import { toast } from "@/components/ui/use-toast";

// Util para comparar slugs
const slugify = (s = "") =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

const fmt = (d) => new Date(d).toLocaleDateString('es-AR', { dateStyle: 'long' });

const BenefitDetailPage = () => {
  const params = useParams();
  const lookup = params.slug ?? params.id ?? "";

  const [benefit, setBenefit] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBenefit = async () => {
      setLoading(true);

      const all = await getBenefits();

      // 1) por ID exacto
      let found =
        (all || []).find((b) => String(b.id) === String(lookup)) ||
        // 2) por slug guardado
        (all || []).find((b) => b.slug && b.slug === lookup) ||
        // 3) fallback: slugify(titulo)
        (all || []).find((b) => slugify(b.titulo) === lookup);

      setBenefit(found || null);

      if (found?.partner_id) {
        const p = await getPartnerById(found.partner_id);
        setPartner(p || null);
      } else {
        setPartner(null);
      }

      setLoading(false);
    };

    fetchBenefit();
  }, [lookup]);

  const handleCopyCode = async () => {
    const code = benefit?.codigo || benefit?.codigo_descuento || "";
    if (!code) {
      toast({
        title: "🚧 Sin código disponible",
        description: "Este beneficio no requiere código o aún no fue cargado.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "¡Código copiado!",
        description: "Listo para usar en tu compra.",
        className: "bg-green-600 text-white border-none"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "No se pudo copiar",
        description: `Código manual: ${code}`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-sand">
        <div className="animate-pulse flex flex-col items-center">
            <div className="h-16 w-16 bg-brand-primary/20 rounded-full mb-4 animate-bounce"></div>
            <div className="h-4 w-32 bg-brand-primary/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (!benefit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-brand-sand px-4">
        <Tag className="w-16 h-16 text-gray-400 mb-6" />
        <h1 className="text-3xl font-bold font-poppins text-brand-dark mb-4">Beneficio no encontrado</h1>
        <p className="text-gray-600 mb-8">
          El beneficio que buscas no existe o ha sido eliminado.
        </p>
        <Link to="/beneficios">
          <Button variant="outline" className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white">
             Volver a Beneficios
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-sand font-sans">
      <Helmet>
        <title>{benefit.titulo} - Fundación Evolución Antoniana</title>
        <meta name="description" content={benefit.descripcion} />
      </Helmet>

      <main className="flex-1 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Navegación Back */}
          <div className="mb-8">
            <Link
                to="/beneficios"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-brand-action transition-colors group"
            >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Volver a todos los beneficios
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid lg:grid-cols-3 gap-8 items-start"
          >
            {/* Columna Izquierda: Imagen y Partner */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Imagen Header */}
                    <div className="bg-gray-50 w-full h-64 md:h-80 flex items-center justify-center p-8 relative">
                        {benefit.imagen_url ? (
                            <img
                            src={benefit.imagen_url}
                            alt={benefit.titulo}
                            className="w-full h-full object-contain mix-blend-multiply"
                            />
                        ) : (
                            <div className="text-center text-gray-400">
                                <Tag className="h-20 w-20 mx-auto mb-2 opacity-50" />
                                <span className="text-sm font-bold uppercase tracking-wider">Sin Imagen</span>
                            </div>
                        )}
                        {/* Categoría Badge */}
                        {benefit.categoria && (
                            <div className="absolute top-4 left-4">
                                <span className="inline-block bg-white/90 backdrop-blur-sm text-brand-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-gray-200">
                                    {benefit.categoria}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="p-8 md:p-10">
                        <h1 className="text-3xl md:text-4xl font-extrabold font-poppins text-brand-dark mb-4 leading-tight">
                            {benefit.titulo}
                        </h1>

                        {partner && (
                            <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                {partner.logo_url && (
                                    <img
                                    src={partner.logo_url}
                                    alt={partner.nombre}
                                    className="h-10 w-10 object-contain"
                                    />
                                )}
                                <div>
                                    <span className="text-xs text-gray-500 block uppercase tracking-wide font-bold">Ofrecido por</span>
                                    <Link
                                        to={`/partners/${partner.slug}`}
                                        className="font-bold text-brand-primary hover:underline inline-flex items-center"
                                    >
                                        {partner.nombre} <ArrowRight className="h-3 w-3 ml-1" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        <div className="prose prose-lg text-gray-600 mb-8">
                            <p>{benefit.descripcion}</p>
                        </div>

                        {/* Botones de acción externos */}
                        <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-100">
                             {(benefit.sitio_web || partner?.sitio_web) && (
                                <a
                                href={benefit.sitio_web || partner?.sitio_web}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1"
                                >
                                <Button size="lg" variant="outline" className="w-full border-gray-300 text-gray-700 hover:text-brand-primary hover:border-brand-primary">
                                    <Globe className="mr-2 h-4 w-4" />
                                    Ir al sitio web
                                </Button>
                                </a>
                            )}

                            {benefit.contacto_email && (
                                <a href={`mailto:${benefit.contacto_email}`} className="flex-1">
                                <Button size="lg" variant="outline" className="w-full border-gray-300 text-gray-700 hover:text-brand-primary hover:border-brand-primary">
                                    <Mail className="mr-2 h-4 w-4" />
                                    Contactar
                                </Button>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Columna Derecha: Cómo usarlo (Sticky) */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-3xl shadow-lg border border-brand-primary/10 p-6 md:p-8 sticky top-24">
                    <div className="flex items-center gap-2 mb-6 text-brand-dark">
                         <div className="p-2 bg-brand-gold/20 rounded-lg text-brand-dark">
                             <CheckCircle2 className="w-5 h-5" />
                         </div>
                         <h3 className="font-bold font-poppins text-lg">¿Cómo acceder?</h3>
                    </div>

                    {/* Pasos */}
                    <div className="space-y-6 mb-8">
                        <div>
                             <h4 className="text-sm font-bold text-gray-900 mb-2">Instrucciones</h4>
                             <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                                {benefit.instrucciones?.trim() || "Ingresá a la web del comercio, elegí tu producto y presentá este beneficio."}
                             </p>
                        </div>

                        {/* Código de Descuento */}
                        {(benefit.codigo || benefit.codigo_descuento) && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Tu Código</h4>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-brand-sand border-2 border-dashed border-brand-gold/50 rounded-xl p-3 text-center font-mono font-bold text-brand-dark text-lg tracking-wider">
                                        {benefit.codigo || benefit.codigo_descuento}
                                    </div>
                                    <Button size="icon" variant="outline" onClick={handleCopyCode} className="h-12 w-12 rounded-xl border-gray-200">
                                        {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-500" />}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {benefit.descuento && (
                            <div className="flex items-center gap-2 text-brand-action font-bold bg-red-50 p-3 rounded-xl border border-red-100 justify-center">
                                <Percent className="h-4 w-4" />
                                <span>{benefit.descuento} de descuento</span>
                            </div>
                        )}
                    </div>

                    {/* Info Adicional */}
                    <div className="space-y-4 pt-6 border-t border-gray-100">
                         {/* Validez */}
                         {(benefit.fecha_inicio || benefit.fecha_fin) && (
                            <div className="flex gap-3">
                                <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                <div>
                                    <span className="block text-xs font-bold text-gray-400 uppercase">Vigencia</span>
                                    <p className="text-sm text-gray-600">
                                        {benefit.fecha_fin ? `Hasta el ${fmt(benefit.fecha_fin)}` : 'Consultar vigencia'}
                                    </p>
                                </div>
                            </div>
                         )}

                         {/* Legales */}
                         <div className="flex gap-3">
                                <Info className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                <div>
                                    <span className="block text-xs font-bold text-gray-400 uppercase">Legales</span>
                                    <p className="text-xs text-gray-500 leading-tight">
                                        {benefit.terminos?.trim() || "Sujeto a disponibilidad y políticas del comercio adherido."}
                                    </p>
                                </div>
                         </div>
                    </div>

                    {partner?.slug && (
                        <Link to={`/partners/${partner.slug}`} className="block mt-6">
                            <Button className="w-full bg-brand-dark hover:bg-brand-primary text-white font-bold rounded-xl">
                                Ver perfil del aliado
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default BenefitDetailPage;