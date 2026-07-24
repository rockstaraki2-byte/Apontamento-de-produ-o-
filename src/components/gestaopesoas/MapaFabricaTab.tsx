import React, { useState, useMemo } from "react";
import type { useDatabase } from "../../useDatabase";
import type { User } from "../../types";
import {
  MapPin,
  Users,
  UserPlus,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  Briefcase,
  Layers,
  Building2,
  X,
  Edit2,
  Check,
} from "lucide-react";

interface MapaFabricaTabProps {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}

interface SectorAllocation {
  id: string;
  name: string;
  zone: string;
  recommendedCount: number;
  icon: string;
  description: string;
  rolesIncluded: string[];
}

const DEFAULT_SECTOR_ZONES: SectorAllocation[] = [
  {
    id: "laser",
    name: "Corte a Laser",
    zone: "Galpão A - Usinagem & Corte",
    recommendedCount: 4,
    icon: "⚡",
    description: "Operação de máquinas de corte a laser, abastecimento de chapas e descarregamento.",
    rolesIncluded: ["CORTE_LASER", "OPERADOR_LASER"],
  },
  {
    id: "prensas",
    name: "Prensas & Conformação",
    zone: "Galpão A - Usinagem & Corte",
    recommendedCount: 5,
    icon: "🔨",
    description: "Estamparia, dobra em prensas hidráulicas e dobradeiras CNC.",
    rolesIncluded: ["PRENSA_RAFAEL", "PRENSA_EDUARDO", "PRENSA"],
  },
  {
    id: "torno",
    name: "Torno CNC & Usinagem",
    zone: "Galpão A - Usinagem & Corte",
    recommendedCount: 3,
    icon: "⚙️",
    description: "Usinagem de peças de precisão, torneamento CNC e fresamento.",
    rolesIncluded: ["TORNO_CNC_WILLIAN", "TORNO_CNC_HENRIQUE", "TORNO_CNC"],
  },
  {
    id: "solda",
    name: "Solda & Caldeiraria",
    zone: "Galpão B - Estruturas",
    recommendedCount: 4,
    icon: "🔥",
    description: "Soldagem MIG/TIG, ponteamento e montagem de estruturas metálicas.",
    rolesIncluded: ["SOLDA", "SOLDADOR"],
  },
  {
    id: "banho",
    name: "Banho Químico & Pré-Tratamento",
    zone: "Galpão B - Acabamento",
    recommendedCount: 2,
    icon: "🧪",
    description: "Desengraxamento, decapagem e fosfatização pré-pintura.",
    rolesIncluded: ["BANHO_QUIMICO"],
  },
  {
    id: "pintura",
    name: "Pintura Eletrostática",
    zone: "Galpão B - Acabamento",
    recommendedCount: 4,
    icon: "🎨",
    description: "Cabines de pintura a pó, cura em estufa e inspeção de camada.",
    rolesIncluded: ["PINTURA", "PINTOR"],
  },
  {
    id: "injetora",
    name: "Injetora de Plásticos",
    zone: "Galpão C - Injeção",
    recommendedCount: 3,
    icon: "🧩",
    description: "Injeção de componentes termoplásticos, rebarbação e controle.",
    rolesIncluded: ["INJETORA"],
  },
  {
    id: "embalagem",
    name: "Embalagem & Expedição",
    zone: "Galpão C - Montagem & Final",
    recommendedCount: 6,
    icon: "📦",
    description: "Montagem final, etiquetagem, embalagem e paletização.",
    rolesIncluded: ["EMBALAGEM", "EXPEDICAO"],
  },
  {
    id: "producao_geral",
    name: "Montagem & Produção Geral",
    zone: "Galpão C - Montagem & Final",
    recommendedCount: 8,
    icon: "🏗️",
    description: "Montagem de subconjuntos, retrátil, Rodrigo e apoio geral de fábrica.",
    rolesIncluded: ["PRODUCAO", "MONTAGEM_RODRIGO", "MONTAGEM_RETRATIL", "ENCARREGADO"],
  },
  {
    id: "pcp_logistica",
    name: "PCP, Projetos & Gestão",
    zone: "Escritório Operacional",
    recommendedCount: 3,
    icon: "📊",
    description: "Planejamento e controle de produção, engenharia de produto e logística.",
    rolesIncluded: ["PCP", "PROJETISTA", "GERENCIA", "ADMIN", "LEITURA"],
  },
];

