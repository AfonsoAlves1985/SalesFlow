import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Smartphone, 
  MessageSquare, 
  ShieldCheck, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';

interface WhatsAppAuthSandboxProps {
  onClose: () => void;
}

export default function WhatsAppAuthSandbox({ onClose }: WhatsAppAuthSandboxProps) {
  const [phoneNumberChoice, setPhoneNumberChoice] = useState<'demo' | 'custom'>('demo');
  const [customNumber, setCustomNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-generate a beautiful stable demo phone number
  const [demoNumber] = useState(() => {
    const ddds = ["11", "12", "19", "21", "31", "41", "51"];
    const ddd = ddds[Math.floor(Math.random() * ddds.length)];
    const head = "9" + Math.floor(8100 + Math.random() * 1800);
    const tail = Math.floor(1000 + Math.random() * 8999);
    return `+55 (${ddd}) ${head}-${tail}`;
  });

  const handlePairing = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    const finalNumber = phoneNumberChoice === 'demo' ? demoNumber : customNumber;

    if (phoneNumberChoice === 'custom' && (!customNumber || customNumber.replace(/\D/g, '').length < 8)) {
      setErrorMessage('Por favor, informe seu número completo do WhatsApp.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Post final number selection to server config
      const configRes = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: finalNumber })
      });
      
      if (!configRes.ok) throw new Error('Não foi possível registrar o número no servidor.');

      // 2. Trigger connection simulation state on backend
      const connectRes = await fetch('/api/whatsapp/force-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!connectRes.ok) throw new Error('Falha ao autenticar o pareamento remoto.');

      // Visual grace delay
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(true);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro de conexão com o painel.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Dynamic Ambient Background Aura */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-10 left-10 w-[200px] h-[200px] bg-[#C5A059]/5 rounded-full blur-[60px]" />
      </div>

      {/* Mini Header */}
      <header className="relative z-10 w-full max-w-md mx-auto flex items-center justify-between pb-4 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-widest uppercase text-slate-200">SalesFlow</h1>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Mobile Connect App</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[9px] bg-slate-900 border border-slate-800 text-emerald-400 font-extrabold uppercase py-1 px-2.5 rounded-full font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Gateway Aberto
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center py-6 w-full max-w-md mx-auto">
        {!isSuccess ? (
          <div className="w-full bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-6 text-left">
            <div className="text-center space-y-2">
              <div className="relative w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                <Smartphone className="w-7 h-7" />
                <Sparkles className="absolute -top-1.5 -right-1.5 w-4 h-4 text-emerald-400 animate-bounce" />
              </div>
              <h2 className="text-lg font-extrabold text-white">Vincular Conta de WhatsApp</h2>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                Seu smartphone detectou a solicitação de pareamento do painel administrativo do caixa. Confirme abaixo para habilitar o robô de envio de comandas.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-[10px] font-black uppercase text-center tracking-wide font-mono">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Pairing Configuration Methods */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">Configuração do Transmissor</label>
              
              <div className="space-y-2.5">
                {/* Method 1: Demo Number */}
                <button
                  type="button"
                  onClick={() => {
                    setPhoneNumberChoice('demo');
                    setErrorMessage('');
                  }}
                  className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all duration-300 transform active:scale-98 ${
                    phoneNumberChoice === 'demo'
                      ? 'bg-emerald-950/20 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/20'
                      : 'bg-slate-900/60 border-slate-900 hover:border-slate-800 text-slate-400'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    phoneNumberChoice === 'demo' ? 'border-emerald-500' : 'border-slate-600'
                  }`}>
                    {phoneNumberChoice === 'demo' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black uppercase tracking-wider font-sans">Simular com Número Estável</span>
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 py-0.5 px-1.5 rounded-md font-bold font-mono">RECOMENDADO</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                      Usa o número gerado pelo servidor para acelerar o autodiagnóstico no painel.
                    </p>
                    <p className="text-xs font-mono font-bold text-emerald-400 mt-2 tracking-wide">
                      {demoNumber}
                    </p>
                  </div>
                </button>

                {/* Method 2: Custom Number */}
                <button
                  type="button"
                  onClick={() => {
                    setPhoneNumberChoice('custom');
                    setErrorMessage('');
                  }}
                  className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all duration-300 transform active:scale-98 ${
                    phoneNumberChoice === 'custom'
                      ? 'bg-emerald-950/20 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/20'
                      : 'bg-slate-900/60 border-slate-900 hover:border-slate-800 text-slate-400'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    phoneNumberChoice === 'custom' ? 'border-emerald-500' : 'border-slate-600'
                  }`}>
                    {phoneNumberChoice === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-black uppercase tracking-wider font-sans">Digitar Meu Próprio Número</span>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                      Especifique seu próprio telefone para disparar comandas reais de teste.
                    </p>
                    
                    {phoneNumberChoice === 'custom' && (
                      <div className="mt-3.5 space-y-1.5 animate-slideIn">
                        <label className="block text-[8px] font-black uppercase text-slate-400 font-mono tracking-wider">Seu Telefone (DDI + DDD + Número)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 font-mono">+</span>
                          <input
                            type="text"
                            value={customNumber.replace(/^\+/, '')}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d]/g, '');
                              setCustomNumber(raw ? '+' + raw : '');
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-6 pr-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-bold font-mono tracking-wider"
                            placeholder="Ex: 5511999999999"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Submit Control */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePairing}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition duration-300 shadow-lg shadow-emerald-950/40 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Sincronizando Sessão...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-100" />
                  Autorizar Pareamento Remoto 📲
                </>
              )}
            </button>
          </div>
        ) : (
          /* SUCCESS STATE */
          <div className="w-full bg-slate-900/40 border border-slate-905 rounded-3xl p-8 shadow-2xl backdrop-blur-md text-center space-y-6 animate-slideIn">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner relative">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              <span className="absolute inset-0 rounded-2xl border border-emerald-400 animate-ping opacity-25" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Canal de Disparo Ativado!</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                Código QR validado com sucesso! A sessão foi estabelecida no caixa principal em tempo real.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 text-left space-y-1.5">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-[9px] font-black uppercase text-slate-500 font-mono">Dispositivo</span>
                <span className="text-[10px] text-slate-200 font-bold font-mono">SalesFlow Engine</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900 py-1.5">
                <span className="text-[9px] font-black uppercase text-slate-500 font-mono">Número Remetente</span>
                <span className="text-[10px] text-emerald-400 font-bold font-mono">
                  {phoneNumberChoice === 'demo' ? demoNumber : customNumber}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[9px] font-black uppercase text-slate-500 font-mono font-sans">Status</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
                  ● Conectado
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-[10px] text-amber-500/80 font-semibold leading-normal font-mono animate-pulse">
                📲 Verifique seu painel principal! Ele já está ativo.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1 font-mono"
              >
                Voltar ao Sistema Principal <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 w-full max-w-md mx-auto text-center pt-4 border-t border-slate-900">
        <p className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
          <span>SalesFlow Web Gateway v5.2</span>
          <span>•</span>
          <span className="text-slate-400 font-bold">Conexão Segura Ponta a Ponta</span>
        </p>
      </footer>
    </div>
  );
}
