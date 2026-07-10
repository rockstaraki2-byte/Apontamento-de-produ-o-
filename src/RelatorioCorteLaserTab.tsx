import React, { useState, useMemo } from "react";
import { useDatabase } from "./useDatabase";
import { Download, FileText, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function RelatorioCorteLaserTab({
  db,
}: {
  db: ReturnType<typeof useDatabase>;
}) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchNest, setSearchNest] = useState<string>("");
  const [searchPart, setSearchPart] = useState<string>("");

  const filteredLogs = useMemo(() => {
    let logs = db.logs.filter((l) => l.type === "CORTE_LASER");

    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`).getTime();
      logs = logs.filter((l) => l.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59`).getTime();
      logs = logs.filter((l) => l.timestamp <= end);
    }

    let reportData = logs.map((log) => {
      let nestName = "Nesting Avulso/Desconhecido";
      let partName = log.nestedPartName || log.customProductName || "Peça Desconhecida";
      let totalQty = 0;
      let size = "-";

      if (log.orderId) {
        const task = db.nestTasks?.find((t) => t.id === log.orderId);
        if (task) {
          nestName = task.nestName;
          partName = task.partName;
          totalQty = task.totalQuantity || 0;
          size = task.size || "-";
        }
      } else {
        const taskByPartName = db.nestTasks?.find(
          (t) => t.partName.toLowerCase() === partName.toLowerCase()
        );
        if (taskByPartName) {
          size = taskByPartName.size || "-";
        } else {
          const matchedItem = db.items?.find(
            (i) =>
              i.name.toLowerCase() === partName.toLowerCase() ||
              (i.code && i.code.toLowerCase() === partName.toLowerCase())
          );
          if (matchedItem) {
            size = matchedItem.size || "-";
          }
        }
      }

      return {
        id: log.id,
        timestamp: log.timestamp,
        dateStr: new Date(log.timestamp).toLocaleDateString("pt-BR") + " " + new Date(log.timestamp).toLocaleTimeString("pt-BR").substring(0, 5),
        nestName,
        partName,
        quantityCut: log.quantityCut || 0,
        totalQty,
        size,
      };
    });

    if (searchNest) {
      const lowerSearch = searchNest.toLowerCase();
      reportData = reportData.filter((d) =>
        d.nestName.toLowerCase().includes(lowerSearch)
      );
    }

    if (searchPart) {
      const lowerSearch = searchPart.toLowerCase();
      reportData = reportData.filter((d) =>
        d.partName.toLowerCase().includes(lowerSearch)
      );
    }

    return reportData.sort((a, b) => b.timestamp - a.timestamp);
  }, [db.logs, db.nestTasks, db.items, db.users, startDate, endDate, searchNest, searchPart]);

  const totalPecas = filteredLogs.reduce((acc, curr) => acc + curr.quantityCut, 0);

  const exportCSV = () => {
    let csv = "Data/Hora,Nesting,Peça,Medida,Qtd Cortada,Total Nesting\n";
    filteredLogs.forEach((row) => {
      csv += `${row.dateStr},"${row.nestName}","${row.partName}","${row.size}",${row.quantityCut},${row.totalQty || "-"}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_corte_laser_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text("Relatório de Peças Cortadas - Corte a Laser", 14, 15);
    doc.setFontSize(10);
    doc.text(`Total de Peças Cortadas no Filtro: ${totalPecas}`, 14, 22);

    const tableData = filteredLogs.map((r) => [
      r.dateStr,
      r.nestName,
      r.partName,
      r.size,
      r.quantityCut.toString(),
      r.totalQty > 0 ? r.totalQty.toString() : "-",
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["Data/Hora", "Nesting", "Peça", "Medida", "Qtd Cortada", "Total Nesting"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`relatorio_corte_laser_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
        <h3 className="font-bold text-gray-800 text-lg border-b pb-2">
          Filtros do Relatório
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">
              Data Início
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">
              Data Fim
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">
              Filtrar por Nesting
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Nome do Nesting..."
                value={searchNest}
                onChange={(e) => setSearchNest(e.target.value)}
                className="w-full text-sm p-2 pl-9 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">
              Filtrar por Peça
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Nome da Peça..."
                value={searchPart}
                onChange={(e) => setSearchPart(e.target.value)}
                className="w-full text-sm p-2 pl-9 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 justify-end mt-2 pt-4 border-t">
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded shadow-sm hover:bg-red-700 transition cursor-pointer font-semibold text-xs"
          >
            <FileText size={16} /> Exportar PDF
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow-sm hover:bg-green-700 transition cursor-pointer font-semibold text-xs"
          >
            <Download size={16} /> Exportar Sheets (CSV)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-700">
            Resultados ({filteredLogs.length} registros)
          </h3>
          <span className="font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full text-sm">
            Total Cortado: {totalPecas} un
          </span>
        </div>
        
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 shadow-sm z-10">
              <tr>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Data / Hora
                </th>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Nesting
                </th>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Peça
                </th>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase border-b">
                  Medida
                </th>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase border-b text-right">
                  Qtd Cortada
                </th>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase border-b text-right">
                  Total Nesting
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                      {log.dateStr}
                    </td>
                    <td className="p-3 text-sm font-semibold text-gray-800">
                      {log.nestName}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {log.partName}
                    </td>
                    <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                      {log.size}
                    </td>
                    <td className="p-3 text-sm font-bold text-green-600 text-right">
                      {log.quantityCut}
                    </td>
                    <td className="p-3 text-sm text-gray-500 text-right">
                      {log.totalQty > 0 ? log.totalQty : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-gray-400 font-medium text-sm"
                  >
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
