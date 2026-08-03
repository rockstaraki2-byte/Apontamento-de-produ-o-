import React, { useState, useMemo, useEffect } from "react";
import type { useDatabase } from "../../useDatabase";
import type { User } from "../../types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  MapPin,
  Users,
  UserPlus,
  UserX,
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
  Plus,
  Trash2,
  Download,
  Printer,
  FileText,
  Eye,
} from "lucide-react";

export interface HiringRequest {
  id: string;
  sectorId: string;
  sectorName: string;
  role: string;
  quantity: number;
  priority: "ALTA" | "MEDIA" | "BAIXA";
  notes?: string;
  createdAt: string;
  status: "EM_ABERTO" | "EM_SELECAO" | "PREENCHIDA" | "CANCELADA";
  requesterName?: string;
}

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
  revenueGoalDaily?: number;
  revenueGoalWeekly?: number;
  hourlyCost?: number;
  productiveCost?: number;
}

const INITIAL_SECTOR_ZONES: SectorAllocation[] = [
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
  const [reallocateUser, setReallocateUser] = useState<any | null>(null);
  const [newTargetSectorId, setNewTargetSectorId] = useState<string>("");
  const [showHiringModal, setShowHiringModal] = useState(false);
  const [showVacanciesModal, setShowVacanciesModal] = useState(false);
  const [hiringSector, setHiringSector] = useState<string>("");
  const [hiringRole, setHiringRole] = useState<string>("");
  const [hiringQty, setHiringQty] = useState<number>(1);
  const [hiringPriority, setHiringPriority] = useState<"ALTA" | "MEDIA" | "BAIXA">("ALTA");
  const [hiringNotes, setHiringNotes] = useState<string>("");

  const [hiringRequests, setHiringRequests] = useState<HiringRequest[]>(() => {
    try {
      const saved = localStorage.getItem("producao_hiring_requests_v1");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: "HR-101",
        sectorId: "S02",
        sectorName: "Solda / Caldeiraria",
        role: "Soldador MIG/TIG",
        quantity: 2,
        priority: "ALTA",
        notes: "Experiência comprovada em estrutura metálica e leitura de desenho técnico.",
        createdAt: new Date().toLocaleDateString("pt-BR"),
        status: "EM_ABERTO",
        requesterName: currentUser.name || "Gestão PCP",
      },
      {
        id: "HR-102",
        sectorId: "S05",
        sectorName: "Montagem Retrátil",
        role: "Operador de Montagem",
        quantity: 1,
        priority: "MEDIA",
        notes: "Montagem de kits e peças de estofado retrátil com ferramentas pneumáticas.",
        createdAt: new Date().toLocaleDateString("pt-BR"),
        status: "EM_ABERTO",
        requesterName: currentUser.name || "Gestão PCP",
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("producao_hiring_requests_v1", JSON.stringify(hiringRequests));
    } catch (e) {
      console.error(e);
    }
  }, [hiringRequests]);

  const [sectors, setSectors] = useState<SectorAllocation[]>(() => {
    try {
      const saved = localStorage.getItem("producao_factory_sectors_v1");
      return saved ? JSON.parse(saved) : INITIAL_SECTOR_ZONES;
    } catch {
      return INITIAL_SECTOR_ZONES;
    }
  });

  const saveSectors = async (newSectors: SectorAllocation[]) => {
    setSectors(newSectors);
    try {
      localStorage.setItem("producao_factory_sectors_v1", JSON.stringify(newSectors));
    } catch (e) {
      console.error(e);
    }

    if (db) {
      for (const sec of newSectors) {
        const dbSec = db.sectors?.find((s) => String(s.id) === String(sec.id) || s.name.toLowerCase() === sec.name.toLowerCase());
        if (dbSec) {
          try {
            await db.updateSector({
              ...dbSec,
              recommendedCount: sec.recommendedCount,
              revenueGoalDaily: sec.revenueGoalDaily,
              revenueGoalWeekly: sec.revenueGoalWeekly,
              hourlyCost: sec.hourlyCost,
              productiveCost: sec.productiveCost,
            });
          } catch (err) {
            console.error("Erro ao sincronizar setor com Firestore:", err);
          }
        }
      }
    }
  };

  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<SectorAllocation | null>(null);

  const handleOpenSectorModal = (sec?: SectorAllocation) => {
    if (sec) {
      setEditingSector({ ...sec });
    } else {
      setEditingSector({
        id: `sec_${Date.now()}`,
        name: "",
        zone: "",
        recommendedCount: 1,
        icon: "🏭",
        description: "",
        rolesIncluded: [],
        revenueGoalDaily: 0,
        revenueGoalWeekly: 0,
        hourlyCost: 0,
        productiveCost: 0,
      });
    }
    setIsSectorModalOpen(true);
  };

  const handleSaveSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSector) return;
    
    const isExisting = sectors.some((s) => s.id === editingSector.id);
    let newSectors = [...sectors];
    if (isExisting) {
      newSectors = newSectors.map((s) => (s.id === editingSector.id ? editingSector : s));
    } else {
      newSectors.push(editingSector);
    }
    saveSectors(newSectors);
    setIsSectorModalOpen(false);
    setEditingSector(null);
  };
  
  const handleDeleteSector = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este setor? Pessoas alocadas neste setor podem ficar 'Sem Setor'.")) return;
    const newSectors = sectors.filter((s) => s.id !== id);
    saveSectors(newSectors);
    setIsSectorModalOpen(false);
    setEditingSector(null);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text("Relatório - Mapa da Fábrica", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Filtro Zona: ${selectedZone} | Data: ${new Date().toLocaleDateString("pt-BR")} | Total de Colaboradores: ${totalEmployees}`, 14, 28);
    
    doc.setTextColor(0);
    
    const tableData: any[][] = [];
    
    sectors.filter(sec => selectedZone === "TODOS" || sec.zone === selectedZone).forEach(sec => {
      const emps = allocatedUsersBySector[sec.id] || [];
      const secFiltered = emps.filter((emp) =>
          searchTerm.trim() ? emp.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
      );
      
      const count = secFiltered.length;
      tableData.push([
        sec.name,
        sec.zone,
        `${count} / ${sec.recommendedCount}`,
        secFiltered.map(e => e.name).join(", ")
      ]);
    });
    
    if (unallocatedPersonnel.length > 0) {
        tableData.push([
            "SEM SETOR",
            "-",
            `${unallocatedPersonnel.length}`,
            unallocatedPersonnel.map(e => e.name).join(", ")
        ]);
    }
    
    autoTable(doc, {
      startY: 35,
      head: [["Setor", "Zona", "Lotação", "Colaboradores"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`mapa_fabrica_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // Saved manual sector allocations map state (persisted in localStorage)
  const [savedAllocations, setSavedAllocations] = useState<{ [personKey: string]: string }>(() => {
    try {
      const raw = localStorage.getItem("producao_factory_allocations_v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const saveAllocations = (newMap: { [personKey: string]: string }) => {
    setSavedAllocations(newMap);
    try {
      localStorage.setItem("producao_factory_allocations_v1", JSON.stringify(newMap));
    } catch (e) {
      console.error(e);
    }
  };

  const getPersonKey = (p: { userId?: string; employeeId?: string; name: string }) => {
    if (p.userId) return `u_${p.userId}`;
    if (p.employeeId) return `e_${p.employeeId}`;
    return `n_${p.name.toLowerCase().trim()}`;
  };

  // Combine users and employees for full factory mapping safely with deduplication
  const allPersonnel = useMemo(() => {
    type PersonnelItem = {
      id: string;
      name: string;
      role: string;
      isUser: boolean;
      userId?: string;
      employeeId?: string;
      factorySectorId?: string;
      originalObj: any;
    };

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, " ")
        .trim();

    const nameMap = new Map<string, PersonnelItem>();

    const rawUsers = db?.allUsers || db?.users || [];
    rawUsers.forEach((u) => {
      if (!u || !u.name) return;
      const normName = normalize(u.name);
      if (!normName) return;

      const item: PersonnelItem = {
        id: `usr_${u.id}`,
        name: u.name,
        role: (u.role || "OPERADOR").toUpperCase(),
        isUser: true,
        userId: u.id,
        factorySectorId: (u as any).factorySectorId,
        originalObj: u,
      };
      nameMap.set(normName, item);
    });

    const rawEmployees = db?.employees || [];
    rawEmployees.forEach((e) => {
      if (!e || !e.name) return;
      const normName = normalize(e.name);
      if (!normName) return;

      let existing = nameMap.get(normName);
      if (!existing) {
        for (const [key, val] of nameMap.entries()) {
          if (
            key === normName ||
            (key.length >= 3 && normName.length >= 3 && (key.startsWith(normName) || normName.startsWith(key)))
          ) {
            existing = val;
            break;
          }
        }
      }

      if (existing) {
        existing.employeeId = e.id;
        if (e.sectorId && !existing.factorySectorId) {
          const sec = db?.sectors?.find((s) => s.id === e.sectorId);
          if (sec) existing.role = sec.name.toUpperCase();
        }
        if ((e as any).factorySectorId) {
          existing.factorySectorId = (e as any).factorySectorId;
        }
      } else {
        let roleName = "OPERADOR";
        if (e.sectorId && db?.sectors) {
          const sec = db.sectors.find((s) => s.id === e.sectorId);
          if (sec) roleName = sec.name.toUpperCase();
        }
        const item: PersonnelItem = {
          id: `emp_${e.id}`,
          name: e.name,
          role: roleName,
          isUser: false,
          employeeId: e.id,
          factorySectorId: (e as any).factorySectorId,
          originalObj: e,
        };
        nameMap.set(normName, item);
      }
    });

    return Array.from(nameMap.values());
  }, [db?.allUsers, db?.users, db?.employees, db?.sectors]);

  // Custom targets map from state / default
  const sectorTargets = useMemo(() => {
    const map: { [id: string]: number } = {};
    sectors.forEach((s) => {
      map[s.id] = s.recommendedCount;
    });
    return map;
  }, [sectors]);

  // Map users to factory sectors based on user.role or explicit saved allocation
  const allocatedUsersBySector = useMemo(() => {
    const map: { [sectorId: string]: typeof allPersonnel } = {};
    sectors.forEach((s) => {
      map[s.id] = [];
    });
    map["SEM_SETOR"] = [];

    allPersonnel.forEach((u) => {
      const personKey = getPersonKey(u);
      const explicitSector = savedAllocations[personKey] || u.factorySectorId || u.originalObj?.factorySectorId;

      if (
        explicitSector === "SEM_SETOR" ||
        explicitSector === "UNALLOCATED" ||
        explicitSector === "NONE" ||
        explicitSector === "DESALOCADO"
      ) {
        map["SEM_SETOR"].push(u);
        return;
      }

      if (explicitSector && map[explicitSector]) {
        map[explicitSector].push(u);
        return;
      }

      const uRole = u.role ? u.role.toUpperCase() : "";

      let assigned = false;
      for (const sec of sectors) {
        if (sec.rolesIncluded.some((r) => uRole.includes(r) || uRole === r)) {
          map[sec.id].push(u);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        // If not explicitly matched to a sector, place in SEM_SETOR (Unallocated)
        map["SEM_SETOR"].push(u);
      }
    });

    return map;
  }, [allPersonnel, savedAllocations]);

  // Unallocated personnel list
  const unallocatedPersonnel = useMemo(() => {
    return allocatedUsersBySector["SEM_SETOR"] || [];
  }, [allocatedUsersBySector]);

  // Metrics
  const totalEmployees = allPersonnel.length;
  const totalAllocated = totalEmployees - unallocatedPersonnel.length;

  const totalTarget = useMemo(() => {
    return Object.values(sectorTargets).reduce((a: number, b: number) => a + b, 0);
  }, [sectorTargets]);

  const totalDeficit = useMemo(() => {
    let count = 0;
    sectors.forEach((s) => {
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
    sectors.forEach((s) => {
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
    const filled = Math.min(totalAllocated, totalTarget - totalDeficit);
    return Math.min(100, Math.round((filled / totalTarget) * 100));
  }, [totalAllocated, totalTarget, totalDeficit]);

  // Handle removing a person from any sector
  const handleRemoveFromSector = async (person: any) => {
    if (!person) return;
    const personKey = getPersonKey(person);
    const newMap = { ...savedAllocations, [personKey]: "SEM_SETOR" };
    saveAllocations(newMap);

    try {
      if (person.userId && db?.updateUser) {
        await db.updateUser(person.userId, { factorySectorId: "SEM_SETOR" } as any);
      }
      if (person.employeeId && db?.updateEmployee) {
        await db.updateEmployee(person.employeeId, { factorySectorId: "SEM_SETOR" } as any);
      }
    } catch (err) {
      console.error("Erro ao desalocar colaborador:", err);
    }

    alert(`Colaborador(a) ${person.name} foi removido(a) do setor e marcado(a) como Sem Setor!`);
    if (reallocateUser && (reallocateUser.id === person.id || reallocateUser.userId === person.userId)) {
      setReallocateUser(null);
      setNewTargetSectorId("");
    }
  };

  // Handle reallocating an employee
  const handleConfirmReallocation = async () => {
    if (!reallocateUser || !newTargetSectorId) return;

    if (newTargetSectorId === "SEM_SETOR") {
      await handleRemoveFromSector(reallocateUser);
      return;
    }

    const targetSec = sectors.find((s) => s.id === newTargetSectorId);
    if (!targetSec) return;

    const personKey = getPersonKey(reallocateUser);
    const newMap = { ...savedAllocations, [personKey]: newTargetSectorId };
    saveAllocations(newMap);

    const newRole = targetSec.rolesIncluded[0] as any;

    try {
      if (reallocateUser.userId && db?.updateUser) {
        await db.updateUser(reallocateUser.userId, { role: newRole, factorySectorId: newTargetSectorId } as any);
      }
      if (reallocateUser.employeeId && db?.updateEmployee) {
        await db.updateEmployee(reallocateUser.employeeId, { role: newRole, factorySectorId: newTargetSectorId } as any);
      }
      alert(`Colaborador(a) ${reallocateUser.name} realocado(a) com sucesso para o setor ${targetSec.name}!`);
    } catch (err) {
      console.error(err);
      alert(`Colaborador(a) ${reallocateUser.name} realocado(a) para o setor ${targetSec.name}!`);
    }

    setReallocateUser(null);
    setNewTargetSectorId("");
  };

  // Handle opening hiring request
  const handleCreateHiringRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hiringSector || !hiringRole) return;

    const secObj = sectors.find((s) => s.id === hiringSector);
    const secName = secObj ? secObj.name : hiringSector;

    const newReq: HiringRequest = {
      id: `HR-${Math.floor(100 + Math.random() * 900)}`,
      sectorId: hiringSector,
      sectorName: secName,
      role: hiringRole,
      quantity: hiringQty,
      priority: hiringPriority,
      notes: hiringNotes,
      createdAt: new Date().toLocaleDateString("pt-BR"),
      status: "EM_ABERTO",
      requesterName: currentUser.name || "Gestor",
    };

    setHiringRequests((prev) => [newReq, ...prev]);

    setShowHiringModal(false);
    setHiringSector("");
    setHiringRole("");
    setHiringNotes("");
    setHiringQty(1);

    if (confirm(`Solicitação de contratação #${newReq.id} gerada com sucesso!\n\nDeseja visualizar a lista de Vagas em Aberto para imprimir ou exportar em PDF?`)) {
      setShowVacanciesModal(true);
    }
  };

  const handleExportVacanciesPDF = (filterStatus?: string) => {
    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text("Relatório de Vagas em Aberto e Solicitações de Contratação", 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Fábrica / Gestão de Pessoas - Data: ${new Date().toLocaleDateString("pt-BR")} | Emissor: ${currentUser.name}`,
      14,
      25,
    );

    doc.setTextColor(0);

    const list = hiringRequests.filter((r) =>
      filterStatus ? r.status === filterStatus : true
    );

    const tableData = list.map((r) => [
      r.id,
      r.sectorName,
      r.role,
      `${r.quantity} vaga(s)`,
      r.priority,
      r.status.replace("_", " "),
      r.createdAt,
      r.notes || "-",
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["ID", "Setor Solicitante", "Cargo / Função", "Qtd", "Prioridade", "Status", "Data", "Requisitos / Obs"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 45 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { cellWidth: "auto" },
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("_________________________", 40, finalY + 25);
    doc.text("Solicitante PCP / Fábrica", 40, finalY + 30);

    doc.text("_________________________", 180, finalY + 25);
    doc.text("Aprovação RH / Diretoria", 180, finalY + 30);

    doc.save(`Vagas_em_Aberto_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrintSingleVacancy = (req: HiringRequest) => {
    const doc = new jsPDF("portrait");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text("SOLICITAÇÃO DE CONTRATAÇÃO / VAGA RH", 14, 20);

    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 24, 196, 24);

    doc.setFontSize(10);
    doc.setTextColor(70, 80, 95);
    doc.text(`Código da Solicitação: ${req.id}`, 14, 34);
    doc.text(`Data da Abertura: ${req.createdAt}`, 14, 42);
    doc.text(`Solicitante: ${req.requesterName || currentUser.name}`, 14, 50);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("DETALHES DA VAGA", 14, 62);

    autoTable(doc, {
      startY: 66,
      body: [
        ["Setor Solicitante:", req.sectorName],
        ["Cargo / Função:", req.role],
        ["Quantidade de Vagas:", `${req.quantity} vaga(s)`],
        ["Prioridade:", req.priority],
        ["Status Atual:", req.status.replace("_", " ")],
        ["Requisitos / Observações:", req.notes || "Nenhum requisito adicional informado."],
      ],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 55 },
        1: { cellWidth: 125 },
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 140;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("PARECER E APROVAÇÃO DO RECRUTAMENTO", 14, finalY + 15);

    doc.rect(14, finalY + 20, 182, 35);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("[  ] Aprovado para recrutamento      [  ] Reprovado      [  ] Aguardar orçamento", 18, finalY + 28);
    doc.text("Parecer do RH: ___________________________________________________________", 18, finalY + 40);

    doc.setTextColor(0, 0, 0);
    doc.text("__________________________________", 20, finalY + 75);
    doc.text("Assinatura Solicitante", 35, finalY + 80);

    doc.text("__________________________________", 120, finalY + 75);
    doc.text("Assinatura RH / Gerência", 135, finalY + 80);

    doc.save(`Ficha_Vaga_${req.id}.pdf`);
  };

  const handleUpdateVacancyStatus = (id: string, newStatus: HiringRequest["status"]) => {
    setHiringRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  const handleDeleteVacancy = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta solicitação de contratação?")) {
      setHiringRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Zones for filter dropdown
  const uniqueZones = useMemo(() => {
    const set = new Set<string>();
    sectors.forEach((s) => set.add(s.zone));
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

        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={() => handleOpenSectorModal()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition shadow-xs cursor-pointer border border-slate-300"
          >
            <Plus size={16} /> Novo Setor
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow-xs cursor-pointer"
          >
            <Download size={16} /> Exportar PDF
          </button>
          <button
            onClick={() => setShowVacanciesModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition shadow-xs cursor-pointer"
          >
            <FileText size={16} /> Vagas em Aberto ({hiringRequests.filter((r) => r.status !== "PREENCHIDA" && r.status !== "CANCELADA").length})
          </button>
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
            Clique em "⚡ Realocar" ou "Desalocar" em qualquer colaborador para atualizar seu setor.
          </span>
        </div>

        {/* Colaboradores Sem Setor Alocado Card/Section */}
        {unallocatedPersonnel.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <UserX size={20} className="text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-amber-950 text-sm leading-tight">
                    Colaboradores Sem Setor Alocado ({unallocatedPersonnel.length})
                  </h4>
                  <p className="text-xs text-amber-700 font-medium">
                    Estas pessoas foram removidas de um setor ou ainda não possuem setor definido. Elas NÃO contam na lotação dos setores da fábrica.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                {unallocatedPersonnel.length} Não Alocado(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {unallocatedPersonnel
                .filter((emp) =>
                  searchTerm.trim() ? emp.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
                )
                .map((emp) => (
                  <div
                    key={emp.id}
                    className="bg-white p-2.5 rounded-xl border border-amber-200/80 flex items-center justify-between gap-2 shadow-2xs hover:border-amber-300 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
                        {emp.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-slate-800 truncate">{emp.name}</div>
                        <div className="text-[10px] text-amber-700 font-semibold truncate">Sem Setor</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setReallocateUser(emp);
                        setNewTargetSectorId("");
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1"
                      title="Atribuir setor para este colaborador"
                    >
                      <ArrowRightLeft size={12} />
                      <span>Alocar</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sectors.filter((sec) => {
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
                      <button
                        onClick={() => handleOpenSectorModal(sec)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Editar Setor"
                      >
                        <Edit2 size={14} />
                      </button>
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
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition group gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-800 leading-tight group-hover:text-indigo-900 transition truncate">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium truncate">
                              {emp.role || "OPERADOR"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setReallocateUser(emp);
                              setNewTargetSectorId("");
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition shadow-2xs cursor-pointer"
                            title="Realocar operador para outro setor"
                          >
                            <ArrowRightLeft size={12} />
                            <span>Realocar</span>
                          </button>
                          <button
                            onClick={() => handleRemoveFromSector(emp)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-lg transition shadow-2xs cursor-pointer"
                            title="Remover do setor e marcar como Sem Setor"
                          >
                            <UserX size={12} />
                            <span>Desalocar</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Realocar / Remover Funcionário */}
      {reallocateUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft size={20} className="text-indigo-600" />
                Realocar / Desalocar Colaborador
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
                <div className="text-xs text-slate-500 font-medium">Cargo/Setor Atual: {reallocateUser.role || "Operador"}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">Selecione o Novo Setor ou Remova do Setor:</label>
              <select
                value={newTargetSectorId}
                onChange={(e) => setNewTargetSectorId(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Escolha uma Opção --</option>
                <option value="SEM_SETOR">🚫 REMOVER DO SETOR (Manter Sem Setor Alocado)</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name} ({s.zone})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleRemoveFromSector(reallocateUser)}
                className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                title="Remover operador do setor e deixar como Sem Setor"
              >
                <UserX size={14} /> Desalocar do Setor
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReallocateUser(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReallocation}
                  disabled={!newTargetSectorId}
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Check size={16} /> Confirmar
                </button>
              </div>
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
                  {sectors.map((s) => (
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
      {/* Modal: Editar/Adicionar Setor */}
      {isSectorModalOpen && editingSector && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 size={20} className="text-indigo-600" />
                {sectors.some(s => s.id === editingSector.id) ? "Editar Setor" : "Novo Setor"}
              </h3>
              <button
                onClick={() => setIsSectorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSector} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Nome do Setor:</label>
                <input
                  type="text"
                  required
                  value={editingSector.name}
                  onChange={(e) => setEditingSector({ ...editingSector, name: e.target.value })}
                  className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Zona/Localização:</label>
                <input
                  type="text"
                  required
                  value={editingSector.zone}
                  onChange={(e) => setEditingSector({ ...editingSector, zone: e.target.value })}
                  className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Meta de Lotação (Pessoas):</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingSector.recommendedCount}
                    onChange={(e) => setEditingSector({ ...editingSector, recommendedCount: Number(e.target.value) })}
                    className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Ícone (Emoji):</label>
                  <input
                    type="text"
                    required
                    value={editingSector.icon}
                    onChange={(e) => setEditingSector({ ...editingSector, icon: e.target.value })}
                    className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-emerald-900">Meta Diária (R$):</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Ex: 5000"
                    value={editingSector.revenueGoalDaily || ""}
                    onChange={(e) => setEditingSector({ ...editingSector, revenueGoalDaily: Number(e.target.value) })}
                    className="p-2 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900 bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-emerald-900">Meta Semanal (R$):</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Ex: 25000"
                    value={editingSector.revenueGoalWeekly || ""}
                    onChange={(e) => setEditingSector({ ...editingSector, revenueGoalWeekly: Number(e.target.value) })}
                    className="p-2 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900 bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-emerald-900">Custo Operacional/h (R$):</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Ex: 120"
                    value={editingSector.hourlyCost || ""}
                    onChange={(e) => setEditingSector({ ...editingSector, hourlyCost: Number(e.target.value) })}
                    className="p-2 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900 bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Cargos Inclusos (Separados por vírgula):</label>
                <input
                  type="text"
                  value={editingSector.rolesIncluded.join(", ")}
                  onChange={(e) =>
                    setEditingSector({
                      ...editingSector,
                      rolesIncluded: e.target.value.split(",").map((r) => r.trim()).filter(Boolean),
                    })
                  }
                  className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Descrição:</label>
                <textarea
                  rows={2}
                  value={editingSector.description}
                  onChange={(e) => setEditingSector({ ...editingSector, description: e.target.value })}
                  className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {sectors.some(s => s.id === editingSector.id) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSector(editingSector.id)}
                    className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsSectorModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <Check size={16} /> Salvar Setor
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualizar e Imprimir Vagas em Aberto */}
      {showVacanciesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Briefcase size={22} className="text-indigo-600" />
                  Quadro de Vagas em Aberto & Solicitações de Contratação
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Gerencie, imprima fichas individuais e exporte o relatório de recrutamento da fábrica
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVacanciesModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-700">
                Total Registrado: <strong>{hiringRequests.length} solicitações</strong> ({hiringRequests.filter(r => r.status === "EM_ABERTO").length} em aberto)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportVacanciesPDF()}
                  className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Printer size={14} /> Imprimir / Exportar PDF Geral
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVacanciesModal(false);
                    setShowHiringModal(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} /> Nova Solicitação
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[50vh] pr-1">
              {hiringRequests.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Briefcase size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-sm">Nenhuma solicitação de contratação registrada.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {hiringRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-300 transition"
                    >
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 font-mono">
                            {req.id}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {req.role}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              req.priority === "ALTA"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : req.priority === "MEDIA"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            Prioridade {req.priority}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap mt-0.5">
                          <span>Setor: <strong>{req.sectorName}</strong></span>
                          <span>•</span>
                          <span>Vagas: <strong>{req.quantity}</strong></span>
                          <span>•</span>
                          <span>Aberto em: <strong>{req.createdAt}</strong></span>
                        </div>

                        {req.notes && (
                          <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            "{req.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <select
                          value={req.status}
                          onChange={(e) =>
                            handleUpdateVacancyStatus(req.id, e.target.value as any)
                          }
                          className="text-xs font-bold p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
                        >
                          <option value="EM_ABERTO">🟢 Em Aberto</option>
                          <option value="EM_SELECAO">⚡ Em Seleção / RH</option>
                          <option value="PREENCHIDA">✓ Preenchida</option>
                          <option value="CANCELADA">❌ Cancelada</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handlePrintSingleVacancy(req)}
                          className="p-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition font-bold text-xs flex items-center gap-1 cursor-pointer"
                          title="Imprimir Ficha desta Vaga"
                        >
                          <Printer size={14} /> Ficha
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteVacancy(req.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Excluir Vaga"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowVacanciesModal(false)}
                className="px-5 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
