import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { Package, Plus, Edit2, Trash2, Search, CheckCircle2, AlertTriangle, RefreshCw, Tag, Image as ImageIcon, X, Upload } from 'lucide-react';

interface StockManagementProps {
  products: Product[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  categories: string[];
  onSaveCategories: (categories: string[], updatedProducts?: Product[]) => void;
}

export default function StockManagement({ 
  products, 
  onSaveProduct, 
  onDeleteProduct,
  categories,
  onSaveCategories
}: StockManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Category management temporary states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [categoryEditText, setCategoryEditText] = useState('');

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [category, setCategory] = useState(categories[0] || '');
  const [image, setImage] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setCode(product.code);
    setName(product.name);
    setPrice(product.price);
    setStock(product.stock);
    setCategory(product.category);
    setImage(product.image || '');
    setImageUrlInput(product.image || '');
    setIsFormOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setCode(`PROD-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setPrice(10.00);
    setStock(50);
    setCategory(categories[0] || '');
    setImage('');
    setImageUrlInput('');
    setIsFormOpen(true);
  };

  // --- CATEGORY MANIPULATION ---
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCategoryName.trim();
    if (!cleanName) return;

    if (categories.some(cat => cat.toLowerCase() === cleanName.toLowerCase())) {
      alert('Esta categoria já existe!');
      return;
    }

    const updated = [...categories, cleanName];
    onSaveCategories(updated);
    setNewCategoryName('');
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCategoryName(cat);
    setCategoryEditText(cat);
  };

  const handleSaveCategoryEdit = (oldCat: string) => {
    const cleanName = categoryEditText.trim();
    if (!cleanName) return;

    if (oldCat === cleanName) {
      setEditingCategoryName(null);
      return;
    }

    if (categories.some(cat => cat.toLowerCase() === cleanName.toLowerCase() && cat !== oldCat)) {
      alert('Esta categoria de destino já existe!');
      return;
    }

    const updatedCats = categories.map(cat => cat === oldCat ? cleanName : cat);
    
    // Auto-update products of this category to keep data consistency!
    const updatedProducts = products.map(p => {
      if (p.category === oldCat) {
        return { ...p, category: cleanName };
      }
      return p;
    });

    onSaveCategories(updatedCats, updatedProducts);
    setEditingCategoryName(null);

    // If current select forms have old category, update them as well
    if (category === oldCat) {
      setCategory(cleanName);
    }
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const inUseCount = products.filter(p => p.category === catToDelete).length;
    
    const remainingCats = categories.filter(cat => cat !== catToDelete);
    const fallbackCat = remainingCats[0] || 'Geral';

    let msg = `Remover a categoria "${catToDelete}"?`;
    if (inUseCount > 0) {
      msg = `A categoria "${catToDelete}" está associada a ${inUseCount} produto(s). Ao excluí-la, estes produtos serão migrados para a categoria "${fallbackCat}".\n\nDeseja continuar com a exclusão?`;
    }

    if (confirm(msg)) {
      // Auto-remap the products category
      const updatedProducts = products.map(p => {
        if (p.category === catToDelete) {
          return { ...p, category: fallbackCat };
        }
        return p;
      });

      // Prepare next list
      let finalCats = remainingCats;
      if (finalCats.length === 0) {
        finalCats = [fallbackCat];
      }

      onSaveCategories(finalCats, updatedProducts);

      // If form state category is deleted, update it to fallback
      if (category === catToDelete) {
        setCategory(fallbackCat);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      alert('Por favor, preencha o Nome e o Código do item.');
      return;
    }

    onSaveProduct({
      id: editingId || `p-${Date.now()}`,
      code,
      name,
      price: Number(price),
      stock: Number(stock),
      category,
      image: image || undefined
    });

    closeForm();
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setCode('');
    setName('');
    setPrice(0);
    setStock(0);
    setCategory(categories[0] || '');
    setImage('');
    setImageUrlInput('');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
      {/* Header Panel */}
      <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Gestão de Estoque & Produtos
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Cadastre os produtos validados que estarão disponíveis para consumo via comanda e QR Code.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-frz-primary hover:bg-frz-primary-hover text-black border border-frz-primary-hover/30 rounded-xl text-xs font-extrabold transition cursor-pointer"
          >
            <Tag className="w-4 h-4 text-black" />
            Gerenciar Categorias
          </button>
          
          <button
            onClick={handleOpenNew}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-frz-primary hover:bg-frz-primary-hover text-black rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black" />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar produto por nome, código ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Toggle Form Overlay / Embedded */}
        {isFormOpen && (
          <div className="mb-6 p-5 border border-indigo-100 bg-indigo-50/30 rounded-xl animate-fadeIn">
            <h3 className="text-sm font-bold text-indigo-950 mb-4 flex items-center gap-2">
              {editingId ? 'Editar Produto' : 'Cadastrar Novo Item no Estoque'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider mb-1">Código do Item</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="md:col-span-1 lg:col-span-2">
                <label className="block text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider mb-1">Nome do Produto</label>
                <input
                  type="text"
                  placeholder="Ex: Água Mineral 500ml"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider mb-1">Preço Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider mb-1">Estoque Disponível</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-5">
                <label className="block text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider mb-1">Imagem do Produto</label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="URL da imagem..."
                        value={imageUrlInput}
                        onChange={(e) => {
                          setImageUrlInput(e.target.value);
                          setImage(e.target.value);
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const img = new Image();
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              img.src = reader.result as string;
                            };
                            img.onload = () => {
                              const maxW = 200;
                              const scale = Math.min(maxW / img.width, maxW / img.height, 1);
                              const w = Math.round(img.width * scale);
                              const h = Math.round(img.height * scale);
                              const canvas = document.createElement('canvas');
                              canvas.width = w;
                              canvas.height = h;
                              const ctx = canvas.getContext('2d')!;
                              ctx.drawImage(img, 0, 0, w, h);
                              const compressed = canvas.toDataURL('image/jpeg', 0.6);
                              setImage(compressed);
                              setImageUrlInput(compressed);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                    {image && (
                      <div className="relative inline-block">
                        <img src={image} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <button
                          type="button"
                          onClick={() => { setImage(''); setImageUrlInput(''); }}
                          className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 lg:col-span-5 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-3 py-1.5 border border-slate-300 text-slate-800 rounded-lg text-xs font-extrabold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-frz-primary hover:bg-frz-primary-hover text-black rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Desktop Product Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12">Foto</th>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 text-right">Preço</th>
                <th className="py-3 px-4 text-center">Disponibilidade (Estoque)</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-normal">
                    Nenhum produto cadastrado que corresponda à busca.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = p.stock < 10;
                  const isOut = p.stock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-800 text-[10px] font-bold border border-slate-300/40">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        R$ {Number(p.price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isOut ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                          <span className={`font-bold ${isOut ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>
                            {p.stock} unidades
                          </span>
                          {isLowStock && !isOut && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" title="Estoque baixo!" />
                          )}
                          {isOut && (
                            <span className="text-[9px] uppercase font-bold text-rose-500 px-1 bg-rose-50 rounded">Esgotado</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1 px-2 rounded hover:bg-slate-200 text-slate-600 transition flex items-center gap-1 hover:text-indigo-600 cursor-pointer"
                            title="Editar produto"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remover "${p.name}" permanentemente do estoque?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1 px-2 rounded hover:bg-rose-50 text-rose-500 transition flex items-center gap-1 hover:text-rose-700 cursor-pointer"
                            title="Excluir produto"
                          >
                            <Trash2 className="w-3" />
                            <span>Excluir</span>
                          </button>
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

      {/* Category Management Modal Overlay */}
      {isCategoryModalOpen && (
        <div 
          onClick={() => {
            setIsCategoryModalOpen(false);
            setEditingCategoryName(null);
          }}
          className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-xs cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-150 shadow-xl max-w-md w-full overflow-hidden flex flex-col cursor-default"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Tag className="w-4.5 h-4.5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">Gerenciar Categorias</h3>
              </div>
              <button 
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategoryName(null);
                }}
                className="text-slate-500 hover:text-slate-800 font-bold text-xs p-1 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Form to add secondary category */}
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nova categoria (Ex: Doces, Limpeza)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 font-bold"
                  required
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-frz-primary hover:bg-frz-primary-hover text-black rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-black" />
                  Adicionar
                </button>
              </form>

              {/* Dynamic Categories List Scroll Area */}
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[220px] overflow-y-auto bg-slate-50/50">
                {categories.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Nenhuma categoria disponível.
                  </div>
                ) : (
                  categories.map((cat) => {
                    const isEditing = editingCategoryName === cat;
                    const inUseCount = products.filter(p => p.category === cat).length;

                    return (
                      <div key={cat} className="p-3 flex items-center justify-between text-xs gap-3">
                        {isEditing ? (
                          <div className="flex-1 flex gap-1.5 items-center">
                            <input
                              type="text"
                              value={categoryEditText}
                              onChange={(e) => setCategoryEditText(e.target.value)}
                              className="flex-1 px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveCategoryEdit(cat)}
                              className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition"
                              title="Salvar"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingCategoryName(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                              title="Cancelar"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="truncate">
                              <span className="font-bold text-slate-800">{cat}</span>
                              <span className="text-[10px] text-slate-500 block mt-0.5 font-semibold">
                                {inUseCount} {inUseCount === 1 ? 'produto associado' : 'produtos associados'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleStartEditCategory(cat)}
                                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                title="Editar nome"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                className="p-1.5 hover:bg-rose-100 text-rose-500 hover:text-rose-700 rounded-lg transition"
                                title="Excluir"
                              >
                                <Trash2 className="w-3 h-3" />
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

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-semibold italic">Alterações aplicadas na hora</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategoryName(null);
                  }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-150 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  Sair
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategoryName(null);
                  }}
                  className="px-4 py-2 bg-frz-primary hover:bg-frz-primary-hover text-black text-xs font-black rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
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
