// src/pages/club/PostularComercioPage.jsx
//
// §12.10.5 — «hoy un comercio no tiene por dónde pedir entrar».
//
// §12.3 imaginó este formulario sobre la base de `ApplyPartnerPage`, y de ahí
// sale el patrón: `react-hook-form` + `zod` + honeypot. La diferencia con aquel
// es DÓNDE escribe, y no es un detalle:
//
//   `ApplyPartnerPage` inserta en `partners`, la tabla real del catálogo.
//   Esto inserta en `club_postulaciones`, que es una bandeja de entrada.
//
// El motivo está largo en la migración `20260906140000`; el corto es que
// `club_comercios.slug` es UNIQUE y lo genera la entidad al aprobar. Con
// inserts públicos sobre la tabla real, el primero que se postule como «la
// pizzería» se queda con el slug bueno.
//
// ⚠️ Y ACÁ NO SE PUEDE LEER NADA. La policy le da a `anon` INSERT y nada más,
// así que esta pantalla no puede —ni debe poder— mostrar «tu postulación está
// en revisión». Una postulación trae mail y teléfono de una persona; con SELECT
// abierto, cualquiera se bajaría el padrón de comercios interesados.
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2, Loader2, Send, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Eyebrow } from '@/components/ui/eyebrow';
import { toast } from '@/components/ui/use-toast';
import { Honeypot } from '@/components/Forms/Honeypot';
import { postularComercio } from '@/api/clubApi';
import { tituloPagina } from '@/config/entidad';

const urlOpcional = z
  .string()
  .trim()
  .refine((v) => v === '' || z.string().url().safeParse(v).success, {
    message: 'Ingresá una URL completa (https://...)',
  });

const esquema = z.object({
  nombre: z.string().trim().min(2, 'Ingresá el nombre del comercio'),
  rubro: z.string().trim().optional(),
  contacto_nombre: z.string().trim().optional(),
  contacto_email: z.string().trim().email('Ingresá un email válido'),
  contacto_telefono: z.string().trim().optional(),
  direccion: z.string().trim().optional(),
  sitio_web: urlOpcional,
  // El mínimo de 20 es el mismo que exige el CHECK de la base. Si esto se
  // aflojara, el insert fallaría con un error de Postgres en vez de con un
  // mensaje que se entienda.
  propuesta: z
    .string()
    .trim()
    .min(20, 'Contanos en al menos 20 caracteres qué beneficio querrías ofrecer'),
});

const vacio = {
  nombre: '',
  rubro: '',
  contacto_nombre: '',
  contacto_email: '',
  contacto_telefono: '',
  direccion: '',
  sitio_web: '',
  propuesta: '',
};

