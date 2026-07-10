import React, { useState, useMemo } from "react";
import { Users, Calendar as CalendarIcon, FileDown, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import type { useDatabase } from "../../useDatabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function ControlePontoTab({ db }: { db: ReturnType<typeof useDatabase> }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  
  const [reportDateStart, setReportDateStart] = useState("");
  const [reportDateEnd, setReportDateEnd] = useState("");

  const activeEmployees = useMemo(() => db.employees.filter(e => e.isActive), [db.employees]);

  // Handle toggling attendance
  const toggleAttendance = async (empId: string, period: "morning" | "afternoon", currentStatus: "PRESENTE" | "FALTA" | null) => {
    const recordId = `${empId}_${selectedDate}`;
    let existing = db.attendances.find(a => a.id === recordId);
    
    // Cycle logic: PRESENTE -> FALTA -> null
    let nextStatus: "PRESENTE" | "FALTA" | null = null;
    if (currentStatus === null) nextStatus = "PRESENTE";
    else if (currentStatus === "PRESENTE") nextStatus = "FALTA";
    else if (currentStatus === "FALTA") nextStatus = null;

    if (existing) {
      db.saveAttendance({
        ...existing,
        [period]: nextStatus
      });
    } else {
      db.saveAttendance({
        id: recordId,
        employeeId: empId,
        date: selectedDate,
        morning: period === "morning" ? nextStatus : null,
        afternoon: period === "afternoon" ? nextStatus : null,
      });
    }
  };

  const getAttendanceFor = (empId: string) => {
    return db.attendances.find(a => a.id === `${empId}_${selectedDate}`);
  };

  const currentSectorId = (emp: any) => emp.sectorId; // Future categorization if needed

  const generatePDFReport = () => {
    if (!reportDateStart || !reportDateEnd) {
      alert("Por favor, selecione as datas inicial e final do relatório.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Faltas de Colaboradores", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(reportDateStart).toLocaleDateString()} a ${new Date(reportDateEnd).toLocaleDateString()}`, 14, 22);

    const attendancesInRange = db.attendances.filter(a => a.date >= reportDateStart && a.date <= reportDateEnd);
    
    const compilation = activeEmployees.map(emp => {
      const records = attendancesInRange.filter(a => a.employeeId === emp.id);
      let missingMornings = 0;
      let missingAfternoons = 0;

      records.forEach(r => {
        if (r.morning === "FALTA") missingMornings++;
        if (r.afternoon === "FALTA") missingAfternoons++;
      });
      
      const totalFaltasObj = (missingMornings * 0.5) + (missingAfternoons * 0.5);

      return {
        name: emp.name,
        sector: db.sectors.find(s => s.id === emp.sectorId)?.name || "N/A",
        mornings: missingMornings,
        afternoons: missingAfternoons,
        total: totalFaltasObj
      };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total); // Only show people with absences

    const tableCols = ["Colaborador", "Setor", "Faltas (Manhãs)", "Faltas (Tardes)", "Total Equivalente (Dias)"];
    const tableRows = compilation.map(c => [c.name, c.sector, c.mornings.toString(), c.afternoons.toString(), c.total.toString()]);

    autoTable(doc, {
      startY: 28,
      head: [tableCols],
      body: tableRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    if (compilation.length === 0) {
      doc.text("Nenhuma falta registrada no período.", 14, 40);
    }

    doc.save(`Relatorio_Faltas_${reportDateStart}_ate_${reportDateEnd}.pdf`);
  };

  const getStatusIcon = (status: "PRESENTE" | "FALTA" | null) => {
    if (status === "PRESENTE") return <CheckCircle2 size={18} className="text-emerald-500" />;
    if (status === "FALTA") return <XCircle size={18} className="text-rose-500" />;
    return <MinusCircle size={18} className="text-slate-300" />;
  };

  return (
    <div className="flex flex-col gap-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" /> Dial de Ponto
            </h3>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
              className="border border-slate-200 rounded-lg p-2 font-bold text-slate-700 outline-indigo-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] border border-slate-100 rounded-lg divide-y divide-slate-100">
            {activeEmployees.length === 0 ? (
              <p className="text-sm text-slate-500 text-center p-4">Nenhum colaborador ativo cadastrado.</p>
            ) : (
                activeEmployees.map(emp => {
                  const att = getAttendanceFor(emp.id);
                  const mStatus = att?.morning || null;
                  const aStatus = att?.afternoon || null;
                  
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{emp.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">Setor: {db.sectors.find(s => s.id === emp.sectorId)?.name || "-"}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Morning */}
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Manhã</span>
                          <button 
                            onClick={() => toggleAttendance(emp.id, "morning", mStatus)}
                            className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors shadow-2xs bg-white"
                            title="Alternar presença da manhã"
                          >
                            {getStatusIcon(mStatus)}
                          </button>
                        </div>
                        {/* Afternoon */}
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Tarde</span>
                          <button 
                            onClick={() => toggleAttendance(emp.id, "afternoon", aStatus)}
                            className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors shadow-2xs bg-white"
                            title="Alternar presença da tarde"
                          >
                            {getStatusIcon(aStatus)}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
          <p className="text-xs text-slate-500 text-center bg-slate-50 p-2 rounded">
            Clique nos ícones para alternar entre: <span className="text-emerald-500 font-bold">Presente</span>, <span className="text-rose-500 font-bold">Falta</span> ou Vazio.
          </p>
        </div>

        {/* Reports Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="border-b pb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileDown className="w-5 h-5 text-indigo-600" /> Relatório de Faltas
            </h3>
            <p className="text-xs text-slate-500 mt-1">Gere um PDF compilado de faltas por período.</p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Data Inicial</label>
              <input 
                type="date" 
                value={reportDateStart} 
                onChange={e => setReportDateStart(e.target.value)} 
                className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Data Final</label>
              <input 
                type="date" 
                value={reportDateEnd} 
                onChange={e => setReportDateEnd(e.target.value)} 
                className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-indigo-500"
              />
            </div>
            <button 
              onClick={generatePDFReport}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-extrabold shadow-sm transition"
            >
              <FileDown size={18} /> Gerar PDF de Faltas
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-auto">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Informação Importante</h4>
            <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
              <li>Cada turno (manhã ou tarde) de falta equivale a 0,5 falta.</li>
              <li>Apenas colaboradores que registraram faltas no período aparecerão no relatório.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
