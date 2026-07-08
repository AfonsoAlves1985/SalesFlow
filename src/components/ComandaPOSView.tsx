import React, { useState, useMemo } from 'react';
import { Comanda, Product, OrderedItem } from '../types';
import { X, Plus, Minus, Trash2, Search, ShoppingCart, Image as ImageIcon, Check, ChevronLeft, CreditCard, Printer } from 'lucide-react';

interface ComandaPOSViewProps {
  comanda: Comanda;
  products: Product[];
  onAddProduct: (comandaId: string, productId: string, quantity: number) => void;
  onRemoveItem: (comandaId: string, itemId: string) => void;
  onUpdateItemQuantity: (comandaId: string, itemId: string, quantity: number) => void;
  onCloseComanda: (comandaId: string) => void;
  onBackToList?: () => void;
}

export default function ComandaPOSView({
  comanda,
  products,
  onAddProduct,
  onRemoveItem,
  onUpdateItemQuantity,
  onCloseComanda,
  onBackToList
}: ComandaPOSViewProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))] as string[];
    return cats;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.stock > 0);
    if (activeCategory) list = list.filter(p => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, activeCategory, search]);

  const getQty = (productId: string) => quantities[productId] || 1;

  const handleQuickAdd = (productId: string) => {
    const qty = getQty(productId);
    onAddProduct(comanda.id, productId, qty);
  };

  const total = comanda.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="flex flex-col 2xl:flex-row gap-4 h-full animate-fadeIn min-w-0">
      {/* Left Panel - Products */}
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-frz-card overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          {onBackToList && (
            <button onClick={onBackToList} className="p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer">
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
          )}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar produto por nome ou código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-500 focus:outline-none focus:border-frz-primary focus:ring-1 focus:ring-frz-primary/20 transition"
            />
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl whitespace-nowrap">
            {filteredProducts.length} itens
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 py-3 border-b border-slate-100 sf-table-scroll flex gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
              !activeCategory ? 'bg-frz-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                activeCategory === cat ? 'bg-frz-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-xs font-bold">Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
              {filteredProducts.map(p => {
                const qty = getQty(p.id);
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-frz-card-hover transition-shadow group"
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-slate-50 relative overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5 bg-frz-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                        R$ {p.price.toFixed(2)}
                      </div>
                      {p.stock <= 3 && (
                        <div className="absolute bottom-1.5 left-1.5 bg-rose-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                          {p.stock} un
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2.5 space-y-2">
                      <div>
                        <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{p.code}</p>
                      </div>

                      {/* Quantity + Add */}
                      <div className="flex items-center gap-1">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setQuantities(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] || 1) - 1) }))}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-[11px] font-black text-slate-800 tabular-nums">{qty}</span>
                          <button
                            onClick={() => setQuantities(prev => ({ ...prev, [p.id]: Math.min(p.stock, (prev[p.id] || 1) + 1) }))}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                            disabled={qty >= p.stock}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleQuickAdd(p.id)}
                          disabled={p.stock === 0}
                          className="flex-1 py-1.5 bg-frz-primary hover:bg-frz-primary-hover text-white text-[9px] font-black rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full 2xl:w-[340px] shrink-0 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-frz-card overflow-hidden">
        {/* Comanda Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Comanda</span>
            <span className="text-[9px] font-mono font-bold text-slate-400">{comanda.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-900">{comanda.clientName}</p>
              <p className="text-[10px] text-slate-500">{comanda.courseOrTraining}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
              comanda.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' :
              comanda.status === 'Pendente' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {comanda.status}
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {comanda.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-bold">Carrinho vazio</p>
              <p className="text-[10px] text-slate-400">Selecione produtos ao lado</p>
            </div>
          ) : (
            comanda.items.map(item => {
              const prod = products.find(p => p.id === item.productId);
              return (
                <div key={item.id} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 group/item">
                  {/* Thumb */}
                  {prod?.image ? (
                    <img src={prod.image} alt={item.productName} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{item.productName}</p>
                    <p className="text-[9px] text-slate-400">R$ {item.price.toFixed(2)}</p>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (item.quantity <= 1) onRemoveItem(comanda.id, item.id);
                        else onUpdateItemQuantity(comanda.id, item.id, item.quantity - 1);
                      }}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-[11px] font-black text-slate-800 tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateItemQuantity(comanda.id, item.id, item.quantity + 1)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <span className="text-[11px] font-black text-slate-900 w-16 text-right tabular-nums">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </span>

                  {/* Remove */}
                  <button
                    onClick={() => onRemoveItem(comanda.id, item.id)}
                    className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 opacity-0 group-hover/item:opacity-100 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer - Total + Actions */}
        <div className="border-t border-slate-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
            <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
              R$ {total.toFixed(2)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
            <button
              onClick={() => onCloseComanda(comanda.id)}
              disabled={comanda.items.length === 0}
              className="flex-[2] py-2.5 bg-frz-primary hover:bg-frz-primary-hover text-white text-[10px] font-black rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Fechar Comanda — R$ {total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
