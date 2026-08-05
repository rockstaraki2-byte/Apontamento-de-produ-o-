import React, { useState, useMemo } from "react";
import { useDatabase } from "./useDatabase";
import { User, SheetStockEntry, SheetStockMovement } from "./types";
import {
  Layers,
  Plus,
  Search,
  FileText,
  Calendar,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Trash2,
  Edit3,
  CheckCircle,
  Truck,
  Hash,
  Ruler,
  PackageCheck,
  History,
  Filter
} from "lucide-react";

interface Props {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}

export function EstoqueChapasScreen({ db, currentUser }: Props) {
  const [activeTab, setActiveTab] = useState<"ESTOQUE" | "HISTORICO">("ESTOQUE");
  const [searchTerm, setSearchTerm] = useState("");
  const [movementFilter, setMovementFilter] = useState<"TODOS" | "ENTRADA" | "SAIDA">("TODOS");

  // Modal de Entrada de NF
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [description, setDescription] = useState("");
  const [initialQuantity, setInitialQuantity] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  // Modal de Edição/Ajuste de Estoque
  const [editingSheet, setEditingSheet] = useState<SheetStockEntry | null>(null);
  const [editCurrentQuantity, setEditCurrentQuantity] = useState<number | "">("");

  // Handler para Salvar Entrada via NF
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !supplier.trim() || !dimensions.trim() || !description.trim() || !initialQuantity || Number(initialQuantity) <= 0) {
      alert("Por favor, preencha todos os campos obrigatórios (Número da Nota, Fornecedor, Dimensão, Descrição e Quantidade)!");
      return;
    }

    try {
      await db.addSheetStock({
        invoiceNumber: invoiceNumber.trim(),
        supplier: supplier.trim(),
        dimensions: dimensions.trim(),
        description: description.trim(),
        initialQuantity: Number(initialQuantity),
        currentQuantity: Number(initialQuantity),
        createdBy: currentUser.name || "PCP/Gerência",
        notes: notes.trim() || undefined,
      });

      alert(`Entrada da Nota Fiscal #${invoiceNumber} cadastrada com sucesso!`);
      setIsEntryModalOpen(false);
      setInvoiceNumber("");
      setSupplier("");
      setDimensions("");
      setDescription("");
      setInitialQuantity("");
      setNotes("");
    } catch (err) {
      console.error("Erro ao salvar entrada de chapas:", err);
      alert("Erro ao salvar entrada de chapas no banco de dados.");
    }
  };

  // Handler para Salvar Ajuste Manual de Estoque
  const handleSaveEditSheet = async () => {
    if (!editingSheet) return;
    const newQty = Number(editCurrentQuantity);
    if (isNaN(newQty) || newQty < 0) {
      alert("Digite uma quantidade válida!");
      return;
    }

    const diff = newQty - editingSheet.currentQuantity;
    await db.updateSheetStock(editingSheet.id, { currentQuantity: newQty });

    // Registrar movimentação de ajuste
    if (diff !== 0) {
      await db.addSheetStockMovement({
        sheetStockId: editingSheet.id,
        invoiceNumber: editingSheet.invoiceNumber,
        supplier: editingSheet.supplier,
        description: `Ajuste manual de estoque de chapas por ${currentUser.name} (${diff > 0 ? "+" : ""}${diff} chapas)`,
        type: diff > 0 ? "ENTRADA" : "SAIDA",
        quantity: Math.abs(diff),
        dimensions: editingSheet.dimensions,
        operatorName: currentUser.name,
      });
    }

    alert("Estoque da chapa atualizado com sucesso!");
    setEditingSheet(null);
  };

  // Excluir Chapa
  const handleDeleteSheet = async (id: string, desc: string) => {
    if (window.confirm(`Deseja realmente remover o registro da chapa "${desc}"?`)) {
      await db.deleteSheetStock(id);
      alert("Registro excluído com sucesso.");
    }
  };

  // Filtragem de Chapas
  const filteredStocks = useMemo(() => {
    return (db.sheetStocks || []).filter((s) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.invoiceNumber.toLowerCase().includes(term) ||
        s.supplier.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.dimensions.toLowerCase().includes(term)
      );
    }).sort((a, b) => b.entryDate - a.entryDate);
  }, [db.sheetStocks, searchTerm]);

  // Filtragem de Histórico
  const filteredMovements = useMemo(() => {
    return (db.sheetStockMovements || []).filter((m) => {
      const matchType = movementFilter === "TODOS" || m.type === movementFilter;
      if (!matchType) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        m.description.toLowerCase().includes(term) ||
        (m.invoiceNumber && m.invoiceNumber.toLowerCase().includes(term)) ||
        (m.supplier && m.supplier.toLowerCase().includes(term)) ||
        (m.operatorName && m.operatorName.toLowerCase().includes(term)) ||
        (m.dimensions && m.dimensions.toLowerCase().includes(term)) ||
        (m.leftoverDimensions && m.leftoverDimensions.toLowerCase().includes(term))
      );
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [db.sheetStockMovements, movementFilter, searchTerm]);

  // Totais KPIs
  const totalChapasEstoque = useMemo(() => {
    return (db.sheetStocks || []).reduce((acc, s) => acc + s.currentQuantity, 0);
  }, [db.sheetStocks]);

  const totalNFs = useMemo(() => db.sheetStocks?.length || 0, [db.sheetStocks]);

  const totalSaidasCorte = useMemo(() => {
    return (db.sheetStockMovements || [])
      .filter((m) => m.type === "SAIDA")
      .reduce((acc, m) => acc + m.quantity, 0);
  }, [db.sheetStockMovements]);

  return (
    <div className="w-full p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-md shrink-0">
            <Layers size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Controle de Estoque de Chapas
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Entradas por NF, saldos em estoque e abatimentos por corte a laser
            </p>
          </div>
        </div>

        {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.role === "PCP") && (
          <button
            onClick={() => setIsEntryModalOpen(true)}
            className="w-full md:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Plus size={18} />
            <span>Entrada de Chapas (Nota Fiscal)</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Saldo em Estoque
            </span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">
              {totalChapasEstoque} <span className="text-xs font-semibold text-slate-500">chapas</span>
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <PackageCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Notas Fiscais
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {totalNFs} <span className="text-xs font-semibold text-slate-500">NFs</span>
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileText size={24} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Utilizado no Corte
            </span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {totalSaidasCorte} <span className="text-xs font-semibold text-slate-500">chapas</span>
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ArrowDownRight size={24} />
          </div>
        </div>
      </div>

      {/* Main Content Area with Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Tabs - Scrollable on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-200/70 p-1 rounded-xl w-full sm:w-fit overflow-x-auto touch-pan-x">
            <button
              onClick={() => setActiveTab("ESTOQUE")}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === "ESTOQUE"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PackageCheck size={16} />
              <span>Estoque Atual ({filteredStocks.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("HISTORICO")}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === "HISTORICO"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History size={16} />
              <span>Histórico ({filteredMovements.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === "ESTOQUE" ? "Buscar por NF, fornecedor, chapa..." : "Buscar movimentação..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        {/* TAB 1: ESTOQUE ATUAL DE CHAPAS */}
        {activeTab === "ESTOQUE" && (
          <div className="w-full">
            {/* Desktop Table View */}
            <div className="hidden md:block w-full overflow-x-auto touch-pan-x">
              <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                <thead>
                  <tr className="bg-slate-100/90 backdrop-blur-xs text-[10px] uppercase tracking-widest text-slate-500 font-extrabold border-b border-slate-200 sticky top-0 z-10">
                    <th className="p-3.5">Nota Fiscal (NF)</th>
                    <th className="p-3.5">Fornecedor</th>
                    <th className="p-3.5">Descrição da Chapa / Material</th>
                    <th className="p-3.5 text-center">Dimensões</th>
                    <th className="p-3.5 text-center">Qtd. Inicial</th>
                    <th className="p-3.5 text-center bg-indigo-50/80 text-indigo-900">Qtd. Atual Disponível</th>
                    <th className="p-3.5 text-center">Data e Hora de Entrada</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStocks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                        Nenhum registro de chapa em estoque. Clique em "+ Entrada de Chapas (Nota Fiscal)" para cadastrar.
                      </td>
                    </tr>
                  ) : (
                    filteredStocks.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-md border border-slate-200">
                            NF #{s.invoiceNumber}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">{s.supplier}</td>
                        <td className="p-3.5 font-medium text-slate-700">
                          {s.description}
                          {s.notes && <span className="block text-[10px] text-slate-400 italic mt-0.5">{s.notes}</span>}
                        </td>
                        <td className="p-3.5 text-center font-mono font-semibold text-slate-600 bg-slate-50 rounded-lg">
                          {s.dimensions}
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-500">{s.initialQuantity}</td>
                        <td className="p-3.5 text-center font-extrabold font-mono text-indigo-700 bg-indigo-50/40 text-sm">
                          {s.currentQuantity} chapas
                        </td>
                        <td className="p-3.5 text-center text-slate-500 font-medium">
                          {new Date(s.entryDate).toLocaleDateString("pt-BR")} às {new Date(s.entryDate).toLocaleTimeString("pt-BR").substring(0, 5)}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.role === "PCP") && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingSheet(s);
                                    setEditCurrentQuantity(s.currentQuantity);
                                  }}
                                  title="Ajustar Estoque"
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                                >
                                  <Edit3 size={14} /> Ajustar
                                </button>
                                <button
                                  onClick={() => handleDeleteSheet(s.id, s.description)}
                                  title="Excluir Registro"
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100 p-2 sm:p-4">
              {filteredStocks.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  Nenhum registro de chapa em estoque.
                </div>
              ) : (
                filteredStocks.map((s) => (
                  <div key={s.id} className="p-4 space-y-3 bg-white rounded-xl border border-slate-100 my-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-slate-100 text-slate-900 px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold border border-slate-200">
                        NF #{s.invoiceNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.role === "PCP") && (
                          <>
                            <button
                              onClick={() => {
                                setEditingSheet(s);
                                setEditCurrentQuantity(s.currentQuantity);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 size={12} /> Ajustar
                            </button>
                            <button
                              onClick={() => handleDeleteSheet(s.id, s.description)}
                              className="p-1 bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800 leading-snug">
                        {s.description}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Fornecedor: <strong className="text-slate-700">{s.supplier}</strong>
                      </p>
                      {s.notes && (
                        <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {s.notes}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Dimensão</span>
                        <span className="font-mono font-extrabold text-slate-700 mt-0.5 block">{s.dimensions}</span>
                      </div>
                      <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase block">Disponível</span>
                        <span className="font-mono font-black text-indigo-700 text-sm mt-0.5 block">{s.currentQuantity} chapas</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                      <span>Qtd Inicial: {s.initialQuantity}</span>
                      <span>{new Date(s.entryDate).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HISTÓRICO DE MOVIMENTAÇÕES (ENTRADAS E SAÍDAS) */}
        {activeTab === "HISTORICO" && (
          <div className="space-y-4 p-3 sm:p-4 w-full">
            {/* Filter Pill Options - Scrollable on mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto touch-pan-x pb-1">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Filter size={14} /> Filtrar:
              </span>
              {(["TODOS", "ENTRADA", "SAIDA"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMovementFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer shrink-0 ${
                    movementFilter === f
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f === "TODOS" ? "TODAS" : f === "ENTRADA" ? "ENTRADAS (NF)" : "SAÍDAS (CORTE)"}
                </button>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block w-full overflow-x-auto touch-pan-x border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                <thead>
                  <tr className="bg-slate-100/90 backdrop-blur-xs text-[10px] uppercase tracking-widest text-slate-500 font-extrabold border-b border-slate-200 sticky top-0 z-10">
                    <th className="p-3.5">Data e Hora Automática</th>
                    <th className="p-3.5 text-center">Tipo</th>
                    <th className="p-3.5">Descrição da Movimentação</th>
                    <th className="p-3.5 text-center">Qtd. Chapas</th>
                    <th className="p-3.5 text-center">Dimensão</th>
                    <th className="p-3.5">Responsável / Operador</th>
                    <th className="p-3.5">Sobras Registradas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                        Nenhuma movimentação registrada no sistema.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono font-semibold text-slate-700 whitespace-nowrap">
                          {new Date(m.timestamp).toLocaleDateString("pt-BR")} às {new Date(m.timestamp).toLocaleTimeString("pt-BR")}
                        </td>
                        <td className="p-3.5 text-center">
                          {m.type === "ENTRADA" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <ArrowUpRight size={12} /> ENTRADA (NF)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                              <ArrowDownRight size={12} /> SAÍDA (CORTE)
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          {m.description}
                          {m.invoiceNumber && <span className="block text-[10px] text-slate-400 font-mono">NF: {m.invoiceNumber} | {m.supplier}</span>}
                        </td>
                        <td className={`p-3.5 text-center font-black font-mono text-sm ${m.type === "ENTRADA" ? "text-emerald-700" : "text-rose-700"}`}>
                          {m.type === "ENTRADA" ? `+${m.quantity}` : `-${m.quantity}`} chapas
                        </td>
                        <td className="p-3.5 text-center font-mono text-slate-600">{m.dimensions || "—"}</td>
                        <td className="p-3.5 font-semibold text-slate-700">{m.operatorName || "PCP/Gerência"}</td>
                        <td className="p-3.5">
                          {m.hasLeftover && m.leftoverDimensions ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-md">
                              Sobrou: {m.leftoverDimensions}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Sem sobra</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile History Cards View */}
            <div className="block md:hidden space-y-3">
              {filteredMovements.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  Nenhuma movimentação registrada no sistema.
                </div>
              ) : (
                filteredMovements.map((m) => (
                  <div key={m.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      {m.type === "ENTRADA" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <ArrowUpRight size={12} /> ENTRADA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                          <ArrowDownRight size={12} /> SAÍDA
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(m.timestamp).toLocaleDateString("pt-BR")} {new Date(m.timestamp).toLocaleTimeString("pt-BR").substring(0, 5)}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">
                        {m.description}
                      </h4>
                      {m.invoiceNumber && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          NF: #{m.invoiceNumber} ({m.supplier})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className={`font-black font-mono ${m.type === "ENTRADA" ? "text-emerald-700" : "text-rose-700"}`}>
                        {m.type === "ENTRADA" ? `+${m.quantity}` : `-${m.quantity}`} chapas
                      </span>
                      <span className="text-slate-500 font-medium">
                        {m.operatorName || "Operador"}
                      </span>
                    </div>

                    {m.hasLeftover && m.leftoverDimensions && (
                      <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px] font-bold text-amber-900">
                        Sobrou: {m.leftoverDimensions}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE ENTRADA POR NOTA FISCAL */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-auto overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Dar Entrada em Chapas (Nota Fiscal)
                  </h3>
                  <span className="text-[11px] text-slate-400 block">
                    Data e hora registradas automaticamente
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Número da NF *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ex: 12345"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Fornecedor *
                  </label>
                  <input
                    type="text"
                    required
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Ex: ArcelorMittal"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Descrição da Chapa / Tipo *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Chapa Aço Carbono 3.17mm (1/8&quot;) SAE 1020"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Dimensão da Chapa *
                  </label>
                  <input
                    type="text"
                    required
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="Ex: 1200x3000mm ou 1/8 x 1200x2400"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Quantidade de Chapas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Ex: 50"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observações Internas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Lote de compra, certificado do aço, observações..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle size={16} /> Salvar Entrada de NF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO / AJUSTE DE ESTOQUE */}
      {editingSheet && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-auto p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-slate-800 border-b pb-2">
              Ajustar Estoque de Chapa - NF #{editingSheet.invoiceNumber}
            </h3>
            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p><strong>Descrição:</strong> {editingSheet.description}</p>
              <p><strong>Dimensões:</strong> {editingSheet.dimensions}</p>
              <p><strong>Qtd Inicial da NF:</strong> {editingSheet.initialQuantity} chapas</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nova Quantidade em Estoque (Disponível)
              </label>
              <input
                type="number"
                min="0"
                value={editCurrentQuantity}
                onChange={(e) => setEditCurrentQuantity(e.target.value ? Number(e.target.value) : "")}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingSheet(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditSheet}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Confirmar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
