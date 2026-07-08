import React, { useState } from 'react';
import { SystemUser, USER_ROLE_LABELS, UserRole } from '../types';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Copy, 
  Check, 
  Trash2, 
  Edit2, 
  Key, 
  AlertTriangle, 
  Search, 
  Clock, 
  ArrowRight,
  Sparkles,
  Send,
  ExternalLink
} from 'lucide-react';

const ROLE_OPTIONS: Array<{ role: UserRole; description: string; tone: string; selectedTone: string; iconTone: string }> = [
  {
    role: 'cashier',
    description: 'Operação diária: comandas, PDV, abertura/fechamento de caixa e recebimentos.',
    tone: 'text-indigo-600',
    selectedTone: 'bg-indigo-50/75 border-indigo-400 ring-2 ring-indigo-500/10',
    iconTone: 'bg-indigo-600 text-white'
  },
  {
    role: 'stock',
    description: 'Cadastro de produtos, estoque, categorias, fornecedores e conferência de margem.',
    tone: 'text-emerald-600',
    selectedTone: 'bg-emerald-50/75 border-emerald-400 ring-2 ring-emerald-500/10',
    iconTone: 'bg-emerald-600 text-white'
  },
  {
    role: 'finance',
    description: 'Fluxo financeiro, recebíveis, caixa, comandas e relatórios de fechamento.',
    tone: 'text-sky-600',
    selectedTone: 'bg-sky-50/75 border-sky-400 ring-2 ring-sky-500/10',
    iconTone: 'bg-sky-600 text-white'
  },
  {
    role: 'manager',
    description: 'Gestão operacional ampla sem manutenção de usuários e reset administrativo.',
    tone: 'text-purple-600',
    selectedTone: 'bg-purple-50/75 border-purple-400 ring-2 ring-purple-500/10',
    iconTone: 'bg-purple-600 text-white'
  },
  {
    role: 'admin',
    description: 'Acesso completo: operação, relatórios, estoque, auditoria, usuários e configurações críticas.',
    tone: 'text-amber-600',
    selectedTone: 'bg-amber-50/75 border-amber-400 ring-2 ring-amber-500/10',
    iconTone: 'bg-amber-500 text-slate-900'
  }
];

const getRoleLabel = (role: UserRole) => USER_ROLE_LABELS[role] || role;
const getRoleTone = (role: UserRole) => ROLE_OPTIONS.find(option => option.role === role)?.tone || 'text-indigo-600';

interface AccessManagementProps {
  users: SystemUser[];
  onSaveUser: (user: SystemUser) => void;
  onDeleteUser: (userId: string) => void;
  currentUserSessionId?: string;
  onSimulateInvite: (code: string) => void;
  onResetSystem: () => void;
}

