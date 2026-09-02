import React from "react";
import { Helmet } from "react-helmet-async";
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
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBeneficiosVidriera, useAllPartners, useMiAcceso } from "@/hooks/useContentQueries";
import { useAuth } from "@/hooks/useAuth";
import { beneficioBloqueado, SIN_ACCESO } from "@/lib/acceso";
import { accionVidriera } from "@/lib/club";
import { ResourceLoading, ResourceNotFound } from "@/components/ui/resource-state";

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

  // Reusa la caché del listado y resuelve el beneficio sobre el dato cacheado.
  const { data: benefit = null, isPending: loading } = useBeneficiosVidriera({
    select: (all) =>
      // 1) por ID exacto, 2) por slug guardado, 3) fallback slugify(titulo)
      all.find((b) => String(b.id) === String(lookup)) ??
      all.find((b) => b.slug && b.slug === lookup) ??
      all.find((b) => slugify(b.titulo) === lookup) ??
      null,
  });

  // El partner del beneficio sale de la misma caché de partners que usa el resto
  // del sitio, en vez de un `getPartnerById` suelto por cada visita al detalle.
  const { data: partner = null } = useAllPartners({
    enabled: Boolean(benefit?.partner_id),
    select: (rows) => rows.find((p) => p.id === benefit?.partner_id) ?? null,
  });

  const { user } = useAuth();
  const { data: acceso = SIN_ACCESO } = useMiAcceso(user?.id);
  const bloqueado = beneficioBloqueado(benefit, acceso);

  // Qué se le ofrece a quien está mirando esto. La decisión NO se toma acá: vive
  // en `src/lib/club.js` porque la comparten el listado, el detalle y /club, y
  // el bug de §12.10.13 fue justamente que dos pantallas del mismo beneficio
  // decidieran distinto.
  const accion = accionVidriera({ beneficio: benefit, acceso, haySesion: Boolean(user) });

  // Acá estaba `handleCopyCode`. Se fue con el bloque "Tu código": copiar al
  // portapapeles un texto fijo que ya era público no tiene a quién servirle
  // (ROADMAP §12.10.13). El código del canje se copia en /club, donde además
  // tiene un reloj que le da sentido.

  if (loading) {
    return <ResourceLoading title="Cargando beneficio… – Fundación Evolución Antoniana" />;
  }

  if (!benefit) {
    return (
      <ResourceNotFound
        icon={Tag}
        title="Beneficio no encontrado"
        description="El beneficio que buscás no existe o fue eliminado."
        backTo="/beneficios"
        backLabel="Volver a beneficios"
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-sand font-sans">
      <Helmet>
        <title>{benefit.titulo} - Fundación Evolución Antoniana</title>
        <meta name="description" content={benefit.descripcion} />
      </Helmet>

      <div className="flex-1 py-12 px-4">
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
                <div className="bg-white rounded-sm border border-brand-dark/10 overflow-hidden">
                    {/* Imagen Header */}
                    <div className="bg-brand-sand/60 w-full h-64 md:h-80 flex items-center justify-center p-8 relative">
                        {benefit.imagen_url ? (
                            <img
                            src={benefit.imagen_url}
                            alt={benefit.titulo}
                            className="w-full h-full object-contain mix-blend-multiply"
                            />
                        ) : (
                            <div className="text-center text-gray-400">
                                <Tag className="h-20 w-20 mx-auto mb-2 opacity-50" />
                                <span className="text-sm font-bold uppercase tracking-wider">Sin imagen</span>
                            </div>
                        )}
                        {/* Categoría Badge */}
                        {benefit.categoria && (
                            <div className="absolute top-4 left-4">
                                <span className="inline-block bg-white/90 text-brand-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-gray-200">
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
                            <div className="flex items-center gap-3 mb-6 p-4 bg-brand-sand/60 rounded-sm border border-brand-dark/10">
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
                <div className="bg-white rounded-sm border border-brand-dark/10 p-6 md:p-8 sticky top-24">
                    <div className="flex items-center gap-2 mb-6 text-brand-dark">
                         <div className="p-2 bg-brand-gold/20 rounded-lg text-brand-dark">
                             <CheckCircle2 className="w-5 h-5" />
                         </div>
                         <h3 className="font-bold font-poppins text-lg">¿Cómo acceder?</h3>
                    </div>

                    {/* Pasos */}
                    <div className="space-y-6 mb-8">
                        {/* Beneficio reservado: se explica cómo obtenerlo en vez
                            de mostrar el código y las instrucciones. */}
                        {bloqueado ? (
                            <div className="bg-brand-dark text-white rounded-sm p-5">
                                <div className="flex items-center gap-2 mb-3 text-brand-gold">
                                    <Lock className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">
                                        Reservado
                                    </span>
                                </div>
                                <p className="text-sm text-white/80 leading-relaxed mb-5">
                                    Este beneficio es para quienes sostienen la Fundación. Se accede con
                                    la cuota social al día o con una donación desde el valor de una cuota.
                                </p>
                                <Link to="/collaborate" className="block">
                                    <Button variant="action" className="w-full">
                                        Quiero acceder
                                    </Button>
                                </Link>
                                {!user && (
                                    <p className="text-xs text-white/60 mt-3 text-center">
                                        ¿Ya aportás?{' '}
                                        <Link to="/login" className="underline underline-offset-2 text-brand-gold">
                                            Iniciá sesión
                                        </Link>
                                    </p>
                                )}
                            </div>
                        ) : (
                        <div>
                             <h4 className="text-sm font-bold text-gray-900 mb-2">Instrucciones</h4>
                             <p className="text-sm text-gray-600 leading-relaxed bg-brand-sand/60 p-4 rounded-sm border border-brand-dark/10">
                                {benefit.instrucciones?.trim() || "Ingresá a la web del comercio, elegí tu producto y presentá este beneficio."}
                             </p>
                        </div>
                        )}

                        {/*
                          ACÁ VIVÍA "Tu código" — un texto fijo, igual para todo el
                          mundo y visible sin sesión (ROADMAP §12.10.13). No se
                          reemplaza por un código mejor guardado: se reemplaza por
                          el CTA que corresponda, porque en este modelo el código
                          lo emite la Edge Function a nombre de una persona y por
                          una sola vez. La vidriera muestra el beneficio; el canje
                          pasa en el mostrador.

                          ⚠️ SOLO cuando NO está bloqueado, y el motivo importa.
                          El panel "Reservado" de arriba YA resuelve el estado
                          bloqueado, y lo dice mejor: explica que se accede con la
                          cuota al día o con una donación. Al desplegar esto el
                          2026-09-02 los dos bloques salieron juntos y la página
                          quedó con dos mensajes y dos botones para lo mismo.
                          Una pieza nueva no se agrega sin mirar qué había: es el
                          mismo error de §12.10.13 —dos lugares decidiendo sobre
                          el mismo beneficio— cometido al arreglarlo.
                        */}
                        {!bloqueado && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-2">
                                {accion.puedeCanjear ? "Canjealo" : "¿Cómo lo obtengo?"}
                            </h4>
                            {accion.mensaje && (
                                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                    {accion.mensaje}
                                </p>
                            )}
                            {accion.cta && (
                                <Button
                                    asChild
                                    className="w-full rounded-sm"
                                    variant={accion.puedeCanjear ? "default" : "outline"}
                                >
                                    {/* Sin acceso se lo manda a aportar; con acceso, al
                                        mostrador. Nunca a un callejón sin salida. */}
                                    <Link to={accion.cta.href ?? "/club"}>{accion.cta.texto}</Link>
                                </Button>
                            )}
                        </div>
                        )}

                        {benefit.descuento && (
                            <div className="flex items-center gap-2 text-brand-action font-bold bg-brand-sand/60 p-3 rounded-sm border border-brand-dark/10 justify-center">
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
                            <Button className="w-full bg-brand-dark hover:bg-brand-primary text-white font-bold">
                                Ver perfil del aliado
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BenefitDetailPage;