const Campo = ({ id, label, opcional, error, children }) => (
  <div>
    <Label htmlFor={id} className="text-brand-dark font-semibold">
      {label}
      {opcional && <span className="ml-1 font-normal text-brand-dark/60">(opcional)</span>}
    </Label>
    {children}
    {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
  </div>
);

const PostularComercioPage = () => {
  // El honeypot queda fuera de RHF a propósito: no se valida ni se envía.
  const [website, setWebsite] = useState('');
  const [enviado, setEnviado] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(esquema), defaultValues: vacio });

  const onSubmit = async (valores) => {
    if (website) {
      // Un bot completó el campo escondido. Se responde como si todo hubiera
      // salido bien: decirle que se lo detectó es enseñarle a evitarlo.
      setEnviado(true);
      return;
    }

    const { error } = await postularComercio(valores);
    if (error) {
      toast({
        title: 'No pudimos enviar tu solicitud',
        description: 'Probá de nuevo en un rato, o escribinos por los canales de contacto.',
        variant: 'destructive',
      });
      return;
    }
    setEnviado(true);
  };

  if (enviado) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Helmet>
          <title>{tituloPagina('Solicitud enviada')}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12 text-green-600" />
        <h1 className="mt-4 text-2xl font-display font-bold text-brand-dark">
          Recibimos tu solicitud
        </h1>
        <p className="mt-3 text-sm text-brand-dark/70">
          Alguien del equipo la va a revisar y se va a comunicar al mail que dejaste para
          terminar de definir el beneficio junto con vos.
        </p>
        {/* §12.3: al principio la redacción del beneficio la controla la
            entidad, porque ahí se generan casi todos los conflictos de
            mostrador. Conviene decirlo desde el primer contacto. */}
        <Button asChild variant="outline" className="mt-8">
          <Link to="/beneficios">Ver los beneficios del club</Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl px-4 py-10 sm:py-14"
    >
      <Helmet>
        <title>{tituloPagina('Sumá tu comercio al club')}</title>
        <meta
          name="description"
          content="Ofrecé un beneficio a quienes sostienen la fundación y llegá a nuevos clientes."
        />
      </Helmet>

      <Eyebrow>Club de beneficios</Eyebrow>
      <h1 className="mt-3 text-3xl font-display font-bold text-brand-dark sm:text-4xl">
        Sumá tu comercio al club
      </h1>
      <p className="mt-3 text-brand-dark/70">
        Ofrecés un descuento a quienes sostienen la fundación y, a cambio, te damos
        difusión y los números de cuánta gente te trajo el club.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-sm border border-brand-dark/10 bg-brand-light/40 p-4">
        <Store aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-dark/50" />
        <p className="text-sm text-brand-dark/70">
          No hace falta que tengas un sistema ni que instales nada. Cuando el beneficio esté
          acordado te mandamos un acceso para validar los códigos desde el teléfono del
          mostrador — y si preferís no usarlo, también se puede.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <Honeypot value={website} onChange={(e) => setWebsite(e.target.value)} />

        <Campo id="nombre" label="Nombre del comercio" error={errors.nombre?.message}>
          <Input id="nombre" {...register('nombre')} className="mt-1" />
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="rubro" label="Rubro" opcional error={errors.rubro?.message}>
            <Input id="rubro" placeholder="Gastronomía, óptica…" {...register('rubro')} className="mt-1" />
          </Campo>
          <Campo id="direccion" label="Dirección" opcional error={errors.direccion?.message}>
            <Input id="direccion" {...register('direccion')} className="mt-1" />
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            id="contacto_nombre"
            label="Tu nombre"
            opcional
            error={errors.contacto_nombre?.message}
          >
            <Input id="contacto_nombre" {...register('contacto_nombre')} className="mt-1" />
          </Campo>
          <Campo id="contacto_email" label="Email" error={errors.contacto_email?.message}>
            <Input id="contacto_email" type="email" {...register('contacto_email')} className="mt-1" />
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            id="contacto_telefono"
            label="Teléfono"
            opcional
            error={errors.contacto_telefono?.message}
          >
            <Input id="contacto_telefono" {...register('contacto_telefono')} className="mt-1" />
          </Campo>
          <Campo id="sitio_web" label="Sitio web" opcional error={errors.sitio_web?.message}>
            <Input id="sitio_web" placeholder="https://" {...register('sitio_web')} className="mt-1" />
          </Campo>
        </div>

        <Campo id="propuesta" label="¿Qué beneficio te imaginás?" error={errors.propuesta?.message}>
          <Textarea
            id="propuesta"
            rows={4}
            placeholder="Por ejemplo: 15% de descuento de lunes a jueves, sin mínimo de compra."
            {...register('propuesta')}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-brand-dark/60">
            No tiene que estar cerrado. Lo terminamos de definir juntos.
          </p>
        </Campo>

        <Button type="submit" variant="action" disabled={isSubmitting} className="w-full py-6 text-base">
          {isSubmitting ? (
            <>
              <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <Send aria-hidden="true" className="mr-2 h-5 w-5" />
              Enviar la solicitud
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
};

export default PostularComercioPage;