export function MapaFabricaTab({ db, currentUser }: MapaFabricaTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("TODOS");
  const [reallocateUser, setReallocateUser] = useState<User | null>(null);
  const [newTargetSectorId, setNewTargetSectorId] = useState<string>("");
  const [showHiringModal, setShowHiringModal] = useState(false);
  const [hiringSector, setHiringSector] = useState<string>("");
  const [hiringRole, setHiringRole] = useState<string>("");
  const [hiringQty, setHiringQty] = useState<number>(1);
  const [hiringPriority, setHiringPriority] = useState<"ALTA" | "MEDIA" | "BAIXA">("ALTA");
  const [hiringNotes, setHiringNotes] = useState<string>("");
  const [editingTargetSectors, setEditingTargetSectors] = useState<{ [secId: string]: number }>({});

  // Custom targets map from state / default
  const sectorTargets = useMemo(() => {
    const map: { [id: string]: number } = {};
    DEFAULT_SECTOR_ZONES.forEach((s) => {
      map[s.id] = editingTargetSectors[s.id] ?? s.recommendedCount;
    });
    return map;
  }, [editingTargetSectors]);

  // Map users to factory sectors based on user.role or user.name or sectorId
  const allocatedUsersBySector = useMemo(() => {
    const map: { [sectorId: string]: User[] } = {};
    DEFAULT_SECTOR_ZONES.forEach((s) => {
      map[s.id] = [];
    });

    db.allUsers.forEach((u) => {
      const uRole = u.role ? u.role.toUpperCase() : "";
      const uName = u.name ? u.name.toUpperCase() : "";

      let assigned = false;

      // Match by custom override in localStorage/user property if any or role match
      for (const sec of DEFAULT_SECTOR_ZONES) {
        if (sec.rolesIncluded.some((r) => uRole.includes(r) || uRole === r)) {
          map[sec.id].push(u);
          assigned = true;
          break;
        }
      }

      // Name fallback heuristics if not matched
      if (!assigned) {
        if (uName.includes("LASER")) map["laser"].push(u);
        else if (uName.includes("PRENSA") || uName.includes("EDUARDO") || uName.includes("RAFAEL")) map["prensas"].push(u);
        else if (uName.includes("TORNO") || uName.includes("WILLIAN") || uName.includes("HENRIQUE")) map["torno"].push(u);
        else if (uName.includes("SOLDA")) map["solda"].push(u);
        else if (uName.includes("BANHO")) map["banho"].push(u);
        else if (uName.includes("PINTURA")) map["pintura"].push(u);
        else if (uName.includes("INJETORA")) map["injetora"].push(u);
        else if (uName.includes("EMBALAGEM")) map["embalagem"].push(u);
        else if (uName.includes("PCP") || uName.includes("MARCOS") || uName.includes("RAUL") || uName.includes("ROMARIO")) map["pcp_logistica"].push(u);
        else map["producao_geral"].push(u);
      }
    });

    return map;
  }, [db.allUsers]);

  // Metrics
  const totalEmployees = db.allUsers.length;
  const totalTarget = useMemo(() => {
    return Object.values(sectorTargets).reduce((a: number, b: number) => a + b, 0);
  }, [sectorTargets]);

  const totalDeficit = useMemo(() => {
    let count = 0;
    DEFAULT_SECTOR_ZONES.forEach((s) => {
      const actual = (allocatedUsersBySector[s.id] || []).length;
      const target = sectorTargets[s.id];
      if (actual < target) {
        count += target - actual;
      }
    });
    return count;
  }, [allocatedUsersBySector, sectorTargets]);

  const totalSurplus = useMemo(() => {
    let count = 0;
    DEFAULT_SECTOR_ZONES.forEach((s) => {
      const actual = (allocatedUsersBySector[s.id] || []).length;
      const target = sectorTargets[s.id];
      if (actual > target) {
        count += actual - target;
      }
    });
    return count;
  }, [allocatedUsersBySector, sectorTargets]);

  const allocationEfficiencyPct = useMemo(() => {
    if (totalTarget === 0) return 100;
    const filled = Math.min(totalEmployees, totalTarget - totalDeficit);
    return Math.min(100, Math.round((filled / totalTarget) * 100));
  }, [totalEmployees, totalTarget, totalDeficit]);

  // Handle reallocating an employee
  const handleConfirmReallocation = () => {
    if (!reallocateUser || !newTargetSectorId) return;

    const targetSec = DEFAULT_SECTOR_ZONES.find((s) => s.id === newTargetSectorId);
    if (!targetSec) return;

    // Pick new role according to sector
    const newRole = targetSec.rolesIncluded[0] as any;

    if (db.updateUser) {
      db.updateUser(reallocateUser.id, { role: newRole });
    }

    alert(`Funcionário ${reallocateUser.name} realocado com sucesso para o setor ${targetSec.name}!`);
    setReallocateUser(null);
    setNewTargetSectorId("");
  };

  // Handle opening hiring request
  const handleCreateHiringRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hiringSector || !hiringRole) return;

    const secObj = DEFAULT_SECTOR_ZONES.find((s) => s.id === hiringSector);
    const secName = secObj ? secObj.name : hiringSector;

    alert(`Solicitação de contratação enviada com sucesso!\n\nSetor: ${secName}\nCargo: ${hiringRole}\nQuantidade: ${hiringQty}\nPrioridade: ${hiringPriority}`);
    setShowHiringModal(false);
    setHiringSector("");
    setHiringRole("");
    setHiringNotes("");
  };

  // Zones for filter dropdown
  const uniqueZones = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_SECTOR_ZONES.forEach((s) => set.add(s.zone));
    return Array.from(set);
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Colaboradores</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{totalEmployees}</span>
              <span className="text-xs text-slate-500 font-medium">de {totalTarget} na meta</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Necessidade de Contratação</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-amber-600">{totalDeficit}</span>
              <span className="text-xs text-amber-700 font-semibold">vagas em aberto</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <UserPlus size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Oportunidades de Realocação</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-blue-600">{totalSurplus}</span>
              <span className="text-xs text-blue-700 font-semibold">excesso alocado</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <ArrowRightLeft size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taxa de Cobertura de Quadro</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-emerald-600">{allocationEfficiencyPct}%</span>
              <span className="text-xs text-emerald-700 font-semibold">das vagas preenchidas</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={18} className="text-slate-400 shrink-0" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full sm:w-auto text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="TODOS">Todas as Zonas da Fábrica</option>
              {uniqueZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowHiringModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xs cursor-pointer"
          >
            <UserPlus size={16} /> Solicit. Contratação
          </button>
        </div>
      </div>

      {/* Visual Factory Floor Grid */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 size={20} className="text-indigo-600" />
            Planta Industrial & Alocação por Setor
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Clique em "⚡ Realocar" em qualquer colaborador para remanejamento instantâneo.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DEFAULT_SECTOR_ZONES.filter((sec) => {
            if (selectedZone !== "TODOS" && sec.zone !== selectedZone) return false;
            if (searchTerm.trim()) {
              const term = searchTerm.toLowerCase();
              const secMatch = sec.name.toLowerCase().includes(term) || sec.zone.toLowerCase().includes(term);
              const userMatch = (allocatedUsersBySector[sec.id] || []).some((u) => u.name.toLowerCase().includes(term));
              return secMatch || userMatch;
            }
            return true;
          }).map((sec) => {
            const employees = allocatedUsersBySector[sec.id] || [];
            const filteredEmployees = searchTerm.trim()
              ? employees.filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
              : employees;

            const target = sectorTargets[sec.id];
            const actual = employees.length;
            const diff = actual - target;

            let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
            let statusText = "Quadro Completo";
            if (diff < 0) {
              badgeColor = "bg-amber-50 text-amber-800 border-amber-200/80";
              statusText = `Precisa de +${Math.abs(diff)} Contratação(ões)`;
            } else if (diff > 0) {
              badgeColor = "bg-blue-50 text-blue-800 border-blue-200/80";
              statusText = `${diff} Operador(es) disponível(is) p/ realocação`;
            }

            const isEditingTarget = editingTargetSectors[sec.id] !== undefined;

            return (
              <div
                key={sec.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                {/* Sector Card Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{sec.icon}</span>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base leading-tight">{sec.name}</h4>
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-slate-400 shrink-0" /> {sec.zone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeColor}`}>
                        {actual}/{target}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{sec.description}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 mt-1 text-[11px]">
                    <span className="font-bold text-slate-600 flex items-center gap-1">
                      Status: <span className="font-semibold">{statusText}</span>
                    </span>

                    {diff < 0 && (
                      <button
                        onClick={() => {
                          setHiringSector(sec.id);
                          setHiringRole(sec.rolesIncluded[0] || "");
                          setHiringQty(Math.abs(diff));
                          setShowHiringModal(true);
                        }}
                        className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer hover:bg-amber-100/60 px-1.5 py-0.5 rounded transition"
                      >
                        + Abrir Vaga
                      </button>
                    )}
                  </div>
                </div>

                {/* Employee List inside Sector */}
                <div className="p-4 flex-1 flex flex-col gap-2 bg-white max-h-72 overflow-y-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-1">
                      <Users size={20} className="opacity-40" />
                      <span>Nenhum operador alocado no momento</span>
                      <button
                        onClick={() => {
                          setHiringSector(sec.id);
                          setShowHiringModal(true);
                        }}
                        className="mt-2 text-indigo-600 font-bold hover:underline"
                      >
                        + Solicitar Contratação
                      </button>
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-800 leading-tight group-hover:text-indigo-900 transition">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {emp.role || "OPERADOR"}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setReallocateUser(emp);
                            setNewTargetSectorId("");
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition shadow-2xs cursor-pointer shrink-0"
                          title="Realocar operador para outro setor"
                        >
                          <ArrowRightLeft size={12} />
                          <span>Realocar</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Realocar Funcionário */}
      {reallocateUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft size={20} className="text-indigo-600" />
                Realocar Colaborador
              </h3>
              <button
                onClick={() => setReallocateUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-sm border border-indigo-200 shrink-0">
                {reallocateUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-sm">{reallocateUser.name}</div>
                <div className="text-xs text-slate-500 font-medium">Cargo Atual: {reallocateUser.role || "Operador"}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">Selecione o Novo Setor de Destino:</label>
              <select
                value={newTargetSectorId}
                onChange={(e) => setNewTargetSectorId(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Escolha um Setor --</option>
                {DEFAULT_SECTOR_ZONES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name} ({s.zone})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReallocateUser(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReallocation}
                disabled={!newTargetSectorId}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2"
              >
                <Check size={16} /> Confirmar Realocação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Solicitar Contratação / Abertura de Vaga */}
      {showHiringModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateHiringRequest} className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus size={20} className="text-indigo-600" />
                Solicitação de Contratação / Vaga
              </h3>
              <button
                type="button"
                onClick={() => setShowHiringModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Setor Solicitante:</label>
                <select
                  required
                  value={hiringSector}
                  onChange={(e) => setHiringSector(e.target.value)}
                  className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white"
                >
                  <option value="">-- Selecione o Setor --</option>
                  {DEFAULT_SECTOR_ZONES.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Cargo / Função:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Operador de Prensa / Soldador MIG"
                  value={hiringRole}
                  onChange={(e) => setHiringRole(e.target.value)}
                  className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Quantidade de Vagas:</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={hiringQty}
                  onChange={(e) => setHiringQty(Number(e.target.value))}
                  className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Prioridade:</label>
                <select
                  value={hiringPriority}
                  onChange={(e) => setHiringPriority(e.target.value as any)}
                  className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white"
                >
                  <option value="ALTA">🚨 Alta (Urgente / Gargalo)</option>
                  <option value="MEDIA">⚡ Média (Crescimento de Produção)</option>
                  <option value="BAIXA">🟢 Baixa (Banco de Talentos)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Observações / Requisitos Específicos:</label>
              <textarea
                rows={3}
                placeholder="Ex: Leitura e interpretação de desenho técnico, experiência com micrômetro/paquímetro..."
                value={hiringNotes}
                onChange={(e) => setHiringNotes(e.target.value)}
                className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHiringModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2"
              >
                <UserPlus size={16} /> Abrir Vaga no RH
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
