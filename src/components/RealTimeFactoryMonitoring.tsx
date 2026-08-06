import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Clock,
  User,
  Scissors,
  Settings,
  Paintbrush,
  Package,
  Droplet,
  Cpu,
  Hammer,
  Search,
  Filter,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Play,
  BarChart2,
  ListFilter,
  Zap,
  RefreshCw,
  Users,
  ExternalLink,
  ShieldAlert,
  Flame,
  Wrench,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { ActiveTask, ProductionLog, Item, Sector, ProductionBatch } from "../types";
import { MonitoramentoMetricsSummary } from "./MonitoramentoMetricsSummary";

interface RealTimeFactoryMonitoringProps {
  activePacks: ActiveTask[];
  logs: ProductionLog[];
  items: Item[];
  sectors?: Sector[];
  employees?: any[];
  productionBatches?: ProductionBatch[];
  onOpenModal: (pack: ActiveTask) => void;
}

type SubTab = "OVERVIEW" | "STATIONS" | "OPERATORS" | "METRICS" | "LIVE_LOGS";

export function RealTimeFactoryMonitoring({
  activePacks,
  logs,
  items,
  sectors = [],
  employees = [],
  productionBatches = [],
  onOpenModal,
}: RealTimeFactoryMonitoringProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("OVERVIEW");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>("ALL");
  const [onlyLongDuration, setOnlyLongDuration] = useState(false);

  // Live timer tick every 1s for real-time counter
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to format live elapsed duration (e.g., 01h 23m 45s or 12m 30s)
  const formatLiveElapsed = (startTime: number) => {
    if (!startTime || startTime <= 0) return "00m 00s";
    const elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
    
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");

    if (hrs > 0) {
      return `${hrs}h ${pad(mins)}m ${pad(secs)}s`;
    }
    return `${pad(mins)}m ${pad(secs)}s`;
  };

  // Helper to calculate duration in hours for long-running alert
  const getElapsedHours = (startTime: number) => {
    if (!startTime) return 0;
    return (now - startTime) / (1000 * 60 * 60);
  };

  // Filter active packs based on search term, sector filter, and duration filter
  const filteredActivePacks = useMemo(() => {
    return activePacks.filter((pack) => {
      // Sector filter
      if (selectedSectorFilter !== "ALL") {
        if (selectedSectorFilter === "PRENSAS") {
          if (!["PRENSA_RAFAEL", "PRENSA_EDUARDO"].includes(pack.type || "")) return false;
        } else if (selectedSectorFilter === "TORNOS_CNC") {
          if (!["TORNO_CNC_WILLIAN", "TORNO_CNC_HENRIQUE"].includes(pack.type || "")) return false;
        } else if (selectedSectorFilter === "PRODUCAO_GERAL") {
          if (["PINTURA", "EMBALAGEM", "CORTE_LASER"].includes(pack.type || "")) return false;
        } else if (pack.type !== selectedSectorFilter) {
          return false;
        }
      }

      // Long duration filter (>2 hours)
      if (onlyLongDuration) {
        if (getElapsedHours(pack.startTime) < 2) return false;
      }

      // Search term
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const item = items.find((i) => i.id === pack.itemId);
        const itemName = (pack.partName || pack.customProductName || item?.name || "").toLowerCase();
        const operator = (pack.operatorId || "").toLowerCase();
        const batchName = (pack.associatedBatchName || "").toLowerCase();
        const sku = `${pack.color || ""} ${pack.size || ""} ${pack.variation || ""}`.toLowerCase();

        const matches =
          itemName.includes(term) ||
          operator.includes(term) ||
          batchName.includes(term) ||
          sku.includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [activePacks, selectedSectorFilter, onlyLongDuration, searchTerm, items, now]);

  // Sector Definitions for visual categorization
  const SECTOR_CATEGORIES = [
    {
      key: "CORTE_LASER",
      title: "Corte Laser",
      subtitle: "Mesa & Chapas CNC",
      icon: Scissors,
      color: "teal",
      matchTypes: ["CORTE_LASER"],
      bgBadge: "bg-teal-500",
      textAccent: "text-teal-700",
      borderAccent: "border-teal-200",
      bgCard: "bg-teal-50/50 hover:bg-teal-50",
    },
    {
      key: "TORNOS_CNC",
      title: "Tornos CNC",
      subtitle: "Willian & Henrique",
      icon: Settings,
      color: "cyan",
      matchTypes: ["TORNO_CNC_WILLIAN", "TORNO_CNC_HENRIQUE"],
      bgBadge: "bg-cyan-600",
      textAccent: "text-cyan-700",
      borderAccent: "border-cyan-200",
      bgCard: "bg-cyan-50/50 hover:bg-cyan-50",
    },
    {
      key: "PRENSAS",
      title: "Prensas & Estamparia",
      subtitle: "Rafael & Eduardo",
      icon: Hammer,
      color: "indigo",
      matchTypes: ["PRENSA_RAFAEL", "PRENSA_EDUARDO"],
      bgBadge: "bg-indigo-600",
      textAccent: "text-indigo-700",
      borderAccent: "border-indigo-200",
      bgCard: "bg-indigo-50/50 hover:bg-indigo-50",
    },
    {
      key: "BANHO_QUIMICO",
      title: "Banho Químico",
      subtitle: "Desengraxe & Passivação",
      icon: Droplet,
      color: "amber",
      matchTypes: ["BANHO_QUIMICO"],
      bgBadge: "bg-amber-500",
      textAccent: "text-amber-700",
      borderAccent: "border-amber-200",
      bgCard: "bg-amber-50/50 hover:bg-amber-50",
    },
    {
      key: "INJETORA",
      title: "Injetora Plástica",
      subtitle: "Moldes & Injeção",
      icon: Cpu,
      color: "purple",
      matchTypes: ["INJETORA"],
      bgBadge: "bg-purple-600",
      textAccent: "text-purple-700",
      borderAccent: "border-purple-200",
      bgCard: "bg-purple-50/50 hover:bg-purple-50",
    },
    {
      key: "PINTURA",
      title: "Pintura Eletrostática",
      subtitle: "Cabine & Estufa",
      icon: Paintbrush,
      color: "pink",
      matchTypes: ["PINTURA"],
      bgBadge: "bg-pink-600",
      textAccent: "text-pink-700",
      borderAccent: "border-pink-200",
      bgCard: "bg-pink-50/50 hover:bg-pink-50",
    },
    {
      key: "EMBALAGEM",
      title: "Embalagem & Expedição",
      subtitle: "Kits, Caixas & Etiquetas",
      icon: Package,
      color: "emerald",
      matchTypes: ["EMBALAGEM"],
      bgBadge: "bg-emerald-600",
      textAccent: "text-emerald-700",
      borderAccent: "border-emerald-200",
      bgCard: "bg-emerald-50/50 hover:bg-emerald-50",
    },
    {
      key: "PRODUCAO",
      title: "Usinagem & Montagem",
      subtitle: "Retrátil & Processos Gerais",
      icon: Wrench,
      color: "blue",
      matchTypes: ["PRODUCAO", "MONTAGEM_RETRATIL"],
      bgBadge: "bg-blue-600",
      textAccent: "text-blue-700",
      borderAccent: "border-blue-200",
      bgCard: "bg-blue-50/50 hover:bg-blue-50",
    }
  ];

  // Distinct active operators count
  const activeOperatorsList = useMemo(() => {
    const map = new Map<string, ActiveTask[]>();
    activePacks.forEach((pack) => {
      const op = pack.operatorId || "Não identificado";
      if (!map.has(op)) {
        map.set(op, []);
      }
      map.get(op)!.push(pack);
    });
    return Array.from(map.entries()).map(([operatorId, tasks]) => ({
      operatorId,
      tasks,
    }));
  }, [activePacks]);

  // Overall statistics
  const totalActive = activePacks.length;
  const longRunningCount = useMemo(() => {
    return activePacks.filter((p) => getElapsedHours(p.startTime) >= 2).length;
  }, [activePacks, now]);

  const activeSectorsCount = useMemo(() => {
    const typesSet = new Set(activePacks.map((p) => p.type).filter(Boolean));
    return typesSet.size;
  }, [activePacks]);

  // Recent logs today
  const todayLogs = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startMs = startOfDay.getTime();
    return logs
      .filter((l) => l.timestamp >= startMs)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
  }, [logs]);

  return (
    <div className="w-full flex flex-col gap-5 text-slate-800">
      {/* HEADER COMMAND CENTER BANNER */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 relative overflow-hidden flex flex-col gap-4">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400 shrink-0">
              <Zap size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                  Transmissão Ao Vivo • Fábrica Conectada
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                Central de Monitoramento Industrial
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 px-4 py-2 rounded-xl text-xs font-mono text-slate-300 shadow-inner self-start lg:self-auto">
            <Clock size={16} className="text-blue-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hora Oficial</span>
              <span className="font-extrabold text-white text-sm">
                {new Date(now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>
        </div>

        {/* KPI METRIC CARDS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 z-10 pt-1">
          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Produção Ativa Agora
              </span>
              <span className="text-2xl font-black text-white mt-0.5 block flex items-baseline gap-1.5">
                {totalActive}
                <span className="text-[10px] font-semibold text-emerald-400">lotes em andamento</span>
              </span>
            </div>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
              <Activity size={20} />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Postos de Trabalho Ativos
              </span>
              <span className="text-2xl font-black text-white mt-0.5 block flex items-baseline gap-1.5">
                {activeSectorsCount}
                <span className="text-[10px] font-semibold text-blue-400">setores operando</span>
              </span>
            </div>
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
              <Layers size={20} />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Operadores Ativos
              </span>
              <span className="text-2xl font-black text-white mt-0.5 block flex items-baseline gap-1.5">
                {activeOperatorsList.length}
                <span className="text-[10px] font-semibold text-cyan-400">mão de obra</span>
              </span>
            </div>
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg">
              <Users size={20} />
            </div>
          </div>

          <div className={`bg-slate-800/60 border p-3.5 rounded-xl flex items-center justify-between gap-3 ${
            longRunningCount > 0 ? "border-amber-500/60 bg-amber-950/20" : "border-slate-700/60"
          }`}>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Operações Longas (&gt;2h)
              </span>
              <span className={`text-2xl font-black mt-0.5 block flex items-baseline gap-1.5 ${
                longRunningCount > 0 ? "text-amber-400" : "text-white"
              }`}>
                {longRunningCount}
                <span className="text-[10px] font-semibold text-amber-300">requer atenção</span>
              </span>
            </div>
            <div className={`p-2 rounded-lg ${
              longRunningCount > 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-700/40 text-slate-400"
            }`}>
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab("OVERVIEW")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === "OVERVIEW"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Activity size={15} />
            Chão de Fábrica ({activePacks.length})
          </button>

          <button
            onClick={() => setActiveSubTab("STATIONS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === "STATIONS"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Layers size={15} />
            Matriz de Postos
          </button>

          <button
            onClick={() => setActiveSubTab("OPERATORS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === "OPERATORS"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Users size={15} />
            Operadores Ativos ({activeOperatorsList.length})
          </button>

          <button
            onClick={() => setActiveSubTab("METRICS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === "METRICS"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <BarChart2 size={15} />
            Gargalos &amp; PPH
          </button>

          <button
            onClick={() => setActiveSubTab("LIVE_LOGS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === "LIVE_LOGS"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 size={15} />
            Histórico Hoje ({todayLogs.length})
          </button>
        </div>
      </div>

      {/* GLOBAL SEARCH AND FILTER CONTROLS (Displayed for Overview, Stations, Operators) */}
      {["OVERVIEW", "STATIONS", "OPERATORS"].includes(activeSubTab) && (
        <div className="bg-slate-100/80 border border-slate-200 p-3 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome da peça, operador, lote, variação, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setOnlyLongDuration(!onlyLongDuration)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                onlyLongDuration
                  ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <AlertTriangle size={14} className={onlyLongDuration ? "text-white" : "text-amber-500"} />
              Acima de 2h ({longRunningCount})
            </button>

            {/* Sector Selector */}
            <select
              value={selectedSectorFilter}
              onChange={(e) => setSelectedSectorFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs shrink-0 cursor-pointer"
            >
              <option value="ALL">Todos os Setores</option>
              <option value="CORTE_LASER">Corte Laser</option>
              <option value="TORNOS_CNC">Tornos CNC</option>
              <option value="PRENSAS">Prensas</option>
              <option value="BANHO_QUIMICO">Banho Químico</option>
              <option value="INJETORA">Injetora</option>
              <option value="PINTURA">Pintura</option>
              <option value="EMBALAGEM">Embalagem</option>
              <option value="PRODUCAO_GERAL">Usinagem Geral</option>
            </select>
          </div>
        </div>
      )}

      {/* SUBTAB 1: CHÃO DE FÁBRICA AO VIVO (VISÃO GERAL) */}
      {activeSubTab === "OVERVIEW" && (
        <div className="flex flex-col gap-6">
          {SECTOR_CATEGORIES.map((cat) => {
            const CAT_ICON = cat.icon;

            // Find matching active packs for this sector
            const sectorPacks = filteredActivePacks.filter((p) => {
              if (cat.key === "CORTE_LASER") return p.type === "CORTE_LASER";
              if (cat.key === "TORNOS_CNC") return ["TORNO_CNC_WILLIAN", "TORNO_CNC_HENRIQUE"].includes(p.type || "");
              if (cat.key === "PRENSAS") return ["PRENSA_RAFAEL", "PRENSA_EDUARDO"].includes(p.type || "");
              if (cat.key === "BANHO_QUIMICO") return p.type === "BANHO_QUIMICO";
              if (cat.key === "INJETORA") return p.type === "INJETORA";
              if (cat.key === "PINTURA") return p.type === "PINTURA";
              if (cat.key === "EMBALAGEM") return p.type === "EMBALAGEM";
              if (cat.key === "PRODUCAO") return ["PRODUCAO", "MONTAGEM_RETRATIL"].includes(p.type || "");
              return false;
            });

            // If filtering by sector or search term and this sector has 0 packs, hide it unless "ALL" filter
            if (sectorPacks.length === 0 && (selectedSectorFilter !== "ALL" || searchTerm.trim() !== "" || onlyLongDuration)) {
              return null;
            }

            return (
              <div key={cat.key} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                {/* Sector Header Bar */}
                <div className="bg-slate-50/80 border-b border-slate-200 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${cat.bgBadge} text-white shadow-2xs`}>
                      <CAT_ICON size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                        {cat.title}
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          sectorPacks.length > 0 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                            : "bg-slate-200 text-slate-600"
                        }`}>
                          {sectorPacks.length} {sectorPacks.length === 1 ? "ativo" : "ativos"}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">{cat.subtitle}</p>
                    </div>
                  </div>

                  {sectorPacks.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Em Operação
                    </div>
                  )}
                </div>

                {/* Cards Grid */}
                <div className="p-4">
                  {sectorPacks.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                      <div className="p-3 bg-slate-200/60 rounded-full text-slate-400">
                        <CAT_ICON size={22} />
                      </div>
                      <p className="text-xs font-extrabold text-slate-500">Posto de Trabalho Disponível / Ocioso</p>
                      <p className="text-[11px] text-slate-400">Nenhum apontamento ativo neste setor no momento.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {sectorPacks.map((pack) => {
                        const item = items.find((i) => i.id === pack.itemId);
                        const elapsedHrs = getElapsedHours(pack.startTime);
                        const isWarning = elapsedHrs >= 2;
                        const isCritical = elapsedHrs >= 4;

                        return (
                          <div
                            key={pack.id}
                            onClick={() => onOpenModal(pack)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden group shadow-2xs hover:shadow-md ${
                              isCritical
                                ? "border-rose-400 bg-rose-50/40 hover:bg-rose-50/80"
                                : isWarning
                                ? "border-amber-400 bg-amber-50/40 hover:bg-amber-50/80"
                                : `${cat.borderAccent} ${cat.bgCard}`
                            }`}
                          >
                            {/* Warning Indicator Ribbon */}
                            {isWarning && (
                              <div className={`absolute top-0 right-0 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-bl shadow-2xs text-white ${
                                isCritical ? "bg-rose-600" : "bg-amber-500"
                              }`}>
                                {isCritical ? "🚨 +4h Rodando" : "⚠️ +2h Operando"}
                              </div>
                            )}

                            <div>
                              {/* Lote / Batch Pill */}
                              {pack.associatedBatchName && (
                                <div className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-2xs">
                                  <span>🏷️ Lote: {pack.associatedBatchName}</span>
                                </div>
                              )}

                              {/* Header row with Product Thumbnail and Titles */}
                              <div className="flex items-start gap-3">
                                {item?.imageUrl && (
                                  <img 
                                    src={item.imageUrl} 
                                    alt="thumb" 
                                    className="w-12 h-12 object-contain bg-white rounded-xl border border-slate-200 p-1 shrink-0 shadow-2xs" 
                                    crossOrigin="anonymous"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-black text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition truncate">
                                    {pack.partName || pack.customProductName || item?.name || "Peça não identificada"}
                                  </h4>

                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    <span className="bg-white/90 border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
                                      Cor: {pack.color || "-"}
                                    </span>
                                    <span className="bg-white/90 border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
                                      Tam: {pack.size || "-"}
                                    </span>
                                    {pack.variation && (
                                      <span className="bg-white/90 border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
                                        Var: {pack.variation}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-200/80 pt-2.5 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 uppercase">
                                  {(pack.operatorId || "OP")[0]}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">Operador</span>
                                  <span className="font-extrabold text-slate-800 text-xs truncate max-w-[110px]">
                                    {pack.operatorId || "Operador"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end shrink-0">
                                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Tempo Decorrido
                                </span>
                                <span className={`font-mono font-black text-xs ${
                                  isCritical ? "text-rose-700 animate-pulse" : isWarning ? "text-amber-700" : cat.textAccent
                                }`}>
                                  {formatLiveElapsed(pack.startTime)}
                                </span>
                              </div>
                            </div>

                            {/* Hover Manage Button */}
                            <div className="text-[10px] font-extrabold text-blue-600 flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 pt-1">
                              <span>Gerenciar / Detalhes</span>
                              <ChevronRight size={12} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBTAB 2: MATRIZ DE POSTOS DE TRABALHO */}
      {activeSubTab === "STATIONS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTOR_CATEGORIES.map((cat) => {
            const CAT_ICON = cat.icon;
            const activeSectorPacks = activePacks.filter((p) => {
              if (cat.key === "CORTE_LASER") return p.type === "CORTE_LASER";
              if (cat.key === "TORNOS_CNC") return ["TORNO_CNC_WILLIAN", "TORNO_CNC_HENRIQUE"].includes(p.type || "");
              if (cat.key === "PRENSAS") return ["PRENSA_RAFAEL", "PRENSA_EDUARDO"].includes(p.type || "");
              if (cat.key === "BANHO_QUIMICO") return p.type === "BANHO_QUIMICO";
              if (cat.key === "INJETORA") return p.type === "INJETORA";
              if (cat.key === "PINTURA") return p.type === "PINTURA";
              if (cat.key === "EMBALAGEM") return p.type === "EMBALAGEM";
              if (cat.key === "PRODUCAO") return ["PRODUCAO", "MONTAGEM_RETRATIL"].includes(p.type || "");
              return false;
            });

            const isOperating = activeSectorPacks.length > 0;

            return (
              <div
                key={cat.key}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between gap-4 transition ${
                  isOperating ? "border-emerald-300 ring-2 ring-emerald-500/10" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${cat.bgBadge} text-white shadow-2xs`}>
                      <CAT_ICON size={22} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm">{cat.title}</h4>
                      <span className="text-[11px] text-slate-500 font-medium">{cat.subtitle}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isOperating
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isOperating ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                    {isOperating ? "EM OPERAÇÃO" : "OCIOSO"}
                  </span>
                </div>

                {isOperating ? (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Tarefas em Execução ({activeSectorPacks.length}):
                    </span>
                    {activeSectorPacks.map((pack) => {
                      const item = items.find((i) => i.id === pack.itemId);
                      return (
                        <div
                          key={pack.id}
                          onClick={() => onOpenModal(pack)}
                          className="bg-slate-50 border border-slate-200 hover:border-blue-400 p-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[160px]">
                              {pack.partName || pack.customProductName || item?.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Op: {pack.operatorId}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-xs text-blue-600 block">
                              {formatLiveElapsed(pack.startTime)}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase font-extrabold">Rodando</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-500">Nenhuma máquina ocupada</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Posto pronto para novos apontamentos de lote.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SUBTAB 3: OPERADORES EM ATIVIDADE */}
      {activeSubTab === "OPERATORS" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Users className="text-blue-600" size={18} />
                Mão de Obra em Atividade no Chão de Fábrica
              </h3>
              <p className="text-[11px] text-slate-500">Operadores com apontamento ativo no momento</p>
            </div>
            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-xs font-black px-3 py-1 rounded-xl">
              {activeOperatorsList.length} Operadores Ativos
            </span>
          </div>

          {activeOperatorsList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              Nenhum operador registrado em produção no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOperatorsList.map(({ operatorId, tasks }) => {
                return (
                  <div
                    key={operatorId}
                    className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center uppercase shadow-2xs">
                          {operatorId[0]}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-xs">{operatorId}</h4>
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            {tasks.length} {tasks.length === 1 ? "tarefa ativa" : "tarefas ativas"}
                          </span>
                        </div>
                      </div>

                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Em Produção
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-slate-200 pt-2.5">
                      {tasks.map((task) => {
                        const item = items.find((i) => i.id === task.itemId);
                        return (
                          <div
                            key={task.id}
                            onClick={() => onOpenModal(task)}
                            className="bg-white border border-slate-200 p-2.5 rounded-lg text-xs hover:border-blue-400 cursor-pointer transition flex items-center justify-between gap-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">
                                {task.partName || task.customProductName || item?.name}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                {task.type?.replace("_", " ")}
                              </span>
                            </div>

                            <span className="font-mono font-bold text-blue-600 text-xs shrink-0">
                              {formatLiveElapsed(task.startTime)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: MÉTRICAS DE GARGALOS E PPH */}
      {activeSubTab === "METRICS" && (
        <MonitoramentoMetricsSummary logs={logs} />
      )}

      {/* SUBTAB 5: APONTAMENTOS CONCLUÍDOS HOJE */}
      {activeSubTab === "LIVE_LOGS" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={18} />
                Histórico de Apontamentos Concluídos Hoje
              </h3>
              <p className="text-[11px] text-slate-500">Registros em tempo real dos lotes finalizados pelos operadores</p>
            </div>

            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-xl border border-slate-200">
              Total Hoje: {todayLogs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <th className="p-3">Horário</th>
                  <th className="p-3">Setor / Tipo</th>
                  <th className="p-3">Produto / Descrição</th>
                  <th className="p-3">Operador</th>
                  <th className="p-3 text-center">Quantidade</th>
                  <th className="p-3 text-right">Duração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {todayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      Nenhum apontamento finalizado hoje até o momento.
                    </td>
                  </tr>
                ) : (
                  todayLogs.map((log) => {
                    const item = items.find((i) => i.id === log.itemId);
                    const qty = log.quantityProcessed || log.quantityCut || log.quantityPainted || log.quantityPacked || 0;
                    
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono text-slate-600 font-bold">
                          {new Date(log.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-800 font-extrabold text-[10px] px-2 py-0.5 rounded border border-slate-200 uppercase">
                            {log.type?.replace("_", " ") || "PRODUÇÃO"}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          {log.customProductName || log.nestedPartName || item?.name || log.processName || "Item finalizado"}
                        </td>
                        <td className="p-3 text-slate-600 font-bold">
                          {log.operatorId}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900">
                          {qty > 0 ? `${qty.toLocaleString()} pçs` : "-"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          {log.durationMillis > 0 ? `${Math.round(log.durationMillis / 1000 / 60)}m` : "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
