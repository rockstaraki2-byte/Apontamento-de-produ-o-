import React, { useState, useMemo } from "react";
import { useDatabase } from "./useDatabase";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Users,
  Clock,
  Shield,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  FileText,
  UserCheck,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Printer,
  MessageSquare,
  Phone,
  Send,
  Share2,
  Search,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { User, Order } from "./types";
import { ScreenLayout, ScrollContainer, ScreenHeader, SectionBlock, ResponsiveCardGrid } from "./components/Layout";

interface FinanceiroScreenProps {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}

const COLORS = ["#00b14f", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444", "#06b6d4"];

export const getLocalDateString = (timestamp: number | string | Date | null | undefined): string => {
  if (!timestamp) return "";
  
  if (timestamp instanceof Date) {
    return formatDateObj(timestamp);
  }
  
  if (typeof timestamp === "number") {
    return formatDateObj(new Date(timestamp));
  }
  
  if (typeof timestamp === "string") {
    const cleaned = timestamp.trim();
    if (/^\d+$/.test(cleaned)) {
      return formatDateObj(new Date(parseInt(cleaned, 10)));
    }
    
    // Portuguese format DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
    if (cleaned.includes("/")) {
      const firstPart = cleaned.split(" ")[0];
      const parts = firstPart.split("/");
      if (parts.length === 3) {
        const d = parts[0].padStart(2, "0");
        const m = parts[1].padStart(2, "0");
        const y = parts[2];
        return `${y}-${m}-${d}`;
      }
    }
    
    // ISO format YYYY-MM-DD or DD-MM-YYYY
    if (cleaned.includes("-")) {
      const firstPart = cleaned.split("T")[0].split(" ")[0];
      const parts = firstPart.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        } else {
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
    }
    
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      return formatDateObj(parsed);
    }
  }
  
  return "";
};

