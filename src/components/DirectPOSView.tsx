import React, { useMemo, useState, useEffect } from 'react';
import { Product, StockMovement } from '../types';
import { CheckCircle, CreditCard, Image as ImageIcon, Minus, Plus, Printer, Search, Trash2, User, RotateCcw, Undo2, Calendar, Hash, DollarSign, Lock, X } from 'lucide-react';

interface SaleRecord {
  saleNumber: string;
  customerName: string;
  items: { productId: string; productName: string; productCode: string; price: number; quantity: number }[];
  total: number;
  timestamp: string;
}

interface DirectPOSViewProps {
  products: Product[];
  operatingUnit?: string;
  setStockMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  stockMovements?: StockMovement[];
  onStockNotification?: (type: 'entrada' | 'saida' | 'ajuste', productName: string, quantity: number, reference: string) => void;
  verifyRefundLogin?: (login: string, password: string) => boolean;
}

interface CartItem {
  productId: string;
  productName: string;
  productCode: string;
  price: number;
  quantity: number;
}

interface FinishedSale {
  saleNumber: string;
  customerName: string;
  items: CartItem[];
  total: number;
  timestamp: string;
}

const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const createSaleNumber = () => String(Date.now()).slice(-6);

export default function DirectPOSView({
  products,
  operatingUnit = 'Sede Principal',
  setStockMovements,
  setProducts,
  stockMovements = [],
  onStockNotification,
  verifyRefundLogin
}: DirectPOSViewProps) {
  const [activeTab, setActiveTab] = useState<'venda' | 'estornos'>('venda');
  const [saleNumber, setSaleNumber] = useState(createSaleNumber);
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastSale, setLastSale] = useState<FinishedSale | null>(null);
  const [saleHistory, setSaleHistory] = useState<SaleRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem('salesflow_pdv_history') || '[]'); }
    catch { return []; }
  });
  const [searchSaleNumber, setSearchSaleNumber] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [pendingRefundSale, setPendingRefundSale] = useState<SaleRecord | null>(null);
  const [refundLogin, setRefundLogin] = useState('');
  const [refundPassword, setRefundPassword] = useState('');
  const [refundError, setRefundError] = useState('');

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const productSuggestions = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return [];
    return products
      .filter(p => p.stock > 0)
      .filter(p => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [products, productQuery]);

  const itemTotal = selectedProduct ? selectedProduct.price * quantity : 0;
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  const pastSalesFromMovements = useMemo(() => {
    const pdvMovements = stockMovements.filter(m => m.type === 'saida' && m.reference.startsWith('Venda PDV'));
    const groups = new Map<string, StockMovement[]>();
    pdvMovements.forEach(m => {
      const existing = groups.get(m.reference) || [];
      existing.push(m);
      groups.set(m.reference, existing);
    });
    const result: SaleRecord[] = [];
    groups.forEach((movements, ref) => {
      const saleNum = ref.replace('Venda PDV ', '');
      const saleTs = movements[0].timestamp;
      const items = movements.map(m => ({
        productId: m.productId,
        productName: m.productName,
        productCode: m.productCode,
        price: Number(m.price) || 0,
        quantity: m.quantity
      }));
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      result.push({ saleNumber: saleNum, customerName: '', items, total, timestamp: saleTs });
    });
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stockMovements]);

  const allSales = useMemo(() => {
    const merged = [...saleHistory];
    pastSalesFromMovements.forEach(ps => {
      if (!merged.some(m => m.saleNumber === ps.saleNumber)) {
        merged.push(ps);
      }
    });
    return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [saleHistory, pastSalesFromMovements]);

  const filteredSales = useMemo(() => {
    return allSales.filter(sale => {
      if (searchSaleNumber.trim() && !sale.saleNumber.includes(searchSaleNumber.trim())) return false;
      if (searchStartDate && new Date(sale.timestamp) < new Date(searchStartDate)) return false;
      if (searchEndDate) {
        const end = new Date(searchEndDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(sale.timestamp) > end) return false;
      }
      if (searchValue.trim()) {
        const val = parseFloat(searchValue.replace(',', '.'));
        if (!isNaN(val) && Math.abs(sale.total - val) > 0.01) return false;
      }
      return true;
    });
  }, [allSales, searchSaleNumber, searchStartDate, searchEndDate, searchValue]);

  const resetProductEntry = () => {
    setProductQuery('');
    setSelectedProductId(null);
    setQuantity(1);
  };

  const selectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setProductQuery(product.code);
    setQuantity(1);
  };

  const handleSearchSubmit = () => {
    if (selectedProduct) return;
    const query = productQuery.trim().toLowerCase();
    if (!query) return;

    const exactMatch = products.find(p => p.stock > 0 && (p.code.toLowerCase() === query || p.name.toLowerCase() === query));
    const fallbackMatch = productSuggestions[0];
    const product = exactMatch || fallbackMatch;

    if (!product) {
      alert('Produto não encontrado ou sem estoque.');
      return;
    }

    selectProduct(product);
  };

  const handleProductQueryChange = (value: string) => {
    setProductQuery(value);
    const query = value.trim().toLowerCase();
    const exactMatch = products.find(p => p.stock > 0 && (p.code.toLowerCase() === query || p.name.toLowerCase() === query));
    setSelectedProductId(exactMatch?.id || null);
  };

  const handleQuantityChange = (value: string) => {
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed)) return;
    setQuantity(Math.max(1, Math.floor(parsed)));
  };

  const handleAddItem = () => {
    if (lastSale) {
      alert('Clique em Nova Venda antes de iniciar outra compra.');
      return;
    }

    if (!selectedProduct) {
      handleSearchSubmit();
      return;
    }

    if (quantity > selectedProduct.stock) {
      alert(`Estoque insuficiente. Disponível: ${selectedProduct.stock} un.`);
      return;
    }

    const existing = cart.find(item => item.productId === selectedProduct.id);
    const currentCartQty = existing?.quantity || 0;
    if (currentCartQty + quantity > selectedProduct.stock) {
      alert(`Estoque insuficiente. Disponível: ${selectedProduct.stock} un.`);
      return;
    }

    const nextItem: CartItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productCode: selectedProduct.code,
      price: selectedProduct.price,
      quantity
    };

    setCart(prev => existing
      ? prev.map(item => item.productId === selectedProduct.id ? { ...item, quantity: item.quantity + quantity } : item)
      : [...prev, nextItem]
    );
    resetProductEntry();
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => prev
      .map(item => {
        if (item.productId !== productId) return item;
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) return null;
        if (nextQty > product.stock) {
          alert(`Estoque insuficiente. Disponível: ${product.stock} un.`);
          return item;
        }
        return { ...item, quantity: nextQty };
      })
      .filter(Boolean) as CartItem[]
    );
  };

  const persistProducts = (updatedProducts: Product[]) => {
    const now = new Date().toISOString();
    const versionedProducts = updatedProducts.map(product => {
      const previous = products.find(p => p.id === product.id);
      return previous && JSON.stringify({ ...previous, updatedAt: undefined }) === JSON.stringify({ ...product, updatedAt: undefined })
        ? product
        : { ...product, updatedAt: now };
    });
    setProducts(versionedProducts);
    localStorage.setItem('salesflow_products_v2', JSON.stringify(versionedProducts));
    localStorage.setItem('salesflow_comanda_version', Date.now().toString());
    fetch('/api/products/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(versionedProducts)
    }).catch(() => {});
  };

  const persistMovements = (movements: StockMovement[]) => {
    setStockMovements(prev => [...movements, ...prev].slice(0, 1000));
    localStorage.setItem('salesflow_comanda_version', Date.now().toString());
    movements.forEach(movement => {
      fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movement)
      }).catch(() => {});
    });
  };

  const handleFinalizeSale = () => {
    if (cart.length === 0) return;

    const now = new Date().toISOString();
    const currentSaleNumber = saleNumber;

    const updatedProducts = products.map(product => {
      const sold = cart.find(item => item.productId === product.id);
      return sold ? { ...product, stock: product.stock - sold.quantity } : product;
    });

    const movements: StockMovement[] = cart.map(item => ({
      id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      type: 'saida',
      quantity: item.quantity,
      price: item.price,
      totalValue: item.price * item.quantity,
      reference: `Venda PDV ${currentSaleNumber}`,
      timestamp: now
    }));

    persistProducts(updatedProducts);
    persistMovements(movements);

    cart.forEach(item => {
      onStockNotification?.('saida', item.productName, item.quantity, `Venda PDV ${currentSaleNumber}`);
    });

    const saleRecord: SaleRecord = {
      saleNumber: currentSaleNumber,
      customerName: customerName.trim() || 'Cliente consumidor',
      items: cart,
      total: cartTotal,
      timestamp: now
    };

    const updatedHistory = [saleRecord, ...saleHistory];
    setSaleHistory(updatedHistory);
    localStorage.setItem('salesflow_pdv_history', JSON.stringify(updatedHistory));

    setLastSale({
      saleNumber: currentSaleNumber,
      customerName: customerName.trim(),
      items: cart,
      total: cartTotal,
      timestamp: now
    });
    setCart([]);
    setCustomerName('');
    resetProductEntry();
  };

  const handleRefundRequest = (sale: SaleRecord) => {
    setPendingRefundSale(sale);
    setRefundLogin('');
    setRefundPassword('');
    setRefundError('');
    setShowRefundModal(true);
  };

  const handleConfirmRefund = () => {
    if (!pendingRefundSale) return;
    const valid = verifyRefundLogin?.(refundLogin.trim(), refundPassword);
    if (!valid) {
      setRefundError('Login ou senha inválidos.');
      return;
    }
    executeRefund(pendingRefundSale);
    closeRefundModal();
  };

  const closeRefundModal = () => {
    setShowRefundModal(false);
    setPendingRefundSale(null);
    setRefundLogin('');
    setRefundPassword('');
    setRefundError('');
  };

  const executeRefund = (sale: SaleRecord) => {
    if (!window.confirm(`Confirmar estorno da venda Nº ${sale.saleNumber}?\nValor: ${formatCurrency(sale.total)}\nItens: ${sale.items.length}`)) return;

    const now = new Date().toISOString();

    const updatedProducts = products.map(product => {
      const refunded = sale.items.find(item => item.productId === product.id);
      return refunded ? { ...product, stock: product.stock + refunded.quantity } : product;
    });

    const movements: StockMovement[] = sale.items.map(item => ({
      id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      type: 'entrada',
      quantity: item.quantity,
      price: item.price,
      totalValue: item.price * item.quantity,
      reference: `Estorno PDV ${sale.saleNumber}`,
      timestamp: now
    }));

    persistProducts(updatedProducts);
    persistMovements(movements);

    sale.items.forEach(item => {
      onStockNotification?.('entrada', item.productName, item.quantity, `Estorno PDV ${sale.saleNumber}`);
    });

    setSaleHistory(prev => {
      const updated = prev.filter(s => s.saleNumber !== sale.saleNumber);
      localStorage.setItem('salesflow_pdv_history', JSON.stringify(updated));
      return updated;
    });

    alert(`Venda Nº ${sale.saleNumber} estornada com sucesso!`);
  };

  const handlePrint = () => {
    const itemsHtml = receiptItems.map(item =>
      `<tr>
        <td style="padding:2px 4px;font-size:11px;font-family:monospace">${item.productName}</td>
        <td style="padding:2px 4px;font-size:11px;font-family:monospace;text-align:right">${item.quantity}</td>
        <td style="padding:2px 4px;font-size:11px;font-family:monospace;text-align:right">${item.price.toFixed(2).replace('.', ',')}</td>
        <td style="padding:2px 4px;font-size:11px;font-family:monospace;text-align:right">${(item.price * item.quantity).toFixed(2).replace('.', ',')}</td>
      </tr>`
    ).join('');

    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <meta charset="utf-8">
          <title>Cupom PDV ${receiptSaleNumber}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; padding: 8px; font-family: monospace; font-size: 11px; line-height: 1.3; }
            table { width: 100%; border-collapse: collapse; }
            td, th { padding: 2px 4px; font-size: 11px; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .dashed { border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; }
            .solid { border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size:13px">${operatingUnit}</div>
          <div class="center">ENDEREÇO DA EMPRESA</div>
          <div class="center">TEL: (00) 0000-0000</div>
          <div class="center">CNPJ: XX.XXX.XXX/0001-XX</div>
          <div class="center">DATA: ${new Date(receiptDate).toLocaleDateString('pt-BR')}</div>
          <div class="center">Nº Venda: ${receiptSaleNumber}</div>
          <div class="center bold" style="margin-top:4px">CUPOM NÃO FISCAL</div>
          <div class="dashed"></div>
          <table>
            <thead>
              <tr class="bold">
                <td style="width:auto">Descrição</td>
                <td style="width:36px;text-align:right">Qtde</td>
                <td style="width:52px;text-align:right">V.Unit.</td>
                <td style="width:58px;text-align:right">Total</td>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="dashed"></div>
          <div class="bold" style="margin-top:4px">CLIENTE: ${receiptCustomer.toUpperCase()}</div>
          <div style="margin-top:2px">PDV CUPOM NÃO FISCAL | FRENTE DE CAIXA</div>
          <div class="bold center" style="margin-top:6px">OBRIGADO PELA PREFERÊNCIA</div>
          <div class="solid"></div>
          <div style="margin-top:4px;font-size:10px" class="center">
            <div><strong>SubTotal:</strong> ${formatCurrency(receiptTotal)}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 300);
  };

  const handleNewSale = () => {
    setLastSale(null);
    setSaleNumber(createSaleNumber());
  };

  const receiptItems = lastSale?.items || cart;
  const receiptTotal = lastSale?.total ?? cartTotal;
  const receiptDate = lastSale?.timestamp || new Date().toISOString();
  const receiptSaleNumber = lastSale?.saleNumber || saleNumber;
  const receiptCustomer = lastSale?.customerName || customerName.trim() || 'Cliente consumidor';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-frz-card overflow-hidden animate-fadeIn">
      <div className="bg-frz-primary px-4 py-3 text-center text-lg md:text-xl font-black tracking-wide text-white">
        PDV - Venda Direta
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('venda')}
          className={`flex-1 py-3 text-sm font-black text-center cursor-pointer transition ${
            activeTab === 'venda'
              ? 'bg-white text-frz-primary border-b-2 border-frz-primary'
              : 'bg-slate-50 text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4 inline mr-1.5" />
          Nova Venda
        </button>
        <button
          onClick={() => setActiveTab('estornos')}
          className={`flex-1 py-3 text-sm font-black text-center cursor-pointer transition ${
            activeTab === 'estornos'
              ? 'bg-white text-frz-primary border-b-2 border-frz-primary'
              : 'bg-slate-50 text-slate-500 hover:text-slate-700'
          }`}
        >
          <Undo2 className="w-4 h-4 inline mr-1.5" />
          Estornos
        </button>
      </div>

      {activeTab === 'venda' ? (
        <>
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
            <span>Nº</span>
            <span className="bg-white text-slate-900 px-2.5 py-0.5 rounded-md font-mono border border-slate-200">{saleNumber}</span>
            {lastSale && (
              <span className="ml-auto inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle className="w-4 h-4" /> Venda registrada
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_360px] gap-6 p-5">
            <section className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-h-[340px] flex items-center justify-center">
              {selectedProduct?.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.name} className="max-h-[310px] w-full object-contain bg-white rounded-lg" />
              ) : selectedProduct ? (
                <div className="w-full h-[310px] bg-white rounded-lg flex flex-col items-center justify-center text-slate-300 border border-slate-100">
                  <ImageIcon className="w-16 h-16" />
                  <span className="text-xs font-bold mt-2 text-slate-400">Produto sem foto</span>
                </div>
              ) : (
                <div className="w-full h-[310px] bg-white rounded-lg flex flex-col items-center justify-center text-slate-400 text-center px-6 border border-slate-100">
                  <ImageIcon className="w-14 h-14 mb-3" />
                  <p className="text-sm font-black uppercase">Foto do produto</p>
                  <p className="text-xs mt-1">Aparece após inserir código ou nome.</p>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-black text-slate-800 mb-1">Código / Nome:</label>
                <div className="flex gap-2">
                  <input
                    value={productQuery}
                    onChange={e => handleProductQueryChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        selectedProduct ? handleAddItem() : handleSearchSubmit();
                      }
                    }}
                    className="w-full max-w-xl px-3 py-2.5 bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-xl text-xl font-mono shadow-inner focus:outline-none focus:border-frz-primary focus:bg-white transition"
                    placeholder="Digite ou escaneie o código"
                  />
                  <button
                    onClick={handleSearchSubmit}
                    className="w-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 flex items-center justify-center cursor-pointer transition"
                    title="Buscar produto"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>

                {!selectedProduct && productSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-w-xl bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                    {productSuggestions.map(product => (
                      <button
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        className="w-full text-left px-4 py-2.5 hover:bg-frz-primary/5 flex justify-between gap-3 text-sm cursor-pointer transition"
                      >
                        <span className="font-bold truncate">{product.name}</span>
                        <span className="font-mono text-slate-400 shrink-0">{product.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-black text-slate-800 mb-1">Quantidade:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 flex items-center justify-center cursor-pointer transition"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    value={quantity}
                    onChange={e => handleQuantityChange(e.target.value)}
                    className="w-28 px-3 py-2 bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-xl text-xl font-mono text-center shadow-inner focus:outline-none focus:border-frz-primary focus:bg-white transition"
                  />
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 flex items-center justify-center cursor-pointer transition"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-800 mb-1">Valor (R$):</label>
                <input
                  readOnly
                  value={selectedProduct ? selectedProduct.price.toFixed(2).replace('.', ',') : ''}
                  className="w-44 px-3 py-2 bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-xl text-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-800 mb-1">Total (R$):</label>
                <input
                  readOnly
                  value={selectedProduct ? itemTotal.toFixed(2).replace('.', ',') : ''}
                  className="w-44 px-3 py-2 bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-xl text-xl font-mono"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  onClick={handleAddItem}
                  className="w-56 py-3 bg-frz-primary hover:bg-frz-primary-hover text-white rounded-xl text-base font-black shadow-sm cursor-pointer transition"
                >
                  Venda
                </button>
                <button
                  onClick={resetProductEntry}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer transition"
                >
                  Limpar Produto
                </button>
              </div>
            </section>

            <aside className="space-y-3">
              <div className="bg-white text-slate-900 rounded-xl border-2 border-slate-200 shadow-sm p-4 min-h-[430px] font-mono text-[10px] flex flex-col">
                <div className="text-center border-b border-dashed border-slate-300 pb-2 mb-2 leading-tight">
                  <p className="font-black uppercase text-[11px]">{operatingUnit}</p>
                  <p>ENDEREÇO DA EMPRESA</p>
                  <p>TEL: (00) 0000-0000</p>
                  <p>CNPJ: XX.XXX.XXX/0001-XX</p>
                  <p>DATA: {new Date(receiptDate).toLocaleDateString('pt-BR')}</p>
                  <p>Nº Venda: {receiptSaleNumber}</p>
                  <p className="font-black mt-1">CUPOM NÃO FISCAL</p>
                </div>

                <div className="grid grid-cols-[1fr_32px_48px_54px] gap-1 font-bold border-b border-slate-200 pb-1 mb-1 text-slate-500">
                  <span>Descrição</span>
                  <span className="text-right">Qtde</span>
                  <span className="text-right">V.Unit.</span>
                  <span className="text-right">Total</span>
                </div>

                <div className="flex-1 space-y-1 overflow-y-auto pr-1">
                  {receiptItems.length === 0 ? (
                    <p className="text-center text-slate-300 py-10">Nenhum item lançado</p>
                  ) : receiptItems.map(item => (
                    <div key={item.productId} className="grid grid-cols-[1fr_32px_48px_54px] gap-1 items-start">
                      <span className="truncate" title={item.productName}>{item.productName}</span>
                      <span className="text-right">{item.quantity}</span>
                      <span className="text-right">{item.price.toFixed(2).replace('.', ',')}</span>
                      <span className="text-right">{(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 mt-2 leading-tight text-slate-600">
                  <p>CLIENTE: {receiptCustomer.toUpperCase()}</p>
                  <p>PDV CUPOM NÃO FISCAL | FRENTE DE CAIXA</p>
                  <p className="text-center font-bold text-slate-800 mt-1">OBRIGADO PELA PREFERÊNCIA</p>
                </div>
              </div>

              <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">Nome do Cliente (opcional)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Cliente consumidor"
                  className="w-full pl-9 pr-3 py-2.5 bg-white text-slate-900 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-frz-primary transition"
                />
              </div>

              <div className="flex items-center justify-between font-black px-1">
                <span className="text-xs text-slate-700">SubTotal:</span>
                <span className="text-xl font-mono text-slate-900">{formatCurrency(receiptTotal)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.print()}
                  className="py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button
                  onClick={handleFinalizeSale}
                  disabled={cart.length === 0}
                  className="py-3 bg-frz-primary hover:bg-frz-primary-hover disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  Finalizar
                </button>
              </div>

              {lastSale ? (
                <button
                  onClick={handleNewSale}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black cursor-pointer transition shadow-sm"
                >
                  Nova Venda
                </button>
              ) : cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Cupom
                </button>
              )}
            </aside>
          </div>
        </>
      ) : (
        <div className="p-5 space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
              <Undo2 className="w-4 h-4 text-frz-primary" />
              Buscar Vendas para Estorno
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Data Início</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={searchStartDate}
                    onChange={e => setSearchStartDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-frz-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Data Fim</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={searchEndDate}
                    onChange={e => setSearchEndDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-frz-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nº Nota</label>
                <div className="relative">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={searchSaleNumber}
                    onChange={e => setSearchSaleNumber(e.target.value)}
                    placeholder="Ex: 123456"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-frz-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Valor (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={searchValue}
                    onChange={e => setSearchValue(e.target.value)}
                    placeholder="Ex: 150,00"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-frz-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500">{filteredSales.length} venda(s) encontrada(s)</span>
            {filteredSales.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Undo2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-bold">Nenhuma venda encontrada</p>
                <p className="text-xs mt-1">Ajuste os filtros ou realize vendas no PDV.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredSales.map(sale => (
                  <div key={sale.saleNumber} className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-black font-mono text-slate-800">Nº {sale.saleNumber}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{new Date(sale.timestamp).toLocaleDateString('pt-BR')}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{new Date(sale.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{sale.customerName || 'Cliente consumidor'}</span>
                        <span className="mx-2">·</span>
                        <span>{sale.items.length} item(ns)</span>
                        <span className="mx-2">·</span>
                        <span className="font-mono">
                          {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-lg font-black font-mono text-slate-900">{formatCurrency(sale.total)}</span>
                      <button
                        onClick={() => handleRefundRequest(sale)}
                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Estornar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Lock className="w-4 h-4 text-frz-primary" />
                Autorização de Estorno
              </h3>
              <button onClick={closeRefundModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {pendingRefundSale && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
                Venda Nº {pendingRefundSale.saleNumber} · {formatCurrency(pendingRefundSale.total)} · {pendingRefundSale.items.length} item(ns)
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Usuário</label>
              <input
                value={refundLogin}
                onChange={e => setRefundLogin(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-frz-primary"
                placeholder="Nome de usuário admin"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Senha</label>
              <input
                type="password"
                value={refundPassword}
                onChange={e => setRefundPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirmRefund(); }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-frz-primary"
                placeholder="Senha do admin"
              />
            </div>
            {refundError && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 font-bold">{refundError}</div>
            )}
            <div className="flex gap-2">
              <button
                onClick={closeRefundModal}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRefund}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black cursor-pointer transition shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                Estornar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
