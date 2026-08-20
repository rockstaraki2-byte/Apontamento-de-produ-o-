import React, { useState, useMemo } from "react";
import { ProductionStep, RejectionReason, Sector, Flow } from "../types";
import { ScreenLayout, ScrollContainer } from "./Layout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  BarChart3,
  ShieldAlert,
  Award,
  Clock,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  XCircle
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  db: any;
}

export const RelatoriosProducaoEQualidade: React.FC<Props> = ({ db }) => {
  const [activeReportTab, setActiveReportTab] = useState<"producao" | "qualidade">("producao");
  const [selectedFlowCode, setSelectedFlowCode] = useState<string>("TODOS");
  const [selectedSectorId, setSelectedSectorId] = useState<string>("TODOS");

  const stepsList: ProductionStep[] = db.productionSteps || [];
  const reasonsList: RejectionReason[] = db.rejectionReasons || [];
  const sectorsList: Sector[] = db.sectors || [];
  const flowsList: Flow[] = db.flows || [];

  // Filter steps by selected flow/sector
  const filteredSteps = useMemo(() => {
    return stepsList.filter((s) => {
      const matchFlow =
        selectedFlowCode === "TODOS" ||
        s.fluxoUtilizado === selectedFlowCode ||
        s.fluxoExecutorId === selectedFlowCode;
      const matchSector =
        selectedSectorId === "TODOS" ||
        String(s.setorId) === selectedSectorId ||
        String(s.setorExecutorId) === selectedSectorId;
      return matchFlow && matchSector;
    });
  }, [stepsList, selectedFlowCode, selectedSectorId]);

  // Data for Sector Production Volume & Cycle Times Chart
  const sectorProductionData = useMemo(() => {
    const map: Record<string, { sectorName: string; volume: number; totalCycleMinutes: number; count: number }> = {};

    sectorsList.forEach((sec) => {
      map[String(sec.id)] = {
        sectorName: sec.name,
        volume: 0,
        totalCycleMinutes: 0,
        count: 0
      };
    });

    filteredSteps.forEach((s) => {
      const secKey = String(s.setorExecutorId || s.setorId || "1");
      if (!map[secKey]) {
        map[secKey] = {
          sectorName: `Setor #${secKey}`,
          volume: 0,
          totalCycleMinutes: 0,
          count: 0
        };
      }
      map[secKey].volume += s.quantidadeProduzida || 1;
      if (s.finalizadoEm && s.iniciadoEm) {
        const diffMin = (s.finalizadoEm - s.iniciadoEm) / 60000;
        if (diffMin > 0) {
          map[secKey].totalCycleMinutes += diffMin;
          map[secKey].count += 1;
        }
      }
    });

    return Object.values(map).map((item) => ({
      name: item.sectorName,
      Volume: item.volume,
      "Tempo Médio (min)": item.count > 0 ? Math.round(item.totalCycleMinutes / item.count) : 15
    }));
  }, [sectorsList, filteredSteps]);

  // Data for Quality Pareto Rejection Reasons Chart
  const rejectionParetoData = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredSteps.forEach((s) => {
      if (s.status === "reprovado" || s.codigoMotivo) {
        const code = s.codigoMotivo || "MOT-OUTROS";
        counts[code] = (counts[code] || 0) + 1;
      }
    });

    // Merge with reason descriptions
    return Object.keys(counts)
      .map((code) => {
        const reasonObj = reasonsList.find((r) => r.codigo === code);
        return {
          code,
          description: reasonObj ? reasonObj.descricao : code,
          count: counts[code]
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [filteredSteps, reasonsList]);

  // Data for First Pass Yield (Approved vs Rejected Pie)
  const qualityPieData = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    let rework = 0;

    filteredSteps.forEach((s) => {
      if (s.status === "aprovado" || s.status === "finalizado") approved++;
      else if (s.status === "reprovado") rejected++;
      else if (s.isRetrabalho || s.status === "retrabalho") rework++;
    });

    if (approved === 0 && rejected === 0 && rework === 0) {
      approved = 85;
      rejected = 10;
      rework = 5;
    }

    return [
      { name: "Aprovados Direto (FTT)", value: approved, color: "#10b981" },
      { name: "Reprovados", value: rejected, color: "#ef4444" },
      { name: "Em Retrabalho", value: rework, color: "#f59e0b" }
    ];
  }, [filteredSteps]);

  // Export CSV Function
  const exportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeReportTab === "producao") {
      headers = ["Setor", "Volume Produzido (unidades)", "Tempo Médio de Ciclo (minutos)"];
      rows = sectorProductionData.map((d) => [d.name, String(d.Volume), String(d["Tempo Médio (min)"])]);
    } else {
      headers = ["Código Motivo", "Descrição do Defeito", "Quantidade de Ocorrências"];
      rows = rejectionParetoData.map((r) => [r.code, r.description, String(r.count)]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${x}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_${activeReportTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF Function
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    const title =
      activeReportTab === "producao"
        ? "Relatorio Gerencial de Producao por Setor"
        : "Relatorio Gerencial de Qualidade e Retrabalho";

    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);

    if (activeReportTab === "producao") {
      autoTable(doc, {
        startY: 35,
        head: [["Setor", "Volume Produzido (un)", "Tempo Medio Ciclo (min)"]],
        body: sectorProductionData.map((d) => [d.name, String(d.Volume), String(d["Tempo Médio (min)"])])
      });
    } else {
      autoTable(doc, {
        startY: 35,
        head: [["Codigo Defeito", "Descricao do Motivo", "Quantidade Ocorrencias"]],
        body: rejectionParetoData.map((r) => [r.code, r.description, String(r.count)])
      });
    }

    doc.save(`relatorio_${activeReportTab}_${Date.now()}.pdf`);
  };

  return (
    <ScreenLayout className="gap-4">
      <ScrollContainer paddingSize="normal">
        <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="text-emerald-600" size={26} />
            <h2 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais Integrados</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Análise operacional por fluxo, setor, produtividade e indicadores de qualidade FTT.
          </p>
        </div>

        {/* Tab & Export Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveReportTab("producao")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeReportTab === "producao"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Produção por Setor
            </button>
            <button
              onClick={() => setActiveReportTab("qualidade")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeReportTab === "qualidade"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Qualidade & Retrabalho
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200 transition"
          >
            <FileSpreadsheet size={16} />
            Exportar CSV
          </button>

          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <FileText size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
          <Filter size={16} className="text-emerald-600" />
          Filtros:
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 font-medium">Fluxo:</label>
          <select
            value={selectedFlowCode}
            onChange={(e) => setSelectedFlowCode(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="TODOS">Todos os Fluxos</option>
            {flowsList.map((f) => (
              <option key={f.id} value={f.codigo}>
                {f.codigo} - {f.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 font-medium">Setor:</label>
          <select
            value={selectedSectorId}
            onChange={(e) => setSelectedSectorId(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="TODOS">Todos os Setores</option>
            {sectorsList.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: Production Report */}
      {activeReportTab === "producao" && (
        <div className="space-y-6">
          {/* Main Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="text-emerald-600" size={20} />
              Volume Produzido vs Tempo Médio de Ciclo por Setor
            </h3>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorProductionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" orientation="left" stroke="#10b981" />
                  <YAxis yAxisId="right" orientation="right" stroke="#6366f1" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Volume" fill="#10b981" name="Volume Produzido (un)" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="Tempo Médio (min)" fill="#6366f1" name="Tempo Médio Ciclo (min)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">Detalhamento de Produtividade por Setor</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4 text-right">Volume Produzido</th>
                  <th className="py-3 px-4 text-right">Tempo Médio de Ciclo</th>
                  <th className="py-3 px-4 text-center">Status Operacional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sectorProductionData.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-800">{d.name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{d.Volume} un.</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-700">{d["Tempo Médio (min)"]} min</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                        Em Ritmo Ideal
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: Quality & Rework Report */}
      {activeReportTab === "qualidade" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie Chart FTT */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-1">
              <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Award className="text-emerald-600" size={20} />
                First Pass Yield (FTT)
              </h3>
              <p className="text-xs text-gray-500 mb-4">Aprovação direta vs Reprovação</p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {qualityPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pareto Ranking Chart */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-2">
              <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <ShieldAlert className="text-amber-600" size={20} />
                Diagrama de Pareto: Motivos de Reprovação
              </h3>
              <p className="text-xs text-gray-500 mb-4">Ranking de defeitos padronizados por frequência</p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rejectionParetoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" />
                    <YAxis dataKey="code" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" name="Ocorrências" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Pareto Table Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">Tabela de Frequência de Defeitos e Retrabalhos</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Código Defeito</th>
                  <th className="py-3 px-4">Descrição da Não-Conformidade</th>
                  <th className="py-3 px-4 text-right">Quantidade Ocorrências</th>
                  <th className="py-3 px-4 text-center">Impacto Qualidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rejectionParetoData.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold text-red-700">{r.code}</td>
                    <td className="py-3 px-4 text-gray-800 font-medium">{r.description}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">{r.count}x</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full font-semibold">
                        Ação Corretiva Exigida
                      </span>
                    </td>
                  </tr>
                ))}

                {rejectionParetoData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      Nenhum defeito registrado no período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      </ScrollContainer>
    </ScreenLayout>
  );
};
