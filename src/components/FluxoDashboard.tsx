import React, { useState, useMemo } from 'react';
import { StockMovement, Product, Comanda } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Package, Download, Printer, Calendar, Filter, Image as ImageIcon, Wallet } from 'lucide-react';

interface Props {
  products: Product[];
  comandas: Comanda[];
  stockMovements: StockMovement[];
  setStockMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
}

type FilterPreset = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function FluxoDashboard({ products, comandas, stockMovements, setStockMovements }: Props) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const [filterPreset, setFilterPreset] = useState<FilterPreset>('today');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);

  const applyPreset = (preset: FilterPreset) => {
    setFilterPreset(preset);
    const d = new Date();
    let start: string, end: string;
    switch (preset) {
      case 'today':
        start = d.toISOString().split('T')[0];
        end = start;
        break;
      case 'week': {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        start = mon.toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      }
      case 'month':
        start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'year':
        start = new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      default:
        return;
    }
    setStartDate(start);
    setEndDate(end);
  };

  const fetchAllMovements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stock-movements');
      const data = await res.json();
      if (data.success && Array.isArray(data.movements)) {
        setStockMovements(data.movements);
      }
    } catch (err) {
      console.error('Erro ao buscar movimentos:', err);
    }
    setLoading(false);
  };

  const filteredMovements = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return (stockMovements || []).filter(m => {
      const t = new Date(m.timestamp);
      return t >= start && t <= end;
    });
  }, [stockMovements, startDate, endDate]);

  const vendasComandaPeriodo = useMemo(() => {
    return comandas
      .filter(c => {
        if (c.status !== 'Pago' || !c.closedAt) return false;
        const t = new Date(c.closedAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return t >= start && t <= end;
      })
      .reduce((sum, c) => sum + c.items.reduce((s, i) => s + (i.price * i.quantity), 0), 0);
  }, [comandas, startDate, endDate]);

  const vendasPDVPeriodo = useMemo(() => {
    return filteredMovements
      .filter(m => m.type === 'saida' && m.reference.startsWith('Venda PDV'))
      .reduce((sum, m) => sum + m.totalValue, 0);
  }, [filteredMovements]);

  const estornosPDVPeriodo = useMemo(() => {
    return filteredMovements
      .filter(m => m.type === 'entrada' && m.reference.startsWith('Estorno PDV'))
      .reduce((sum, m) => sum + m.totalValue, 0);
  }, [filteredMovements]);

  const totalVendido = vendasComandaPeriodo + vendasPDVPeriodo - estornosPDVPeriodo;

  const saidas = useMemo(() => {
    return filteredMovements
      .filter(m => m.type === 'saida')
      .reduce((sum, m) => sum + m.totalValue, 0);
  }, [filteredMovements]);

  const entradas = useMemo(() => {
    return filteredMovements
      .filter(m => m.type === 'entrada')
      .reduce((sum, m) => sum + m.totalValue, 0);
  }, [filteredMovements]);

  const valorEstoque = useMemo(() => {
    return products.reduce((sum, p) => sum + p.price * p.stock, 0);
  }, [products]);

  const exportCSV = () => {
    const header = 'ID,Produto,Código,Tipo,Quantidade,Preço,Valor Total,Referência,Data';
    const rows = filteredMovements.map(m =>
      `"${m.id}","${m.productName}","${m.productCode}","${m.type}",${m.quantity},${m.price.toFixed(2)},${m.totalValue.toFixed(2)},"${m.reference}","${new Date(m.timestamp).toLocaleString('pt-BR')}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxo-estoque-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const title = `Relatório de Fluxo de Estoque - ${startDate} a ${endDate}`;
    const rows = filteredMovements.map(m => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px">${m.productName}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${m.productCode}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${m.type === 'entrada' ? 'Entrada' : m.type === 'saida' ? 'Saída' : 'Ajuste'}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${m.quantity}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;text-align:right">R$ ${m.totalValue.toFixed(2)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px">${m.reference}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;white-space:nowrap">${new Date(m.timestamp).toLocaleString('pt-BR')}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        .sub { font-size: 12px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 8px; border: 1px solid #ddd; font-size: 11px; text-align: left; }
        .resumo { display: flex; gap: 16px; margin-bottom: 16px; }
        .card { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; }
        .card .val { font-size: 18px; font-weight: bold; margin-top: 4px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>${title}</h1>
      <div class="sub">SalesFlow - Relatório de Movimentação de Estoque</div>
      <div class="resumo">
        <div class="card"><div>Total Vendido</div><div class="val" style="color:#059669">R$ ${totalVendido.toFixed(2)}</div></div>
        <div class="card"><div>Vendas Comanda</div><div class="val" style="color:#059669">R$ ${vendasComandaPeriodo.toFixed(2)}</div></div>
        <div class="card"><div>Vendas PDV</div><div class="val" style="color:#059669">R$ ${vendasPDVPeriodo.toFixed(2)}</div></div>
        <div class="card"><div>Estornos PDV</div><div class="val" style="color:#DC2626">R$ ${estornosPDVPeriodo.toFixed(2)}</div></div>
        <div class="card"><div>Total Entradas</div><div class="val" style="color:#2563EB">R$ ${entradas.toFixed(2)}</div></div>
        <div class="card"><div>Total Saídas</div><div class="val" style="color:#DC2626">R$ ${saidas.toFixed(2)}</div></div>
        <div class="card"><div>Valor em Estoque</div><div class="val" style="color:#7C3AED">R$ ${valorEstoque.toFixed(2)}</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Produto</th><th>Código</th><th>Tipo</th><th>Qtd</th><th>Valor</th><th>Referência</th><th>Data</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:16px;font-size:10px;color:#999;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <script>window.print();<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Dashboard de Fluxo</span>
            <h3 className="text-sm font-extrabold text-slate-800 mt-0.5">Movimentação de Vendas e Estoque</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1 cursor-pointer">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={exportPDF} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1 cursor-pointer">
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={fetchAllMovements} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1 cursor-pointer">
              <Filter className="w-3.5 h-3.5" /> {loading ? '...' : 'Sync Servidor'}
            </button>
          </div>
        </div>

        {/* Preset Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { key: 'today', label: 'Hoje' },
            { key: 'week', label: 'Esta Semana' },
            { key: 'month', label: 'Este Mês' },
            { key: 'year', label: 'Este Ano' },
            { key: 'custom', label: 'Personalizado' },
          ] as const).map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                filterPreset === p.key
                  ? 'bg-frz-primary text-black shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setFilterPreset('custom'); }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-frz-primary"
            />
          </div>
          <span className="text-slate-400 text-xs">até</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setFilterPreset('custom'); }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-frz-primary"
          />
          <span className="text-[10px] text-slate-400 ml-1">
            {filteredMovements.length} movimentação(ões) encontrada(s)
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">Total Vendido</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">R$ {totalVendido.toFixed(2)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Vendas Comanda + PDV - Estornos</div>
          <div className="mt-2 space-y-1 text-[10px]">
            <div className="flex justify-between"><span>Comandas:</span><span className="font-mono font-bold text-emerald-600">R$ {vendasComandaPeriodo.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Vendas PDV:</span><span className="font-mono font-bold text-emerald-500">R$ {vendasPDVPeriodo.toFixed(2)}</span></div>
            {estornosPDVPeriodo > 0 && <div className="flex justify-between"><span>Estornos PDV:</span><span className="font-mono font-bold text-rose-500">-R$ {estornosPDVPeriodo.toFixed(2)}</span></div>}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Vendas Comanda + PDV - Estornos</div>
          <div className="mt-2 space-y-1 text-[10px]">
            <div className="flex justify-between"><span>Comandas:</span><span className="font-mono font-bold text-emerald-600">R$ {vendasComandaPeriodo.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Vendas PDV:</span><span className="font-mono font-bold text-emerald-500">R$ {vendasPDVPeriodo.toFixed(2)}</span></div>
            {estornosPDVPeriodo > 0 && <div className="flex justify-between"><span>Estornos PDV:</span><span className="font-mono font-bold text-rose-500">-R$ {estornosPDVPeriodo.toFixed(2)}</span></div>}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">Entradas Estoque</span>
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">R$ {entradas.toFixed(2)}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {filteredMovements.filter(m => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0)} unidades
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">Saídas Estoque</span>
          </div>
          <div className="text-2xl font-black text-red-600 font-mono">R$ {saidas.toFixed(2)}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {filteredMovements.filter(m => m.type === 'saida').reduce((s, m) => s + m.quantity, 0)} unidades
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Package className="w-4 h-4 text-frz-primary" />
            <span className="text-[10px] font-black uppercase tracking-wider">Produtos em Estoque</span>
          </div>
          <div className="text-2xl font-black text-frz-primary font-mono">{products.reduce((s, p) => s + p.stock, 0)}</div>
          <div className="text-[10px] text-slate-400 mt-1">{products.length} produtos cadastrados</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Wallet className="w-4 h-4 text-violet-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">Valor em Estoque</span>
          </div>
          <div className="text-2xl font-black text-violet-600 font-mono">R$ {valorEstoque.toFixed(2)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Valor total em estoque</div>
        </div>
      </div>

      {/* Movement Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Movimentações do Período</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Produto</th>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Código</th>
                <th className="text-center p-3 font-extrabold text-slate-500 text-[10px] uppercase">Tipo</th>
                <th className="text-center p-3 font-extrabold text-slate-500 text-[10px] uppercase">Qtd</th>
                <th className="text-right p-3 font-extrabold text-slate-500 text-[10px] uppercase">Valor Total</th>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Referência</th>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhuma movimentação encontrada no período.
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-800">{m.productName}</td>
                    <td className="p-3 text-slate-500 font-mono text-[10px]">{m.productCode}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        m.type === 'entrada'
                          ? 'bg-blue-100 text-blue-700'
                          : m.type === 'saida'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {m.type === 'entrada' ? 'Entrada' : m.type === 'saida' ? 'Saída' : 'Ajuste'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold">{m.quantity}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">R$ {m.totalValue.toFixed(2)}</td>
                    <td className="p-3 text-slate-500 text-[10px] max-w-[150px] truncate" title={m.reference}>{m.reference}</td>
                    <td className="p-3 text-slate-400 text-[10px] whitespace-nowrap">{new Date(m.timestamp).toLocaleString('pt-BR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estoque Atual */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Estoque Atual por Produto</span>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase w-12">Foto</th>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Produto</th>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Código</th>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Categoria</th>
                <th className="text-center p-3 font-extrabold text-slate-500 text-[10px] uppercase">Preço</th>
                <th className="text-center p-3 font-extrabold text-slate-500 text-[10px] uppercase">Estoque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-800">{p.name}</td>
                    <td className="p-3 text-slate-500 font-mono text-[10px]">{p.code}</td>
                    <td className="p-3 text-slate-500">{p.category}</td>
                    <td className="p-3 text-center font-mono font-bold">R$ {p.price.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : p.stock < 5
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.stock}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}