const formatDateObj = (d: Date): string => {
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function FinanceiroScreen({ db, currentUser }: FinanceiroScreenProps) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PRODUCTS" | "CUSTOMERS" | "TERMS" | "SECURITY" | "DAILY_SUMMARY">("OVERVIEW");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [passwordRequirements, setPasswordRequirements] = useState(true);

  // Security States
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [currentUserPassConfirm, setCurrentUserPassConfirm] = useState<string>("");
  const [myNewPassword, setMyNewPassword] = useState<string>("");
  const [showMyNewPass, setShowMyNewPass] = useState<boolean>(false);
  const [showUserNewPass, setShowUserNewPass] = useState<boolean>(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Daily Summary (Faturamento por Representante) States
  const [summaryDate, setSummaryDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [filterByDate, setFilterByDate] = useState(true);
  const [selectedRepName, setSelectedRepName] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [waMessageText, setWaMessageText] = useState("");
  const [waRecipientPhone, setWaRecipientPhone] = useState("");

  // Helper to calculate exact quantity fatured on a specific day
  const getInvoicedQtyOnDay = (o: Order, targetDate: string) => {
    // Find logs for this order of type FATURAMENTO
    const ordLogs = db.logs.filter(
      (l) => l.orderId === o.id && l.type === "FATURAMENTO"
    );
    
    if (ordLogs.length > 0) {
      // Filter logs where date parts exactly match targetDate
      const logsOnDay = ordLogs.filter((l) => {
        try {
          const logDateStr = getLocalDateString(l.timestamp);
          return logDateStr === targetDate;
        } catch (e) {
          return false;
        }
      });
      return logsOnDay.reduce((sum, l) => sum + (l.quantityInvoiced || 0), 0);
    }
    
    // If no logs found, fallback to order statistics
    if (getLocalDateString(o.deliveryDate) === targetDate) {
      return o.status === "FATURADO" ? (o.totalQuantity || 0) : (o.invoicedQuantity || 0);
    }
    return 0;
  };

  const resolveRepresentativeName = (o: Order) => {
    let repName = o.representativeName || "";
    const repClean = repName.toUpperCase().trim();
    
    // Find customer object to get trade name or other details
    const customerObj = db.customers.find(
      (c) => c.name === o.customerName || c.tradeName === o.customerName
    );
    const custName = (o.customerName || "").toUpperCase();
    const tradeName = customerObj?.tradeName ? customerObj.tradeName.toUpperCase() : "";
    const custId = customerObj?.id;

    // Direct mapping for Toque de Arte to Império Representante
    if (custName.includes("TOQUE") || tradeName.includes("TOQUE") || custId === 1218) {
      return "Império Representante";
    }

    const isKesseCustomer = 
      custId === 370 || 
      custId === 1267 || 
      custName.includes("STORE") || 
      custName.includes("LEO DECOR") || 
      custName.includes("DESIGN") || 
      (custName.includes("DECOR") && !custName.includes("DECORACO") && !custName.includes("DECORAÇ")) ||
      tradeName.includes("STORE") || 
      tradeName.includes("LEO DECOR") || 
      tradeName.includes("DESIGN") || 
      (tradeName.includes("DECOR") && !tradeName.includes("DECORACO") && !tradeName.includes("DECORAÇ"));

    if (!repName || repClean === "" || repClean === "INDEFINIDA" || repClean === "INDEFINIDO" || repClean === "NÃO DEFINIDO" || repClean === "VENDA DIRETA") {
      if (isKesseCustomer) {
        return "Kesse Representante";
      }
      return "Venda Direta";
    }
    
    // Also clean up common variations to exact seeded users
    const repLower = repName.toLowerCase();
    if (repLower.includes("kesse")) return "Kesse Representante";
    if (repLower.includes("imperio") || repLower.includes("império")) return "Império Representante";
    if (repLower.includes("andre") || repLower.includes("andré")) return "André Representante";
    if (repLower.includes("danilo")) return "Danilo Representante";
    
    return repName;
  };

  // Filter orders by availability
  const activeOrders = useMemo(() => {
    return db.orders.filter((o) => o.isActive !== false);
  }, [db.orders]);

  const faturadosOrders = useMemo(() => {
    return db.orders.filter((o) => o.status === "FATURADO" || o.status === "FATURADO_PARCIAL" || (o.invoicedQuantity || 0) > 0);
  }, [db.orders]);

  // Filter orders based on selected Month
  const filteredOrders = useMemo(() => {
    if (selectedMonth === "ALL") return db.orders;
    return db.orders.filter((o) => {
      if (!o.deliveryDate) return false;
      const normDate = getLocalDateString(o.deliveryDate);
      return normDate.startsWith(selectedMonth);
    });
  }, [db.orders, selectedMonth]);

  // Orders we consider "faturados" under active/historic records for daily compilation
  const dailyFaturadosOrders = useMemo(() => {
    return db.orders.filter((o) => {
      // Must be faturado (full status, partial status, or has some invoiced quantity)
      const isFaturado = o.status === "FATURADO" || o.status === "FATURADO_PARCIAL" || (o.invoicedQuantity || 0) > 0;
      if (!isFaturado) return false;
      
      // Filter by deliveryDate which operates as billingDate in system
      if (filterByDate) {
        const ordLogs = db.logs.filter(
          (l) => l.orderId === o.id && l.type === "FATURAMENTO"
        );
        if (ordLogs.length > 0) {
          const hasLogToday = ordLogs.some(
            (l) => getLocalDateString(l.timestamp) === summaryDate
          );
          return hasLogToday;
        }
        
        if (getLocalDateString(o.deliveryDate) !== summaryDate) {
          return false;
        }
      }
      return true;
    });
  }, [db.orders, db.logs, summaryDate, filterByDate]);

  // Now we group dailyFaturadosOrders by representative
  const representativeSummary = useMemo(() => {
    const groups: {
      [repName: string]: {
        representativeName: string;
        representativeId?: string;
        orders: Order[];
        totalValue: number;
        totalItems: number;
      }
    } = {};

    dailyFaturadosOrders.forEach((o) => {
      const repName = resolveRepresentativeName(o);
      const qtyFat = getInvoicedQtyOnDay(o, summaryDate);
      const value = qtyFat * (o.unitPrice || 0);

      if (!groups[repName]) {
        groups[repName] = {
          representativeName: repName,
          representativeId: o.representativeId,
          orders: [],
          totalValue: 0,
          totalItems: 0,
        };
      }
      groups[repName].orders.push(o);
      groups[repName].totalValue += value;
      groups[repName].totalItems += qtyFat;
    });

    return Object.values(groups).sort((a, b) => b.totalValue - a.totalValue);
  }, [dailyFaturadosOrders, db.logs, summaryDate]);

  // Overall Financial stats
  const stats = useMemo(() => {
    let totalInvoiced = 0; // faturados
    let totalActive = 0; // carteira ativa
    let totalExpected = 0; // total de pedidos cadastrados ativos e faturados
    let orderCount = 0;

    filteredOrders.forEach((o) => {
      const deliveryDateStr = o.deliveryDate ? getLocalDateString(o.deliveryDate) : "";
      const isOverriddenDate = deliveryDateStr >= "2026-07-01" && deliveryDateStr <= "2026-07-07";

      const qtyFat = o.invoicedQuantity || 0;
      const valFat = qtyFat * (o.unitPrice || 0);
      const qtyActive = Math.max(0, (o.totalQuantity || 0) - qtyFat);
      const valActive = qtyActive * (o.unitPrice || 0);

      if (o.status === "FATURADO") {
        const fullVal = (o.totalQuantity || 0) * (o.unitPrice || 0);
        if (!isOverriddenDate) {
          totalInvoiced += fullVal;
          totalExpected += fullVal;
        }
      } else {
        if (!isOverriddenDate) {
          totalInvoiced += valFat;
          totalExpected += valFat;
        }
        if (o.isActive !== false) {
          totalActive += valActive;
          totalExpected += valActive;
        }
      }

      if (o.isActive !== false || o.status === "FATURADO" || o.status === "FATURADO_PARCIAL" || qtyFat > 0) {
        orderCount++;
      }
    });

    const includeOverride = (selectedMonth === "ALL" || selectedMonth === "2026-07") && db.activeTenantId === "imperio";
    if (includeOverride) {
      totalInvoiced += 169194.69;
      totalExpected += 169194.69;
    }

    const averageOrderValue = orderCount > 0 ? totalExpected / orderCount : 0;

    return {
      totalInvoiced,
      totalActive,
      totalExpected,
      averageOrderValue,
      orderCount,
    };
  }, [filteredOrders, selectedMonth]);

  // Monthly billing goal data for current/selected month
  const monthlyBillingGoalData = useMemo(() => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-indexed

    if (selectedMonth !== "ALL") {
      const parts = selectedMonth.split("-");
      if (parts.length === 2) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
      }
    }

    const startOfMonth = new Date(year, month, 1).getTime();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

    let billedAmount = 0;
    
    db.logs.forEach(log => {
      if (log.type === "FATURAMENTO" && log.timestamp >= startOfMonth && log.timestamp <= endOfMonth) {
        const logDate = new Date(log.timestamp);
        const day = logDate.getDate();
        if (db.activeTenantId === "imperio" && year === 2026 && month === 6 && day >= 1 && day <= 7) {
          return; // Exclude days 1-7 of July 2026 from standard calculation
        }

        let itemId = log.itemId;
        let unitPrice = 0;
        if (log.orderId) {
           const order = db.orders.find(o => o.id === log.orderId);
           if (order) {
             itemId = order.itemId;
             if (order.unitPrice) unitPrice = order.unitPrice;
           }
        }
        if (!unitPrice && itemId) {
           const item = db.items.find(i => i.id === itemId);
           if (item && item.price) unitPrice = item.price;
        }
        const qty = log.quantityInvoiced || log.quantityProcessed || log.quantityPacked || 0;
        billedAmount += qty * unitPrice;
      }
    });

    if (db.activeTenantId === "imperio" && year === 2026 && month === 6) {
      billedAmount += 169194.69; // Exactly R$ 169.194,69 for July 1-7
    }

    const goal = db.systemSettings?.[0]?.monthlyBillingGoal || 0;
    return { billedAmount, goal, year, month };
  }, [db.logs, db.systemSettings, db.orders, db.items, selectedMonth]);

  // Evolution of daily billing during the selected month
  const dailyBillingEvolution = useMemo(() => {
    const { year, month } = monthlyBillingGoalData;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Initialize day-by-day billing map
    const dailyMap: { [day: number]: number } = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = 0;
    }

    const startOfMonth = new Date(year, month, 1).getTime();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

    db.logs.forEach(log => {
      if (log.type === "FATURAMENTO" && log.timestamp >= startOfMonth && log.timestamp <= endOfMonth) {
        const logDate = new Date(log.timestamp);
        const day = logDate.getDate();
        if (db.activeTenantId === "imperio" && year === 2026 && month === 6 && day >= 1 && day <= 7) {
          return; // Exclude days 1-7 of July 2026 from standard calculation
        }

        let itemId = log.itemId;
        let unitPrice = 0;
        if (log.orderId) {
           const order = db.orders.find(o => o.id === log.orderId);
           if (order) {
             itemId = order.itemId;
             if (order.unitPrice) unitPrice = order.unitPrice;
           }
        }
        if (!unitPrice && itemId) {
           const item = db.items.find(i => i.id === itemId);
           if (item && item.price) unitPrice = item.price;
        }
        const qty = log.quantityInvoiced || log.quantityProcessed || log.quantityPacked || 0;
        const amount = qty * unitPrice;
        
        if (dailyMap[day] !== undefined) {
          dailyMap[day] += amount;
        }
      }
    });

    // Apply exact July 1-7, 2026 billing overrides
    if (db.activeTenantId === "imperio" && year === 2026 && month === 6) {
      dailyMap[1] = 38809.09;
      dailyMap[2] = 61692.33;
      dailyMap[3] = 0.00;
      dailyMap[4] = 0.00;
      dailyMap[5] = 0.00;
      dailyMap[6] = 61070.41;
      dailyMap[7] = 7622.86;
    }

    let accumulated = 0;
    return Array.from({ length: daysInMonth }, (_, idx) => {
      const dayNum = idx + 1;
      const dailyVal = dailyMap[dayNum] || 0;
      accumulated += dailyVal;
      return {
        day: dayNum,
        dayLabel: `${String(dayNum).padStart(2, "0")}`,
        "Faturamento Diário": Number(dailyVal.toFixed(2)),
        "Faturamento Acumulado": Number(accumulated.toFixed(2)),
      };
    });
  }, [db.logs, db.orders, db.items, monthlyBillingGoalData]);

  // Helper function to calculate instalments based on payment terms/conditions
  const parsePaymentTermsToInstalments = (deliveryDateStr: string, paymentTermsStr: string, totalValue: number) => {
    let baseDate: Date;
    try {
      const normDate = getLocalDateString(deliveryDateStr);
      const parts = normDate.split("-");
      if (parts.length === 3) {
        baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
      } else {
        baseDate = new Date(deliveryDateStr);
      }
      if (isNaN(baseDate.getTime())) {
        baseDate = new Date();
      }
    } catch (e) {
      baseDate = new Date();
    }

    const cleanTerm = (paymentTermsStr || "À VISTA").trim().toUpperCase();
    
    // Find numbers separated by common separators like slashes
    const parts = cleanTerm.split(/[\/,\-;]|\s+E\s+/gi);
    const daysList: number[] = [];
    
    parts.forEach(p => {
      const match = p.match(/\d+/);
      if (match) {
        const days = parseInt(match[0], 10);
        daysList.push(days);
      }
    });

    if (daysList.length === 0) {
      daysList.push(0); // If no numbers, treat as immediately (Month + 0)
    }

    const instalmentValue = totalValue / daysList.length;
    const instalments: { monthKey: string; value: number }[] = [];

    daysList.forEach(days => {
      const payDate = new Date(baseDate.getTime());
      payDate.setDate(baseDate.getDate() + days);
      const year = payDate.getFullYear();
      const month = String(payDate.getMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`;
      instalments.push({ monthKey, value: instalmentValue });
    });

    return instalments;
  };

  // Group Payments by Month of deliveryDate (provisões), distributing across instalments according to payment conditions
  const monthlyProvisions = useMemo(() => {
    const monthsData: { [key: string]: { invoiced: number; pending: number; total: number } } = {};

    db.orders.forEach((o) => {
      if (!o.deliveryDate) return;
      const value = (o.totalQuantity || 0) * (o.unitPrice || 0);
      if (value <= 0) return;

      const instalments = parsePaymentTermsToInstalments(o.deliveryDate, o.paymentTerms || "", value);

      instalments.forEach(({ monthKey, value: instVal }) => {
        if (!monthsData[monthKey]) {
          monthsData[monthKey] = { invoiced: 0, pending: 0, total: 0 };
        }

        if (o.status === "FATURADO") {
          monthsData[monthKey].invoiced += instVal;
        } else if (o.isActive !== false) {
          monthsData[monthKey].pending += instVal;
        }
        monthsData[monthKey].total += instVal;
      });
    });

    if (!monthsData["2026-07"]) {
      monthsData["2026-07"] = { invoiced: 0, pending: 0, total: 0 };
    }

    // Format for charts
    return Object.keys(monthsData)
      .sort()
      .map((m) => {
        // Simple month formatter, e.g. "2026-06" -> "Jun/26"
        const parts = m.split("-");
        const monthsNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const monthName = monthsNames[parseInt(parts[1] || "1", 10) - 1] || parts[1];
        const label = `${monthName}/${parts[0].substring(2)}`;

        let faturadoVal = monthsData[m].invoiced;
        let pendingVal = monthsData[m].pending;
        let totalVal = monthsData[m].total;

        if (m === "2026-07" && db.activeTenantId === "imperio") {
          faturadoVal = 169194.69;
          totalVal = faturadoVal + pendingVal;
        }

        return {
          monthKey: m,
          label,
          faturado: Math.round(faturadoVal),
          provisao: Math.round(pendingVal),
          total: Math.round(totalVal),
        };
      });
  }, [db.orders]);

  // List of unique months for filter dropdown
  const uniqueMonths = useMemo(() => {
    return monthlyProvisions.map((m) => m.monthKey);
  }, [monthlyProvisions]);

  // Products profitability & sold quantities
  const productsAnalysis = useMemo(() => {
    const productStats: {
      [key: string]: {
        itemId: number;
        code: string;
        name: string;
        qtySold: number;
        revenue: number;
        cost: number;
        profit: number;
      };
    } = {};

    filteredOrders.forEach((o) => {
      if (o.isActive === false && o.status !== "FATURADO") return; // skip deleted ones
      const item = db.items.find((i) => String(i.id) === String(o.itemId));
      const code = item?.code || `IT-${o.itemId}`;
      const name = item?.name || o.customProductName || `Produto #${o.itemId}`;
      const key = `${o.itemId}`;

      const value = (o.totalQuantity || 0) * (o.unitPrice || 0);
      // cost based on basePrice if defined, or assume 60% of sale price
      const baseCostPrice = item?.basePrice || (o.unitPrice ? o.unitPrice * 0.6 : 0);
      const calculatedCost = (o.totalQuantity || 0) * baseCostPrice;

      if (!productStats[key]) {
        productStats[key] = {
          itemId: o.itemId,
          code,
          name,
          qtySold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
      }

      productStats[key].qtySold += o.totalQuantity || 0;
      productStats[key].revenue += value;
      productStats[key].cost += calculatedCost;
      productStats[key].profit += (value - calculatedCost);
    });

    const list = Object.values(productStats);

    // Sort by profitability (revenue or gross profit margin)
    const mostProfitable = [...list].sort((a, b) => b.profit - a.profit);
    // Sort by quantity
    const mostSold = [...list].sort((a, b) => b.qtySold - a.qtySold);

    return {
      mostProfitable: mostProfitable.slice(0, 15),
      mostSold: mostSold.slice(0, 15),
    };
  }, [filteredOrders, db.items]);

  // Key Financial Customers (Clients that generate most revenue)
  const customersAnalysis = useMemo(() => {
    const clientsData: {
      [key: string]: {
        name: string;
        orderCount: number;
        revenue: number;
        qtyPurchased: number;
      };
    } = {};

    filteredOrders.forEach((o) => {
      if (o.isActive === false && o.status !== "FATURADO") return; // exclude deleted
      const clientKey = o.customerName || "Não Definido";
      const value = (o.totalQuantity || 0) * (o.unitPrice || 0);

      if (!clientsData[clientKey]) {
        clientsData[clientKey] = {
          name: clientKey,
          orderCount: 0,
          revenue: 0,
          qtyPurchased: 0,
        };
      }

      clientsData[clientKey].orderCount += 1;
      clientsData[clientKey].revenue += value;
      clientsData[clientKey].qtyPurchased += o.totalQuantity || 0;
    });

    return Object.values(clientsData)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);
  }, [filteredOrders]);

  // Terms and conditions statistics (prazos e formas de pagamento)
  const paymentTermsStats = useMemo(() => {
    const termsData: {
      [key: string]: {
        term: string;
        count: number;
        totalValue: number;
        level: "SUPERIOR" | "MEDIO" | "DESFAVORAVEL";
      };
    } = {};

    filteredOrders.forEach((o) => {
      if (o.isActive === false && o.status !== "FATURADO") return;
      const rawTerm = (o.paymentTerms || o.paymentCondition || "À VISTA").trim().toUpperCase();
      const value = (o.totalQuantity || 0) * (o.unitPrice || 0);

      if (!termsData[rawTerm]) {
        // Classify how favorable the payment term is for cash flow
        let level: "SUPERIOR" | "MEDIO" | "DESFAVORAVEL" = "MEDIO";
        const clean = rawTerm.toLowerCase();
        if (clean.includes("vista") || clean.includes("antecip") || clean.includes("pix") || clean.includes("dinheiro")) {
          level = "SUPERIOR";
        } else if (clean.includes("90") || clean.includes("120") || clean.includes("duplicata") || clean.includes("prazo longo")) {
          level = "DESFAVORAVEL";
        }

        termsData[rawTerm] = {
          term: rawTerm,
          count: 0,
          totalValue: 0,
          level,
        };
      }

      termsData[rawTerm].count += 1;
      termsData[rawTerm].totalValue += value;
    });

    return Object.values(termsData).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredOrders]);

  // Representative Faturamento Chart Data
  const representativeRevenueData = useMemo(() => {
    const repData: { [key: string]: { name: string; faturado: number; pendente: number; total: number; } } = {};

    filteredOrders.forEach((o) => {
      if (o.isActive === false && o.status !== "FATURADO") return;
      const repName = resolveRepresentativeName(o);
      const val = (o.totalQuantity || 0) * (o.unitPrice || 0);
      
      if (!repData[repName]) {
        repData[repName] = { name: repName, faturado: 0, pendente: 0, total: 0 };
      }
      
      if (o.status === "FATURADO") {
        repData[repName].faturado += val;
      } else {
        repData[repName].pendente += val;
      }
      repData[repName].total += val;
    });

    return Object.values(repData)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // top 10 representativos
  }, [filteredOrders]);

  // Handle Changing Logged user password
  const handleUpdateMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);

    if (!myNewPassword || myNewPassword.trim().length === 0) {
      setSecurityMessage({ type: "error", text: "Digite uma senha válida." });
      return;
    }

    if (passwordRequirements && myNewPassword.length < 6) {
      setSecurityMessage({ type: "error", text: "A nova senha deve possuir pelo menos 6 caracteres para segurança robusta." });
      return;
    }

    try {
      await db.updateUser(currentUser.id, { password: myNewPassword });
      setMyNewPassword("");
      setSecurityMessage({ type: "success", text: "Sua senha pessoal foi alterada com sucesso!" });
    } catch (err: any) {
      setSecurityMessage({ type: "error", text: `Falha ao alterar senha: ${err.message}` });
    }
  };

  // Handle Admin changing other user's password
  const handleAdminUpdateUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);

    if (!targetUserId) {
      setSecurityMessage({ type: "error", text: "Selecione um usuário." });
      return;
    }

    if (!newPassword || newPassword.trim().length === 0) {
      setSecurityMessage({ type: "error", text: "Digite uma senha para o usuário." });
      return;
    }

    if (passwordRequirements && newPassword.length < 6) {
      setSecurityMessage({ type: "error", text: "A senha escolhida não atende os requisitos mínimos de 6 caracteres robustos!" });
      return;
    }

    try {
      const targetUser = db.users.find((u) => u.id === targetUserId);
      if (!targetUser) {
        setSecurityMessage({ type: "error", text: "Usuário inválido ou não encontrado." });
        return;
      }

      await db.updateUser(targetUserId, { password: newPassword });
      setNewPassword("");
      setTargetUserId("");
      setSecurityMessage({ type: "success", text: `Senha de "${targetUser.name}" redefinida e gravada com sucesso!` });
    } catch (err: any) {
      setSecurityMessage({ type: "error", text: `Erro ao redefinir credenciais: ${err.message}` });
    }
  };

  // Restrict screen rendering if user is not ADMIN or GERENCIA
  if (currentUser.role !== "ADMIN" && currentUser.role !== "GERENCIA") {
    return (
      <ScreenLayout id="finance-blocked-root">
        <ScrollContainer paddingSize="spacious" className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="bg-white border border-red-200 p-8 rounded-xl shadow-md max-w-md text-center">
            <Shield size={48} className="text-red-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-lg font-bold text-slate-800">Acesso Restrito</h2>
            <p className="text-gray-500 text-sm mt-2">
              Apenas os usuários da Gerência ou Administradores possuem autorização para visualizar as visões financeiras e de receita do sistema Império.
            </p>
          </div>
        </ScrollContainer>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout id="finance-screen-root">
      <ScreenHeader
        title={
          <div className="flex items-center gap-2">
            <DollarSign className="text-[#00b14f]" size={22} />
            <span>Painel Financeiro & Segurança</span>
            <span className="bg-[#00b14f]/15 text-[#00b14f] text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full">
              GERENCIAL
            </span>
          </div>
        }
        description="Faturamento, projeções financeiras por carteira de pedidos, rentabilidade por produto e controle de acessos seguros."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-bold hidden md:inline">Mês Referência:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-slate-200 text-xs px-2 py-1.5 rounded-lg bg-white font-medium focus:ring-2 focus:ring-[#00b14f] focus:outline-none"
            >
              <option value="ALL">Todos os Meses</option>
              {uniqueMonths.map((m) => {
                const parts = m.split("-");
                const monthsNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                const label = `${monthsNames[parseInt(parts[1] || "1", 10) - 1] || parts[1]} de ${parts[0]}`;
                return (
                  <option key={m} value={m}>
                    {label}
                  </option>
                );
              })}
            </select>

            <button
              onClick={() => db.triggerSyncQueue?.(true)}
              className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition text-slate-600 cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Recarregar dados"
            >
              <RefreshCw size={14} /> <span className="hidden sm:inline">Sincronizar</span>
            </button>
          </div>
        }
      />

      {/* Tabs navigation */}
      <div className="shrink-0 bg-white border-b border-slate-200 flex overflow-x-auto">
        <button
          onClick={() => setActiveTab("OVERVIEW")}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 max-h-12 cursor-pointer ${
            activeTab === "OVERVIEW"
              ? "border-[#00b14f] text-[#00b14f] bg-[#00b14f]/5"
              : "border-transparent text-gray-500 hover:text-slate-800 hover:bg-gray-50"
          }`}
        >
          <TrendingUp size={16} /> Visão Geral & Projeções
        </button>
        <button
          onClick={() => setActiveTab("PRODUCTS")}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 max-h-12 cursor-pointer ${
            activeTab === "PRODUCTS"
              ? "border-[#00b14f] text-[#00b14f] bg-[#00b14f]/5"
              : "border-transparent text-gray-500 hover:text-slate-800 hover:bg-gray-50"
          }`}
        >
          <Layers size={16} /> Produtos e Rentabilidade
        </button>
        <button
          onClick={() => setActiveTab("CUSTOMERS")}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 max-h-12 cursor-pointer ${
            activeTab === "CUSTOMERS"
              ? "border-[#00b14f] text-[#00b14f] bg-[#00b14f]/5"
              : "border-transparent text-gray-500 hover:text-slate-800 hover:bg-gray-50"
          }`}
        >
          <Users size={16} /> Clientes Relevantes
        </button>
        <button
          onClick={() => setActiveTab("TERMS")}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 max-h-12 cursor-pointer ${
            activeTab === "TERMS"
              ? "border-[#00b14f] text-[#00b14f] bg-[#00b14f]/5"
              : "border-transparent text-gray-500 hover:text-slate-800 hover:bg-gray-50"
          }`}
        >
          <Clock size={16} /> Prazos e Liquidez
        </button>
        <button
          onClick={() => setActiveTab("SECURITY")}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 max-h-12 cursor-pointer ${
            activeTab === "SECURITY"
              ? "border-[#00b14f] text-[#00b14f] bg-[#00b14f]/5"
              : "border-transparent text-gray-500 hover:text-slate-800 hover:bg-gray-50"
          }`}
        >
          <Shield size={16} /> Segurança e Acessos
        </button>
        <button
          onClick={() => setActiveTab("DAILY_SUMMARY")}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 max-h-12 cursor-pointer ${
            activeTab === "DAILY_SUMMARY"
              ? "border-[#00b14f] text-[#00b14f] bg-[#00b14f]/5"
              : "border-transparent text-gray-500 hover:text-slate-800 hover:bg-gray-50"
          }`}
        >
          <FileText size={16} /> Compilado Faturamento
        </button>
      </div>

      <ScrollContainer paddingSize="normal" className="bg-slate-50 flex flex-col gap-4">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "OVERVIEW" && (
          <div className="flex flex-col gap-4">
            {/* Meta de Faturamento Mensal - Visão de Gerência */}
            {monthlyBillingGoalData.goal > 0 && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎯</span>
                      <h3 className="text-base font-bold text-slate-800">Meta de Faturamento Mensal</h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">
                      Período de referência: <strong className="text-slate-600 font-bold">
                        {selectedMonth === "ALL" 
                          ? `Geral (${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][monthlyBillingGoalData.month]} de ${monthlyBillingGoalData.year})` 
                          : `${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][monthlyBillingGoalData.month]} de ${monthlyBillingGoalData.year}`}
                      </strong>
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Volume Faturado Efetivo</span>
                    <div className="flex items-baseline md:justify-end gap-1.5 mt-0.5">
                      <span className="text-xl sm:text-2xl font-black text-emerald-600">
                        R$ {monthlyBillingGoalData.billedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-400 font-bold">
                        / R$ {monthlyBillingGoalData.goal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-150">
                  <div 
                    className={`h-full absolute left-0 top-0 transition-all duration-1000 ease-out ${
                      monthlyBillingGoalData.billedAmount >= monthlyBillingGoalData.goal 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                        : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (monthlyBillingGoalData.billedAmount / monthlyBillingGoalData.goal) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-500 font-medium">
                    {monthlyBillingGoalData.billedAmount >= monthlyBillingGoalData.goal ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        🎉 Meta superada por R$ {(monthlyBillingGoalData.billedAmount - monthlyBillingGoalData.goal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}!
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Faltam <strong className="text-blue-600 font-bold">R$ {(monthlyBillingGoalData.goal - monthlyBillingGoalData.billedAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> para a meta.
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-black text-slate-800 bg-slate-50 border px-2.5 py-1 rounded-lg">
                    {Math.round((monthlyBillingGoalData.billedAmount / monthlyBillingGoalData.goal) * 100)}% da Meta
                  </span>
                </div>
              </div>
            )}

            {/* KPI Summary Cards */}
            <ResponsiveCardGrid cols="4">
              <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Receita Faturada Efetiva</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-850 mt-1 block">
                    R$ {stats.totalInvoiced.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-[#00b14f] mt-1 font-bold">✓ Itens faturados com NF</p>
                </div>
                <div className="p-3 bg-[#00b14f]/10 text-[#00b14f] rounded-xl">
                  <CheckCircle size={22} />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Receita Ativa Planejada</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-850 mt-1 block">
                    R$ {stats.totalActive.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-amber-600 mt-1 font-bold">◷ Carteiras de pedidos em produção/lotes</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock size={22} />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Provisão Geral Total</span>
                  <span className="text-xl sm:text-2xl font-black text-[#00b14f] mt-1 block">
                    R$ {stats.totalExpected.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Faturamento realizado + provisões</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <DollarSign size={22} />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Ticket Médio por Item/Ped.</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-850 mt-1 block">
                    R$ {stats.averageOrderValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-purple-600 mt-1 font-bold">Receita total / {stats.orderCount} registros</p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Percent size={22} />
                </div>
              </div>
            </ResponsiveCardGrid>

            {/* Evolução de Faturamento Diário do Mês */}
            <SectionBlock 
              title="Evolução do Faturamento Diário e Acumulado" 
              subtitle={`Acompanhamento dia a dia para o período de ${selectedMonth === "ALL" 
                ? `${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][monthlyBillingGoalData.month]} de ${monthlyBillingGoalData.year}` 
                : `${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][monthlyBillingGoalData.month]} de ${monthlyBillingGoalData.year}`}`}
            >
              <div className="h-[320px] mt-2 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyBillingEvolution} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="dayLabel" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      tickFormatter={(v) => `R$ ${v >= 1000 ? `${v / 1000}k` : v}`} 
                    />
                    <Tooltip 
                      formatter={(value: any, name: any) => [
                        `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        name
                      ]} 
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line 
                      type="monotone" 
                      dataKey="Faturamento Diário" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      dot={{ r: 3 }} 
                      activeDot={{ r: 6 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Faturamento Acumulado" 
                      stroke="#00b14f" 
                      strokeWidth={3} 
                      dot={{ r: 2 }} 
                      activeDot={{ r: 5 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionBlock>

            {/* Monthly Trend Projections and Billing vs Forecast Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionBlock title="Projeções Financeiras Mensais de Recebimento" subtitle="Distribuição por mês planejado de entrega dos pedidos">
                {monthlyProvisions.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-gray-400 text-xs">
                    Nenhum pedido com data de entrega cadastrada.
                  </div>
                ) : (
                  <div className="h-[280px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyProvisions}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `R$ ${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`R$ ${Number(value).toLocaleString("pt-BR")}`, "Valor"]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="faturado" name="Faturamento Efetivo" fill="#00b14f" radius={[4, 4, 0, 0]} stackId="a" />
                        <Bar dataKey="provisao" name="Projeção/Carteira Ativa" fill="#94a3b8" radius={[4, 4, 0, 0]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </SectionBlock>

              <SectionBlock title="Comparativo Faturamento Efetivo vs Financeiro Gerado" subtitle="Análise de conversão econômica por grupo de entrega">
                {monthlyProvisions.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-gray-400 text-xs">
                    Nenhum histórico disponível.
                  </div>
                ) : (
                  <div className="h-[280px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyProvisions}>
                        <defs>
                          <linearGradient id="colorFaturado" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00b14f" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#00b14f" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `R$ ${v / 1000}k`} />
                        <Tooltip formatter={(value: any) => [`R$ ${Number(value).toLocaleString("pt-BR")}`, "Total"]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="total" name="Demanda Total Gerada" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                        <Area type="monotone" dataKey="faturado" name="Faturamento Líquido" stroke="#00b14f" fillOpacity={1} fill="url(#colorFaturado)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </SectionBlock>

              <SectionBlock title="Faturamento por Representante" subtitle="Desempenho comparativo de vendas (Top 10 representantes)">
                {representativeRevenueData.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-gray-400 text-xs">
                    Nenhum dado disponível.
                  </div>
                ) : (
                  <div className="h-[280px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={representativeRevenueData} layout="vertical" margin={{ left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `R$ ${v / 1000}k`} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} width={100} />
                        <Tooltip formatter={(value: any) => [`R$ ${Number(value).toLocaleString("pt-BR")}`, "Valor"]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="faturado" name="Faturamento Efetivo" fill="#00b14f" radius={[0, 4, 4, 0]} stackId="a" />
                        <Bar dataKey="pendente" name="Projeção Pendente" fill="#94a3b8" radius={[0, 4, 4, 0]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </SectionBlock>
            </div>

            {/* Recurrent Active Unfaktured Provisions alert */}
            <div className="bg-white border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="p-3 bg-amber-50 text-amber-500 rounded-xl shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Provisões de Cobrança em Pedidos Recentes</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                    Pedidos catalogados no sistema possuem condições de faturamento em aberto. Ao finalizá-los, acesse a aba de listagem para realizar a emissão do faturamento e atualizar instantaneamente as saídas de estoque associadas.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 w-full md:w-auto">
                <div className="text-xs text-right hidden lg:block">
                  <span className="text-gray-400 block font-bold">Média de Prazos</span>
                  <span className="text-slate-800 font-extrabold block">30 / 60 Dias</span>
                </div>
                <div className="border-l border-gray-200 mx-2 hidden lg:block"></div>
                <span className="text-xs font-black bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
                  Liquidez Média Estimada
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS */}
        {activeTab === "PRODUCTS" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionBlock title="Produtos Mais Rentáveis (Faturamento Gerado)" subtitle="Faturamento total acumulado (Preço Unitário x Quantidade)">
              {productsAnalysis.mostProfitable.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">Sem histórico para exibir.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="h-[260px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productsAnalysis.mostProfitable.slice(0, 5)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `R$ ${v}`} />
                        <YAxis dataKey="code" type="category" stroke="#94a3b8" fontSize={9} width={45} tickLine={false} />
                        <Tooltip formatter={(val: any) => `R$ ${Number(val).toLocaleString()}`} />
                        <Bar dataKey="revenue" name="Volume Financeiro" fill="#00b14f" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="profit" name="Margem Estimada" fill="#2563eb" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto mt-2 border border-slate-100 rounded-lg">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-slate-50 text-gray-500 font-bold">
                        <tr>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Nome do Item</th>
                          <th className="p-2.5 text-right">Qtd. Total</th>
                          <th className="p-2.5 text-right">Margem Est. (Bruta)</th>
                          <th className="p-2.5 text-right">Volume Financ.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productsAnalysis.mostProfitable.slice(0, 8).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-mono text-slate-700">{p.code}</td>
                            <td className="p-2.5 font-bold text-slate-800 truncate max-w-[150px]" title={p.name}>
                              {p.name}
                            </td>
                            <td className="p-2.5 text-right font-medium text-gray-500">{p.qtySold.toLocaleString()} pçs</td>
                            <td className="p-2.5 text-right font-extrabold text-[#00b14f]">
                              R$ {p.profit.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-800">
                              R$ {p.revenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </SectionBlock>

            <SectionBlock title="Produtos Mais Vendidos (Volume Físico)" subtitle="Ranqueamento por quantidade total vendida nos pedidos ativos">
              {productsAnalysis.mostSold.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">Sem histórico para exibir.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="h-[260px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productsAnalysis.mostSold.slice(0, 5)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                        <YAxis dataKey="code" type="category" stroke="#94a3b8" fontSize={9} width={45} tickLine={false} />
                        <Tooltip formatter={(val: any) => `${val} unidades`} />
                        <Bar dataKey="qtySold" name="Qtd. Vendida (Un)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto mt-2 border border-slate-100 rounded-lg">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-slate-50 text-gray-500 font-bold">
                        <tr>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Nome do Item</th>
                          <th className="p-2.5 text-right">Qtd. Vendida</th>
                          <th className="p-2.5 text-right">Preço Médio</th>
                          <th className="p-2.5 text-right">Volume Parcial</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productsAnalysis.mostSold.slice(0, 8).map((p, idx) => {
                          const avgPrice = p.qtySold > 0 ? p.revenue / p.qtySold : 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-mono text-slate-700">{p.code}</td>
                              <td className="p-2.5 font-bold text-slate-800 truncate max-w-[150px]" title={p.name}>
                                {p.name}
                              </td>
                              <td className="p-2.5 text-right font-extrabold text-slate-800">{p.qtySold.toLocaleString()} Un.</td>
                              <td className="p-2.5 text-right text-gray-500">R$ {avgPrice.toFixed(2)}</td>
                              <td className="p-2.5 text-right font-bold text-[#00b14f]">
                                R$ {p.revenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </SectionBlock>
          </div>
        )}

        {/* TAB 3: CUSTOMERS */}
        {activeTab === "CUSTOMERS" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <SectionBlock title="Clientes de Maior Volume Financeiro (Top Spenders)" subtitle="Classificação dos parceiros pela somatória financeira gerada">
                {customersAnalysis.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400">Nenhum cliente cadastrado em pedidos ativos.</div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-[#00b14f]/5 text-[#00b14f] font-black">
                        <tr>
                          <th className="p-3">Posição</th>
                          <th className="p-3">Razão Social / Nome do Cliente</th>
                          <th className="p-3 text-right">Nº Pedidos</th>
                          <th className="p-3 text-right">Peças Compradas</th>
                          <th className="p-3 text-right">Total Acumulado (Bruto)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customersAnalysis.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 text-slate-400 font-bold font-mono">
                              {String(idx + 1).padStart(2, "0")}
                            </td>
                            <td className="p-3 font-extrabold text-slate-800">{c.name}</td>
                            <td className="p-3 text-right text-slate-600 font-medium">{c.orderCount} ord</td>
                            <td className="p-3 text-right text-slate-600 font-medium">{c.qtyPurchased.toLocaleString()} pçs</td>
                            <td className="p-3 text-right font-black text-slate-900">
                              R$ {c.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionBlock>
            </div>

            <div className="flex flex-col gap-4">
              <SectionBlock title="Participação por Faturamento do Cliente" className="flex-1">
                {customersAnalysis.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400">Nenhum dado financeiro.</div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="h-[220px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={customersAnalysis.slice(0, 6)}
                            dataKey="revenue"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {customersAnalysis.slice(0, 6).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col gap-1.5 w-full mt-2 text-[10px] text-gray-500 font-medium">
                      {customersAnalysis.slice(0, 6).map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                            <span className="truncate font-bold text-slate-700">{c.name}</span>
                          </div>
                          <span className="font-mono text-slate-800">
                            {((c.revenue / stats.totalExpected) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SectionBlock>

              <div className="bg-white border rounded-xl p-4 shadow-xs">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Comunicação e Relacionamento</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Utilize o gerenciador de envios integrado ao faturamento para notificar os clientes de maior faturamento. Envios automáticos garantem credibilidade e agilidade de contas a pagar.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00b14f] animate-pulse"></span>
                  <span className="text-[10px] text-[#00b14f] font-bold">Serviço de Notificações Ativo</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TERMS & PAYMENTS */}
        {activeTab === "TERMS" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <SectionBlock title="Análise Geral de Prazos Praticados" subtitle="Volume e frequência de utilização de condições de pagamentos">
                {paymentTermsStats.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400">Nenhum termo de pagamento especificado.</div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-[#00b14f]/5 text-[#00b14f] font-black">
                        <tr>
                          <th className="p-3">Prazo Registrado</th>
                          <th className="p-3 text-right">Ocorrências</th>
                          <th className="p-3">Liquidez Estimada</th>
                          <th className="p-3 text-right font-sans">Receita Bruta Gerada</th>
                          <th className="p-3 text-right">Participação %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paymentTermsStats.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-extrabold text-slate-800">{t.term}</td>
                            <td className="p-3 text-right text-gray-500 font-mono font-medium">{t.count} vezes</td>
                            <td className="p-3">
                              {t.level === "SUPERIOR" ? (
                                <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-black text-[9px] border border-emerald-200">
                                  IMEDIATA (PIX/VISTA)
                                </span>
                              ) : t.level === "DESFAVORAVEL" ? (
                                <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-black text-[9px] border border-red-200">
                                  CONCENTRAÇÃO DE RISCO
                                </span>
                              ) : (
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-black text-[9px] border border-blue-200">
                                  PRAZO TRADICIONAL
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-black text-slate-900">
                              R$ {t.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-medium text-slate-500">
                              {((t.totalValue / stats.totalExpected) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionBlock>
            </div>

            <div className="flex flex-col gap-4">
              <SectionBlock title="Composição de Recebimento por Risco">
                {paymentTermsStats.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400">Sem dados financeiros.</div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="h-[220px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "Líquido Imediato (À Vista)",
                                value: paymentTermsStats.filter((t) => t.level === "SUPERIOR").reduce((acc, current) => acc + current.totalValue, 0),
                                fill: "#10b981",
                              },
                              {
                                name: "Tradicional com Liquidez (Padrão)",
                                value: paymentTermsStats.filter((t) => t.level === "MEDIO").reduce((acc, current) => acc + current.totalValue, 0),
                                fill: "#3b82f6",
                              },
                              {
                                name: "Risco Elevado (Acima 90d)",
                                value: paymentTermsStats.filter((t) => t.level === "DESFAVORAVEL").reduce((acc, current) => acc + current.totalValue, 0),
                                fill: "#ef4444",
                              },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                          />
                          <Tooltip formatter={(value: any) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col gap-2 w-full mt-3 text-[10px] text-gray-500 font-bold">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span> Alta Liquidez</span>
                        <span className="text-slate-800">
                          R$ {paymentTermsStats.filter((t) => t.level === "SUPERIOR").reduce((acc, current) => acc + current.totalValue, 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span> Moderado / Padrão</span>
                        <span className="text-slate-800">
                          R$ {paymentTermsStats.filter((t) => t.level === "MEDIO").reduce((acc, current) => acc + current.totalValue, 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span> Longo Prazo</span>
                        <span className="text-slate-800">
                          R$ {paymentTermsStats.filter((t) => t.level === "DESFAVORAVEL").reduce((acc, current) => acc + current.totalValue, 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </SectionBlock>

              <div className="bg-amber-50/20 border border-amber-200/50 rounded-xl p-4 text-xs">
                <h4 className="font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle size={15} /> Recomendações de Fluxo de Caixa
                </h4>
                <p className="text-gray-600 mt-1.5 leading-relaxed text-[11px]">
                  Prazos extensos acumulam risco operacional frente às compras de insumos para produção do Império. Monitore e priorize negociações parceladas com menos divisões em clientes tradicionais de faturamento recorrente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SECURITY */}
        {activeTab === "SECURITY" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <SectionBlock title="Alterar Minha Senha Pessoal" subtitle="Atualize suas credenciais de login para aumentar a segurança">
                <form onSubmit={handleUpdateMyPassword} className="flex flex-col gap-3 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-600 font-bold block">Seu Usuário Logado:</label>
                    <div className="text-sm font-black p-3 border border-slate-200 rounded-lg bg-gray-50 flex items-center gap-2 text-slate-800">
                      <UserCheck size={16} className="text-[#00b14f]" />
                      {currentUser.name} ({currentUser.role})
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-600 font-weight block font-bold">Nova Senha Segura:</label>
                    <div className="relative">
                      <input
                        type={showMyNewPass ? "text" : "password"}
                        placeholder="Digite sua nova senha"
                        value={myNewPassword}
                        onChange={(e) => setMyNewPassword(e.target.value)}
                        className="w-full border border-slate-200 p-2.5 pr-10 rounded-lg bg-white text-sm text-slate-800 focus:ring-2 focus:ring-[#00b14f] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMyNewPass(!showMyNewPass)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-slate-600 transition"
                      >
                        {showMyNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 border-t border-slate-100 pt-3">
                    <button
                      type="submit"
                      className="bg-[#00b14f] hover:bg-[#009e46] text-white text-xs font-black px-4 py-2 rounded-lg transition shadow-sm cursor-pointer"
                    >
                      Alterar Minha Senha
                    </button>
                  </div>
                </form>
              </SectionBlock>

              <SectionBlock title="Segurança por Escopo de Acesso" subtitle="Visualização dos níveis de segurança adotados nas permissões">
                <div className="flex flex-col gap-3 mt-1.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-lg">
                    <div className="flex gap-2">
                      <Shield size={16} className="text-[#00b14f]" />
                      <span className="font-bold text-slate-800">Criptografia Local</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">Ativo</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-lg">
                    <div className="flex gap-2">
                      <Lock size={16} className="text-[#00b14f]" />
                      <span className="font-bold text-slate-800">Prevenção por Ingestão de Nome</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">Ativo</span>
                  </div>

                  <div className="p-3.5 bg-blue-50/50 border border-blue-200/60 rounded-xl">
                    <h5 className="font-bold text-blue-900 flex items-center gap-1">
                      <Sparkles size={14} className="text-blue-500" /> Dica de Segurança e Proteção
                    </h5>
                    <p className="text-gray-600 mt-1 text-[11px] leading-relaxed">
                      Sua conta pessoal tem privilégios de Gerenciamento Geral. Evite senhas repetidas ou curtas como &quot;1111&quot; ou &quot;0000&quot; para evitar fraudes ou visualizações descricionárias de telas restritas de PCP e Fila de Lotes.
                    </p>
                  </div>
                </div>
              </SectionBlock>
            </div>

            <div className="flex flex-col gap-4">
              <SectionBlock title="Gerenciamento de Acessos dos Funcionários" subtitle="Administração direta das credenciais de outros operadores">
                <form onSubmit={handleAdminUpdateUserPassword} className="flex flex-col gap-3 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-600 font-bold block">Selecionar Funcionário / Operador:</label>
                    <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      className="border border-slate-200 text-sm p-2.5 rounded-lg bg-white font-medium focus:ring-2 focus:ring-[#00b14f] focus:outline-none text-slate-800"
                    >
                      <option value="">Selecione um funcionário...</option>
                      {db.users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-600 font-bold block">Definir Nova Senha Segura:</label>
                    <div className="relative">
                      <input
                        type={showUserNewPass ? "text" : "password"}
                        placeholder="Insira senha forte mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full border border-slate-200 p-2.5 pr-10 rounded-lg bg-white text-sm text-slate-800 focus:ring-2 focus:ring-[#00b14f] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserNewPass(!showUserNewPass)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-slate-600 transition"
                      >
                        {showUserNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        id="complex_req_toggle"
                        type="checkbox"
                        checked={passwordRequirements}
                        onChange={(e) => setPasswordRequirements(e.target.checked)}
                        className="rounded border-slate-350 text-[#00b14f] focus:ring-[#00b14f]"
                      />
                      <label htmlFor="complex_req_toggle" className="text-[11px] text-gray-500 font-semibold cursor-pointer">
                        Exigir Senha Forte (mínimo 6 caracteres)
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="bg-black hover:bg-zinc-800 text-white text-xs font-black px-4 py-2 rounded-lg transition shadow-sm cursor-pointer"
                    >
                      Gravar Nova Senha
                    </button>
                  </div>
                </form>
              </SectionBlock>

              {/* Toast Feedback panel inside screen */}
              {securityMessage && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-all text-xs ${
                    securityMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {securityMessage.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  <div className="flex-1 font-semibold">{securityMessage.text}</div>
                  <button onClick={() => setSecurityMessage(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: DAILY_SUMMARY RENDERING */}
        {activeTab === "DAILY_SUMMARY" && (() => {
          const generateWhatsAppText = (repName: string, orders: Order[], totalItems: number, totalValue: number) => {
            const dateStr = (() => {
              if (!filterByDate) return "Geral";
              const d = new Date(summaryDate + "T12:00:00");
              const day = String(d.getDate()).padStart(2, '0');
              const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              const month = months[d.getMonth()];
              const year = String(d.getFullYear()).slice(-2);
              return `${day}/${month}/${year}`;
            })();

            let msg = `*RESUMO DIÁRIO DE FATURAMENTO* 💼🚀\n`;
            msg += `*Representante:* ${repName}\n`;
            msg += `*Data:* ${dateStr}\n\n`;
            
            msg += `Olá, segue o consolidado dos seus pedidos faturados:\n\n`;
            
            orders.forEach((o, index) => {
              const item = db.items.find((i) => String(i.id) === String(o.itemId));
              const prodName = item?.name || o.customProductName || `Produto #${o.itemId}`;
              const qtyFatToday = getInvoicedQtyOnDay(o, summaryDate);
              const accumFat = o.status === "FATURADO" ? (o.totalQuantity || 0) : (o.invoicedQuantity || 0);
              const totalQty = o.totalQuantity || 0;

              msg += `*${index + 1}. Pedido: #${o.orderCode}*\n`;
              msg += `• *Cliente:* ${o.customerName}\n`;
              msg += `• *Item:* ${prodName}\n`;
              msg += `• *Qtd:* ${qtyFatToday} (${accumFat} de ${totalQty})\n\n`;
            });
            
            msg += `--------------------------\n`;
            msg += `*RESUMO TOTAL:* \n`;
            msg += `• *Total Pedidos:* ${orders.length}\n`;
            msg += `• *Total de Peças:* ${totalItems} un\n\n`;
            msg += `_Mensagem gerada pelo Sistema Império Jomarci_`;
            
            return msg;
          };

          return (
            <div className="flex flex-col gap-4 animate-in fade-in-50 duration-200">
              {/* Filtros */}
              <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-[#00b14f]" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Data do Faturamento:
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <input
                      type="date"
                      value={summaryDate}
                      onChange={(e) => setSummaryDate(e.target.value)}
                      disabled={!filterByDate}
                      className="border border-slate-200 p-2 text-xs rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b14f] disabled:bg-slate-100 disabled:text-gray-400"
                    />
                    <div className="flex items-center gap-1.5 ml-2">
                      <input
                        id="filter_by_date_toggle"
                        type="checkbox"
                        checked={filterByDate}
                        onChange={(e) => setFilterByDate(e.target.checked)}
                        className="rounded border-slate-300 text-[#00b14f] focus:ring-[#00b14f] w-4 h-4 cursor-pointer"
                      />
                      <label
                        htmlFor="filter_by_date_toggle"
                        className="text-xs text-slate-600 font-bold cursor-pointer select-none"
                      >
                        Filtrar por Data
                      </label>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 font-bold bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/50 shrink-0">
                  Total de Pedidos Faturados na Seleção:{" "}
                  <span className="text-slate-800 font-black">
                    {dailyFaturadosOrders.length}
                  </span>
                </div>
              </div>

              {representativeSummary.length === 0 ? (
                <div className="bg-white border text-center p-12 rounded-xl text-gray-400 flex flex-col items-center justify-center gap-2.5">
                  <FileText size={48} className="text-slate-300 stroke-1 animate-pulse" />
                  <p className="text-sm font-bold text-slate-700">Nenhum faturamento registrado para o período.</p>
                  <p className="text-xs text-gray-400 max-w-md">
                    Verifique a data selecionada ou certifique-se de que os pedidos foram faturados de forma correta e constam com o status de faturados (&quot;FATURADO&quot;).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {representativeSummary.map((summary, idx) => {
                    const repUser = db.users.find(
                      (u) =>
                        u.name === summary.representativeName ||
                        u.id === summary.representativeId
                    );
                    const phone = repUser?.phone || "";

                    return (
                      <div
                        key={idx}
                        className="bg-white border border-slate-150 rounded-xl p-4.5 hover:shadow-md transition duration-200 flex flex-col justify-between gap-4"
                      >
                        <div>
                          {/* Title block */}
                          <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                                {summary.representativeName}
                              </h4>
                              <span className="text-[9px] text-gray-450 font-black uppercase tracking-wider block mt-0.5">
                                {repUser ? `Cadastro: ${repUser.role}` : "Venda Direta / Sem Cadastro"}
                              </span>
                            </div>
                            {phone && (
                              <span className="text-[9px] bg-[#00b14f]/10 text-[#00b14f] px-2 py-0.5 rounded-full font-black font-mono">
                                {phone}
                              </span>
                            )}
                          </div>

                          {/* Numeric blocks */}
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100/70">
                              <span className="text-[9px] text-gray-400 font-extrabold uppercase block">
                                Pedidos
                              </span>
                              <span className="text-xs font-black text-slate-800 mt-0.5 block">
                                {summary.orders.length} un.
                              </span>
                            </div>
                            <div className="bg-[#00b14f]/5 p-2.5 rounded-lg border border-[#00b14f]/15">
                              <span className="text-[9px] text-[#00b14f] font-extrabold uppercase block">
                                Peças Comprovadas
                              </span>
                              <span className="text-xs font-black text-[#00b14f] mt-0.5 block">
                                {summary.totalItems} un.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRepName(summary.representativeName);
                              setShowPdfModal(true);
                            }}
                            className="flex-1 py-1.5 bg-slate-900 hover:bg-zinc-800 text-white rounded text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Printer size={12} /> PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const text = generateWhatsAppText(
                                summary.representativeName,
                                summary.orders,
                                summary.totalItems,
                                summary.totalValue
                              );
                              setWaMessageText(text);
                              setWaRecipientPhone(phone || "");
                              setSelectedRepName(summary.representativeName);
                              setShowWaModal(true);
                            }}
                            className="flex-1 py-1.5 bg-[#00b14f] hover:bg-[#009e46] text-white rounded text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <MessageSquare size={12} /> WhatsApp
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </ScrollContainer>

      {/* COMPILADO PDF MODAL PREVIEW */}
      {showPdfModal && selectedRepName && (() => {
        const details = representativeSummary.find(r => r.representativeName === selectedRepName);
        if (!details) return null;

        return (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-xs text-left">
            <style>{`
              @media print {
                .non-printable {
                  display: none !important;
                }
                #print-report-modal {
                  display: block !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  min-height: 0 !important;
                  height: auto !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: white !important;
                }
                .flex-container-to-block {
                  display: block !important;
                }
                /* Prevent breaking elements in the middle of a card across pages */
                .print-block {
                  display: block !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  margin-bottom: 20px !important;
                }
              }
            `}</style>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col overflow-hidden animate-in zoom-in-95 leading-normal max-h-[90vh]">
              {/* Modal Header */}
              <div className="bg-slate-900 text-[#00b14f] p-4 flex items-center justify-between border-b border-[#00b14f]/20 non-printable shrink-0">
                <div className="flex items-center gap-2">
                  <Printer size={20} className="text-[#00b14f]" />
                  <h3 className="font-bold text-sm text-white">Visualizar Relatório de Faturamento (PDF)</h3>
                </div>
                <span className="text-[10px] bg-[#00b14f]/15 text-[#00b14f] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Representante: {selectedRepName}
                </span>
              </div>

              {/* Printable Area Container */}
              <div className="overflow-y-auto p-6 bg-slate-50 flex-1">
                <div
                  id="print-report-modal"
                  className="bg-white border rounded-xl shadow-xs p-8 max-w-3xl mx-auto flex flex-col font-sans text-slate-800 min-h-[29.7cm] justify-between print:min-h-0 print:h-auto print:block print:shadow-none print:border-none print:p-0"
                  style={{ width: "100%", boxSizing: "border-box" }}
                >
                  <div>
                    {/* Header Logo */}
                    <div className="flex items-center justify-between border-b pb-5 border-slate-200 print-block">
                      <div className="flex items-center gap-3">
                        {/* Premium Crown SVG Logo */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-[#00b14f]/30 flex items-center justify-center shrink-0">
                          <svg className="w-8 h-8 text-[#00b14f]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2 19h20v2H2v-2zm2-2.5h16L18 7l-4 4.5L12 4l-2 7.5L6 7 4 16.5z"/>
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">IMPÉRIO JOMARCI</h2>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-extrabold uppercase leading-none">PCP</span>
                          </div>
                          <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider block mt-0.5">
                            Indústria e Comércio de Artefatos de Metal Ltda
                          </span>
                          <p className="text-[9px] text-gray-400 mt-0.5 leading-none">
                            Controle de PCP e Faturamento Consolidado • gerencia.imperiojomarci@gmail.com
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] bg-[#00b14f]/10 text-[#00b14f] px-2.5 py-1 rounded-md font-black uppercase tracking-wider inline-block">
                          Relatório Faturamento
                        </span>
                        <p className="text-[10px] text-gray-400 font-bold font-mono mt-2">
                          Referência: {(() => {
                            if (!filterByDate) return "Todo o Período";
                            const d = new Date(summaryDate + "T12:00:00");
                            return d.toLocaleDateString("pt-BR");
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* Report Information Banner */}
                    <div className="mt-5 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-stretch justify-between gap-4 print-block">
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Agente Comercial</span>
                        <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                          <Users size={15} className="text-[#00b14f]" />
                          {selectedRepName}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                          Demonstrativo de faturamento e romaneio de expedição associado ao representante.
                        </p>
                      </div>
                      <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-center">
                        <div className="text-right sm:text-left">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Data de Emissão</span>
                          <span className="text-[10px] text-slate-700 font-mono font-bold mt-1 block">
                            {new Date().toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Numeric Summary Cards Box */}
                    <div className="grid grid-cols-2 gap-3 mt-4 print-block">
                      <div className="bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Pedidos Faturados</span>
                        <span className="text-base font-black text-slate-900 font-mono block mt-0.5">
                          {details.orders.length}
                        </span>
                      </div>
                      <div className="bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Total de Peças</span>
                        <span className="text-base font-black text-slate-900 font-mono block mt-0.5">
                          {details.totalItems} un
                        </span>
                      </div>
                    </div>

                    {/* Block Info Section (Pedidos) */}
                    <div className="mt-6">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3.5 border-b pb-1.5 border-slate-200 print-block">
                        Detalhamento do Faturamento (Blocos de Pedidos)
                      </h3>

                      <div className="flex flex-col gap-4 flex-container-to-block">
                        {details.orders.map((o, idx) => {
                          const item = db.items.find((i) => String(i.id) === String(o.itemId));
                          const prodName = item?.name || o.customProductName || `Produto #${o.itemId}`;
                          const qtyFatToday = getInvoicedQtyOnDay(o, summaryDate);
                          const accumFat = o.status === "FATURADO" ? (o.totalQuantity || 0) : (o.invoicedQuantity || 0);
                          const totalQty = o.totalQuantity || 0;
                          const val = qtyFatToday * (o.unitPrice || 0);

                          return (
                            <div 
                              key={idx} 
                              className="print-block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-xs transition duration-150 flex flex-col gap-2.5"
                            >
                              {/* Card Header block */}
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-black text-emerald-700">
                                    Pedido #{o.orderCode}
                                  </span>
                                  {o.isThirdPartyLaser && (
                                    <span className="text-[8px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-black uppercase">
                                      Terceirizado
                                    </span>
                                  )}
                                  {o.isUrgent && (
                                    <span className="text-[8px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black uppercase">
                                      Urgente
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono font-bold">
                                  Entrega: {o.deliveryDate ? o.deliveryDate.split("-").reverse().join("/") : "-"}
                                </span>
                              </div>

                              {/* Card Body block */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-1">
                                <div>
                                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block">Cliente</span>
                                  <span className="text-xs font-black text-slate-800 block truncate" title={o.customerName}>
                                    {o.customerName}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block">Produto</span>
                                  <span className="text-xs font-black text-slate-700 block truncate" title={prodName}>
                                    {item?.code ? `[${item.code}] ` : ""}{prodName}
                                  </span>
                                </div>
                              </div>

                              {/* Attributes & Financial calculations Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200/60 items-center justify-items-stretch">
                                <div>
                                  <span className="text-[8px] text-gray-400 font-bold block">Cor</span>
                                  <span className="text-[10px] font-bold text-slate-700 block truncate">{o.color || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-gray-400 font-bold block">Tamanho</span>
                                  <span className="text-[10px] font-bold text-slate-700 block truncate">{o.size || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-gray-400 font-bold block">Var.</span>
                                  <span className="text-[10px] font-bold text-slate-700 block truncate">{o.variation || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-gray-400 font-bold block">Qtd. Faturada</span>
                                  <span className="text-[10px] font-black text-slate-800 block font-mono">
                                    {qtyFatToday} <span className="text-[8px] font-semibold text-gray-400">({accumFat}/{totalQty})</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Summary & Signatures at bottom */}
                  <div className="mt-8 pt-6 border-t border-slate-200 print-block">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                      <div className="text-[9px] text-gray-400 leading-normal font-medium">
                        <h4 className="font-bold text-slate-800 uppercase tracking-widest text-[8px] mb-1">Notas e Termos de Expedição</h4>
                        <p>O faturamento consolidado acima reflete a conferência física e liberação das peças finalizadas.</p>
                        <p className="mt-0.5">As baixas de estoque foram processadas de forma irrevogável conforme as diretrizes do regulamento interno Império Jomarci.</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-1.5 sm:ml-auto w-full sm:max-w-xs justify-center">
                        <div className="flex justify-between text-xs text-gray-500 font-semibold gap-4">
                          <span>Pedidos Consolidados:</span>
                          <span className="text-slate-800 font-extrabold">{details.orders.length} un</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 font-semibold gap-4">
                          <span>Peças Baixadas:</span>
                          <span className="text-slate-800 font-extrabold">{details.totalItems} un</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-8 text-[9px] text-gray-400 font-black uppercase tracking-wider pt-6 border-t border-dashed border-slate-200">
                      <div className="flex flex-col items-center gap-1 w-full sm:w-auto">
                        <div className="w-48 border-b border-gray-300"></div>
                        <span>Assinatura Gerencial</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 w-full sm:w-auto font-mono text-[9px] text-gray-400">
                        <span>PCP Império Jomarci</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Actions) */}
              <div className="bg-gray-50 px-5 py-3.5 flex justify-end gap-2 border-t border-gray-150 shrink-0 non-printable">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRepName(null);
                    setShowPdfModal(false);
                  }}
                  className="px-3.5 py-1.5 border rounded-lg text-xs font-bold text-gray-705 hover:bg-gray-100 transition cursor-pointer"
                >
                  Fechar Janela
                </button>
                <button
                  type="button"
                  onClick={() => {
                    import("./printUtils").then(({ exportRepresentativeBillingPdf }) => {
                      exportRepresentativeBillingPdf(
                        selectedRepName,
                        summaryDate,
                        details,
                        db.items,
                        getInvoicedQtyOnDay
                      );
                    });
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-600/10 active:scale-95 duration-100"
                >
                  <Download size={14} /> Baixar PDF (Arquivo Digital)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    import("./printUtils").then(({ printElementById }) => {
                      printElementById("print-report-modal", `Fechamento_${selectedRepName || "Representante"}`, true);
                    });
                  }}
                  className="px-3.5 py-1.5 bg-[#00b14f] hover:bg-[#009e46] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10 active:scale-95 duration-100"
                >
                  <Printer size={14} /> Imprimir / Salvar PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* COMPILADO WHATSAPP PREVIEW MODAL */}
      {showWaModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-xs text-left">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 text-left leading-normal max-h-[85vh]">
            {/* Header */}
            <div className="bg-slate-900 text-[#00b14f] p-4 flex items-center justify-between border-b border-[#00b14f]/20 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} className="text-[#00b14f]" />
                <h3 className="font-bold text-sm text-white">Consolidado WhatsApp</h3>
              </div>
              <span className="text-[10px] bg-[#00b14f]/15 text-[#00b14f] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                {selectedRepName}
              </span>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              <p className="text-xs text-gray-500 font-medium">
                Este é o compilado consolidado pronto para envio comercial ao representante <strong>{selectedRepName}</strong>.
              </p>

              {/* Recipient Phone input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Telefone do Representante (País + DDD + Número)
                </label>
                <input
                  type="text"
                  value={waRecipientPhone}
                  placeholder="Ex: 5511999998888"
                  onChange={(e) => setWaRecipientPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full border border-slate-200 p-2 text-xs font-mono rounded bg-slate-50 focus:ring-1 focus:ring-[#00b14f] outline-none text-slate-800"
                />
                {!waRecipientPhone && (
                  <span className="text-[9px] text-amber-600 font-bold">
                    ⚠️ Insira o número do celular acima caso queira abrir diretamente no WhatsApp!
                  </span>
                )}
              </div>

              {/* Preview Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Mensagem Gerada
                </label>
                <pre className="text-[10px] bg-slate-950 text-emerald-400 p-3.5 rounded-xl font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[35vh] select-all">
                  {waMessageText}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-5 py-3.5 flex justify-end gap-2 border-t border-gray-150 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowWaModal(false);
                  setSelectedRepName(null);
                }}
                className="px-3.5 py-1.5 border rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(waMessageText);
                  alert("Mensagem consolidada copiada para a área de transferência!");
                }}
                className="px-3.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Copiar Texto
              </button>
              <button
                type="button"
                onClick={() => {
                  let cleanPhone = waRecipientPhone.trim();
                  if (cleanPhone && !cleanPhone.startsWith("55") && cleanPhone.length === 11) {
                    cleanPhone = "55" + cleanPhone;
                  }
                  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(
                    waMessageText
                  )}`;
                  window.open(url, "_blank");
                  setShowWaModal(false);
                }}
                className="px-3.5 py-1.5 bg-[#00b14f] hover:bg-[#009e46] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Phone size={13} className="text-white" /> Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenLayout>
  );
}
