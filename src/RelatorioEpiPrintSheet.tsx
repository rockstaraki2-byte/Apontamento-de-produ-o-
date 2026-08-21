import React, { forwardRef } from "react";

export interface DistributionRecord {
  type: "EPI" | "UNIFORME";
  itemCode: string;
  itemName: string;
  size?: string;
  caNumber: string;
  quantity: number;
  date: number;
}

export interface EmployeeReportData {
  employeeName: string;
  records: DistributionRecord[];
}

interface RelatorioEpiPrintSheetProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reports: EmployeeReportData[];
  logoUrl?: string;
  companyName?: string;
}

export const RelatorioEpiPrintSheet = forwardRef<
  HTMLDivElement,
  RelatorioEpiPrintSheetProps
>(({ startDate, endDate, reports, logoUrl = "/icon.png", companyName = "Império Jomarci" }, ref) => {
  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    const [year, month, day] = isoString.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  // Group reports by pairs (2 per A4 sheet)
  const pages: EmployeeReportData[][] = [];
  for (let i = 0; i < reports.length; i += 2) {
    pages.push(reports.slice(i, i + 2));
  }

  return (
    <div 
      ref={ref} 
      id="relatorio-epi-print-container"
      className="bg-white leading-normal font-sans text-slate-900 overflow-hidden box-border bg-white" 
      style={{ position: "relative" }}
    >
      {pages.map((pageReports, pageIndex) => (
        <div 
          key={pageIndex} 
          className="print-page relatorio-epi-page"
          style={{ width: "794px", height: "1122px", position: "relative", overflow: "hidden", backgroundColor: "white", padding: 0, margin: 0, boxSizing: "border-box" }}
        >
          {pageReports.map((report, reportIdx) => (
            <div 
              key={reportIdx} 
              className="relatorio-epi-card"
              style={{ height: "561px", padding: "20px", boxSizing: "border-box" }}
            >
              <div className="border-2 border-emerald-800 rounded-lg h-full flex flex-col justify-between relative p-3.5 bg-white box-border">
                {/* Top Section: Header, Info, Table */}
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Header */}
                  <div className="flex justify-between items-center border-b-2 border-emerald-800 pb-2.5 mb-2.5 shrink-0">
                    <div className="flex items-center gap-3">
                      <img src={logoUrl} crossOrigin="anonymous" alt="Logo" className="w-[44px] h-[44px] object-contain rounded" />
                      <div>
                        <h2 className="text-xs font-black text-emerald-950 uppercase tracking-wider mb-0.5">{companyName}</h2>
                        <h1 className="text-lg font-bold uppercase text-emerald-900 tracking-tight leading-none">
                          Comprovante de Entrega de EPI e Uniforme
                        </h1>
                        <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                          Declaração e Recibo de Recebimento Individual
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex gap-3 mb-2.5 text-xs font-semibold text-slate-800 shrink-0">
                    <div className="flex-1 border border-slate-300 p-1.5 bg-slate-50 uppercase rounded">
                      <span className="text-[9px] text-slate-500 block mb-0.5 font-bold">Colaborador</span>
                      <span className="text-xs font-bold text-slate-900">{report.employeeName}</span>
                    </div>
                    <div className="w-1/3 border border-slate-300 p-1.5 bg-slate-50 uppercase rounded">
                      <span className="text-[9px] text-slate-500 block mb-0.5 font-bold">Período de Referência</span>
                      <span className="text-xs font-bold text-slate-900">{startStr} a {endStr}</span>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="flex-1 min-h-0 overflow-hidden border border-slate-300 rounded">
                    <table className="w-full text-xs text-left text-slate-800">
                      <thead className="bg-slate-100 uppercase text-[10px] font-bold border-b border-slate-300">
                        <tr>
                          <th className="px-2 py-1 border-r border-slate-300">Tipo</th>
                          <th className="px-2 py-1 border-r border-slate-300">Cód.</th>
                          <th className="px-2 py-1 border-r border-slate-300">Descrição do Item</th>
                          <th className="px-2 py-1 border-r border-slate-300">Nº C.A.</th>
                          <th className="px-2 py-1 border-r border-slate-300 text-center">Qtd</th>
                          <th className="px-2 py-1 text-center">Data / Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.records.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-slate-500 text-xs">Nenhum registro encontrado neste período.</td>
                          </tr>
                        ) : (
                          report.records.map((r, i) => (
                            <tr key={i} className="border-b border-slate-200 last:border-b-0">
                              <td className="px-2 py-0.5 border-r border-slate-200 font-semibold text-[11px]">{r.type}</td>
                              <td className="px-2 py-0.5 border-r border-slate-200 font-mono text-[10px]">{r.itemCode}</td>
                              <td className="px-2 py-0.5 border-r border-slate-200 uppercase font-medium text-[11px]">
                                {r.itemName} {r.size ? `(Tam: ${r.size})` : ""}
                              </td>
                              <td className="px-2 py-0.5 border-r border-slate-200 uppercase font-mono text-[10px]">{r.caNumber || "-"}</td>
                              <td className="px-2 py-0.5 border-r border-slate-200 text-center font-bold text-[11px]">{r.quantity}</td>
                              <td className="px-2 py-0.5 text-center font-mono text-[10px]">
                                {formatTimestamp(r.date)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Signature */}
                <div className="shrink-0 mt-2.5 pt-2.5 border-t-2 border-emerald-800 flex justify-between items-end">
                  <div className="text-[9px] text-slate-600 max-w-[55%] leading-tight">
                    <p>Declaro ter recebido os Equipamentos de Proteção Individual / Uniformes listados acima em perfeitas condições para meu uso exclusivo no desempenho de minhas funções, comprometendo-me a utilizá-los conforme as orientações de segurança recebidas.</p>
                  </div>
                  
                  <div className="w-[38%] flex flex-col items-center">
                    <div className="w-full border-t border-slate-600 mb-1"></div>
                    <span className="text-[9.5px] font-bold uppercase text-slate-800 text-center">Assinatura do Colaborador</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">Data: ____/____/________</span>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-14 h-14 bg-emerald-100 rounded-bl-full opacity-40 pointer-events-none"></div>
              </div>
            </div>
          ))}

          {/* Dotted Cut Line (only if there are 2 reports on the page, or just always placed in the middle) */}
          <div className="absolute top-1/2 left-0 w-full border-t-[2px] border-dashed border-gray-400" style={{ transform: "translateY(-50%)" }}></div>
          <div className="absolute top-1/2 left-4 text-[9px] text-gray-500 bg-white px-2 -translate-y-1/2 flex items-center font-bold tracking-widest uppercase">
            ✂️ Cortar aqui (Meia Folha A4)
          </div>
        </div>
      ))}
    </div>
  );
});
