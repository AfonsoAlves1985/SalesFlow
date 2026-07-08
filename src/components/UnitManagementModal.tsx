import React, { useState } from 'react';
import { Comanda } from '../types';
import { Building2, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface UnitManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidades: string[];
  onSaveUnidades: (updatedUnidades: string[], updatedComandas?: Comanda[]) => void;
  comandas: Comanda[];
}

export default function UnitManagementModal({
  isOpen,
  onClose,
  unidades,
  onSaveUnidades,
  comandas
}: UnitManagementModalProps) {
  const [newUnitName, setNewUnitName] = useState('');
  const [editingUnitName, setEditingUnitName] = useState<string | null>(null);
  const [unitEditText, setUnitEditText] = useState('');

  if (!isOpen) return null;

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newUnitName.trim();
    if (!cleanName) return;

    if (unidades.some(u => u.toLowerCase() === cleanName.toLowerCase())) {
      alert('Esta unidade já existe!');
      return;
    }

    const updated = [...unidades, cleanName];
    onSaveUnidades(updated);
    setNewUnitName('');
  };

  const handleStartEditUnit = (unit: string) => {
    setEditingUnitName(unit);
    setUnitEditText(unit);
  };

  const handleSaveUnitEdit = (oldUnit: string) => {
    const cleanName = unitEditText.trim();
    if (!cleanName) return;

    if (oldUnit === cleanName) {
      setEditingUnitName(null);
      return;
    }

    if (unidades.some(u => u.toLowerCase() === cleanName.toLowerCase() && u !== oldUnit)) {
      alert('Esta unidade de destino já existe!');
      return;
    }

    const updatedUnidades = unidades.map(u => u === oldUnit ? cleanName : u);

    // Auto-update comandas of this unit to keep data consistency!
    const updatedComandas = comandas.map(c => {
      if (c.unit === oldUnit) {
        return { ...c, unit: cleanName };
      }
      return c;
    });

    onSaveUnidades(updatedUnidades, updatedComandas);
    setEditingUnitName(null);
  };

  const handleDeleteUnit = (unitToDelete: string) => {
    const inUseCount = comandas.filter(c => c.unit === unitToDelete).length;
    const remainingUnits = unidades.filter(u => u !== unitToDelete);
    const fallbackUnit = remainingUnits[0] || 'Sede Principal';

    let msg = `Remover a unidade "${unitToDelete}"?`;
    if (inUseCount > 0) {
      msg = `A unidade "${unitToDelete}" está vinculada a ${inUseCount} comanda(s). Ao excluí-la, estas comandas serão automaticamente remanejadas para a unidade "${fallbackUnit}".\n\nDeseja prosseguir com a exclusão?`;
    }

    if (window.confirm(msg)) {
      const updatedComandas = comandas.map(c => {
        if (c.unit === unitToDelete || !c.unit) {
          return { ...c, unit: fallbackUnit };
        }
        return c;
      });

      let finalUnits = remainingUnits;
      if (finalUnits.length === 0) {
        finalUnits = [fallbackUnit];
      }

      onSaveUnidades(finalUnits, updatedComandas);
    }
  };

  return (
    <div 
      id="unit-mgmt-backdrop" 
      onClick={(e) => {
        if ((e.target as HTMLElement).id === "unit-mgmt-backdrop") {
          onClose();
        }
      }}
      className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-xs cursor-pointer"
    >
      <div 
        id="unit-mgmt-card" 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-slate-150 shadow-xl max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col cursor-default"
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Building2 className="w-4.5 h-4.5 text-frz-primary" />
            <h3 className="text-sm font-black text-slate-900">Gerenciar Unidades</h3>
          </div>
          <button 
            id="unit-mgmt-close-btn"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-bold text-xs p-1 cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Form to add secondary unit */}
          <form id="unit-add-form" onSubmit={handleAddUnit} className="flex flex-col sm:flex-row gap-2">
            <input
              id="new-unit-input"
              type="text"
              placeholder="Nova Unidade (Ex: Unidade Centro, Unidade Norte)"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 font-bold"
              required
            />
            <button
              id="new-unit-submit"
              type="submit"
              className="px-3.5 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white border border-frz-primary-hover rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              Adicionar
            </button>
          </form>

          {/* Dynamic Units List Scroll Area */}
          <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[220px] overflow-y-auto bg-slate-50/50">
            {unidades.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Nenhuma unidade disponível.
              </div>
            ) : (
              unidades.map((unit) => {
                const isEditing = editingUnitName === unit;
                const inUseCount = comandas.filter(c => c.unit === unit).length;

                return (
                  <div key={unit} className="p-3 flex items-center justify-between text-xs gap-3">
                    {isEditing ? (
                      <div className="flex-1 flex flex-col sm:flex-row gap-1.5 sm:items-center">
                        <input
                          id={`edit-unit-field-${unit}`}
                          type="text"
                          value={unitEditText}
                          onChange={(e) => setUnitEditText(e.target.value)}
                          className="flex-1 px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                          autoFocus
                        />
                        <button
                          id={`save-unit-btn-${unit}`}
                          onClick={() => handleSaveUnitEdit(unit)}
                          className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition cursor-pointer"
                          title="Salvar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`cancel-unit-btn-${unit}`}
                          onClick={() => setEditingUnitName(null)}
                          className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-800">{unit}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {inUseCount} {inUseCount === 1 ? 'comanda associada' : 'comandas associadas'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            id={`edit-unit-btn-${unit}`}
                            onClick={() => handleStartEditUnit(unit)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Editar Unidade"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-unit-btn-${unit}`}
                            onClick={() => handleDeleteUnit(unit)}
                            className="p-1.5 text-rose-500 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Excluir Unidade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
              id="unit-mgmt-exit-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-150 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              Sair
            </button>
            <button
              id="unit-mgmt-confirm-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-frz-primary hover:bg-frz-primary-hover text-white border border-[#1565C0] text-xs font-black rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-white" />
              Confirmar e Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
