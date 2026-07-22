import React, { useState, useMemo } from "react";
import { useDatabase } from "../useDatabase";
import { Mail, Clock, Download, Settings, Save, Search, Settings2 } from "lucide-react";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";

export function ProducaoDiariaTab({ db }: { db: ReturnType<typeof useDatabase> }) {
  // Configuration State
  const [configOpen, setConfigOpen] = useState(false);
  const [reportTime, setReportTime] = useState("18:00");
  const [reportEmails, setReportEmails] = useState("relatorios@imperio.com");
  const [isSaved, setIsSaved] = useState(false);

  // Filters State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedEndDate, setSelectedEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [filterShift, setFilterShift] = useState<string>("TODOS");
  const [filterSector, setFilterSector] = useState<string>("TODOS");
  const [filterLote, setFilterLote] = useState<string>("");
  const [filterProduct, setFilterProduct] = useState<string>("");

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Load configuration from local storage or DB (mocking with local storage for now)
  React.useEffect(() => {
    const savedTime = localStorage.getItem("producaoDiaria_time");
    const savedEmails = localStorage.getItem("producaoDiaria_emails");
    if (savedTime) setReportTime(savedTime);
    if (savedEmails) setReportEmails(savedEmails);
  }, []);

  const availableSectors = useMemo(() => {
    const sectors = new Set<string>();
    db.logs.forEach(log => {
      let sector = log.type || "GERAL";
      if (log.operatorId) {
        const parts = log.operatorId.split(" - ");
        sector = parts[0].toUpperCase();
      }
      sectors.add(sector);
    });
    return Array.from(sectors).sort();
  }, [db.logs]);

  const handleSaveConfig = () => {
    localStorage.setItem("producaoDiaria_time", reportTime);
    localStorage.setItem("producaoDiaria_emails", reportEmails);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const getShift = (timestamp: number) => {
    const d = new Date(timestamp);
    const hours = d.getHours();
    if (hours >= 6 && hours < 13) return "Manhã";
    if (hours >= 13 && hours < 19) return "Tarde";
    return "Noturno / Extra";
  };

  // Generate Report Data
  const reportData = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedEndDate || selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = db.logs.filter(
      (l) => l.timestamp >= startOfDay.getTime() && l.timestamp <= endOfDay.getTime()
    );

    // Group logs by sector and shift
    const grouped: any[] = [];

    logs.forEach((log) => {
      let sector = log.type || "GERAL";
      if (log.operatorId) {
        const parts = log.operatorId.split(" - ");
        sector = parts[0].toUpperCase();
      }

      if (filterSector !== "TODOS" && sector !== filterSector) return;

      const shift = getShift(log.timestamp);
      if (filterShift !== "TODOS" && shift !== filterShift) return;

      let itemId = log.itemId;
      
      // Attempt to resolve item
      let itemName = "Desconhecido";
      if (itemId) {
        const item = db.items.find(i => i.id === itemId);
        if (item) itemName = item.name;
      } else if (log.orderId) {
        const order = db.orders.find(o => o.id === log.orderId);
        if (order) {
          const item = db.items.find(i => i.id === order.itemId);
          if (item) itemName = item.name;
        }
      }

      if (filterProduct && !itemName.toLowerCase().includes(filterProduct.toLowerCase())) return;

      const qty = log.quantityProcessed || log.quantityCut || log.quantityPainted || log.quantityPacked || log.quantityInvoiced || 0;
      const hours = (log.durationMillis || 10 * 60 * 1000) / (1000 * 60 * 60);
      const pph = qty / hours;
      
      // Batch reference
      let loteRef = "-";
      if (log.orderId) {
        const batch = db.productionBatches.find(b => b.orderIds.includes(log.orderId!));
        if (batch) loteRef = batch.name || `Lote #${batch.id}`;
      }

      if (filterLote && !loteRef.toLowerCase().includes(filterLote.toLowerCase())) return;

      grouped.push({
        id: log.id,
        sector,
        shift,
        itemName,
        loteRef,
        hours,
        qty,
        pph,
        timestamp: log.timestamp
      });
    });

    return grouped.sort((a, b) => b.timestamp - a.timestamp);
  }, [db.logs, db.items, db.orders, db.productionBatches, selectedDate, selectedEndDate, filterSector, filterShift, filterProduct, filterLote]);

  const handleExportPDF = () => {
    const doc = new jsPDF("landscape");
    
    doc.setFontSize(16);
    const dateText = selectedDate === selectedEndDate 
      ? new Date(selectedDate).toLocaleDateString('pt-BR')
      : `${new Date(selectedDate).toLocaleDateString('pt-BR')} até ${new Date(selectedEndDate).toLocaleDateString('pt-BR')}`;
    
    doc.text(`Relatório Diário de Produção - ${dateText}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
    
    const tableColumn = ["Data", "Turno", "Setor", "Item", "Lote", "Tempo (h)", "Qtd", "Produtividade (Pç/h)"];
    const tableRows = reportData.map(row => [
      new Date(row.timestamp).toLocaleDateString('pt-BR'),
      row.shift,
      row.sector,
      row.itemName,
      row.loteRef,
      row.hours.toFixed(2),
      row.qty.toString(),
      row.pph.toFixed(1)
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    
    doc.save(`relatorio_producao_${selectedDate}_a_${selectedEndDate}.pdf`);
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const res = await fetch("/api/send-daily-production-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedDate,
          selectedEndDate,
          reportData,
          reportEmails,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(
          data.mode === "simulated"
            ? "O e-mail foi logado no terminal (modo desenvolvimento)."
            : `E-mail enviado com sucesso para ${reportEmails}`
        );
      } else {
        alert("Erro ao enviar e-mail: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao enviar e-mail.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-indigo-950 flex items-center gap-2">
            <Clock className="text-indigo-600" size={24} />
            Relatório de Produção Diário (Envio Automático)
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Acompanhe tudo que foi produzido no dia por cada setor. Configure o envio automático do relatório por e-mail.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setConfigOpen(!configOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-50 transition"
          >
            <Settings2 size={16} /> Configurar Automação
          </button>
        </div>
      </div>

      {configOpen && (
        <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Settings size={16} className="text-indigo-600" /> 
            Configurações de Envio Automático
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Horário de Coleta e Envio Diário</label>
              <input 
                type="time" 
                value={reportTime}
                onChange={(e) => setReportTime(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-indigo-500 focus:border-indigo-500" 
              />
              <p className="text-[10px] text-slate-400 mt-1">O sistema irá coletar os dados do dia e enviar o relatório todos os dias neste horário.</p>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">E-mails Destinatários (separados por vírgula)</label>
              <input 
                type="text" 
                value={reportEmails}
                onChange={(e) => setReportEmails(e.target.value)}
                placeholder="exemplo@email.com, gerente@email.com"
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-slate-100">
            <button 
              onClick={handleSaveConfig}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition"
            >
              <Save size={16} /> {isSaved ? "Salvo!" : "Salvar Configurações"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data Início</label>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-slate-200 p-1.5 rounded-md text-sm font-semibold text-slate-700 bg-white" 
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data Fim</label>
                <input 
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                  className="border border-slate-200 p-1.5 rounded-md text-sm font-semibold text-slate-700 bg-white" 
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Turno</label>
                <select 
                  value={filterShift}
                  onChange={(e) => setFilterShift(e.target.value)}
                  className="border border-slate-200 p-1.5 rounded-md text-sm font-semibold text-slate-700 bg-white"
                >
                  <option value="TODOS">Todos os Turnos</option>
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noturno / Extra">Noturno / Extra</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Setor</label>
                <select 
                  value={filterSector}
                  onChange={(e) => setFilterSector(e.target.value)}
                  className="border border-slate-200 p-1.5 rounded-md text-sm font-semibold text-slate-700 bg-white max-w-[150px] truncate"
                >
                  <option value="TODOS">Todos os Setores</option>
                  {availableSectors.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Produto</label>
                <input 
                  type="text"
                  placeholder="Buscar produto..."
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="border border-slate-200 p-1.5 rounded-md text-sm font-semibold text-slate-700 bg-white w-32" 
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lote</label>
                <input 
                  type="text"
                  placeholder="Buscar lote..."
                  value={filterLote}
                  onChange={(e) => setFilterLote(e.target.value)}
                  className="border border-slate-200 p-1.5 rounded-md text-sm font-semibold text-slate-700 bg-white w-24" 
                />
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <button 
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-xs rounded-lg transition disabled:opacity-50"
              >
                <Mail size={14} className={isSendingEmail ? "animate-pulse" : ""} /> 
                {isSendingEmail ? "Enviando..." : "Enviar p/ E-mail Agora"}
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition"
              >
                <Download size={14} /> Baixar PDF
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {reportData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
              <Search size={32} className="mb-3 opacity-20" />
              <p className="font-medium text-sm">Nenhuma produção registrada nesta data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-100/80 text-[10px] uppercase tracking-widest text-slate-500 font-extrabold border-b border-slate-200">
                    <th className="p-3 w-24">Data</th>
                    <th className="p-3 w-24">Turno</th>
                    <th className="p-3 w-40">Setor</th>
                    <th className="p-3">Item Produzido</th>
                    <th className="p-3 w-32">Lote / OP</th>
                    <th className="p-3 w-24 text-right">Tempo (h)</th>
                    <th className="p-3 w-24 text-right">Qtd Exec.</th>
                    <th className="p-3 w-28 text-right bg-indigo-50/30 text-indigo-700">Produtividade</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100 bg-white">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-semibold text-slate-600">
                        {new Date(row.timestamp).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3 font-semibold text-slate-600">
                        {row.shift === "Manhã" ? "🌅 " : (row.shift === "Tarde" ? "☀️ " : "🌙 ")}
                        {row.shift}
                      </td>
                      <td className="p-3 uppercase text-[11px] font-bold tracking-wide">{row.sector}</td>
                      <td className="p-3 font-bold text-slate-800">{row.itemName}</td>
                      <td className="p-3 text-[11px] text-slate-500 font-mono bg-slate-50/50 border-x border-slate-100">{row.loteRef}</td>
                      <td className="p-3 text-right tabular-nums">{row.hours.toFixed(2)}h</td>
                      <td className="p-3 text-right font-bold text-slate-900 tabular-nums">{row.qty} un</td>
                      <td className="p-3 text-right font-black tabular-nums bg-indigo-50/30 text-indigo-700">{row.pph.toFixed(1)} <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Pç/h</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
