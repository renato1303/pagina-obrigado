import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Check, Briefcase
} from 'lucide-react';
import { LeadData, IntegrationConfig } from '../types';

interface WhatsAppDirectPageProps {
  lead: LeadData;
}

export default function WhatsAppDirectPage({ lead }: WhatsAppDirectPageProps) {
  useEffect(() => {
    const storedConfig = localStorage.getItem('sensesales_integrations_config');
    if (storedConfig) {
      try {
        const config: IntegrationConfig = JSON.parse(storedConfig);
        // Track conversion event on page load
        if (config.metaPixelId && config.metaPixelId !== '1234567890') {
          if ((window as any).fbq) {
            (window as any).fbq('track', 'CompleteRegistration', {
              content_name: 'Candidatura Time Comercial - Obrigado'
            });
          }
        }
        if (config.gaTrackingId && config.gaTrackingId !== 'G-XXXXXXXXXX') {
          if ((window as any).gtag) {
            (window as any).gtag('event', 'complete_registration', {
              page_title: 'Candidatura Time Comercial - Obrigado'
            });
          }
        }
      } catch (err) {}
    }
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 text-left font-sans" id="thank-you-page-card">
      
      {/* Main Thank You Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-[32px] p-6 sm:p-10 bg-white border border-gray-200 shadow-sm relative overflow-hidden text-center space-y-6"
      >
        <div className="w-16 h-16 bg-[#008060]/10 border border-[#008060]/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
          <Check className="w-8 h-8 text-[#008060]" />
        </div>

        <div className="space-y-3 max-w-lg mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#008060]/10 text-[#008060] border border-[#008060]/20 uppercase tracking-wider">
            <Briefcase className="w-3.5 h-3.5" />
            Candidatura • Time Comercial
          </span>
          
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-gray-900 tracking-tight leading-tight">
            {lead.nome ? `Obrigado pela candidatura, ${lead.nome}!` : 'Obrigado pela sua candidatura!'}
          </h1>
          
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Recebemos o seu formulário para a vaga no time comercial da <strong className="text-gray-900 font-semibold">Será Cacau</strong>. 
            Nossa equipe de recrutamento vai analisar o seu perfil e entraremos em contato <strong className="text-[#008060] font-bold">nas próximas 24h</strong> com os próximos passos do processo seletivo.
          </p>
        </div>
      </motion.div>

    </div>
  );
}
