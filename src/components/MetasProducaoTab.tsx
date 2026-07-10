import React, { useState, useMemo, useEffect } from "react";
import { useDatabase } from "../useDatabase";
import {
  Target,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  Sliders,
  RotateCcw,
  Sparkles,
  Calendar,
  Search,
  FileText,
  Download,
  Info,
  Edit2,
  Check,
  DollarSign,
  Percent,
  Lock,
  Users,
  Calculator,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { User, ProductionLog } from "../types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MetasProducaoTabProps {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}

// Map sector ids to human-friendly configurations
interface SectorConfig {
  name: string;
  color: string;
  bg: string;
  border: string;
}

const SECTOR_METADATA: Record<string, SectorConfig> = {
  CORTE_LASER: {
    name: "Corte a Laser",
    color: "indigo",
    bg: "bg-indigo-50/50",
    border: "border-indigo-100",
  },
  PINTURA: {
    name: "Pintura",
    color: "amber",
    bg: "bg-amber-50/50",
    border: "border-amber-100",
  },
  EMBALAGEM: {
    name: "Embalagem",
    color: "green",
    bg: "bg-green-50/50",
    border: "border-green-100",
  },
  MONTAGEM_RETRATIL: {
    name: "Montagem de Retrátil",
    color: "purple",
    bg: "bg-purple-50/50",
    border: "border-purple-100",
  },
  MONTAGEM_RODRIGO: {
    name: "Pendurar Barra Chata",
    color: "pink",
    bg: "bg-pink-50/50",
    border: "border-pink-100",
  },
  PRENSA_EDUARDO: {
    name: "Prensa Eduardo",
    color: "sky",
    bg: "bg-sky-50/50",
    border: "border-sky-100",
  },
  PRENSA_RAFAEL: {
    name: "Prensa Rafael",
    color: "teal",
    bg: "bg-teal-50/50",
    border: "border-teal-100",
  },
  INJETORA: {
    name: "Injetora",
    color: "rose",
    bg: "bg-rose-50/50",
    border: "border-rose-100",
  },
  BANHO_QUIMICO: {
    name: "Banho Químico",
    color: "cyan",
    bg: "bg-cyan-50/50",
    border: "border-cyan-100",
  },
  TORNO_CNC_WILLIAN: {
    name: "Torno CNC Willian",
    color: "blue",
    bg: "bg-blue-50/50",
    border: "border-blue-100",
  },
  TORNO_CNC_HENRIQUE: {
    name: "Torno CNC Henrique",
    color: "violet",
    bg: "bg-violet-50/50",
    border: "border-violet-100",
  },
  FATURAMENTO: {
    name: "Faturamento",
    color: "emerald",
    bg: "bg-emerald-50/50",
    border: "border-emerald-100",
  },
};

export function MetasProducaoTab({ db, currentUser }: MetasProducaoTabProps) {
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [globalMultiplier, setGlobalMultiplier] = useState<number>(1.0); // 100% of average by default
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [customGoalValue, setCustomGoalValue] = useState<string>("");
  const [chartViewMode, setChartViewMode] = useState<"POINTS" | "FINANCIAL">("FINANCIAL");

  // Load production goals settings from Firestore (id: "production_goals")
  const productionGoalsDoc = useMemo(() => {
    return db.systemSettings?.find((s) => s.id === "production_goals") as any || null;
  }, [db.systemSettings]);

  // Active Profit Settings
  const estimatedProfitPct = useMemo(() => {
    if (productionGoalsDoc && productionGoalsDoc.estimatedProfitPct !== undefined) {
      return productionGoalsDoc.estimatedProfitPct;
    }
    try {
      const saved = localStorage.getItem("production_estimated_profit_pct");
      return saved ? parseFloat(saved) : 15;
    } catch {
      return 15;
    }
  }, [productionGoalsDoc]);

  const bonusPoolPctOfProfit = useMemo(() => {
    if (productionGoalsDoc && productionGoalsDoc.bonusPoolPctOfProfit !== undefined) {
      return productionGoalsDoc.bonusPoolPctOfProfit;
    }
    try {
      const saved = localStorage.getItem("production_bonus_pool_pct");
      return saved ? parseFloat(saved) : 10;
    } catch {
      return 10;
    }
  }, [productionGoalsDoc]);

  // Active Sector Goal Overrides (Static Goals defined by management)
  const sectorOverrides = useMemo<Record<string, number>>(() => {
    if (productionGoalsDoc && productionGoalsDoc.sectorGoals !== undefined) {
      return productionGoalsDoc.sectorGoals;
    }
    try {
      const saved = localStorage.getItem("production_sector_goals_overrides");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }, [productionGoalsDoc]);

  // Active Goal Period Type (MENSAL or SEMANAL)
  const goalPeriodType = useMemo<"MENSAL" | "SEMANAL">(() => {
    if (productionGoalsDoc && productionGoalsDoc.goalPeriodType !== undefined) {
      return productionGoalsDoc.goalPeriodType;
    }
    try {
      const saved = localStorage.getItem("production_goal_period_type");
      return (saved === "SEMANAL" ? "SEMANAL" : "MENSAL") as "MENSAL" | "SEMANAL";
    } catch {
      return "MENSAL";
    }
  }, [productionGoalsDoc]);

  // Active Faturamento Goal for calculations
  const activeFaturamentoGoal = useMemo<number>(() => {
    if (productionGoalsDoc && productionGoalsDoc.faturamentoGoal !== undefined) {
      return productionGoalsDoc.faturamentoGoal;
    }
    try {
      const saved = localStorage.getItem("production_faturamento_goal");
      return saved ? parseFloat(saved) : 100000;
    } catch {
      return 100000;
    }
  }, [productionGoalsDoc]);

  // Timestamp when goals were defined
  const goalsDefinedAt = useMemo<number | null>(() => {
    return productionGoalsDoc?.definedAt || null;
  }, [productionGoalsDoc]);

  // Temporary editing states (static adjustments waiting to be explicitly accepted)
  const [tempProfitPct, setTempProfitPct] = useState<number>(estimatedProfitPct);
  const [tempBonusPct, setTempBonusPct] = useState<number>(bonusPoolPctOfProfit);
  const [tempSectorGoals, setTempSectorGoals] = useState<Record<string, number>>(sectorOverrides);
  const [tempPeriodType, setTempPeriodType] = useState<"MENSAL" | "SEMANAL">(goalPeriodType);
  const [tempFaturamentoGoal, setTempFaturamentoGoal] = useState<number>(activeFaturamentoGoal);

  // Sync temporary states when active settings change (e.g. database loads)
  useEffect(() => {
    setTempProfitPct(estimatedProfitPct);
    setTempBonusPct(bonusPoolPctOfProfit);
    setTempSectorGoals(sectorOverrides);
    setTempPeriodType(goalPeriodType);
    setTempFaturamentoGoal(activeFaturamentoGoal);
  }, [estimatedProfitPct, bonusPoolPctOfProfit, sectorOverrides, goalPeriodType, activeFaturamentoGoal]);

  const [isSavingProfit, setIsSavingProfit] = useState(false);
  const handleAcceptProfitAdjustment = async () => {
    setIsSavingProfit(true);
    try {
      localStorage.setItem("production_estimated_profit_pct", tempProfitPct.toString());
      localStorage.setItem("production_bonus_pool_pct", tempBonusPct.toString());

      await db.saveSystemSettings({
        id: "production_goals",
        estimatedProfitPct: tempProfitPct,
        bonusPoolPctOfProfit: tempBonusPct,
        sectorGoals: sectorOverrides,
        goalPeriodType: goalPeriodType,
        faturamentoGoal: activeFaturamentoGoal,
        definedAt: goalsDefinedAt || Date.now(),
      } as any);

      alert("Ajuste de distribuição do lucro aceito com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar ajuste de lucro no servidor, mas as alterações foram salvas localmente.");
    } finally {
      setIsSavingProfit(false);
    }
  };

  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const handleAcceptGoalsAdjustment = async (customSectorsGoals?: Record<string, number>, customPeriod?: "MENSAL" | "SEMANAL", customFaturamento?: number) => {
    setIsSavingGoals(true);
    const targetSectorGoals = customSectorsGoals || tempSectorGoals;
    const targetPeriod = customPeriod || tempPeriodType;
    const targetFaturamento = customFaturamento !== undefined ? customFaturamento : tempFaturamentoGoal;

    try {
      localStorage.setItem("production_sector_goals_overrides", JSON.stringify(targetSectorGoals));
      localStorage.setItem("production_goal_period_type", targetPeriod);
      localStorage.setItem("production_faturamento_goal", targetFaturamento.toString());

      // Save to Firebase
      await db.saveSystemSettings({
        id: "production_goals",
        estimatedProfitPct: estimatedProfitPct,
        bonusPoolPctOfProfit: bonusPoolPctOfProfit,
        sectorGoals: targetSectorGoals,
        goalPeriodType: targetPeriod,
        faturamentoGoal: targetFaturamento,
        definedAt: Date.now(),
      } as any);

      // If period is monthly, sync faturamento goal to general monthly billing goal!
      if (targetPeriod === "MENSAL") {
        const defaultSettings = db.systemSettings?.[0] || { id: "default" };
        await db.saveSystemSettings({
          ...defaultSettings,
          monthlyBillingGoal: targetFaturamento,
        });
      }

      alert(`Ajuste de metas aceito com sucesso! Metas definidas como estáticas para o período ${targetPeriod === "MENSAL" ? "Mensal" : "Semanal"}.`);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar ajuste de metas no servidor, mas as alterações foram salvas localmente.");
    } finally {
      setIsSavingGoals(false);
    }
  };

  // Date Filter states
  const [filterDate, setFilterDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const selectedDateObj = useMemo(() => {
    if (!filterDate) return new Date();
    const [year, month, day] = filterDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [filterDate]);

  const targetDayStart = useMemo(() => {
    return new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate()).getTime();
  }, [selectedDateObj]);

  const targetDayEnd = useMemo(() => {
    return targetDayStart + 24 * 60 * 60 * 1000 - 1;
  }, [targetDayStart]);

  const periodStart = useMemo(() => {
    return targetDayStart - periodDays * 24 * 60 * 60 * 1000;
  }, [targetDayStart, periodDays]);

  // Billing Goal Simulator states (we default input to the active confirmed goal)
  const [billingGoalInput, setBillingGoalInput] = useState<string>(activeFaturamentoGoal.toString());
  const [billingPeriod, setBillingPeriod] = useState<"DIARIA" | "SEMANAL" | "MENSAL">("MENSAL");

  // Keep billing goal input synced with active faturamento goal if user hasn't edited it
  useEffect(() => {
    setBillingGoalInput(activeFaturamentoGoal.toString());
  }, [activeFaturamentoGoal]);

  // Compute points and details helper: 1 point = R$ 500
  const getLogStats = useMemo(() => {
    return (log: ProductionLog) => {
      const qty =
        (log.quantityProcessed || 0) +
        (log.quantityCut || 0) +
        (log.quantityPainted || 0) +
        (log.quantityPacked || 0) +
        (log.quantityInvoiced || 0);

      let itemId = log.itemId;
      let partName = log.customProductName || "";

      if (!itemId && log.orderId) {
        if (log.type === "CORTE_LASER") {
          const nestTask = db.nestTasks?.find((t) => t.id === log.orderId);
          if (nestTask) {
            const itemsWithSameName = db.items?.filter((i) =>
              i.name.toLowerCase().includes(nestTask.partName.toLowerCase())
            );
            itemId = itemsWithSameName?.[0]?.id;
            partName = nestTask.partName;
          }
        } else {
          const order = db.orders?.find((o) => o.id === log.orderId);
          if (order) {
            itemId = order.itemId;
          }
        }
      }

      const order = log.orderId ? db.orders?.find((o) => o.id === log.orderId) : null;
      const item = itemId ? db.items?.find((i) => i.id === itemId) : null;
      const price = order?.unitPrice || item?.basePrice || 50;
      
      const producedValue = qty * price;
      const totalPoints = producedValue / 500;
      const itemName = item?.name || partName || "Peça/Serviço Avulso";

      // Detect sector
      let sectorId: string = log.type || "PRODUCAO";

      if (log.operatorId && log.operatorId.startsWith("solda - ")) {
        const parts = log.operatorId.split(" - ");
        if (parts[1]) {
          sectorId = `SOLDA_${parts[1].trim().toUpperCase()}`;
        } else {
          sectorId = "SOLDA_GERAL";
        }
      } else if (log.operatorId === "solda") {
        sectorId = "SOLDA_GERAL";
      } else if (log.operatorId === "corte_laser" || log.type === "CORTE_LASER") {
        sectorId = "CORTE_LASER";
      } else if (log.operatorId === "pintura" || log.type === "PINTURA") {
        sectorId = "PINTURA";
      } else if (log.operatorId === "embalagem" || log.type === "EMBALAGEM") {
        sectorId = "EMBALAGEM";
      } else if (log.operatorId === "montagem_retratil") {
        sectorId = "MONTAGEM_RETRATIL";
      } else if (log.operatorId === "montagem_rodrigo") {
        sectorId = "MONTAGEM_RODRIGO";
      } else if (log.operatorId === "prensa_eduardo" || log.type === "PRENSA_EDUARDO") {
        sectorId = "PRENSA_EDUARDO";
      } else if (log.operatorId === "prensa_rafael" || log.type === "PRENSA_RAFAEL") {
        sectorId = "PRENSA_RAFAEL";
      } else if (log.operatorId === "injetora" || log.type === "INJETORA") {
        sectorId = "INJETORA";
      } else if (log.operatorId === "banho_quimico" || log.type === "BANHO_QUIMICO") {
        sectorId = "BANHO_QUIMICO";
      } else if (log.operatorId === "torno_cnc_willian" || log.type === "TORNO_CNC_WILLIAN") {
        sectorId = "TORNO_CNC_WILLIAN";
      } else if (log.operatorId === "torno_cnc_henrique" || log.type === "TORNO_CNC_HENRIQUE") {
        sectorId = "TORNO_CNC_HENRIQUE";
      }

      let sectorName = SECTOR_METADATA[sectorId]?.name || "Montagem/Produção Geral";
      
      if (sectorId.startsWith("SOLDA_") && sectorId !== "SOLDA_GERAL") {
        const parts = log.operatorId?.split(" - ") || [];
        sectorName = `Solda - ${parts[1] ? parts[1].trim() : "Desconhecido"}`;
      }

      return {
        qty,
        points: totalPoints,
        pointsPerUnit: price / 500,
        itemName,
        sectorId,
        sectorName,
      };
    };
  }, [db.items, db.orders, db.nestTasks]);

  // Calculate log billing value helper
  const getLogBillingValue = useMemo(() => {
    return (log: ProductionLog) => {
      let itemId = log.itemId;
      if (!itemId && log.orderId) {
        if (log.type === "CORTE_LASER") {
          const nestTask = db.nestTasks?.find((t) => t.id === log.orderId);
          if (nestTask) {
            const itemsWithSameName = db.items?.filter((i) =>
              i.name.toLowerCase().includes(nestTask.partName.toLowerCase())
            );
            itemId = itemsWithSameName?.[0]?.id;
          }
        } else {
          const order = db.orders?.find((o) => o.id === log.orderId);
          if (order) {
            itemId = order.itemId;
          }
        }
      }

      const order = log.orderId ? db.orders?.find((o) => o.id === log.orderId) : null;
      const item = itemId ? db.items?.find((i) => i.id === itemId) : null;
      const price = order?.unitPrice || item?.basePrice || 50;

      const qty =
        (log.quantityInvoiced || 0) ||
        (log.quantityProcessed || 0) ||
        (log.quantityCut || 0) ||
        (log.quantityPainted || 0) ||
        (log.quantityPacked || 0);

      return qty * price;
    };
  }, [db.items, db.orders, db.nestTasks]);

  // Compute ranges for day, week, and month of the selected date
  const dateRanges = useMemo(() => {
    const getDayRange = (d: Date) => {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const end = start + 24 * 60 * 60 * 1000 - 1;
      return { start, end };
    };

    const getWeekRange = (d: Date) => {
      const startOfWeek = new Date(d);
      const day = startOfWeek.getDay();
      // Adjust so Monday is first day of the week
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(startOfWeek.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      return { start: monday.getTime(), end: sunday.getTime() };
    };

    const getMonthRange = (d: Date) => {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { start: firstDay, end: lastDay };
    };

    return {
      day: getDayRange(selectedDateObj),
      week: getWeekRange(selectedDateObj),
      month: getMonthRange(selectedDateObj),
    };
  }, [selectedDateObj]);

  // Aggregate logs into Sectors for (1) baseline period, (2) target day, and (3) current Week or Month
  const metrics = useMemo(() => {
    const baselineBySector: Record<string, { totalQty: number; totalPoints: number; dates: Set<string>; name: string }> = {};
    const todayBySector: Record<string, { totalQty: number; totalPoints: number; name: string; logs: any[] }> = {};
    const periodBySector: Record<string, { totalQty: number; totalPoints: number }> = {};

    const targetPeriodRange = goalPeriodType === "MENSAL" ? dateRanges.month : dateRanges.week;

    // Determine active employees to initialize empty welder sectors and filter out old ones
    const activeEmployees = db.employees?.filter(e => e.isActive) || [];
    const activeWelders = activeEmployees.filter(e => {
      const sec = db.sectors?.find(s => s.id === e.sectorId);
      return sec?.name.toLowerCase().includes("solda") || e.name.toLowerCase().includes("solda");
    });

    // Initialize all default metadata sectors in baseline so they show in dashboard
    Object.keys(SECTOR_METADATA).forEach((sId) => {
      baselineBySector[sId] = {
        totalQty: 0,
        totalPoints: 0,
        dates: new Set(),
        name: SECTOR_METADATA[sId].name,
      };
    });

    // Initialize active welders so they can have goals even without logs
    activeWelders.forEach((welder) => {
      const sId = `SOLDA_${welder.name.trim().toUpperCase()}`;
      if (!baselineBySector[sId]) {
        baselineBySector[sId] = {
          totalQty: 0,
          totalPoints: 0,
          dates: new Set(),
          name: `Solda - ${welder.name.trim()}`,
        };
      }
    });

    db.logs.forEach((log) => {
      const stats = getLogStats(log);
      if (stats.qty <= 0) return;

      const sId = stats.sectorId;

      // Filter out logs for welders that are no longer active/exist
      if (sId.startsWith("SOLDA_") && sId !== "SOLDA_GERAL") {
        const welderNameUpper = sId.replace("SOLDA_", "");
        const isActiveEmployee = activeEmployees.some(w => w.name.trim().toUpperCase() === welderNameUpper);
        if (!isActiveEmployee) {
          return; // Skip this log so the inactive/deleted employee doesn't appear in metrics
        }
      }

      // 1. Process logs in the selected baseline period
      if (log.timestamp >= periodStart && log.timestamp < targetDayStart) {
        const dateStr = new Date(log.timestamp).toDateString();
        if (!baselineBySector[sId]) {
          baselineBySector[sId] = {
            totalQty: 0,
            totalPoints: 0,
            dates: new Set(),
            name: stats.sectorName,
          };
        }
        baselineBySector[sId].totalQty += stats.qty;
        baselineBySector[sId].totalPoints += stats.points;
        baselineBySector[sId].dates.add(dateStr);
      }

      // 2. Process logs from target selected day
      if (log.timestamp >= targetDayStart && log.timestamp <= targetDayEnd) {
        if (!todayBySector[sId]) {
          todayBySector[sId] = {
            totalQty: 0,
            totalPoints: 0,
            name: stats.sectorName,
            logs: [],
          };
        }
        todayBySector[sId].totalQty += stats.qty;
        todayBySector[sId].totalPoints += stats.points;
        todayBySector[sId].logs.push({
          id: log.id,
          timestamp: log.timestamp,
          operatorId: log.operatorId,
          qty: stats.qty,
          points: stats.points,
          itemName: stats.itemName,
        });
      }

      // 3. Current Period (Week or Month) logs
      if (log.timestamp >= targetPeriodRange.start && log.timestamp <= targetPeriodRange.end) {
        if (!periodBySector[sId]) {
          periodBySector[sId] = {
            totalQty: 0,
            totalPoints: 0,
          };
        }
        periodBySector[sId].totalQty += stats.qty;
        periodBySector[sId].totalPoints += stats.points;
      }
    });

    const multiplierFactor = goalPeriodType === "MENSAL" ? 26 : 6;

    // Create consolidated sector dashboard list
    const sectorsList = Object.keys(baselineBySector).map((sId) => {
      const base = baselineBySector[sId];
      const today = todayBySector[sId] || { totalQty: 0, totalPoints: 0, logs: [] };
      const period = periodBySector[sId] || { totalQty: 0, totalPoints: 0 };

      // Divisor represents either the number of active production days with logs,
      // or standard days excluding Sundays (approx 26 for 30 days) if empty
      const activeDays = base.dates.size;
      const divisor = activeDays || Math.max(1, Math.round(periodDays * 0.85)); // estimation of working days

      const avgDailyQty = base.totalQty / divisor;
      const avgDailyPoints = base.totalPoints / divisor;

      // Base suggested goal based on the general multiplier
      const suggestedDailyPointsGoal = avgDailyPoints * globalMultiplier;
      const suggestedPeriodGoal = suggestedDailyPointsGoal * multiplierFactor;

      // Check for custom override
      const isCustomGoal = sectorOverrides[sId] !== undefined;
      const finalPeriodGoal = isCustomGoal ? sectorOverrides[sId] : suggestedPeriodGoal;
      const finalDailyPointsGoal = finalPeriodGoal / multiplierFactor;

      // Qty targets
      const finalPeriodQtyGoal = avgDailyQty * multiplierFactor * (finalPeriodGoal / (suggestedPeriodGoal || 1));
      const finalDailyQtyGoal = finalPeriodQtyGoal / multiplierFactor;

      // Progress percentages
      const pointsProgressPct = finalDailyPointsGoal > 0 ? (today.totalPoints / finalDailyPointsGoal) * 100 : 0;
      const qtyProgressPct = finalDailyQtyGoal > 0 ? (today.totalQty / finalDailyQtyGoal) * 100 : 0;

      // Period Progress percentage
      const periodPointsProgressPct = finalPeriodGoal > 0 ? (period.totalPoints / finalPeriodGoal) * 100 : 0;

      return {
        id: sId,
        name: base.name,
        activeDays,
        avgDailyQty,
        avgDailyPoints,
        suggestedDailyPointsGoal,
        suggestedPeriodGoal,
        finalPointsGoal: finalDailyPointsGoal,
        finalQtyGoal: finalDailyQtyGoal,
        finalPeriodGoal,
        finalPeriodQtyGoal,
        todayQty: today.totalQty,
        todayPoints: today.totalPoints,
        todayLogs: today.logs,
        periodQty: period.totalQty,
        periodPoints: period.totalPoints,
        pointsProgressPct,
        qtyProgressPct,
        periodPointsProgressPct,
        isCustomGoal,
        metadata: SECTOR_METADATA[sId] || {
          name: base.name,
          color: "blue",
          bg: "bg-blue-50/50",
          border: "border-blue-100",
        },
      };
    });

    return sectorsList;
  }, [db.logs, db.employees, db.sectors, periodDays, globalMultiplier, getLogStats, sectorOverrides, targetDayStart, targetDayEnd, periodStart, goalPeriodType, dateRanges]);

  // Compute daily totals for the timeline chart, compiling faturamento & producedValue
  const timelineData = useMemo(() => {
    const daysMap: Record<string, { dateLabel: string; pontos: number; pecas: number; faturamento: number; produzidoVal: number; rawTime: number }> = {};

    // Initialize all past calendar days leading to the selected day
    for (let i = periodDays; i >= 0; i--) {
      const d = new Date(targetDayStart - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const key = d.toDateString();
      daysMap[key] = {
        dateLabel: label,
        pontos: 0,
        pecas: 0,
        faturamento: 0,
        produzidoVal: 0,
        rawTime: d.getTime(),
      };
    }

    db.logs.forEach((log) => {
      if (log.timestamp >= periodStart && log.timestamp <= targetDayEnd) {
        const stats = getLogStats(log);
        if (stats.qty <= 0) return;

        const key = new Date(log.timestamp).toDateString();
        if (daysMap[key]) {
          daysMap[key].pontos += Math.round(stats.points);
          daysMap[key].pecas += stats.qty;
          
          const val = getLogBillingValue(log);
          if (log.type === "FATURAMENTO") {
            daysMap[key].faturamento += val;
          }
          // Produced value = points * 500
          daysMap[key].produzidoVal += stats.points * 500;
        }
      }
    });

    return Object.values(daysMap).sort((a, b) => a.rawTime - b.rawTime);
  }, [db.logs, periodDays, periodStart, targetDayEnd, getLogStats, getLogBillingValue, targetDayStart]);

  // Totals for reference date across ALL sectors
  const totalPointsGoal = useMemo(() => {
    return metrics.reduce((sum, curr) => sum + curr.finalPointsGoal, 0);
  }, [metrics]);

  const totalPointsToday = useMemo(() => {
    return metrics.reduce((sum, curr) => sum + curr.todayPoints, 0);
  }, [metrics]);

  const totalQtyToday = useMemo(() => {
    return metrics.reduce((sum, curr) => sum + curr.todayQty, 0);
  }, [metrics]);

  const generalProgressPct = totalPointsGoal > 0 ? (totalPointsToday / totalPointsGoal) * 100 : 0;

  // Filter sectors list based on search bar
  const filteredSectors = useMemo(() => {
    return metrics.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [metrics, searchQuery]);

  // List of all contribution logs from today/reference date
  const todayLogsList = useMemo(() => {
    const all: any[] = [];
    metrics.forEach((s) => {
      s.todayLogs.forEach((l) => {
        all.push({
          ...l,
          sectorName: s.name,
          colorTheme: s.metadata.color,
        });
      });
    });
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }, [metrics]);

  // Aggregate billing across selected ranges
  const billingSummary = useMemo(() => {
    let billedDay = 0;
    let billedWeek = 0;
    let billedMonth = 0;

    let producedDay = 0;
    let producedWeek = 0;
    let producedMonth = 0;

    db.logs.forEach((log) => {
      const val = getLogBillingValue(log);
      if (val <= 0) return;

      const isFaturamento = log.type === "FATURAMENTO";

      // Day check
      if (log.timestamp >= dateRanges.day.start && log.timestamp <= dateRanges.day.end) {
        if (isFaturamento) billedDay += val;
        producedDay += val;
      }

      // Week check
      if (log.timestamp >= dateRanges.week.start && log.timestamp <= dateRanges.week.end) {
        if (isFaturamento) billedWeek += val;
        producedWeek += val;
      }

      // Month check
      if (log.timestamp >= dateRanges.month.start && log.timestamp <= dateRanges.month.end) {
        if (isFaturamento) billedMonth += val;
        producedMonth += val;
      }
    });

    // Fall back to produced value if no faturamento logs are registered to prevent empty UI
    return {
      day: billedDay || producedDay,
      week: billedWeek || producedWeek,
      month: billedMonth || producedMonth,
      realBilledDay: billedDay,
      realBilledWeek: billedWeek,
      realBilledMonth: billedMonth,
      producedDay,
      producedWeek,
      producedMonth,
    };
  }, [db.logs, dateRanges, getLogBillingValue]);

  // Active employees list
  const activeEmployees = useMemo(() => {
    return db.employees?.filter((e) => e.isActive) || [];
  }, [db.employees]);

  // Billing Goal Calculation:
  // Enter R$ billing value -> calculates required point goals per sector
  const billingGoalPointsCalculated = useMemo(() => {
    const goalVal = parseFloat(billingGoalInput);
    if (isNaN(goalVal) || goalVal <= 0) return null;

    // Days in period
    const daysInPeriod = billingPeriod === "DIARIA" ? 1 : (billingPeriod === "SEMANAL" ? 6 : 26);
    const dailyBillingGoalNeeded = goalVal / daysInPeriod;

    // Calculate overall historical billing & points during the baseline period
    let totalBilledBaseline = 0;
    let totalPointsBaseline = 0;

    db.logs.forEach((log) => {
      if (log.timestamp >= periodStart && log.timestamp < targetDayStart) {
        totalBilledBaseline += getLogBillingValue(log);
        const stats = getLogStats(log);
        totalPointsBaseline += stats.points;
      }
    });

    // Ensure we have a valid baseline ratio, fall back to a reasonable 10 BRL per 1 point if empty
    const baselineRatio = totalBilledBaseline > 0 ? (totalPointsBaseline / totalBilledBaseline) : 0.1;

    // Total daily points needed across all sectors
    const totalDailyPointsNeeded = dailyBillingGoalNeeded * baselineRatio;

    // Calculate each sector's share based on its baseline points average
    const totalAvgPoints = metrics.reduce((sum, s) => sum + s.avgDailyPoints, 0);

    const calculatedSectors = metrics.map((s) => {
      const share = totalAvgPoints > 0 ? (s.avgDailyPoints / totalAvgPoints) : (1 / metrics.length);
      const pointsGoal = totalDailyPointsNeeded * share;
      const piecesGoal = s.avgDailyPoints > 0 ? (s.avgDailyQty * (pointsGoal / s.avgDailyPoints)) : 0;

      return {
        sectorId: s.id,
        name: s.name,
        pointsGoal,
        piecesGoal,
      };
    });

    return {
      totalDailyPointsNeeded,
      totalDailyPiecesNeeded: calculatedSectors.reduce((sum, s) => sum + s.piecesGoal, 0),
      calculatedSectors,
    };
  }, [billingGoalInput, billingPeriod, db.logs, periodStart, targetDayStart, getLogBillingValue, getLogStats, metrics]);

  // Export options
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Metas de Producao por Setor - Relatorio Geral", 14, 15);
    doc.setFontSize(10);
    doc.text(`Data de Referencia: ${selectedDateObj.toLocaleDateString("pt-BR")} | Base de Calculo: Ultimos ${periodDays} dias`, 14, 21);
    doc.text(`Multiplicador Geral: ${(globalMultiplier * 100).toFixed(0)}% | Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 26);

    const tableData = metrics.map((s) => [
      s.name,
      Math.round(s.avgDailyPoints).toString(),
      Math.round(s.finalPointsGoal).toString(),
      Math.round(s.todayPoints).toString(),
      `${s.pointsProgressPct.toFixed(1)}%`,
      s.todayPoints >= s.finalPointsGoal && s.finalPointsGoal > 0 ? "Sim" : "Nao",
      s.todayQty.toString(),
    ]);

    autoTable(doc, {
      startY: 32,
      head: [["Setor", "Media Pontos/Dia", "Meta Pontos Ref", "Pontos Produzidos", "Progresso %", "Atingiu Meta?", "Pecas Produzidas"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`metas_producao_${filterDate}.pdf`);
  };

  const exportCSV = () => {
    let csv = "\uFEFF"; // UTF-8 BOM
    csv += "Setor,Media Pontos Diaria,Meta Pontos Ref,Pontos Produzidos Ref,Progresso %,Atingiu Meta?,Pecas Produzidas Ref\n";
    metrics.forEach((s) => {
      const atingiu = s.todayPoints >= s.finalPointsGoal && s.finalPointsGoal > 0 ? "Sim" : "Nao";
      csv += `"${s.name}",${Math.round(s.avgDailyPoints)},${Math.round(s.finalPointsGoal)},${Math.round(s.todayPoints)},"${s.pointsProgressPct.toFixed(1)}%","${atingiu}",${s.todayQty}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `metas_producao_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="metas-producao-tab-root">
      {/* Informative Header card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 sm:p-6 rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="text-yellow-300 fill-yellow-300" size={20} />
              Metas Dinâmicas de Produção por Setor
            </h3>
            <p className="text-xs text-blue-100 max-w-2xl">
              Este painel calcula a média diária real de produção de cada setor nos últimos <strong>{periodDays} dias</strong> (olhando para os <strong>pontos</strong> de fabricação de cada item) e estabelece uma meta ideal. Você pode aplicar multiplicadores gerais ou customizar a meta de cada setor individualmente.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={exportPDF}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <FileText size={14} /> PDF
            </button>
            <button
              onClick={exportCSV}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <Download size={14} /> Planilha
            </button>
          </div>
        </div>

        {/* Dynamic controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-white/10">
          {/* Reference Date selection */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-blue-200 flex items-center gap-1">
              <Calendar size={12} /> Data de Referência
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-white/40 cursor-pointer"
            />
          </div>

          {/* Base days selection */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-blue-200 flex items-center gap-1">
              <Activity size={12} /> Período Base de Análise
            </label>
            <div className="flex rounded-lg overflow-hidden bg-white/10 p-0.5">
              {[7, 15, 30, 60].map((days) => (
                <button
                  key={days}
                  onClick={() => setPeriodDays(days)}
                  className={`flex-1 text-center py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    periodDays === days ? "bg-white text-blue-900 font-bold" : "text-white hover:bg-white/5"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* General Multiplier slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-wider font-bold text-blue-200 flex items-center gap-1">
                <Sliders size={12} /> Desafio / Multiplicador Geral
              </label>
              <span className="text-xs font-bold text-yellow-300">
                {(globalMultiplier * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={globalMultiplier}
                onChange={(e) => setGlobalMultiplier(parseFloat(e.target.value))}
                className="w-full accent-yellow-400 h-1.5 bg-white/20 rounded-lg cursor-pointer"
              />
              <button
                onClick={() => setGlobalMultiplier(1.0)}
                title="Resetar para 100%"
                className="text-white/60 hover:text-white p-1 transition cursor-pointer"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-blue-200 flex items-center gap-1">
              <Search size={12} /> Filtrar Setor
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 text-blue-200" size={14} />
              <input
                type="text"
                placeholder="Buscar setor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-blue-200 focus:outline-hidden focus:border-white/40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Global Status Overview Bento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Points Today Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-gray-400">Pontuação no Dia</span>
              <div className="text-2xl font-bold text-indigo-600 flex items-baseline gap-1">
                {Math.round(totalPointsToday)}
                <span className="text-xs font-normal text-gray-500">pts</span>
              </div>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Activity size={18} />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
            <span>Meta do Dia: {Math.round(totalPointsGoal)} pts</span>
            <span className="font-semibold text-indigo-600">
              {generalProgressPct >= 100 ? "Meta Batida!" : `${generalProgressPct.toFixed(0)}%`}
            </span>
          </div>
        </div>

        {/* Total Pieces Today Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-gray-400">Total Peças no Dia</span>
              <div className="text-2xl font-bold text-emerald-600 flex items-baseline gap-1">
                {totalQtyToday}
                <span className="text-xs font-normal text-gray-500">unids</span>
              </div>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-50 text-xs text-gray-500">
            Produção na data de referência
          </div>
        </div>

        {/* Global Progress Bar Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs md:col-span-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-gray-400">Progresso Geral das Metas</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                generalProgressPct >= 100 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
              }`}>
                {generalProgressPct.toFixed(1)}%
              </span>
            </div>
            {/* Elegant multi-color progress track */}
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden relative mt-1">
              <div
                className={`h-full transition-all duration-500 ease-out rounded-full ${
                  generalProgressPct >= 100
                    ? "bg-gradient-to-r from-emerald-500 to-green-600"
                    : generalProgressPct >= 50
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                    : "bg-gradient-to-r from-amber-400 to-orange-500"
                }`}
                style={{ width: `${Math.min(100, generalProgressPct)}%` }}
              />
            </div>
          </div>
          <div className="pt-2 text-[11px] text-gray-500 flex items-center gap-1">
            <Info size={12} className="text-blue-500" />
            <span>Média calculada sobre {periodDays} dias úteis com atividade.</span>
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLE DA GERÊNCIA (ESTÁTICO & LOCKED FIELD FLOWS) */}
      {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.role === "PCP") ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-900 text-white rounded-lg">
                <Sliders size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">⚙️ Painel do Gestor (Configuração de Metas e Lucro)</h4>
                <p className="text-xs text-gray-400">Os valores abaixo são estáticos. Ajuste os sliders/valores e clique em "Aceitar Ajuste" para fixar as decisões de faturamento e divisões.</p>
              </div>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border border-indigo-100">
              Controle Estático
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Margins & profit static definitions */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
              <div>
                <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  💼 Distribuição de Lucro e Premiação
                </h5>
                <p className="text-[10px] text-gray-500">Defina os percentuais fixos de lucratividade e fundo de prêmios. Clique em "Aceitar Ajuste de Lucro" para salvar.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Profit margin */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-100 shadow-xs">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                      Margem Lucro Est.
                    </label>
                    <span className="text-xs font-bold text-emerald-600">{tempProfitPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={tempProfitPct}
                    onChange={(e) => setTempProfitPct(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-1 cursor-pointer"
                  />
                  <div className="text-[9px] text-gray-400 mt-1 flex justify-between">
                    <span>Ativo: {estimatedProfitPct}%</span>
                    <span>Ajustando</span>
                  </div>
                </div>

                {/* Bonus pool */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-100 shadow-xs">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                      % Prêmios / Lucro
                    </label>
                    <span className="text-xs font-bold text-indigo-600">{tempBonusPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={tempBonusPct}
                    onChange={(e) => setTempBonusPct(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1 cursor-pointer"
                  />
                  <div className="text-[9px] text-gray-400 mt-1 flex justify-between">
                    <span>Ativo: {bonusPoolPctOfProfit}%</span>
                    <span>Ajustando</span>
                  </div>
                </div>
              </div>

              {/* Confirm button */}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleAcceptProfitAdjustment}
                  disabled={isSavingProfit}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Check size={14} /> {isSavingProfit ? "Salvando..." : "Aceitar Ajuste de Lucro"}
                </button>
              </div>

              {/* Live static table */}
              <div className="overflow-x-auto bg-white p-3 rounded-lg border border-slate-100">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-[9px] font-bold uppercase text-gray-400">
                      <th className="pb-2">Período</th>
                      <th className="pb-2 text-right">Faturado</th>
                      <th className="pb-2 text-right">Lucro Est.</th>
                      <th className="pb-2 text-right text-indigo-600">Fundo Prêmios</th>
                      <th className="pb-2 text-right text-emerald-600">Por Colab.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600">
                    <tr>
                      <td className="py-1.5 font-medium text-gray-800">Mês Selecionado</td>
                      <td className="py-1.5 text-right">R$ {billingSummary.month.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5 text-right">R$ {(billingSummary.month * (estimatedProfitPct / 100)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5 text-right font-semibold text-indigo-700">R$ {(billingSummary.month * (estimatedProfitPct / 100) * (bonusPoolPctOfProfit / 100)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5 text-right font-bold text-emerald-700">
                        R$ {activeEmployees.length > 0 ? ((billingSummary.month * (estimatedProfitPct / 100) * (bonusPoolPctOfProfit / 100)) / activeEmployees.length).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 font-medium text-gray-800">Esta Semana</td>
                      <td className="py-1.5 text-right">R$ {billingSummary.week.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5 text-right">R$ {(billingSummary.week * (estimatedProfitPct / 100)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5 text-right font-semibold text-indigo-700">R$ {(billingSummary.week * (estimatedProfitPct / 100) * (bonusPoolPctOfProfit / 100)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5 text-right font-bold text-emerald-700">
                        R$ {activeEmployees.length > 0 ? ((billingSummary.week * (estimatedProfitPct / 100) * (bonusPoolPctOfProfit / 100)) / activeEmployees.length).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Static Goal Definitions */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    ⚙️ Definir Metas Estáticas dos Setores
                  </h5>
                  <p className="text-[10px] text-gray-500">Defina o objetivo fixo de pontos para o período (Mês/Semana). O histórico apoia a decisão.</p>
                </div>
                
                {/* Period selection */}
                <div className="flex bg-slate-200/80 rounded-lg p-0.5 self-start">
                  {(["MENSAL", "SEMANAL"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTempPeriodType(p)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${
                        tempPeriodType === p ? "bg-white text-blue-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {p === "MENSAL" ? "Mensal (26d)" : "Semanal (6d)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Faturamento Goal Input */}
              <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Faturamento Alvo do Período</label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                    <span className="text-gray-400 text-xs">R$</span>
                  </div>
                  <input
                    type="number"
                    value={tempFaturamentoGoal}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTempFaturamentoGoal(isNaN(val) ? 0 : val);
                    }}
                    className="w-full border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Grid of Sector Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                {metrics.map((s) => {
                  const histPoints = Math.round(s.avgDailyPoints * (tempPeriodType === "MENSAL" ? 26 : 6));
                  const histValue = histPoints * 500;
                  const currentTempGoal = tempSectorGoals[s.id] !== undefined 
                    ? tempSectorGoals[s.id] 
                    : Math.round(s.suggestedPeriodGoal);

                  return (
                    <div key={s.id} className="p-2 bg-white rounded-lg border border-slate-100 flex flex-col justify-between gap-1 shadow-xs">
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-[10px] text-slate-700 truncate max-w-[120px]">{s.name}</span>
                        <span className="text-[9px] text-slate-400 whitespace-nowrap">Histórico: {histPoints} pts</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={currentTempGoal}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setTempSectorGoals({
                                ...tempSectorGoals,
                                [s.id]: isNaN(val) ? 0 : val
                              });
                            }}
                            className="w-full text-xs border border-slate-200 rounded-md p-0.5 px-1 font-semibold focus:outline-hidden focus:border-blue-400"
                            placeholder="Pontos..."
                          />
                          <span className="text-[9px] text-gray-400 font-medium">pts</span>
                        </div>
                        <div className="text-[9px] text-emerald-600 font-semibold flex justify-between">
                          <span>Equiv. R$:</span>
                          <span>R$ {(currentTempGoal * 500).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="text-[9px] text-slate-500">
                  {goalsDefinedAt ? (
                    <span>Ajuste salvo em: <strong>{new Date(goalsDefinedAt).toLocaleString("pt-BR")}</strong></span>
                  ) : (
                    <span>Usando referências do histórico.</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleAcceptGoalsAdjustment(tempSectorGoals, tempPeriodType, tempFaturamentoGoal)}
                  disabled={isSavingGoals}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Check size={14} /> {isSavingGoals ? "Salvando..." : "Aceitar Ajuste de Metas"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Target Planning Simulator for non-manager roles */}
      {!(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.role === "PCP") && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Calculator size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800">🎯 Planejador de Metas por Faturamento</h4>
              <p className="text-[11px] text-gray-400">Calcule os pontos necessários baseados no faturamento desejado</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                Faturamento Desejado
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                  <span className="text-gray-400 text-xs">R$</span>
                </div>
                <input
                  type="number"
                  value={billingGoalInput}
                  onChange={(e) => setBillingGoalInput(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Período</label>
              <div className="flex bg-slate-100 rounded-lg p-0.5 h-[29px] items-center">
                {(["MENSAL", "SEMANAL", "DIARIA"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setBillingPeriod(p)}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded-md transition ${
                      billingPeriod === p ? "bg-white text-blue-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {p === "DIARIA" ? "Dia" : p === "SEMANAL" ? "Sem." : "Mês"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Points & Financial Values Timeline Area Chart */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Target className="text-indigo-600" size={16} />
              Evolução da Meta de Produção & Faturamento
            </h4>
            <p className="text-xs text-gray-400">Linha do tempo diária mostrando a produtividade e faturamento nos últimos {periodDays} dias</p>
          </div>

          {/* Toggle View Mode */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 self-start">
            <button
              onClick={() => setChartViewMode("FINANCIAL")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
                chartViewMode === "FINANCIAL" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              💰 Valores (R$)
            </button>
            <button
              onClick={() => setChartViewMode("POINTS")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${
                chartViewMode === "POINTS" ? "bg-indigo-600 text-white shadow-xs" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              📊 Pontos
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === "FINANCIAL" ? (
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProduced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-md space-y-1 border border-slate-800">
                          <p className="font-bold text-gray-300">{data.dateLabel}</p>
                          <p className="text-blue-300 font-semibold">Faturamento Faturado: <span className="font-bold text-white">R$ {data.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>
                          <p className="text-emerald-300 font-semibold">Valor Setores Produzido: <span className="font-bold text-white">R$ {data.produzidoVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>
                          <p className="text-indigo-300 text-[10px]">Equivalente a: {data.pontos} pontos de produção</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="produzidoVal" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProduced)" name="Valor Produzido" />
                <Area type="monotone" dataKey="faturamento" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorFaturamento)" name="Faturamento Faturado" />
              </AreaChart>
            ) : (
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-md space-y-1 border border-slate-800">
                          <p className="font-bold text-gray-300">{data.dateLabel}</p>
                          <p className="text-indigo-300 font-semibold">Pontos Produzidos: <span className="font-bold text-white">{data.pontos} pts</span></p>
                          <p className="text-emerald-300 font-semibold">Peças Produzidas: <span className="font-bold text-white">{data.pecas} u.</span></p>
                          <p className="text-green-300 text-[10px]">Valor Econômico: R$ {(data.pontos * 500).toLocaleString("pt-BR")}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="pontos" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPoints)" name="Pontos de Production" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid of Sector Dashboard Cards */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <Sliders className="text-indigo-600" size={16} />
            Metas & Desempenho dos Setores (Fixo / {goalPeriodType})
          </h4>
          <span className="text-xs text-gray-400 font-medium">1 ponto = R$ 500,00</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSectors.map((sector) => {
            const isCompleted = sector.todayPoints >= sector.finalPointsGoal && sector.finalPointsGoal > 0;
            const progressVal = Math.min(100, sector.pointsProgressPct);

            return (
              <div
                key={sector.id}
                className={`bg-white rounded-xl border border-gray-100 p-4 shadow-xs transition-all hover:shadow-md hover:border-gray-200 flex flex-col justify-between gap-3 ${
                  isCompleted ? "ring-1 ring-green-400 bg-green-50/5" : ""
                }`}
              >
                {/* Sector header */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-gray-800 block leading-tight">
                      {sector.name}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      Período ({goalPeriodType}): Meta {Math.round(sector.finalPeriodGoal)} pts | Acumulado: {Math.round(sector.periodPoints)} pts
                    </span>
                  </div>

                  {/* Status Indicator */}
                  {isCompleted ? (
                    <span className="p-1 bg-green-100 text-green-700 rounded-full" title="Meta Diária Batida!">
                      <CheckCircle size={16} />
                    </span>
                  ) : sector.todayPoints > 0 ? (
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-md">
                      {sector.pointsProgressPct.toFixed(0)}% dia
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-gray-50 text-gray-400 text-[9px] font-bold rounded-md">
                      Inativo
                    </span>
                  )}
                </div>

                {/* Progress bar and metrics */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Points & R$ Produced Today */}
                    <div className="p-2 bg-slate-50/60 rounded-lg flex flex-col justify-between">
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Hoje (Pontos)</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-extrabold text-gray-800">{sector.todayPoints.toFixed(1)}</span>
                        <span className="text-[9px] text-gray-400">/ {sector.finalPointsGoal.toFixed(1)} pts</span>
                      </div>
                      <span className="text-[9px] text-emerald-600 font-bold block mt-1">
                        R$ {(sector.todayPoints * 500).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    {/* Period points & R$ produced */}
                    <div className="p-2 bg-slate-50/60 rounded-lg flex flex-col justify-between">
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">{goalPeriodType === "MENSAL" ? "Este Mês" : "Esta Semana"}</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-semibold text-gray-800">{Math.round(sector.periodPoints)}</span>
                        <span className="text-[9px] text-gray-400">/ {Math.round(sector.finalPeriodGoal)} pts</span>
                      </div>
                      <span className="text-[9px] text-indigo-600 font-bold block mt-1">
                        R$ {(sector.periodPoints * 500).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Progress bars (top is Daily, bottom is Period) */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[8px] text-gray-400">
                      <span>Progresso Hoje</span>
                      <span>{sector.pointsProgressPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isCompleted ? "bg-green-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${Math.min(100, sector.pointsProgressPct)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[8px] text-gray-400 pt-1">
                      <span>Progresso Período ({goalPeriodType})</span>
                      <span>{sector.periodPointsProgressPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300 bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, sector.periodPointsProgressPct)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Individual goal override controls */}
                <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    {sector.isCustomGoal ? (
                      <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        Definida Estática
                      </span>
                    ) : (
                      <span className="text-gray-400">Padrão Histórico</span>
                    )}
                  </span>
                  {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.role === "PCP") ? (
                    <span className="text-[9px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
                      Meta: R$ {(sector.finalPeriodGoal * 500).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logs and Contribution of Today */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Activity className="text-indigo-600" size={16} />
              Detalhamento de Lançamentos do Dia
            </h4>
            <p className="text-xs text-gray-400">Todos os registros feitos nesta data com valor produzido e pontos convertidos</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md self-start sm:self-center">
            {todayLogsList.length} registros no dia
          </span>
        </div>

        <div className="overflow-x-auto">
          {todayLogsList.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold uppercase text-gray-400 bg-slate-50/50">
                  <th className="p-3">Horário</th>
                  <th className="p-3">Setor</th>
                  <th className="p-3">Operador</th>
                  <th className="p-3">Item / Peça</th>
                  <th className="p-3 text-right">Qtd</th>
                  <th className="p-3 text-right">Valor Produzido</th>
                  <th className="p-3 text-right">Pontos Totais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {todayLogsList.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40 transition">
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold bg-${log.colorTheme}-50 text-${log.colorTheme}-700 border border-${log.colorTheme}-100`}>
                        {log.sectorName}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 font-medium">
                      {log.operatorId}
                    </td>
                    <td className="p-3 text-gray-800 font-semibold">
                      {log.itemName}
                    </td>
                    <td className="p-3 text-right text-gray-600">
                      {log.qty}
                    </td>
                    <td className="p-3 text-right text-emerald-600 font-bold whitespace-nowrap">
                      R$ {(log.points * 500).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-indigo-600">
                      {log.points.toFixed(3)} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-400 space-y-2">
              <AlertCircle className="mx-auto text-gray-300" size={32} />
              <p className="text-xs">Nenhum lançamento com pontos registrado nesta data.</p>
              <p className="text-[11px] text-gray-400">Assim que os operadores registrarem produção para esta data nos terminais, a pontuação aparecerá aqui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
