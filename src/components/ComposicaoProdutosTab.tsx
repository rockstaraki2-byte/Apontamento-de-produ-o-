import React, { useState, useMemo } from "react";
import { useDatabase } from "../useDatabase";
import { Item } from "../types";
import {
  Layers,
  Search,
  Plus,
  Trash2,
  X,
  AlertCircle,
  HelpCircle,
  Settings,
  Package
} from "lucide-react";

export function ComposicaoProdutosTab({ db }: { db: ReturnType<typeof useDatabase> }) {
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [parentSearch, setParentSearch] = useState("");
  const [childSearch, setChildSearch] = useState("");
  
  // Selection states for adding helper component
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [childQuantity, setChildQuantity] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedParent = useMemo(() => {
    if (selectedParentId === null) return null;
    return db.items.find((it) => it.id === selectedParentId) || null;
  }, [selectedParentId, db.items]);

  // Filter items for main parent list
  const filteredParents = useMemo(() => {
    const term = parentSearch.trim().toLowerCase();
    return db.items.filter((it) => {
      // By default, showing mostly products, but allow all items to have compositions
      const matchSearch =
        it.name.toLowerCase().includes(term) ||
        it.code.toLowerCase().includes(term);
      return matchSearch;
    });
  }, [db.items, parentSearch]);

  // List of potential child components to add to composition
  // Excludes the parent itself to prevent self-reference
  const availableChildItems = useMemo(() => {
    const term = childSearch.trim().toLowerCase();
    return db.items.filter((it) => {
      if (selectedParent && it.id === selectedParent.id) return false;
      const alreadyLinked = selectedParent?.components?.some((c) => c.itemId === it.id);
      if (alreadyLinked) return false;

      return (
        it.name.toLowerCase().includes(term) ||
        it.code.toLowerCase().includes(term)
      );
    });
  }, [db.items, selectedParent, childSearch]);

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedParent) return;
    if (!selectedChildId) {
      setErrorMsg("Por favor, selecione uma peça ou produto para vincular.");
      return;
    }

    const qty = Number(childQuantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("A quantidade deve ser um número positivo.");
      return;
    }

    const currentComps = selectedParent.components || [];
    const childIdNum = parseInt(selectedChildId, 10);

    // Prevent recursive loop: check if child component has parent in its own components
    const childItem = db.items.find((it) => it.id === childIdNum);
    if (childItem?.components?.some((c) => c.itemId === selectedParent.id)) {
      setErrorMsg(
        `Impossível vincular: O item selecionado já possui o item atual (${selectedParent.code}) em sua composição. Circularidade não permitida.`
      );
      return;
    }

    const updatedComps = [...currentComps, { itemId: childIdNum, quantity: qty }];

    try {
      await db.updateItem({
        ...selectedParent,
        components: updatedComps,
      });
      setSelectedChildId("");
      setChildQuantity(1);
      setChildSearch("");
    } catch (err: any) {
      setErrorMsg("Erro ao salvar composição: " + err.message);
    }
  };

  const handleRemoveComponent = async (idxToRemove: number) => {
    if (!selectedParent) return;
    const comps = [...(selectedParent.components || [])];
    comps.splice(idxToRemove, 1);

    try {
      await db.updateItem({
        ...selectedParent,
        components: comps,
      });
    } catch (err: any) {
      alert("Erro ao remover componente: " + err.message);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-xs p-5 text-left flex flex-col md:flex-row gap-6">
      {/* LEFT PANEL: Parent Product Selector */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="text-purple-600" size={20} />
            <h3 className="font-bold text-gray-800 text-base">Composição de Produtos (BOM)</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Selecione o produto pai para gerenciar seus subprodutos, peças ou componentes. Quando este produto for faturado, o estoque de todos os componentes associados será consumido automaticamente.
          </p>
        </div>

        {/* Filter Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar produto por código ou nome..."
            value={parentSearch}
            onChange={(e) => setParentSearch(e.target.value)}
            className="w-full border border-gray-350 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white"
          />
        </div>

        {/* List of parents */}
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[480px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-slate-50 sticky top-0 font-bold text-gray-700">
              <tr>
                <th className="py-2.5 px-3 text-left">Código</th>
                <th className="py-2.5 px-3 text-left">Descrição</th>
                <th className="py-2.5 px-3 text-center">Tipo</th>
                <th className="py-2.5 px-3 text-center">Componentes</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredParents.map((it) => {
                const compCount = it.components?.length || 0;
                const isSelected = selectedParentId === it.id;
                return (
                  <tr
                    key={it.id}
                    onClick={() => setSelectedParentId(it.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-purple-50/50 hover:bg-purple-50" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{it.code}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-700 max-w-[200px] truncate" title={it.name}>
                      {it.name}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          it.type === "PECA"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {it.type || "PRODUTO"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {compCount > 0 ? (
                        <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          {compCount} itens
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Nenhum</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedParentId(it.id);
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition ${
                          isSelected
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Configurar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredParents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                    Nenhum produto correspondente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL: Composition Editor */}
      <div className="flex-1 min-w-0">
        {selectedParent ? (
          <div className="border border-purple-100 bg-purple-50/10 rounded-xl p-5 flex flex-col h-full">
            <div className="flex justify-between items-start border-b border-purple-100 pb-3 mb-4">
              <div>
                <span className="bg-purple-100 text-purple-800 text-[10px] uppercase font-bold py-0.5 px-2 rounded-full">
                  Parent Código: {selectedParent.code}
                </span>
                <h3 className="text-base font-bold text-gray-800 mt-1">
                  {selectedParent.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedParentId(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-slate-100"
                title="Fechar editor"
              >
                <X size={18} />
              </button>
            </div>

            {/* Existing Linked Components list */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Componentes Vinculados:
              </h4>
              {!selectedParent.components || selectedParent.components.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-gray-200 rounded-lg p-5 text-center text-xs text-gray-400 italic">
                  Este produto ainda não possui composição configurada.
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-150 rounded-lg bg-white bg-opacity-70">
                  <table className="min-w-full divide-y divide-gray-150 text-xs">
                    <thead className="bg-slate-50 text-gray-600 font-bold">
                      <tr>
                        <th className="py-2 px-3 text-left">Código</th>
                        <th className="py-2 px-3 text-left">Nome</th>
                        <th className="py-2 px-3 text-center">Unit. Qtd</th>
                        <th className="py-2 px-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedParent.components.map((comp, idx) => {
                        const childItem = db.items.find((x) => x.id === comp.itemId);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono font-bold text-gray-900">
                              {childItem ? childItem.code : comp.itemId}
                            </td>
                            <td className="py-2 px-3 text-gray-700 truncate max-w-[150px]">
                              {childItem ? childItem.name : "Item não localizado"}
                            </td>
                            <td className="py-2 px-3 text-center font-black text-purple-700">
                              {comp.quantity}x
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveComponent(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                title="Desvincular componente"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Form to link a new component */}
            <form onSubmit={handleAddComponent} className="mt-auto bg-white border border-purple-100 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Plus size={14} /> Vincular Outra Peça / Produto
              </h4>

              {errorMsg && (
                <div className="mb-3 bg-red-50 text-red-800 p-2.5 rounded-lg text-xs flex items-start gap-2 border border-red-100">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Component Search Input */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Pesquisar Componente:
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Filtrar por código ou descrição..."
                    value={childSearch}
                    onChange={(e) => setChildSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none bg-slate-50 focus:bg-white focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Component Selection Dropdown */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Selecione do Catálogo:
                </label>
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                >
                  <option value="">-- Escolha um item do catálogo ({availableChildItems.length} opções) --</option>
                  {availableChildItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.code}] - {it.name} ({it.type || "PRODUTO"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Input */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Qtd Necessária (Pai = 1):
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={childQuantity}
                    onChange={(e) => setChildQuantity(parseFloat(e.target.value) || 0)}
                    min="0.001"
                    className="w-full border border-gray-300 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs py-2 px-3 rounded-lg transition"
                  >
                    Vincular Componente
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400 flex flex-col items-center justify-center h-full">
            <Package size={48} className="text-gray-300 mb-3" />
            <p className="font-bold text-sm text-gray-700">Editor de Composição</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
              Clique em um produto da lista à esquerda para detalhar, adicionar ou remover componentes vinculados à sua estrutura.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
