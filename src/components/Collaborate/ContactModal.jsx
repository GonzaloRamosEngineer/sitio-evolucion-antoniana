import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const ContactModal = ({ open, onOpenChange, collaborationType }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const subject = `Interés de colaboración: ${collaborationType}`;
    const emailBody = `
      Nombre: ${name}
      Email: ${email}
      Tipo de Colaboración: ${collaborationType}
      Mensaje:
      ${message}
    `;

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          recipient_email: 'info@evolucionantoniana.com', 
          subject: subject,
          text_content: emailBody,
          html_content: `<p><strong>Nombre:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Tipo de Colaboración:</strong> ${collaborationType}</p><p><strong>Mensaje:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
        },
      });

      if (error) throw error;

      toast({
        title: "¡Mensaje Enviado!",
        description: "Gracias por tu interés. Nos pondremos en contacto contigo pronto.",
        variant: "default",
      });
      setName('');
      setEmail('');
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending contact email:", error);
      toast({
        title: "Error al enviar mensaje",
        description: "Hubo un problema al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde o contáctanos directamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-blanco-fundacion border-celeste-complementario">
        <DialogHeader>
          <DialogTitle className="text-primary-antoniano text-2xl font-poppins">Contacto para Colaborar</DialogTitle>
          <DialogDescription className="text-marron-legado">
            Dejanos tus datos y mensaje. Nos comunicaremos a la brevedad.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-marron-legado">
                Nombre
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3 border-celeste-complementario focus:ring-primary-antoniano"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-marron-legado">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3 border-celeste-complementario focus:ring-primary-antoniano"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right text-marron-legado">
                Mensaje
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="col-span-3 border-celeste-complementario focus:ring-primary-antoniano"
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario/50">
              Cancelar
            </Button>
            <Button type="submit" variant="antoniano" disabled={isLoading} className="text-white">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enviar Mensaje
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactModal;