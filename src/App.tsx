import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Check, Lock, Calendar
} from 'lucide-react';
import { 
  INITIAL_LEAD_DATA, DEFAULT_INTEGRATIONS_CONFIG, calculateLeadScore 
} from './data';
import { LeadData, IntegrationConfig, BookedMeeting } from './types';
import { createClient } from '@supabase/supabase-js';
import AdminPanel from './components/AdminPanel';
import WhatsAppDirectPage from './components/WhatsAppDirectPage';
import ThankYouPage from './components/ThankYouPage';

export default function App() {
  const [lead, setLead] = useState<LeadData>(INITIAL_LEAD_DATA);
  const [bookedMeeting, setBookedMeeting] = useState<BookedMeeting | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Admin and Password-protection State fields
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('sensesales_admin_logged_in') === 'true';
  });
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  const [deviceInfo, setDeviceInfo] = useState({ os: 'Unknown', browser: 'Unknown' });

  // Parse lead parameters, UTM params, and device info on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Extract lead parameters passed via URL redirect from responda.seracacau.com.br
    const nome = params.get('nome') || params.get('name') || params.get('first_name') || '';
    const empresa = params.get('empresa') || params.get('company') || '';
    const email = params.get('email') || '';
    const whatsapp = params.get('whatsapp') || params.get('phone') || params.get('telefone') || params.get('celular') || '';
    const segmento = params.get('segmento') || params.get('segment') || '';
    const trabalhaComCacau = params.get('trabalhaComCacau') || params.get('trabalha_com_cacau') || params.get('cacau') || '';
    const faturamento = params.get('faturamento') || params.get('faturamento_mensal') || params.get('revenue') || '';
    const mensagemCustom = params.get('mensagem') || params.get('mensagemCustom') || '';

    const utm_source = params.get('utm_source') || params.get('src') || '';
    const utm_medium = params.get('utm_medium') || '';
    const utm_campaign = params.get('utm_campaign') || '';

    const ua = navigator.userAgent;
    let browser = 'Other';
    let os = 'Other';
    if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';

    if (ua.indexOf('Windows') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'macOS';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iPhone') > -1) os = 'iOS';

    setDeviceInfo({ os, browser });

    setLead(prev => ({
      ...prev,
      nome: nome || prev.nome,
      empresa: empresa || prev.empresa,
      email: email || prev.email,
      whatsapp: whatsapp || prev.whatsapp,
      segmento: segmento || prev.segmento,
      trabalhaComCacau: trabalhaComCacau || prev.trabalhaComCacau,
      faturamento: faturamento || prev.faturamento,
      mensagemCustom: mensagemCustom || prev.mensagemCustom,
      utmSource: utm_source || undefined,
      utmMedium: utm_medium || undefined,
      utmCampaign: utm_campaign || undefined,
      device: os,
      browser: browser
    }));
  }, []);

  // Load and initialize marketing and analytics scripts on mount
  useEffect(() => {
    let config: IntegrationConfig = DEFAULT_INTEGRATIONS_CONFIG;
    const storedConfig = localStorage.getItem('sensesales_integrations_config');
    if (storedConfig) {
      try {
        config = JSON.parse(storedConfig);
      } catch (err) {}
    }

    // 1. Initialize Meta Pixel
    if (config.metaPixelId && config.metaPixelId !== '1234567890') {
      try {
        (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
          if (f.fbq) return;
          n = f.fbq = function() {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

        (window as any).fbq('init', config.metaPixelId);
        (window as any).fbq('track', 'PageView');
      } catch (e) {
        console.error('Failed to initialize Meta Pixel:', e);
      }
    }

    // 2. Initialize Google Analytics
    if (config.gaTrackingId && config.gaTrackingId !== 'G-XXXXXXXXXX') {
      try {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${config.gaTrackingId}`;
        document.head.appendChild(script);

        (window as any).dataLayer = (window as any).dataLayer || [];
        function gtag(...args: any[]) {
          (window as any).dataLayer.push(arguments);
        }
        (window as any).gtag = gtag;
        (window as any).gtag('js', new Date());
        (window as any).gtag('config', config.gaTrackingId);
      } catch (e) {
        console.error('Failed to initialize Google Analytics:', e);
      }
    }

    // 3. Initialize Google Tag Manager
    if (config.gtmId && config.gtmId !== 'GTM-XXXXXXX') {
      try {
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          'gtm.start': new Date().getTime(),
          event: 'gtm.js'
        });

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtm.js?id=${config.gtmId}`;
        document.head.appendChild(script);
      } catch (e) {
        console.error('Failed to initialize Google Tag Manager:', e);
      }
    }
  }, []);

  // Listen to path changes and hashes to support /admin and #admin routing cleanly
  useEffect(() => {
    const handleLocationRouting = () => {
      const pathSuffix = window.location.pathname;
      const hashVal = window.location.hash;
      if (pathSuffix.endsWith('/admin') || hashVal === '#admin') {
        setIsAdminRoute(true);
      } else {
        setIsAdminRoute(false);
      }
    };

    handleLocationRouting();
    window.addEventListener('hashchange', handleLocationRouting);
    
    const interval = setInterval(handleLocationRouting, 1000);

    return () => {
      window.removeEventListener('hashchange', handleLocationRouting);
      clearInterval(interval);
    };
  }, []);

  // Handles WhatsApp click event and persists lead data
  const handleWhatsAppClick = async (leadData: LeadData, targetNumber: string, whatsappUrl: string) => {
    const now = new Date();
    const activeLead: LeadData = {
      ...leadData,
      id: leadData.id || 'L-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: now.toISOString(),
      status: 'Aguardando reunião',
      dataCadastro: now.toLocaleDateString('pt-BR'),
      horaCadastro: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      leadScore: calculateLeadScore(leadData)
    };

    setLead(activeLead);

    // Persist lead locally
    const existingLeadsRaw = localStorage.getItem('sensesales_leads');
    const existingLeads: LeadData[] = existingLeadsRaw ? JSON.parse(existingLeadsRaw) : [];
    localStorage.setItem('sensesales_leads', JSON.stringify([activeLead, ...existingLeads]));

    // Audit logs
    const existingLogsRaw = localStorage.getItem('sensesales_integration_logs');
    const existingLogs = existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
    const newLog = { 
      id: Math.random().toString(), 
      time: now.toLocaleTimeString(), 
      action: 'WhatsApp Direct Click', 
      status: 'success' as const, 
      message: `Contato direto via WhatsApp para ${targetNumber}.` 
    };
    localStorage.setItem('sensesales_integration_logs', JSON.stringify([newLog, ...existingLogs].slice(0, 50)));

    // Track analytics event
    let config: IntegrationConfig = DEFAULT_INTEGRATIONS_CONFIG;
    const storedConfig = localStorage.getItem('sensesales_integrations_config');
    if (storedConfig) {
      try {
        config = JSON.parse(storedConfig);
      } catch (err) {}
    }

    if (config.metaPixelId && config.metaPixelId !== '1234567890' && (window as any).fbq) {
      try {
        (window as any).fbq('track', 'Contact', {
          content_name: 'Envio WhatsApp Direto',
          value: activeLead.leadScore,
          currency: 'BRL'
        });
      } catch (e) {}
    }

    if (config.gaTrackingId && config.gaTrackingId !== 'G-XXXXXXXXXX' && (window as any).gtag) {
      try {
        (window as any).gtag('event', 'contact', {
          method: 'WhatsApp'
        });
      } catch (e) {}
    }

    // Save to Supabase if configured
    const isSupabaseConfigured = config.supabaseUrl && 
      config.supabaseUrl !== 'https://xyz.supabase.co' && 
      config.supabaseAnonKey && 
      config.supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9...';

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
        await supabase
          .from('leads')
          .insert([
            {
              id: activeLead.id,
              nome: activeLead.nome || 'Lead WhatsApp',
              whatsapp: activeLead.whatsapp || '',
              email: activeLead.email || '',
              empresa: activeLead.empresa || '',
              status: 'Aguardando reunião',
              createdAt: activeLead.createdAt
            }
          ]);
      } catch (err) {
        console.error('Error saving to Supabase:', err);
      }
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    let correctPassword = 'sensesales@admin';
    const storedConfig = localStorage.getItem('sensesales_integrations_config');
    if (storedConfig) {
      try {
        const config: IntegrationConfig = JSON.parse(storedConfig);
        if (config.adminPassword) {
          correctPassword = config.adminPassword;
        }
      } catch (err) {
        console.error('Error parsing config password', err);
      }
    }

    if (adminPasswordInput === correctPassword) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('sensesales_admin_logged_in', 'true');
      setAdminLoginError(null);
    } else {
      setAdminLoginError('Senha incorreta. Por favor verifique e tente novamente.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('sensesales_admin_logged_in');
    setAdminPasswordInput('');
    window.location.hash = '';
    
    if (window.location.pathname.endsWith('/admin')) {
      window.history.pushState(null, '', window.location.pathname.replace(/\/admin$/, ''));
    }
    setIsAdminRoute(false);
  };

  if (isAdminRoute) {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen grid-overlay bg-[#FAFAF8] flex flex-col items-center justify-center p-4 relative font-sans overflow-hidden">
          <div className="absolute inset-0 mesh-gradient pointer-events-none"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md p-8 md:p-10 glass-panel rounded-[32px] border border-gray-200 shadow-sm relative z-10 space-y-6 text-left"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-[#008060]/10 border border-[#008060]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-5 h-5 text-[#008060]" />
              </div>
              <h1 className="font-display font-bold text-2xl text-gray-900 tracking-tight">Painel do Administrador</h1>
              <p className="text-xs text-gray-500">
                Insira a senha do administrador para gerenciar o número do WhatsApp, pixels e integrações.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">SENHA DE ACESSO</label>
                <input
                  type="password"
                  required
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    if (adminLoginError) setAdminLoginError(null);
                  }}
                  placeholder="Insira a senha do administrador..."
                  className="w-full text-xs font-mono bg-white border border-gray-300 rounded-2xl p-4 text-gray-900 focus:border-[#008060] focus:outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              {adminLoginError && (
                <div className="text-xs text-rose-600 font-sans leading-relaxed bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-center">
                  {adminLoginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-[#008060] hover:bg-[#00664d] text-white font-display font-medium text-sm tracking-wide rounded-2xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Acessar Painel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '';
                  if (window.location.pathname.endsWith('/admin')) {
                    window.history.pushState(null, '', window.location.pathname.replace(/\/admin$/, ''));
                  }
                  setIsAdminRoute(false);
                }}
                className="text-xs font-mono text-gray-400 hover:text-gray-700 transition-colors"
              >
                ← VOLTAR PARA O ATENDIMENTO
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FAFAF8] text-gray-900 flex flex-col font-sans">
        <header className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 flex items-center justify-center border border-[#14B8A6]/20">
              <Lock className="w-4 h-4 text-[#14B8A6]" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-mono text-[#14B8A6] font-bold tracking-widest uppercase block">PAINEL DO ADMINISTRADOR</span>
              <h1 className="text-xs font-display font-medium text-gray-900 tracking-tight">Será Cacau</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleAdminLogout}
              className="text-xs font-mono bg-gray-50 hover:bg-gray-100 px-4 py-2 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 transition-all cursor-pointer"
            >
              SAIR DO PAINEL
            </button>
          </div>
        </header>

        <div className="flex-1 w-full bg-[#FAFAF8]">
          <AdminPanel onClose={handleAdminLogout} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-overlay bg-[#FAFAF8] flex flex-col justify-between p-4 sm:p-6 md:p-10 relative font-sans overflow-y-auto overflow-x-hidden text-gray-900">
      
      <div className="absolute inset-0 mesh-gradient pointer-events-none"></div>

      {/* Header Bar */}
      <header className="w-full max-w-4xl mx-auto z-10 pt-2 pb-4 flex items-center justify-between border-b border-gray-200/80 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold tracking-[0.15em] uppercase text-gray-900 font-display">Será Cacau</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl mx-auto flex-1 flex flex-col items-center justify-center z-10 py-2 my-auto">
        <AnimatePresence mode="wait">
          
          {isCompleted ? (
            <motion.div
              key="completed-redirect"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md mx-auto space-y-6 p-8 glass-panel rounded-3xl shadow-sm border border-gray-250 bg-white text-center"
              id="redirect-screen"
            >
              <div className="w-16 h-16 bg-[#008060]/10 border border-[#008060]/20 rounded-2xl flex items-center justify-center mx-auto mb-2 animate-pulse">
                <Check className="w-8 h-8 text-[#008060]" />
              </div>
              <div className="space-y-3">
                <h1 className="font-display font-bold text-2xl text-gray-900 tracking-tight">
                  Agendamento Concluído!
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Sua reunião foi reservada com sucesso. Você está sendo redirecionado para a página de confirmação...
                </p>
              </div>
              <div className="flex justify-center items-center gap-1.5 pt-2">
                <div className="w-2.5 h-2.5 bg-[#008060] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 bg-[#008060] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 bg-[#008060] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-[11px] font-mono text-gray-400">
                Se você não for redirecionado em alguns segundos, <a href="https://paginadeobrigado.seracacau.com.br" className="text-[#008060] font-semibold underline">clique aqui</a>.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="whatsapp-direct"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <WhatsAppDirectPage 
                lead={lead} 
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer Bar */}
      <footer className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between text-[10px] font-mono text-gray-400 z-10 py-4 gap-2 border-t border-gray-200 mt-6">
        <div className="flex items-center gap-4">
          <span>SERÁ CACAU © 2026</span>
          <span className="hidden md:inline">•</span>
          <span className="hover:text-gray-900 transition-colors">POLÍTICA DE PRIVACIDADE</span>
          <span className="hidden md:inline">•</span>
          <span className="hover:text-gray-900 transition-colors">DIRETRIZES DE LGPD</span>
        </div>
        <div>
          <span>ATENDIMENTO DIRETO VIA WHATSAPP</span>
        </div>
      </footer>

    </div>
  );
}
