// src/pages/NotFound.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { ArrowLeft, Home } from 'lucide-react';

const NotFound = () => (
  <>
    <Helmet>
      <title>Página no encontrada — Fundación Evolución Antoniana</title>
      <meta name="robots" content="noindex" />
    </Helmet>

    <section className="min-h-[60vh] flex items-center justify-center px-4 py-24">
      <div className="max-w-xl text-center space-y-6">
        <Eyebrow className="justify-center">Error 404</Eyebrow>
        <h1 className="text-3xl md:text-4xl font-bold text-brand-dark">
          No encontramos esta página
        </h1>
        <p className="text-brand-dark/70">
          Puede que el enlace esté mal escrito o que la página ya no exista.
          Si llegaste hasta acá desde otro sitio, avisanos así lo corregimos.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild className="rounded-sm">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Ir al inicio
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-sm">
            <Link to="/contact">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Contactanos
            </Link>
          </Button>
        </div>
      </div>
    </section>
  </>
);

export default NotFound;
