import React, { useState, useMemo } from 'react';
import { StockMovement, Product, Comanda, CashierShift } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Package, Download, Printer, Calendar, Filter, Image as ImageIcon, Wallet, FileSpreadsheet } from 'lucide-react';

interface Props {
  products: Product[];
  comandas: Comanda[];
  stockMovements: StockMovement[];
  setStockMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  activeShift?: CashierShift | null;
  shiftHistory?: CashierShift[];
}

type FilterPreset = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function FluxoDashboard({ products, comandas, stockMovements, setStockMovements, activeShift, shiftHistory = [] }: Props) {
  const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const todayStr = toDateInputValue(now);

  const [filterPreset, setFilterPreset] = useState<FilterPreset>('today');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [loading, setLoading] = useState(false);

  const applyPreset = (preset: FilterPreset) => {
    setFilterPreset(preset);
    const d = new Date();
    let start: string, end: string;
    switch (preset) {
      case 'today':
        start = toDateInputValue(d);
        end = start;
        break;
      case 'week': {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        start = toDateInputValue(mon);
        end = toDateInputValue(new Date());
        break;
      }
      case 'month':
        start = toDateInputValue(new Date(d.getFullYear(), d.getMonth(), 1));
        end = toDateInputValue(new Date());
        break;
      case 'year':
        start = toDateInputValue(new Date(d.getFullYear(), 0, 1));
        end = toDateInputValue(new Date());
        break;
      default:
        return;
    }
    setStartDate(start);
    setEndDate(end);
  };

  const getPeriodRange = () => {
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
    return { start, end };
  };

  const isInPeriod = (value?: string) => {
    if (!value) return false;
    const { start, end } = getPeriodRange();
    const t = new Date(value);
    return t >= start && t <= end;
  };

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toFixed(2).replace('.', ',');
  const formatDate = (value?: string) => value ? new Date(value).toLocaleString('pt-BR') : '-';
  const getComandaTotal = (comanda: Comanda) => comanda.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const getDateKey = (value: string) => toDateInputValue(new Date(value));
  const getDateLabel = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  };
  const escapeCSV = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const escapeHTML = (value: any) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const safeFilePart = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'todos';

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
    const { start, end } = getPeriodRange();
    return (stockMovements || []).filter(m => {
      const t = new Date(m.timestamp);
      return t >= start && t <= end;
    });
  }, [stockMovements, startDate, endDate]);

  const closedComandasPeriodo = useMemo(() => {
    return comandas.filter(c => c.status === 'Pago' && !!c.closedAt && isInPeriod(c.closedAt));
  }, [comandas, startDate, endDate]);

  const courseOptions = useMemo(() => {
    return Array.from(new Set(comandas.map(c => c.courseOrTraining).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [comandas]);

  const courseComandasPeriodo = useMemo(() => {
    return closedComandasPeriodo.filter(c => selectedCourse === 'all' || c.courseOrTraining === selectedCourse);
  }, [closedComandasPeriodo, selectedCourse]);

  const courseComandaTotal = useMemo(() => {
    return courseComandasPeriodo.reduce((sum, comanda) => sum + getComandaTotal(comanda), 0);
  }, [courseComandasPeriodo]);

  const courseStudentRows = useMemo(() => {
    const byStudent = new Map<string, {
      student: string;
      clientType: string;
      course: string;
      unit: string;
      comandas: number;
      items: number;
      total: number;
      firstClosedAt: string;
      lastClosedAt: string;
    }>();

    courseComandasPeriodo.forEach(comanda => {
      const key = `${comanda.clientName}|${comanda.clientType}|${comanda.courseOrTraining}|${comanda.unit || ''}`;
      const total = getComandaTotal(comanda);
      const current = byStudent.get(key) || {
        student: comanda.clientName,
        clientType: comanda.clientType,
        course: comanda.courseOrTraining,
        unit: comanda.unit || '-',
        comandas: 0,
        items: 0,
        total: 0,
        firstClosedAt: comanda.closedAt || '',
        lastClosedAt: comanda.closedAt || '',
      };
      current.comandas += 1;
      current.items += comanda.items.reduce((sum, item) => sum + item.quantity, 0);
      current.total += total;
      if (comanda.closedAt && (!current.firstClosedAt || comanda.closedAt < current.firstClosedAt)) current.firstClosedAt = comanda.closedAt;
      if (comanda.closedAt && (!current.lastClosedAt || comanda.closedAt > current.lastClosedAt)) current.lastClosedAt = comanda.closedAt;
      byStudent.set(key, current);
    });

    return Array.from(byStudent.values()).sort((a, b) => b.total - a.total || a.student.localeCompare(b.student));
  }, [courseComandasPeriodo]);

  const courseItemRows = useMemo(() => {
    return courseComandasPeriodo.flatMap(comanda => comanda.items.map(item => ({
      comandaId: comanda.id,
      student: comanda.clientName,
      clientType: comanda.clientType,
      course: comanda.courseOrTraining,
      unit: comanda.unit || '-',
      productName: item.productName,
      productCode: item.productCode,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      itemTimestamp: item.timestamp,
      closedAt: comanda.closedAt || '',
    })));
  }, [courseComandasPeriodo]);

  const vendasComandaPeriodo = useMemo(() => {
    return closedComandasPeriodo
      .reduce((sum, c) => sum + c.items.reduce((s, i) => s + (i.price * i.quantity), 0), 0);
  }, [closedComandasPeriodo]);

  const consumoAbertoPeriodo = useMemo(() => {
    return comandas
      .filter(c => c.status !== 'Pago')
      .reduce((sum, c) => sum + c.items
        .filter(i => isInPeriod(i.timestamp))
        .reduce((s, i) => s + (i.price * i.quantity), 0), 0);
  }, [comandas, startDate, endDate]);

  const comandasPagasPeriodo = useMemo(() => {
    return closedComandasPeriodo.length;
  }, [closedComandasPeriodo]);

  const comandasAbertas = useMemo(() => comandas.filter(c => c.status !== 'Pago').length, [comandas]);

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

  const baixasComandaPeriodo = useMemo(() => {
    return filteredMovements
      .filter(m => m.type === 'saida' && m.reference.startsWith('Comanda '))
      .reduce((sum, m) => sum + m.totalValue, 0);
  }, [filteredMovements]);

  const estornosComandaPeriodo = useMemo(() => {
    return filteredMovements
      .filter(m => m.type === 'entrada' && (m.reference.startsWith('Estorno Comanda') || m.reference.startsWith('Cancelamento Comanda')))
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

  const periodShifts = useMemo(() => {
    const { start, end } = getPeriodRange();
    return [activeShift, ...shiftHistory]
      .filter((shift): shift is CashierShift => !!shift)
      .filter(shift => {
        const openedAt = new Date(shift.openedAt);
        const closedAt = shift.closedAt ? new Date(shift.closedAt) : new Date();
        return openedAt <= end && closedAt >= start;
      })
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  }, [activeShift, shiftHistory, startDate, endDate]);

  const saldoMovimentacaoEstoque = saidas - entradas;
  const caixaEntradas = vendasComandaPeriodo + vendasPDVPeriodo;
  const caixaSaidas = estornosPDVPeriodo;
  const caixaLiquido = caixaEntradas - caixaSaidas;

  const dailySummary = useMemo(() => {
    const rows = new Map<string, {
      dateKey: string;
      dateLabel: string;
      cashIn: number;
      cashOut: number;
      cashNet: number;
      comandaSales: number;
      pdvSales: number;
      pdvRefunds: number;
      openConsumption: number;
      stockEntryQty: number;
      stockExitQty: number;
      stockAdjustmentQty: number;
      stockEntryValue: number;
      stockExitValue: number;
      stockAdjustmentValue: number;
      closedComandas: number;
      movements: number;
    }>();

    const ensureRow = (dateKey: string) => {
      if (!rows.has(dateKey)) {
        rows.set(dateKey, {
          dateKey,
          dateLabel: getDateLabel(dateKey),
          cashIn: 0,
          cashOut: 0,
          cashNet: 0,
          comandaSales: 0,
          pdvSales: 0,
          pdvRefunds: 0,
          openConsumption: 0,
          stockEntryQty: 0,
          stockExitQty: 0,
          stockAdjustmentQty: 0,
          stockEntryValue: 0,
          stockExitValue: 0,
          stockAdjustmentValue: 0,
          closedComandas: 0,
          movements: 0,
        });
      }
      return rows.get(dateKey)!;
    };

    closedComandasPeriodo.forEach(comanda => {
      if (!comanda.closedAt) return;
      const row = ensureRow(getDateKey(comanda.closedAt));
      const total = comanda.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      row.comandaSales += total;
      row.cashIn += total;
      row.closedComandas += 1;
    });

    comandas.filter(c => c.status !== 'Pago').forEach(comanda => {
      comanda.items.filter(item => isInPeriod(item.timestamp)).forEach(item => {
        const row = ensureRow(getDateKey(item.timestamp));
        row.openConsumption += item.price * item.quantity;
      });
    });

    filteredMovements.forEach(movement => {
      const row = ensureRow(getDateKey(movement.timestamp));
      row.movements += 1;
      if (movement.type === 'entrada') {
        row.stockEntryQty += movement.quantity;
        row.stockEntryValue += movement.totalValue;
      } else if (movement.type === 'saida') {
        row.stockExitQty += movement.quantity;
        row.stockExitValue += movement.totalValue;
      } else {
        row.stockAdjustmentQty += movement.quantity;
        row.stockAdjustmentValue += movement.totalValue;
      }

      if (movement.type === 'saida' && movement.reference.startsWith('Venda PDV')) {
        row.pdvSales += movement.totalValue;
        row.cashIn += movement.totalValue;
      }
      if (movement.type === 'entrada' && movement.reference.startsWith('Estorno PDV')) {
        row.pdvRefunds += movement.totalValue;
        row.cashOut += movement.totalValue;
      }
    });

    return Array.from(rows.values())
      .map(row => ({ ...row, cashNet: row.cashIn - row.cashOut }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [closedComandasPeriodo, comandas, filteredMovements, startDate, endDate]);

  const exportCSV = () => {
    const lines: string[] = [];
    lines.push('RELATORIO SALESFLOW');
    lines.push(`Periodo;${startDate};${endDate}`);
    lines.push('');
    lines.push('RESUMO GERAL');
    lines.push('Indicador;Valor');
    lines.push(`Entradas de caixa;${formatNumber(caixaEntradas)}`);
    lines.push(`Saidas de caixa;${formatNumber(caixaSaidas)}`);
    lines.push(`Caixa liquido;${formatNumber(caixaLiquido)}`);
    lines.push(`Vendas comandas pagas;${formatNumber(vendasComandaPeriodo)}`);
    lines.push(`Vendas PDV;${formatNumber(vendasPDVPeriodo)}`);
    lines.push(`Estornos PDV;${formatNumber(estornosPDVPeriodo)}`);
    lines.push(`Consumo em aberto;${formatNumber(consumoAbertoPeriodo)}`);
    lines.push(`Entradas estoque;${formatNumber(entradas)}`);
    lines.push(`Saidas estoque;${formatNumber(saidas)}`);
    lines.push(`Valor atual em estoque;${formatNumber(valorEstoque)}`);
    lines.push('');
    lines.push('RESUMO POR DIA');
    lines.push('Data;Entradas Caixa;Saidas Caixa;Caixa Liquido;Comandas;PDV;Estornos PDV;Consumo Aberto;Qtd Entrada Estoque;Qtd Saida Estoque;Valor Entrada Estoque;Valor Saida Estoque;Movimentos');
    dailySummary.forEach(row => {
      lines.push([
        row.dateLabel,
        formatNumber(row.cashIn),
        formatNumber(row.cashOut),
        formatNumber(row.cashNet),
        formatNumber(row.comandaSales),
        formatNumber(row.pdvSales),
        formatNumber(row.pdvRefunds),
        formatNumber(row.openConsumption),
        row.stockEntryQty,
        row.stockExitQty,
        formatNumber(row.stockEntryValue),
        formatNumber(row.stockExitValue),
        row.movements,
      ].join(';'));
    });
    lines.push('');
    lines.push('MOVIMENTACOES DE ESTOQUE');
    lines.push('ID;Produto;Codigo;Tipo;Quantidade;Preco;Valor Total;Referencia;Data');
    filteredMovements.forEach(m => {
      lines.push([
        escapeCSV(m.id),
        escapeCSV(m.productName),
        escapeCSV(m.productCode),
        escapeCSV(m.type),
        m.quantity,
        formatNumber(m.price),
        formatNumber(m.totalValue),
        escapeCSV(m.reference),
        escapeCSV(formatDate(m.timestamp)),
      ].join(';'));
    });
    lines.push('');
    lines.push('COMANDAS PAGAS');
    lines.push('ID;Cliente;Tipo;Unidade;Itens;Valor Total;Fechamento');
    closedComandasPeriodo.forEach(c => {
      lines.push([
        escapeCSV(c.id),
        escapeCSV(c.clientName),
        escapeCSV(c.clientType),
        escapeCSV(c.unit || ''),
        c.items.length,
        formatNumber(c.items.reduce((sum, item) => sum + item.price * item.quantity, 0)),
        escapeCSV(formatDate(c.closedAt)),
      ].join(';'));
    });
    lines.push('');
    lines.push('TURNOS DE CAIXA');
    lines.push('ID;Aberto Por;Abertura;Fechado Por;Fechamento;Saldo Inicial;Saldo Esperado;Saldo Informado;Status;Observacoes');
    periodShifts.forEach(shift => {
      lines.push([
        escapeCSV(shift.id),
        escapeCSV(shift.openedBy),
        escapeCSV(formatDate(shift.openedAt)),
        escapeCSV(shift.closedBy || ''),
        escapeCSV(formatDate(shift.closedAt)),
        formatNumber(shift.initialBalance || 0),
        formatNumber(shift.finalBalance || 0),
        formatNumber(shift.actualCashInHand || 0),
        escapeCSV(shift.isActive ? 'Aberto' : 'Fechado'),
        escapeCSV(shift.notes || ''),
      ].join(';'));
    });
    downloadFile(`\ufeff${lines.join('\n')}`, `relatorio-salesflow-${startDate}-${endDate}.csv`, 'text/csv;charset=utf-8;');
  };

  const buildReportHTML = (forExcel = false) => {
    const title = `Relatório SalesFlow - ${startDate} a ${endDate}`;
    const summaryCards = [
      ['Entradas de Caixa', formatCurrency(caixaEntradas), '#059669'],
      ['Saídas de Caixa', formatCurrency(caixaSaidas), '#DC2626'],
      ['Caixa Líquido', formatCurrency(caixaLiquido), '#047857'],
      ['Entradas Estoque', formatCurrency(entradas), '#2563EB'],
      ['Saídas Estoque', formatCurrency(saidas), '#DC2626'],
      ['Valor em Estoque', formatCurrency(valorEstoque), '#7C3AED'],
    ];
    const dailyRows = dailySummary.map(row => `
      <tr>
        <td>${escapeHTML(row.dateLabel)}</td><td>${formatCurrency(row.cashIn)}</td><td>${formatCurrency(row.cashOut)}</td><td>${formatCurrency(row.cashNet)}</td>
        <td>${formatCurrency(row.comandaSales)}</td><td>${formatCurrency(row.pdvSales)}</td><td>${formatCurrency(row.pdvRefunds)}</td><td>${formatCurrency(row.openConsumption)}</td>
        <td>${row.stockEntryQty}</td><td>${row.stockExitQty}</td><td>${formatCurrency(row.stockEntryValue)}</td><td>${formatCurrency(row.stockExitValue)}</td><td>${row.movements}</td>
      </tr>
    `).join('');
    const movementRows = filteredMovements.map(m => `
      <tr>
        <td>${escapeHTML(m.productName)}</td><td>${escapeHTML(m.productCode)}</td><td>${m.type === 'entrada' ? 'Entrada' : m.type === 'saida' ? 'Saída' : 'Ajuste'}</td>
        <td>${m.quantity}</td><td>${formatCurrency(m.price)}</td><td>${formatCurrency(m.totalValue)}</td><td>${escapeHTML(m.reference)}</td><td>${escapeHTML(formatDate(m.timestamp))}</td>
      </tr>
    `).join('');
    const comandaRows = closedComandasPeriodo.map(c => `
      <tr>
        <td>${escapeHTML(c.id)}</td><td>${escapeHTML(c.clientName)}</td><td>${escapeHTML(c.clientType)}</td><td>${escapeHTML(c.unit || '-')}</td>
        <td>${c.items.length}</td><td>${formatCurrency(c.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}</td><td>${escapeHTML(formatDate(c.closedAt))}</td>
      </tr>
    `).join('');
    const shiftRows = periodShifts.map(shift => `
      <tr>
        <td>${escapeHTML(shift.id)}</td><td>${escapeHTML(shift.openedBy)}</td><td>${escapeHTML(formatDate(shift.openedAt))}</td><td>${escapeHTML(shift.closedBy || '-')}</td>
        <td>${escapeHTML(formatDate(shift.closedAt))}</td><td>${formatCurrency(shift.initialBalance || 0)}</td><td>${formatCurrency(shift.finalBalance || 0)}</td>
        <td>${formatCurrency(shift.actualCashInHand || 0)}</td><td>${shift.isActive ? 'Aberto' : 'Fechado'}</td><td>${escapeHTML(shift.notes || '')}</td>
      </tr>
    `).join('');

    return `
      <html><head><meta charset="utf-8"><title>${escapeHTML(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: ${forExcel ? '0' : '20px'}; color: #0f172a; }
        h1 { font-size: 18px; margin: 0 0 4px; } h2 { font-size: 13px; margin: 22px 0 8px; color: #334155; }
        .sub { font-size: 12px; color: #64748b; margin-bottom: 16px; }
        .resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
        .card { padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
        .card .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
        .card .val { font-size: 17px; font-weight: bold; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; } th, td { padding: 6px 8px; border: 1px solid #dbe3ef; font-size: 11px; }
        th { background: #f1f5f9; text-align: left; color: #475569; text-transform: uppercase; font-size: 10px; }
        td:nth-child(n+2) { white-space: nowrap; } .right { text-align: right; }
        @media print { body { padding: 0; } .no-print { display: none; } .resumo { grid-template-columns: repeat(2, 1fr); } }
      </style></head><body>
      <h1>${escapeHTML(title)}</h1>
      <div class="sub">Gerado em ${escapeHTML(new Date().toLocaleString('pt-BR'))}</div>
      <div class="resumo">${summaryCards.map(([label, value, color]) => `<div class="card"><div class="label">${label}</div><div class="val" style="color:${color}">${value}</div></div>`).join('')}</div>
      <h2>Resumo por dia</h2>
      <table><thead><tr><th>Data</th><th>Entradas Caixa</th><th>Saídas Caixa</th><th>Caixa Líquido</th><th>Comandas</th><th>PDV</th><th>Estornos PDV</th><th>Aberto</th><th>Qtd Entrada</th><th>Qtd Saída</th><th>Valor Entrada</th><th>Valor Saída</th><th>Mov.</th></tr></thead><tbody>${dailyRows || '<tr><td colspan="13">Sem dados no período.</td></tr>'}</tbody></table>
      <h2>Movimentações de estoque</h2>
      <table><thead><tr><th>Produto</th><th>Código</th><th>Tipo</th><th>Qtd</th><th>Preço</th><th>Valor</th><th>Referência</th><th>Data</th></tr></thead><tbody>${movementRows || '<tr><td colspan="8">Sem movimentações no período.</td></tr>'}</tbody></table>
      <h2>Comandas pagas</h2>
      <table><thead><tr><th>ID</th><th>Cliente</th><th>Tipo</th><th>Unidade</th><th>Itens</th><th>Valor</th><th>Fechamento</th></tr></thead><tbody>${comandaRows || '<tr><td colspan="7">Sem comandas pagas no período.</td></tr>'}</tbody></table>
      <h2>Turnos de caixa</h2>
      <table><thead><tr><th>ID</th><th>Aberto por</th><th>Abertura</th><th>Fechado por</th><th>Fechamento</th><th>Saldo inicial</th><th>Saldo esperado</th><th>Saldo informado</th><th>Status</th><th>Obs.</th></tr></thead><tbody>${shiftRows || '<tr><td colspan="10">Sem turnos no período.</td></tr>'}</tbody></table>
      </body></html>
    `;
  };

  const exportExcel = () => {
    downloadFile(`\ufeff${buildReportHTML(true)}`, `relatorio-salesflow-${startDate}-${endDate}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(buildReportHTML().replace('</body>', '<script>window.print();<\/script></body>'));
    printWindow.document.close();
  };

  const buildCourseComandasHTML = (forExcel = false) => {
    const courseLabel = selectedCourse === 'all' ? 'Todos os cursos/treinamentos' : selectedCourse;
    const title = `Relatório de Comandas por Aluno - ${courseLabel}`;
    const studentRows = courseStudentRows.map(row => `
      <tr>
        <td>${escapeHTML(row.student)}</td><td>${escapeHTML(row.clientType)}</td><td>${escapeHTML(row.course)}</td><td>${escapeHTML(row.unit)}</td>
        <td>${row.comandas}</td><td>${row.items}</td><td>${formatCurrency(row.total)}</td><td>${escapeHTML(formatDate(row.firstClosedAt))}</td><td>${escapeHTML(formatDate(row.lastClosedAt))}</td>
      </tr>
    `).join('');
    const comandaRows = courseComandasPeriodo.map(comanda => `
      <tr>
        <td>${escapeHTML(comanda.id)}</td><td>${escapeHTML(comanda.clientName)}</td><td>${escapeHTML(comanda.clientType)}</td><td>${escapeHTML(comanda.courseOrTraining)}</td>
        <td>${escapeHTML(comanda.unit || '-')}</td><td>${comanda.items.length}</td><td>${formatCurrency(getComandaTotal(comanda))}</td><td>${escapeHTML(formatDate(comanda.closedAt))}</td>
      </tr>
    `).join('');
    const itemRows = courseItemRows.map(item => `
      <tr>
        <td>${escapeHTML(item.comandaId)}</td><td>${escapeHTML(item.student)}</td><td>${escapeHTML(item.course)}</td><td>${escapeHTML(item.productName)}</td>
        <td>${escapeHTML(item.productCode)}</td><td>${item.quantity}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.total)}</td><td>${escapeHTML(formatDate(item.closedAt))}</td>
      </tr>
    `).join('');

    return `
      <html><head><meta charset="utf-8"><title>${escapeHTML(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: ${forExcel ? '0' : '20px'}; color: #0f172a; }
        h1 { font-size: 18px; margin: 0 0 4px; } h2 { font-size: 13px; margin: 22px 0 8px; color: #334155; }
        .sub { font-size: 12px; color: #64748b; margin-bottom: 16px; }
        .resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
        .card { padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
        .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
        .val { font-size: 17px; font-weight: bold; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; } th, td { padding: 6px 8px; border: 1px solid #dbe3ef; font-size: 11px; }
        th { background: #f1f5f9; text-align: left; color: #475569; text-transform: uppercase; font-size: 10px; }
        td:nth-child(n+2) { white-space: nowrap; }
        @media print { body { padding: 0; } .resumo { grid-template-columns: repeat(2, 1fr); } }
      </style></head><body>
      <h1>${escapeHTML(title)}</h1>
      <div class="sub">Período: ${escapeHTML(startDate)} a ${escapeHTML(endDate)} | Gerado em ${escapeHTML(new Date().toLocaleString('pt-BR'))}</div>
      <div class="resumo">
        <div class="card"><div class="label">Curso/Treinamento</div><div class="val">${escapeHTML(courseLabel)}</div></div>
        <div class="card"><div class="label">Comandas pagas</div><div class="val">${courseComandasPeriodo.length}</div></div>
        <div class="card"><div class="label">Vendas no período</div><div class="val" style="color:#059669">${formatCurrency(courseComandaTotal)}</div></div>
      </div>
      <h2>Vendas por aluno</h2>
      <table><thead><tr><th>Aluno/Cliente</th><th>Tipo</th><th>Curso</th><th>Unidade</th><th>Comandas</th><th>Itens</th><th>Total</th><th>Primeiro fechamento</th><th>Último fechamento</th></tr></thead><tbody>${studentRows || '<tr><td colspan="9">Sem vendas no período/filtro.</td></tr>'}</tbody></table>
      <h2>Comandas do período</h2>
      <table><thead><tr><th>Comanda</th><th>Aluno/Cliente</th><th>Tipo</th><th>Curso</th><th>Unidade</th><th>Itens</th><th>Total</th><th>Fechamento</th></tr></thead><tbody>${comandaRows || '<tr><td colspan="8">Sem comandas no período/filtro.</td></tr>'}</tbody></table>
      <h2>Itens vendidos</h2>
      <table><thead><tr><th>Comanda</th><th>Aluno/Cliente</th><th>Curso</th><th>Produto</th><th>Código</th><th>Qtd</th><th>Preço</th><th>Total</th><th>Fechamento</th></tr></thead><tbody>${itemRows || '<tr><td colspan="9">Sem itens vendidos no período/filtro.</td></tr>'}</tbody></table>
      </body></html>
    `;
  };

  const exportCourseComandasCSV = () => {
    const courseLabel = selectedCourse === 'all' ? 'Todos os cursos/treinamentos' : selectedCourse;
    const lines: string[] = [];
    lines.push('RELATORIO DE COMANDAS POR ALUNO');
    lines.push(`Periodo;${startDate};${endDate}`);
    lines.push(`Curso;${escapeCSV(courseLabel)}`);
    lines.push(`Comandas pagas;${courseComandasPeriodo.length}`);
    lines.push(`Vendas;${formatNumber(courseComandaTotal)}`);
    lines.push('');
    lines.push('VENDAS POR ALUNO');
    lines.push('Aluno/Cliente;Tipo;Curso;Unidade;Comandas;Itens;Total;Primeiro Fechamento;Ultimo Fechamento');
    courseStudentRows.forEach(row => {
      lines.push([
        escapeCSV(row.student),
        escapeCSV(row.clientType),
        escapeCSV(row.course),
        escapeCSV(row.unit),
        row.comandas,
        row.items,
        formatNumber(row.total),
        escapeCSV(formatDate(row.firstClosedAt)),
        escapeCSV(formatDate(row.lastClosedAt)),
      ].join(';'));
    });
    lines.push('');
    lines.push('COMANDAS DO PERIODO');
    lines.push('Comanda;Aluno/Cliente;Tipo;Curso;Unidade;Itens;Total;Fechamento');
    courseComandasPeriodo.forEach(comanda => {
      lines.push([
        escapeCSV(comanda.id),
        escapeCSV(comanda.clientName),
        escapeCSV(comanda.clientType),
        escapeCSV(comanda.courseOrTraining),
        escapeCSV(comanda.unit || '-'),
        comanda.items.length,
        formatNumber(getComandaTotal(comanda)),
        escapeCSV(formatDate(comanda.closedAt)),
      ].join(';'));
    });
    lines.push('');
    lines.push('ITENS VENDIDOS');
    lines.push('Comanda;Aluno/Cliente;Tipo;Curso;Unidade;Produto;Codigo;Quantidade;Preco;Total;Data Item;Fechamento');
    courseItemRows.forEach(item => {
      lines.push([
        escapeCSV(item.comandaId),
        escapeCSV(item.student),
        escapeCSV(item.clientType),
        escapeCSV(item.course),
        escapeCSV(item.unit),
        escapeCSV(item.productName),
        escapeCSV(item.productCode),
        item.quantity,
        formatNumber(item.price),
        formatNumber(item.total),
        escapeCSV(formatDate(item.itemTimestamp)),
        escapeCSV(formatDate(item.closedAt)),
      ].join(';'));
    });
    downloadFile(`\ufeff${lines.join('\n')}`, `comandas-${safeFilePart(courseLabel)}-${startDate}-${endDate}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportCourseComandasExcel = () => {
    const courseLabel = selectedCourse === 'all' ? 'todos' : selectedCourse;
    downloadFile(`\ufeff${buildCourseComandasHTML(true)}`, `comandas-${safeFilePart(courseLabel)}-${startDate}-${endDate}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  };

  const exportCourseComandasPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(buildCourseComandasHTML().replace('</body>', '<script>window.print();<\/script></body>'));
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
            <button onClick={exportExcel} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1 cursor-pointer">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
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

      {/* Comandas Export */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex-1">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Exportação Separada</span>
            <h3 className="text-sm font-extrabold text-slate-800 mt-0.5">Comandas por Curso e Aluno</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Usa o período selecionado acima e lista vendas de comandas pagas por aluno/cliente, com resumo e itens vendidos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Curso/Treinamento</label>
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                className="min-w-[240px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-frz-primary"
              >
                <option value="all">Todos os cursos/treinamentos</option>
                {courseOptions.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={exportCourseComandasCSV} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1 cursor-pointer">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={exportCourseComandasExcel} className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1 cursor-pointer">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <button onClick={exportCourseComandasPDF} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1 cursor-pointer">
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Comandas Pagas</div>
            <div className="text-xl font-black text-slate-800 mt-1">{courseComandasPeriodo.length}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Vendas no Filtro</div>
            <div className="text-xl font-black text-emerald-700 font-mono mt-1">{formatCurrency(courseComandaTotal)}</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Alunos/Clientes</div>
            <div className="text-xl font-black text-indigo-700 mt-1">{courseStudentRows.length}</div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[280px] overflow-y-auto mt-4 border border-slate-100 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Aluno/Cliente</th>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Curso</th>
                <th className="text-center p-3 font-extrabold text-slate-500 text-[10px] uppercase">Comandas</th>
                <th className="text-center p-3 font-extrabold text-slate-500 text-[10px] uppercase">Itens</th>
                <th className="text-right p-3 font-extrabold text-slate-500 text-[10px] uppercase">Total</th>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Último Fechamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courseStudentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">Nenhuma comanda paga encontrada no período e curso selecionados.</td>
                </tr>
              ) : (
                courseStudentRows.map(row => (
                  <tr key={`${row.student}-${row.course}-${row.unit}`} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-800">{row.student}</td>
                    <td className="p-3 text-slate-500">{row.course}</td>
                    <td className="p-3 text-center font-mono font-bold">{row.comandas}</td>
                    <td className="p-3 text-center font-mono font-bold">{row.items}</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-700">{formatCurrency(row.total)}</td>
                    <td className="p-3 text-slate-400 text-[10px] whitespace-nowrap">{formatDate(row.lastClosedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Totais por Dia</span>
          <span className="text-[10px] text-slate-400">Fluxo de caixa, entradas e saídas de estoque no período</span>
        </div>
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-extrabold text-slate-500 text-[10px] uppercase">Data</th>
                <th className="text-right p-3 font-extrabold text-slate-500 text-[10px] uppercase">Entradas Caixa</th>
                <th className="text-right p-3 font-extrabold text-slate-500 text-[10px] uppercase">Saídas Caixa</th>
                <th className="text-right p-3 font-extrabold text-slate-500 text-[10px] uppercase">Caixa Líquido</th>
                <th className="text-right p-3 font-extrabold text-slate-500 text-[10px] uppercase">Comandas</th>
                <th className="text-right p-3 font-extrabold text-slate-500 text-[10px] uppercase">PDV</th>
                <th className="text-right p-3 font-extrabold text-slate-500 text-[10px] uppercase">Entrada Est.</th>
                <th className="text-right p-3 font-extrabold text-slate-500 text-[10px] uppercase">Saída Est.</th>
                <th className="text-center p-3 font-extrabold text-slate-500 text-[10px] uppercase">Mov.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailySummary.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">Nenhum total diário encontrado no período.</td>
                </tr>
              ) : (
                dailySummary.map(row => (
                  <tr key={row.dateKey} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{row.dateLabel}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(row.cashIn)}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">{formatCurrency(row.cashOut)}</td>
                    <td className="p-3 text-right font-mono font-black text-slate-800">{formatCurrency(row.cashNet)}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(row.comandaSales)}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(row.pdvSales)}</td>
                    <td className="p-3 text-right font-mono text-blue-600">{row.stockEntryQty} un. / {formatCurrency(row.stockEntryValue)}</td>
                    <td className="p-3 text-right font-mono text-red-600">{row.stockExitQty} un. / {formatCurrency(row.stockExitValue)}</td>
                    <td className="p-3 text-center font-mono text-slate-500">{row.movements}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">Receita Realizada</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">{formatCurrency(totalVendido)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Comandas pagas + PDV líquido</div>
          <div className="mt-2 space-y-1 text-[10px]">
            <div className="flex justify-between"><span>Comandas pagas:</span><span className="font-mono font-bold text-emerald-600">{formatCurrency(vendasComandaPeriodo)}</span></div>
            <div className="flex justify-between"><span>Vendas PDV:</span><span className="font-mono font-bold text-emerald-500">{formatCurrency(vendasPDVPeriodo)}</span></div>
            {estornosPDVPeriodo > 0 && <div className="flex justify-between"><span>Estornos PDV:</span><span className="font-mono font-bold text-rose-500">-{formatCurrency(estornosPDVPeriodo)}</span></div>}
            <div className="flex justify-between"><span>Comandas fechadas:</span><span className="font-mono font-bold text-slate-500">{comandasPagasPeriodo}</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">Entradas Estoque</span>
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">{formatCurrency(entradas)}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {filteredMovements.filter(m => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0)} unidades
          </div>
          {estornosComandaPeriodo + estornosPDVPeriodo > 0 && (
            <div className="mt-2 space-y-1 text-[10px]">
              {estornosComandaPeriodo > 0 && <div className="flex justify-between"><span>Estornos comanda:</span><span className="font-mono font-bold text-blue-600">{formatCurrency(estornosComandaPeriodo)}</span></div>}
              {estornosPDVPeriodo > 0 && <div className="flex justify-between"><span>Estornos PDV:</span><span className="font-mono font-bold text-blue-600">{formatCurrency(estornosPDVPeriodo)}</span></div>}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">Saídas Estoque</span>
          </div>
          <div className="text-2xl font-black text-red-600 font-mono">{formatCurrency(saidas)}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {filteredMovements.filter(m => m.type === 'saida').reduce((s, m) => s + m.quantity, 0)} unidades
          </div>
          <div className="mt-2 space-y-1 text-[10px]">
            {baixasComandaPeriodo > 0 && <div className="flex justify-between"><span>Baixas comanda:</span><span className="font-mono font-bold text-red-600">{formatCurrency(baixasComandaPeriodo)}</span></div>}
            {vendasPDVPeriodo > 0 && <div className="flex justify-between"><span>Baixas PDV:</span><span className="font-mono font-bold text-red-600">{formatCurrency(vendasPDVPeriodo)}</span></div>}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Package className="w-4 h-4 text-frz-primary" />
            <span className="text-[10px] font-black uppercase tracking-wider">Consumo em Aberto</span>
          </div>
          <div className="text-2xl font-black text-frz-primary font-mono">{formatCurrency(consumoAbertoPeriodo)}</div>
          <div className="text-[10px] text-slate-400 mt-1">{comandasAbertas} comanda(s) aberta(s)</div>
          <div className="text-[10px] text-amber-600 mt-2 font-bold">Ainda não entra em receita realizada</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Wallet className="w-4 h-4 text-violet-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">Valor em Estoque</span>
          </div>
          <div className="text-2xl font-black text-violet-600 font-mono">{formatCurrency(valorEstoque)}</div>
          <div className="text-[10px] text-slate-400 mt-1">{products.reduce((s, p) => s + p.stock, 0)} unidades em {products.length} produtos</div>
          <div className="text-[10px] text-slate-400 mt-1">Saldo mov. estoque: {formatCurrency(saldoMovimentacaoEstoque)}</div>
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
