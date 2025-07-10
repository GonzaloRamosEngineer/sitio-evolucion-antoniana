import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin, Facebook, Instagram, Linkedin, MessageSquare as MessageSquareText, X } from 'lucide-react';
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
        { name: 'Estatuto', href: '/estatuto' },
        { name: 'Política de Privacidad', href: '/privacy' },
        { name: 'Términos de Uso', href: '/terms' },
        { name: 'Documentos Legales', href: '/legal-documents' },
      ],
    },
  ];

  const socialLinks = [
    { icon: Facebook, href: 'https://www.facebook.com/FundacionEvolucionAntoniana/', name: 'Facebook' },
    { icon: Instagram, href: 'https://www.instagram.com/evolucionantoniana', name: 'Instagram' },
    { icon: Linkedin, href: 'https://www.linkedin.com/company/fundacionevolucionantoniana', name: 'LinkedIn' },
    { icon: X, href: 'https://x.com/evoluantoniana', name: 'X (Twitter)' },
    { icon: MessageSquareText, href: 'https://wa.me/543872131916?text=Hola%2C%20quiero%20sumarme%20a%20la%20red%20solidaria', name: 'WhatsApp' },
  ];

  const contactInfo = [
    { icon: MapPin, text: 'Salta, Argentina' },
    { icon: Phone, text: '+54 387 213-1916', href: 'tel:+543872131916' },
    { icon: Mail, text: 'contacto@evolucionantoniana.com', href: 'mailto:contacto@evolucionantoniana.com' },
  ];

  return (
    <footer className="bg-marron-legado text-blanco-fundacion">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-12">
          <div className="md:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center space-x-3 mb-6"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-azul-antoniano to-celeste-complementario rounded-xl flex items-center justify-center shadow-lg">
                <img src="https://storage.googleapis.com/hostinger-horizons-assets-prod/c93288dd-3aa0-49f8-b2c6-b145823c3caf/4def324ba6ea43660437503f1e0581ba.jpg" alt="Logo Fundación" className="w-10 h-10 rounded-md object-cover" />
              </div>
              <div>
                <p className="text-2xl font-poppins font-bold leading-tight text-blanco-fundacion">Fundación</p>
                <p className="text-2xl font-poppins font-bold text-celeste-complementario leading-tight">Evolución Antoniana</p>
              </div>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm text-blanco-fundacion/80 mb-6 max-w-md leading-relaxed"
            >
              Organización sin fines de lucro legalmente constituida en Salta, Argentina, dedicada a impulsar oportunidades y transformar vidas.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-2"
          >
            <p className="text-lg font-poppins font-semibold mb-5 uppercase tracking-wider text-celeste-complementario">{footerSections[0].title}</p>
            <ul className="space-y-3">
              {footerSections[0].links.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-blanco-fundacion/80 hover:text-celeste-complementario transition-colors duration-300 text-sm hover:underline"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="md:col-span-3"
          >
            <p className="text-lg font-poppins font-semibold mb-5 uppercase tracking-wider text-celeste-complementario">{footerSections[1].title}</p>
            <ul className="space-y-3 mb-8">
              {footerSections[1].links.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-blanco-fundacion/80 hover:text-celeste-complementario transition-colors duration-300 text-sm hover:underline"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-lg font-poppins font-semibold mb-5 uppercase tracking-wider text-celeste-complementario">Contacto</p>
            <ul className="space-y-4">
              {contactInfo.map((item) => (
                <li key={item.text} className="flex items-start space-x-3">
                  <item.icon className="w-5 h-5 text-celeste-complementario mt-0.5 flex-shrink-0" />
                  {item.href ? (
                    <a href={item.href} className="text-sm text-blanco-fundacion/80 hover:text-celeste-complementario transition-colors duration-300 hover:underline">
                      {item.text}
                    </a>
                  ) : (
                    <span className="text-sm text-blanco-fundacion/80">{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="md:col-span-3"
          >
            <p className="text-lg font-poppins font-semibold mb-5 uppercase tracking-wider text-celeste-complementario">Seguinos</p>
            <div className="flex flex-wrap gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blanco-fundacion/80 hover:text-celeste-complementario transition-colors duration-300 p-2 bg-blanco-fundacion/10 hover:bg-blanco-fundacion/20 rounded-lg flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 3 }}
                  whileTap={{ scale: 0.95 }}
                  title={social.name}
                >
                  <social.icon className="w-6 h-6" />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="border-t border-blanco-fundacion/20 mt-16 pt-8"
        >
          <div className="flex justify-center items-center">
            <a 
              href="https://digitalmatchglobal.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-blanco-fundacion/60 hover:text-celeste-complementario transition-colors duration-300 text-center"
            >
              <p>© Copyright DigitalMatchGlobal. All Rights Reserved</p>
              <p className="mt-1">Designed by DigitalMatchGlobal</p>
            </a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;