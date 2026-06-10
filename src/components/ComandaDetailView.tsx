import React, { useState } from 'react';
import { Comanda, Product, OrderedItem } from '../types';
import { Calendar, Trash2, Edit, Printer, Plus, Check, QrCode, Signature, ShieldCheck, RefreshCw, X, Bell, MessageSquare } from 'lucide-react';
import QRCodeGenerator from './QRCodeGenerator';

interface ComandaDetailViewProps {
  comanda: Comanda;
  products: Product[];
  onAddProduct: (comandaId: string, productId: string, quantity: number) => void;
  onRemoveItem: (comandaId: string, itemId: string) => void;
  onUpdateItemQuantity: (comandaId: string, itemId: string, quantity: number) => void;
  onCloseComanda: (comandaId: string) => void;
  onDeleteComanda: (comandaId: string) => void;
  onOpenSimulatorForComanda: (comandaId: string) => void;
  onToggleClosureReminder?: (comandaId: string) => void;
  onBackToList?: () => void;
}

export default function ComandaDetailView({
  comanda,
  products,
  onAddProduct,
  onRemoveItem,
  onUpdateItemQuantity,
  onCloseComanda,
  onDeleteComanda,
  onOpenSimulatorForComanda,
  onToggleClosureReminder,
  onBackToList
}: ComandaDetailViewProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isEditingQuantityId, setIsEditingQuantityId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [viewingItemDetail, setViewingItemDetail] = useState<OrderedItem | null>(null);

  const getComandaTotal = () => {
    return comanda.items.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  };

  const getWhatsAppUrl = () => {
    const statusEmoji = comanda.status === 'Pago' ? '✅ *PAGO e ENCERRADO*' : '⏳ *PENDENTE / EM ABERTO*';
    
    const itemsText = comanda.items.length === 0 
      ? '_Nenhum item registrado ainda._' 
      : comanda.items.map(item => `• *${item.quantity}x ${item.productName}* - R$ ${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}`).join('\n');
      
    const comandaLiveUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${window.location.pathname}?comanda=${comanda.id}` 
      : `https://salesflow.com/?comanda=${comanda.id}`;
      
    const message = `*SalesFlow - Atualização de Comanda* 🛎️\n\nOlá, *${comanda.clientName}*!\nSeguem os detalhes atualizados da sua comanda (*${comanda.id}*):\n\n📍 *Unidade Oficial:* ${comanda.unit || 'Sede Principal'}\n📚 *Treinamento / Categoria:* ${comanda.courseOrTraining}\n📅 *Status Atual:* ${statusEmoji}\n\n*🛒 RESUMO DO CONSUMO:*\n${itemsText}\n\n*💰 TOTAL ACUMULADO:* R$ ${getComandaTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n🔗 *Acompanhe em tempo real, adicione itens e assine digitalmente:* \n${comandaLiveUrl}\n\nSalesFlow Automated Notification System`;
    
    // Clean phone number: remove non-digits
    const rawPhone = comanda.clientPhone || '';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    
    // If phone has a value but does not start with country code "55" (BRL standard), prepending "55" handles it
    if (cleanPhone && cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    
    return cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    // Validate if product is set and quantity is > 0
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    if (prod.stock < quantity) {
      alert(`Quantidade selecionada (${quantity}) excede o estoque disponível (${prod.stock} un).`);
      return;
    }

    onAddProduct(comanda.id, selectedProductId, quantity);
    setSelectedProductId('');
    setQuantity(1);
  };

  const handleStartEditQuantity = (item: OrderedItem) => {
    setIsEditingQuantityId(item.id);
    setTempQuantity(item.quantity);
  };

  const handleSaveQuantity = (itemId: string) => {
    onUpdateItemQuantity(comanda.id, itemId, tempQuantity);
    setIsEditingQuantityId(null);
  };

  const isPaid = comanda.status === 'Pago';

  // Get available products for the menu-dropdown
  const availableProductsForDropdown = products.filter(p => p.stock > 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
      {/* Detail header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-[#4F46E5] uppercase px-2 py-0.5 bg-indigo-50 rounded-full">
              Comanda Individual
            </span>
            <span className="text-[10px] text-slate-600 font-bold">Criado em: {new Date(comanda.createdAt || Date.now()).toLocaleDateString('pt-BR')}</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            {comanda.clientName}
            <span className="text-xs font-mono font-medium text-slate-400">({comanda.id})</span>
          </h1>
          <p className="text-xs text-slate-700 mt-1">
            {comanda.clientType === 'Colaborador' ? 'Departamento' : 'Treinamento'}: <strong className="text-slate-800">{comanda.courseOrTraining}</strong> | Mês de competência: <strong className="text-indigo-600">{comanda.month}</strong> | Unidade: <strong className="text-slate-800">{comanda.unit || 'Sede Principal'}</strong>
          </p>
          {(comanda.clientEmail || comanda.clientPhone) && (
            <p className="text-[11px] text-slate-600 mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-semibold">
              {comanda.clientEmail && <span className="inline-flex items-center gap-1">📧 <strong className="text-slate-600 dark:text-slate-300 font-semibold">{comanda.clientEmail}</strong></span>}
              {comanda.clientPhone && <span className="inline-flex items-center gap-1">📱 <strong className="text-slate-600 dark:text-slate-300 font-semibold">{comanda.clientPhone}</strong></span>}
            </p>
          )}
        </div>

        {onBackToList && (
          <button 
            onClick={onBackToList}
            className="sm:hidden text-xs text-black font-extrabold px-3 py-1 bg-[#C5A059] hover:bg-[#B38F4B] rounded-lg transition shadow-sm"
          >
            Voltar para Lista
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        
        {/* Main interactive items table section */}
        <div className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Itens Consumidos</h3>
            
            <div className="overflow-x-auto border border-slate-50 rounded-xl mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-2 px-3">Código</th>
                    <th className="py-2 px-3">Produto</th>
                    <th className="py-2 px-3 text-right">Valor Unit.</th>
                    <th className="py-2 px-3 text-center w-24">Quant.</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                    <th className="py-2 px-3 text-center">Assinatura Digital</th>
                    {!isPaid && <th className="py-2 px-3 text-right">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {comanda.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        Nenhum item adicionado a esta comanda.
                      </td>
                    </tr>
                  ) : (
                    comanda.items.map((item) => {
                      const itemSubtotal = Number(item.price || 0) * Number(item.quantity || 0);
                      const isItemSigned = !!item.signature;

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => setViewingItemDetail(item)}
                          className="hover:bg-indigo-50/45 cursor-pointer transition group/row"
                          title="Clique para ver data/hora e consulta detalhada do pedido"
                        >
                          <td className="py-3 px-3 font-mono text-[10px] text-slate-600 font-bold group-hover/row:text-semibold group-hover/row:text-[#C5A059] transition">{item.productCode}</td>
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-slate-900 block group-hover/row:text-[#C5A059] transition">{item.productName}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">Inserido em {new Date(item.timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold">R$ {Number(item.price || 0).toFixed(2)}</td>
                          
                          {/* Quantity Editor */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {isEditingQuantityId === item.id ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={tempQuantity}
                                  onChange={(e) => setTempQuantity(Number(e.target.value))}
                                  className="w-12 text-center border rounded-md py-0.5 text-xs font-bold"
                                />
                                <button
                                  onClick={() => handleSaveQuantity(item.id)}
                                  className="p-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 group">
                                <span className="font-bold text-slate-800">{item.quantity}</span>
                                {!isPaid && (
                                  <button
                                    onClick={() => handleStartEditQuantity(item)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
                                    title="Ajustar quantidade"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            R$ {Number(itemSubtotal || 0).toFixed(2)}
                          </td>

                          {/* Digital Signature Confirmation representation */}
                          <td className="py-3 px-3 text-center">
                            {isItemSigned ? (
                              <div className="inline-flex flex-col items-center justify-center">
                                {item.signature && item.signature !== 'MOCK_SIGNATURE_DATA' ? (
                                  <img
                                    src={item.signature}
                                    alt="Assinatura"
                                    referrerPolicy="no-referrer"
                                    className="max-h-8 max-w-[80px] bg-slate-50 border border-slate-100 rounded px-1 object-contain"
                                  />
                                ) : (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Assinado
                                  </span>
                                )}
                                {item.signedAt && (
                                  <span className="text-[9px] text-slate-600 font-bold block mt-0.5">{new Date(item.signedAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full font-bold">
                                Pendente
                              </span>
                            )}
                          </td>

                          {!isPaid && (
                            <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onRemoveItem(comanda.id, item.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-50 transition cursor-pointer"
                                title="Remover item da comanda"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Add Product Bar (Admin POS power-feature) */}
            {!isPaid && (
              <form onSubmit={handleAddItemSubmit} className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 mt-4">
                <div className="flex-1">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-xs py-1.5 px-2.5 focus:outline-none"
                  >
                    <option value="">-- Selecione um produto para adicionar rápido --</option>
                    {availableProductsForDropdown.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - R$ {Number(p.price || 0).toFixed(2)} (Estoque: {p.stock} un)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg text-xs py-1.5 px-2 text-center font-bold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!selectedProductId}
                  className="bg-[#C5A059] hover:bg-[#B38F4B] text-black font-extrabold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-black" />
                  Inserir
                </button>
              </form>
            )}
          </div>

          {/* Totals panel */}
          <div className="border-t border-slate-100 pt-6 mt-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider font-extrabold">Total da Comanda</span>
                <div className="text-2xl font-black text-slate-800 mt-0.5">
                  R$ {getComandaTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider font-extrabold block">Status</span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mt-0.5 ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {comanda.status}
                </span>
              </div>
            </div>

            {/* General Administrative Control Commands */}
            <div className="flex flex-wrap gap-2 mt-4">
              {!isPaid ? (
                <>
                  <button
                    onClick={() => {
                      if (confirm(`Fechar comanda de "${comanda.clientName}" e faturar no caixa?`)) {
                        onCloseComanda(comanda.id);
                      }
                    }}
                    className="flex-1 min-w-[150px] bg-[#C5A059] hover:bg-[#B38F4B] text-black text-xs font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-black" />
                    Fechar Comanda (Marcar Paga)
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleClosureReminder?.(comanda.id)}
                    className={`px-4.5 py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 hover:scale-102 transition duration-200 cursor-pointer shadow-sm ${
                      comanda.closureReminderActive 
                        ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                    title={comanda.closureReminderActive ? "Remover lembrete de fechamento enviado" : "Enviar notificação de fechamento no celular do Aluno"}
                  >
                    <Bell className={`w-4 h-4 ${comanda.closureReminderActive ? 'animate-bounce' : ''}`} />
                    {comanda.closureReminderActive ? 'Notificado/Lembrete Ativo 🔔' : 'Notificar Fechamento 📣'}
                  </button>
                </>
              ) : (
                <div className="flex-1 py-2.5 px-4 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Comanda Encerrada pelo Caixa
                </div>
              )}

              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4.5 py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20BA5A] text-white hover:scale-102 transition duration-200 shadow-sm cursor-pointer"
                title="Enviar atualizações da comanda para o WhatsApp do cliente"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                Enviar WhatsApp 💬
              </a>

              <button
                onClick={() => {
                  if (confirm(`Tem certeza que deseja EXCLUIR permanentemente a comanda de "${comanda.clientName}" do sistema com todos os itens?`)) {
                    onDeleteComanda(comanda.id);
                  }
                }}
                className="bg-[#C5A059] hover:bg-[#B38F4B] text-black border border-[#B38F4B] font-extrabold text-xs py-3 px-4 rounded-xl transition cursor-pointer shadow-sm"
                title="Excluir comanda"
              >
                Excluir Comanda
              </button>
            </div>
          </div>
        </div>

        {/* QR Code and Quick access simulation for mobile */}
        <div className="p-6 bg-slate-50/30 flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Acesso do Cliente</h3>
          
          <div className="max-w-[200px] w-full mb-6">
            <QRCodeGenerator
              value={typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?comanda=${comanda.id}` : `https://salesflow.com/?comanda=${comanda.id}`}
              onOpenSimulator={() => onOpenSimulatorForComanda(comanda.id)}
            />
          </div>

          <div className="text-center max-w-[240px]">
            <span className="text-[11px] font-bold text-slate-800 block">Auto-Atendimento via celular</span>
            <p className="text-[10px] text-slate-600 font-semibold leading-relaxed mt-1">
              O cliente escaneia este QR code para monitorar o consumo atualizado, adicionar novos produtos e assinar digitalmente os pedidos.
            </p>
            <button
              onClick={() => onOpenSimulatorForComanda(comanda.id)}
              className="mt-4 inline-flex items-center gap-1 bg-[#C5A059] hover:bg-[#B38F4B] text-black font-extrabold text-[11px] px-4 py-2 rounded-xl transition cursor-pointer shadow-sm"
            >
              Simular Smartphone
            </button>
          </div>
        </div>

      </div>

      {viewingItemDetail && (
        <div 
          id="cashier-item-detail-backdrop" 
          onClick={(e) => {
            if ((e.target as HTMLElement).id === "cashier-item-detail-backdrop" || (e.target as HTMLElement).id === "cashier-item-detail-close-btn") {
              setViewingItemDetail(null);
            }
          }}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn text-left cursor-pointer"
        >
          <div 
            id="cashier-item-detail-card" 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative text-left cursor-default"
          >
            <button
              id="cashier-item-detail-close-btn"
              onClick={() => setViewingItemDetail(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
              <span className="p-2 bg-amber-50 rounded-xl text-[#C5A059]">
                <Calendar className="w-4.5 h-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Consulta Detalhada de Pedido</h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-px">Identificador único do item e controle</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 block mb-0.5">Item Consumido</span>
                <span className="font-extrabold text-slate-800 text-sm leading-snug block">{viewingItemDetail.productName}</span>
                <span className="text-[10px] font-semibold text-indigo-600 font-mono mt-0.5 block">Código do Estoque: {viewingItemDetail.productCode}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-400 block mb-0.5">📅 Data de Lançamento</span>
                  <span className="font-extrabold text-slate-800 text-xs">
                    {new Date(viewingItemDetail.timestamp || Date.now()).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-400 block mb-0.5">🕒 Horário do Registro</span>
                  <span className="font-extrabold text-slate-800 text-xs">
                    {new Date(viewingItemDetail.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Preço Unitário</span>
                  <span className="font-extrabold text-slate-700">R$ {Number(viewingItemDetail.price || 0).toFixed(2)}</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Quantidade</span>
                  <span className="font-extrabold text-slate-700">{viewingItemDetail.quantity} un</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Subtotal Geral</span>
                  <span className="font-black text-[#C5A059] text-sm">
                    R$ {(Number(viewingItemDetail.price || 0) * Number(viewingItemDetail.quantity || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Status da Assinatura Digital</span>
                {viewingItemDetail.signature ? (
                  <div className="bg-emerald-50/60 rounded-2xl p-3 border border-emerald-150 text-emerald-800">
                    <span className="text-[10px] font-bold flex items-center gap-1.5 mb-2 text-emerald-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Confirmado e assinado digitalmente
                    </span>
                    <div className="bg-white border border-slate-100 rounded-xl p-2 flex justify-center max-h-[80px] overflow-hidden shadow-xs">
                      <img src={viewingItemDetail.signature} alt="Assinatura" className="h-12 object-contain" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50/50 rounded-2xl p-3 border border-rose-100 text-rose-800 font-semibold text-[10px] leading-relaxed">
                    Este item foi inserido no system, mas ainda <strong className="text-rose-700">não foi assinado</strong> pelo Aluno/Cliente de forma remota ou presencial.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-semibold italic">Consulta informativa</span>
              <div className="flex gap-2">
                <button
                  id="cashier-item-detail-exit-btn"
                  type="button"
                  onClick={() => setViewingItemDetail(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-150 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  Sair
                </button>
                <button
                  id="cashier-item-detail-finish-btn"
                  type="button"
                  onClick={() => setViewingItemDetail(null)}
                  className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#B38F4B] text-black border border-[#B38F4B] text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-black" />
                  Confirmar e Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
