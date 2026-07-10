import React, { useState, useEffect, useMemo } from "react";
import { useDatabase } from "./useDatabase";
import { User, Order, ProductionBatch } from "./types";
import { ScreenLayout, ScrollContainer } from "./components/Layout";
import { List, Search, AlertTriangle, AlertCircle, ArrowRight, Play, Loader, FileText, ChevronUp, ChevronDown } from "lucide-react";

export function PedidosSemLoteScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [reportData, setReportData] = useState<any>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [search, setSearch] = useState("");
  const [filterUrgencia, setFilterUrgencia] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);

  const [isAgentCardExpanded, setIsAgentCardExpanded] = useState(true);

  // Modal de Criação de Lote
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [batchSector, setBatchSector] = useState<number>(0);
  const [batchNotes, setBatchNotes] = useState("");
  const [batchDeadline, setBatchDeadline] = useState("");

  useEffect(() => {
    // Escuta tempo real o relatório
    const sub = db.agentReports || [];
    const report = sub.find((r: any) => r.agentId === "monitor-pedidos-sem-lote");
    if (report) {
      setReportData(report);
    }
  }, [db.agentReports]);

  // Tempo real de pedidos sem lote a partir do banco de dados (para a lista de pedidos local)
  const pedidosSemLote = useMemo(() => {
    const ordersWithBatch = new Set<number>();
    db.productionBatches.forEach(b => {
      if (Array.isArray(b.orderIds)) {
        b.orderIds.forEach(id => ordersWithBatch.add(id));
      }
    });

    const excludeStatus = ["FATURADO", "EMBALADO", "CANCELADO"];
    let filtered = db.orders.filter(o => 
      o.isActive && 
      !ordersWithBatch.has(o.id) &&
      !excludeStatus.includes(o.status || "")
    );

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        o => o.customerName.toLowerCase().includes(q) || String(o.id).includes(q)
      );
    }
    return filtered.sort((a, b) => {
      // Prioridade por data de entrega mais proxima do que nao tem data
      // Ou pela urgencia local
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return a.createdAt - b.createdAt;
    });
  }, [db.orders, db.productionBatches, search]);

  const toggleSelect = (id: number) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(prev => prev.filter(x => x !== id));
    } else {
      setSelectedOrders(prev => [...prev, id]);
    }
  };

  const handleUpdateAnalysis = async () => {
    setLoadingAgent(true);
    try {
      const resp = await fetch("/api/agent/pedidos-sem-lote", { method: "POST" });
      const body = await resp.json();
      if (!resp.ok || !body.success) {
         if (body.message) {
            alert(body.message);
         } else {
            alert("Erro ao atualizar dados: " + (body.error || "Erro desconhecido"));
         }
      } else {
         if (body.message) {
            alert(body.message);
         } else {
            alert("Relatório atualizado com sucesso!");
         }
      }
    } catch (e: any) {
      console.error(e);
      alert("Erro ao chamar agente: " + e.message);
    } finally {
      setLoadingAgent(false);
    }
  };

  const openCreateBatchModal = (preSelectedIds: number[] = [], sugestedName: string = "") => {
    if (preSelectedIds.length > 0) {
      setSelectedOrders(preSelectedIds);
    }
    setBatchName(sugestedName);
    setBatchNotes("");
    setBatchDeadline("");
    setBatchSector(db.sectors[0]?.id || 0);
    setIsModalOpen(true);
  };

  const confirmCreateBatch = () => {
    if (selectedOrders.length === 0) {
      alert("Nenhum pedido selecionado.");
      return;
    }
    if (!batchName.trim()) {
      alert("Informe um nome para o lote.");
      return;
    }
    db.addProductionBatch({
      name: batchName.trim(),
      sectorId: batchSector,
      orderIds: selectedOrders,
      status: "PENDENTE",
      createdAt: Date.now(),
      notes: batchNotes,
      deadline: batchDeadline,
      isGerenciaLote: true // flag opcional para identificar q veio daqui
    });
    // Limpa estado
    setIsModalOpen(false);
    setSelectedOrders([]);
    setBatchName("");
  };

  const renderBadge = (severity?: string) => {
    switch (severity) {
      case "critical": return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">Crítico</span>;
      case "high": return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-orange-100 text-orange-700 border border-orange-200">Alto</span>;
      case "medium": return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-yellow-100 text-yellow-700 border border-yellow-200">Médio</span>;
      case "low": return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-100 text-green-700 border border-green-200">Baixo</span>;
      case "critica": return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">Crítica</span>;
      case "alta": return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-orange-100 text-orange-700 border border-orange-200">Alta</span>;
      case "media": return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-yellow-100 text-yellow-700 border border-yellow-200">Média</span>;
      case "baixa": return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-100 text-green-700 border border-green-200">Baixa</span>;
      default: return null;
    }
  };

  return (
    <ScreenLayout className="gap-4">
      {/* TOPO: AGENTE E SUGESTOES (Collapsible) */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden flex flex-col transition-all">
        {/* Header do Agente */}
        <div 
          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors gap-3"
          onClick={() => setIsAgentCardExpanded(!isAgentCardExpanded)}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="text-indigo-600" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-gray-800 break-words">Análise de IA & Sugestões de Lote</h2>
                {reportData && renderBadge(reportData.severity)}
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 break-words">
                {reportData?.updatedAt ? `Última análise: ${new Date(reportData.updatedAt).toLocaleString()}` : "Status: Aguardando execução"}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-start gap-4">
             {!isAgentCardExpanded && (
               <div className="flex items-center justify-center bg-gray-50 border px-3 py-1 rounded-lg">
                 <span className="text-lg font-black text-gray-800 leading-none mr-2">{pedidosSemLote.length}</span>
                 <span className="text-[10px] font-bold text-gray-500 uppercase">Pedidos na Fila</span>
               </div>
             )}
             <div className="text-gray-400 hover:text-gray-600 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 shrink-0 ml-auto">
               {isAgentCardExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
             </div>
          </div>
        </div>

        {/* Corpo Expandido */}
        {isAgentCardExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/50 flex flex-col p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Secao 1: Resumo e Status */}
            <div className="flex flex-col md:flex-row gap-4 items-center md:items-stretch mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex-1 flex flex-col justify-center">
                {reportData ? (
                  <p className="text-sm font-medium text-gray-600 leading-relaxed border-l-4 border-indigo-500 pl-3">{reportData.summary}</p>
                ) : (
                  <p className="text-sm font-medium text-gray-400">Nenhum relatório gerado. Clique em &quot;Atualizar Agora&quot; para rodar a IA.</p>
                )}
              </div>
              <div className="shrink-0 flex flex-col md:flex-col sm:flex-row gap-2 items-center w-full md:w-auto text-center">
                 <div className="flex flex-col items-center justify-center bg-gray-50 border px-6 py-3 rounded-lg min-w-[120px] w-full sm:w-auto md:w-full flex-1">
                   <span className="text-3xl font-black text-gray-800 leading-none">{pedidosSemLote.length}</span>
                   <span className="text-[10px] font-bold text-gray-500 uppercase mt-1 tracking-wider">Pedidos Fila</span>
                 </div>
                 <button 
                   onClick={(e) => { e.stopPropagation(); handleUpdateAnalysis(); }} disabled={loadingAgent}
                   className="text-xs font-bold text-white transition flex items-center gap-1 disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 px-4 py-3 sm:py-2 rounded-lg w-full sm:w-auto md:w-full justify-center shadow-sm flex-1"
                 >
                   {loadingAgent ? <Loader size={14} className="animate-spin" /> : <Play size={14} />} Atualizar Dados
                 </button>
              </div>
            </div>

            {/* Secao 2: Sugestoes de Agrupamento */}
            {reportData?.sugestoesAgrupamento?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                  <List size={14} /> Sugestões Estratégicas de Lotes
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
                  {reportData.sugestoesAgrupamento.map((sug: any, idx: number) => {
                     const hasRealIds = sug.pedidos.filter((id: number) => pedidosSemLote.some(o => o.id === id));
                     if (hasRealIds.length === 0) return null;
                     
                     return (
                      <div key={idx} className="bg-white border border-blue-200 p-4 rounded-xl shadow-sm min-w-[280px] max-w-[320px] flex shrink-0 flex-col gap-2 relative transition hover:border-blue-300">
                        <div className="absolute top-0 right-0 rounded-bl-lg rounded-tr-xl bg-blue-100 px-2 py-1 flex items-center">
                           <span className="text-[10px] font-black text-blue-800 tracking-wider">BOT SUGERIU</span>
                        </div>
                        <h4 className="font-bold text-blue-900 text-sm leading-tight pr-14 mt-1">{sug.nomeSugeridoLote}</h4>
                        <p className="text-[11px] font-medium text-gray-600 leading-snug flex-1">{sug.justificativa}</p>
                        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
                          <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">{hasRealIds.length} Pedidos</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openCreateBatchModal(hasRealIds, sug.nomeSugeridoLote); }}
                            className="bg-blue-600 text-white text-[10px] px-3 py-1 font-bold rounded hover:bg-blue-700 transition uppercase tracking-wide flex items-center gap-1 shadow-sm"
                          >
                            Criar Lote <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOOLBAR DA LISTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
           <Search size={18} className="text-gray-400 shrink-0" />
           <input 
             type="text" 
             placeholder="Busca por cliente ou Nº pedido..." 
             className="text-sm font-medium outline-none placeholder:text-gray-400 flex-1 w-full sm:w-[260px]"
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
           {selectedOrders.length > 0 && (
             <button 
               onClick={() => openCreateBatchModal(selectedOrders, "Novo Lote Manual")}
               className="bg-gray-800 text-white shadow font-bold text-xs uppercase px-4 py-2 rounded flex-1 sm:flex-none flex items-center justify-center gap-1 animate-in fade-in"
             >
               Criar Lote ({selectedOrders.length})
             </button>
           )}
        </div>
      </div>

      {/* LISTA PRIORIZADA */}
      <ScrollContainer paddingSize="none" className="bg-white border rounded-lg shadow-sm flex-1 overflow-auto min-h-0">
        <table className="w-full text-left border-collapse text-sm min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10">
            <tr>
              <th className="p-3 w-10 text-center">
                 <input 
                   type="checkbox"
                   checked={selectedOrders.length === pedidosSemLote.length && pedidosSemLote.length > 0}
                   onChange={(e) => {
                     if (e.target.checked) {
                       setSelectedOrders(pedidosSemLote.map(o => o.id));
                     } else {
                       setSelectedOrders([]);
                     }
                   }}
                 />
              </th>
              <th className="p-3 w-20">Urgência</th>
              <th className="p-3 w-20">Nº / Data</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Itens</th>
              <th className="p-3">Prazo</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pedidosSemLote.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">Nenhum pedido sem lote aguardando.</td>
              </tr>
            )}
            {pedidosSemLote.map(o => {
              const aiData = reportData?.pedidosPriorizados?.find((p: any) => p.pedidoId === o.id);
              
              const isCritico = aiData?.urgencia === "critica" || o.isUrgent;
              
              return (
                <tr key={o.id} className={`hover:bg-gray-50 transition-colors ${selectedOrders.includes(o.id) ? "bg-blue-50/50" : ""}`}>
                  <td className="p-3 text-center">
                    <input 
                      type="checkbox"
                      checked={selectedOrders.includes(o.id)}
                      onChange={() => toggleSelect(o.id)}
                    />
                  </td>
                  <td className="p-3">
                    {renderBadge(aiData?.urgencia) || (o.isUrgent && renderBadge("alta")) || <span className="text-[10px] text-gray-400">N/A</span>}
                    {aiData?.motivo && (
                      <div className="text-[9px] text-gray-500 mt-1 max-w-[120px] leading-tight truncate" title={aiData.motivo}>{aiData.motivo}</div>
                    )}
                  </td>
                  <td className="p-3 font-mono font-medium text-xs text-gray-600">
                    #{o.id}
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="p-3 font-semibold text-gray-800 text-sm">{o.customerName}</td>
                  <td className="p-3 text-xs text-gray-600">
                    {o.totalQuantity}x {db.items.find(i=>i.id===o.itemId)?.name || 'Item'}
                    <div className="text-[10px] text-gray-400">{o.color} | {o.size}</div>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs font-bold ${!o.deliveryDate ? "text-gray-400" : isCritico ? "text-red-500" : "text-gray-700"}`}>
                      {o.deliveryDate ? o.deliveryDate.split("-").reverse().join("/") : "-"}
                    </span>
                  </td>
                  <td className="p-3">
                    <button 
                      className="border border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-100 text-[10px] font-bold px-2 py-1 rounded transition uppercase"
                      onClick={() => openCreateBatchModal([o.id], `Lote #${o.id}`)}
                    >
                      Lote Indiv.
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollContainer>

      {/* MODAL DE CRIACAO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gray-100 border-b border-gray-200 p-4 flex justify-between items-center">
               <h3 className="font-black text-gray-800">Criar Novo Lote</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
               <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-1">Nome do Lote</label>
                  <input 
                    type="text" 
                    value={batchName} 
                    onChange={e => setBatchName(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
                  />
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-1">Setor Responsável</label>
                  <select 
                    value={batchSector}
                    onChange={e => setBatchSector(Number(e.target.value))}
                    className="w-full border border-gray-300 p-2 rounded text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    {db.sectors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.department})</option>)}
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-1">QTD. Pedidos</label>
                    <div className="text-sm font-black text-gray-800">{selectedOrders.length} Selecionados</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-1">Prazo (Opcional)</label>
                    <input 
                      type="date"
                      value={batchDeadline}
                      onChange={e => setBatchDeadline(e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded text-sm text-gray-800 outline-none"
                    />
                  </div>
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-1">Observações Gerais</label>
                  <textarea 
                    value={batchNotes}
                    onChange={e => setBatchNotes(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded text-sm text-gray-800 outline-none h-20"
                    placeholder="Instruções para o lote..."
                  ></textarea>
               </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end gap-3">
               <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 font-bold text-sm text-gray-600 hover:text-gray-800 transition">Cancelar</button>
               <button onClick={confirmCreateBatch} className="px-5 py-2 font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition">Criar e Associar</button>
            </div>
          </div>
        </div>
      )}
    </ScreenLayout>
  );
}
