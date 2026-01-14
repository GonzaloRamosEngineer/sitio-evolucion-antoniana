import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EducationForm from '@/components/Forms/EducationForm';

const Preinscripcion = () => {
  const [isSuccess, setIsSuccess] = useState(false);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-brand-sand flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-lg">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black text-brand-dark mb-4 uppercase tracking-tighter">¡Preinscripción Exitosa!</h2>
          <p className="text-gray-500 mb-8 italic">Tus datos han sido enviados correctamente. Pronto recibirás novedades en tu teléfono o correo.</p>
          <Button className="bg-brand-dark rounded-xl h-12 px-8 font-black text-white hover:bg-brand-primary transition-colors" onClick={() => window.location.href = '/'}>VOLVER AL INICIO</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <section className="bg-brand-dark pt-24 pb-40 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 blur-[100px] rounded-full -mr-20 -mt-20" />
        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-4">
          <div className="flex justify-center gap-4 mb-4 opacity-80">
             <div className="h-8 w-24 bg-white/10 rounded flex items-center justify-center text-[10px] text-white font-bold">MINISTERIO</div>
             <div className="h-8 w-24 bg-brand-primary/20 rounded flex items-center justify-center text-[10px] text-brand-sand font-bold">FUNDACIÓN</div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
            Educación Permanente <br />
            <span className="text-brand-gold">Jóvenes y Adultos</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto italic">Iniciá o finalizá tus estudios en el Centro Juventud Antoniana. Un espacio para tu crecimiento.</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 -mt-32 relative z-20">
        <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-gray-100">
          {/* Componente Modular Inyectado */}
          <EducationForm onSuccess={() => setIsSuccess(true)} />
          
          <div className="pt-8 mt-8 border-t border-gray-50 flex items-center gap-3 text-gray-400">
             <ShieldCheck size={16} className="text-brand-gold" />
             <p className="text-[10px] font-bold uppercase tracking-tighter leading-none">Tu información será utilizada únicamente con fines administrativos y de planificación educativa.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preinscripcion;