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
    <div ref={ref} className="bg-white leading-normal font-sans text-slate-900 overflow-hidden box-border bg-white" style={{ position: "relative" }}>
      {pages.map((pageReports, pageIndex) => (
        <div 
          key={pageIndex} 
          className="print-page"
          style={{ width: "794px", height: "1122px", position: "relative", overflow: "hidden", backgroundColor: "white", padding: 0, margin: 0, boxSizing: "border-box" }}
        >
          {pageReports.map((report, reportIdx) => (
            <div key={reportIdx} style={{ height: "561px", padding: "24px", boxSizing: "border-box" }}>
              <div className="border-2 border-emerald-800 rounded-lg h-full flex flex-col relative p-4">
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-emerald-800 pb-3 mb-4 shrink-0">
                  <div className="flex items-center gap-4">
                    <img src={logoUrl} crossOrigin="anonymous" alt="Logo" className="w-[50px] h-[50px] object-contain rounded" />
                    <div>
                      <h2 className="text-sm font-black text-emerald-950 uppercase tracking-widest mb-0.5">{companyName}</h2>
                      <h1 className="text-xl font-bold uppercase text-emerald-900 tracking-tight">
                        Comprovante de Entrega de EPI
                      </h1>
                      <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                        Reforçamos a obrigação do uso de EPIs e Uniformes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex gap-6 mb-4 text-sm font-semibold text-slate-800 shrink-0">
                  <div className="flex-1 border p-2 bg-slate-50 uppercase">
                    <span className="text-xs text-slate-500 block mb-0.5">Colaborador</span>
                    {report.employeeName}
                  </div>
                  <div className="w-1/3 border p-2 bg-slate-50 uppercase">
                    <span className="text-xs text-slate-500 block mb-0.5">Período Referência</span>
                    {startStr} a {endStr}
                  </div>
                </div>

                {/* Table */}
                <div className="flex-1 min-h-0 overflow-hidden border border-slate-300">
                  <table className="w-full text-xs text-left text-slate-800">
                    <thead className="bg-slate-100 uppercase text-[10px] font-bold border-b border-slate-300">
                      <tr>
                        <th className="px-2 py-1.5 border-r border-slate-300">Tipo</th>
                        <th className="px-2 py-1.5 border-r border-slate-300">Cód.</th>
                        <th className="px-2 py-1.5 border-r border-slate-300">Descrição</th>
                        <th className="px-2 py-1.5 border-r border-slate-300">Nº C.A.</th>
                        <th className="px-2 py-1.5 border-r border-slate-300 text-center">Qtd</th>
                        <th className="px-2 py-1.5 text-center">Data/Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.records.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-slate-500">Nenhum registro encontrado neste período.</td>
                        </tr>
                      ) : (
                        report.records.map((r, i) => (
                          <tr key={i} className="border-b border-slate-200">
                            <td className="px-2 py-1 border-r border-slate-200">{r.type}</td>
                            <td className="px-2 py-1 border-r border-slate-200 font-mono text-[10px]">{r.itemCode}</td>
                            <td className="px-2 py-1 border-r border-slate-200 uppercase">
                              {r.itemName} {r.size ? `(Tam: ${r.size})` : ""}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 uppercase font-mono text-[10px]">{r.caNumber || "-"}</td>
                            <td className="px-2 py-1 border-r border-slate-200 text-center font-bold">{r.quantity}</td>
                            <td className="px-2 py-1 text-center font-mono text-[10px]">
                              {formatTimestamp(r.date)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Signature */}
                <div className="shrink-0 mt-6 pt-4 border-t-2 border-emerald-800 flex justify-between items-end">
                  <div className="text-[10px] text-slate-600 max-w-[50%]">
                    <p className="mb-1">Declaro ter recebido os Equipamentos de Proteção Individual / Uniformes listados acima para meu uso exclusivo de trabalho, bem como recebi o treinamento necessário de sua correta utilização.</p>
                  </div>
                  
                  <div className="w-[40%] flex flex-col items-center">
                    <div className="w-full border-t border-slate-500 mb-1"></div>
                    <span className="text-[10px] font-bold uppercase text-slate-800">Assinatura do Colaborador</span>
                    <span className="text-[10px] text-slate-500 mt-1">Data: ____/____/________</span>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100 rounded-bl-full opacity-50 pointer-events-none"></div>
              </div>
            </div>
          ))}

          {/* Dotted Cut Line (only if there are 2 reports on the page, or just always placed in the middle) */}
          <div className="absolute top-1/2 left-0 w-full border-t-[2px] border-dashed border-gray-400" style={{ transform: "translateY(-50%)" }}></div>
          <div className="absolute top-1/2 left-4 text-[10px] text-gray-400 bg-white px-2 -translate-y-1/2 flex items-center font-bold tracking-widest uppercase">
            ✂️ Cortar aqui
          </div>
        </div>
      ))}
    </div>
  );
});
