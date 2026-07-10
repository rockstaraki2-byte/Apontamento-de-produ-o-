import React, { useMemo, useState } from "react";
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Scissors, 
  Settings, 
  Paintbrush, 
  Package, 
  Activity,
  BarChart2
} from "lucide-react";
import { ProductionLog } from "../types";

interface MonitoramentoMetricsSummaryProps {
  logs: ProductionLog[];
}

type TimeRange = "ALL" | "TODAY" | "7DAYS" | "30DAYS";

export function MonitoramentoMetricsSummary({ logs }: MonitoramentoMetricsSummaryProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("ALL");

  // Helper to format ms into human-readable duration
  const formatDurationText = (ms: number): string => {
    if (ms <= 0) return "N/A";
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    if (minutes < 60) {
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Process statistics per step based on selected range
  const metrics = useMemo(() => {
    const now = Date.now();
    const rangeStart = (() => {
      switch (timeRange) {
        case "TODAY": {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }
        case "7DAYS":
          return now - 7 * 24 * 60 * 60 * 1000;
        case "30DAYS":
          return now - 30 * 24 * 60 * 60 * 1000;
        case "ALL":
        default:
          return 0;
      }
    })();

    const filteredLogs = logs.filter(l => l.timestamp >= rangeStart);

    // Stage configurations
    const stages = [
      {
        key: "Corte",
        type: "CORTE_LASER",
        title: "Corte",
        color: "teal",
        icon: Scissors,
        getQty: (l: ProductionLog) => l.quantityCut || l.quantityProcessed || 0,
      },
      {
        key: "Produção",
        type: "PRODUCAO",
        title: "Produção",
        color: "blue",
        icon: Settings,
        getQty: (l: ProductionLog) => l.quantityProcessed || 0,
      },
      {
        key: "Pintura",
        type: "PINTURA",
        title: "Pintura",
        color: "pink",
        icon: Paintbrush,
        getQty: (l: ProductionLog) => l.quantityPainted || l.quantityProcessed || 0,
      },
      {
        key: "Embalagem",
        type: "EMBALAGEM",
        title: "Embalagem",
        color: "green",
        icon: Package,
        getQty: (l: ProductionLog) => l.quantityPacked || l.quantityProcessed || 0,
      }
    ];

    const results = stages.map(stage => {
      // Find logs of this type that have positive duration
      const stageLogs = filteredLogs.filter(
        l => l.type === stage.type && l.durationMillis > 0
      );

      const totalDuration = stageLogs.reduce((sum, l) => sum + l.durationMillis, 0);
      const totalQuantity = stageLogs.reduce((sum, l) => sum + stage.getQty(l), 0);
      const totalBatches = stageLogs.length;

      const avgBatchTime = totalBatches > 0 ? totalDuration / totalBatches : 0;
      const avgPieceTime = totalQuantity > 0 ? totalDuration / totalQuantity : 0;

      return {
        ...stage,
        totalDuration,
        totalQuantity,
        totalBatches,
        avgBatchTime,
        avgPieceTime,
      };
    });

    // Identify bottleneck based on highest average piece duration
    let bottleneckKey = "";
    let highestAvgPiece = 0;
    
    results.forEach(r => {
      if (r.avgPieceTime > highestAvgPiece) {
        highestAvgPiece = r.avgPieceTime;
        bottleneckKey = r.key;
      }
    });

    return {
      stagesData: results,
      bottleneckKey,
      highestAvgPiece,
    };
  }, [logs, timeRange]);

  const { stagesData, bottleneckKey, highestAvgPiece } = metrics;

  return (
    <div id="metrics-summary-container" className="bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <BarChart2 className="text-blue-600" size={18} />
            Métricas de Tempo e Gargalos de Produção
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Média de tempo real calculada a partir dos apontamentos concluídos
          </p>
        </div>

        {/* Time Segment Controls */}
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs w-fit">
          <button
            onClick={() => setTimeRange("ALL")}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${timeRange === "ALL" ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-805"}`}
          >
            Tudo
          </button>
          <button
            onClick={() => setTimeRange("30DAYS")}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${timeRange === "30DAYS" ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-805"}`}
          >
            30d
          </button>
          <button
            onClick={() => setTimeRange("7DAYS")}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${timeRange === "7DAYS" ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-805"}`}
          >
            7d
          </button>
          <button
            onClick={() => setTimeRange("TODAY")}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${timeRange === "TODAY" ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-805"}`}
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Grid of Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stagesData.map((stage) => {
          const STAGE_ICON = stage.icon;
          const isBottleneck = stage.key === bottleneckKey && stage.avgPieceTime > 0;

          const colorClasses = {
            teal: {
              card: "border-teal-150 bg-teal-50/40 hover:bg-teal-50/60",
              badge: "bg-teal-100 text-teal-800",
              icon: "text-teal-600"
            },
            blue: {
              card: "border-blue-150 bg-blue-50/40 hover:bg-blue-50/60",
              badge: "bg-blue-100 text-blue-800",
              icon: "text-blue-600"
            },
            pink: {
              card: "border-pink-150 bg-pink-50/40 hover:bg-pink-50/60",
              badge: "bg-pink-100 text-pink-800",
              icon: "text-pink-600"
            },
            green: {
              card: "border-green-150 bg-green-50/40 hover:bg-green-50/60",
              badge: "bg-green-100 text-green-800",
              icon: "text-green-600"
            }
          }[stage.color as "teal" | "blue" | "pink" | "green"];

          return (
            <div
              key={stage.key}
              className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 relative overflow-hidden ${
                isBottleneck 
                  ? "border-amber-400 bg-amber-50/60 shadow-[0_4px_12px_rgba(245,158,11,0.1)]" 
                  : colorClasses?.card || "border-slate-200 bg-white"
              }`}
            >
              {/* Highlight ribbon for bottleneck */}
              {isBottleneck && (
                <div className="absolute top-0 right-0 bg-amber-505 text-white bg-amber-500 text-[9px] font-black tracking-wider px-2 py-0.5 rounded-bl">
                  ⚠️ GARGALO
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <STAGE_ICON size={14} className={isBottleneck ? "text-amber-600 animate-pulse" : colorClasses?.icon} />
                    {stage.title}
                  </h5>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                    {stage.totalBatches} lotes apontados
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-1 border-t border-slate-200/50 pt-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Tempo/peça:</span>
                  <span className={`font-black ${isBottleneck ? "text-amber-750 text-sm" : "text-slate-800"}`}>
                    {stage.avgPieceTime > 0 ? formatDurationText(stage.avgPieceTime) : "S/ dados"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-normal">Tempo/lote médio:</span>
                  <span className="font-semibold text-slate-700">
                    {stage.avgBatchTime > 0 ? formatDurationText(stage.avgBatchTime) : "S/ dados"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-normal">Qtd. Total:</span>
                  <span className="font-semibold text-slate-700">
                    {stage.totalQuantity > 0 ? `${stage.totalQuantity.toLocaleString()} un.` : "S/ dados"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Bar Comparison / Insight Section */}
      <div className="bg-white border border-slate-150 rounded-xl p-4 flex flex-col gap-3.5">
        <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Activity size={14} className="text-blue-500" />
          Análise Operacional de Fluxo e Gargalos
        </h5>

        <div className="flex flex-col gap-2.5">
          {stagesData.map((stage) => {
            // Percent relative to the highest piece duration (bottleneck)
            const pct = highestAvgPiece > 0 ? (stage.avgPieceTime / highestAvgPiece) * 100 : 0;
            const isBottleneck = stage.key === bottleneckKey && stage.avgPieceTime > 0;

            const barColor = isBottleneck 
              ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
              : {
                  teal: "bg-teal-500",
                  blue: "bg-blue-500",
                  pink: "bg-pink-500",
                  green: "bg-green-500"
                }[stage.color as "teal" | "blue" | "pink" | "green"];

            return (
              <div key={stage.key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span className="text-[11px] font-bold text-slate-600 sm:w-28 shrink-0 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isBottleneck ? "bg-amber-500 animate-pulse" : "bg-slate-300"}`}></span>
                  {stage.title}
                </span>

                <div className="flex-1 bg-slate-100 rounded-full h-2.5 relative flex items-center">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  ></div>
                </div>

                <span className="text-[10px] font-extrabold text-slate-500 min-w-16 text-right shrink-0">
                  {stage.avgPieceTime > 0 ? `${formatDurationText(stage.avgPieceTime)} / pç` : "N/A"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actionable Insight Comment */}
        {bottleneckKey && highestAvgPiece > 0 ? (
          <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-lg flex items-start gap-2.5 mt-1.5 text-amber-900 text-xs">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
            <div className="flex flex-col gap-1">
              <span className="font-extrabold text-amber-955">
                Gargalo Operacional Identificado: {bottleneckKey}
              </span>
              <p className="text-amber-800 font-medium leading-relaxed">
                A etapa de <strong>{bottleneckKey}</strong> é a mais lenta do fluxo produtivo atual, consumindo em média <strong>{formatDurationText(highestAvgPiece)}</strong> por peça executada. Considerar remanejamento de mão de obra ou otimização de setup para equilibrar o fluxo.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200/60 p-3 rounded-lg flex items-start gap-2.5 mt-1.5 text-blue-900 text-xs">
            <Clock className="text-blue-600 shrink-0 mt-0.5" size={16} />
            <div className="flex flex-col gap-1">
              <span className="font-bold">Aguardando mais dados de produção</span>
              <p className="text-blue-800">
                Os apontamentos com tempo de duração registrado aparecerão aqui para ajudar na análise de fluxo operacional e identificação de ociosidade ou lentidão.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
