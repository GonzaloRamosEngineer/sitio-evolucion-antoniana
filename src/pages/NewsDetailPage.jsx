// src/pages/NewsDetailPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  Check,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNewsBySlug, getNewsById } from "@/lib/storage";

const isUuid = (v = "") =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );

const toPlainText = (value = "") => {
  // Limpia saltos y espacios raros para que description quede linda
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
};

const truncate = (value = "", max = 180) => {
  const text = toPlainText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const NewsDetailPage = () => {
  const params = useParams();
  const routeParam = params.slug ?? params.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!routeParam) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = isUuid(routeParam)
          ? await getNewsById(routeParam)
          : await getNewsBySlug(routeParam);

        if (active) setItem(data);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [routeParam]);

  const slugOrId = useMemo(() => item?.slug || routeParam, [item, routeParam]);

  const origin =
    typeof window === "undefined" ? "" : window.location.origin;

  // URL real (la de tu SPA)
  const canonicalUrl = `${origin}/novedades/${slugOrId}`;

const shareUrl = `${origin}/api/share/news/${encodeURIComponent(slugOrId)}`;


  // Datos para Helmet (esto no afecta WhatsApp, pero sí tu navegador/SEO básico)
  const title = item?.title || "Novedad - Fundación Evolución Antoniana";
  const description = truncate(item?.content || "", 180);

  // Links de compartir
  // IMPORTANTE: WhatsApp -> SOLO link (evita duplicación con la tarjeta OG)
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareUrl)}`;

  // Twitter/X: acá sí conviene texto + url
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    title
  )}&url=${encodeURIComponent(shareUrl)}`;

  // Facebook/LinkedIn: solo la URL
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    shareUrl
  )}`;

  const copyToClipboard = async () => {
    // IMPORTANTE: copiamos SOLO el shareUrl (evita duplicación)
    const text = shareUrl;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }

      setCopied(true);
      if (navigator.vibrate) navigator.vibrate(40);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.warn("No se pudo copiar el enlace");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-sand">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-4 bg-brand-primary rounded-full mb-2 animate-bounce"></div>
          <p className="text-brand-primary font-medium">Cargando noticia...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-brand-sand px-4">
        <h1 className="text-3xl font-bold text-brand-dark mb-4 font-poppins">
          Noticia no encontrada
        </h1>
        <p className="text-gray-600 mb-8">
          La noticia que buscas no existe o ha sido eliminada.
        </p>
        <Link to="/novedades">
          <Button className="bg-brand-primary hover:bg-brand-dark text-white">
            Volver a Novedades
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-sand font-sans">
      <Helmet>
        <title>{title} - Fundación Evolución Antoniana</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <main className="flex-1 py-12 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Navegación Back */}
          <Link
            to="/novedades"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-brand-action transition-colors mb-8 font-medium text-sm group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Volver a todas las novedades
          </Link>

          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-white/50">
              {/* Imagen Principal */}
              {item.image_url && (
                <div className="w-full h-64 md:h-[450px] overflow-hidden relative">
                  <img
                    src={item.image_url}
                    alt={title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                </div>
              )}

              <div className="p-6 md:p-12">
                {/* Meta Data */}
                <div className="flex items-center gap-2 text-brand-gold font-bold text-xs uppercase tracking-wider mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(item.created_at).toLocaleDateString("es-AR", {
                      dateStyle: "long",
                    })}
                  </span>
                </div>

                {/* Título Principal */}
                <h1 className="text-3xl md:text-5xl font-extrabold text-brand-dark mb-6 leading-tight font-poppins">
                  {title}
                </h1>

                {/* Bajada / Intro */}
                <p className="text-xl text-gray-600 mb-10 leading-relaxed font-medium border-l-4 border-brand-gold pl-6">
                  {item.content}
                </p>

                {/* Separador */}
                <hr className="border-gray-100 my-8" />

                {/* Cuerpo Markdown (Estilizado para la marca) */}
                {item.body_md && (
                  <div
                    className="
                      prose prose-lg max-w-none text-gray-700
                      prose-headings:font-poppins prose-headings:font-bold prose-headings:text-brand-dark
                      prose-a:text-brand-action hover:prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline
                      prose-strong:text-brand-dark
                      prose-blockquote:border-brand-primary prose-blockquote:bg-brand-sand prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                      prose-img:rounded-2xl prose-img:shadow-lg
                    "
                    dangerouslySetInnerHTML={{ __html: item.body_md }}
                  />
                )}

                {/* Sección Compartir */}
                <div className="mt-16 pt-8 border-t border-gray-100">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">
                    Compartir esta noticia
                  </p>

                  <div className="flex flex-wrap justify-center gap-3">
                    <a
                      href={facebookHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                      >
                        <Facebook className="h-4 w-4 mr-2" /> Facebook
                      </Button>
                    </a>

                    <a
                      href={twitterHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200 transition-all"
                      >
                        <Twitter className="h-4 w-4 mr-2" /> Twitter (X)
                      </Button>
                    </a>

                    <a
                      href={linkedinHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
                      >
                        <Linkedin className="h-4 w-4 mr-2" /> LinkedIn
                      </Button>
                    </a>

                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all"
                      >
                        <svg
                          viewBox="0 0 32 32"
                          width="16"
                          height="16"
                          className="mr-2 fill-current"
                          aria-hidden="true"
                        >
                          <path d="M19.11 17.2c-.27-.15-1.59-.86-1.84-.96-.25-.09-.43-.15-.62.15-.18.27-.72.96-.88 1.15-.16.18-.32.2-.59.07-.27-.14-1.12-.41-2.13-1.31-.79-.7-1.32-1.57-1.48-1.83-.15-.27-.02-.42.11-.56.11-.11.25-.29.36-.43.12-.14.16-.25.25-.41.09-.18.04-.33-.02-.46-.06-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.46.07-.7.33-.25.27-.93.91-.93 2.22s.96 2.58 1.09 2.76c.14.18 1.88 2.86 4.56 4 .64.28 1.14.45 1.53.58.64.2 1.22.17 1.68.1.51-.08 1.59-.65 1.81-1.28.22-.64.22-1.18.15-1.29-.07-.11-.25-.18-.52-.33zM16.02 4C9.94 4 5 8.93 5 15c0 1.94.52 3.75 1.43 5.32L5 27l6.86-1.8A10.95 10.95 0 0 0 16.02 26c6.07 0 11-4.94 11-11s-4.93-11-11-11zm0 20c-1.86 0-3.58-.54-5.02-1.46l-.36-.23-4.06 1.07 1.09-3.95-.25-.4A8.88 8.88 0 0 1 7.02 15c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 9-9 9z" />
                        </svg>
                        WhatsApp
                      </Button>
                    </a>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className={`rounded-full transition-all border-gray-200 ${
                        copied
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "hover:bg-gray-50"
                      }`}
                      title="Copia el enlace optimizado para previsualización"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {copied ? (
                          <motion.span
                            key="check"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="inline-flex items-center"
                          >
                            <Check className="h-4 w-4 mr-2" /> Copiado
                          </motion.span>
                        ) : (
                          <motion.span
                            key="copy"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="inline-flex items-center"
                          >
                            <Copy className="h-4 w-4 mr-2" /> Copiar Enlace
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </div>

                  {/* Tip opcional (profesional y evita confusiones) */}
                  <p className="mt-4 text-center text-xs text-gray-400">
                    Este enlace está optimizado para previsualización en WhatsApp, Facebook y LinkedIn.
                  </p>
                </div>
              </div>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
};

export default NewsDetailPage;
