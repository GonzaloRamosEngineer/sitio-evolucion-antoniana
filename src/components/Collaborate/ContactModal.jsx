import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, Send, User, Mail, MessageSquare } from 'lucide-react';

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
        className: "bg-green-600 text-white border-none"
      });
      setName('');
      setEmail('');
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending contact email:", error);
      toast({
        title: "Error al enviar mensaje",
        description: "Hubo un problema al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden">
        
        {/* Header con estilo de marca */}
        <div className="bg-brand-sand p-6 border-b border-gray-100">
            <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-poppins text-brand-dark flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-brand-primary" />
                Hablemos
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-base">
                ¿Te interesa colaborar como {collaborationType?.toLowerCase() || 'partner'}? Déjanos tus datos y te contactaremos.
            </DialogDescription>
            </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-brand-dark font-semibold">Nombre Completo</Label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl transition-all"
                        placeholder="Tu nombre"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email" className="text-brand-dark font-semibold">Email de Contacto</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl transition-all"
                        placeholder="tu@email.com"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="message" className="text-brand-dark font-semibold">Tu Mensaje</Label>
                <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl p-4 min-h-[120px]"
                    placeholder="Cuéntanos cómo te gustaría participar o qué dudas tienes..."
                    required
                />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => onOpenChange(false)} 
                    className="text-gray-500 hover:text-brand-dark hover:bg-gray-100"
                >
                    Cancelar
                </Button>
                <Button 
                    type="submit" 
                    className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-6 rounded-xl shadow-md transition-all"
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar Mensaje
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactModal;