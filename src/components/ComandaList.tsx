import React, { useState, useEffect } from 'react';
import { Comanda, ClientType, PaymentStatus } from '../types';
import { GraduationCap, Users, Shield, Clock, CheckCircle2, Search, Filter, Layers, CreditCard } from 'lucide-react';
import { MONTHS } from '../initialData';

interface ComandaListProps {
  comandas: Comanda[];
  selectedComanda: Comanda | null;
  onSelect: (comanda: Comanda) => void;
  onOpenCreateModal: () => void;
  onOpenManageUnits?: () => void;
  unidades?: string[];
  operatingUnit?: string;
}

export default function ComandaList({ 
  comandas, 
  selectedComanda, 
  onSelect, 
  onOpenCreateModal, 
  onOpenManageUnits,
  unidades = ['Sede Principal', 'Filial Norte', 'Filial Sul'],
  operatingUnit = 'Todos'
}: ComandaListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ClientType | 'Todos'>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | 'Todos'>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string | 'Todos'>('Todos');
  const [selectedUnit, setSelectedUnit] = useState<string>(operatingUnit || 'Todos');

  useEffect(() => {
    if (operatingUnit && operatingUnit !== 'Todos') {
      setSelectedUnit(operatingUnit);
    }
  }, [operatingUnit]);

  // Calculates the sum of values of the items in a comanda
  const getComandaTotal = (comanda: Comanda) => {
    return comanda.items.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  };

  const filteredComandas = comandas.filter(comanda => {
    const matchesSearch = comanda.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          comanda.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          comanda.courseOrTraining.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'Todos' || comanda.clientType === selectedType;
    const matchesStatus = selectedStatus === 'Todos' || comanda.status === selectedStatus;
    const matchesMonth = selectedMonth === 'Todos' || comanda.month === selectedMonth;
    const matchesUnit = selectedUnit === 'Todos' || (comanda.unit || 'Sede Principal') === selectedUnit;

    return matchesSearch && matchesType && matchesStatus && matchesMonth && matchesUnit;
  });

  // Calculate high-fidelity dashboard metrics
  const activeComandas = comandas.filter(c => c.status === 'Pendente');
  const totalPendingBalance = activeComandas.reduce((sum, c) => sum + getComandaTotal(c), 0);
  const paidComandasCount = comandas.filter(c => c.status === 'Pago').length;
  const totalPaidBalance = comandas.filter(c => c.status === 'Pago').reduce((sum, c) => sum + getComandaTotal(c), 0);

  const getClientTypeBadge = (type: ClientType) => {
    switch (type) {
      case 'Aluno':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
            <GraduationCap className="w-3.5 h-3.5" />
            Aluno
          </span>
        );
      case 'Colaborador':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]">
            <Users className="w-3.5 h-3.5" />
            Colaborador
          </span>
        );
      case 'Diretoria':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF5FF] text-[#6B21A8] border border-[#F3E8FF]">
            <Shield className="w-3.5 h-3.5" />
            Diretoria
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Visual Analytics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">Comandas Ativas</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{activeComandas.length}</h3>
            <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              Aguardando pagamento
            </span>
          </div>
          <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">Pendente Geral (Receber)</span>
            <h3 className="text-2xl font-black text-rose-600 mt-1">R$ {totalPendingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[10px] text-slate-600 font-semibold mt-1 block">Aberto no caixa principal</span>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">Faturado / Fechado</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">R$ {totalPaidBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              {paidComandasCount} comandas encerradas
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Filters and Action Area */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar comanda por Nome, ID ou Treinamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Filter classification */}
            <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ClientType | 'Todos')}
                className="bg-transparent border-none text-[11px] font-bold focus:outline-none pr-2 cursor-pointer text-slate-600"
              >
                <option value="Todos">Todas Classificações</option>
                <option value="Aluno">Alunos</option>
                <option value="Colaborador">Colaboradores</option>
                <option value="Diretoria">Diretoria</option>
              </select>
            </div>

            {/* Filter payment status */}
            <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as PaymentStatus | 'Todos')}
                className="bg-transparent border-none text-[11px] font-bold focus:outline-none cursor-pointer text-slate-600"
              >
                <option value="Todos">Todos Pagamentos</option>
                <option value="Pendente">Pendentes</option>
                <option value="Pago">Pagos (Fechadas)</option>
              </select>
            </div>

            {/* Filter Month */}
            <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
               <select
                 value={selectedMonth}
                 onChange={(e) => setSelectedMonth(e.target.value)}
                 className="bg-transparent border-none text-[11px] font-bold focus:outline-none cursor-pointer text-slate-600"
               >
                 <option value="Todos">Todos os Meses</option>
                 {MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                 ))}
               </select>
            </div>

            {/* Filter Unit */}
            <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-3xs" title="Filtrar comanda por unidade do estabelecimento">
               <select
                 value={selectedUnit}
                 onChange={(e) => setSelectedUnit(e.target.value)}
                 className="bg-transparent border-none text-[11px] font-extrabold focus:outline-none cursor-pointer text-slate-600 focus:text-indigo-600 transition"
               >
                 <option value="Todos">Todas Unidades</option>
                 {unidades.map(u => (
                    <option key={u} value={u}>{u}</option>
                 ))}
               </select>
            </div>

            {onOpenManageUnits && (
              <button
                onClick={onOpenManageUnits}
                className="bg-[#C5A059] border border-[#B38F4B] hover:bg-[#B38F4B] text-black font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1"
              >
                Gerenciar Unidades
              </button>
            )}

            <button
              onClick={onOpenCreateModal}
              className="bg-[#C5A059] border border-[#B38F4B] hover:bg-[#B38F4B] text-black font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-sm"
            >
              Criar Comanda
            </button>
          </div>
        </div>

        {/* Comandas Grid / Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Comanda ID</th>
                <th className="py-3 px-4">Nome do Cliente</th>
                <th className="py-3 px-4">Classificação</th>
                <th className="py-3 px-4">{selectedType === 'Colaborador' ? 'Departamento' : 'Curso / Treinamento'}</th>
                <th className="py-3 px-4">Unidade</th>
                <th className="py-3 px-4">Mês</th>
                <th className="py-3 px-4 text-center">Itens</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {filteredComandas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    Nenhuma comanda encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredComandas.map((comanda) => {
                  const isSelected = selectedComanda?.id === comanda.id;
                  const total = getComandaTotal(comanda);
                  const isPaid = comanda.status === 'Pago';

                  return (
                    <tr
                      key={comanda.id}
                      onClick={() => onSelect(comanda)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50/50'}`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{comanda.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{comanda.clientName}</div>
                      </td>
                      <td className="py-3.5 px-4">{getClientTypeBadge(comanda.clientType)}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate">{comanda.courseOrTraining}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-bold">{comanda.unit || 'Sede Principal'}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-600">{comanda.month}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                        {comanda.items.length} {comanda.items.length === 1 ? 'item' : 'itens'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {comanda.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          className={`px-3 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${isSelected ? 'bg-[#C5A059] text-black border border-[#B38F4B]' : 'border border-[#B38F4B]/30 text-black bg-[#C5A059]/40 hover:bg-[#C5A059]/60'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(comanda);
                          }}
                        >
                          Visualizar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
