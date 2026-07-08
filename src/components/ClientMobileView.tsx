import React, { useState } from 'react';
import { Comanda, Product, OrderedItem } from '../types';
import { 
  QrCode, 
  ShoppingBag, 
  User, 
  BookOpen, 
  Calendar, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  Award,
  ChevronLeft,
  X,
  UserCheck,
  Bell,
  Check,
  Image as ImageIcon,
  Minus,
  Plus
} from 'lucide-react';
import SignaturePad from './SignaturePad';

interface ClientMobileViewProps {
  comandas: Comanda[];
  products: Product[];
  activeComandaId: string | null;
  isSyncing?: boolean;
  onAddProductFromClient: (comandaId: string, productId: string, quantity: number, signature: string) => void;
  onSignExistingItem: (comandaId: string, itemId: string, signature: string) => void;
  onDisconnectClient: () => void;
}

export default function ClientMobileView({
  comandas,
  products,
  activeComandaId,
  isSyncing = false,
  onAddProductFromClient,
  onSignExistingItem,
  onDisconnectClient
}: ClientMobileViewProps) {
  
  // Current active comanda lookup
  const currentComanda = comandas.find(c => c.id === activeComandaId);

  // States for registration form
  const [registerName, setRegisterName] = useState('');

  // Ordering mode states
  const [isOrdering, setIsOrdering] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);
  const [orderFeedback, setOrderFeedback] = useState('');

  // Signature sequence states
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [itemToSignId, setItemToSignId] = useState<string | null>(null); // if signing existing item
  const [viewingItemDetail, setViewingItemDetail] = useState<OrderedItem | null>(null);
  
  // Real-time closure reminder states
  const [isReminderDismissed, setIsReminderDismissed] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);

  // Browser-level notification states
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [showSimulatedAlert, setShowSimulatedAlert] = useState(false);
  const [alertContent, setAlertContent] = useState<{ title: string; body: string } | null>(null);

  const selectedOrderProduct = products.find(p => p.id === selectedProductId);
  const signedItemsCount = currentComanda?.items.filter(item => !!item.signature).length || 0;
  const pendingSignatureCount = Math.max((currentComanda?.items.length || 0) - signedItemsCount, 0);

  // Auto-reset alert status if cashier triggers a fresh real-time update
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  React.useEffect(() => {
    if (currentComanda?.closureReminderActive) {
      setIsReminderDismissed(false);
    }
  }, [currentComanda?.closureReminderActive]);

  React.useEffect(() => {
    if (!orderFeedback) return;
    const timer = setTimeout(() => setOrderFeedback(''), 5000);
    return () => clearTimeout(timer);
  }, [orderFeedback]);

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.35);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.35);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      gain2.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.6);
      osc2.start(audioCtx.currentTime + 0.15);
      osc2.stop(audioCtx.currentTime + 0.6);

      const osc3 = audioCtx.createOscillator();
      const gain3 = audioCtx.createGain();
      osc3.connect(gain3);
      gain3.connect(audioCtx.destination);
      osc3.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
      gain3.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.85);
      osc3.start(audioCtx.currentTime + 0.3);
      osc3.stop(audioCtx.currentTime + 0.85);
    } catch (e) {
      console.warn("Audio notification not supported:", e);
    }
  };

  const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações de sistema integradas, mas o SalesFlow usará avisos e sons embutidos!');
      return;
    }
    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
      if (permission === 'granted') {
        playChime();
        try {
          new Notification('SalesFlow - Alertas Ativos! 🔔', {
            body: 'Excelente! Você será alertado pelo navegador assim que sua comanda for fechada.',
          });
        } catch (err) {
          console.warn("Failed to dispatch test desktop notification:", err);
        }
      }
    });
  };

  // Audio notification chime on comanda closure
  React.useEffect(() => {
    if (currentComanda) {
      if (prevStatus === 'Pendente' && currentComanda.status === 'Pago') {
        playChime();

        // 1. Dispatch real browser level desktop notification if allowed
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`COM-PAGA: Comanda Recebida! 🎉`, {
              body: `Olá ${currentComanda.clientName}, seu pagamento da comanda ${currentComanda.id} foi faturado e confirmado pelo Caixa. Obrigado!`,
              tag: currentComanda.id,
              requireInteraction: true
            });
          } catch (e) {
            console.warn("Failed to spawn native notification API. Standard iframe security limitation.", e);
          }
        }

        // 2. Spawn a highly conspicuous simulated browser push card inside the view so they never miss it!
        setAlertContent({
          title: `SalesFlow Navegador • ${currentComanda.id}`,
          body: `Prezado(a) ${currentComanda.clientName}, recebemos a confirmação de quitação e o encerramento com sucesso do seu consumo!`
        });
        setShowSimulatedAlert(true);

        // 3. Fallback alert trigger for accessibility
        try {
          // Add soft browser vibration sequence
          if ('vibrate' in navigator) {
            navigator.vibrate([150, 100, 150]);
          }
        } catch (e) {}
      }
      setPrevStatus(currentComanda.status);
    } else {
      setPrevStatus(null);
    }
  }, [currentComanda?.status, prevStatus]);

  const getComandaTotal = () => {
    if (!currentComanda) return 0;
    return currentComanda.items.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  };

  const handleOrderInitiate = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    if (prod.stock < orderQuantity) {
      alert(`Quantidade desejada (${orderQuantity}) excede o estoque disponível (${prod.stock} un).`);
      return;
    }

    // Launch Signature Pad to validate receipt of order digital signature
    setItemToSignId(null);
    setShowSignaturePad(true);
  };

  const handleSignatureSave = (signatureDataUrl: string) => {
    if (!currentComanda) return;

    if (itemToSignId) {
      // Signing an existing item in the ticket
      onSignExistingItem(currentComanda.id, itemToSignId, signatureDataUrl);
      setItemToSignId(null);
    } else {
      // Placing a new order with instant signature
      onAddProductFromClient(currentComanda.id, selectedProductId, orderQuantity, signatureDataUrl);
      const productName = products.find(p => p.id === selectedProductId)?.name || 'item';
      setOrderFeedback(`${orderQuantity}x ${productName} confirmado e assinado. Acompanhe abaixo em Meus Pedidos.`);
      // Reset order state
      setIsOrdering(false);
      setSelectedProductId('');
      setOrderQuantity(1);
    }
    setShowSignaturePad(false);
  };

  return (
    <div className="mx-auto w-full max-w-[390px] min-h-[100dvh] sm:min-h-[620px] bg-slate-50 sm:rounded-2xl shadow-lg border border-slate-200 relative flex flex-col overflow-hidden animate-fadeIn select-none">
      
      {/* Screen Content Window */}
      <div className="flex-1 overflow-y-auto relative flex flex-col p-4 pt-3 text-slate-700">
        
        {/* Simulated Native Browser Notification Banner */}
        {showSimulatedAlert && alertContent && (
          <div 
            onClick={() => setShowSimulatedAlert(false)}
            className="absolute top-3 left-3 right-3 z-[99999] bg-slate-900/95 backdrop-blur-md rounded-2xl border border-emerald-500/30 shadow-2xl p-3.5 flex items-start gap-3.5 animate-slideDown select-none cursor-pointer hover:bg-slate-950 transition duration-150 text-white"
          >
            <div className="p-2 bg-emerald-500 text-white rounded-xl shrink-0 shadow-md animate-bounce mt-0.5 animate-pulse">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-grow min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block font-mono">Notificação do Navegador</span>
              <span className="text-xs font-black text-white block mt-0.5 leading-snug">{alertContent.title}</span>
              <p className="text-[10.5px] text-slate-300 leading-normal mt-1 font-medium">{alertContent.body}</p>
              
              <div className="flex gap-2.5 mt-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSimulatedAlert(false);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition shadow-sm uppercase tracking-wide cursor-pointer font-mono"
                >
                  Confirmar e Ver Recibo 🧾
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSimulatedAlert(false);
              }}
              className="text-slate-400 hover:text-white p-0.5 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Closure warning overlay triggered by cashier sync */}
        {currentComanda && currentComanda.closureReminderActive && !isReminderDismissed && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn text-left">
            <div className="bg-slate-900 border border-amber-500/25 rounded-3xl p-5 w-full max-w-[340px] shadow-2xl relative text-left text-white space-y-4 animate-slideUp">
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/35 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-extrabold font-sans text-amber-400 uppercase tracking-wide">AVISO DE FECHAMENTO! ⏰</h3>
                <p className="text-[11px] text-slate-300 mt-1 font-semibold">
                  Olá, <strong className="text-slate-100">{currentComanda.clientName}</strong>!
                </p>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed text-slate-300 text-center bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <p>
                  O operador de caixa solicitou o fechamento antecipado de consumo. Por favor, apresente-se no balcão antes de se ausentar do curso.
                </p>
                <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase">Dívida Parcial</span>
                  <span className="font-extrabold text-frz-primary">
                    R$ {getComandaTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsReminderDismissed(true)}
                  className="w-full py-2 bg-frz-primary hover:bg-frz-primary-hover text-white font-black text-xs rounded-xl transition duration-200 cursor-pointer shadow-sm uppercase tracking-wider text-center"
                >
                  Entendido, vou ao Caixa 🔥
                </button>
                <p className="text-[9px] text-slate-400 text-center font-medium">
                  Dirija-se ao guichê para liquidar seu consumo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* If custom signature pad overlays */}
        {showSignaturePad && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <SignaturePad
              onSave={handleSignatureSave}
              onCancel={() => setShowSignaturePad(false)}
            />
          </div>
        )}

        {/* Product image preview modal */}
        {previewProductId && (() => {
          const prod = products.find(p => p.id === previewProductId);
          if (!prod) return null;
          return (
            <div
              id="product-preview-backdrop"
              onClick={(e) => {
                if ((e.target as HTMLElement).id === "product-preview-backdrop") setPreviewProductId(null);
              }}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-[340px] shadow-2xl border border-slate-100 overflow-hidden animate-slideUp"
              >
                {/* Product image */}
                <div className="relative bg-slate-100 flex items-center justify-center min-h-[200px]">
                  {prod.image ? (
                    <img src={prod.image} alt={prod.name} className="w-full max-h-[260px] object-contain p-4" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-8">
                      <ImageIcon className="w-16 h-16 mb-2" />
                      <span className="text-xs font-bold">Sem imagem</span>
                    </div>
                  )}
                  <button
                    onClick={() => setPreviewProductId(null)}
                    className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur rounded-full text-slate-600 hover:text-slate-900 shadow-sm cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Product info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">{prod.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400">{prod.code}</span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-400 block">Preço</span>
                      <span className="text-lg font-black text-frz-primary">R$ {prod.price.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] uppercase font-black text-slate-400 block">Estoque</span>
                      <span className={`text-sm font-black ${prod.stock === 0 ? 'text-red-500' : prod.stock < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {prod.stock} un
                      </span>
                    </div>
                  </div>

                  {prod.category && (
                    <div className="text-[10px] text-slate-500">
                      <span className="font-bold text-slate-400">Categoria:</span> {prod.category}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setPreviewProductId(null)}
                      className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-xl transition cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProductId(prod.id);
                        setOrderQuantity(current => Math.min(Math.max(current, 1), Math.max(prod.stock, 1)));
                        setPreviewProductId(null);
                      }}
                      disabled={prod.stock === 0}
                      className="flex-1 py-2.5 bg-frz-primary hover:bg-frz-primary-hover text-white text-[10px] font-black rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {prod.stock === 0 ? 'Indisponível' : 'Selecionar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* If order item detail modal overlay */}
        {viewingItemDetail && (
          <div 
            id="mobile-item-detail-backdrop"
            onClick={(e) => {
              if ((e.target as HTMLElement).id === "mobile-item-detail-backdrop" || (e.target as HTMLElement).id === "mobile-item-detail-close-btn") {
                setViewingItemDetail(null);
              }
            }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-4.5 w-full max-w-[340px] shadow-2xl border border-slate-100 relative text-left cursor-default"
            >
              <button
                id="mobile-item-detail-close-btn"
                onClick={() => setViewingItemDetail(null)}
                className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 mb-3 border-b border-slate-150 pb-2">
                <span className="p-1.5 bg-amber-50 rounded-lg text-frz-primary">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                <h3 className="text-xs font-black text-slate-900 uppercase">Detalhes do Pedido</h3>
              </div>

              <div className="space-y-3 text-xs leading-normal">
                <div>
                  <span className="text-[8px] uppercase font-black text-slate-400 block mb-0.5">Produto</span>
                  <span className="font-extrabold text-slate-800 text-xs block leading-tight">{viewingItemDetail.productName}</span>
                  <span className="text-[9px] font-mono text-slate-500">Cod: {viewingItemDetail.productCode}</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[8px] uppercase font-black text-slate-400 block">📅 Data</span>
                    <span className="font-extrabold text-slate-700 text-[11px]">
                      {new Date(viewingItemDetail.timestamp || Date.now()).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-black text-slate-400 block">🕒 Hora</span>
                    <span className="font-extrabold text-slate-700 text-[11px]">
                      {new Date(viewingItemDetail.timestamp || Date.now()).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 py-1 px-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block">Valor</span>
                    <span className="font-bold text-slate-700">R$ {Number(viewingItemDetail.price || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] text-slate-400 font-bold block">Quant.</span>
                    <span className="font-bold text-slate-700">{viewingItemDetail.quantity}x</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-400 font-bold block">Total</span>
                    <span className="font-extrabold text-frz-primary">
                      R$ {(Number(viewingItemDetail.price || 0) * Number(viewingItemDetail.quantity || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[8px] uppercase font-black text-slate-400 block mb-1">Confirmação Digital</span>
                  {viewingItemDetail.signature ? (
                    <div className="bg-emerald-50/65 rounded-xl p-2 border border-emerald-150 text-emerald-800">
                      <span className="text-[9px] font-bold flex items-center gap-1 mb-1 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Assinado pelo Cliente
                      </span>
                      <div className="bg-white border border-slate-100 rounded p-1 flex justify-center max-h-[50px] overflow-hidden">
                        <img src={viewingItemDetail.signature} alt="Assinatura" className="h-8 object-contain" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/65 rounded-xl p-2 border border-amber-150 text-amber-800 font-bold text-[9px]">
                      Este pedido ainda não possui assinatura digital de recebimento.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[9px] text-slate-400 font-semibold italic">Consulta informativa</span>
                <div className="flex gap-1.5 font-sans">
                  <button
                    type="button"
                    onClick={() => setViewingItemDetail(null)}
                    className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-lg transition cursor-pointer"
                  >
                    Sair
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingItemDetail(null)}
                    className="px-3 py-1.5 bg-frz-primary hover:bg-frz-primary-hover text-white text-[10px] font-black rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Check className="w-3 h-3 text-white" />
                    Confirmar e Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WELCOME SHEET OR FORM IF VISITOR NO ACTIVE COMANDA */}
        {!currentComanda && activeComandaId ? (
          <div className="flex-1 flex flex-col justify-center animate-fadeIn text-center px-4">
            <div className="w-16 h-16 bg-frz-primary/15 text-frz-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs border border-frz-primary/20">
              <QrCode className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-lg font-black text-slate-900">{isSyncing ? 'Carregando sua comanda' : 'Comanda não localizada'}</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {isSyncing ? 'Estamos sincronizando' : 'Não encontramos'} a comanda <strong className="text-slate-700 font-mono">{activeComandaId}</strong> recebida pelo link.
            </p>
            <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-wider">
              {isSyncing ? 'Não é necessário digitar código ou fazer login.' : 'Confirme se a comanda continua aberta no caixa.'}
            </p>
          </div>
        ) : !currentComanda ? (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn">
            <div>
              {/* Virtual Badge */}
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-frz-primary/15 text-frz-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs border border-frz-primary/20">
                  <UserCheck className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Área do Cliente</h2>
                <p className="text-xs text-slate-400 mt-1">Acesso ao Auto-Atendimento</p>
              </div>

              {/* Enter existing comanda form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-2">
                  <strong className="text-slate-700">Acesso por comanda existente:</strong> informe o código recebido no caixa ou escaneie o QR Code gerado para a sua comanda.
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    Código da sua Comanda (ex: COM-4891)
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o código recebido..."
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const cleanId = registerName.trim();
                    if (!cleanId) {
                      alert('Por favor, informe seu código de comanda.');
                      return;
                    }
                    const found = comandas.find(c => c.id === cleanId);
                    if (found) {
                      // Save and sync with storage event
                      localStorage.setItem('salesflow_client_active_id_v2', cleanId);
                      window.dispatchEvent(new StorageEvent('storage', {
                        key: 'salesflow_client_active_id_v2',
                        newValue: cleanId
                      }));
                    } else {
                      alert(`Comanda "${cleanId}" não localizada. Cadastre a comanda com este código no painel de controle antes.`);
                    }
                  }}
                  className="w-full py-2.5 bg-frz-primary hover:bg-frz-primary-hover text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer font-mono font-bold"
                >
                  <UserCheck className="w-4 h-4" />
                  VINCULAR PELO CÓDIGO
                </button>
              </div>
            </div>

            <div className="text-center pt-8">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">SalesFlow Digital Client</span>
            </div>
          </div>
        ) : currentComanda.status === 'Pago' ? (
          /* IMERSIVO RECEIPT FOR CLOSED/PAID COMANDA */
          <div className="flex-1 flex flex-col justify-between animate-fadeIn text-slate-800">
            <div className="space-y-4">
              {/* Animated Success Badge wrapper */}
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                  <CheckCircle2 className="w-9 h-9 animate-bounce" />
                </div>
                <h2 className="text-base font-black text-slate-900 font-mono">Comanda Encerrada! 🎉</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Seu pagamento foi confirmado pelo Caixa</p>
              </div>

              {/* Receipt Body with Stamp and Itemization */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4.5 relative overflow-hidden">
                {/* Diagonal PAGO / CONCLUIDO Stamp */}
                <div className="absolute right-3.5 top-3.5 border-4 border-dashed border-emerald-500 text-emerald-500 font-mono font-black text-[10px] px-2.5 py-1 bg-white/95 rounded-lg rotate-[15deg] select-none shadow-xs z-10 animate-pulse">
                  RECEBIDO / PAGO
                </div>

                <div className="border-b border-dashed border-slate-200 pb-3 flex justify-between items-end">
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase font-mono block">CÓDIGO DE TRANSAÇÃO</span>
                    <h4 className="text-xs font-mono font-black text-slate-800 mt-0.5">{currentComanda.id}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-300 block font-mono font-bold uppercase">FECHAMENTO</span>
                    <span className="text-[9px] text-slate-600 font-bold font-mono">
                      {currentComanda.closedAt ? new Date(currentComanda.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Details list */}
                <div className="my-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Cliente:</span>
                    <span className="font-extrabold text-slate-800">{currentComanda.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Categoria/Curso:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px] inline-block">{currentComanda.courseOrTraining}</span>
                  </div>
                </div>

                {/* Items Summary list */}
                <div className="border-t border-slate-100 pt-2.5">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider font-mono block mb-1.5">Resumo Dos Itens Pagos</span>
                  <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                    {currentComanda.items && currentComanda.items.length > 0 ? (
                      currentComanda.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-600 truncate max-w-[150px] font-medium">
                            {item.quantity}x {item.productName}
                          </span>
                          <span className="text-slate-900 font-mono font-bold">
                            R$ {(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">Nenhum consumo registrado nesta comanda.</div>
                    )}
                  </div>
                </div>

                {/* Total amount closed */}
                <div className="border-t border-dashed border-slate-200 mt-3 pt-2.5 flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase font-mono">Total Pago & Quitado</span>
                  <span className="text-base font-black text-emerald-600 font-mono">
                    R$ {getComandaTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Clear option buttons */}
            <div className="space-y-2.5 pt-4 text-center">
              <button
                type="button"
                onClick={onDisconnectClient}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition duration-150 uppercase tracking-wider font-mono cursor-pointer"
              >
                Nova Comanda
              </button>
              <p className="text-[9px] text-slate-400 font-medium leading-relaxed px-2">
                Sua comanda foi devidamente faturada, finalizada e arquivada no sistema de faturamento principal.
              </p>
            </div>
          </div>
        ) : (
          /* USER HAS ACTIVE SESSION COMANDA */
          <div className="flex-1 flex flex-col justify-between animate-fadeIn">
            
            {/* Real-time comanda screen view */}
            <div>
              {/* Header card with switch action */}
              <div className="flex justify-end items-center mb-4">
                <button
                  onClick={onDisconnectClient}
                  className="text-[10px] font-extrabold text-white bg-frz-primary hover:bg-frz-primary-hover border border-frz-primary-hover/30 px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer"
                >
                  Sair da Conta
                </button>
              </div>

              {/* Browser Notification Setup Bar */}
              {notificationPermission !== 'granted' && (
                <div className="bg-gradient-to-r from-amber-500/10 to-indigo-50/15 border border-frz-primary/25 rounded-2xl p-3 mb-4 flex items-center justify-between gap-2.5 text-left animate-fadeIn">
                  <div className="flex items-start gap-2 max-w-[70%]">
                    <div className="p-1 px-[7px] bg-frz-primary/10 text-frz-primary rounded-lg shrink-0 mt-0.5 animate-pulse">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500 block font-mono">Notificações no Navegador</span>
                      <p className="text-[10px] text-slate-600 leading-snug mt-0.5 font-medium">
                        Deseja ouvir o som e ver o alerta na tela assim que sua conta for encerrada?
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    className="px-2.5 py-1.5 bg-frz-primary hover:bg-frz-primary-hover text-white text-[9.5px] font-black rounded-lg transition shrink-0 cursor-pointer shadow-xs uppercase tracking-wider font-mono hover:scale-105 active:scale-95"
                  >
                    Ativar
                  </button>
                </div>
              )}

              {/* Main client membership visual ticket */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-3xl shadow-md border border-indigo-950 mb-4.5 relative overflow-hidden">
                <div className="absolute right-[-10px] top-[-10px] opacity-10">
                  <Award className="w-32 h-32" />
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-indigo-300 font-bold">Comanda Código Digital</span>
                    <h3 className="text-lg font-mono font-black mt-0.5">{currentComanda.id}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-bold border border-white/10">
                    {currentComanda.clientType}
                  </span>
                </div>

                <div className="mt-5">
                  <span className="text-[8px] uppercase text-indigo-300 tracking-wider">Cliente de Atendimento</span>
                  <p className="text-sm font-black truncate">{currentComanda.clientName}</p>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-white/10 pt-2.5 text-[10px]">
                  <div>
                    <span className="text-[8px] text-indigo-300 block">
                      {currentComanda.clientType === 'Colaborador' ? 'Departamento' : 'Treinamento'}
                    </span>
                    <span className="font-bold truncate block">{currentComanda.courseOrTraining}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-indigo-300 block">Período</span>
                    <span className="font-bold">{currentComanda.month}</span>
                  </div>
                </div>
              </div>

              {/* Financial Outstanding balance */}
              <div className="bg-white px-4.5 py-3 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between mb-4.5 text-xs">
                <div>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">Consumo Total Acumulado</span>
                  <div className="text-xl font-black text-slate-800 mt-0.5">
                    R$ {getComandaTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1 font-bold">
                    {currentComanda.items.length} pedido(s) · {signedItemsCount} assinado(s){pendingSignatureCount > 0 ? ` · ${pendingSignatureCount} pendente(s)` : ''}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 animate-pulse">
                  {currentComanda.status}
                </span>
              </div>

              {orderFeedback && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl mb-4.5 flex items-start gap-2.5 animate-slideDown text-left">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider block">Pedido enviado</span>
                    <p className="text-[10px] font-bold leading-snug mt-0.5">{orderFeedback}</p>
                  </div>
                </div>
              )}

              {/* Real-time Closure Reminder Active banner indicator */}
              {currentComanda.closureReminderActive && (
                <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-2xl flex items-center gap-2.5 mb-4.5 animate-pulse text-left text-amber-900">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                    <Bell className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-amber-800 block">Lembrete de Fechamento</span>
                    <span className="text-[10px] font-semibold text-amber-950 leading-tight">Vá ao Caixa para concluir seu check-out e pagar a conta.</span>
                  </div>
                </div>
              )}

              {/* View/Place orders Toggle segment */}
              {!isOrdering ? (
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Meus Pedidos:</h4>
                    <button
                      onClick={() => setIsOrdering(true)}
                      className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      + Novo Pedido
                    </button>
                  </div>

                  {currentComanda.items.length === 0 ? (
                    <div className="bg-white/60 text-center py-8 rounded-2xl border border-dashed border-slate-200 mb-4 animate-fadeIn">
                      <ShoppingBag className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-[11px] text-slate-700 font-bold mb-1">Nenhum pedido feito ainda.</p>
                      <button
                        onClick={() => setIsOrdering(true)}
                        className="mt-2 text-[10px] bg-frz-primary hover:bg-frz-primary-hover text-white py-1 px-3 rounded-lg font-black transition cursor-pointer"
                      >
                        Peça Agora mesmo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[190px] overflow-y-auto mb-4 pr-1">
                      {currentComanda.items.map((item) => {
                        const isSigned = !!item.signature;

                        return (
                          <div 
                            key={item.id} 
                            onClick={() => setViewingItemDetail(item)}
                            className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs cursor-pointer hover:border-frz-primary transition shadow-xs group/item text-left"
                            title="Clique para ver data/hora e detalhes do pedido"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                              {(() => {
                                const prod = products.find(p => p.id === item.productId);
                                return prod?.image ? (
                                  <img src={prod.image} alt={item.productName} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  </div>
                                );
                              })()}
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 block truncate group-hover/item:text-frz-primary transition">{item.productName}</span>
                                <span className="text-[9px] font-mono text-slate-400">{item.productCode} • {item.quantity} un x R$ {Number(item.price || 0).toFixed(2)}</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end">
                              <span className="font-black text-slate-900">R$ {(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</span>
                              
                              {/* Client side signature actions */}
                              {isSigned ? (
                                <span className="text-[8px] bg-emerald-50 text-emerald-600 font-black tracking-wider uppercase px-1.5 py-0.5 rounded-full mt-1 flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Assinado
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemToSignId(item.id);
                                    setShowSignaturePad(true);
                                  }}
                                  className="text-[9px] bg-frz-primary hover:bg-frz-primary-hover text-white font-extrabold tracking-wider uppercase px-2 py-1 rounded-full mt-1 border border-frz-primary-hover/30 transition duration-150 cursor-pointer"
                                >
                                  Assinar Recebido ↓
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* CLIENT DIGITAL MENU TO PLACE ORDER */
                <div className="bg-white p-4.5 rounded-2xl border border-indigo-100 shadow-sm animate-slideLeft mb-4.5">
                  <div className="flex items-center gap-1.5 text-indigo-950 font-bold mb-3.5">
                    <button onClick={() => setIsOrdering(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                      <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </button>
                    <span className="text-xs font-bold uppercase tracking-wider">Novo Pedido Próprio</span>
                  </div>

                  <p className="text-[10px] text-slate-400 mb-3.5 leading-relaxed">
                    Escolha itens do estoque validado. Seu pedido precisará de uma assinatura digital final antes do recebimento.
                  </p>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5">Selecionar Item</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
                        {products.filter(p => p.stock > 0).length === 0 ? (
                          <div className="col-span-2 text-center py-4 text-slate-400 text-[10px]">Nenhum produto disponível no momento.</div>
                        ) : (
                          products.filter(p => p.stock > 0).map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPreviewProductId(p.id)}
                              className={`relative p-2 rounded-xl border-2 text-left transition cursor-pointer ${
                                selectedProductId === p.id
                                  ? 'border-frz-primary bg-amber-50 shadow-sm'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-16 object-cover rounded-lg mb-1.5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : (
                                <div className="w-full h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 mb-1.5">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                              )}
                              <span className="text-[10px] font-bold text-slate-800 block leading-tight">{p.name}</span>
                              <span className="text-[9px] font-bold text-frz-primary block mt-0.5">R$ {Number(p.price || 0).toFixed(2)}</span>
                              <span className="text-[8px] text-slate-400 block">{p.stock} un</span>
                              {selectedProductId === p.id && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-frz-primary rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {selectedOrderProduct && (
                      <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-3 text-left">
                        <span className="text-[8px] font-black uppercase tracking-wider text-amber-700 block">Item selecionado para assinatura</span>
                        <div className="flex items-center justify-between gap-3 mt-1">
                          <span className="text-xs font-black text-slate-800 truncate">{selectedOrderProduct.name}</span>
                          <span className="text-[10px] font-mono font-bold text-amber-700 shrink-0">Estoque: {selectedOrderProduct.stock}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Quantidade</label>
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                            className="p-2 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={selectedOrderProduct?.stock || 20}
                            value={orderQuantity}
                            onChange={(e) => setOrderQuantity(Math.min(selectedOrderProduct?.stock || 20, Math.max(1, Number(e.target.value))))}
                            className="w-full bg-transparent text-xs font-bold py-2 text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setOrderQuantity(Math.min(selectedOrderProduct?.stock || 20, orderQuantity + 1))}
                            className="p-2 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display calculations */}
                      {selectedProductId && (
                        <div className="flex-1 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 flex flex-col justify-center text-right">
                          <span className="text-[8px] uppercase text-indigo-500 tracking-wider font-bold">Subtotal Estimado</span>
                          <span className="text-sm font-black text-indigo-950">
                            R$ {(Number(products.find(p => p.id === selectedProductId)?.price || 0) * Number(orderQuantity || 0)).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Fazer o pedido launch modal signature validation */}
                    <button
                      type="button"
                      disabled={!selectedProductId}
                      onClick={handleOrderInitiate}
                      className="w-full mt-3 py-2.5 bg-frz-primary hover:bg-frz-primary-hover text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Continuar para Assinar e Confirmar
                    </button>
                    <p className="text-[9px] text-slate-500 text-center font-bold leading-snug">
                      A assinatura digital confirma o recebimento e envia o pedido ao caixa em tempo real.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Client Assistance Alert footer */}
            <div className="bg-slate-200/80 p-3 rounded-2xl text-center text-[10px] text-slate-700 font-extrabold flex items-center justify-center gap-1.5 border border-slate-300/60">
              <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>Para pagar e fechar, dirija-se ao Caixa.</span>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}
