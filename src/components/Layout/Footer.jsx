import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Twitter, 
  MessageSquare, 
  Zap 
} from 'lucide-react';
import { motion } from 'framer-motion';

const Footer = () => {
  const footerSections = [
    {
      title: 'Navegación',
      links: [
        { name: 'Inicio', href: '/' },
        { name: 'Sobre Nosotros', href: '/about' },
        { name: 'Actividades', href: '/activities' },
        { name: 'Colaborá', href: '/collaborate' },
        { name: 'Contacto', href: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Política de Privacidad', href: '/privacy' },
        { name: 'Términos de Uso', href: '/terms' },
        { name: 'Transparencia', href: '/legal-documents' },
      ],
    },
  ];

  const socialLinks = [
    { icon: Facebook, href: 'https://www.facebook.com/FundacionEvolucionAntoniana/', name: 'Facebook' },
    { icon: Instagram, href: 'https://www.instagram.com/evolucionantoniana', name: 'Instagram' },
    { icon: Linkedin, href: 'https://www.linkedin.com/company/fundacionevolucionantoniana', name: 'LinkedIn' },
    { icon: Twitter, href: 'https://x.com/evoluantoniana', name: 'X (Twitter)' },
    { icon: MessageSquare, href: 'https://wa.me/543872131916?text=Hola%2C%20quiero%20sumarme%20a%20la%20red%20solidaria', name: 'WhatsApp' },
  ];

  const contactInfo = [
    { icon: MapPin, text: 'Salta, Argentina' },
    { icon: Phone, text: '+54 387 213-1916', href: 'tel:+543872131916' },
    { icon: Mail, text: 'info@evolucionantoniana.com', href: 'mailto:info@evolucionantoniana.com' },
  ];

  return (
    <footer className="bg-brand-dark text-white relative overflow-hidden font-sans">
      
      {/* Decoración superior (Línea de marca) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-brand-gold to-brand-action"></div>

      {/* Fondo sutil */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Columna 1: Marca */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center space-x-3"
            >
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/5">
                 {/* Logo imagen o inicial */}
                 <img src="/img/transparente.png" alt="Logo" className="w-full h-full object-contain p-1" onError={(e) => e.target.style.display = 'none'} />
                 {/* Fallback si no carga imagen */}
                 <span className="text-brand-primary font-bold text-xl absolute">E</span>
              </div>
              <div>
                <p className="text-xl font-poppins font-bold leading-none text-white">Fundación</p>
                <p className="text-xl font-poppins font-bold text-brand-gold leading-none">Evolución</p>
              </div>
            </motion.div>
            
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              Organización sin fines de lucro legalmente constituida en Salta, Argentina. Impulsamos oportunidades y transformamos vidas a través de la tecnología y el deporte.
            </p>

            <div className="flex gap-3">
               {socialLinks.map((social) => (
                 <a 
                   key={social.name}
                   href={social.href}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-10 h-10 rounded-full bg-white/5 hover:bg-brand-primary/20 flex items-center justify-center text-gray-400 hover:text-brand-gold transition-all duration-300 hover:scale-110 border border-white/5 hover:border-brand-primary/30"
                   aria-label={social.name}
                 >
                   <social.icon size={18} />
                 </a>
               ))}
            </div>
          </div>

          {/* Columna 2: Navegación */}
          <div>
            <h3 className="text-lg font-poppins font-bold mb-6 text-white border-l-4 border-brand-action pl-3">Explorar</h3>
            <ul className="space-y-3">
              {footerSections[0].links.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-brand-gold transition-colors duration-300 text-sm flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 bg-brand-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3: Legal */}
          <div>
            <h3 className="text-lg font-poppins font-bold mb-6 text-white border-l-4 border-brand-gold pl-3">Legal</h3>
            <ul className="space-y-3">
              {footerSections[1].links.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-white transition-colors duration-300 text-sm hover:underline decoration-brand-gold/50 underline-offset-4"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h3 className="text-lg font-poppins font-bold mb-6 text-white border-l-4 border-brand-primary pl-3">Contacto</h3>
            <ul className="space-y-4">
              {contactInfo.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-400 group">
                  <item.icon className="w-5 h-5 text-brand-gold mt-0.5 group-hover:text-white transition-colors" />
                  {item.href ? (
                    <a href={item.href} className="hover:text-white transition-colors border-b border-transparent hover:border-gray-500">
                      {item.text}
                    </a>
                  ) : (
                    <span>{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* --- BARRA INFERIOR --- */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs text-gray-500 text-center md:text-left">
            © {new Date().getFullYear()} Fundación Evolución Antoniana. Todos los derechos reservados.
          </p>

          {/* --- FIRMA DIGITAL MATCH GLOBAL (Estilo Matukana) --- */}
          <a 
            href="https://www.digitalmatchglobal.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 border border-white/5 hover:border-[#2563EB]/50 transition-all duration-500 overflow-hidden"
          >
            {/* Efecto de brillo en background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2563EB]/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium group-hover:text-gray-300 transition-colors">Made by</span>
            
            <span className="text-xs font-bold bg-gradient-to-r from-[#2563EB] to-[#6D5DFE] bg-clip-text text-transparent transition-all duration-300 group-hover:brightness-125">
                DigitalMatchGlobal
            </span>
            
            <Zap size={12} className="text-gray-600 group-hover:text-[#6D5DFE] group-hover:fill-[#6D5DFE] transition-all duration-300" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;