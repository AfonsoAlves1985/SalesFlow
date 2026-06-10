import React, { useState } from 'react';
import { SystemUser, ThemeType } from '../types';
import { Shield, Sparkles, Key, CheckCircle, UserCheck, ArrowLeft, ArrowRight, Compass } from 'lucide-react';

interface InviteActivationProps {
  invitedUser: SystemUser;
  onActivate: (id: string, name: string, username: string, password: string) => void;
  onCancel: () => void;
}

export default function InviteActivation({ invitedUser, onActivate, onCancel }: InviteActivationProps) {
  const [fullName, setFullName] = useState(invitedUser.name || '');
  const [username, setUsername] = useState(invitedUser.username || '');
  const [enteredTempPassword, setEnteredTempPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tempPass = urlParams.get('temp_pass') || urlParams.get('password');
    if (tempPass) {
      setEnteredTempPassword(tempPass);
    } else if (invitedUser && invitedUser.password) {
      setEnteredTempPassword(invitedUser.password);
    }
  }, [invitedUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Por favor, digite seu nome completo.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Por favor, digite seu nome de usuário (login).');
      return;
    }
    if (!enteredTempPassword.trim()) {
      setErrorMsg('Por favor, informe a senha temporária enviada no convite.');
      return;
    }
    if (enteredTempPassword !== invitedUser.password) {
      setErrorMsg('A senha temporária digitada está incorreta.');
      return;
    }
    if (password.length < 3) {
      setErrorMsg('A nova senha definitiva precisa ter pelo menos 3 caracteres.');
      return;
    }
    if (password === enteredTempPassword) {
      setErrorMsg('Por segurança, a senha definitiva deve ser diferente da senha temporária.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('As senhas definitivas digitadas não batem.');
      return;
    }

    onActivate(invitedUser.id, fullName.trim(), username.trim().toLowerCase().replace(/\s+/g, ''), password);
  };

  return (
    <div className="min-h-screen w-full bg-[#09090B] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/15 via-[#09090B] to-[#09090B] pointer-events-none" />

      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-850 rounded-3xl p-8 shadow-2xl space-y-6 overflow-hidden">
        {/* Glow Element */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

        <div className="text-center relative">
          <div className="relative w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Sparkles className="w-7 h-7 text-[#C5A059]" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[7px] font-bold text-white">✓</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Ative seu Acesso</h2>
          <p className="text-xs text-zinc-300 mt-1.5 font-semibold leading-relaxed">
            Bem-vindo ao <strong className="text-white font-bold">SalesFlow</strong>! Você recebeu um convite para integrar nossa equipe. Defina suas novas credenciais para começar.
          </p>
        </div>

        {/* Invited Role Profile Card */}
        <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/55 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-400/15 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#C5A059] block">Cargo Atribuído</span>
            <strong className="text-zinc-200 text-xs mt-0.5 block truncate">
              {invitedUser.role === 'admin' ? 'Co-Administrador' : 'Operador de Caixa'}
            </strong>
            <span className="text-[10px] text-zinc-400 font-mono block truncate mt-0.5 font-semibold">{invitedUser.email}</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span>⚠</span>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-200 tracking-wider mb-1.5">Seu Nome Completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] outline-none font-medium transition"
              placeholder="Ex: Pedro Alvares Cabral"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-200 tracking-wider mb-1.5">Username (Login do Caixa)</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] outline-none font-mono transition"
              placeholder="Ex: pedrinho_vendas"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-200 tracking-wider mb-1.5 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              Senha Temporária Recebida
            </label>
            <input
              type="password"
              required
              value={enteredTempPassword}
              onChange={(e) => setEnteredTempPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] outline-none font-mono transition"
              placeholder="Digite a senha temporária dada pelo administrador"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-200 tracking-wider mb-1.5">Senha Definitiva</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] outline-none font-mono transition"
                placeholder="Ex p.ex: nova_senha"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-200 tracking-wider mb-1.5">Confirmar Senha Definitiva</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] outline-none font-mono transition"
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              className="w-full py-3 bg-[#C5A059] hover:bg-[#B38F46] text-[#09090B] rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-amber-500/5 cursor-pointer flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              Confirmar & Ativar Acesso
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