export default function AccessManagement({ 
  users, 
  onSaveUser, 
  onDeleteUser, 
  currentUserSessionId = 'u-superadmin',
  onSimulateInvite,
  onResetSystem
}: AccessManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetLogin, setResetLogin] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');

  // Confirmed created state for invitations
  const [newlyCreatedUserForInvite, setNewlyCreatedUserForInvite] = useState<SystemUser | null>(null);
  const [copiedSuccessLink, setCopiedSuccessLink] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [status, setStatus] = useState<'active' | 'invited'>('invited');
  const [password, setPassword] = useState('');

  const handleEdit = (user: SystemUser) => {
    setEditingId(user.id);
    setName(user.name);
    setUsername(user.username);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status);
    setPassword(user.password || '');
    setIsFormOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setUsername(`operador_${randomSuffix}`);
    setEmail('');
    setRole('cashier');
    setStatus('invited');
    setPassword('');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim()) {
      alert('Por favor, preencha Nome, Username e E-mail.');
      return;
    }

    // Basic validity checks on username
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    const cleanEmail = email.trim().toLowerCase();

    // Check unique username and email (except when editing the same user)
    const existingUsername = users.find(u => u.id !== editingId && u.username.toLowerCase() === cleanUsername);
    if (existingUsername) {
      alert('Este nome de usuário já está em uso.');
      return;
    }
    const existingEmail = users.find(u => u.id !== editingId && u.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      alert('Este endereço de e-mail já está em uso.');
      return;
    }

    let invitationCode = undefined;
    if (status === 'invited') {
      invitationCode = editingId 
        ? (users.find(u => u.id === editingId)?.invitationCode || `INV-${Math.floor(1000 + Math.random() * 9000)}-SF`)
        : `INV-${Math.floor(1000 + Math.random() * 9000)}-SF`;
    }

    const existingUser = editingId ? users.find(u => u.id === editingId) : null;
    const finalPassword = password || '123';
    
    // For invited users, we require a password change on first access (it is temporary).
    // If we're updating and they were already active or had finished, preserve her/his state.
    const mustChangePassword = status === 'invited' 
      ? true 
      : (existingUser ? !!existingUser.needsPasswordChange : false);

    const newUserObj: SystemUser = {
      id: editingId || `u-${Date.now()}`,
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      role,
      status,
      password: finalPassword,
      needsPasswordChange: mustChangePassword,
      invitationCode,
      createdAt: editingId ? (existingUser?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    onSaveUser(newUserObj);

    if (status === 'invited') {
      setNewlyCreatedUserForInvite(newUserObj);
      setCopiedSuccessLink(false);
    }

    closeForm();
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setName('');
    setUsername('');
    setEmail('');
    setRole('cashier');
    setStatus('invited');
    setPassword('');
  };

  const copyInviteLink = (user: SystemUser) => {
    if (!user.invitationCode) return;
    const origin = window.location.origin;
    const link = `${origin}?invite=${user.invitationCode}&temp_pass=${encodeURIComponent(user.password || '')}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(user.id);
      setTimeout(() => setCopiedId(null), 3000);
    }).catch(() => {
      alert(`Link de convite: ${link}`);
    });
  };

  const handleResetConfirm = () => {
    const admin = users.find(u => u.role === 'admin' && u.username === resetLogin && u.password === resetPassword);
    if (admin) {
      setShowResetConfirm(false);
      setResetLogin('');
      setResetPassword('');
      setResetError('');
      onResetSystem();
    } else {
      setResetError('Login ou senha inválidos. Apenas administradores podem zerar o sistema.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn min-w-0">
      {/* Header Panel */}
      <div className="p-4 sm:p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Controle de Usuários & Acessos
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Crie, edite e remova credenciais de operadores de caixa e administradores do sistema através de convites seguros.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white rounded-xl text-xs font-black transition shadow-sm cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-white" />
          Convidar Novo Usuário
        </button>
      </div>

      <div className="p-3 sm:p-6">
        {/* Info Box about System Invitations */}
        <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row gap-3.5 text-xs text-slate-600">
          <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <strong className="text-slate-800 text-xs block mb-0.5">Segurança Avançada e Fluxo de Convites</strong>
            Ao convidar operadores e novos gerentes, o sistema gera um <strong className="text-indigo-600 font-bold">Link de Convite Ativo (Invite Link)</strong>. O destinatário poderá utilizá-lo para cadastrar sua senha pessoal de forma privada. O convite é revogado assim que o usuário conclui o cadastro.
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar colaborador por nome, login, email ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Users Table / List */}
        <div className="sf-table-scroll rounded-xl border border-slate-100">
          <table className="sf-table w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Nome completo / Login</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Permissionamento</th>
                <th className="py-3 px-4">Status de Conta</th>
                <th className="py-3 px-4 text-center">Ações / Convites</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum colaborador encontrado com os critérios digitados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSuperadmin = user.id === 'u-superadmin' || user.username === 'admin';
                  return (
                    <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          {user.name}
                          {isSuperadmin && (
                            <span className="bg-amber-100/80 border border-amber-200 text-amber-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Acesso Principal de Configuração">
                              <Sparkles className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                              Superadmin
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600 font-mono text-[10px] mt-0.5 font-semibold">@{user.username}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">{user.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 font-bold ${getRoleTone(user.role)}`}>
                          <Shield className="w-3.5 h-3.5" />
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {user.status === 'active' ? (
                          <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-pulse" />
                            Ativo
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="bg-amber-100 text-amber-800 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Convite Pendente
                            </span>
                            <span className="block text-[10px] text-slate-500 font-semibold">
                              Senha temporária: <strong className="font-mono text-indigo-600 font-black bg-indigo-50/70 border border-indigo-100/40 px-1 rounded">{user.password || '123'}</strong>
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {user.status === 'invited' && user.invitationCode && (
                            <>
                              <button
                                onClick={() => copyInviteLink(user)}
                                className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${copiedId === user.id ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
                                title="Copiar link de convite exclusivo com senha temporária predefinida inclusa"
                              >
                                {copiedId === user.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    Link Copiado!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-500" />
                                    Copiar Link c/ Senha
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => onSimulateInvite(user.invitationCode!)}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                                title="Simular abertura do convite (Ativação de senha pelo colaborador)"
                              >
                                Simular <ArrowRight className="w-3 h-3 text-indigo-500" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg cursor-pointer transition"
                            title="Editar permissionamento e dados"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isSuperadmin && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Tem certeza de que deseja banir/excluir o operador "${user.name}"? Esta ação removerá imediatamente seu acesso.`)) {
                                  onDeleteUser(user.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-lg cursor-pointer transition"
                              title="Banir/Excluir Colaborador"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DANGER ZONE - Reset System */}
      <div className="mx-3 sm:mx-6 mb-6 p-4 sm:p-5 bg-rose-50 border-2 border-rose-200 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="p-2 bg-rose-100 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-rose-800 uppercase tracking-wider">Zona de Perigo</h3>
            <p className="text-xs text-rose-700 font-medium mt-1 leading-relaxed">
              Esta ação remove <strong>todos os dados</strong> do sistema: produtos, comandas, movimentações de estoque, 
              notificações e configurações. Os usuários e permissões são preservados.
            </p>
          </div>
        </div>
        <div className="mt-4 flex">
          <button
            onClick={() => {
              setShowResetConfirm(true);
              setResetLogin('');
              setResetPassword('');
              setResetError('');
            }}
            className="w-full sm:w-auto sm:ml-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Zerar Sistema
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          onClick={() => setShowResetConfirm(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full max-h-[calc(100dvh-2rem)] border border-slate-100 shadow-2xl overflow-y-auto animate-slideUp cursor-default"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Zerar Sistema</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Confirme com login e senha de administrador
                  </p>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-xs text-rose-700 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Todos os dados serão perdidos permanentemente. Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wide mb-1">Login do Administrador</label>
                  <input
                    type="text"
                    placeholder="Digite seu username de admin..."
                    value={resetLogin}
                    onChange={(e) => { setResetLogin(e.target.value); setResetError(''); }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-700 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wide mb-1">Senha</label>
                  <input
                    type="password"
                    placeholder="Digite sua senha..."
                    value={resetPassword}
                    onChange={(e) => { setResetPassword(e.target.value); setResetError(''); }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-700 outline-none"
                  />
                </div>
                {resetError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {resetError}
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResetConfirm}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirmar e Zerar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL (Convidar ou Editar Colaborador) */}
      {isFormOpen && (
        <div 
          onClick={closeForm}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto border border-slate-100 shadow-2xl relative space-y-5 animate-slideUp cursor-default"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-4.5 h-4.5 text-indigo-600" />
                  {editingId ? 'Editar Detalhes de Acesso' : 'Convidar Novo Colaborador'}
                </h3>
                <p className="text-[11px] text-slate-600 mt-1 font-medium">
                  Configure o permissionamento ideal e as informações de identificação do colaborador.
                </p>
              </div>
              <button 
                onClick={closeForm}
                className="text-slate-600 hover:text-slate-900 text-sm font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wide mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pedro Alvares"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wide mb-1">Username (Login)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: pedrinho_caixa"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wide mb-1">E-mail Corporativo</label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: pedro@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Status and password inputs if Active */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-extrabold text-slate-700 block">Tipo de Registro</span>
                    <span className="text-[9px] text-slate-500 font-medium">Atribuir status de ativação da conta</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setStatus('invited')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer transition ${status === 'invited' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                      Invited
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('active')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer transition ${status === 'active' ? 'bg-emerald-600 text-white font-black' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                      Active (Imediato)
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-3">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    {status === 'invited' ? 'Senha Temporária de Primeiro Acesso' : 'Senha de Acesso Direto / Login Inicial'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={status === 'invited' ? 'Mínimo 3 digitos. Ex: 12345' : 'Identificador ou senha (mínimo 3 digitos)'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-700 outline-none font-mono font-bold"
                  />
                  {status === 'invited' && (
                    <span className="text-[9px] text-frz-primary font-semibold mt-1 block">
                      ⚠ O usuário do convite deverá preencher essa senha para validar seu acesso e depois criará a definitiva.
                    </span>
                  )}
                </div>
              </div>

              {/* Roles: Permissionamento */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wide mb-2">Permissionamento (Controle de Acessos)</label>
                <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {ROLE_OPTIONS.map((option) => {
                    const isSelected = role === option.role;
                    const RoleIcon = option.role === 'cashier' ? Users : Shield;

                    return (
                      <div
                        key={option.role}
                        onClick={() => setRole(option.role)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer select-none flex gap-3 items-start ${isSelected ? option.selectedTone : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? option.iconTone : 'bg-slate-100 text-slate-500'}`}>
                          <RoleIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-xs text-slate-800 block font-bold">{getRoleLabel(option.role)}</strong>
                          <span className="text-[10px] text-slate-500 block mt-0.5 leading-normal font-medium">
                            {option.description}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {editingId === 'u-superadmin' && role !== 'admin' && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-2 text-[10px] text-rose-700 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  Privilégio de root: O Superadmin original não pode ter seu permissionamento reduzido.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2 border border-slate-300 hover:bg-slate-150 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer transition text-center"
                >
                  Sair
                </button>
                <button
                  type="submit"
                  disabled={editingId === 'u-superadmin' && role !== 'admin'}
                  className="flex-1 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white rounded-xl text-xs font-black shadow-sm cursor-pointer transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                  {editingId ? 'Confirmar e Salvar' : 'Gerar Convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS/DISPATCH CONFIRMATION MODAL FOR GENERATED INVITE */}
      {newlyCreatedUserForInvite && (
        <div 
          id="invite-dispatch-success-backdrop" 
          onClick={(e) => {
            if ((e.target as HTMLElement).id === "invite-dispatch-success-backdrop") {
              setNewlyCreatedUserForInvite(null);
            }
          }}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
        >
          <div 
            id="invite-dispatch-success-card" 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl relative text-left text-white space-y-5 animate-slideUp cursor-default"
          >
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-bounce">
                <Send className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold font-sans">Convite Gerado com Sucesso!</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">
                A credencial de acesso foi criada temporariamente no sistema.
              </p>
            </div>

            <div className="space-y-3.5 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-400 font-black uppercase">Responsável</span>
                <span className="font-extrabold text-slate-200">{newlyCreatedUserForInvite.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-400 font-black uppercase">Login cadastrado</span>
                <span className="font-bold text-indigo-400 font-mono">@{newlyCreatedUserForInvite.username}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-400 font-black uppercase">Permissionamento</span>
                <span className="font-bold text-amber-500">
                  {getRoleLabel(newlyCreatedUserForInvite.role)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-black uppercase">Senha Temporária</span>
                <span className="font-mono text-xs font-black bg-indigo-500/10 border border-indigo-500/25 text-frz-primary px-2 py-0.5 rounded">
                  {newlyCreatedUserForInvite.password}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Copiar e Enviar Link para Ativação do Usuário:
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}?invite=${newlyCreatedUserForInvite.invitationCode}&temp_pass=${encodeURIComponent(newlyCreatedUserForInvite.password || '')}`}
                  className="flex-1 bg-slate-950 border border-slate-850 px-3 py-2 text-[10px] text-slate-300 rounded-xl outline-none font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}?invite=${newlyCreatedUserForInvite.invitationCode}&temp_pass=${encodeURIComponent(newlyCreatedUserForInvite.password || '')}`;
                    navigator.clipboard.writeText(link).then(() => {
                      setCopiedSuccessLink(true);
                      setTimeout(() => setCopiedSuccessLink(false), 3500);
                    });
                  }}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${copiedSuccessLink ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                >
                  {copiedSuccessLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <span className="block text-[10px] text-frz-primary font-medium leading-relaxed">
                💡 Compartilhe este link com o novo colaborador. Nele já está embutido o código de ativação e a senha temporária dele. Ao primeiro acesso ele preencherá esses dados e já vai mudar para a senha definitiva!
              </span>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => setNewlyCreatedUserForInvite(null)}
                className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
              >
                Sair
              </button>
              <button
                type="button"
                onClick={() => setNewlyCreatedUserForInvite(null)}
                className="px-6 py-2.5 bg-frz-primary hover:bg-frz-primary-hover text-white border border-frz-primary-hover text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                Confirmar e Concluir <Check className="w-4 h-4 text-white stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
