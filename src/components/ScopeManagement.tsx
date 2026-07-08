import React, { useState } from 'react';
import { Company, Workspace, Space, DEFAULT_COMPANY, DEFAULT_WORKSPACE, DEFAULT_SPACE, ScopeFields } from '../types';
import { Building2, Layers, MapPin, Plus, Edit2, Trash2, Check, X, Save } from 'lucide-react';

interface ScopeManagementProps {
  companies: Company[];
  workspaces: Workspace[];
  spaces: Space[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  setSpaces: React.Dispatch<React.SetStateAction<Space[]>>;
  setCategoriesByScope: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setUnidadesByScope: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  activeCompanyId: string;
  activeWorkspaceId: string;
  activeSpaceId: string;
}

const scopeKeyHelper = (cId: string, wId: string, sId: string) => `${cId}:${wId}:${sId}`;

export default function ScopeManagement({
  companies, workspaces, spaces,
  setCompanies, setWorkspaces, setSpaces,
  setCategoriesByScope, setUnidadesByScope,
  activeCompanyId, activeWorkspaceId, activeSpaceId
}: ScopeManagementProps) {

  // --- Company state ---
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');

  // --- Workspace state ---
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceCompanyId, setNewWorkspaceCompanyId] = useState(activeCompanyId);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editWorkspaceName, setEditWorkspaceName] = useState('');

  // --- Space state ---
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceCompanyId, setNewSpaceCompanyId] = useState(activeCompanyId);
  const [newSpaceWorkspaceId, setNewSpaceWorkspaceId] = useState(activeWorkspaceId);
  const [newSpaceType, setNewSpaceType] = useState<Space['type']>('caixa');
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editSpaceName, setEditSpaceName] = useState('');
  const [editSpaceType, setEditSpaceType] = useState<Space['type']>('caixa');

  const [activeTab, setActiveTab] = useState<'companies' | 'workspaces' | 'spaces'>('companies');

  const activeCompanies = companies.filter(c => c.status === 'active');
  const filteredWorkspaces = workspaces.filter(w => w.companyId === activeCompanyId && w.status === 'active');

  // --- Company handlers ---
  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCompanyName.trim();
    if (!cleanName) return;
    const slug = cleanName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (companies.some(c => c.slug === slug)) {
      alert('Já existe uma empresa com este identificador!');
      return;
    }
    const company: Company = {
      id: slug,
      name: cleanName,
      slug,
      status: 'active'
    };
    setCompanies(prev => [...prev, company]);
    setNewCompanyName('');
  };

  const handleStartEditCompany = (c: Company) => {
    setEditingCompanyId(c.id);
    setEditCompanyName(c.name);
  };

  const handleSaveCompanyEdit = () => {
    const cleanName = editCompanyName.trim();
    if (!cleanName || !editingCompanyId) return;
    setCompanies(prev => prev.map(c =>
      c.id === editingCompanyId ? { ...c, name: cleanName } : c
    ));
    setEditingCompanyId(null);
  };

  const handleToggleCompanyStatus = (company: Company) => {
    const newStatus = company.status === 'active' ? 'inactive' : 'active';
    const msg = newStatus === 'inactive'
      ? `Inativar a empresa "${company.name}"? Workspaces e frentes vinculadas também serão inativados.`
      : `Reativar a empresa "${company.name}"?`;
    if (!window.confirm(msg)) return;
    setCompanies(prev => prev.map(c =>
      c.id === company.id ? { ...c, status: newStatus } : c
    ));
    if (newStatus === 'inactive') {
      setWorkspaces(prev => prev.map(w =>
        w.companyId === company.id ? { ...w, status: 'inactive' } : w
      ));
      setSpaces(prev => prev.map(s =>
        s.companyId === company.id ? { ...s, status: 'inactive' } : s
      ));
    }
  };

  // --- Workspace handlers ---
  const handleAddWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newWorkspaceName.trim();
    if (!cleanName) return;
    const slug = cleanName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const exists = workspaces.some(w => w.companyId === newWorkspaceCompanyId && w.slug === slug);
    if (exists) {
      alert('Já existe um workspace com este identificador nesta empresa!');
      return;
    }
    const workspace: Workspace = {
      id: slug,
      companyId: newWorkspaceCompanyId,
      name: cleanName,
      slug,
      status: 'active'
    };
    setWorkspaces(prev => [...prev, workspace]);
    setNewWorkspaceName('');
  };

  const handleStartEditWorkspace = (w: Workspace) => {
    setEditingWorkspaceId(w.id);
    setEditWorkspaceName(w.name);
  };

  const handleSaveWorkspaceEdit = () => {
    const cleanName = editWorkspaceName.trim();
    if (!cleanName || !editingWorkspaceId) return;
    setWorkspaces(prev => prev.map(w =>
      w.id === editingWorkspaceId ? { ...w, name: cleanName } : w
    ));
    setEditingWorkspaceId(null);
  };

  const handleToggleWorkspaceStatus = (workspace: Workspace) => {
    const newStatus = workspace.status === 'active' ? 'inactive' : 'active';
    const msg = newStatus === 'inactive'
      ? `Inativar o workspace "${workspace.name}"? Frentes vinculadas também serão inativadas.`
      : `Reativar o workspace "${workspace.name}"?`;
    if (!window.confirm(msg)) return;
    setWorkspaces(prev => prev.map(w =>
      w.id === workspace.id ? { ...w, status: newStatus } : w
    ));
    if (newStatus === 'inactive') {
      setSpaces(prev => prev.map(s =>
        s.workspaceId === workspace.id ? { ...s, status: 'inactive' } : s
      ));
    }
  };

  // --- Space handlers ---
  const handleAddSpace = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSpaceName.trim();
    if (!cleanName) return;
    const slug = cleanName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const exists = spaces.some(s =>
      s.companyId === newSpaceCompanyId &&
      s.workspaceId === newSpaceWorkspaceId &&
      s.slug === slug
    );
    if (exists) {
      alert('Já existe uma frente com este identificador neste workspace!');
      return;
    }
    const space: Space = {
      id: slug,
      companyId: newSpaceCompanyId,
      workspaceId: newSpaceWorkspaceId,
      name: cleanName,
      slug,
      type: newSpaceType,
      status: 'active'
    };
    setSpaces(prev => [...prev, space]);
    const sk = scopeKeyHelper(newSpaceCompanyId, newSpaceWorkspaceId, slug);
    setCategoriesByScope(prev => { if (prev[sk]) return prev; return { ...prev, [sk]: [] }; });
    setUnidadesByScope(prev => { if (prev[sk]) return prev; return { ...prev, [sk]: [] }; });
    setNewSpaceName('');
  };

  const handleStartEditSpace = (s: Space) => {
    setEditingSpaceId(s.id);
    setEditSpaceName(s.name);
    setEditSpaceType(s.type);
  };

  const handleSaveSpaceEdit = () => {
    const cleanName = editSpaceName.trim();
    if (!cleanName || !editingSpaceId) return;
    setSpaces(prev => prev.map(s =>
      s.id === editingSpaceId ? { ...s, name: cleanName, type: editSpaceType } : s
    ));
    setEditingSpaceId(null);
  };

  const handleToggleSpaceStatus = (space: Space) => {
    const newStatus = space.status === 'active' ? 'inactive' : 'active';
    const msg = newStatus === 'inactive'
      ? `Inativar a frente "${space.name}"?`
      : `Reativar a frente "${space.name}"?`;
    if (!window.confirm(msg)) return;
    setSpaces(prev => prev.map(s =>
      s.id === space.id ? { ...s, status: newStatus } : s
    ));
  };

  return (
    <div className="space-y-4 animate-fadeIn min-w-0">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 sm:p-5 min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Administração</span>
            <h3 className="text-lg font-black text-slate-900 mt-1">Empresas, Workspaces e Frentes de Venda</h3>
            <p className="text-xs text-slate-500 mt-1">Gerencie a estrutura multi-tenant do sistema.</p>
          </div>
        </div>

        {/* Tab selector */}
        <div className="sf-table-scroll flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
          {(['companies', 'workspaces', 'spaces'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-w-[110px] flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'companies' ? 'Empresas' : tab === 'workspaces' ? 'Workspaces' : 'Frentes'}
            </button>
          ))}
        </div>

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            <form onSubmit={handleAddCompany} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Nova empresa (Ex: Grupo FRZ)"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-frz-primary/20"
                required
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </form>

            <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
              {companies.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">Nenhuma empresa cadastrada.</div>
              ) : (
                companies.map(c => {
                  const isEditing = editingCompanyId === c.id;
                  const wsCount = workspaces.filter(w => w.companyId === c.id).length;
                  const spCount = spaces.filter(s => s.companyId === c.id).length;
                  return (
                    <div key={c.id} className="p-3 flex items-center justify-between text-xs gap-3">
                      {isEditing ? (
                        <div className="flex-1 flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={editCompanyName}
                            onChange={(e) => setEditCompanyName(e.target.value)}
                            className="flex-1 px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button onClick={handleSaveCompanyEdit} className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition cursor-pointer" title="Salvar">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCompanyId(null)} className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition cursor-pointer" title="Cancelar">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <div className="flex flex-col min-w-0">
                              <span className="font-extrabold text-slate-800 truncate">{c.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {wsCount} {wsCount === 1 ? 'workspace' : 'workspaces'} · {spCount} {spCount === 1 ? 'frente' : 'frentes'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEditCompany(c)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleCompanyStatus(c)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                c.status === 'active'
                                  ? 'text-rose-500 hover:text-rose-800 hover:bg-rose-50'
                                  : 'text-emerald-500 hover:text-emerald-800 hover:bg-emerald-50'
                              }`}
                              title={c.status === 'active' ? 'Inativar' : 'Reativar'}
                            >
                              {c.status === 'active' ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Workspaces Tab */}
        {activeTab === 'workspaces' && (
          <div className="space-y-4">
            <form onSubmit={handleAddWorkspace} className="flex flex-col sm:flex-row gap-2">
              <select
                value={newWorkspaceCompanyId}
                onChange={(e) => setNewWorkspaceCompanyId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-frz-primary/20"
              >
                {activeCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Novo workspace (Ex: Filial Centro)"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-frz-primary/20"
                required
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </form>

            <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
              {workspaces.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">Nenhum workspace cadastrado.</div>
              ) : (
                workspaces.map(w => {
                  const isEditing = editingWorkspaceId === w.id;
                  const company = companies.find(c => c.id === w.companyId);
                  const spCount = spaces.filter(s => s.workspaceId === w.id).length;
                  return (
                    <div key={w.id} className="p-3 flex items-center justify-between text-xs gap-3">
                      {isEditing ? (
                        <div className="flex-1 flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={editWorkspaceName}
                            onChange={(e) => setEditWorkspaceName(e.target.value)}
                            className="flex-1 px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button onClick={handleSaveWorkspaceEdit} className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition cursor-pointer" title="Salvar">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingWorkspaceId(null)} className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition cursor-pointer" title="Cancelar">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className={`w-2 h-2 rounded-full ${w.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <div className="flex flex-col min-w-0">
                              <span className="font-extrabold text-slate-800 truncate">{w.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {company?.name || 'Sem empresa'} · {spCount} {spCount === 1 ? 'frente' : 'frentes'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEditWorkspace(w)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleWorkspaceStatus(w)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                w.status === 'active'
                                  ? 'text-rose-500 hover:text-rose-800 hover:bg-rose-50'
                                  : 'text-emerald-500 hover:text-emerald-800 hover:bg-emerald-50'
                              }`}
                              title={w.status === 'active' ? 'Inativar' : 'Reativar'}
                            >
                              {w.status === 'active' ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Spaces Tab */}
        {activeTab === 'spaces' && (
          <div className="space-y-4">
            <form onSubmit={handleAddSpace} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] gap-2">
              <select
                value={newSpaceCompanyId}
                onChange={(e) => {
                  setNewSpaceCompanyId(e.target.value);
                  setNewSpaceWorkspaceId('');
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-frz-primary/20"
              >
                {activeCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={newSpaceWorkspaceId}
                onChange={(e) => setNewSpaceWorkspaceId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-frz-primary/20"
                required
              >
                <option value="">Selecione workspace</option>
                {workspaces.filter(w => w.companyId === newSpaceCompanyId && w.status === 'active').map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Nome da frente"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                className="w-full min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-frz-primary/20"
                required
              />
              <select
                value={newSpaceType}
                onChange={(e) => setNewSpaceType(e.target.value as Space['type'])}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-frz-primary/20"
              >
                <option value="caixa">Caixa</option>
                <option value="evento">Evento</option>
                <option value="loja">Loja</option>
                <option value="cantina">Cantina</option>
                <option value="outro">Outro</option>
              </select>
              <button
                type="submit"
                className="px-3.5 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </form>

            <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
              {spaces.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">Nenhuma frente de venda cadastrada.</div>
              ) : (
                spaces.map(s => {
                  const isEditing = editingSpaceId === s.id;
                  const company = companies.find(c => c.id === s.companyId);
                  const workspace = workspaces.find(w => w.id === s.workspaceId);
                  return (
                    <div key={s.id} className="p-3 flex items-center justify-between text-xs gap-3">
                      {isEditing ? (
                        <div className="flex-1 flex gap-1.5 items-center flex-wrap">
                          <input
                            type="text"
                            value={editSpaceName}
                            onChange={(e) => setEditSpaceName(e.target.value)}
                            className="flex-1 min-w-[100px] px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <select
                            value={editSpaceType}
                            onChange={(e) => setEditSpaceType(e.target.value as Space['type'])}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          >
                            <option value="caixa">Caixa</option>
                            <option value="evento">Evento</option>
                            <option value="loja">Loja</option>
                            <option value="cantina">Cantina</option>
                            <option value="outro">Outro</option>
                          </select>
                          <button onClick={handleSaveSpaceEdit} className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition cursor-pointer" title="Salvar">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingSpaceId(null)} className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition cursor-pointer" title="Cancelar">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <div className="flex flex-col min-w-0">
                              <span className="font-extrabold text-slate-800 truncate">{s.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {company?.name || '?'} &gt; {workspace?.name || '?'} · {s.type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEditSpace(s)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleSpaceStatus(s)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                s.status === 'active'
                                  ? 'text-rose-500 hover:text-rose-800 hover:bg-rose-50'
                                  : 'text-emerald-500 hover:text-emerald-800 hover:bg-emerald-50'
                              }`}
                              title={s.status === 'active' ? 'Inativar' : 'Reativar'}
                            >
                              {s.status === 'active' ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
