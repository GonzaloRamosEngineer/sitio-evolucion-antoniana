import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { escapeHtml, escapeHtmlMultiline } from '@/lib/utils';
import { Honeypot } from '@/components/Forms/Honeypot';
import { Loader2, Send, User, Mail, MessageSquare } from 'lucide-react';

const collaborationSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá tu nombre completo'),
  email: z.string().trim().email('Ingresá un email válido'),
  message: z.string().trim().min(10, 'Contanos en al menos 10 caracteres cómo querés participar'),
});

const emptyForm = { name: '', email: '', message: '' };

// Mismo estilo de input que Contact (ROADMAP 5.12): fondo arena, borde hairline
// y esquinas rectas, en vez del gris/rounded-xl que traía este modal.
const inputStyles =
  'h-11 bg-brand-sand/70 border-brand-dark/15 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-sm';

const ContactModal = ({ open, onOpenChange, collaborationType }) => {
  // El honeypot no se valida ni se envía: queda fuera del form de RHF a propósito.
  const [website, setWebsite] = useState('');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(collaborationSchema),
    defaultValues: emptyForm,
  });

  const closeWithSuccess = () => {
    toast({
      title: '¡Mensaje enviado!',
      description: 'Gracias por tu interés. Nos pondremos en contacto con vos pronto.',
      className: 'bg-green-600 text-white border-none',
    });
    reset(emptyForm);
    onOpenChange(false);
  };

  const onSubmit = async (data) => {
    if (website) {
      // Bot detectado: simular éxito sin enviar nada
      closeWithSuccess();
      return;
    }

    const emailBody = `
      Nombre: ${data.name}
      Email: ${data.email}
      Tipo de Colaboración: ${collaborationType}
      Mensaje:
      ${data.message}
    `;

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          recipient_email: 'info@evolucionantoniana.com',
          subject: `Interés de colaboración: ${collaborationType}`,
          text_content: emailBody,
          html_content:
            `<p><strong>Nombre:</strong> ${escapeHtml(data.name)}</p>` +
            `<p><strong>Email:</strong> ${escapeHtml(data.email)}</p>` +
            `<p><strong>Tipo de Colaboración:</strong> ${escapeHtml(collaborationType)}</p>` +
            `<p><strong>Mensaje:</strong></p>` +
            `<p>${escapeHtmlMultiline(data.message)}</p>`,
          reply_to: data.email,
        },
      });

      if (error) throw error;

      closeWithSuccess();
    } catch (error) {
      console.error('Error sending contact email:', error);
      toast({
        title: 'Error al enviar mensaje',
        description: 'Hubo un problema al enviar tu mensaje. Por favor, intentalo de nuevo más tarde.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-sm shadow-2xl border-none p-0 overflow-hidden">

        {/* Header con estilo de marca */}
        <div className="bg-brand-sand p-6 border-b border-brand-dark/10">
            <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-poppins text-brand-dark flex items-center gap-2">
                <MessageSquare aria-hidden="true" className="w-6 h-6 text-brand-primary" />
                Hablemos
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
                ¿Te interesa colaborar como {collaborationType?.toLowerCase() || 'partner'}? Dejanos tus datos y te contactamos.
            </DialogDescription>
            </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 relative" noValidate>
            <Honeypot value={website} onChange={(e) => setWebsite(e.target.value)} />
            <div className="space-y-2">
                <Label htmlFor="collab-name" className="text-brand-dark font-semibold">Nombre completo</Label>
                <div className="relative">
                    <User aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        id="collab-name"
                        placeholder="Tu nombre"
                        autoComplete="name"
                        className={inputStyles + ' pl-10'}
                        disabled={isSubmitting}
                        {...register('name')}
                    />
                </div>
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="collab-email" className="text-brand-dark font-semibold">Email de contacto</Label>
                <div className="relative">
                    <Mail aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        id="collab-email"
                        type="email"
                        placeholder="tu@email.com"
                        autoComplete="email"
                        className={inputStyles + ' pl-10'}
                        disabled={isSubmitting}
                        {...register('email')}
                    />
                </div>
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="collab-message" className="text-brand-dark font-semibold">Tu mensaje</Label>
                <Textarea
                    id="collab-message"
                    className="bg-brand-sand/70 border-brand-dark/15 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-sm p-4 min-h-[120px]"
                    placeholder="Contanos cómo te gustaría participar o qué dudas tenés..."
                    disabled={isSubmitting}
                    {...register('message')}
                />
                {errors.message && <p className="text-sm text-red-600">{errors.message.message}</p>}
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                    className="text-gray-600 hover:text-brand-dark hover:bg-gray-100"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    variant="action"
                    className="px-6"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar mensaje
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactModal;
