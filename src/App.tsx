/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "motion/react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
} from "react-router-dom";
import {
  Box,
  Home,
  List,
  ShoppingCart,
  LogOut,
  ArrowLeft,
  BarChart2,
  Activity,
  ClipboardList,
  AlertCircle,
  Paintbrush,
  Gauge,
  Timer,
  Scissors,
  Bell,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  Crown,
  Monitor,
  History,
  Calendar,
  Settings,
  Users,
  Hammer,
  Beaker,
  Package,
  X,
  FileDown,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  Check,
  HelpCircle,
  Filter,
  UploadCloud,
  Phone,
  DollarSign,
  Printer,
  Truck,
  Copy,
  Edit3,
  Plus,
  Image as ImageIcon,
  Maximize,
  Minimize,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useDatabase } from "./useDatabase";
import type { User, OrderStatus, Role, Order, AppNotification } from "./types";
import { calculateWorkingMillis } from "./timeUtils";
import { ColorBadgeWithImage, getColorAttribute } from "./components/ColorBadgeWithImage";
import { getItemUnit } from "./utils/unitUtils";

import { ProducaoScreen } from "./ProducaoScreen";
import { PinturaScreen } from "./PinturaScreen";
import { CorteLaserScreen } from "./CorteLaserScreen";
import { RelatoriosScreen } from "./RelatoriosScreen";
import { EmbalagemScreen } from "./EmbalagemScreen";
import { LoteGeralWidget } from "./components/LoteGeralWidget";
import { usePushNotifications } from "./usePushNotifications";
import { EstoqueScreen } from "./EstoqueScreen";
import { EstoqueNestingScreen } from "./EstoqueNestingScreen";
import { EstoqueChapasScreen } from "./EstoqueChapasScreen";
import { RepresentanteScreen } from "./RepresentanteScreen";
import { UploadNestScreen } from "./UploadNestScreen";
import { HistoricoProducaoScreen } from "./HistoricoProducaoScreen";
import { PCPScreen } from "./PCPScreen";
import { QualidadeScreen } from "./components/QualidadeScreen";
import { RelatoriosProducaoEQualidade } from "./components/RelatoriosProducaoEQualidade";
import { FilaRitmoScreen } from "./FilaRitmoScreen";
import { PedidosSemLoteScreen } from "./PedidosSemLoteScreen";
import { GestaoClientesScreen } from "./GestaoClientesScreen";
import { LotesScreen } from "./LotesScreen";
import { EtiquetasTab } from "./EtiquetasTab";
import { FinanceiroScreen } from "./FinanceiroScreen";
import { SuperAdminScreen } from "./components/SuperAdminScreen";
import { ShieldAlert } from "lucide-react";

import { BanhoQuimicoScreen } from "./BanhoQuimicoScreen";
import { PrensaEduardoScreen } from "./PrensaEduardoScreen";
import { TornoCncWillianScreen } from "./TornoCncWillianScreen";
import { TornoCncHenriqueScreen } from "./TornoCncHenriqueScreen";
import { PrensaRafaelScreen } from "./PrensaRafaelScreen";
import { InjetoraScreen } from "./InjetoraScreen";
import { LogisticaScreen } from "./LogisticaScreen";
import { OrcamentoLaserScreen } from "./OrcamentoLaserScreen";
import { MontagemRetratilScreen } from "./MontagemRetratilScreen";
import { ReportHeaderLogo } from "./components/ReportHeaderLogo";
import { normalizeString, findCustomerForOrder, getCustomerLocationLabel } from "./searchUtils";

// Custom virtualization and metrics components
import { MonitoramentoMetricsSummary } from "./components/MonitoramentoMetricsSummary";
import { RealTimeFactoryMonitoring } from "./components/RealTimeFactoryMonitoring";
import { useVirtualScroll } from "./hooks/useVirtualScroll";
import {
  ScreenLayout,
  ScreenHeader,
  ScrollContainer,
  StickyActionsBar,
  ResponsiveCardGrid,
  SectionBlock,
  MobileCompactToolbar,
  CompactScreenHeader,
} from "./components/Layout";

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

import { CatalogImportModal } from "./CatalogImportModal";
import { EvolucaoEmbalagemTab } from "./EvolucaoEmbalagemTab";
import { GestaoPessoasTab } from "./components/GestaoPessoasTab";
import { COLOR_MAP, isSubTabAllowed } from "./types";

class ScreenErrorBoundary extends React.Component<
  { children: React.ReactNode; screenName?: string },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ScreenErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl m-4 text-slate-800 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 font-bold text-red-700 text-base mb-2">
            <AlertCircle size={24} className="text-red-600" />
            <span>Ocorreu um problema nesta tela ({(this as any).props.screenName || "Itens"})</span>
          </div>
          <p className="text-xs text-slate-600 mb-4 max-w-md">
            {this.state.error?.message || "Erro inesperado ao renderizar."}
          </p>
          <button
            onClick={() => (this as any).setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const BottomNavContext = React.createContext<{ isCollapsed: boolean }>({ isCollapsed: false });

function NavLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  const { isCollapsed } = React.useContext(BottomNavContext);

  if (isCollapsed) {
    return (
      <Link
        to={to}
        title={label}
        className="flex items-center justify-center p-1.5 min-w-[38px] h-[36px] text-gray-500 hover:text-blue-600 active:bg-blue-50 active:text-blue-700 rounded-lg transition-colors shrink-0"
      >
        <div className="flex items-center justify-center text-slate-600 hover:text-blue-600">
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<any>, { size: 18 })
            : icon}
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center p-2 min-w-[64px] min-h-[48px] text-gray-500 hover:text-blue-600 active:bg-blue-50 active:text-blue-700 rounded-lg transition-colors shrink-0"
    >
      {icon}
      <span className="text-xs mt-1 font-medium">{label}</span>
    </Link>
  );
}

function Welcome({
  currentUser,
  db,
}: {
  currentUser: User;
  db: ReturnType<typeof useDatabase>;
}) {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [infoModalData, setInfoModalData] = useState<{
    title: string;
    body: React.ReactNode;
  } | null>(null);

  useEffect(() => {
    const role = currentUser.role;
    const isEduardo =
      role === "PRENSA_EDUARDO" ||
      currentUser.id === "prensa_eduardo" ||
      currentUser.name.toLowerCase().includes("prensa eduardo");
    const isRafael =
      role === "PRENSA_RAFAEL" ||
      currentUser.id === "prensa_rafael" ||
      currentUser.name.toLowerCase().includes("prensa rafael");

    if (isEduardo) {
      navigate("/prensa-eduardo");
      return;
    }
    if (isRafael) {
      navigate("/prensa-rafael");
      return;
    }

    const hasRedirectedKey = `has_redirected_on_load_${currentUser.id}`;
    const alreadyRedirected = sessionStorage.getItem(hasRedirectedKey);

    if (!alreadyRedirected) {
      sessionStorage.setItem(hasRedirectedKey, "true");
      if (role === "PCP" || role === "ADMIN" || currentUser.id === "romario" || currentUser.name.toLowerCase().includes("romario") || currentUser.id === "dinei" || currentUser.name.toLowerCase().includes("dinei")) {
        navigate("/pedidos");
      } else if (role === "GERENCIA") {
        navigate("/relatorios");
      } else if (role === "QUALIDADE") {
        navigate("/qualidade");
      } else if (role === "EMBALAGEM") {
        navigate("/embalagem");
      } else if (role === "CORTE_LASER") {
        navigate("/corte-laser");
      } else if (role === "INJETORA") {
        navigate("/injetora");
      } else if (
        role === "TORNO_CNC_WILLIAN" ||
        role === "TORNO_CNC_HENRIQUE" ||
        role === "BANHO_QUIMICO"
      ) {
        navigate(
          role === "TORNO_CNC_WILLIAN"
            ? "/torno-cnc-willian"
            : role === "TORNO_CNC_HENRIQUE"
              ? "/torno-cnc-henrique"
              : "/banho-quimico",
        );
      } else if (role === "MONTAGEM_RETRATIL") {
        navigate("/montagem-retratil");
      } else if (
        role === "PRODUCAO" ||
        role === "SOLDA" ||
        role === "MONTAGEM_RODRIGO" ||
        role === "PINTURA"
      ) {
        navigate("/producao");
      }
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    // Force existing orders assignment rule
    const clientsForAndre = [
      "m√≥veis bom pastor",
      "moveis bom pastor",
      "bom pastor",
      "Moveis B P LTDA",
      "lara moveis",
      "lara m√≥veis",
      "artano",
      "grupo sier",
      "sier",
    ];
    let needsUpdate = false;
    const updatedOrders = db.orders
      .map((o) => {
        const isClientForAndre = clientsForAndre.some((clientName) =>
          (o.customerName || "").toLowerCase().includes(clientName),
        );
        if (
          isClientForAndre &&
          (!o.representativeName ||
            !o.representativeName.toLowerCase().includes("andr"))
        ) {
          const andreRep = db.users.find(
            (u) =>
              u.name.toLowerCase().includes("andr√©") ||
              u.name.toLowerCase().includes("andre"),
          );
          if (andreRep) {
            needsUpdate = true;
            return {
              ...o,
              representativeName: andreRep.name,
              representativeId: andreRep.id,
            };
          }
        }
        return null;
      })
      .filter((o) => o !== null) as typeof db.orders;

    if (needsUpdate && updatedOrders.length > 0) {
      db.updateOrders(updatedOrders);
    }
  }, [db.orders.length, db.users, db]); // Keep deps lightweight

  const alerts = React.useMemo(() => {
    const isRomarioOrAlessandra =
      currentUser.name.toLowerCase().includes("romario") ||
      currentUser.name.toLowerCase().includes("alessandra");
    if (isRomarioOrAlessandra) return [];

    // PCP, GERENCIA, ADMIN should NOT see alerts (they only want notifications)
    if (
      currentUser.role === "PCP" ||
      currentUser.role === "GERENCIA" ||
      currentUser.role === "ADMIN"
    ) {
      return [];
    }

    if (currentUser.role !== "LEITURA") return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return db.orders.filter((o) => {
      if (o.status === "EMBALADO" || o.status === "FATURADO") return false;
      const d = new Date(o.deliveryDate);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d.getTime() <= today.getTime();
    });
  }, [currentUser, db.orders]);

  const delayedOrders = React.useMemo(() => {
    const isRomarioOrAlessandra =
      currentUser.name.toLowerCase().includes("romario") ||
      currentUser.name.toLowerCase().includes("alessandra");
    if (isRomarioOrAlessandra) return [];

    // PCP, GERENCIA, ADMIN should NOT see delayed orders (they only want notifications)
    if (
      currentUser.role === "PCP" ||
      currentUser.role === "GERENCIA" ||
      currentUser.role === "ADMIN"
    ) {
      return [];
    }

    if (currentUser.role !== "LEITURA") return [];

    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
    return db.orders.filter((o) => {
      return o.status === "PENDENTE" && o.createdAt < fortyEightHoursAgo;
    });
  }, [currentUser, db.orders]);

  const unreadNotifications = React.useMemo(() => {
    return db.notifications.filter((n) => {
      if (n.read) return false;

      if (n.recipientId && n.recipientId !== currentUser?.id) {
        return false;
      }

      if (n.recipientId === currentUser?.id) return true;

      // REPRESENTANTE role: only show billing-related notifications for their linked orders
      if (currentUser?.role === "REPRESENTANTE") {
        const msgLower = n.message.toLowerCase();
        const isBillingRelated =
          msgLower.includes("fatur") ||
          msgLower.includes("nota fiscal") ||
          msgLower.includes("carga");
        if (!isBillingRelated) return false;

        // Find if this notification is linked to any order of this representative
        const repOrders = db.orders.filter((o) => {
          const isDirectMatch =
            o.representativeId === currentUser.id ||
            o.representativeName === currentUser.name;
          const isDaniloCheck =
            currentUser.id === "representante_danilo" &&
            ((o.representativeName &&
              o.representativeName.toLowerCase().includes("mapefor")) ||
              (o.representativeId && o.representativeId === "mapefor"));
          return isDirectMatch || isDaniloCheck;
        });

        // Match order by orderCode or customerName
        const matchCode = n.message.match(/\b\d{4,8}\b/);
        const isLinkedToRep = repOrders.some((o) => {
          const matchesCode = matchCode ? o.orderCode === matchCode[0] : false;
          const matchesTextCode =
            o.orderCode && msgLower.includes(o.orderCode.toLowerCase());
          const matchesCustomer =
            o.customerName && msgLower.includes(o.customerName.toLowerCase());
          return matchesCode || matchesTextCode || matchesCustomer;
        });

        return isLinkedToRep;
      }

      // Marcos (Projetista) receives only notifications related to Laser/Corte production
      if (
        currentUser?.id === "projetista_marcos" ||
        currentUser?.role === "PROJETISTA"
      ) {
        const msg = n.message.toLowerCase();
        const isLaser =
          msg.includes("laser") ||
          msg.includes("corte") ||
          msg.includes("nesting") ||
          msg.includes("chapa");
        const isOtherSec =
          msg.includes("prensa") ||
          msg.includes("injetora") ||
          msg.includes("pintura") ||
          msg.includes("banho") ||
          msg.includes("embalagem") ||
          msg.includes("solda");
        return isLaser && !isOtherSec;
      }

      return true;
    });
  }, [db.notifications, db.orders, currentUser]);

  const handleNotificationClick = React.useCallback(
    (n: AppNotification) => {
      const match = n.message.match(/\b\d{4,8}\b/);
      let found = null;
      if (match) {
        found = db.orders.find((o) => o.orderCode === match[0]);
      }
      if (found) {
        setSelectedOrder(found);
      } else {
        const orderWithCustomer = db.orders.find((o) =>
          n.message.toLowerCase().includes(o.customerName.toLowerCase()),
        );
        if (orderWithCustomer) {
          setSelectedOrder(orderWithCustomer);
        } else {
          setInfoModalData({
            title: "Notifica√ß√£o Informativa",
            body: (
              <div className="space-y-4 text-left">
                <p className="text-gray-750 font-medium text-sm border-l-4 border-blue-500 pl-3 py-1 bg-gray-50 rounded">
                  {n.message}
                </p>
                <div className="text-xs text-gray-500">
                  Registrada em: {new Date(n.createdAt).toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 italic mt-2">
                  Dica: Marque como lida na listagem se este aviso j√° tiver sido
                  processado.
                </p>
              </div>
            ),
          });
        }
      }
    },
    [db.orders],
  );

  const getOrderStatusBadgeColor = React.useCallback((status?: string) => {
    switch (status) {
      case "PENDENTE":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "TEM_ESTOQUE":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "EM_PRODUCAO":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PRODUZIDO":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "EM_CORTE":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "CORTADO":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "EM_PINTURA":
        return "bg-amber-500/10 text-amber-650 border-amber-500/20";
      case "PINTADO":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "EMBALANDO":
        return "bg-green-100 text-green-800 border-green-200";
      case "EMBALADO":
        return "bg-lime-105 text-lime-800 border-lime-200";
      case "FATURADO":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  const selectedOrderLogs = React.useMemo(() => {
    if (!selectedOrder) return [];
    return db.logs
      .filter((l) => l.orderId === selectedOrder.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedOrder, db.logs]);

  const isAiEnabledForUser = false; // Removido globally for Welcome screen

  const isSpecialUser =
    currentUser.role === "PCP" ||
    currentUser.role === "GERENCIA" ||
    currentUser.role === "ADMIN";
  const notificationsToDisplay = unreadNotifications;

  return (
    <div className="flex flex-col flex-1 items-center justify-start p-4 text-center overflow-y-auto h-full w-full min-h-0 scrollbar-thin">
      <h2 className="text-2xl font-bold text-gray-800 mt-4">
        Bem-vindo, {currentUser.name}!
      </h2>
      <p className="text-gray-500 mt-2 mb-4">
        Escolha uma op√ß√£o no menu inferior.
      </p>

      <div className="mt-8 mx-auto w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2 pb-8">
        {(currentUser.role === "ADMIN" ||
          currentUser.role === "GERENCIA" ||
          currentUser.role === "LEITURA" ||
          currentUser.role === "PCP" ||
          currentUser.role === "REPRESENTANTE" ||
          currentUser.role === "PROJETISTA" ||
          currentUser.role === "ENCARREGADO") &&
          unreadNotifications.length > 0 && (
            <div
              className={
                isSpecialUser
                  ? "text-left w-full h-auto flex flex-col bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm"
                  : "text-left w-full h-full flex flex-col bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              }
            >
              <div className="flex items-center justify-between font-bold mb-2 shrink-0">
                <div className="flex items-center gap-2 text-blue-700">
                  <Bell size={20} />
                  <span>Notifica√ß√µes ({unreadNotifications.length})</span>
                </div>
                <button
                  onClick={() => unreadNotifications.forEach(n => db.markNotificationRead(n.id))}
                  className="text-[10px] bg-blue-100/60 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded cursor-pointer transition-colors"
                >
                  Marcar todas como lidas
                </button>
              </div>
              <p className="text-xs text-blue-600 mb-3 shrink-0">
                Dica: Clique em uma notifica√ß√£o para ver os detalhes completos
                do pedido associado.
              </p>
              <ul className="text-sm text-blue-900 flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1 max-h-[285px] flex-1">
                {notificationsToDisplay.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="bg-white p-3 rounded-lg shadow-sm border border-blue-100 flex flex-col gap-2 cursor-pointer hover:bg-blue-100/50 hover:border-blue-300 transition-all duration-150"
                  >
                    <div className="font-medium text-gray-800">{n.message}</div>
                    <div className="flex justify-between items-center text-[10px] mt-1 space-x-2">
                      <span className="text-gray-500 font-semibold">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          db.markNotificationRead(n.id);
                        }}
                        className="text-blue-700 font-bold hover:underline bg-blue-100/60 px-2 py-1 rounded cursor-pointer transition-colors"
                      >
                        Marcar como lido
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {alerts.length > 0 && (
          <div className="text-left w-full h-full flex flex-col bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="flex items-center gap-2 text-red-700 font-bold mb-2 shrink-0">
              <AlertCircle size={20} />
              <span>Atrasos/Entregas Hoje ({alerts.length})</span>
            </div>
            <p className="text-xs text-red-600 mb-3 shrink-0">
              Clique em um alerta abaixo para abrir a ficha do pedido.
            </p>
            <ul className="text-sm text-red-900 flex flex-col gap-2 overflow-y-auto flex-1 styling-scrollbar pr-1">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  onClick={() => setSelectedOrder(a)}
                  className="bg-white p-2 rounded-lg shadow-sm border border-red-100 flex flex-col gap-1.5 cursor-pointer hover:bg-red-100/40 hover:border-red-300 transition-all duration-150"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-sm">
                      C√≥d: {a.orderCode}
                    </span>
                    <span className="text-[10px] text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded-full border border-red-200/50">
                      {new Date(a.deliveryDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 font-medium">
                    Cliente:{" "}
                    <span className="text-gray-800">{a.customerName}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {delayedOrders.length > 0 && (
          <div className="text-left w-full h-full flex flex-col bg-orange-50 border border-orange-200 rounded-xl p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="flex items-center gap-2 text-orange-700 font-bold mb-2 shrink-0">
              <AlertCircle size={20} />
              <span>Sem Iniciar h√° &gt; 48h ({delayedOrders.length})</span>
            </div>
            <p className="text-xs text-orange-600 mb-3 shrink-0">
              Clique em um lote parado abaixo para ver seu progresso de logs.
            </p>
            <ul className="text-sm text-orange-900 flex flex-col gap-2 overflow-y-auto flex-1 styling-scrollbar pr-1">
              {delayedOrders.map((a) => (
                <li
                  key={a.id}
                  onClick={() => setSelectedOrder(a)}
                  className="bg-white p-2 rounded-lg shadow-sm border border-orange-100 flex flex-col gap-1.5 cursor-pointer hover:bg-orange-100/40 hover:border-orange-300 transition-all duration-150"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-sm">
                      C√≥d: {a.orderCode}
                    </span>
                    <span className="text-[10px] text-orange-700 font-bold bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200/50">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 font-medium">
                    Cliente:{" "}
                    <span className="text-gray-800">{a.customerName}</span>
                  </div>
                  <div className="text-[10px] text-orange-600 font-bold bg-orange-50 rounded px-1.5 py-0.5 self-start border border-orange-100">
                    Status: Parado em Pendente
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(currentUser.role === "ADMIN" ||
        currentUser.role === "GERENCIA" ||
        currentUser.role === "PCP") && (
        <div className="mt-6 w-full max-w-6xl text-left bg-white border border-slate-200 shadow-sm rounded-xl p-5 md:p-6 font-sans shrink-0">
          <div className="flex border-b border-slate-100 pb-3 justify-between items-center flex-wrap gap-2 mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold">
                  <List size={16} />
                </span>
                Fila de Produ√ß√£o
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pedidos em acompanhamento PCP.
              </p>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-2">
            Acompanhe pedidos abertos sem lote gerado, verifique urg√™ncias
            sinalizadas e agrupamentos recomendados.
          </p>
        </div>
      )}

      {/* --- ORDER DETAILS POPUP MODAL --- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 text-left animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-black text-white p-4 flex justify-between items-center border-b border-[#00b14f]/20">
              <div className="flex items-center gap-2">
                <Crown size={20} className="text-[#00b14f]" />
                <h3 className="font-bold text-lg tracking-tight">
                  Ficha do Pedido: {selectedOrder.orderCode}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-white transition duration-150 text-xl font-bold px-2 py-1 rounded cursor-pointer"
              >
                ‚úï
              </button>
            </div>

            {/* Content Body (Scrollable) */}
            <div className="flex-1 overflow-auto p-5 space-y-5">
              {/* Box 1: General Info */}
              <div className="bg-slate-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Informa√ß√µes Gerais
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Cliente:
                    </span>
                    <strong className="text-gray-800">
                      {selectedOrder.customerName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Representante:
                    </span>
                    <strong className="text-gray-800">
                      {selectedOrder.representativeName || "Venda Direta"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Data do Pedido:
                    </span>
                    <strong className="text-gray-700">
                      {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Data Prometida:
                    </span>
                    <strong className="text-red-650 font-semibold">
                      {selectedOrder.deliveryDate
                        ? selectedOrder.deliveryDate
                            .split("-")
                            .reverse()
                            .join("/")
                        : "-"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Status Atual:
                    </span>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${getOrderStatusBadgeColor(selectedOrder.status)}`}
                    >
                      {selectedOrder.status || "PENDENTE"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 block">
                      Especifica√ß√µes:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedOrder.isUrgent && (
                        <span className="bg-red-100 text-red-800 border-red-200 border text-[9px] font-bold px-1.5 py-0.5 rounded">
                          ‚ö†Ô∏è URGENTE
                        </span>
                      )}
                      {selectedOrder.isProgramacao && (
                        <span className="bg-indigo-100 text-indigo-800 border-indigo-200 border text-[9px] font-bold px-1.5 py-0.5 rounded">
                          üìà PROGRAMA√á√ÉO
                        </span>
                      )}
                      {selectedOrder.isThirdPartyLaser && (
                        <span className="bg-indigo-100 text-indigo-800 border-indigo-200 border text-[9px] font-bold px-1.5 py-0.5 rounded">
                          ‚öôÔ∏è TERCEIRO LASER
                        </span>
                      )}
                      {!selectedOrder.isUrgent &&
                        !selectedOrder.isProgramacao &&
                        !selectedOrder.isThirdPartyLaser && (
                          <span className="bg-gray-100 text-gray-650 border-gray-200 border text-[9px] font-medium px-1.5 py-0.5 rounded">
                            Padr√£o
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Product & Attributes */}
              <div className="border border-gray-200 p-4 rounded-lg bg-emerald-50/20 border-emerald-500/10">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Item e Atributos
                </h4>
                <div className="text-sm">
                  <span className="text-xs text-gray-450 block">
                    Produto Cadastrado:
                  </span>
                  <strong className="text-gray-800 text-base">
                    {db.items.find((i) => i.id === selectedOrder.itemId)
                      ?.name || `ID Item: ${selectedOrder.itemId}`}
                  </strong>
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-100 text-xs font-mono text-gray-600">
                    <div>
                      <span className="text-[10px] text-gray-450 block">
                        Cor:
                      </span>
                      <span>{selectedOrder.color || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-450 block">
                        Tamanho:
                      </span>
                      <span>{selectedOrder.size || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-450 block">
                        Varia√ß√£o:
                      </span>
                      <span>{selectedOrder.variation || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 3: Production Progress Slices */}
              <div className="border border-gray-200 p-4 rounded-lg bg-white space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Acompanhamento de Produ√ß√£o
                </h4>
                <div className="space-y-2.5">
                  {/* Total pieces header */}
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Meta Total do Lote:</span>
                    <span className="text-indigo-700">
                      {selectedOrder.totalQuantity} Pe√ßas
                    </span>
                  </div>

                  {/* Progressive phases */}
                  {[
                    {
                      label: "1. Corte Laser",
                      qtyInStage: selectedOrder.cutQuantity || 0,
                      color: "bg-indigo-600",
                    },
                    {
                      label: "2. Produ√ß√£o/Solda",
                      qtyInStage: selectedOrder.producedQuantity || 0,
                      color: "bg-blue-600",
                    },
                    {
                      label: "3. Pintura",
                      qtyInStage: selectedOrder.paintedQuantity || 0,
                      color: "bg-amber-500",
                    },
                    {
                      label: "4. Embalado",
                      qtyInStage: selectedOrder.packedQuantity || 0,
                      color: "bg-green-600",
                    },
                    {
                      label: "5. Faturado/Entregue",
                      qtyInStage: selectedOrder.invoicedQuantity || 0,
                      color: "bg-gray-600",
                    },
                  ].map((phase, idx) => {
                    const pct = Math.min(
                      100,
                      Math.max(
                        0,
                        (phase.qtyInStage / selectedOrder.totalQuantity) * 100,
                      ),
                    );
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-gray-700">
                            {phase.label}
                          </span>
                          <span className="text-gray-500 font-medium">
                            {phase.qtyInStage} / {selectedOrder.totalQuantity}{" "}
                            p√ßs ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${phase.color} transition-all duration-300`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Box 4: Log Timelines */}
              <div className="border border-gray-200 p-4 rounded-lg bg-white space-y-3">
                <div className="flex items-center gap-1.5">
                  <History size={16} className="text-gray-400" />
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Hist√≥rico de Opera√ß√µes (Rastreabilidade)
                  </h4>
                </div>
                {selectedOrderLogs.length === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-2">
                    Nenhum registro de produ√ß√£o inserido no banco hist√≥rico
                    ainda.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-52 overflow-auto pr-1">
                    {selectedOrderLogs.map((log) => {
                      const opName =
                        db.users.find((u) => u.id === log.operatorId)?.name ||
                        log.operatorId;
                      let actionText = "";
                      if (log.type === "CORTE_LASER")
                        actionText = `Cortou ${log.quantityCut || 0} p√ßs`;
                      if (log.type === "PRODUCAO")
                        actionText = `Processou ${log.quantityProcessed || 0} p√ßs`;
                      if (log.type === "PINTURA")
                        actionText = `Pintou ${log.quantityPainted || 0} p√ßs`;
                      if (log.type === "EMBALAGEM")
                        actionText = `Embalou ${log.quantityPacked || 0} p√ßs`;
                      if (log.type === "FATURAMENTO")
                        actionText = `Faturou/Entregou ${log.quantityInvoiced || 0} p√ßs`;

                      return (
                        <div
                          key={log.id}
                          className="text-xs border-l-2 border-[#00b14f] pl-3 py-1 space-y-0.5"
                        >
                          <div className="flex justify-between font-semibold text-gray-700">
                            <span>{log.type}</span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-gray-600 font-medium">
                            {actionText} ‚Ä¢ Operador:{" "}
                            <span className="font-semibold">{opName}</span>
                          </div>
                          {log.durationMillis > 0 && (
                            <div className="text-[10px] text-gray-400">
                              Tempo ativo:{" "}
                              {Math.round(log.durationMillis / 60000)} min (
                              {Math.round(log.durationMillis / 1000)}s)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("print-order", { detail: selectedOrder }),
                  );
                  setSelectedOrder(null);
                }}
                className="bg-[#00b14f] hover:bg-[#009e46] text-white font-extrabold py-1.5 px-3.5 rounded text-xs transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 duration-100"
              >
                <Printer size={13} /> PDF do Pedido
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-zinc-805 hover:bg-zinc-700 text-gray-700 hover:text-white border border-gray-300 font-bold py-1.5 px-4 rounded text-xs transition duration-150 cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- INFO GENERAL POPUP MODAL --- */}
      {infoModalData && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 text-left animate-in zoom-in-95 duration-150">
            <div className="bg-black text-white p-4 flex justify-between items-center border-b border-[#00b14f]/20">
              <h3 className="font-bold text-base tracking-tight">
                {infoModalData.title}
              </h3>
              <button
                onClick={() => setInfoModalData(null)}
                className="text-gray-400 hover:text-white transition duration-150 text-xl font-bold px-1 rounded cursor-pointer"
              >
                ‚úï
              </button>
            </div>
            <div className="p-5">{infoModalData.body}</div>
            <div className="bg-gray-50 p-3 border-t flex justify-end">
              <button
                onClick={() => setInfoModalData(null)}
                className="bg-[#00b14f] hover:bg-[#00913f] text-white font-bold py-1.5 px-4 rounded text-xs transition duration-150 cursor-pointer shadow-xs"
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

function LoginScreen({
  users,
  tenants,
  onLogin,
  deferredPrompt,
  setDeferredPrompt,
  isStandalone,
  isIOS,
  isInIframe,
  handleInstallClick,
}: {
  users: User[];
  tenants?: import('./types').Tenant[];
  onLogin: (u: User) => void;
  deferredPrompt: any;
  setDeferredPrompt: React.Dispatch<React.SetStateAction<any>>;
  isStandalone: boolean;
  isIOS: boolean;
  isInIframe: boolean;
  handleInstallClick: () => Promise<void>;
}) {
  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");

  const [selectedLoginTenantId, setSelectedLoginTenantId] = useState(() => {
    return localStorage.getItem("login_tenant_id") || "imperio";
  });

  const normalizeStr = (s?: string) =>
    (s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const detectedTenant = React.useMemo(() => {
    const raw = (usernameInput || "").trim();
    const typed = normalizeStr(raw);
    const parts = typed.split(".");
    if (parts.length > 1) {
      const suffix = parts[parts.length - 1];
      const found = tenants?.find(
        (t) =>
          t &&
          t.id &&
          (normalizeStr(t.id) === suffix ||
            normalizeStr(t.id).replace(/^empresa_/i, "") === suffix ||
            normalizeStr(t.name) === suffix)
      );
      if (found) return found;
    }
    return (
      tenants?.find((t) => t && t.id === selectedLoginTenantId) ||
      tenants?.find((t) => t && t.id === "imperio") || {
        id: "imperio",
        name: "Imp√©rio Jomarci",
        logoUrl: "/icon.png",
        primaryColor: "#00b14f",
        systemName: "Apontador de Produ√ß√£o",
      }
    );
  }, [usernameInput, tenants, selectedLoginTenantId]);

  // Synchronize selected login tenant with typed suffix if detected
  useEffect(() => {
    const raw = (usernameInput || "").trim();
    const typed = normalizeStr(raw);
    const parts = typed.split(".");
    if (parts.length > 1) {
      const suffix = parts[parts.length - 1];
      const found = tenants?.find(
        (t) =>
          t &&
          t.id &&
          (normalizeStr(t.id) === suffix ||
            normalizeStr(t.id).replace(/^empresa_/i, "") === suffix ||
            normalizeStr(t.name) === suffix)
      );
      if (found && found.id !== selectedLoginTenantId) {
        setSelectedLoginTenantId(found.id);
        localStorage.setItem("login_tenant_id", found.id);
      }
    }
  }, [usernameInput, tenants, selectedLoginTenantId]);

  const handleLogin = () => {
    const rawTyped = (usernameInput || "").trim();
    const typed = normalizeStr(rawTyped);
    if (!typed) {
      alert("Por favor, digite o usu√°rio.");
      return;
    }

    // Identify if the user typed an explicit company suffix (e.g. joao.cyrnedecor)
    const lastDotIdx = typed.lastIndexOf(".");
    let explicitTenantId: string | null = null;
    let baseTyped = typed;

    if (lastDotIdx > 0) {
      const candidateSuffix = typed.substring(lastDotIdx + 1);
      const matchedTenant = tenants?.find(
        (t) =>
          t &&
          t.id &&
          (normalizeStr(t.id) === candidateSuffix ||
            normalizeStr(t.id).replace(/^empresa_/i, "") === candidateSuffix ||
            normalizeStr(t.name) === candidateSuffix)
      );
      if (matchedTenant) {
        explicitTenantId = matchedTenant.id;
        baseTyped = typed.substring(0, lastDotIdx);
      }
    }

    const targetTenantId = explicitTenantId || selectedLoginTenantId || "imperio";

    let user: User | undefined;

    // 1. Global Admin check (e.g. raul)
    if (typed === "raul" || baseTyped === "raul") {
      user = users.find((u) => u && normalizeStr(u.id) === "raul");
    }

    // 2. Priority: Match within the target tenant
    if (!user) {
      // Direct ID match with or without suffix
      user = users.find((u) => {
        if (!u || !u.id) return false;
        const uTenant = u.tenantId || "imperio";
        if (uTenant !== targetTenantId && uTenant !== "global") return false;

        const uId = normalizeStr(u.id);
        const uIdBase = uId.replace(/\.[^.]+$/, "");
        return (
          uId === typed ||
          uId === `${baseTyped}.${normalizeStr(targetTenantId)}` ||
          uId === baseTyped ||
          uIdBase === baseTyped
        );
      });
    }

    // 3. Match by user display name within the target tenant
    if (!user) {
      user = users.find((u) => {
        if (!u || !u.name) return false;
        const uTenant = u.tenantId || "imperio";
        if (uTenant !== targetTenantId && uTenant !== "global") return false;

        const uName = normalizeStr(u.name);
        const cleanName = uName
          .replace(new RegExp(`\\s*${normalizeStr(targetTenantId)}.*$`, "i"), "")
          .replace(/\s*\([^)]*\)/g, "")
          .trim();

        return uName === typed || uName === baseTyped || cleanName === baseTyped;
      });
    }

    // 4. If no explicit tenant was typed and not found in selected tenant,
    // check if the username uniquely belongs to another registered company
    if (!user && !explicitTenantId) {
      const candidates = users.filter((u) => {
        if (!u || !u.id) return false;
        const uId = normalizeStr(u.id);
        const uIdBase = uId.replace(/\.[^.]+$/, "");
        const uName = normalizeStr(u.name || "");
        return (
          uId === typed ||
          uIdBase === typed ||
          uName === typed ||
          uName.replace(/\s*\([^)]*\)/g, "").trim() === typed
        );
      });

      if (candidates.length === 1) {
        // Unambiguous single match in the whole system
        user = candidates[0];
      } else if (candidates.length > 1) {
        // Ambiguous match across multiple companies:
        // Filter candidates by selectedLoginTenantId
        const scopedMatch = candidates.find(
          (u) => (u.tenantId || "imperio") === selectedLoginTenantId
        );
        if (scopedMatch) {
          user = scopedMatch;
        } else {
          alert(
            `O usu√°rio "${rawTyped}" existe em mais de uma empresa. Por favor, digite o seu login com o sufixo da empresa no formato: ${rawTyped}.empresa`
          );
          return;
        }
      }
    }

    if (user) {
      const userPass = user.password || "0000";
      const isRaulOverride = user.id === "raul" && password === "230213";
      if (password !== userPass && !isRaulOverride) {
        alert("Senha Incorreta");
        return;
      }
      if (user.id === "raul") {
        user.role = "ADMIN";
        user.tenantId = "global";
      } else if (user.id === "prensa_eduardo" || user.name.toLowerCase().includes("prensa eduardo")) {
        user.role = "PRENSA_EDUARDO";
      } else if (user.id === "prensa_rafael" || user.name.toLowerCase().includes("prensa rafael")) {
        user.role = "PRENSA_RAFAEL";
      } else if (!user.tenantId) {
        user.tenantId = "imperio";
      }

      // Update stored login tenant preference
      const finalTenantId = user.tenantId === "global" ? selectedLoginTenantId : user.tenantId;
      localStorage.setItem("login_tenant_id", finalTenantId);
      setSelectedLoginTenantId(finalTenantId);

      if (
        "Notification" in window &&
        Notification.permission !== "granted" &&
        Notification.permission !== "denied"
      ) {
        Notification.requestPermission();
      }
      onLogin({ ...user });
    } else {
      alert("Usu√°rio Incorreto");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 items-center justify-center p-4">
      <div className="bg-black border border-zinc-800 p-8 rounded-xl shadow-2xl w-full max-w-sm flex flex-col items-center">
        <div className="flex flex-col items-center gap-1 mb-6">
          {detectedTenant.logoUrl && detectedTenant.logoUrl !== "/icon.png" && detectedTenant.id !== "imperio" ? (
            <img src={detectedTenant.logoUrl} alt="Logo" className="h-16 object-contain mb-2 max-w-[200px]" />
          ) : (
            <Monitor size={48} className="text-[#00b14f] mb-2" style={{ color: detectedTenant.primaryColor || '#00b14f' }} />
          )}
          <h1 className="text-2xl font-bold tracking-tight text-center text-[#00b14f]" style={{ color: detectedTenant.primaryColor || '#00b14f' }}>
            Apontador de Produ√ß√£o
          </h1>
          <span className="text-[0.65rem] text-gray-400 font-medium tracking-[0.1em] text-center uppercase">
            {detectedTenant.name && detectedTenant.id !== "imperio" ? detectedTenant.name : "Acesso ao Sistema"}
          </span>
        </div>

        <input
          type="text"
          placeholder="Usu√°rio (Ex: gerencia.imp)"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          className="border border-zinc-750 p-3 w-full rounded-lg mb-4 text-center text-lg focus:outline-none focus:ring-2 focus:border-transparent bg-zinc-900 text-white placeholder-zinc-500"
          style={{ '--tw-ring-color': detectedTenant.primaryColor || '#00b14f' } as any}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-zinc-750 p-3 w-full rounded-lg mb-4 text-center text-lg focus:outline-none focus:ring-2 focus:border-transparent bg-zinc-900 text-white placeholder-zinc-500"
          style={{ '--tw-ring-color': detectedTenant.primaryColor || '#00b14f' } as any}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <button
          onClick={handleLogin}
          className="w-full text-black font-bold p-3 rounded-lg hover:brightness-110 transition text-lg mt-2 tracking-wide"
          style={{ backgroundColor: detectedTenant.primaryColor || '#00b14f' }}
        >
          Entrar
        </button>
      </div>

      {!isStandalone && (
        <div className="mt-6 w-full max-w-sm bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2" style={{ color: detectedTenant.primaryColor || '#00b14f' }}>
            <span className="text-lg">üì≤</span>
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-zinc-300">
              Instalar Aplicativo (Tela Cheia)
            </h3>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Instale o aplicativo de apontamento de produ√ß√£o para funcionar em{" "}
            <strong>tela inteira sem as barras do navegador</strong> e com o √≠cone direto no seu celular ou computador.
          </p>

          {isInIframe ? (
            <div className="bg-amber-950/40 p-3 rounded-lg border border-amber-900/40 text-[10px] text-zinc-300 flex flex-col gap-1.5 leading-snug">
              <span className="font-bold uppercase tracking-wide block text-amber-400">
                ‚ö†Ô∏è Executando dentro do Editor
              </span>
              <p>
                Por seguran√ßa, o navegador <strong>bloqueia a instala√ß√£o de aplicativos (PWA)</strong> quando o sistema √© visualizado dentro do painel de testes do editor (iframe).
              </p>
              <p>
                Para instalar o sistema como App no seu celular ou computador, por favor, clique no bot√£o abaixo para abrir em uma aba cheia:
              </p>
              <button
                onClick={() => window.open(window.location.href, "_blank")}
                className="w-full flex items-center justify-center gap-1.5 hover:opacity-95 text-black text-xs font-bold py-2 px-3 rounded transition-all cursor-pointer mt-1"
                style={{ backgroundColor: detectedTenant.primaryColor || '#00b14f' }}
              >
                Abrir em Nova Aba ‚Üó
              </button>
            </div>
          ) : deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 hover:bg-opacity-90 text-black text-xs font-bold py-2.5 px-3 rounded-lg transition-all cursor-pointer shadow-md"
              style={{ backgroundColor: detectedTenant.primaryColor || '#00b14f' }}
            >
              <span>üì•</span> Instalar Aplicativo
            </button>
          ) : isIOS ? (
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/40 text-[10px] text-zinc-400 flex flex-col gap-1.5 leading-snug">
              <span className="font-bold uppercase tracking-wide block" style={{ color: detectedTenant.primaryColor || '#00b14f' }}>
                Instru√ß√µes para iPhone:
              </span>
              <p>
                1. Toque no bot√£o de <strong>Compartilhar</strong> (√≠cone{" "}
                <span className="text-zinc-200">üì§</span> na barra inferior do
                Safari).
              </p>
              <p>
                2. Role a lista e toque em{" "}
                <strong>"Adicionar √† Tela de In√≠cio"</strong> (√≠cone{" "}
                <span className="text-zinc-200">‚ûï</span>).
              </p>
              <p>
                3. Toque em "Adicionar" no canto superior direito para confirmar.
              </p>
            </div>
          ) : (
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/40 text-[10px] text-zinc-400 flex flex-col gap-1.5 leading-snug">
              <span className="font-bold uppercase tracking-wide block text-zinc-300">
                Como Instalar no Celular:
              </span>
              <p>
                1. Clique no menu de <strong className="text-zinc-200">tr√™s pontinhos</strong> no canto superior do navegador (ou toque no √≠cone de instalar na barra de endere√ßo).
              </p>
              <p>
                2. Selecione <strong className="text-zinc-200">"Instalar aplicativo"</strong> ou <strong className="text-zinc-200">"Adicionar √† tela inicial"</strong>.
              </p>
              <p className="text-[9px] block mt-1" style={{ color: detectedTenant.primaryColor || '#00b14f' }}>
                ‚úì O √≠cone "Apontador" ser√° adicionado √† tela do seu dispositivo!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItensScreen({ db }: { db: ReturnType<typeof useDatabase> }) {
  const [activeTab, setActiveTab] = useState<
    "PRODUTOS" | "PECAS" | "EPIS" | "CORES" | "VARIACOES" | "TAMANHOS"
  >("PRODUTOS");
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("UN");
  const [basePrice, setBasePrice] = useState<number | "">("");
  const [productiveCost, setProductiveCost] = useState<number | "">("");
  const [productionPoints, setProductionPoints] = useState<number | "">("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [standardCycles, setStandardCycles] = useState<Record<number, number>>({});
  const [itemFluxos, setItemFluxos] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);

  // Attribute Management State (Cores, Varia√ß√µes, Tamanhos)
  const [attrValue, setAttrValue] = useState("");
  const [attrCode, setAttrCode] = useState("");
  const [attrImageUrl, setAttrImageUrl] = useState("");
  const [attrEditingId, setAttrEditingId] = useState<number | null>(null);
  const [isUploadingAttrImage, setIsUploadingAttrImage] = useState(false);

  // Components (BOM - Bill of Materials) modal
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [currentBomProduct, setCurrentBomProduct] = useState<
    (typeof db.items)[0] | null
  >(null);
  const [componentSearch, setComponentSearch] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState<number | "">(
    "",
  );
  const [componentQuantity, setComponentQuantity] = useState<number>(1);

  // Excel Modal State for Items
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelData, setExcelData] = useState("");
  const [excelImportProgress, setExcelImportProgress] = useState<number>(0);
  const [excelImportResult, setExcelImportResult] = useState<string | null>(
    null,
  );

  // Batch Image Import State
  const [isBatchImageModalOpen, setIsBatchImageModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [batchImageFiles, setBatchImageFiles] = useState<FileList | null>(null);
  const [batchImageProgress, setBatchImageProgress] = useState(0);
  const [batchImageResult, setBatchImageResult] = useState("");
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);

  const handleAttrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAttrImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setAttrImageUrl(dataUrl);
        setIsUploadingAttrImage(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleCadastrarAttr = async (type: "COLOR" | "VARIATION" | "SIZE") => {
    if (!attrValue.trim()) {
      alert("‚ö†Ô∏è Por favor, digite o nome/descri√ß√£o para o cadastro.");
      return;
    }

    if (attrEditingId) {
      const existing = db.attributes.find((a) => a.id === attrEditingId);
      if (existing) {
        await db.updateAttribute({
          ...existing,
          value: attrValue.trim().toUpperCase(),
          code: attrCode.trim().toUpperCase() || undefined,
          imageUrl: type === "COLOR" ? (attrImageUrl || undefined) : undefined,
        });
      }
      setAttrEditingId(null);
    } else {
      await db.addAttribute({
        type,
        value: attrValue.trim().toUpperCase(),
        code: attrCode.trim().toUpperCase() || undefined,
        imageUrl: type === "COLOR" ? (attrImageUrl || undefined) : undefined,
      });
    }

    setAttrValue("");
    setAttrCode("");
    setAttrImageUrl("");
  };

  const handleEditAttr = (attr: import("./types").ProductAttribute) => {
    setAttrEditingId(attr.id);
    setAttrValue(attr.value);
    setAttrCode(attr.code || "");
    setAttrImageUrl(attr.imageUrl || "");
    setIsFormCollapsed(false);
  };

  const handleDeleteAttr = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta op√ß√£o?")) {
      await db.deleteAttribute(id);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const filteredAttributesList = (db.attributes || []).filter((a) => {
    if (!a) return false;
    if (activeTab === "CORES" && a.type !== "COLOR") return false;
    if (activeTab === "VARIACOES" && a.type !== "VARIATION") return false;
    if (activeTab === "TAMANHOS" && a.type !== "SIZE") return false;
    if (!debouncedSearchTerm) return true;
    const searchStr = normalizeString(`${a.value || ""} ${a.code || ""}`);
    return searchStr.includes(normalizeString(debouncedSearchTerm));
  });

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  React.useEffect(() => {
    const handleEvents = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExcelModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEvents);
    return () => window.removeEventListener("keydown", handleEvents);
  }, []);

  const filteredItems = (db.items || []).filter((it) => {
    if (!it) return false;
    const isPeca = it.type === "PECA";
    const isEpi = it.type === "EPI";
    if (activeTab === "PRODUTOS" && (isPeca || isEpi)) return false;
    if (activeTab === "PECAS" && !isPeca) return false;
    if (activeTab === "EPIS" && !isEpi) return false;

    const term = normalizeString(debouncedSearchTerm || "");
    const searchTarget = normalizeString(`${it.code || ""} ${it.name || ""}`);
    return searchTarget.includes(term);
  });

  const searchedPecas = db.items
    .filter((it) => it.type === "PECA")
    .filter((it) => {
      return normalizeString(`${it.code} ${it.name}`).includes(
        normalizeString(componentSearch),
      );
    })
    .slice(0, 10);

  const handleImportExcel = async () => {
    if (!excelData.trim()) return;

    setExcelImportResult("Processando...");
    setExcelImportProgress(0);

    const rows = excelData.trim().split("\n");
    let addedCount = 0;
    let updatedCount = 0;

    const firstRowCols = rows[0].split("\t").map((c) => c.trim().toUpperCase());
    let startIdx = 0;

    let idxCode = 0;
    let idxName = 1;
    let idxPrice = 2;
    let idxPoints = 3;

    if (
      firstRowCols.includes("C√ìDIGO") ||
      firstRowCols.includes("COD") ||
      firstRowCols.includes("C√ìD. ITEM") ||
      firstRowCols.includes("PRODUTO") ||
      firstRowCols.includes("ITEM") ||
      firstRowCols.includes("PE√áA")
    ) {
      startIdx = 1;
      const getCol = (names: string[]) =>
        firstRowCols.findIndex((c) => names.some((n) => c.includes(n)));

      idxCode = getCol(["C√ìDIGO", "C√ìD", "COD"]);
      idxName = getCol(["PRODUTO", "ITEM", "NOME", "PE√áA"]);
      idxPrice = getCol(["PRE√áO", "PRECO", "VALOR"]);
      idxPoints = getCol(["PONTOS", "PONTUA√á√ÉO", "PONTUACAO"]);
    }

    const updatedItems = [];
    const validationWarnings: string[] = [];

    for (let i = startIdx; i < rows.length; i++) {
      if (i % 25 === 0) {
        setExcelImportProgress(
          Math.round(((i - startIdx) / (rows.length - startIdx)) * 100),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const row = rows[i];
      if (!row.trim()) continue;
      const cols = row.split("\t").map((c) => c.trim());

      const rCode = idxCode >= 0 ? cols[idxCode] : "";
      const rName = idxName >= 0 ? cols[idxName] : "";
      const rPriceStr = idxPrice >= 0 ? cols[idxPrice] : "";
      const rPointsStr = idxPoints >= 0 ? cols[idxPoints] : "";

      if (!rCode && !rName) continue;

      const basePriceParsed = parseFloat((rPriceStr || "").replace(",", "."));
      const price = !isNaN(basePriceParsed) ? basePriceParsed : undefined;

      if (rPriceStr && (isNaN(basePriceParsed) || basePriceParsed < 0)) {
        const errorMsg = `Planilha Linha ${i + 1}: Pre√ßo base inv√°lido ou malformado ("${rPriceStr}") para o c√≥digo "${rCode || rName}"`;
        console.warn(errorMsg);
        validationWarnings.push(errorMsg);
      }

      const pointsParsed = parseFloat((rPointsStr || "").replace(",", "."));
      const points = !isNaN(pointsParsed) ? pointsParsed : undefined;

      if (rPointsStr && (isNaN(pointsParsed) || pointsParsed < 0)) {
        const errorMsg = `Planilha Linha ${i + 1}: Pontos de produ√ß√£o inv√°lidos ("${rPointsStr}") para o c√≥digo "${rCode || rName}"`;
        console.warn(errorMsg);
        validationWarnings.push(errorMsg);
      }

      const existing = db.items.find(
        (it) =>
          (rCode && it.code === rCode) ||
          (rName && it.name.toUpperCase() === rName.toUpperCase()),
      );

      if (existing) {
        updatedItems.push({
          ...existing,
          code: rCode || existing.code,
          name: rName || existing.name,
          basePrice: price !== undefined ? price : existing.basePrice,
          productionPoints:
            points !== undefined ? points : existing.productionPoints,
          type:
            activeTab === "PECAS"
              ? "PECA"
              : activeTab === "EPIS"
                ? "EPI"
                : "PRODUTO",
        });
        updatedCount++;
      } else {
        if (rCode && rName) {
          db.addItem({
            code: rCode,
            name: rName,
            notes: "",
            basePrice: price,
            productionPoints: points,
            type:
              activeTab === "PECAS"
                ? "PECA"
                : activeTab === "EPIS"
                  ? "EPI"
                  : "PRODUTO",
          });
          addedCount++;
        }
      }
    }

    setExcelImportProgress(100);

    for (const item of updatedItems) {
      db.updateItem(item);
    }

    const warningText =
      validationWarnings.length > 0
        ? `\n\n‚ö†Ô∏è Alertas de importa√ß√£o:\n${validationWarnings.slice(0, 5).join("\n")}${validationWarnings.length > 5 ? `\n...e mais ${validationWarnings.length - 5} alertas` : ""}`
        : "";

    setExcelImportResult(
      `Conclu√≠do! ${addedCount} novos, ${updatedCount} atualizados.${warningText}`,
    );
    setExcelData("");
    setTimeout(() => {
      setIsExcelModalOpen(false);
      setExcelImportResult(null);
    }, 4500);
  };

  const handleBatchImageUploadClick = async () => {
    if (!batchImageFiles || batchImageFiles.length === 0) return;

    setIsUploadingBatch(true);
    setBatchImageProgress(0);
    setBatchImageResult("");

    let successCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < batchImageFiles.length; i++) {
      const file = batchImageFiles[i];

      // Extract product code from filename without extension
      const fileNameWithoutExt =
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name;

      // Match by exact code or name (case insensitive)
      const matchedItem = db.items.find(
        (it) =>
          it.code.toUpperCase() === fileNameWithoutExt.toUpperCase() ||
          it.name.toUpperCase() === fileNameWithoutExt.toUpperCase(),
      );

      if (matchedItem) {
        try {
          const storageRef = ref(
            storage,
            `products/${Date.now()}_${file.name}`,
          );
          await new Promise((resolve) => {
            const uploadTask = uploadBytesResumable(storageRef, file);
            uploadTask.on(
              "state_changed",
              null,
              (err) => {
                console.warn(
                  "Storage upload failed in batch, falling back to compressed local Base64 for file: " +
                    file.name,
                  err,
                );
                const reader = new FileReader();
                reader.onloadend = () => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 450;
                    const MAX_HEIGHT = 450;
                    let width = img.width;
                    let height = img.height;
                    if (
                      width > height ? width > MAX_WIDTH : height > MAX_HEIGHT
                    ) {
                      const ratio =
                        width > height
                          ? MAX_WIDTH / width
                          : MAX_HEIGHT / height;
                      width *= ratio;
                      height *= ratio;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      const compressed = canvas.toDataURL("image/jpeg", 0.7);
                      db.updateItem({ ...matchedItem, imageUrl: compressed });
                      successCount++;
                      resolve(null);
                    } else {
                      db.updateItem({
                        ...matchedItem,
                        imageUrl: reader.result as string,
                      });
                      successCount++;
                      resolve(null);
                    }
                  };
                  img.src = reader.result as string;
                };
                reader.onerror = () => {
                  resolve(null); // resolve anyway to avoid block
                };
                reader.readAsDataURL(file);
              },
              async () => {
                try {
                  const downloadURL = await getDownloadURL(
                    uploadTask.snapshot.ref,
                  );
                  db.updateItem({ ...matchedItem, imageUrl: downloadURL });
                  successCount++;
                  resolve(null);
                } catch (err) {
                  console.error(
                    "Download URL failed, using base64 direct fallback",
                    err,
                  );
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    db.updateItem({
                      ...matchedItem,
                      imageUrl: reader.result as string,
                    });
                    successCount++;
                    resolve(null);
                  };
                  reader.readAsDataURL(file);
                }
              },
            );
          });
        } catch (err) {
          console.error("Failed to upload image", file.name, err);
        }
      } else {
        notFoundCount++;
      }

      setBatchImageProgress(
        Math.round(((i + 1) / batchImageFiles.length) * 100),
      );
    }

    setBatchImageResult(
      `Conclu√≠do! ${successCount} imagens associadas com sucesso. ${notFoundCount} n√£o encontraram produtos.`,
    );
    setIsUploadingBatch(false);

    setTimeout(() => {
      setIsBatchImageModalOpen(false);
      setBatchImageResult("");
      setBatchImageFiles(null);
    }, 5000);
  };

  const handleCadastrar = () => {
    if (!code) {
      alert("‚ö†Ô∏è Erro de formul√°rio: O campo 'C√≥digo' √© obrigat√≥rio.");
      console.warn("Item save prevented: missing 'code' field.");
      return;
    }
    if (!name) {
      alert("‚ö†Ô∏è Erro de formul√°rio: O campo 'Nome' √© obrigat√≥rio.");
      console.warn("Item save prevented: missing 'name' field.");
      return;
    }

    // Validate basePrice if specified
    if (basePrice !== "") {
      const parsedPrice = Number(basePrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        alert(
          `‚ö†Ô∏è Pre√ßo base inv√°lido: "${basePrice}" n√£o √© um pre√ßo v√°lido. O valor deve ser um n√∫mero positivo ou ficar em branco.`,
        );
        console.warn(`Item save prevented: invalid basePrice "${basePrice}".`);
        return;
      }
    }

    // Validate productionPoints if specified
    if (productionPoints !== "") {
      const parsedPoints = Number(productionPoints);
      if (isNaN(parsedPoints) || parsedPoints < 0) {
        alert(
          `‚ö†Ô∏è Pontos de produ√ß√£o inv√°lidos: "${productionPoints}" n√£o √© v√°lido. O valor deve ser maior ou igual a zero ou ficar em branco.`,
        );
        console.warn(
          `Item save prevented: invalid productionPoints "${productionPoints}".`,
        );
        return;
      }
    }

    const itemType =
      activeTab === "PECAS" ? "PECA" : activeTab === "EPIS" ? "EPI" : "PRODUTO";

    if (editingId) {
      const existing = db.items.find((i) => i.id === editingId);
      if (existing) {
        db.updateItem({
          ...existing,
          code,
          name,
          unit: unit || "UN",
          basePrice: basePrice === "" ? undefined : basePrice,
          unitPrice: basePrice === "" ? undefined : basePrice,
          productiveCost: productiveCost === "" ? undefined : productiveCost,
          productionPoints:
            productionPoints === "" ? undefined : productionPoints,
          type: itemType,
          imageUrl: imageUrl || existing.imageUrl || "",
          standardCycles,
          fluxos: itemFluxos,
        });
      }
      setEditingId(null);
    } else {
      db.addItem({
        code,
        name,
        notes: "",
        unit: unit || "UN",
        basePrice: basePrice === "" ? undefined : basePrice,
        unitPrice: basePrice === "" ? undefined : basePrice,
        productiveCost: productiveCost === "" ? undefined : productiveCost,
        productionPoints:
          productionPoints === "" ? undefined : productionPoints,
        type: itemType,
        imageUrl: imageUrl || "",
        standardCycles,
        fluxos: itemFluxos,
      });
    }
    setCode("");
    setName("");
    setUnit("UN");
    setBasePrice("");
    setProductiveCost("");
    setProductionPoints("");
    setImageUrl("");
    setStandardCycles({});
    setItemFluxos([]);
  };

  const handleEdit = (it: (typeof db.items)[0]) => {
    setEditingId(it.id);
    setCode(it.code);
    setName(it.name);
    setUnit(it.unit || (getItemUnit(it) === "PAR" ? "PAR" : "UN"));
    setBasePrice(it.basePrice !== undefined ? it.basePrice : "");
    setProductiveCost(it.productiveCost !== undefined ? it.productiveCost : "");
    setProductionPoints(
      it.productionPoints !== undefined ? it.productionPoints : "",
    );
    setImageUrl(it.imageUrl || "");
    setStandardCycles(it.standardCycles || {});
    setItemFluxos(it.fluxos || []);
    setActiveTab(
      it.type === "PECA" ? "PECAS" : it.type === "EPI" ? "EPIS" : "PRODUTOS",
    );
    setIsFormCollapsed(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setIsUploadingImage(true);
    setImageUploadProgress(50);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800; // Updated typical size
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setImageUrl(compressedBase64);
        } else {
          setImageUrl((event.target?.result as string) || "");
        }
        setIsUploadingImage(false);
        setImageUploadProgress(100);
      };
      img.onerror = () => {
        setIsUploadingImage(false);
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.onerror = () => {
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir?")) {
      db.deleteItem(id);
    }
  };

  const openBom = (prod: (typeof db.items)[0]) => {
    setCurrentBomProduct(prod);
    setIsBomModalOpen(true);
    setComponentQuantity(1);
    setSelectedComponentId("");
    setComponentSearch("");
  };

  const handleAddComponent = () => {
    if (
      !currentBomProduct ||
      selectedComponentId === "" ||
      componentQuantity <= 0
    )
      return;
    const comps = currentBomProduct.components || [];
    const updated = {
      ...currentBomProduct,
      components: [
        ...comps,
        { itemId: selectedComponentId as number, quantity: componentQuantity },
      ],
    };
    db.updateItem(updated);
    setCurrentBomProduct(updated);
    setSelectedComponentId("");
  };

  const handleRemoveComponent = (idx: number) => {
    if (!currentBomProduct) return;
    const comps = [...(currentBomProduct.components || [])];
    comps.splice(idx, 1);
    const updated = { ...currentBomProduct, components: comps };
    db.updateItem(updated);
    setCurrentBomProduct(updated);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-gray-800">Itens</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="bg-[#107c41] hover:bg-[#185c37] text-white text-xs font-bold py-1 px-3 rounded shadow transition w-fit"
            >
              Importar do Excel (com pre√ßos)
            </button>
            <button
              onClick={() => setIsBatchImageModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1 px-3 rounded shadow transition w-fit"
            >
              Importar Lote Imagens
            </button>
            <button
              onClick={() => setIsCatalogModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded shadow transition w-fit flex items-center gap-1"
            >
              <FileText size={14} /> Importar Cat√°logo PDF
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar itens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500 w-48"
          />
        </div>
      </div>

      <div className="flex bg-white rounded-lg shadow-sm border p-1 mb-4 overflow-x-auto gap-1">
        <button
          onClick={() => { setActiveTab("PRODUTOS"); setEditingId(null); setAttrEditingId(null); }}
          className={`flex-1 min-w-[90px] py-1.5 px-3 text-xs sm:text-sm font-bold rounded-md transition ${activeTab === "PRODUTOS" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Produtos
        </button>
        <button
          onClick={() => { setActiveTab("PECAS"); setEditingId(null); setAttrEditingId(null); }}
          className={`flex-1 min-w-[90px] py-1.5 px-3 text-xs sm:text-sm font-bold rounded-md transition ${activeTab === "PECAS" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Pe√ßas
        </button>
        <button
          onClick={() => { setActiveTab("EPIS"); setEditingId(null); setAttrEditingId(null); }}
          className={`flex-1 min-w-[90px] py-1.5 px-3 text-xs sm:text-sm font-bold rounded-md transition ${activeTab === "EPIS" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          EPIs
        </button>
        <button
          onClick={() => { setActiveTab("CORES"); setEditingId(null); setAttrEditingId(null); }}
          className={`flex-1 min-w-[100px] py-1.5 px-3 text-xs sm:text-sm font-bold rounded-md transition ${activeTab === "CORES" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          üé® Cores
        </button>
        <button
          onClick={() => { setActiveTab("VARIACOES"); setEditingId(null); setAttrEditingId(null); }}
          className={`flex-1 min-w-[100px] py-1.5 px-3 text-xs sm:text-sm font-bold rounded-md transition ${activeTab === "VARIACOES" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          üîÄ Varia√ß√µes
        </button>
        <button
          onClick={() => { setActiveTab("TAMANHOS"); setEditingId(null); setAttrEditingId(null); }}
          className={`flex-1 min-w-[100px] py-1.5 px-3 text-xs sm:text-sm font-bold rounded-md transition ${activeTab === "TAMANHOS" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          üìê Tamanhos
        </button>
      </div>

      {/* Modal Importar */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Importa√ß√£o de{" "}
                {activeTab === "PECAS"
                  ? "Pe√ßas"
                  : activeTab === "EPIS"
                    ? "EPIs"
                    : "Produtos"}{" "}
                via Excel
              </h3>
              <button
                onClick={() => setIsExcelModalOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              Cole os dados diretamente do Excel. Colunas esperadas:
              <br />
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs text-blue-800">
                C√≥digo | Nome | Pre√ßo (opcional) | Pontua√ß√£o (opcional)
              </span>
            </p>

            <textarea
              className="w-full border border-gray-300 rounded p-2 text-xs font-mono mb-2 flex-1 overflow-auto bg-gray-50 focus:bg-white transition-colors whitespace-pre"
              rows={12}
              placeholder="Cole (Ctrl+V) as colunas do Excel/Google Sheets aqui..."
              value={excelData}
              onChange={(e) => setExcelData(e.target.value)}
            />

            {excelImportResult && (
              <div
                className={`mt-4 p-3 rounded text-sm font-semibold flex flex-col gap-2 ${excelImportResult.includes("Processando") ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700 border border-green-200"}`}
              >
                <div className="flex justify-between items-center">
                  <span>{excelImportResult}</span>
                  {excelImportResult.includes("Processando") && (
                    <span className="text-xs font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-800">
                      {excelImportProgress}%
                    </span>
                  )}
                </div>
                {excelImportResult.includes("Processando") && (
                  <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-out"
                      style={{ width: `${excelImportProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4 shrink-0">
              <button
                onClick={() => setIsExcelModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportExcel}
                disabled={!excelData.trim() || !!excelImportResult}
                className="bg-[#107c41] hover:bg-[#185c37] text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50"
              >
                Confirmar Importa√ß√£o
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog PDF Import Modal */}
      <CatalogImportModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        db={db}
      />

      {/* Modal Lote Imagens */}
      {isBatchImageModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Importa√ß√£o em Lote de Imagens
              </h3>
              <button
                onClick={() => setIsBatchImageModalOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Selecione as imagens correspondentes aos produtos. O sistema usar√°
              o nome do arquivo (ex:{" "}
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">
                SAP-GIR-01.jpg
              </span>
              ) para buscar o c√≥digo ou nome do produto automaticamente.
            </p>

            <div className="flex-1 overflow-auto p-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 mb-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setBatchImageFiles(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                disabled={isUploadingBatch}
              />
              {batchImageFiles && batchImageFiles.length > 0 && (
                <p className="mt-4 font-semibold text-gray-700 shrink-0">
                  {batchImageFiles.length} arquivo(s) selecionado(s).
                </p>
              )}
            </div>

            {batchImageResult && (
              <div
                className={`mt-2 mb-4 p-3 rounded text-sm font-semibold flex flex-col gap-2 ${isUploadingBatch ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700 border border-green-200"}`}
              >
                <div className="flex justify-between items-center">
                  <span>{batchImageResult || "Processando..."}</span>
                  {isUploadingBatch && (
                    <span className="text-xs font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-800">
                      {batchImageProgress}%
                    </span>
                  )}
                </div>
                {isUploadingBatch && (
                  <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-out"
                      style={{ width: `${batchImageProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsBatchImageModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchImageUploadClick}
                disabled={!batchImageFiles || isUploadingBatch}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50"
              >
                Iniciar Upload
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto w-full pr-1">
        {activeTab === "CORES" || activeTab === "VARIACOES" || activeTab === "TAMANHOS" ? (
          <div className="flex flex-col gap-4">
            {/* Form Card for Attributes */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                <span>
                  {attrEditingId
                    ? `Editando ${activeTab === "CORES" ? "Cor" : activeTab === "VARIACOES" ? "Varia√ß√£o" : "Tamanho"}`
                    : `Cadastrar Novo(a) ${activeTab === "CORES" ? "Cor" : activeTab === "VARIACOES" ? "Varia√ß√£o" : "Tamanho"}`}
                </span>
                {attrEditingId && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
                    Modo Edi√ß√£o
                  </span>
                )}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nome / Descri√ß√£o <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={attrValue}
                    onChange={(e) => setAttrValue(e.target.value)}
                    placeholder={
                      activeTab === "CORES"
                        ? "Ex: PRETO FOSCO, AZUL CELESTE, ZINCADO..."
                        : activeTab === "VARIACOES"
                        ? "Ex: DIREITO, ESQUERDO, PAR..."
                        : "Ex: P, M, G, GG, 120CM..."
                    }
                    className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    C√≥digo / Abrevia√ß√£o (Opcional)
                  </label>
                  <input
                    type="text"
                    value={attrCode}
                    onChange={(e) => setAttrCode(e.target.value)}
                    placeholder="Ex: 01, 02, DIR, M..."
                    className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                  />
                </div>
              </div>

              {activeTab === "CORES" && (
                <div className="mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <span className="bg-purple-100 text-purple-700 p-1 rounded text-xs">üì∑</span>
                    Imagem da Cor
                  </label>
                  <div className="flex items-center gap-4">
                    {attrImageUrl ? (
                      <div className="relative group">
                        <img
                          src={attrImageUrl}
                          alt="Amostra da Cor"
                          className="w-20 h-20 object-cover rounded-lg shadow border border-gray-300 cursor-pointer hover:opacity-90 transition"
                          onClick={() => setFullSizeImage(attrImageUrl)}
                        />
                        <button
                          type="button"
                          onClick={() => setAttrImageUrl("")}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 text-xs shadow hover:bg-red-700 transition cursor-pointer"
                          title="Remover imagem"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 p-1 text-center">
                        <ImageIcon size={20} />
                        <span className="text-[9px] font-semibold mt-1">Sem imagem</span>
                      </div>
                    )}
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAttrImageUpload}
                        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        disabled={isUploadingAttrImage}
                      />
                      <span className="text-[10px] text-gray-500">
                        Selecione uma foto ou amostra da cor.
                      </span>
                      {isUploadingAttrImage && (
                        <span className="text-xs text-indigo-600 font-semibold animate-pulse">
                          Processando imagem...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                {attrEditingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttrEditingId(null);
                      setAttrValue("");
                      setAttrCode("");
                      setAttrImageUrl("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 font-bold text-xs rounded hover:bg-gray-300 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    handleCadastrarAttr(
                      activeTab === "CORES"
                        ? "COLOR"
                        : activeTab === "VARIACOES"
                        ? "VARIATION"
                        : "SIZE"
                    )
                  }
                  className="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded shadow hover:bg-indigo-700 transition cursor-pointer"
                >
                  {attrEditingId
                    ? "Atualizar"
                    : `Salvar ${activeTab === "CORES" ? "Cor" : activeTab === "VARIACOES" ? "Varia√ß√£o" : "Tamanho"}`}
                </button>
              </div>
            </div>

            {/* List of attributes */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                  {activeTab === "CORES"
                    ? "Cores Cadastradas"
                    : activeTab === "VARIACOES"
                    ? "Varia√ß√µes Cadastradas"
                    : "Tamanhos Cadastrados"}
                </h4>
                <span className="text-xs text-gray-500 font-semibold">
                  Total: {filteredAttributesList.length}
                </span>
              </div>

              {filteredAttributesList.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  Nenhum registro cadastrado nesta categoria.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredAttributesList.map((attr) => (
                    <div
                      key={attr.id}
                      className="p-3 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        {activeTab === "CORES" && (
                          attr.imageUrl ? (
                            <img
                              src={attr.imageUrl}
                              alt={attr.value}
                              className="w-10 h-10 object-cover rounded-md shadow-xs border border-gray-200 cursor-pointer hover:opacity-80 transition"
                              onClick={() => setFullSizeImage(attr.imageUrl || null)}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center text-gray-400">
                              <ImageIcon size={18} />
                            </div>
                          )
                        )}
                        <div>
                          <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
                            <span>{attr.value}</span>
                            {attr.code && (
                              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                                C√≥d: {attr.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditAttr(attr)}
                          className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded transition cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttr(attr.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded transition cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
            <button
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
              className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 border-b hover:bg-gray-100/80 transition text-left cursor-pointer"
            >
              <span className="font-bold text-gray-700 text-sm flex items-center gap-2">
                <span>
                  {editingId
                    ? `Editando Item: ${code || ""}`
                    : `Cadastrar Novo(a) ${activeTab === "PECAS" ? "Pe√ßa" : activeTab === "EPIS" ? "EPI" : "Produto"}`}
                </span>
                {editingId && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
                    Modo Edi√ß√£o
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-xs">
                  {isFormCollapsed ? "Expandir" : "Minimizar"}
                </span>
                {isFormCollapsed ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronUp size={18} />
                )}
              </div>
            </button>

        {!isFormCollapsed && (
          <div className="p-4 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="C√≥digo"
                className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome"
                className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-semibold"
              >
                <option value="UN">UN (Unidade)</option>
                <option value="PAR">PAR (Par)</option>
                <option value="KG">KG (Quilograma)</option>
                <option value="M">M (Metro)</option>
                <option value="CX">CX (Caixa)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 font-semibold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => {
                    const newPrice = e.target.value
                      ? parseFloat(e.target.value)
                      : "";
                    setBasePrice(newPrice);
                    if (newPrice !== "" && !isNaN(newPrice as number)) {
                      setProductionPoints(
                        Number(((newPrice as number) / 500).toFixed(5)),
                      );
                    } else {
                      setProductionPoints("");
                    }
                  }}
                  placeholder="Pre√ßo (Opcional)"
                  className="border border-gray-300 p-2 pl-9 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-xs font-semibold">
                  Pts
                </span>
                <input
                  type="number"
                  step="0.00001"
                  value={productionPoints}
                  onChange={(e) =>
                    setProductionPoints(
                      e.target.value ? parseFloat(e.target.value) : "",
                    )
                  }
                  placeholder="Pontua√ß√£o (Opcional)"
                  className="border border-gray-300 p-2 pl-10 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-rose-500 font-bold text-xs">
                  Custo R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={productiveCost}
                  onChange={(e) =>
                    setProductiveCost(
                      e.target.value ? parseFloat(e.target.value) : "",
                    )
                  }
                  placeholder="Custo Insumo Direto"
                  className="border border-gray-300 p-2 pl-20 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="mt-2 bg-gray-50 p-3 rounded border border-gray-100 flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <span className="bg-indigo-100 text-indigo-700 p-1 rounded">‚è±Ô∏è</span>
                Tempo Padr√£o de Produ√ß√£o (em minutos)
              </label>
              <p className="text-[10px] text-gray-500 mb-1">
                Defina o tempo estimado para concluir 1 unidade deste item em cada setor. Usado para previs√£o de ritmo de fila e c√°lculo do Custo Produtivo.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(db.sectors || []).map((sector) => (
                  <div key={sector.id} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-600 truncate">{sector.name}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={standardCycles[sector.id] || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setStandardCycles(prev => ({
                          ...prev,
                          [sector.id]: isNaN(val) ? 0 : val
                        }));
                      }}
                      placeholder="Minutos"
                      className="border border-gray-300 p-1.5 rounded text-xs w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Dynamic Productive Cost Calculation Card */}
              {(() => {
                const rawCost = typeof productiveCost === "number" ? productiveCost : 0;
                let sectorOpsCost = 0;
                (db.sectors || []).forEach((sec) => {
                  const min = standardCycles[sec.id] || 0;
                  const hCost = sec.hourlyCost || 0;
                  sectorOpsCost += (min / 60) * hCost;
                });
                const totalEstimatedCostUnit = rawCost + sectorOpsCost;
                const price = typeof basePrice === "number" ? basePrice : 0;
                const marginAmount = price - totalEstimatedCostUnit;
                const marginPct = price > 0 ? ((marginAmount / price) * 100).toFixed(1) : "0.0";

                return (
                  <div className="mt-2 bg-slate-900 text-white p-3 rounded-xl flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-amber-400">
                      <span>üìä C√°lculo do Custo Produtivo Estimado</span>
                      <span className="text-[10px] text-slate-400 font-normal">F√≥rmula: Insumos + Œ£(Tempo Setor √ó Custo/h)</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-slate-800/80 p-2 rounded-lg">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Insumos Diretos</span>
                        <span className="font-bold text-rose-300">R$ {rawCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Custo M√°quinas/Setores</span>
                        <span className="font-bold text-blue-300">R$ {sectorOpsCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Custo Produtivo Total (Un)</span>
                        <span className="font-black text-amber-300">R$ {totalEstimatedCostUnit.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Margem Bruta (Pre√ßo R$ {price.toFixed(2)})</span>
                        <span className={`font-black ${Number(marginPct) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {marginPct}% {price > 0 ? `(R$ ${marginAmount.toFixed(2)})` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Fluxos do Produto */}
            <div className="mt-2 bg-indigo-50/60 p-3 rounded border border-indigo-100 flex flex-col gap-2">
              <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded text-[10px]">üîÄ</span>
                Fluxos de Produ√ß√£o V√≠nculo ao Produto
              </label>
              <p className="text-[10px] text-indigo-700">
                Selecione os fluxos compat√≠veis para este produto. Ele apenas ser√° liberado em setores habilitados para estes fluxos.
              </p>
              <div className="flex flex-wrap gap-2">
                {(db.flows && db.flows.length > 0 ? db.flows : [
                  { id: 1, codigo: "FLUXO_A", nome: "Fluxo A" },
                  { id: 2, codigo: "FLUXO_B", nome: "Fluxo B" },
                  { id: 3, codigo: "FLUXO_AB", nome: "Fluxo AB" }
                ]).map((f: any) => {
                  const isSelected = itemFluxos.includes(f.codigo);
                  return (
                    <button
                      key={f.id || f.codigo}
                      type="button"
                      onClick={() => {
                        const code = f.codigo;
                        setItemFluxos((prev) =>
                          prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
                        );
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-bold border transition flex items-center gap-1 ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {isSelected && <span>‚úì</span>}
                      {f.nome} ({f.codigo})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-1 bg-gray-50 p-2.5 rounded border border-gray-100">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Produto"
                  className="w-16 h-16 object-cover rounded shadow-sm border border-gray-200 cursor-pointer hover:opacity-80 transition"
                  onClick={() => setFullSizeImage(imageUrl)}
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded border border-gray-200 text-gray-400">
                  <Package size={24} />
                </div>
              )}
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Imagem do Produto (Opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  disabled={isUploadingImage}
                />
                {isUploadingImage && (
                  <div className="text-xs text-blue-600 mt-1 font-semibold">
                    Fazendo upload... {imageUploadProgress}%
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCadastrar}
                className="flex-1 bg-blue-600 text-white font-bold p-2 rounded hover:bg-blue-700 transition shadow-sm text-sm"
              >
                {editingId ? "Salvar Altera√ß√µes" : "Adicionar Item"}
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setCode("");
                    setName("");
                    setBasePrice("");
                    setProductionPoints("");
                    setImageUrl("");
                  }}
                  className="bg-gray-200 text-gray-700 font-bold p-2 rounded hover:bg-gray-300 transition text-sm"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="w-full">
        {filteredItems.length === 0 ? (
          <p className="text-gray-500 text-center mt-4">
            Nenhum item encontrado.
          </p>
        ) : (
          filteredItems.map((it) => (
            <div
              key={it.id}
              className="bg-white p-3 border-b border-gray-100 flex justify-between items-center rounded mb-2 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {it.imageUrl ? (
                  <img
                    src={it.imageUrl}
                    alt={it.name}
                    className="w-10 h-10 object-cover rounded shadow-sm border border-gray-200 cursor-pointer hover:opacity-80 transition"
                    onClick={() => setFullSizeImage(it.imageUrl || null)}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded border border-gray-200 text-gray-400">
                    <Package size={20} />
                  </div>
                )}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{it.code}</span>
                    {it.fluxos && it.fluxos.length > 0 && (
                      <div className="flex gap-1">
                        {it.fluxos.map((fl: string) => (
                          <span key={fl} className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                            {fl}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-gray-600 text-sm">{it.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col text-right text-xs text-gray-500">
                  {typeof it.basePrice === "number" && !isNaN(it.basePrice) ? (
                    <span>R$ {it.basePrice.toFixed(2)}</span>
                  ) : it.basePrice !== undefined && it.basePrice !== null && it.basePrice !== "" && !isNaN(Number(it.basePrice)) ? (
                    <span>R$ {Number(it.basePrice).toFixed(2)}</span>
                  ) : (
                    <span>-</span>
                  )}
                  {it.productionPoints !== undefined && it.productionPoints !== null && it.productionPoints !== "" && !isNaN(Number(it.productionPoints)) ? (
                    <span>{Number(it.productionPoints).toFixed(5)} pts</span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
                  {activeTab === "PRODUTOS" && (
                    <button
                      onClick={() => openBom(it)}
                      className="text-purple-600 hover:text-purple-800 p-1 text-xs font-bold border border-purple-200 rounded px-2"
                      title="Composi√ß√£o (BOM)"
                    >
                      Composi√ß√£o
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(it)}
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Editar"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(it.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </>
      )}
      </div>
      {isBomModalOpen && currentBomProduct && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Composi√ß√£o: {currentBomProduct.name}
              </h3>
              <button
                onClick={() => setIsBomModalOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 text-sm mb-2">
                Adicionar Pe√ßa:
              </h4>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Pesquisar pe√ßa..."
                  value={componentSearch}
                  onChange={(e) => setComponentSearch(e.target.value)}
                  className="border w-full p-2 text-sm rounded"
                />
              </div>

              <div className="flex gap-2 items-center">
                <select
                  value={selectedComponentId}
                  onChange={(e) =>
                    setSelectedComponentId(
                      e.target.value ? parseInt(e.target.value) : "",
                    )
                  }
                  className="border p-2 rounded flex-1 text-sm bg-white"
                >
                  <option value="">Selecione uma pe√ßa</option>
                  {searchedPecas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
                <span className="text-sm">Qtd:</span>
                <input
                  type="number"
                  value={componentQuantity}
                  onChange={(e) =>
                    setComponentQuantity(parseInt(e.target.value) || 0)
                  }
                  className="border p-2 rounded w-16 text-sm"
                  min="1"
                />
                <button
                  onClick={handleAddComponent}
                  className="bg-blue-600 text-white font-bold p-2 text-sm rounded hover:bg-blue-700"
                  disabled={!selectedComponentId || componentQuantity <= 0}
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h4 className="font-semibold text-gray-700 text-sm mb-2 border-b pb-1">
                Pe√ßas Inclusas:
              </h4>
              {!currentBomProduct.components ||
              currentBomProduct.components.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Nenhuma pe√ßa cadastrada para este produto.
                </p>
              ) : (
                currentBomProduct.components.map((comp, idx) => {
                  const cItem = db.items.find((i) => i.id === comp.itemId);
                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-none"
                    >
                      <div className="text-sm">
                        <span className="font-bold">{comp.quantity}x</span>{" "}
                        {cItem
                          ? `${cItem.code} - ${cItem.name}`
                          : "Pe√ßa Exclu√≠da"}
                      </div>
                      <button
                        onClick={() => handleRemoveComponent(idx)}
                        className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t text-right">
              <button
                onClick={() => setIsBomModalOpen(false)}
                className="bg-gray-200 px-4 py-2 rounded text-gray-700 font-bold hover:bg-gray-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {fullSizeImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setFullSizeImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setFullSizeImage(null)}
              className="absolute -top-10 right-0 text-white font-bold text-xl hover:text-gray-300 transition"
            >
              Fechar &times;
            </button>
            <img
              src={fullSizeImage}
              alt="Ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PedidosScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Status Screen Mode States
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [filterDeadlines, setFilterDeadlines] = useState<string[]>([
    "NO_PRAZO",
    "RISCO",
    "ATRASADO",
    "SEM_PRAZO",
    "FATURADO",
    "FATURADO_PARCIAL",
  ]);
  const [filterBatchState, setFilterBatchState] = useState<
    "TODOS" | "COM_LOTE" | "SEM_LOTE" | number
  >("TODOS");
  const [filterNotInvoicedOnly, setFilterNotInvoicedOnly] = useState(false);
  const [deliveryDateStart, setDeliveryDateStart] = useState<string>("");
  const [deliveryDateEnd, setDeliveryDateEnd] = useState<string>("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [filterUrgentOnly, setFilterUrgentOnly] = useState<boolean>(false);
  const [printedFilter, setPrintedFilter] = useState<"TODOS" | "NAO_IMPRESSOS" | "IMPRESSOS">("TODOS");

  const markOrdersAsPrinted = React.useCallback(
    (codes: string[]) => {
      if (!codes || codes.length === 0) return;
      const ordersToUpdate = db.orders.filter(
        (o) => codes.includes(o.orderCode)
      );
      if (ordersToUpdate.length > 0) {
        const updated = ordersToUpdate.map((o) => {
          const currentCount = o.printCount ?? (o.isPrinted ? 1 : 0);
          return {
            ...o,
            isPrinted: true,
            printedAt: Date.now(),
            printCount: currentCount + 1,
          };
        });
        db.updateOrders(updated);
      }
    },
    [db.orders, db.updateOrders],
  );

  const toggleOrderPrintedStatus = React.useCallback(
    (code: string, currentPrinted: boolean) => {
      const ordersToUpdate = db.orders.filter((o) => o.orderCode === code);
      if (ordersToUpdate.length > 0) {
        const updated = ordersToUpdate.map((o) => {
          if (currentPrinted) {
            return {
              ...o,
              isPrinted: false,
              printedAt: undefined,
              printCount: 0,
            };
          } else {
            const currentCount = o.printCount ?? 0;
            return {
              ...o,
              isPrinted: true,
              printedAt: Date.now(),
              printCount: currentCount > 0 ? currentCount : 1,
            };
          }
        });
        db.updateOrders(updated);
      }
    },
    [db.orders, db.updateOrders],
  );

  // Batch Printing & Range Selection States
  const [orderRangeStart, setOrderRangeStart] = useState<string>("");
  const [orderRangeEnd, setOrderRangeEnd] = useState<string>("");
  const [filterByRangeActive, setFilterByRangeActive] = useState<boolean>(false);
  const [selectedOrderCodesForPrint, setSelectedOrderCodesForPrint] = useState<string[]>([]);
  const [ordersLimit, setOrdersLimit] = useState<number>(20);

  useEffect(() => {
    setOrdersLimit(20);
  }, [
    debouncedSearchTerm,
    filterDeadlines,
    selectedStatuses,
    filterBatchState,
    filterNotInvoicedOnly,
    printedFilter,
    deliveryDateStart,
    deliveryDateEnd,
    filterByRangeActive,
    orderRangeStart,
    orderRangeEnd,
  ]);

  const extractOrderNum = (code: string): number | null => {
    if (!code) return null;
    const match = code.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  const handleSelectRangeForPrint = () => {
    if (!orderRangeStart.trim() && !orderRangeEnd.trim()) {
      alert("Por favor, informe o n√∫mero do pedido inicial e/ou final para marcar a faixa.");
      return;
    }

    const startNum = extractOrderNum(orderRangeStart);
    const endNum = extractOrderNum(orderRangeEnd);

    const allCodesMap = new Map<string, typeof db.orders>();
    db.orders.forEach((o) => {
      if (o.orderCode && o.isActive !== false) {
        if (!allCodesMap.has(o.orderCode)) allCodesMap.set(o.orderCode, []);
        allCodesMap.get(o.orderCode)!.push(o);
      }
    });

    const matchingCodes = Array.from(allCodesMap.keys()).filter((code) => {
      const orderNum = extractOrderNum(code);
      if (startNum !== null && endNum !== null) {
        const minN = Math.min(startNum, endNum);
        const maxN = Math.max(startNum, endNum);
        return orderNum !== null && orderNum >= minN && orderNum <= maxN;
      } else if (startNum !== null) {
        return orderNum !== null && orderNum >= startNum;
      } else if (endNum !== null) {
        return orderNum !== null && orderNum <= endNum;
      } else {
        const codeLower = code.toLowerCase().trim();
        if (orderRangeStart.trim() && codeLower < orderRangeStart.toLowerCase().trim()) return false;
        if (orderRangeEnd.trim() && codeLower > orderRangeEnd.toLowerCase().trim()) return false;
        return true;
      }
    });

    if (matchingCodes.length === 0) {
      alert("Nenhum pedido encontrado no intervalo de c√≥digos informado.");
      return;
    }

    const merged = Array.from(new Set([...selectedOrderCodesForPrint, ...matchingCodes]));
    setSelectedOrderCodesForPrint(merged);
    alert(`üéØ ${matchingCodes.length} pedido(s) da faixa foram marcados para impress√£o!`);
  };

  const getDeliveryStatus = React.useCallback((o: any) => {
    if (o.status === "FATURADO") return "Faturado";
    if (!o.deliveryDate) return "Sem Prazo";

    const delivery = new Date(o.deliveryDate);
    delivery.setUTCHours(12, 0, 0, 0);
    const deliveryMs = delivery.getTime();

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayMs = today.getTime();

    const diffTime = deliveryMs - todayMs;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Atrasado";
    if (diffDays >= 0 && diffDays <= 2) return "Com risco de atraso";
    return "No prazo";
  }, []);

  const getStatusColor = React.useCallback((status: string | undefined) => {
    switch (status) {
      case "PENDENTE":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "EM_PRODUCAO":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PRODUZIDO":
        return "bg-yellow-100 text-yellow-850 border-yellow-200";
      case "EM_CORTE":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "CORTADO":
        return "bg-cyan-150 text-cyan-850 border-cyan-300";
      case "EM_PINTURA":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "PINTADO":
        return "bg-indigo-100 text-indigo-805 border-indigo-200";
      case "EMBALANDO":
        return "bg-orange-100 text-orange-850 border-orange-200";
      case "EMBALADO":
        return "bg-green-100 text-green-800 border-green-200";
      case "FATURADO_PARCIAL":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "FATURADO":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  const handleStatusChange = React.useCallback((orderId: number, newStatus: any) => {
    setIsUpdating(orderId);

    setTimeout(() => {
      const orders = [...db.orders];
      const idx = orders.findIndex((o) => o.id === orderId);
      if (idx >= 0) {
        const order = orders[idx];
        const remainingToInvoice =
          order.totalQuantity - (order.invoicedQuantity || 0);

        if (
          newStatus === "FATURADO" &&
          order.status !== "FATURADO" &&
          remainingToInvoice > 0
        ) {
          const stockId = `${order.itemId}|${order.color}|${order.size}|${order.variation}|ACABADO`;
          const currentStock = db.stocks.find((s) => s.id === stockId);

          if (currentStock) {
            const newStock = {
              ...currentStock,
              quantity: Math.max(0, currentStock.quantity - remainingToInvoice),
              reservedQuantity: Math.max(
                0,
                (currentStock.reservedQuantity || 0) - remainingToInvoice,
              ),
            };
            db.updateStocks([newStock]);

            db.addStockMovement?.({
              itemId: order.itemId,
              color: order.color,
              size: order.size,
              variation: order.variation,
              quantity: remainingToInvoice,
              type: "SAIDA",
              description: `Faturamento Pedido #${order.orderCode || order.id}`,
            });
          }
        }

        orders[idx] = {
          ...order,
          status: newStatus,
          packedQuantity:
            newStatus === "EMBALADO" || newStatus === "FATURADO"
              ? order.totalQuantity
              : order.packedQuantity,
          invoicedQuantity:
            newStatus === "FATURADO"
              ? order.totalQuantity
              : order.invoicedQuantity || 0,
          isActive: newStatus !== "FATURADO",
          isUrgent: newStatus === "FATURADO" ? false : order.isUrgent,
        };
        db.updateOrders([orders[idx]]);
      }
      setIsUpdating(null);
    }, 400);
  }, [db.orders, db.stocks, db.addStockMovement, db.updateStocks, db.updateOrders]);

  const groupedOrders = React.useMemo(() => {
    const map = new Map<string, typeof db.orders>();
    const term = debouncedSearchTerm.trim().toLowerCase();

    const filtered = db.orders.filter((o) => {
      if (currentUser?.role === "PROJETISTA" && !o.isThirdPartyLaser) {
        return false;
      }

      // Check text filter match
      const customerObj = db.customers.find(
        (c) => c.name === o.customerName || c.tradeName === o.customerName,
      );
      const itemObj = db.items.find((i) => i.id === o.itemId);

      const searchTarget =
        `${o.orderCode} ${o.customerName} ${customerObj?.tradeName || ""} ${itemObj?.name || ""} ${itemObj?.code || ""}`.toLowerCase();

      const textMatch = searchTarget.includes(term);
      if (!textMatch) return false;

      // Multi-select status and delivery filters
      if (filterBatchState !== "TODOS") {
        const isLinkedToAnyBatch = db.productionBatches.some((b) =>
          b.orderIds.includes(o.id),
        );
        if (filterBatchState === "COM_LOTE" && !isLinkedToAnyBatch)
          return false;
        if (filterBatchState === "SEM_LOTE" && isLinkedToAnyBatch) return false;

        if (typeof filterBatchState === "number") {
          const isLinkedToSpecific = db.productionBatches
            .find((b) => b.id === filterBatchState)
            ?.orderIds.includes(o.id);
          if (!isLinkedToSpecific) return false;
        }
      }

      if (filterNotInvoicedOnly && o.status === "FATURADO") {
        return false;
      }

      if (deliveryDateStart || deliveryDateEnd) {
        if (!o.deliveryDate) return false;
        const itemDate = o.deliveryDate.split("T")[0];
        
        if (deliveryDateStart && itemDate < deliveryDateStart) {
          return false;
        }
        if (deliveryDateEnd && itemDate > deliveryDateEnd) {
          return false;
        }
      }

      const deliveryStatus = getDeliveryStatus(o);
      const isFaturadoParcial = o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity);
      const isFaturado = o.status === "FATURADO" || (o.invoicedQuantity || 0) >= o.totalQuantity;

      let dKey = "";
      if (isFaturado) dKey = "FATURADO";
      else if (isFaturadoParcial) dKey = "FATURADO_PARCIAL";
      else if (deliveryStatus === "No prazo") dKey = "NO_PRAZO";
      else if (deliveryStatus === "Com risco de atraso") dKey = "RISCO";
      else if (deliveryStatus === "Atrasado") dKey = "ATRASADO";
      else if (deliveryStatus === "Sem Prazo") dKey = "SEM_PRAZO";

      if (!filterDeadlines.includes(dKey)) {
        return false;
      }

      if (selectedStatuses.length > 0) {
        const effSt = isFaturado
          ? "FATURADO"
          : isFaturadoParcial
          ? "FATURADO_PARCIAL"
          : o.status || "PENDENTE";
        if (!selectedStatuses.includes(effSt)) return false;
      }

      // Order Code Range Filter (ONLY active if filterByRangeActive is true)
      if (filterByRangeActive && (orderRangeStart.trim() || orderRangeEnd.trim())) {
        const startNum = extractOrderNum(orderRangeStart);
        const endNum = extractOrderNum(orderRangeEnd);
        const orderNum = extractOrderNum(o.orderCode);

        if (startNum !== null && endNum !== null) {
          const minN = Math.min(startNum, endNum);
          const maxN = Math.max(startNum, endNum);
          if (orderNum === null || orderNum < minN || orderNum > maxN) return false;
        } else if (startNum !== null) {
          if (orderNum === null || orderNum < startNum) return false;
        } else if (endNum !== null) {
          if (orderNum === null || orderNum > endNum) return false;
        } else {
          const codeLower = (o.orderCode || "").toLowerCase().trim();
          if (orderRangeStart.trim() && codeLower < orderRangeStart.toLowerCase().trim()) return false;
          if (orderRangeEnd.trim() && codeLower > orderRangeEnd.toLowerCase().trim()) return false;
        }
      }

      // Printed status filter match
      if (printedFilter === "NAO_IMPRESSOS" && o.isPrinted) return false;
      if (printedFilter === "IMPRESSOS" && !o.isPrinted) return false;

      return true;
    });

    filtered.forEach((o) => {
      if (!map.has(o.orderCode)) map.set(o.orderCode, []);
      map.get(o.orderCode)!.push(o);
    });

    return Array.from(map.entries()).sort(
      (a, b) => b[1][0].createdAt - a[1][0].createdAt,
    );
  }, [
    db.orders,
    debouncedSearchTerm,
    filterDeadlines,
    selectedStatuses,
    filterBatchState,
    filterNotInvoicedOnly,
    printedFilter,
    deliveryDateStart,
    deliveryDateEnd,
    currentUser,
    db.productionBatches,
    filterByRangeActive,
    orderRangeStart,
    orderRangeEnd,
  ]);

  const getDuplicatesDiagnostic = React.useCallback(() => {
    const ordersByCode: Record<string, typeof db.orders> = {};
    db.orders.forEach((o) => {
      if (!o.isActive) return;
      const code = (o.orderCode || "").trim().toUpperCase();
      if (!code) return;
      if (!ordersByCode[code]) {
        ordersByCode[code] = [];
      }
      ordersByCode[code].push(o);
    });

    const duplicatesFound: {
      orderCode: string;
      itemCode: string;
      itemName: string;
      color: string;
      size: string;
      variation: string;
      quantity: number;
      records: typeof db.orders;
      toKeep: (typeof db.orders)[0];
      toDelete: typeof db.orders;
    }[] = [];

    let totalSavings = 0;

    Object.entries(ordersByCode).forEach(([orderCode, group]) => {
      const itemGroups: Record<string, typeof db.orders> = {};
      group.forEach((o) => {
        const key = `${o.itemId}|${(o.color || "-").trim().toUpperCase()}|${(o.size || "-").trim().toUpperCase()}|${(o.variation || "-").trim().toUpperCase()}|${o.totalQuantity}`;
        if (!itemGroups[key]) {
          itemGroups[key] = [];
        }
        itemGroups[key].push(o);
      });

      Object.entries(itemGroups).forEach(([key, itemsList]) => {
        if (itemsList.length > 1) {
          const getProgressScore = (o: (typeof db.orders)[0]) => {
            return (
              (o.packedQuantity || 0) +
              (o.invoicedQuantity || 0) +
              (o.producedQuantity || 0) +
              (o.paintedQuantity || 0) +
              (o.cutQuantity || 0)
            );
          };

          const sorted = [...itemsList].sort((a, b) => {
            const scoreA = getProgressScore(a);
            const scoreB = getProgressScore(b);
            if (scoreB !== scoreA) {
              return scoreB - scoreA;
            }
            return a.id - b.id; // oldest first
          });

          const toKeep = sorted[0];
          const toDelete = sorted.slice(1);

          const itemObj = db.items.find((it) => it.id === toKeep.itemId);

          duplicatesFound.push({
            orderCode,
            itemCode: itemObj?.code || "COD-ERRO",
            itemName: itemObj?.name || "Produto Desconhecido",
            color: toKeep.color,
            size: toKeep.size,
            variation: toKeep.variation,
            quantity: toKeep.totalQuantity,
            records: itemsList,
            toKeep,
            toDelete,
          });

          totalSavings += toDelete.length;
        }
      });
    });

    return {
      duplicates: duplicatesFound,
      totalDuplicatesCount: totalSavings,
      affectedOrdersCount: new Set(duplicatesFound.map((d) => d.orderCode))
        .size,
    };
  }, [db.orders, db.items]);

  const handleExecuteDeduplication = React.useCallback(async () => {
    setIsCleaningUp(true);
    setCleanupResult(null);
    try {
      const diagnostic = getDuplicatesDiagnostic();
      const idsToDelete: number[] = [];
      diagnostic.duplicates.forEach((dup) => {
        dup.toDelete.forEach((td) => {
          idsToDelete.push(td.id);
        });
      });

      if (idsToDelete.length === 0) {
        setCleanupResult("Nenhuma duplicidade detectada no sistema.");
        setIsCleaningUp(false);
        return;
      }

      for (const id of idsToDelete) {
        await db.deleteOrder(id);
      }

      setCleanupResult(
        `Sucesso: ${idsToDelete.length} registros de itens duplicados foram eliminados e a integridade dos pedidos foi estabelecida.`,
      );
    } catch (err: any) {
      setCleanupResult(`Erro ao executar a limpeza: ${err.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  }, [getDuplicatesDiagnostic, db.deleteOrder]);

  const [orderCode, setOrderCode] = useState("");
  const [itemId, setItemId] = useState<number | "">("");
  const [orderItemSearch, setOrderItemSearch] = useState("");
  const [customerName, setCustomerName] = useState("");

  const clientBoughtStatsMap = React.useMemo(() => {
    const stats: Record<number, number> = {};
    if (!customerName || !customerName.trim()) return stats;
    const clientOrders = db.orders.filter(
      (o) =>
        o.customerName.toLowerCase().trim() ===
        customerName.toLowerCase().trim(),
    );
    clientOrders.forEach((o) => {
      stats[o.itemId] = (stats[o.itemId] || 0) + (o.totalQuantity || 1);
    });
    return stats;
  }, [customerName, db.orders]);

  const clientMostBoughtItems = React.useMemo(() => {
    const itemIds = Object.keys(clientBoughtStatsMap).map(Number);
    if (itemIds.length === 0) return [];

    const sortedItemIds = itemIds.sort(
      (a, b) => clientBoughtStatsMap[b] - clientBoughtStatsMap[a],
    );
    return sortedItemIds
      .map((id) => db.items.find((it) => it.id === id))
      .filter((it): it is NonNullable<typeof it> => !!it);
  }, [clientBoughtStatsMap, db.items]);

  const suggestedOrderItems = React.useMemo(() => {
    const query = orderItemSearch.trim().toLowerCase();

    // If no text typed yet, suggest the client's most bought items first!
    if (!query) {
      if (clientMostBoughtItems.length > 0) {
        return clientMostBoughtItems.slice(0, 10);
      }
      return db.items.slice(0, 5);
    }

    // Normalizing text helper to ignore accents
    const normalize = (str: string) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const normQuery = normalize(query);

    // Filter and score similarity for all items
    const scored = db.items.map((it) => {
      const normName = normalize(`${it.code} - ${it.name}`);
      // Check for exact substring matches first (score infinite/highest)
      let score = 0;
      if (normName.includes(normQuery)) {
        score = 1000;
      } else {
        // Calculate word overlap
        const queryWords = normQuery.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
        const itemWords = normName.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
        
        let matchCount = 0;
        for (const qWord of queryWords) {
          if (itemWords.some(iWord => iWord.includes(qWord) || qWord.includes(iWord))) {
            matchCount++;
          }
        }
        score = matchCount;
      }
      return { item: it, score };
    });

    // Filter items with score > 0
    const matches = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item);

    // Sort matches: put items in clientMostBoughtItems first if score is same
    const clientBoughtIds = new Set(clientMostBoughtItems.map((i) => i.id));
    matches.sort((a, b) => {
      const aBought = clientBoughtIds.has(a.id) ? 1 : 0;
      const bBought = clientBoughtIds.has(b.id) ? 1 : 0;
      return bBought - aBought; // 1 (true) sorted before 0 (false)
    });

    return matches.slice(0, 10);
  }, [orderItemSearch, db.items, clientMostBoughtItems]);

  const [customerSelected, setCustomerSelected] = useState(false);
  const [representativeName, setRepresentativeName] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [variation, setVariation] = useState("");
  const [totalQuantity, setTotalQuantity] = useState<number | "">("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [showPriceHistory, setShowPriceHistory] = useState<boolean>(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentCondition, setPaymentCondition] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [customPaymentCondition, setCustomPaymentCondition] = useState("");
  const [paymentType, setPaymentType] = useState<
    "pix" | "boleto" | "deposito" | "carteira" | "outro"
  >("boleto");
  const [fiscalType, setFiscalType] = useState<"COM_NF" | "SEM_NF" | "MEIA_NOTA">("COM_NF");
  const [billingRule, setBillingRule] = useState<"cadastro" | "ultimo_pedido">(
    "cadastro",
  );
  const [discountPercent, setDiscountPercent] = useState<number | "">("");
  const [hasRET, setHasRET] = useState<boolean>(false);

  const matchedCustomerForOrder = React.useMemo(() => {
    if (!customerName || !customerName.trim()) return null;
    const trimmedVal = customerName.trim();
    const idMatch = trimmedVal.match(/^(\d+)\s*-\s*(.*)$/);
    if (idMatch) {
      const id = Number(idMatch[1]);
      const found = db.customers.find((c) => c.id === id);
      if (found) return found;
    }
    return (
      db.customers.find(
        (c) =>
          (c.name && c.name.toLowerCase() === trimmedVal.toLowerCase()) ||
          (c.tradeName && c.tradeName.toLowerCase() === trimmedVal.toLowerCase())
      ) || null
    );
  }, [customerName, db.customers]);

  React.useEffect(() => {
    if (matchedCustomerForOrder) {
      if (matchedCustomerForOrder.fiscalType) {
        setFiscalType(matchedCustomerForOrder.fiscalType);
      }
      if (billingRule === "cadastro" && matchedCustomerForOrder.defaultPaymentTerms) {
        setPaymentTerms(matchedCustomerForOrder.defaultPaymentTerms);
      }
      if (matchedCustomerForOrder.defaultDiscountPercent !== undefined) {
        setDiscountPercent(matchedCustomerForOrder.defaultDiscountPercent || "");
      }
      if (matchedCustomerForOrder.hasRET !== undefined) {
        setHasRET(!!matchedCustomerForOrder.hasRET);
      }
    }
  }, [matchedCustomerForOrder, billingRule]);

  const selectedItemObj = React.useMemo(() => {
    return db.items.find((i) => i.id === itemId);
  }, [itemId, db.items]);

  const lastPrices = React.useMemo(() => {
    if (!customerName || !itemId) return [];
    return db.orders
      .filter(
        (o) =>
          o.customerName === customerName &&
          o.itemId === itemId &&
          o.unitPrice !== undefined,
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 2)
      .map((o) => o.unitPrice as number);
  }, [customerName, itemId, db.orders]);

  const lastOrderForClient = React.useMemo(() => {
    if (!customerName.trim()) return null;
    const matches = db.orders.filter(
      (o) => o.customerName.toLowerCase() === customerName.trim().toLowerCase(),
    );
    if (matches.length === 0) return null;
    return matches.sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [customerName, db.orders]);

  React.useEffect(() => {
    if (billingRule === "ultimo_pedido" && lastOrderForClient) {
      const cond = lastOrderForClient.paymentCondition || "";
      if (
        ["PIX", "BOLETO", "DEP√ìSITO", "CARTEIRA"].includes(cond.toUpperCase())
      ) {
        const typeMap: Record<
          string,
          "pix" | "boleto" | "deposito" | "carteira"
        > = {
          PIX: "pix",
          BOLETO: "boleto",
          DEP√ìSITO: "deposito",
          CARTEIRA: "carteira",
        };
        setPaymentType(typeMap[cond.toUpperCase()]);
        setCustomPaymentCondition("");
      } else {
        setPaymentType("outro");
        setCustomPaymentCondition(cond);
      }
      setPaymentTerms(lastOrderForClient.paymentTerms || "");
    } else if (billingRule === "cadastro") {
      setPaymentType("boleto");
      setCustomPaymentCondition("");
      setPaymentTerms("");
    }
  }, [billingRule, lastOrderForClient]);

  const [isUrgent, setIsUrgent] = useState(false);
  const [isProgramacao, setIsProgramacao] = useState(false);
  const [filterLaserOnly, setFilterLaserOnly] = useState(false);

  React.useEffect(() => {
    if (
      currentUser?.id === "projetista_marcos" ||
      currentUser?.role === "PROJETISTA" ||
      currentUser?.name?.toLowerCase()?.includes("marcos")
    ) {
      setFilterLaserOnly(true);
    }
  }, [currentUser]);
  const [isThirdPartyLaser, setIsThirdPartyLaser] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<
    (typeof db.orders)[0] | null
  >(null);
  const [invoiceModalData, setInvoiceModalData] = useState<{
    order: (typeof db.orders)[0];
    limit: number;
  } | null>(null);
  const [invoiceInput, setInvoiceInput] = useState("");
  const [showInvoiceConfirmStep, setShowInvoiceConfirmStep] = useState(false);
  const [isDeduplicateModalOpen, setIsDeduplicateModalOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const [faturamentoWhatsAppShareData, setFaturamentoWhatsAppShareData] =
    useState<{
      orderCode: string;
      customerName: string;
      productDescription: string;
      quantity: number;
      phone: string;
      representativeName: string;
      customerEmail?: string;
      representativeEmail?: string;
      totalValue?: number;
      deliveryDate?: string;
    } | null>(null);
  const [selectedBatchInvoiceIds, setSelectedBatchInvoiceIds] = useState<
    number[]
  >([]);

  const [recipientEmailInput, setRecipientEmailInput] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailDeliveryStatus, setEmailDeliveryStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (faturamentoWhatsAppShareData) {
      const emails = [
        faturamentoWhatsAppShareData.customerEmail,
        faturamentoWhatsAppShareData.representativeEmail,
      ]
        .filter((e) => e && e.trim() !== "")
        .join(", ");
      setRecipientEmailInput(emails);
      setEmailDeliveryStatus(null);
    }
  }, [faturamentoWhatsAppShareData]);

  const batchTotalQty = React.useMemo(() => {
    return selectedBatchInvoiceIds.reduce((sum, id) => {
      const o = db.orders.find((ord) => ord.id === id);
      return sum + (o ? o.totalQuantity || 0 : 0);
    }, 0);
  }, [selectedBatchInvoiceIds, db.orders]);

  const [lineItems, setLineItems] = useState<
    {
      itemId: number;
      color: string;
      size: string;
      variation: string;
      totalQuantity: number;
      isThirdPartyLaser: boolean;
      isUrgent: boolean;
      isProgramacao: boolean;
      unitPrice?: number;
    }[]
  >([]);

  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);

  // States for Order Group editing & approval
  const [editingOrderGroupCode, setEditingOrderGroupCode] = useState<string | null>(null);
  const [editingGroupOrderCodeInput, setEditingGroupOrderCodeInput] = useState<string>("");
  const [editingGroupCustomerName, setEditingGroupCustomerName] = useState<string>("");
  const [editingGroupCustomerSelected, setEditingGroupCustomerSelected] = useState<boolean>(true);
  const [editingGroupRepresentative, setEditingGroupRepresentative] = useState<string>("");
  const [editingGroupDeliveryDate, setEditingGroupDeliveryDate] = useState<string>("");
  const [editingGroupStatus, setEditingGroupStatus] = useState<string>("PENDENTE");
  const [editingGroupNotes, setEditingGroupNotes] = useState<string>("");
  const [editingGroupLineItems, setEditingGroupLineItems] = useState<
    {
      id?: number;
      itemId: number;
      color: string;
      size: string;
      variation: string;
      totalQuantity: number;
      unitPrice?: number;
      isThirdPartyLaser?: boolean;
      isUrgent?: boolean;
      isProgramacao?: boolean;
    }[]
  >([]);

  // Product form states inside Order Group Edit Modal
  const [editingGroupCartIndex, setEditingGroupCartIndex] = useState<number | null>(null);
  const [editingGroupOrderItemSearch, setEditingGroupOrderItemSearch] = useState<string>("");
  const [editingGroupItemId, setEditingGroupItemId] = useState<number | string>("");
  const [editingGroupColor, setEditingGroupColor] = useState<string>("");
  const [editingGroupSize, setEditingGroupSize] = useState<string>("");
  const [editingGroupVariation, setEditingGroupVariation] = useState<string>("");
  const [editingGroupTotalQuantity, setEditingGroupTotalQuantity] = useState<number | string>("");
  const [editingGroupUnitPrice, setEditingGroupUnitPrice] = useState<number | string>("");
  const [editingGroupIsThirdPartyLaser, setEditingGroupIsThirdPartyLaser] = useState<boolean>(false);
  const [editingGroupIsUrgent, setEditingGroupIsUrgent] = useState<boolean>(false);
  const [editingGroupIsProgramacao, setEditingGroupIsProgramacao] = useState<boolean>(false);

  const [activeSubTab, setActiveSubTab] = useState<
    "ABERTOS" | "APROVACAO" | "FATURADOS"
  >("ABERTOS");

  const [isStatusBarOpen, setIsStatusBarOpen] = useState(false);

  const piecesByStatus = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const activeOrders = db.orders.filter(
      (o) =>
        o.status !== "FATURADO" &&
        o.status !== "AGUARDANDO_APROVACAO" &&
        o.isActive,
    );

    activeOrders.forEach((o) => {
      const statusStr = o.status || "PENDENTE";
      const pendingQty = Math.max(
        0,
        o.totalQuantity - (o.invoicedQuantity || 0),
      );
      if (pendingQty > 0) {
        counts[statusStr] = (counts[statusStr] || 0) + pendingQty;
      }
    });

    const labelMap: Record<string, string> = {
      PENDENTE: "Pendentes",
      TEM_ESTOQUE: "Tem Estoque",
      EM_PRODUCAO: "Em Produ√ß√£o",
      PRODUZIDO: "Produzidos",
      EM_CORTE: "Em Corte",
      CORTADO: "Cortados",
      EM_PINTURA: "Em Pintura",
      PINTADO: "Pintados",
      EMBALANDO: "Embalando",
      EMBALADO: "Embalados",
      PLANEJADO: "Planejados",
    };

    return Object.entries(counts)
      .map(([status, qty]) => ({
        status,
        label: labelMap[status] || status,
        qty,
      }))
      .sort((a, b) => b.qty - a.qty);
  }, [db.orders]);

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelData, setExcelData] = useState("");
  const [excelImportProgress, setExcelImportProgress] = useState<number>(0);
  const [excelImportResult, setExcelImportResult] = useState<string | null>(
    null,
  );

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingFiles, setBillingFiles] = useState<File[]>([]);
  const [billingProgress, setBillingProgress] = useState(0);
  const [billingResult, setBillingResult] = useState<string | null>(null);
  const [billedItems, setBilledItems] = useState<any[]>([]);
  const billingInputRef = React.useRef<HTMLInputElement>(null);
  const [pdfImportProgress, setPdfImportProgress] = useState<number>(0);
  const [pdfImportResult, setPdfImportResult] = useState<string | null>(null);
  const [pdfExtractedOrders, setPdfExtractedOrders] = useState<any[]>([]);
  const [expandedOrderIdx, setExpandedOrderIdx] = useState<
    string | number | null
  >(0);
  const [editingOrderIdx, setEditingOrderIdx] = useState<
    string | number | null
  >(null);
  const pdfInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpdateExtractedOrder = (
    idx: number,
    field: string,
    value: any,
  ) => {
    setPdfExtractedOrders((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "status") {
        if (value === "FATURADO") {
          updated[idx].statusValidation = "APTO";
          updated[idx].validationMessage =
            "Liberado para subir como Faturado no sistema.";
        }
      }
      return updated;
    });
  };

  const handleUpdateExtractedOrderItem = (
    orderIdx: number,
    itemIdx: number,
    field: string,
    value: any,
  ) => {
    setPdfExtractedOrders((prev) => {
      const updated = [...prev];
      const updatedItems = [...updated[orderIdx].items];
      updatedItems[itemIdx] = { ...updatedItems[itemIdx], [field]: value };

      if (field === "quantity" || field === "unitPrice") {
        const q =
          field === "quantity"
            ? Number(value) || 0
            : Number(updatedItems[itemIdx].quantity) || 0;
        const p =
          field === "unitPrice"
            ? Number(value) || 0
            : Number(updatedItems[itemIdx].unitPrice) || 0;
        updatedItems[itemIdx].totalPrice = q * p;
      }

      updated[orderIdx] = {
        ...updated[orderIdx],
        items: updatedItems,
        totalValue: updatedItems.reduce(
          (sum: number, it: any) =>
            sum +
            (Number(it.totalPrice) ||
              (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)),
          0,
        ),
        totalGrossValue: updatedItems.reduce(
          (sum: number, it: any) =>
            sum +
            (Number(it.totalPrice) ||
              (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)),
          0,
        ),
      };
      return updated;
    });
  };

  React.useEffect(() => {
    const handleEvents = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPdfModalOpen(false);
        setIsExcelModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEvents);
    return () => window.removeEventListener("keydown", handleEvents);
  }, []);

  const handleExtractBilling = async () => {
    if (billingFiles.length === 0) return;
    setBillingResult("Extraindo faturamento com IA...");
    setBillingProgress(5);

    const extractionInterval = setInterval(() => {
      setBillingProgress((prev) =>
        prev >= 90 ? prev : prev + Math.floor(Math.random() * 10) + 5,
      );
    }, 600);

    const formData = new FormData();
    billingFiles.forEach((f) => formData.append("files", f));

    try {
      const resp = await fetch("/api/extract-billing-pdf", {
        method: "POST",
        body: formData,
      });
      clearInterval(extractionInterval);

      let responseText = "";
      let data: any = {};
      try {
        responseText = await resp.text();
        const trimmed = (responseText || "").trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          data = JSON.parse(trimmed);
        } else {
          const lower = trimmed.toLowerCase();
          if (
            resp.status === 504 ||
            resp.status === 502 ||
            resp.status === 503 ||
            resp.status === 404 ||
            lower.includes("timeout") ||
            lower.includes("the page") ||
            lower.includes("<html") ||
            lower.includes("service unavailable")
          ) {
            data = {
              success: false,
              error:
                "Limite de tempo excedido (Timeout na Vercel/Servidor) ou rota do backend n√£o encontrada. O PDF enviado √© pesado ou o servidor levou mais tempo do que o limite da plataforma para processar. Por favor, divida o PDF em partes menores ou utilize a Adi√ß√£o Manual/Planilha.",
            };
          } else {
            data = {
              success: false,
              error: "Resposta em formato inv√°lido recebida do servidor (n√£o √© um JSON v√°lido).",
            };
          }
        }
      } catch (jsonErr) {
        console.warn("Aviso ao decodificar resposta de faturamento:", jsonErr);
        data = {
          success: false,
          error: "Erro ao processar a resposta do servidor.",
        };
      }

      if (!resp.ok || !data.success) {
        setBillingResult("Erro: " + (data.error || "Erro desconhecido"));
        setBillingProgress(0);
        return;
      }
      setBilledItems(data.billedItems || []);
      setBillingProgress(100);
      setBillingResult(null);
    } catch (e: any) {
      clearInterval(extractionInterval);
      setBillingResult("Falha na rede: " + e.message);
      setBillingProgress(0);
    }
  };

  const confirmarFaturamento = async () => {
    setBillingResult("Atualizando estoque e faturando itens...");
    let allOrderItemsCount = 0;
    for (const billed of billedItems) {
      // try to find order by code
      const order = db.orders.find((o) => o.code === billed.orderCode);
      if (order && order.items) {
        for (const oi of order.items) {
          if (
            oi.partName === billed.partName ||
            (oi.partName && oi.partName.includes(billed.partName))
          ) {
            // decrement stock
            const dbItem = db.items.find(
              (i) => i.code === oi.itemCode || i.name === oi.partName,
            );
            if (dbItem && dbItem.stock !== undefined) {
              await db.updateItem({
                ...dbItem,
                stock: Math.max(0, dbItem.stock - billed.quantity),
              });
            }
            // update order item status (a shortcut, usually we need a full update logic)
            // to do it right:
            const updatedItems = order.items.map((it) => {
              if (it.id === oi.id) {
                return { ...it, status: "FATURADO" } as typeof it;
              }
              return it;
            });
            // if all items billed -> order billed
            const newStatus = updatedItems.every((i) => i.status === "FATURADO")
              ? "FATURADO"
              : order.status;
            await db.updateOrders([
              {
                ...order,
                items: updatedItems,
                status: newStatus,
              },
            ]);
            allOrderItemsCount++;
            break;
          }
        }
      }
    }

    alert(allOrderItemsCount + " itens faturados baseados no documento!");
    setIsBillingModalOpen(false);
    setBilledItems([]);
    setBillingFiles([]);
  };

  const handleExtractPdf = async () => {
    if (pdfFiles.length === 0) return;
    setPdfImportResult("Extraindo dados com Intelig√™ncia Artificial...");
    setPdfImportProgress(5);

    // Simulate progress during extraction to give outstanding visual feedback
    const extractionInterval = setInterval(() => {
      setPdfImportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(extractionInterval);
          return prev;
        }
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 600);

    const formData = new FormData();
    pdfFiles.forEach((f) => formData.append("files", f));

    try {
      const resp = await fetch("/api/extract-orders-pdf", {
        method: "POST",
        body: formData,
      });
      clearInterval(extractionInterval);

      let responseText = "";
      let data: any = {};
      try {
        responseText = await resp.text();
        const trimmed = (responseText || "").trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          data = JSON.parse(trimmed);
        } else {
          const lower = trimmed.toLowerCase();
          if (
            resp.status === 504 ||
            resp.status === 502 ||
            resp.status === 503 ||
            resp.status === 404 ||
            lower.includes("timeout") ||
            lower.includes("the page") ||
            lower.includes("<html") ||
            lower.includes("service unavailable")
          ) {
            data = {
              success: false,
              error:
                "Limite de tempo excedido (Timeout na Vercel/Servidor) ou rota de API n√£o conectada. O arquivo PDF enviado √© muito grande, pesado ou o servidor levou muito tempo para processar os dados por IA. Por favor, tente enviar um PDF menor (menos p√°ginas) ou utilize a Adi√ß√£o Manual/Planilha para cadastrar sem bloqueio.",
            };
          } else {
            data = {
              success: false,
              error: "Resposta em formato inv√°lido recebida do servidor (n√£o √© um JSON v√°lido).",
            };
          }
        }
      } catch (jsonErr) {
        console.warn("Aviso ao decodificar resposta de extra√ß√£o de pedidos:", jsonErr);
        data = {
          success: false,
          error: "Erro ao processar a resposta do servidor.",
        };
      }

      if (!resp.ok || !data.success) {
        setPdfImportResult("Erro: " + (data.error || "Erro desconhecido ao processar arquivo."));
        setPdfImportProgress(0);
        return;
      }

      // Perform matching and database cross-referencing on the extracted orders
      const matchedOrders = data.orders.map((order: any, idx: number) => {
        const originalCustomerName = order.customerName || "DESCONHECIDO";
        const customerCodeStr = order.customerCode
          ? String(order.customerCode).trim()
          : "";
        let finalCustomerName = originalCustomerName;
        let matchedCustomer = null;
        let wasCustomerMatched = false;

        // 1. Try to match by customerCode if provided
        if (customerCodeStr) {
          const codeId = Number(customerCodeStr);
          if (!isNaN(codeId)) {
            matchedCustomer = db.customers.find((c) => c.id === codeId);
          }
        }

        // 2. Try to match by a numeric customer code at the beginning of the name (e.g. "123 - CLIENTE" or "[123] CLIENTE")
        if (!matchedCustomer) {
          const leadingCodeMatch =
            originalCustomerName.match(/^\s*[\[\(]?\s*(\d+)/);
          if (leadingCodeMatch) {
            const codeId = Number(leadingCodeMatch[1]);
            matchedCustomer = db.customers.find((c) => c.id === codeId);
          }
        }

        // 3. Fallback: match by scanning numeric sequences or similarity with database names/tradeNames
        if (!matchedCustomer) {
          const cleanOcrName = originalCustomerName.toLowerCase().trim();
          matchedCustomer = db.customers.find((c) => {
            const dbIdStr = c.id.toString();
            if (cleanOcrName.includes(dbIdStr)) return true;

            const dbName = c.name.toLowerCase().trim();
            const dbTrade = c.tradeName ? c.tradeName.toLowerCase().trim() : "";

            if (
              cleanOcrName === dbName ||
              cleanOcrName.includes(dbName) ||
              dbName.includes(cleanOcrName)
            )
              return true;
            if (
              dbTrade &&
              (cleanOcrName === dbTrade ||
                cleanOcrName.includes(dbTrade) ||
                dbTrade.includes(cleanOcrName))
            )
              return true;

            return false;
          });
        }

        // Opt for tradeName (nome fantasia) if client is identified and has tradeName, else reason social
        if (matchedCustomer) {
          finalCustomerName =
            matchedCustomer.tradeName?.trim() || matchedCustomer.name;
          wasCustomerMatched = true;
        }

        // Match Representative (Consultor) from PDF
        let matchedRep = null;
        let wasRepMatched = false;
        const ocrRepName = order.representativeName
          ? order.representativeName.toLowerCase().trim()
          : "";

        if (ocrRepName) {
          const cleanRepName = ocrRepName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/\brepresentante\b/gi, "") // Remove 'representante' word
            .trim();

          if (
            cleanRepName.toLowerCase().includes("mapefor") ||
            ocrRepName.toLowerCase().includes("mapefor")
          ) {
            matchedRep =
              db.users.find((u) => u.id === "representante_danilo") || null;
          } else {
            matchedRep = db.users.find((u) => {
              if (u.role !== "REPRESENTANTE") return false;
              const dbNormalize = u.name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\brepresentante\b/gi, "")
                .trim();

              return (
                cleanRepName === dbNormalize ||
                dbNormalize.includes(cleanRepName) ||
                cleanRepName.includes(dbNormalize)
              );
            });
          }
        }

        let finalRepresentativeName = order.representativeName || "";
        let finalRepresentativeId = "";

        // NEW RULE: Force representative to "Andr√©" for specific clients
        const clientsForAndre = [
          "m√≥veis bom pastor",
          "moveis bom pastor",
          "bom pastor",
          "Moveis B P LTDA",
          "lara moveis",
          "lara m√≥veis",
          "artano",
          "grupo sier",
          "sier",
        ];

        const isClientForAndre = clientsForAndre.some(
          (clientName) =>
            originalCustomerName.toLowerCase().includes(clientName) ||
            (matchedCustomer?.name || "").toLowerCase().includes(clientName) ||
            (matchedCustomer?.tradeName || "")
              .toLowerCase()
              .includes(clientName),
        );

        if (isClientForAndre) {
          matchedRep =
            db.users.find(
              (u) =>
                u.name.toLowerCase().includes("andr√©") ||
                u.name.toLowerCase().includes("andre"),
            ) || matchedRep;
        }

        if (matchedRep) {
          finalRepresentativeName = matchedRep.name;
          finalRepresentativeId = matchedRep.id;
          wasRepMatched = true;
        }

        // Normalize status original and validate rules
        const statusOriginalPdf = (
          order.statusOriginalPdf ||
          order.status ||
          ""
        )
          .trim()
          .toUpperCase();

        const orderCodeStr = order.orderCode
          ? String(order.orderCode).trim().toUpperCase()
          : "";
        const orderExists = db.orders.some(
          (x) =>
            x.orderCode &&
            String(x.orderCode).trim().toUpperCase() === orderCodeStr,
        );

        let statusValidation: "APTO" | "ALERTA" | "BLOQUEADO" | "REVISAO" =
          "REVISAO";
        let validationMessage = "";

        if (orderExists) {
          statusValidation = "BLOQUEADO";
          validationMessage =
            "BLOQUEADO: Este pedido j√° existe no sistema. A importa√ß√£o autom√°tica foi bloqueada para evitar duplicidade. Novos itens s√≥ podem ser adicionados manualmente.";
        } else if (!statusOriginalPdf) {
          statusValidation = "REVISAO";
          validationMessage =
            "Status ausente ou n√£o identificado no PDF. Requer revis√£o manual.";
        } else if (
          statusOriginalPdf.includes("DOCUMENTO FATURADO") &&
          !statusOriginalPdf.includes("PARCIAL")
        ) {
          statusValidation = "APTO";
          validationMessage =
            "Pedido faturado no PDF. Ser√° importado com status FATURADO e far√° consumo de estoque.";
        } else if (
          statusOriginalPdf.includes("DOCUMENTO FATURADO PARCIAL") ||
          statusOriginalPdf.includes("PARCIAL")
        ) {
          statusValidation = "ALERTA";
          validationMessage =
            "ALERTA: Faturado parcial. Ser√° importado como pendente, verifique se os itens realmente devem ir para produ√ß√£o.";
        } else if (
          statusOriginalPdf.includes("PROCESSADO") ||
          statusOriginalPdf.includes("PEDIDO DE VENDA") ||
          statusOriginalPdf.includes("PEDIDO") ||
          statusOriginalPdf.includes("APROVADO") ||
          statusOriginalPdf.includes("PENDENTE") ||
          statusOriginalPdf.includes("A FATURAR") ||
          statusOriginalPdf.includes("EM_PRODUCAO") ||
          statusOriginalPdf.includes("EM PRODUCAO") ||
          statusOriginalPdf.includes("OR√áAMENTO APRESENTADO") ||
          statusOriginalPdf === "AGUARDANDO_APROVACAO"
        ) {
          statusValidation = "APTO";
          validationMessage = "Pedido liberado para importa√ß√£o.";
        } else {
          statusValidation = "REVISAO";
          validationMessage =
            "Status n√£o reconhecido. Requer revis√£o manual antes de faturar/produzir.";
        }

        // Determine system status mapping following strict user rules:
        // "Se o status for ‚ÄúDOCUMENTO FATURADO‚Äù, o pedido n√£o deve seguir como pendente ou para produ√ß√£o." -> map to AGUARDANDO_APROVACAO
        let finalSystemStatus:
          | "AGUARDANDO_APROVACAO"
          | "PENDENTE"
          | "EM_PRODUCAO"
          | "FATURADO" = "AGUARDANDO_APROVACAO";
        if (statusValidation === "APTO") {
          if (
            statusOriginalPdf.includes("DOCUMENTO FATURADO") &&
            !statusOriginalPdf.includes("PARCIAL")
          ) {
            finalSystemStatus = "FATURADO";
          } else if (
            order.status === "EM_PRODUCAO" ||
            order.status === "PENDENTE"
          ) {
            finalSystemStatus = order.status;
          } else {
            finalSystemStatus = "PENDENTE";
          }
        } else {
          finalSystemStatus = "AGUARDANDO_APROVACAO";
        }

        const mappedItems = (order.items || []).map((it: any) => {
          let c = it.color;
          const strCode = String(it.itemCode || "").trim();
          let processedCode = it.itemCode;

          if (strCode.includes(".")) {
            const parts = strCode.split(".");
            const possibleColorCode = parts[parts.length - 1].trim();

            if (COLOR_MAP[possibleColorCode]) {
              c = COLOR_MAP[possibleColorCode];
              // Remapeia o c√≥digo base removendo o sufixo num√©rico da cor
              processedCode = parts.slice(0, -1).join(".");
            }
          }

          return {
            ...it,
            color: c,
            itemCode: processedCode,
          };
        });

        return {
          ...order,
          items: mappedItems,
          tempId:
            order.tempId ||
            `temp_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          customerName: finalCustomerName,
          originalCustomerName,
          wasCustomerMatched,
          matchedCustomer,
          representativeName: finalRepresentativeName,
          representativeId: finalRepresentativeId,
          wasRepMatched,
          status: finalSystemStatus,
          statusOriginalPdf,
          statusValidation,
          validationMessage,
        };
      });

      setPdfImportProgress(100);
      setPdfExtractedOrders(matchedOrders);
      setPdfImportResult(
        "Dados extra√≠dos. Por favor, revise as informa√ß√µes abaixo antes de confirmar.",
      );

      // Clear the progress state shortly after completion
      setTimeout(() => setPdfImportProgress(0), 800);
    } catch (err: any) {
      clearInterval(extractionInterval);
      setPdfImportResult("Erro ao enviar PDF: " + err.message);
      setPdfImportProgress(0);
    }
  };

  const handleConfirmPdfImport = async () => {
    setPdfImportResult("Salvando pedidos no banco de dados...");
    setPdfImportProgress(5);
    let addedCount = 0;

    for (let i = 0; i < pdfExtractedOrders.length; i++) {
      const o = pdfExtractedOrders[i];
      const orderCode = o.orderCode || `PDF-${Date.now()}`;
      const orderCodeStr = orderCode.trim().toUpperCase();

      // Prevention safety rule: if order code exists, block/skip automatic import
      const alreadyExists = db.orders.some(
        (x) => x.orderCode && x.orderCode.trim().toUpperCase() === orderCodeStr,
      );
      if (alreadyExists) {
        console.warn(
          `[IMPORT BLOCK LOG] Importa√ß√£o autom√°tica do pedido ${orderCode} bloqueada: pedido j√° existente no sistema.`,
        );
        continue;
      }

      // Use the already matched customer name resolved from extraction
      const finalCustomerName = o.customerName || "DESCONHECIDO";

      // Check extracted/mapped status
      const extractedStatus = o.status ? o.status.trim().toUpperCase() : "";
      const allowedStatuses = [
        "AGUARDANDO_APROVACAO",
        "PENDENTE",
        "TEM_ESTOQUE",
        "EM_PRODUCAO",
        "PRODUZIDO",
        "EM_CORTE",
        "CORTADO",
        "EM_PINTURA",
        "PINTADO",
        "EMBALANDO",
        "EMBALADO",
        "PLANEJADO",
        "FATURADO",
      ];
      const orderStatus = allowedStatuses.includes(extractedStatus)
        ? (extractedStatus as any)
        : "AGUARDANDO_APROVACAO";

      for (const item of o.items) {
        let dbItemId = 0;
        if (item.itemCode) {
          const f = db.items.find((it) => it.code === item.itemCode);
          if (f) dbItemId = f.id;
        }
        if (dbItemId === 0 && item.itemName) {
          const f = db.items.find(
            (it) =>
              it.name.trim().toLowerCase() ===
              item.itemName.trim().toLowerCase(),
          );
          if (f) dbItemId = f.id;
        }
        if (dbItemId === 0 && item.itemName) {
          const f = db.items.find((it) =>
            it.name
              .trim()
              .toLowerCase()
              .includes(item.itemName.trim().toLowerCase()),
          );
          if (f) dbItemId = f.id;
        }

        const unitPriceNum = Number(item.unitPrice) || 0;
        const quantity = Number(item.quantity) || 1;

        await db.addOrder({
          orderCode: orderCode,
          customerName: finalCustomerName,
          representativeName: o.representativeName || "",
          representativeId: o.representativeId || "",
          deliveryDate:
            o.deliveryDate || new Date().toISOString().split("T")[0],
          paymentCondition: o.paymentCondition || "",
          paymentTerms: o.paymentTerm || o.paymentTerms || "",
          notes: o.notes || "",
          isProgramacao: o.isProgramacao || false,
          isUrgent: o.isUrgent || false,
          isThirdPartyLaser: o.isThirdPartyLaser || false,
          itemId: dbItemId,
          color: item.color || "-",
          size: item.size || "-",
          variation: "-",
          totalQuantity: quantity,
          packedQuantity: orderStatus === "FATURADO" ? quantity : 0,
          invoicedQuantity: orderStatus === "FATURADO" ? quantity : 0,
          unitPrice: unitPriceNum,
          status: orderStatus,
          statusOriginalPdf: o.statusOriginalPdf || "",
          isActive: orderStatus !== "FATURADO",
          createdAt: Date.now(),
          customProductName: item.itemName,
        });

        if (orderStatus === "FATURADO" && dbItemId !== 0) {
          const stockId = `${dbItemId}|${item.color || "-"}|${item.size || "-"}|-|ACABADO`;
          const existingStock = db.stocks.find((s) => s.id === stockId);
          if (existingStock) {
            await db.updateStocks([
              {
                ...existingStock,
                quantity: Math.max(0, existingStock.quantity - quantity),
                reservedQuantity: Math.max(
                  0,
                  (existingStock.reservedQuantity || 0) - quantity,
                ),
              },
            ]);
            db.addStockMovement?.({
              itemId: dbItemId,
              color: item.color || "-",
              size: item.size || "-",
              variation: "-",
              quantity: quantity,
              type: "SAIDA",
              description: `Dedu√ß√£o de estoque por importa√ß√£o direta de pedido FATURADO via PDF (${orderCode})`,
            });
          }
        }

        if (unitPriceNum > 0 && dbItemId !== 0) {
          await db.addPriceHistory({
            itemId: dbItemId,
            customerName: finalCustomerName,
            unitPrice: unitPriceNum,
            orderCode: orderCode,
            createdAt: Date.now(),
            source: "PDF",
          });
        }
        addedCount++;
      }
      setPdfImportProgress(
        Math.round(((i + 1) / pdfExtractedOrders.length) * 100),
      );
    }

    setPdfImportResult(
      `Importa√ß√£o conclu√≠da! ${addedCount} itens de pedidos criados.`,
    );
    setTimeout(() => {
      setIsPdfModalOpen(false);
      setPdfExtractedOrders([]);
      setPdfFiles([]);
      setPdfImportResult(null);
      setPdfImportProgress(0);
      setEditingOrderIdx(null);
    }, 3000);
  };

  const handleImportExcel = async () => {
    if (!excelData.trim()) return;

    setExcelImportResult("Processando...");

    const rows = excelData.trim().split("\n");
    let addedCount = 0;
    let updatedCount = 0;

    const updatedOrders: any[] = [];

    // Check if the first row looks like a header row
    const firstRowCols = rows[0].split("\t").map((c) => c.trim().toUpperCase());
    const hasDynamicHeaders =
      firstRowCols.some(
        (c) =>
          c.includes("PEDIDO") ||
          c.includes("C√ìDIGO") ||
          c.includes("CODIGO") ||
          c.includes("NUMERO") ||
          c.includes("N¬∫") ||
          c.includes("O.V"),
      ) &&
      firstRowCols.some(
        (c) =>
          c.includes("ITEM") ||
          c.includes("PRODUTO") ||
          c.includes("PECA") ||
          c.includes("PE√áA") ||
          c.includes("DESCRI"),
      );

    let startIdx = 0;

    // Fallback static indices
    let idxCode = 0;
    let idxCustomer = 1;
    let idxRep = 2;
    let idxProductStr = 3;
    let idxColor = 4;
    let idxSize = 5;
    let idxVariation = 6;
    let idxQty = 7;
    let idxDate = 8;

    let idxStatusProd = -1;
    let idxStatusFat = -1;
    let idxStatusEnt = -1;
    let idxQtdEntregue = -1;

    if (hasDynamicHeaders) {
      startIdx = 1; // skip header

      const getColIndex = (names: string[], exactOnly = false) => {
        let res = firstRowCols.findIndex((c) =>
          names.some((n) => c === n.toUpperCase()),
        );
        if (res === -1 && !exactOnly) {
          res = firstRowCols.findIndex((c) =>
            names.some(
              (n) =>
                c.includes(n.toUpperCase()) &&
                !c.includes("COD. CLIENTE") &&
                !c.includes("C√ìD. CLIENTE"),
            ),
          );
        }
        return res;
      };

      idxCode = getColIndex([
        "PEDIDO",
        "N¬∫ PEDIDO",
        "C√ìD. O.V.",
        "C√ìDIGO",
        "NUMERO",
        "N√öMERO",
        "N¬∫ O.V.",
        "O.V.",
      ]);
      idxCustomer = getColIndex([
        "RAZ√ÉO SOCIAL",
        "CLIENTE FANTASIA",
        "CLIENTE",
        "NOME DO CLIENTE",
      ]);

      idxRep = getColIndex(["CONSULTOR", "VENDEDOR", "REPRESENTANTE"], true); // Do not fallback to Cidade

      const codItemIdx = getColIndex([
        "C√ìD. ITEM",
        "COD ITEM",
        "C√ìDIGO DO PRODUTO",
      ]);
      idxProductStr =
        codItemIdx >= 0
          ? codItemIdx
          : getColIndex([
              "ITEM",
              "PRODUTO",
              "DESCRI√á√ÉO",
              "DESCRI",
              "PE√áA",
              "NOME",
            ]);

      idxColor = getColIndex(["COR"], true);
      idxSize = getColIndex(["TAMANHO"], true);
      idxVariation = getColIndex(["VARIA√á√ÉO", "VARIACAO"], true);
      idxQty = getColIndex(["QUANTIDADE", "QTD"], true);

      // Date can be 'Data para Entrega'
      idxDate = getColIndex(["DATA PARA ENTREGA", "ENTREGA"]);
      if (idxDate === -1) idxDate = getColIndex(["DATA"]);

      idxStatusProd = getColIndex(["STATUS DE PRODU"]);
      idxStatusFat = getColIndex(["STATUS DE FATURAMENTO", "STATUS DE FAT"]);
      idxStatusEnt = getColIndex(["STATUS DE ENTREGA", "STATUS DE ENT"]);

      idxQtdEntregue = getColIndex([
        "QTD. ENTREGUE",
        "QTD ENTREGUE",
        "QTD. FATURADA",
      ]);
    }

    // Helper for Excel dates
    const formatExcelDate = (dateStr: string) => {
      if (!dateStr || dateStr === "-") return "";

      // Handle something like "seg., 20 de abr." or "18/nov."
      const matchMonthStr = dateStr.toLowerCase();
      const months = [
        "jan",
        "fev",
        "mar",
        "abr",
        "mai",
        "jun",
        "jul",
        "ago",
        "set",
        "out",
        "nov",
        "dez",
      ];

      const foundMonthIdx = months.findIndex((m) => matchMonthStr.includes(m));

      if (foundMonthIdx !== -1) {
        // extract numbers
        const numbers = dateStr.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          const day = String(numbers[numbers.length - 1]).padStart(2, "0");
          const month = String(foundMonthIdx + 1).padStart(2, "0");
          let year = new Date().getFullYear();

          // Simple heuristic: if month is earlier than current month by a lot without year, it might be next year. We just use current year.
          if (dateStr.includes(String(year))) {
            // already has year
          } else if (dateStr.includes(String(year + 1))) {
            year++;
          }

          return `${year}-${month}-${day}`;
        }
      }

      // Handle normal dd/mm/yyyy
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split("/");
        return `${y}-${m}-${d}`;
      }

      return dateStr;
    };

    const incomingOrderCodes: string[] = [];
    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row.trim()) continue;
      const cols = row.split("\t").map((c) => c.trim().toUpperCase());
      const rCode = idxCode >= 0 && cols.length > idxCode ? cols[idxCode] : "";
      if (rCode && !incomingOrderCodes.includes(rCode)) {
        incomingOrderCodes.push(rCode);
      }
    }

    const preExistingCodes = db.orders.reduce((acc, o) => {
      if (o.orderCode) {
        acc.add(o.orderCode.trim().toUpperCase());
      }
      return acc;
    }, new Set<string>());

    const blockedCodes = incomingOrderCodes.filter((code) =>
      preExistingCodes.has(code.trim().toUpperCase()),
    );
    const anyBlocked = blockedCodes.length > 0;

    setExcelImportProgress(0);

    for (let i = startIdx; i < rows.length; i++) {
      if (i % 25 === 0) {
        setExcelImportProgress(
          Math.round(((i - startIdx) / (rows.length - startIdx)) * 100),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const row = rows[i];
      if (!row.trim()) continue;
      const cols = row.split("\t").map((c) => c.trim().toUpperCase());

      // Only reject if it lacks at least something resembling an ID, unless dynamic headers are found
      if (!hasDynamicHeaders && cols.length < 4) continue;

      const rCode = idxCode >= 0 && cols.length > idxCode ? cols[idxCode] : "";

      // Prevention safety rule: if order code exists in database, block/skip automatic import
      if (rCode && preExistingCodes.has(rCode.trim().toUpperCase())) {
        console.warn(
          `[IMPORT BLOCK LOG] Importa√ß√£o autom√°tica do pedido ${rCode} bloqueada: pedido j√° existente no sistema.`,
        );
        continue;
      }

      let rCustomer =
        idxCustomer >= 0 && cols.length > idxCustomer
          ? cols[idxCustomer]
          : cols[1] || "";
      const rRepRaw =
        idxRep >= 0 && cols.length > idxRep
          ? cols[idxRep]
          : cols.length > 2 && !hasDynamicHeaders
            ? cols[2]
            : "";
      let rRep = rRepRaw !== "-" && rRepRaw !== "" ? rRepRaw : "";
      if (rRep.toLowerCase().includes("mapefor")) {
        rRep = "Danilo Representante";
      }

      const rProductStr =
        idxProductStr >= 0 && cols.length > idxProductStr
          ? cols[idxProductStr]
          : cols[3] || "";
      const rColor =
        idxColor >= 0 && cols.length > idxColor && cols[idxColor]
          ? cols[idxColor]
          : "-";
      const rSize =
        idxSize >= 0 && cols.length > idxSize && cols[idxSize]
          ? cols[idxSize]
          : "-";
      const rVariation =
        idxVariation >= 0 && cols.length > idxVariation && cols[idxVariation]
          ? cols[idxVariation]
          : "-";

      const rQtyStr =
        idxQty >= 0 && cols.length > idxQty
          ? cols[idxQty]
          : cols.length > 7 && !hasDynamicHeaders
            ? cols[7]
            : "1";
      let rDate =
        idxDate >= 0 && cols.length > idxDate && cols[idxDate]
          ? cols[idxDate]
          : cols.length > 8 && !hasDynamicHeaders
            ? cols[8]
            : new Date().toISOString().split("T")[0];

      rDate = formatExcelDate(rDate);

      const rQtdEntStr =
        idxQtdEntregue >= 0 && cols.length > idxQtdEntregue
          ? cols[idxQtdEntregue]
          : "0";

      if (!rCode && !rProductStr) continue;

      const parsedQty = parseInt(
        (rQtyStr || "1").toString().replace(/\D/g, ""),
        10,
      );
      if (isNaN(parsedQty) || parsedQty <= 0) continue;

      const parsedEnt = parseInt(
        (rQtdEntStr || "0").toString().replace(/\D/g, ""),
        10,
      );
      const deliveredQty = isNaN(parsedEnt) ? 0 : parsedEnt;

      // se nao achou cliente, tenta pegar o Cliente Fantasia (coluna seguinte se for do padrao deles)
      if (
        !rCustomer &&
        hasDynamicHeaders &&
        idxCustomer >= 0 &&
        cols.length > idxCustomer + 1
      ) {
        const tryNext = cols[idxCustomer + 1];
        if (tryNext && tryNext !== "-" && tryNext !== "") rCustomer = tryNext;
      }
      if (!rCustomer) rCustomer = "CONSUMIDOR FINAL";

      const query = rProductStr.toLowerCase();
      const itemDb = db.items.find(
        (i) =>
          String(i.id) === query ||
          String(i.code).toLowerCase() === query ||
          i.name.toLowerCase() === query,
      );

      const actualItemId = itemDb ? itemDb.id : null;
      if (!actualItemId) continue;

      let rStatus: any = "PENDENTE";
      if (hasDynamicHeaders) {
        const sProd =
          idxStatusProd >= 0 && cols.length > idxStatusProd
            ? cols[idxStatusProd]
            : "";
        const sFat =
          idxStatusFat >= 0 && cols.length > idxStatusFat
            ? cols[idxStatusFat]
            : "";
        const sEnt =
          idxStatusEnt >= 0 && cols.length > idxStatusEnt
            ? cols[idxStatusEnt]
            : "";

        if (sEnt.includes("ENTREGUE")) rStatus = "FATURADO";
        else if (sFat.includes("FATURADO")) rStatus = "FATURADO";
        else if (sProd.includes("PRONTO")) rStatus = "EMBALADO";
        else if (sProd.includes("PRODU") || sProd.includes("PROCESSO"))
          rStatus = "EM_PRODUCAO";
      }

      if (deliveredQty >= parsedQty) rStatus = "FATURADO";

      const existing = db.orders.find(
        (o) =>
          o.orderCode === rCode &&
          o.itemId === actualItemId &&
          o.color === rColor &&
          o.size === rSize &&
          o.variation === rVariation,
      );

      if (existing) {
        const isFaturado = hasDynamicHeaders
          ? rStatus === "FATURADO"
          : existing.status === "FATURADO";
        updatedOrders.push({
          ...existing,
          customerName: rCustomer || existing.customerName,
          representativeName: rRep !== "" ? rRep : existing.representativeName,
          totalQuantity: parsedQty,
          deliveryDate:
            rDate !== ""
              ? rDate
              : isFaturado
                ? new Date().toISOString().split("T")[0]
                : existing.deliveryDate,
          status: hasDynamicHeaders ? rStatus : existing.status,
          packedQuantity:
            hasDynamicHeaders && deliveredQty > 0
              ? deliveredQty
              : existing.packedQuantity,
          invoicedQuantity:
            hasDynamicHeaders && deliveredQty > 0
              ? deliveredQty
              : existing.invoicedQuantity,
          isActive: !isFaturado,
        });
        updatedCount++;
      } else {
        await db.addOrder({
          orderCode: rCode,
          itemId: actualItemId,
          customerName: rCustomer || "Desconhecido",
          representativeName: rRep || "",
          color: rColor,
          size: rSize,
          variation: rVariation,
          totalQuantity: parsedQty,
          packedQuantity:
            hasDynamicHeaders &&
            (deliveredQty > 0 ||
              rStatus === "EMBALADO" ||
              rStatus === "FATURADO")
              ? Math.max(deliveredQty, parsedQty)
              : 0,
          invoicedQuantity:
            hasDynamicHeaders && (deliveredQty > 0 || rStatus === "FATURADO")
              ? Math.max(deliveredQty, parsedQty)
              : 0,
          isActive: rStatus !== "FATURADO",
          createdAt: Date.now(),
          deliveryDate:
            rDate ||
            (rStatus === "FATURADO"
              ? new Date().toISOString().split("T")[0]
              : ""),
          status: rStatus,
        });
        addedCount++;
      }
    }

    setExcelImportProgress(100);

    if (updatedOrders.length > 0) {
      db.updateOrders(updatedOrders);
    }

    if (anyBlocked) {
      if (addedCount === 0) {
        setExcelImportResult(
          `Este pedido j√° existe no sistema. A importa√ß√£o autom√°tica foi bloqueada para evitar duplicidade. Novos itens s√≥ podem ser adicionados manualmente. (Pedidos bloqueados: ${blockedCodes.join(", ")})`,
        );
      } else {
        setExcelImportResult(
          `Importa√ß√£o conclu√≠da parcialmente! ${addedCount} novos itens adicionados de novos pedidos. Pedidos j√° existentes [${blockedCodes.join(", ")}] foram bloqueados para evitar duplicidade. Novos itens neles s√≥ podem ser adicionados manualmente.`,
        );
      }
    } else {
      setExcelImportResult(
        `Conclu√≠do! ${addedCount} novos adicionados, ${updatedCount} atualizados.`,
      );
    }
    setExcelData("");
    setTimeout(() => {
      setIsExcelModalOpen(false);
      setExcelImportResult(null);
    }, 6000);
  };

  const sendServerPush = async (
    title: string,
    body: string,
    targetRoles: Role[],
  ) => {
    // Find users with these roles
    const targetUsers = db.users.filter(
      (u) => targetRoles.includes(u.role) && u.fcmToken,
    );
    const tokens = targetUsers.map((u) => u.fcmToken);

    if (tokens.length === 0) return;

    try {
      await fetch("/api/send-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, fcmTokens: tokens }),
      });
    } catch (e) {
      console.error("Error triggering push:", e);
    }
  };

  const handleApproveOrder = async (orderToApprove: (typeof db.orders)[0]) => {
    const stockId = `${orderToApprove.itemId}|${orderToApprove.color}|${orderToApprove.size}|${orderToApprove.variation}|ACABADO`;
    const existingStock = db.stocks.find((s) => s.id === stockId);

    let qtFromStock = 0;
    let newStatus: OrderStatus = "PENDENTE";

    if (existingStock && existingStock.quantity > 0) {
      qtFromStock = Math.min(
        existingStock.quantity,
        orderToApprove.totalQuantity,
      );
      const newStockQty = existingStock.quantity - qtFromStock;
      db.updateStocks([{ ...existingStock, quantity: newStockQty }]);

      if (qtFromStock >= orderToApprove.totalQuantity) {
        newStatus = "TEM_ESTOQUE";
      }
    }

    db.updateOrders([
      {
        ...orderToApprove,
        status: newStatus,
        packedQuantity: qtFromStock,
        producedQuantity: qtFromStock,
        paintedQuantity: qtFromStock,
        cutQuantity: qtFromStock,
        isActive: true,
      },
    ]);

    db.addLogs([
      {
        id: Date.now(),
        orderId: orderToApprove.id,
        operatorId: currentUser.id,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
        customProductName: `Aprova√ß√£o de Pedido (Status: ${newStatus})`,
      },
    ]);

    alert(`Pedido ${orderToApprove.orderCode} aprovado com sucesso!`);
  };

  const handleRejectOrder = (orderId: number) => {
    if (
      confirm(
        "Deseja rejeitar e remover este pedido enviado pelo representante?",
      )
    ) {
      db.deleteOrder(orderId);
    }
  };

  const handleConfirmInvoice = () => {
    if (!invoiceModalData) return;
    const { order: o, limit } = invoiceModalData;
    const qty = parseInt(invoiceInput, 10);

    if (isNaN(qty) || qty <= 0 || qty > limit) {
      alert("Quantidade inv√°lida. Deve ser maior que 0 e no m√°ximo " + limit);
      return;
    }

    const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
    const existingStock = db.stocks.find((s) => s.id === stockId);

    // Stolen reservation popup alert check
    if (existingStock && (existingStock.reservedQuantity || 0) > 0) {
      const alternateReservedOrders = db.orders.filter(
        (ord) =>
          ord.id !== o.id &&
          ord.itemId === o.itemId &&
          ord.color === o.color &&
          ord.size === o.size &&
          ord.variation === o.variation &&
          (ord.status === "PLANEJADO" || ord.status === "EMBALADO") &&
          ord.isActive,
      );

      if (alternateReservedOrders.length > 0) {
        const primaryResOrder = alternateReservedOrders[0];
        const confirmResult = window.confirm(
          `ALERTA POPUP - PRODUTO RESERVADO PARA OUTRO PEDIDO:\n\n` +
            `O produto que voc√™ est√° faturando cont√©m unidades de estoque RESERVADAS para:\n` +
            `‚Ä¢ Pedido: ${primaryResOrder.orderCode}\n` +
            `‚Ä¢ Cliente: ${primaryResOrder.customerName}\n\n` +
            `Deseja CONTINUAR assim mesmo e desfazer a reserva do outro pedido ou clique em Cancelar para interromper?`,
        );

        if (!confirmResult) {
          setInvoiceModalData(null);
          setInvoiceInput("");
          return;
        } else {
          db.updateOrders([
            {
              ...primaryResOrder,
              status: "PENDENTE",
              packedQuantity: 0,
            },
          ]);

          const nextReservedQty = Math.max(
            0,
            (existingStock.reservedQuantity || 0) -
              (primaryResOrder.totalQuantity || 0),
          );
          db.updateStocks([
            {
              ...existingStock,
              reservedQuantity: nextReservedQty,
            },
          ]);

          db.addLogs([
            {
              id: Date.now() + 5,
              orderId: primaryResOrder.id,
              operatorId: currentUser.id,
              timestamp: Date.now(),
              durationMillis: 0,
              customProductName: `Reserva desfeita (estoque direcionado para pedido ${o.orderCode})`,
            },
          ]);
        }
      }
    }

    const newInvoiced = (o.invoicedQuantity || 0) + qty;
    const isNowFaturado = newInvoiced >= o.totalQuantity;
    const newStatus = isNowFaturado
      ? ("FATURADO" as const)
      : (newInvoiced > 0 ? ("FATURADO_PARCIAL" as const) : (o.status || "PENDENTE"));

    db.updateOrders([
      {
        ...o,
        invoicedQuantity: newInvoiced,
        status: newStatus,
        isActive: !isNowFaturado,
        isUrgent: isNowFaturado ? false : o.isUrgent, // automatically remove isUrgent!
        _alreadyDeducted: true,
      },
    ]);

    if (existingStock) {
      const newStockQty = Math.max(0, existingStock.quantity - qty);
      const newReservedQty = Math.max(
        0,
        (existingStock.reservedQuantity || 0) - qty,
      );
      db.updateStocks([
        {
          ...existingStock,
          quantity: newStockQty,
          reservedQuantity: newReservedQty,
        },
      ]);
    }

    db.addStockMovement?.({
      itemId: o.itemId,
      color: o.color,
      size: o.size,
      variation: o.variation,
      quantity: qty,
      type: "SAIDA",
      description: `Sa√≠da por faturamento do Pedido ${o.orderCode} (Cliente: ${o.customerName})`,
    });

    db.addLogs([
      {
        id: Date.now(),
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qty,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
      },
    ]);

    // Triga WhatsApp Share Modal
    const rep = db.users.find(
      (u) =>
        u.role === "REPRESENTANTE" &&
        (u.name === o.representativeName || u.id === o.representativeId),
    );
    const customer = db.customers.find((c) => c.name === o.customerName);
    const clientDisplayName = customer?.tradeName || o.customerName;
    const item = db.items.find((i) => i.id === o.itemId);
    const productDescr = `${item?.name || "Produto"} (Cor: ${o.color || "-"}, Tam: ${o.size || "-"}, Var: ${o.variation || "-"})`;

    setInvoiceModalData(null);
    setInvoiceInput("");

    setFaturamentoWhatsAppShareData({
      orderCode: o.orderCode || `${o.id}`,
      customerName: clientDisplayName,
      productDescription: productDescr,
      quantity: qty,
      phone: rep?.phone || "",
      representativeName: rep?.name || o.representativeName || "n√£o definido",
      customerEmail: customer?.email || "",
      representativeEmail: rep?.email || "",
      totalValue: qty * (o.unitPrice || 0),
      deliveryDate: o.deliveryDate || "",
    });
  };

  const handleInvoiceEntireOrder = async (orderCode: string) => {
    const itemsToInvoice = db.orders.filter(
      (o: any) =>
        o.orderCode === orderCode &&
        o.isActive !== false &&
        (o.invoicedQuantity || 0) < o.totalQuantity,
    );

    const itemsWithQtyToInvoice = itemsToInvoice.filter((o: any) => {
      const qtyToInvoice = o.totalQuantity - (o.invoicedQuantity || 0);
      return qtyToInvoice > 0;
    });

    if (itemsWithQtyToInvoice.length === 0) {
      alert("Todos os itens deste pedido j√° est√£o com faturamento completo.");
      return;
    }

    const confirmResult = window.confirm(
      `Tem certeza que deseja faturar todo o pedido ${orderCode} de uma √∫nica vez?`,
    );
    if (!confirmResult) return;

    const updatedOrders: any[] = [];
    const newLogs: any[] = [];

    const stocksMapToUpdate = new Map<string, any>();
    db.stocks.forEach((s: any) => {
      stocksMapToUpdate.set(s.id, { ...s });
    });

    itemsWithQtyToInvoice.forEach((o: any, idx: number) => {
      const qtyToInvoice = o.totalQuantity - (o.invoicedQuantity || 0);
      const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;

      updatedOrders.push({
        ...o,
        invoicedQuantity: o.totalQuantity,
        status: "FATURADO" as const,
        isActive: false,
        isUrgent: false,
        _alreadyDeducted: true,
      });

      const existingStock = stocksMapToUpdate.get(stockId);
      if (existingStock) {
        existingStock.quantity = Math.max(
          0,
          existingStock.quantity - qtyToInvoice,
        );
        existingStock.reservedQuantity = Math.max(
          0,
          (existingStock.reservedQuantity || 0) - qtyToInvoice,
        );
      }

      db.addStockMovement?.({
        itemId: o.itemId,
        color: o.color,
        size: o.size,
        variation: o.variation,
        quantity: qtyToInvoice,
        type: "SAIDA",
        description: `Sa√≠da por faturamento total do Pedido ${o.orderCode} (Cliente: ${o.customerName})`,
      });

      newLogs.push({
        id: Date.now() + idx,
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qtyToInvoice,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
      });
    });

    await db.updateOrders(updatedOrders);

    const stocksArrToUpdate = Array.from(stocksMapToUpdate.values()).filter(
      (s: any) => {
        const originalStock = db.stocks.find((os: any) => os.id === s.id);
        return (
          originalStock &&
          (originalStock.quantity !== s.quantity ||
            originalStock.reservedQuantity !== s.reservedQuantity)
        );
      },
    );

    if (stocksArrToUpdate.length > 0) {
      await db.updateStocks(stocksArrToUpdate);
    }

    if (newLogs.length > 0) {
      await db.addLogs(newLogs);
    }

    // Capture representative and customer info for the entire order to trigger communication flow
    const firstItem = itemsWithQtyToInvoice[0];
    const rep = db.users.find(
      (u) =>
        u.role === "REPRESENTANTE" &&
        (u.name === firstItem.representativeName ||
          u.id === firstItem.representativeId),
    );
    const customer = db.customers.find(
      (c) => c.name === firstItem.customerName,
    );
    const clientDisplayName = customer?.tradeName || firstItem.customerName;

    const totalQty = itemsWithQtyToInvoice.reduce(
      (sum, item) => sum + (item.totalQuantity - (item.invoicedQuantity || 0)),
      0,
    );
    const totalVal = itemsWithQtyToInvoice.reduce(
      (sum, item) =>
        sum +
        (item.totalQuantity - (item.invoicedQuantity || 0)) *
          (item.unitPrice || 0),
      0,
    );

    const productDescr = itemsWithQtyToInvoice
      .map((item) => {
        const dbItem = db.items.find((i) => i.id === item.itemId);
        const name = dbItem?.name || item.customProductName || "Produto";
        const q = item.totalQuantity - (item.invoicedQuantity || 0);
        return `${name} (Cor: ${item.color || "-"}, Tam: ${item.size || "-"}, Var: ${item.variation || "-"}) [Qtd: ${q}]`;
      })
      .join(" | ");

    setFaturamentoWhatsAppShareData({
      orderCode: orderCode,
      customerName: clientDisplayName,
      productDescription: productDescr,
      quantity: totalQty,
      phone: rep?.phone || "",
      representativeName:
        rep?.name || firstItem.representativeName || "n√£o definido",
      customerEmail: customer?.email || "",
      representativeEmail: rep?.email || "",
      totalValue: totalVal,
      deliveryDate: firstItem.deliveryDate || "",
    });

    alert(`Pedido ${orderCode} faturado com sucesso!`);
    setSelectedOrderCode(null);
  };

  const handleBatchInvoice = () => {
    if (selectedBatchInvoiceIds.length === 0) return;

    if (
      !confirm(
        `Deseja faturar em lote ${selectedBatchInvoiceIds.length} pedido(s) selecionado(s)?`,
      )
    ) {
      return;
    }

    const updatedOrders: typeof db.orders = [];
    const updatedStocks: typeof db.stocks = [];
    const addedLogs: any[] = [];

    selectedBatchInvoiceIds.forEach((id, idx) => {
      const o = db.orders.find((ord) => ord.id === id);
      if (!o || o.status !== "EMBALADO") return;

      const qty = o.totalQuantity - (o.invoicedQuantity || 0);
      if (qty <= 0) return;

      const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
      const existingStock = db.stocks.find((s) => s.id === stockId);

      const newInvoiced = (o.invoicedQuantity || 0) + qty;
      const isNowFaturado = true;
      const newStatus = "FATURADO" as const;

      updatedOrders.push({
        ...o,
        invoicedQuantity: newInvoiced,
        status: newStatus,
        isActive: false,
        isUrgent: false,
        _alreadyDeducted: true,
      });

      if (existingStock) {
        const newStockQty = Math.max(0, existingStock.quantity - qty);
        const newReservedQty = Math.max(
          0,
          (existingStock.reservedQuantity || 0) - qty,
        );
        updatedStocks.push({
          ...existingStock,
          quantity: newStockQty,
          reservedQuantity: newReservedQty,
        });
      }

      db.addStockMovement?.({
        itemId: o.itemId,
        color: o.color,
        size: o.size,
        variation: o.variation,
        quantity: qty,
        type: "SAIDA",
        description: `Sa√≠da por faturamento em LOTE do Pedido ${o.orderCode} (Cliente: ${o.customerName})`,
      });

      addedLogs.push({
        id: Date.now() + idx + 100,
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qty,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
        customProductName: "Faturamento em Lote",
      });
    });

    if (updatedOrders.length > 0) {
      db.updateOrders(updatedOrders);
      if (updatedStocks.length > 0) {
        db.updateStocks(updatedStocks);
      }
      db.addLogs(addedLogs);
      setSelectedBatchInvoiceIds([]);
      alert(
        `Faturamento em lote conclu√≠do com sucesso para ${updatedOrders.length} pedido(s)!`,
      );
    }
  };

  const handleAddProductToOrder = () => {
    if (!itemId || !totalQuantity) return;
    setLineItems([
      ...lineItems,
      {
        itemId: Number(itemId),
        color,
        size,
        variation,
        totalQuantity: Number(totalQuantity),
        unitPrice: unitPrice === "" ? undefined : Number(unitPrice),
        isThirdPartyLaser,
        isUrgent,
        isProgramacao,
      },
    ]);
    setItemId("");
    setOrderItemSearch("");
    setColor("");
    setSize("");
    setVariation("");
    setTotalQuantity("");
    setUnitPrice("");
    setIsThirdPartyLaser(false);
    setIsUrgent(false);
    setIsProgramacao(false);
  };

  const handleEditCartItem = (idx: number) => {
    const li = lineItems[idx];
    if (!li) return;
    setEditingCartIndex(idx);
    setItemId(li.itemId);
    const itemObj = db.items.find((i) => i.id === li.itemId);
    setOrderItemSearch(itemObj ? `${itemObj.code} - ${itemObj.name}` : "");
    setColor(li.color || "");
    setSize(li.size || "");
    setVariation(li.variation || "");
    setTotalQuantity(li.totalQuantity);
    setUnitPrice(li.unitPrice ?? "");
    setIsThirdPartyLaser(!!li.isThirdPartyLaser);
    setIsUrgent(!!li.isUrgent);
    setIsProgramacao(!!li.isProgramacao);
  };

  const handleSaveCartItem = () => {
    if (editingCartIndex === null || !itemId || !totalQuantity) return;
    const updated = [...lineItems];
    updated[editingCartIndex] = {
      itemId: Number(itemId),
      color,
      size,
      variation,
      totalQuantity: Number(totalQuantity),
      unitPrice: unitPrice === "" ? undefined : Number(unitPrice),
      isThirdPartyLaser,
      isUrgent,
      isProgramacao,
    };
    setLineItems(updated);
    setEditingCartIndex(null);
    setItemId("");
    setOrderItemSearch("");
    setColor("");
    setSize("");
    setVariation("");
    setTotalQuantity("");
    setUnitPrice("");
    setIsThirdPartyLaser(false);
    setIsUrgent(false);
    setIsProgramacao(false);
  };

  const handleRemoveCartItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingCartIndex === idx) {
      setEditingCartIndex(null);
      setItemId("");
      setOrderItemSearch("");
      setColor("");
      setSize("");
      setVariation("");
      setTotalQuantity("");
      setUnitPrice("");
      setIsThirdPartyLaser(false);
      setIsUrgent(false);
      setIsProgramacao(false);
    } else if (editingCartIndex !== null && editingCartIndex > idx) {
      setEditingCartIndex(editingCartIndex - 1);
    }
  };

  const handleCancelEditCartItem = () => {
    setEditingCartIndex(null);
    setItemId("");
    setOrderItemSearch("");
    setColor("");
    setSize("");
    setVariation("");
    setTotalQuantity("");
    setUnitPrice("");
    setIsThirdPartyLaser(false);
    setIsUrgent(false);
    setIsProgramacao(false);
  };

  const handleApproveOrderGroup = async (orderCode: string) => {
    const group = db.orders.filter((o) => o.orderCode === orderCode);
    if (group.length === 0) return;

    const updatedOrders = group.map((o) => {
      if (o.status === "AGUARDANDO_APROVACAO") {
        return { ...o, status: "PENDENTE" as OrderStatus };
      }
      return o;
    });

    await db.updateOrders(updatedOrders);
    db.addLogs([
      {
        id: Date.now(),
        operatorId: currentUser.id || "admin",
        type: "PRODUCAO",
        timestamp: Date.now(),
        durationMillis: 0,
        processName: `Pedido #${orderCode} (${group[0]?.customerName || ""}) foi APROVADO.`,
      },
    ]);
    setOrderToastMessage(`Pedido #${orderCode} APROVADO com sucesso!`);
    setTimeout(() => setOrderToastMessage(""), 4000);
  };

  const handleRejectOrderGroup = async (orderCode: string) => {
    if (!window.confirm(`Tem certeza que deseja REPROVAR / CANCELAR o pedido #${orderCode}?`)) return;
    const group = db.orders.filter((o) => o.orderCode === orderCode);
    if (group.length === 0) return;

    const updatedOrders = group.map((o) => ({
      ...o,
      status: "CANCELADO" as OrderStatus,
      isActive: false,
    }));

    await db.updateOrders(updatedOrders);
    db.addLogs([
      {
        id: Date.now(),
        operatorId: currentUser.id || "admin",
        type: "PRODUCAO",
        timestamp: Date.now(),
        durationMillis: 0,
        processName: `Pedido #${orderCode} (${group[0]?.customerName || ""}) foi REPROVADO.`,
      },
    ]);
    setOrderToastMessage(`Pedido #${orderCode} REPROVADO.`);
    setTimeout(() => setOrderToastMessage(""), 4000);
  };

  const handleOpenOrderGroupEditModal = (orderCode: string) => {
    const group = db.orders.filter((o) => o.orderCode === orderCode);
    if (group.length === 0) return;
    const first = group[0];
    setEditingOrderGroupCode(orderCode);
    setEditingGroupOrderCodeInput(orderCode);
    setEditingGroupCustomerName(first.customerName || "");
    setEditingGroupCustomerSelected(true);
    setEditingGroupRepresentative(first.representativeName || "");
    setEditingGroupDeliveryDate(first.deliveryDate || "");
    setEditingGroupStatus(first.status || "PENDENTE");
    setEditingGroupNotes(first.notes || "");

    setEditingGroupLineItems(
      group.map((o) => ({
        id: o.id,
        itemId: o.itemId,
        color: o.color || "",
        size: o.size || "",
        variation: o.variation || "",
        totalQuantity: o.totalQuantity || 0,
        unitPrice: o.unitPrice,
        isThirdPartyLaser: !!o.isThirdPartyLaser,
        isUrgent: !!o.isUrgent,
        isProgramacao: !!o.isProgramacao,
      }))
    );

    setEditingGroupCartIndex(null);
    setEditingGroupItemId("");
    setEditingGroupOrderItemSearch("");
    setEditingGroupColor("");
    setEditingGroupSize("");
    setEditingGroupVariation("");
    setEditingGroupTotalQuantity("");
    setEditingGroupUnitPrice("");
    setEditingGroupIsThirdPartyLaser(false);
    setEditingGroupIsUrgent(false);
    setEditingGroupIsProgramacao(false);
  };

  const handleAddProductToEditingGroup = () => {
    if (!editingGroupItemId || !editingGroupTotalQuantity) return;
    setEditingGroupLineItems((prev) => [
      ...prev,
      {
        itemId: Number(editingGroupItemId),
        color: editingGroupColor,
        size: editingGroupSize,
        variation: editingGroupVariation,
        totalQuantity: Number(editingGroupTotalQuantity),
        unitPrice: editingGroupUnitPrice === "" ? undefined : Number(editingGroupUnitPrice),
        isThirdPartyLaser: editingGroupIsThirdPartyLaser,
        isUrgent: editingGroupIsUrgent,
        isProgramacao: editingGroupIsProgramacao,
      },
    ]);
    setEditingGroupItemId("");
    setEditingGroupOrderItemSearch("");
    setEditingGroupColor("");
    setEditingGroupSize("");
    setEditingGroupVariation("");
    setEditingGroupTotalQuantity("");
    setEditingGroupUnitPrice("");
    setEditingGroupIsThirdPartyLaser(false);
    setEditingGroupIsUrgent(false);
    setEditingGroupIsProgramacao(false);
  };

  const handleEditEditingGroupCartItem = (idx: number) => {
    const li = editingGroupLineItems[idx];
    if (!li) return;
    setEditingGroupCartIndex(idx);
    setEditingGroupItemId(li.itemId);
    const itemObj = db.items.find((i) => i.id === li.itemId);
    setEditingGroupOrderItemSearch(itemObj ? `${itemObj.code} - ${itemObj.name}` : "");
    setEditingGroupColor(li.color || "");
    setEditingGroupSize(li.size || "");
    setEditingGroupVariation(li.variation || "");
    setEditingGroupTotalQuantity(li.totalQuantity);
    setEditingGroupUnitPrice(li.unitPrice ?? "");
    setEditingGroupIsThirdPartyLaser(!!li.isThirdPartyLaser);
    setEditingGroupIsUrgent(!!li.isUrgent);
    setEditingGroupIsProgramacao(!!li.isProgramacao);
  };

  const handleSaveEditingGroupCartItem = () => {
    if (editingGroupCartIndex === null || !editingGroupItemId || !editingGroupTotalQuantity) return;
    const updated = [...editingGroupLineItems];
    updated[editingGroupCartIndex] = {
      ...updated[editingGroupCartIndex],
      itemId: Number(editingGroupItemId),
      color: editingGroupColor,
      size: editingGroupSize,
      variation: editingGroupVariation,
      totalQuantity: Number(editingGroupTotalQuantity),
      unitPrice: editingGroupUnitPrice === "" ? undefined : Number(editingGroupUnitPrice),
      isThirdPartyLaser: editingGroupIsThirdPartyLaser,
      isUrgent: editingGroupIsUrgent,
      isProgramacao: editingGroupIsProgramacao,
    };
    setEditingGroupLineItems(updated);
    setEditingGroupCartIndex(null);
    setEditingGroupItemId("");
    setEditingGroupOrderItemSearch("");
    setEditingGroupColor("");
    setEditingGroupSize("");
    setEditingGroupVariation("");
    setEditingGroupTotalQuantity("");
    setEditingGroupUnitPrice("");
    setEditingGroupIsThirdPartyLaser(false);
    setEditingGroupIsUrgent(false);
    setEditingGroupIsProgramacao(false);
  };

  const handleRemoveEditingGroupCartItem = (idx: number) => {
    setEditingGroupLineItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingGroupCartIndex === idx) {
      setEditingGroupCartIndex(null);
      setEditingGroupItemId("");
      setEditingGroupOrderItemSearch("");
      setEditingGroupColor("");
      setEditingGroupSize("");
      setEditingGroupVariation("");
      setEditingGroupTotalQuantity("");
      setEditingGroupUnitPrice("");
      setEditingGroupIsThirdPartyLaser(false);
      setEditingGroupIsUrgent(false);
      setEditingGroupIsProgramacao(false);
    } else if (editingGroupCartIndex !== null && editingGroupCartIndex > idx) {
      setEditingGroupCartIndex(editingGroupCartIndex - 1);
    }
  };

  const handleCancelEditEditingGroupCartItem = () => {
    setEditingGroupCartIndex(null);
    setEditingGroupItemId("");
    setEditingGroupOrderItemSearch("");
    setEditingGroupColor("");
    setEditingGroupSize("");
    setEditingGroupVariation("");
    setEditingGroupTotalQuantity("");
    setEditingGroupUnitPrice("");
    setEditingGroupIsThirdPartyLaser(false);
    setEditingGroupIsUrgent(false);
    setEditingGroupIsProgramacao(false);
  };

  const handleSaveOrderGroupEdit = async () => {
    if (!editingOrderGroupCode) return;
    const group = db.orders.filter((o) => o.orderCode === editingOrderGroupCode);
    if (group.length === 0) return;

    if (editingGroupLineItems.length === 0) {
      alert("O pedido deve possuir pelo menos 1 produto no carrinho.");
      return;
    }

    const newCode = editingGroupOrderCodeInput.trim() || editingOrderGroupCode;
    const newCustomerName = editingGroupCustomerName.trim() || group[0].customerName;
    const newRepresentative = editingGroupRepresentative.trim() || "";
    const newDeliveryDate = editingGroupDeliveryDate || group[0].deliveryDate;
    const newStatus = (editingGroupStatus as OrderStatus) || group[0].status || "PENDENTE";
    const newNotes = editingGroupNotes;

    const existingIdsInGroup = new Set(group.map((g) => g.id));
    const keepIds = new Set(
      editingGroupLineItems.filter((li) => li.id !== undefined).map((li) => li.id!)
    );

    // Items removed during edit: deactivate in DB
    const ordersToDeactivate: Order[] = group
      .filter((o) => !keepIds.has(o.id))
      .map((o) => ({ ...o, isActive: false }));

    const ordersToUpdate: Order[] = [];
    const newOrdersToCreate: Omit<Order, "id">[] = [];

    for (const li of editingGroupLineItems) {
      if (li.id && existingIdsInGroup.has(li.id)) {
        const existing = group.find((g) => g.id === li.id)!;
        ordersToUpdate.push({
          ...existing,
          orderCode: newCode,
          customerName: newCustomerName,
          representativeName: newRepresentative,
          deliveryDate: newDeliveryDate,
          status: newStatus,
          notes: newNotes,
          itemId: li.itemId,
          color: li.color,
          size: li.size,
          variation: li.variation,
          totalQuantity: li.totalQuantity,
          unitPrice: li.unitPrice,
          isThirdPartyLaser: li.isThirdPartyLaser,
          isUrgent: li.isUrgent,
          isProgramacao: li.isProgramacao,
        });
      } else {
        newOrdersToCreate.push({
          orderCode: newCode,
          customerName: newCustomerName,
          representativeName: newRepresentative,
          deliveryDate: newDeliveryDate,
          status: newStatus,
          notes: newNotes,
          itemId: li.itemId,
          color: li.color,
          size: li.size,
          variation: li.variation,
          totalQuantity: li.totalQuantity,
          packedQuantity: 0,
          producedQuantity: 0,
          paintedQuantity: 0,
          cutQuantity: 0,
          invoicedQuantity: 0,
          unitPrice: li.unitPrice,
          isThirdPartyLaser: li.isThirdPartyLaser,
          isUrgent: li.isUrgent,
          isProgramacao: li.isProgramacao,
          isActive: true,
          createdAt: group[0].createdAt || Date.now(),
        });
      }
    }

    const allUpdated = [...ordersToDeactivate, ...ordersToUpdate];
    if (allUpdated.length > 0) {
      await db.updateOrders(allUpdated);
    }

    if (newOrdersToCreate.length > 0) {
      for (const no of newOrdersToCreate) {
        await db.addOrder(no);
      }
    }

    db.addLogs([
      {
        id: Date.now(),
        operatorId: currentUser.id || "admin",
        type: "PRODUCAO",
        timestamp: Date.now(),
        durationMillis: 0,
        processName: `Pedido #${editingOrderGroupCode} editado por ${currentUser.name}.${newCode !== editingOrderGroupCode ? ` C√≥digo alterado para #${newCode}.` : ""}`,
      },
    ]);

    setOrderToastMessage(`Pedido #${newCode} atualizado com sucesso!`);
    setTimeout(() => setOrderToastMessage(""), 4000);
    setEditingOrderGroupCode(null);
    if (selectedOrderCode === editingOrderGroupCode) {
      setSelectedOrderCode(newCode);
    }
  };

  const [orderToastMessage, setOrderToastMessage] = useState("");

  const handleCadastrar = async () => {
    if (editingId) {
      if (
        !orderCode ||
        !itemId ||
        !customerName ||
        !totalQuantity ||
        !deliveryDate
      )
        return;
      const existing = db.orders.find((o) => o.id === editingId);
      if (existing) {
        const finalPaymentCondition =
          paymentType === "outro"
            ? customPaymentCondition
            : paymentType.toUpperCase();

        await db.updateOrders([
          {
            ...existing,
            orderCode,
            itemId: Number(itemId),
            customerName,
            representativeName,
            color,
            size,
            variation,
            totalQuantity: Number(totalQuantity),
            unitPrice: unitPrice === "" ? undefined : Number(unitPrice),
            deliveryDate,
            paymentCondition: finalPaymentCondition,
            paymentTerms,
            fiscalType,
            billingRule,
            isThirdPartyLaser,
            isUrgent,
            isProgramacao,
          },
        ]);

        // Evaluate if modified to Atrasado
        const todayMs = new Date().setHours(12, 0, 0, 0);
        const oldDeliveryMs = existing.deliveryDate
          ? new Date(existing.deliveryDate).setUTCHours(12, 0, 0, 0)
          : null;
        const newDeliveryMs = new Date(deliveryDate).setUTCHours(12, 0, 0, 0);

        const wasLate = oldDeliveryMs ? oldDeliveryMs - todayMs < 0 : false;
        const isLate = newDeliveryMs - todayMs < 0;
        const isFinished =
          existing.status === "FATURADO" || existing.status === "EMBALADO";

        if (!wasLate && isLate && !isFinished) {
          sendServerPush(
            "Aten√ß√£o: Pedido Atrasado",
            `O prazo do pedido ${orderCode} foi alterado ou venceu e encontra-se em atraso!`,
            ["ADMIN", "PCP", "PRODUCAO"],
          );
        }
      }
      setEditingId(null);
      setOrderToastMessage("Pedido atualizado com sucesso!");
      setTimeout(() => setOrderToastMessage(""), 4000);
    } else {
      if (!orderCode || !customerName || !deliveryDate) return;

      const itemsToProcess = [...lineItems];
      if (itemId && totalQuantity) {
        itemsToProcess.push({
          itemId: Number(itemId),
          color,
          size,
          variation,
          totalQuantity: Number(totalQuantity),
          unitPrice: unitPrice === "" ? undefined : Number(unitPrice),
          isThirdPartyLaser,
          isUrgent,
          isProgramacao,
        });
      }

      if (itemsToProcess.length === 0) return;

      const invalidItems = itemsToProcess.filter(it => !it.itemId || !it.totalQuantity || it.totalQuantity <= 0);
      if (invalidItems.length > 0) {
        alert("Existem itens inv√°lidos na lista (sem produto ou com quantidade zerada).");
        return;
      }

      const finalPaymentCondition =
        paymentType === "outro"
          ? customPaymentCondition
          : paymentType.toUpperCase();

      let successCount = 0;
      for (const itemInfo of itemsToProcess) {
        const numItemId = Number(itemInfo.itemId);
        const numTotalQuantity = Number(itemInfo.totalQuantity);

        const stockId = `${numItemId}|${itemInfo.color}|${itemInfo.size}|${itemInfo.variation}|ACABADO`;
        const existingStock = db.stocks.find((s) => s.id === stockId);

        let qtFromStock = 0;
        let status: OrderStatus = "PENDENTE";

        if (existingStock && existingStock.quantity > 0) {
          qtFromStock = Math.min(existingStock.quantity, numTotalQuantity);
          const newStockQty = existingStock.quantity - qtFromStock;
          await db.updateStocks([{ ...existingStock, quantity: newStockQty }]);

          if (qtFromStock >= numTotalQuantity) {
            status = "TEM_ESTOQUE"; // fully covered by stock
          }
        }

        await db.addOrder({
          orderCode,
          itemId: numItemId,
          customerName,
          representativeName,
          color: itemInfo.color,
          size: itemInfo.size,
          variation: itemInfo.variation,
          totalQuantity: numTotalQuantity,
          unitPrice: itemInfo.unitPrice,
          paymentCondition: finalPaymentCondition,
          paymentTerms,
          fiscalType,
          billingRule,
          discountPercent: discountPercent === "" ? undefined : Number(discountPercent),
          hasRET,
          packedQuantity: qtFromStock,
          producedQuantity: qtFromStock,
          paintedQuantity: qtFromStock,
          cutQuantity: qtFromStock,
          isThirdPartyLaser: itemInfo.isThirdPartyLaser,
          isUrgent: itemInfo.isUrgent,
          isProgramacao: itemInfo.isProgramacao,
          isActive: true,
          createdAt: Date.now(),
          deliveryDate,
          status: status,
        });

        if (itemInfo.isThirdPartyLaser) {
          await db.addNotification({
            message: `Novo Pedido Corte Laser Terceirizado: ${orderCode}`,
            read: false,
          });
        }
        successCount++;
      }

      // Trigger FCM Push notification
      sendServerPush(
        "Novo Pedido Gerado",
        `Pedido ${orderCode} (Cliente: ${customerName}) foi adicionado ao sistema.`,
        itemsToProcess.some((it) => it.isThirdPartyLaser)
          ? ["ADMIN", "PCP", "PRODUCAO", "PROJETISTA"]
          : ["ADMIN", "PCP", "PRODUCAO"],
      );
      
      setOrderToastMessage(`${successCount} ${successCount > 1 ? 'itens foram inseridos' : 'item foi inserido'} com sucesso!`);
      setTimeout(() => setOrderToastMessage(""), 4000);
    }

    setOrderCode("");
    setItemId("");
    setOrderItemSearch("");
    setCustomerName("");
    setRepresentativeName("");
    setColor("");
    setSize("");
    setVariation("");
    setTotalQuantity("");
    setUnitPrice("");
    setPaymentCondition("");
    setPaymentTerms("");
    setCustomPaymentCondition("");
    setIsThirdPartyLaser(false);
    setIsUrgent(false);
    setIsProgramacao(false);
    setDiscountPercent("");
    setHasRET(false);
    setLineItems([]);
    setIsFormVisible(false);
  };

  const handleEdit = (o: (typeof db.orders)[0]) => {
    setEditingId(o.id);
    setOrderCode(o.orderCode);
    setItemId(o.itemId);
    const foundItem = db.items.find((i) => i.id === o.itemId);
    setOrderItemSearch(
      foundItem ? `${foundItem.code} - ${foundItem.name}` : "",
    );
    setCustomerName(o.customerName);
    setRepresentativeName(o.representativeName || "");
    setColor(o.color);
    setSize(o.size);
    setVariation(o.variation);
    setTotalQuantity(o.totalQuantity);
    setUnitPrice(o.unitPrice ?? "");
    setDeliveryDate(o.deliveryDate);

    // Payment stuff
    const cdt = o.paymentCondition || "";
    if (["PIX", "BOLETO", "DEP√ìSITO", "CARTEIRA"].includes(cdt.toUpperCase())) {
      const typeMap: Record<
        string,
        "pix" | "boleto" | "deposito" | "carteira"
      > = {
        PIX: "pix",
        BOLETO: "boleto",
        DEP√ìSITO: "deposito",
        CARTEIRA: "carteira",
      };
      setPaymentType(typeMap[cdt.toUpperCase()]);
      setCustomPaymentCondition("");
    } else if (cdt) {
      setPaymentType("outro");
      setCustomPaymentCondition(cdt);
    } else {
      setPaymentType("boleto");
      setCustomPaymentCondition("");
    }
    setPaymentTerms(o.paymentTerms || "");
    setBillingRule(o.billingRule || "cadastro");

    setIsThirdPartyLaser(!!o.isThirdPartyLaser);
    setIsUrgent(!!o.isUrgent);
    setIsProgramacao(!!o.isProgramacao);
    setDiscountPercent(o.discountPercent !== undefined ? o.discountPercent : "");
    setHasRET(!!o.hasRET);
    setIsFormVisible(true);
  };

  const handleReplicate = (o: (typeof db.orders)[0]) => {
    setEditingId(null);
    setOrderCode(`${o.orderCode}-COPIA`);
    setItemId(o.itemId);
    const foundItem = db.items.find((i) => i.id === o.itemId);
    setOrderItemSearch(
      foundItem ? `${foundItem.code} - ${foundItem.name}` : "",
    );
    setCustomerName(o.customerName);
    setRepresentativeName(o.representativeName || "");
    setColor(o.color);
    setSize(o.size);
    setVariation(o.variation);
    setTotalQuantity(o.totalQuantity);
    setUnitPrice(o.unitPrice ?? "");
    setDeliveryDate(o.deliveryDate);

    // Payment stuff
    const cdt = o.paymentCondition || "";
    if (["PIX", "BOLETO", "DEP√ìSITO", "CARTEIRA"].includes(cdt.toUpperCase())) {
      const typeMap: Record<
        string,
        "pix" | "boleto" | "deposito" | "carteira"
      > = {
        PIX: "pix",
        BOLETO: "boleto",
        DEP√ìSITO: "deposito",
        CARTEIRA: "carteira",
      };
      setPaymentType(typeMap[cdt.toUpperCase()]);
      setCustomPaymentCondition("");
    } else if (cdt) {
      setPaymentType("outro");
      setCustomPaymentCondition(cdt);
    } else {
      setPaymentType("boleto");
      setCustomPaymentCondition("");
    }
    setPaymentTerms(o.paymentTerms || "");
    setBillingRule(o.billingRule || "cadastro");

    setIsThirdPartyLaser(!!o.isThirdPartyLaser);
    setIsUrgent(!!o.isUrgent);
    setIsProgramacao(!!o.isProgramacao);
    setIsFormVisible(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este pedido?")) {
      db.deleteOrder(id);
    }
  };

  const handleDeleteOrderGroup = async (code: string) => {
    if (currentUser.role === "LEITURA") return;
    const ordersInGroup = db.orders.filter((o) => o.orderCode === code);
    if (ordersInGroup.length === 0) return;

    const msg =
      ordersInGroup.length > 1
        ? `Tem certeza que deseja excluir o pedido #${code} por completo (contendo ${ordersInGroup.length} itens)?`
        : `Tem certeza que deseja excluir o pedido #${code}?`;

    if (confirm(msg)) {
      for (const o of ordersInGroup) {
        await db.deleteOrder(o.id);
      }
      if (selectedOrderCode === code) {
        setSelectedOrderCode(null);
      }
    }
  };

  const handleBulkDeleteSelectedOrders = async () => {
    if (currentUser.role === "LEITURA") return;
    if (selectedOrderCodesForPrint.length === 0) return;

    const ordersToDelete = db.orders.filter((o) =>
      selectedOrderCodesForPrint.includes(o.orderCode)
    );

    if (ordersToDelete.length === 0) return;

    const confirmMsg = `‚ö†Ô∏è ATEN√á√ÉO: Tem certeza que deseja excluir em massa os ${selectedOrderCodesForPrint.length} pedido(s) selecionados (${ordersToDelete.length} itens no total)? Esta a√ß√£o n√£o pode ser desfeita.`;

    if (confirm(confirmMsg)) {
      try {
        for (const o of ordersToDelete) {
          await db.deleteOrder(o.id);
        }
        if (selectedOrderCode && selectedOrderCodesForPrint.includes(selectedOrderCode)) {
          setSelectedOrderCode(null);
        }
        setSelectedOrderCodesForPrint([]);
        alert(`‚úÖ ${ordersToDelete.length} item(ns) de ${selectedOrderCodesForPrint.length} pedido(s) exclu√≠dos com sucesso!`);
      } catch (err: any) {
        alert("Erro ao excluir pedidos em massa: " + err.message);
      }
    }
  };

  const handleReplicateGroup = async (code: string) => {
    if (currentUser.role === "LEITURA") return;
    const ordersInGroup = db.orders.filter((o) => o.orderCode === code);
    if (ordersInGroup.length === 0) return;

    if (confirm(`Deseja replicar o pedido #${code} (com todos os seus ${ordersInGroup.length} itens)?`)) {
      const newCode = `${code}-COPIA`;
      for (const o of ordersInGroup) {
        const { id, ...rest } = o as any;
        delete rest.tempId;
        await db.addOrder({
          ...rest,
          orderCode: newCode,
        });
      }
      alert(`Pedido ${code} replicado com sucesso como ${newCode}!`);
      setSelectedOrderCode(newCode);
    }
  };

  const handleDeleteIndividualOrder = async (id: number, code: string) => {
    if (currentUser.role === "LEITURA") return;
    if (confirm("Tem certeza que deseja excluir este item do pedido?")) {
      await db.deleteOrder(id);
      const remainingForCode = db.orders.filter(
        (o) => o.orderCode === code && o.id !== id,
      );
      if (remainingForCode.length === 0) {
        setSelectedOrderCode(null);
      }
    }
  };

  const [visibleCount, setVisibleCount] = useState(30);

  const filteredOrders = React.useMemo(() => {
    return db.orders
      .filter((o) => {
        const term = normalizeString(debouncedSearchTerm);

        const customer = db.customers.find(
          (c) => c.name === o.customerName || c.tradeName === o.customerName,
        );
        const item = db.items.find((i) => i.id === o.itemId);

        const searchTarget = normalizeString(
          `${o.orderCode} ${o.customerName} ${customer?.tradeName || ""} ${item?.name || ""} ${item?.code || ""}`,
        );

        const matchesSearch = searchTarget.includes(term);
        if (!matchesSearch) return false;

        if (filterLaserOnly) {
          const itemNorm = normalizeString(item?.name || "");
          const isPeOrChapa =
            itemNorm.includes("pe") || itemNorm.includes("chapa") || itemNorm.includes("barrachata") || itemNorm.includes("barra chata");
          const isThirdParty = !!o.isThirdPartyLaser;
          if (!isPeOrChapa && !isThirdParty) return false;
        }

        // Filter by delivery date range
        if (deliveryDateStart || deliveryDateEnd) {
          if (!o.deliveryDate) return false;
          const itemDate = o.deliveryDate.split("T")[0];
          if (deliveryDateStart && itemDate < deliveryDateStart) return false;
          if (deliveryDateEnd && itemDate > deliveryDateEnd) return false;
        }

        // Filter by custom customer field
        if (filterCustomer) {
          const matchesCust = normalizeString(o.customerName).includes(normalizeString(filterCustomer)) || 
            normalizeString(customer?.tradeName || "").includes(normalizeString(filterCustomer));
          if (!matchesCust) return false;
        }

        // Filter by item status
        if (filterStatus && o.status !== filterStatus) {
          return false;
        }

        // Filter by urgency
        if (filterUrgentOnly && !o.isUrgent) {
          return false;
        }

        // Filter based on activeSubTab
        if (activeSubTab === "APROVACAO") {
          return o.status === "AGUARDANDO_APROVACAO";
        } else if (activeSubTab === "FATURADOS") {
          return o.status === "FATURADO";
        } else {
          // Abertos tabs: everything else that's active/pending
          return o.status !== "FATURADO" && o.status !== "AGUARDANDO_APROVACAO";
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [
    db.orders,
    db.customers,
    db.items,
    debouncedSearchTerm,
    filterLaserOnly,
    deliveryDateStart,
    deliveryDateEnd,
    filterCustomer,
    filterStatus,
    filterUrgentOnly,
    activeSubTab,
  ]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const listContainerRef = React.useRef<HTMLDivElement>(null);
  const [listOffsetTop, setListOffsetTop] = useState(0);

  // Re-measure list coordinates when orders change
  useEffect(() => {
    if (listContainerRef.current) {
      setListOffsetTop(listContainerRef.current.offsetTop);
    }
  }, [filteredOrders]);

  const { getIndices } = useVirtualScroll({
    itemCount: filteredOrders.length,
    itemHeight: 160, // card height 152px + 8px gap
    containerRef: scrollContainerRef,
    buffer: 5,
  });

  const { startIndex, endIndex } = getIndices(listOffsetTop);

  // Reset pagination when tab or search changes
  useEffect(() => {
    setVisibleCount(30);
  }, [activeSubTab, debouncedSearchTerm]);

  const handleExportPdfGrouped = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Relat√≥rio de Pedidos Agrupados", 14, 20);

    // Filter metadata
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    
    const filterInfo: string[] = [];
    if (debouncedSearchTerm) filterInfo.push(`Pesquisa: "${debouncedSearchTerm}"`);
    if (deliveryDateStart || deliveryDateEnd) {
      const startFmt = deliveryDateStart ? deliveryDateStart.split("-").reverse().join("/") : "in√≠cio";
      const endFmt = deliveryDateEnd ? deliveryDateEnd.split("-").reverse().join("/") : "fim";
      filterInfo.push(`Entrega: ${startFmt} a ${endFmt}`);
    }
    
    const filterText = filterInfo.length > 0 ? `Filtros: ${filterInfo.join(" | ")}` : "Sem filtros ativos (Todos)";
    doc.text(filterText, 14, 26);

    const tableColumn = [
      "Pedido",
      "Emiss√£o",
      "Entrega Prev.",
      "Cliente",
      "Produto(s)",
      "Qtd",
      "Status",
    ];
    const tableRows: any[] = [];

    groupedOrders.forEach(([code, orders]) => {
      const firstOrder = orders[0];
      const deliveryDateStr = firstOrder.deliveryDate
        ? firstOrder.deliveryDate.substring(0, 10).split("-").reverse().join("/")
        : "-";
      const dateStr = firstOrder.createdAt ? new Date(firstOrder.createdAt).toLocaleDateString('pt-BR') : "-";
      
      orders.forEach(o => {
        const item = db.items.find((i) => i.id === o.itemId);
        let qtdStr = `${o.totalQuantity}`;
        let statusStr = o.status || "PENDENTE";
        
        if (o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity)) {
          qtdStr = `${o.invoicedQuantity || 0} / ${o.totalQuantity}`;
          statusStr = "FATURADO PARCIAL";
        } else if (o.status === "FATURADO" || (o.invoicedQuantity || 0) >= o.totalQuantity) {
          statusStr = "FATURADO";
        }

        tableRows.push([
          o.orderCode || `#${o.id}`,
          dateStr,
          deliveryDateStr,
          o.customerName,
          `${item?.name || "Desconhecido"} (${o.size || "-"} / ${o.color || "-"})`,
          qtdStr,
          statusStr,
        ]);
      });
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    });
    doc.save(`pedidos_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Relat√≥rio de Pedidos", 14, 20);

    // Filter metadata
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    
    const filterInfo: string[] = [];
    if (debouncedSearchTerm) filterInfo.push(`Pesquisa: "${debouncedSearchTerm}"`);
    if (deliveryDateStart || deliveryDateEnd) {
      const startFmt = deliveryDateStart ? deliveryDateStart.split("-").reverse().join("/") : "in√≠cio";
      const endFmt = deliveryDateEnd ? deliveryDateEnd.split("-").reverse().join("/") : "fim";
      filterInfo.push(`Entrega: ${startFmt} a ${endFmt}`);
    }
    if (filterCustomer) filterInfo.push(`Cliente: "${filterCustomer}"`);
    if (filterStatus) filterInfo.push(`Status: ${filterStatus}`);
    if (filterUrgentOnly) filterInfo.push("Apenas Urgentes");
    if (filterLaserOnly) filterInfo.push("Apenas Laser");
    
    const filterText = filterInfo.length > 0 ? `Filtros: ${filterInfo.join(" | ")}` : "Sem filtros ativos (Todos)";
    doc.text(filterText, 14, 26);

    const tableColumn = [
      "Pedido",
      "Cliente",
      "Produto",
      "Tamanho/Cor",
      "Entrega",
      "Status",
      "Qtd",
    ];
    const tableRows: any[] = [];

    filteredOrders.forEach((o) => {
      const item = db.items.find((i) => i.id === o.itemId);
      const deliveryDateStr = o.deliveryDate
        ? o.deliveryDate.substring(0, 10).split("-").reverse().join("/")
        : "Sem prazo";
      const orderInfo = [
        o.orderCode,
        o.customerName,
        item?.name || "Desconhecido",
        `${o.size || "-"} / ${o.color || "-"}`,
        deliveryDateStr,
        o.status || "PENDENTE",
        `${o.totalQuantity}`,
      ];
      tableRows.push(orderInfo);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    });
    doc.save(`pedidos_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm w-full mx-auto border overflow-hidden p-4">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full pr-1 px-0.5 scrollbar-thin">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Pedidos {currentUser.role === "PCP" && "(PCP)"}
          </h2>
        </div>

          {(currentUser.role === "PCP" ||
            currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA") && (
            <div className={editingId ? "fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden" : "bg-white p-3 rounded-xl shadow-xs border flex flex-col gap-2.5 mb-4 shrink-0 transition-all duration-300"}>
              <div className={editingId ? "bg-white p-5 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200" : "contents"}>
                <div className="flex justify-between items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div
                    className="flex-1 flex items-center cursor-pointer pointer-events-auto select-none"
                    onClick={() => {
                      if (!editingId) setIsFormVisible(!isFormVisible);
                    }}
                  >
                    <h3 className={`font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1 ${editingId ? 'text-lg' : 'text-xs sm:text-sm'}`}>
                      üìë{" "}
                      {editingId ? "Editando Pedido" : "Novo Pedido / Importar"}
                    </h3>
                    {!editingId && (
                      <span className="text-slate-400 hover:text-indigo-605 transition ml-1">
                        {isFormVisible ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </span>
                    )}
                  </div>

                  {editingId ? (
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition ml-auto flex-shrink-0"
                    >
                      <X size={24} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBillingFiles([]);
                          setBillingProgress(0);
                          setBillingResult(null);
                          setBilledItems([]);
                          setIsBillingModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded shadow-xs transition text-[10px] md:text-xs flex items-center gap-1 leading-none"
                      >
                        <FileText size={12} /> Faturamento PDF
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExcelModalOpen(true);
                        }}
                        className="bg-[#107c41] hover:bg-[#185c37] text-white font-bold py-1 px-2.5 rounded shadow-xs transition text-[10px] md:text-xs flex items-center gap-1 leading-none"
                      >
                        Importar do Excel
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCleanupResult(null);
                          setIsDeduplicateModalOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2.5 rounded shadow-xs transition text-[10px] md:text-xs flex items-center gap-1 leading-none"
                      >
                        üßπ Limpar Duplicados
                      </button>
                    </div>
                  )}
                </div>

              {isBillingModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
                    <div className="flex justify-between items-center bg-white px-6 py-4 border-b border-slate-200 shadow-sm relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 shadow-inner block">
                          <FileText size={22} className="drop-shadow-sm" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                            Importar Faturamento via IA
                          </h2>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Extra√ß√£o autom√°tica de itens e pedidos faturados.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsBillingModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                      {billingFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl p-12 w-full max-w-lg flex flex-col items-center transition hover:bg-indigo-100/50 group hover:border-indigo-300">
                            <div className="bg-white p-4 rounded-full shadow-sm text-indigo-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                              <UploadCloud size={48} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">
                              Arraste um PDF ou selecione
                            </h3>
                            <p className="text-sm text-slate-500 mb-6 max-w-sm">
                              Suporta PDFs m√∫ltiplos (notas fiscais ou espelhos
                              de faturamento)
                            </p>

                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              ref={billingInputRef}
                              multiple
                              onChange={(e) =>
                                setBillingFiles(
                                  e.target.files
                                    ? Array.from(e.target.files)
                                    : [],
                                )
                              }
                            />

                            <button
                              onClick={() => billingInputRef.current?.click()}
                              className="bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-slate-900 transition text-sm shadow-md"
                            >
                              Selecionar Arquivos
                            </button>
                          </div>
                        </div>
                      ) : billedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                          <div className="flex flex-col gap-2 w-full max-w-sm">
                            {billingFiles.map((f, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shadow-xs w-full"
                              >
                                <span className="text-xs truncate">
                                  {f.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                  {(f.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => setBillingFiles([])}
                            className="text-xs text-red-500 font-bold hover:underline mb-8 mt-2"
                          >
                            Limpar Sele√ß√£o
                          </button>

                          {billingProgress === 0 && (
                            <button
                              onClick={handleExtractBilling}
                              className="mt-4 bg-indigo-600 text-white font-bold py-2.5 px-8 rounded-lg hover:bg-indigo-700 transition text-sm shadow-md flex items-center gap-2"
                            >
                              <FileText size={16} /> Processar Faturamento com
                              IA
                            </button>
                          )}

                          {billingResult && (
                            <div className="mt-4 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-lg w-full max-w-md text-center border-dashed">
                              {billingResult}
                            </div>
                          )}

                          {billingProgress > 0 && (
                            <div className="mt-5 w-full max-w-md bg-white border border-indigo-100 p-4 rounded-xl shadow-md">
                              <div className="flex justify-between items-center text-xs font-bold text-indigo-600 mb-1.5 uppercase tracking-wider">
                                <span>Mapeando Faturamento</span>
                                <span>{billingProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
                                <div
                                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-300 animate-pulse"
                                  style={{ width: billingProgress + "%" }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <h3 className="font-bold text-slate-800 mb-4">
                            {billedItems.length} itens faturados encontrados:
                          </h3>
                          <div className="space-y-2 max-h-[60vh] overflow-auto">
                            {billedItems.map((item, i) => (
                              <div
                                key={i}
                                className="flex flex-col bg-white border p-3 rounded-lg text-sm"
                              >
                                <div className="font-bold">
                                  {item.partName}{" "}
                                  <span className="text-slate-500 font-medium text-xs">
                                    x{item.quantity}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  Pedido:{" "}
                                  <span className="font-bold text-slate-700">
                                    {item.orderCode}
                                  </span>{" "}
                                  | Cliente: {item.customerName}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-6 flex justify-end gap-3">
                            <button
                              onClick={() => {
                                setBillingFiles([]);
                                setBilledItems([]);
                                setBillingProgress(0);
                                setBillingResult(null);
                              }}
                              className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-50 font-bold"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={confirmarFaturamento}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-md font-bold hover:bg-emerald-700 transition"
                            >
                              Confirmar Faturamento
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isPdfModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-2 sm:p-4 animate-fade-in backdrop-blur-xs">
                  <div
                    id="import-orders-pdf-modal"
                    className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden border border-slate-100"
                  >
                    {/* Cabe√ßalho Fixo */}
                    <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-50 p-2 rounded-lg text-red-600">
                          <FileDown size={22} />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight">
                            Importar Pedidos via PDF
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            Extraia e revise m√∫ltiplos pedidos do PDF usando
                            Intelig√™ncia Artificial
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsPdfModalOpen(false);
                          setPdfExtractedOrders([]);
                          setPdfFiles([]);
                          setPdfImportResult(null);
                          setPdfImportProgress(0);
                          setEditingOrderIdx(null);
                        }}
                        className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition"
                        title="Fechar"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* √Årea Interna de Conte√∫do (Rol√°vel) */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">
                      {!pdfExtractedOrders.length ? (
                        /* Tela de Upload Inicial */
                        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white border-2 border-dashed border-slate-200 rounded-xl p-6 sm:p-12 transition hover:border-indigo-400">
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            ref={pdfInputRef}
                            onChange={(e) =>
                              setPdfFiles(
                                e.target.files
                                  ? Array.from(e.target.files)
                                  : [],
                              )
                            }
                            multiple
                          />
                          <div className="bg-red-50 p-4 rounded-full text-red-500 mb-4 animate-bounce">
                            <FileDown size={44} />
                          </div>
                          <h4 className="text-md font-bold text-slate-800 text-center mb-1">
                            Selecione o documento de Pedidos
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-500 text-center max-w-md mb-6 leading-relaxed">
                            Fa√ßa upload do arquivo PDF contendo um ou mais
                            pedidos de venda. Nossa IA far√° a leitura, extrair√°
                            todos os dados de cabe√ßalho, itens e efetuar√° o
                            cruzamento inteligente com o cadastro.
                          </p>

                          {pdfFiles.length > 0 ? (
                            <div className="flex flex-col gap-2 w-full max-w-sm">
                              {pdfFiles.map((f, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shadow-xs w-full"
                                >
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 truncate">
                                      <FileText
                                        size={16}
                                        className="text-red-500 shrink-0"
                                      />
                                      {f.name}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {(f.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                </div>
                              ))}
                              <button
                                onClick={() => setPdfFiles([])}
                                className="text-xs text-red-500 font-bold hover:underline self-end"
                              >
                                Limpar Sele√ß√£o
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => pdfInputRef.current?.click()}
                              className="bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-slate-900 transition text-sm shadow-md"
                            >
                              Selecionar Arquivo PDF
                            </button>
                          )}

                          {pdfFiles.length > 0 && !pdfImportResult && (
                            <button
                              onClick={handleExtractPdf}
                              className="mt-4 bg-indigo-600 text-white font-bold py-2.5 px-8 rounded-lg hover:bg-indigo-700 transition text-sm shadow-md flex items-center gap-2"
                            >
                              <FileText size={16} /> Processar com IA
                            </button>
                          )}

                          {pdfImportResult && (
                            <div className="mt-4 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-lg w-full max-w-md text-center border-dashed">
                              {pdfImportResult}
                            </div>
                          )}

                          {pdfImportProgress > 0 &&
                            !pdfExtractedOrders.length && (
                              <div className="mt-5 w-full max-w-md bg-white border border-indigo-100 p-4 rounded-xl shadow-md">
                                <div className="flex justify-between items-center text-xs font-bold text-indigo-600 mb-1.5 uppercase tracking-wider">
                                  <span>Processando e Mapeando Documento</span>
                                  <span>{pdfImportProgress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
                                  <div
                                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-300 animate-pulse"
                                    style={{ width: `${pdfImportProgress}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                        </div>
                      ) : (
                        /* Tela de Pr√©-Visualiza√ß√£o / Confer√™ncia dos dados extra√≠dos */
                        <div className="space-y-6">
                          {/* 1. RESUMO GERAL NO TOPO */}
                          <div
                            id="import-orders-summary"
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                          >
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <Activity size={14} className="text-indigo-500" />
                              Vis√£o Geral de Status e Valida√ß√£o dos Pedidos
                            </h4>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                  Total PDF
                                </span>
                                <span className="text-xl font-black text-slate-800 mt-1">
                                  {pdfExtractedOrders.length}{" "}
                                  {pdfExtractedOrders.length === 1
                                    ? "Pedido"
                                    : "Pedidos"}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  {pdfExtractedOrders.reduce(
                                    (acc, o) => acc + (o.items?.length || 0),
                                    0,
                                  )}{" "}
                                  SKU itens
                                </span>
                              </div>

                              <div className="bg-emerald-50/75 border border-emerald-100 rounded-xl p-3 flex flex-col">
                                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                                  Aptos
                                </span>
                                <span className="text-xl font-black text-emerald-800 mt-1 block">
                                  {
                                    pdfExtractedOrders.filter(
                                      (o) => o.statusValidation === "APTO",
                                    ).length
                                  }
                                </span>
                                <span className="text-[10px] text-emerald-600 mt-0.5 font-bold flex items-center gap-0.5">
                                  <CheckCircle2 size={11} /> Pronto p/ PCP
                                </span>
                              </div>

                              <div className="bg-amber-50/75 border border-amber-150 rounded-xl p-3 flex flex-col border-dashed animate-pulse">
                                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                                  Em Alerta
                                </span>
                                <span className="text-xl font-black text-amber-800 mt-1 block">
                                  {
                                    pdfExtractedOrders.filter(
                                      (o) => o.statusValidation === "ALERTA",
                                    ).length
                                  }
                                </span>
                                <span className="text-[10px] text-amber-600 mt-0.5 font-bold flex items-center gap-0.5">
                                  <AlertTriangle size={11} /> Revisar Parcial
                                </span>
                              </div>

                              <div className="bg-rose-50/75 border border-rose-100 rounded-xl p-3 flex flex-col">
                                <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">
                                  Bloqueados
                                </span>
                                <span className="text-xl font-black text-rose-800 mt-1 block">
                                  {
                                    pdfExtractedOrders.filter(
                                      (o) => o.statusValidation === "BLOQUEADO",
                                    ).length
                                  }
                                </span>
                                <span className="text-[10px] text-rose-600 mt-0.5 font-bold flex items-center gap-0.5">
                                  <AlertCircle size={11} /> J√° Faturados
                                </span>
                              </div>

                              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex flex-col">
                                <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                                  Revis√£o Pendente
                                </span>
                                <span className="text-xl font-black text-indigo-800 mt-1 block">
                                  {
                                    pdfExtractedOrders.filter(
                                      (o) => o.statusValidation === "REVISAO",
                                    ).length
                                  }
                                </span>
                                <span className="text-[10px] text-indigo-600 mt-0.5 font-bold flex items-center gap-0.5">
                                  <HelpCircle size={11} /> Status indefinido
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-600 flex items-center gap-2">
                              <span className="shrink-0 text-amber-500">
                                <AlertTriangle size={15} />
                              </span>
                              <p>
                                <strong>Aten√ß√£o:</strong> Revise cada pedido no
                                acorde√£o abaixo. Pedidos com sinalizador de
                                representante ausente ou cliente n√£o cadastrado
                                ser√£o importados, por√©m devem ser ajustados ou
                                ser√£o criados em modo tempor√°rio.
                              </p>
                            </div>
                          </div>

                          {/* 2. PEDIDO EM ACCORDION / CARD EXPANS√çVEL */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                              Lista de Pedidos ({pdfExtractedOrders.length})
                            </h4>

                            {pdfExtractedOrders.map((order, idx) => {
                              const orderKey = order.tempId || idx;
                              const isExpanded = expandedOrderIdx === orderKey;
                              const isEditing = editingOrderIdx === orderKey;
                              const hasIssues =
                                !order.wasCustomerMatched ||
                                !order.wasRepMatched;
                              const hasFinanceAccess =
                                currentUser &&
                                (currentUser.role === "PCP" ||
                                  currentUser.role === "GERENCIA" ||
                                  currentUser.role === "ADMIN");

                              return (
                                <div
                                  key={order.tempId || idx}
                                  className={`bg-white border rounded-xl overflow-hidden shadow-xs transition duration-200 ${
                                    isExpanded
                                      ? "border-indigo-400 ring-2 ring-indigo-50/50"
                                      : "border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  {/* Cabe√ßalho do Card (Acorde√£o) */}
                                  <div
                                    onClick={() =>
                                      setExpandedOrderIdx(
                                        isExpanded ? null : orderKey,
                                      )
                                    }
                                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer select-none gap-2 flex-wrap sm:flex-nowrap hover:bg-slate-50/50 transition"
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className="text-slate-400 shrink-0">
                                        {isExpanded ? (
                                          <ChevronUp size={20} />
                                        ) : (
                                          <ChevronDown size={20} />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-extrabold text-slate-900 text-sm">
                                            Pedido:{" "}
                                            {order.orderCode ||
                                              `Or√ßamento #${idx + 1}`}
                                          </span>

                                          {/* Status do Pedido no PDF - Com super destaque conforme solicitado */}
                                          <span
                                            className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1.5 tracking-tight shadow-sm shrink-0 ${
                                              order.statusValidation ===
                                              "BLOQUEADO"
                                                ? "bg-red-100 text-red-900 border-red-300 animate-pulse"
                                                : order.statusValidation ===
                                                    "ALERTA"
                                                  ? "bg-amber-100 text-amber-900 border-amber-300 border-dashed"
                                                  : order.statusValidation ===
                                                      "APTO"
                                                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                                    : "bg-indigo-100 text-indigo-900 border-indigo-300"
                                            }`}
                                            title="Status extra√≠do do PDF"
                                          >
                                            <span
                                              className={`w-2 h-2 rounded-full ${
                                                order.statusValidation ===
                                                "BLOQUEADO"
                                                  ? "bg-red-600"
                                                  : order.statusValidation ===
                                                      "ALERTA"
                                                    ? "bg-amber-500"
                                                    : order.statusValidation ===
                                                        "APTO"
                                                      ? "bg-emerald-500"
                                                      : "bg-indigo-500"
                                              }`}
                                            />
                                            PDF:{" "}
                                            {order.statusOriginalPdf ||
                                              "STATUS AUSENTE"}
                                          </span>

                                          {/* Alertas R√°pidos de Valida√ß√£o */}
                                          <div className="flex items-center gap-1">
                                            {/* Badge de Cliente */}
                                            {order.wasCustomerMatched ? (
                                              <span
                                                className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                                title="Cliente reconhecido"
                                              >
                                                <Check size={9} /> Cliente OK
                                              </span>
                                            ) : (
                                              <span
                                                className="bg-red-50 text-red-700 border border-red-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse"
                                                title="Cliente N√ÉO cadastrado"
                                              >
                                                <AlertTriangle size={9} /> Novo
                                                Cliente
                                              </span>
                                            )}

                                            {/* Badge de Representante */}
                                            {order.wasRepMatched ? (
                                              <span
                                                className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                                title="Representante reconhecido"
                                              >
                                                <Check size={9} /> Rep. OK
                                              </span>
                                            ) : (
                                              <span
                                                className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                                title="Representante n√£o encontrado"
                                              >
                                                <AlertTriangle size={9} /> Sem
                                                Rep.
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="text-xs text-slate-500 font-medium truncate mt-1 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                                          <span className="text-slate-800 font-semibold">
                                            {order.customerName}
                                          </span>
                                          <span className="text-slate-300">
                                            |
                                          </span>
                                          <span className="truncate">
                                            Rep:{" "}
                                            {order.representativeName ||
                                              "Mapeamento pendente"}
                                          </span>
                                          <span className="text-slate-300">
                                            |
                                          </span>
                                          <span
                                            className={`font-bold flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-slate-100/65 ${
                                              order.statusValidation ===
                                              "BLOQUEADO"
                                                ? "text-red-700 font-extrabold"
                                                : order.statusValidation ===
                                                    "ALERTA"
                                                  ? "text-amber-700 font-extrabold"
                                                  : order.statusValidation ===
                                                      "APTO"
                                                    ? "text-emerald-700 font-bold"
                                                    : "text-indigo-700 font-bold"
                                            }`}
                                          >
                                            {order.statusValidation ===
                                            "BLOQUEADO"
                                              ? "üõë "
                                              : order.statusValidation ===
                                                  "ALERTA"
                                                ? "‚ö†Ô∏è "
                                                : "‚úÖ "}
                                            {order.validationMessage}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Direita: Datas e Resumo financeiro r√°pido */}
                                    <div className="flex items-center gap-4 shrink-0 mt-2 sm:mt-0 text-right">
                                      <div className="hidden md:flex flex-col text-right">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                                          Entrega
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-705">
                                          {order.deliveryDate || "-"}
                                        </span>
                                      </div>

                                      {hasFinanceAccess &&
                                        order.totalValue !== undefined && (
                                          <div className="flex flex-col text-right pr-2">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                                              Valor Total
                                            </span>
                                            <span className="text-sm font-black text-emerald-700 font-mono">
                                              R${" "}
                                              {Number(
                                                order.totalValue,
                                              ).toLocaleString("pt-BR", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })}
                                            </span>
                                          </div>
                                        )}

                                      <div className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition">
                                        <FileText size={16} />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Corpo Expandido */}
                                  {isExpanded && (
                                    <div className="border-t border-slate-150 bg-slate-50/30 p-4 sm:p-5 space-y-5 animate-slide-down">
                                      {order.status === "FATURADO" && (
                                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex items-start gap-3.5 shadow-xs animate-in fade-in duration-250">
                                          <div className="text-xl shrink-0">
                                            ‚ú®
                                          </div>
                                          <div className="space-y-1">
                                            <h4 className="font-black text-sm uppercase tracking-wide text-emerald-950 flex items-center gap-2">
                                              Pedido Faturado e Conclu√≠do
                                            </h4>
                                            <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
                                              Este pedido encontra-se
                                              oficialmente faturado e
                                              consolidado no sistema.
                                              Atribui√ß√µes de pe√ßas cortadas de
                                              laser feitas agora abatem
                                              imediatamente do saldo f√≠sico
                                              atual em estoque.
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Barra Superior para Ativar/Desativar Edi√ß√£o */}
                                      <div className="flex justify-between items-center bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50">
                                        <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 align-middle">
                                          <Settings
                                            size={14}
                                            className="text-indigo-600"
                                          />{" "}
                                          Revis√£o e Ajuste de Informa√ß√µes
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isEditing) {
                                                setEditingOrderIdx(null);
                                              } else {
                                                setEditingOrderIdx(orderKey);
                                                setExpandedOrderIdx(orderKey);
                                              }
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer select-none ${
                                              isEditing
                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                            }`}
                                          >
                                            {isEditing ? (
                                              <>
                                                <Check size={14} /> Concluir
                                                Edi√ß√£o
                                              </>
                                            ) : (
                                              <>
                                                <Pencil size={14} /> Editar este
                                                Pedido
                                              </>
                                            )}
                                          </button>

                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (
                                                confirm(
                                                  `Excluir o pedido ${order.orderCode || ""} (${order.customerName || "Cliente"}) da lista de importa√ß√£o?`,
                                                )
                                              ) {
                                                setPdfExtractedOrders((prev) =>
                                                  prev.filter(
                                                    (o) =>
                                                      (o.tempId || "") !==
                                                      (order.tempId || ""),
                                                  ),
                                                );
                                                setEditingOrderIdx(null);
                                                setExpandedOrderIdx(null);
                                              }
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-xs select-none"
                                          >
                                            <Trash2 size={14} /> Excluir Pedido
                                          </button>
                                        </div>
                                      </div>
                                      {/* Quadros de valida√ß√£o (Visual Alert Boxes) */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                        {/* Valida√ß√£o de Cliente */}
                                        <div
                                          className={`p-3 rounded-lg border text-xs bg-white ${
                                            order.wasCustomerMatched
                                              ? "bg-emerald-50/10 border-emerald-100/80 text-slate-700"
                                              : "bg-red-50/10 border-red-105 text-slate-700"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 font-bold mb-1.5">
                                            {order.wasCustomerMatched ? (
                                              <span className="text-emerald-600">
                                                <CheckCircle2 size={16} />
                                              </span>
                                            ) : (
                                              <span className="text-red-500 animate-pulse">
                                                <AlertTriangle size={16} />
                                              </span>
                                            )}
                                            <span className="text-slate-850 uppercase tracking-wider text-[10px]">
                                              Verifica√ß√£o do Cliente
                                            </span>
                                          </div>
                                          <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                                            <p className="flex justify-between">
                                              <span className="text-slate-400 font-medium">
                                                Extra√≠do no PDF:
                                              </span>
                                              <span className="font-bold text-slate-700">
                                                {order.originalCustomerName ||
                                                  "N√£o Informado"}
                                              </span>
                                            </p>
                                            <p className="flex justify-between">
                                              <span className="text-slate-400 font-medium">
                                                C√≥digo Extra√≠do:
                                              </span>
                                              <span className="font-mono font-bold text-slate-705">
                                                {order.customerCode ||
                                                  "N√£o Informado"}
                                              </span>
                                            </p>
                                            <p className="flex justify-between border-t border-dashed border-slate-200 pt-1 mt-1 text-xs">
                                              <span className="text-slate-400 font-medium">
                                                Cadastro Vinculado:
                                              </span>
                                              <span
                                                className={`font-black ${order.wasCustomerMatched ? "text-emerald-700" : "text-red-650"}`}
                                              >
                                                {order.wasCustomerMatched
                                                  ? `${order.customerName} (ID: ${order.matchedCustomer?.id})`
                                                  : "Nenhum cadastro correspondente encontrado"}
                                              </span>
                                            </p>
                                          </div>
                                          {!order.wasCustomerMatched && (
                                            <p className="text-[10px] text-red-500 mt-1.5 italic font-medium">
                                              ‚ö†Ô∏è O pedido ser√° importado com a
                                              raz√£o social extra√≠da brutamente
                                              do PDF. √â recomend√°vel cadastr√°-lo
                                              previamente no m√≥dulo de clientes.
                                            </p>
                                          )}
                                        </div>

                                        {/* Valida√ß√£o de Representante */}
                                        <div
                                          className={`p-3 rounded-lg border text-xs bg-white ${
                                            order.wasRepMatched
                                              ? "bg-emerald-50/10 border-emerald-100/80 text-slate-700"
                                              : "bg-amber-50/10 border-amber-105 text-slate-700"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 font-bold mb-1.5">
                                            {order.wasRepMatched ? (
                                              <span className="text-emerald-600">
                                                <CheckCircle2 size={16} />
                                              </span>
                                            ) : (
                                              <span className="text-amber-500 animate-pulse">
                                                <AlertTriangle size={16} />
                                              </span>
                                            )}
                                            <span className="text-slate-850 uppercase tracking-wider text-[10px]">
                                              V√≠nculo do Consultor/Representante
                                            </span>
                                          </div>
                                          <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                                            <p className="flex justify-between">
                                              <span className="text-slate-400 font-medium font-sans">
                                                "Consultor" no PDF:
                                              </span>
                                              <span className="font-bold text-slate-705">
                                                {order.representativeName ||
                                                  "Sem Representante"}
                                              </span>
                                            </p>
                                            <p className="flex justify-between border-t border-dashed border-slate-200 pt-1 mt-1">
                                              <span className="text-slate-400 font-medium">
                                                Usu√°rio Vinculado:
                                              </span>
                                              <span
                                                className={`font-black ${order.wasRepMatched ? "text-emerald-700" : "text-amber-600"}`}
                                              >
                                                {order.wasRepMatched
                                                  ? `${order.representativeName} (ID: ${order.representativeId})`
                                                  : "Nenhum representante correspondente"}
                                              </span>
                                            </p>
                                          </div>
                                          {!order.wasRepMatched && (
                                            <p className="text-[10px] text-amber-600 mt-1.5 italic font-medium">
                                              ‚ö†Ô∏è Sem representante vinculado
                                              automaticamente. Ele n√£o poder√°
                                              ver o pedido em seu painel
                                              individual at√© ser corrigido no
                                              PCP.
                                            </p>
                                          )}
                                        </div>

                                        {/* Valida√ß√£o de Status do Pedido vindo do PDF */}
                                        <div
                                          className={`p-3 rounded-lg border text-xs bg-white ${
                                            order.statusValidation ===
                                            "BLOQUEADO"
                                              ? "bg-red-50/15 border-red-200 text-slate-700 animate-pulse"
                                              : order.statusValidation ===
                                                  "ALERTA"
                                                ? "bg-amber-50/15 border-amber-200 text-slate-700"
                                                : order.statusValidation ===
                                                    "APTO"
                                                  ? "bg-emerald-50/15 border-emerald-200 text-slate-700"
                                                  : "bg-indigo-50/15 border-indigo-200 text-slate-700"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 font-bold mb-1.5">
                                            {order.statusValidation ===
                                            "BLOQUEADO" ? (
                                              <span className="text-red-600">
                                                <AlertCircle size={16} />
                                              </span>
                                            ) : order.statusValidation ===
                                              "ALERTA" ? (
                                              <span className="text-amber-500">
                                                <AlertTriangle size={16} />
                                              </span>
                                            ) : order.statusValidation ===
                                              "APTO" ? (
                                              <span className="text-emerald-600">
                                                <CheckCircle2 size={16} />
                                              </span>
                                            ) : (
                                              <span className="text-indigo-600">
                                                <HelpCircle size={16} />
                                              </span>
                                            )}
                                            <span className="text-slate-850 uppercase tracking-wider text-[10px]">
                                              Valida√ß√£o do Status comercial
                                            </span>
                                          </div>
                                          <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                                            <p className="flex justify-between">
                                              <span className="text-slate-400 font-medium">
                                                Status no PDF:
                                              </span>
                                              <span className="font-extrabold text-slate-700 uppercase font-mono">
                                                {order.statusOriginalPdf ||
                                                  "N√£o Informado"}
                                              </span>
                                            </p>
                                            <p className="flex justify-between border-t border-dashed border-slate-200 pt-1 mt-1 text-[11px]">
                                              <span className="text-slate-400 font-medium">
                                                Regra Aplicada:
                                              </span>
                                              <span
                                                className={`font-black ${
                                                  order.statusValidation ===
                                                  "BLOQUEADO"
                                                    ? "text-red-700 font-black"
                                                    : order.statusValidation ===
                                                        "ALERTA"
                                                      ? "text-amber-700 font-black"
                                                      : order.statusValidation ===
                                                          "APTO"
                                                        ? "text-emerald-700 font-black"
                                                        : "text-indigo-700 font-black"
                                                }`}
                                              >
                                                {order.statusValidation ===
                                                "BLOQUEADO"
                                                  ? "BLOQUEADO"
                                                  : order.statusValidation ===
                                                      "ALERTA"
                                                    ? "ALERTA DE REVIS√ÉO"
                                                    : order.statusValidation ===
                                                        "APTO"
                                                      ? "LIBERADO"
                                                      : "REVIS√ÉO MANUAL"}
                                              </span>
                                            </p>
                                            <p className="flex justify-between text-xs pt-1">
                                              <span className="text-slate-400 font-medium">
                                                Status PCP Vinculado:
                                              </span>
                                              <span className="text-indigo-900 font-mono font-bold bg-indigo-50 px-1.5 rounded">
                                                {isEditing ? (
                                                  <select
                                                    value={
                                                      order.status ||
                                                      "AGUARDANDO_APROVACAO"
                                                    }
                                                    onChange={(e) =>
                                                      handleUpdateExtractedOrder(
                                                        idx,
                                                        "status",
                                                        e.target.value,
                                                      )
                                                    }
                                                    onClick={(e) =>
                                                      e.stopPropagation()
                                                    }
                                                    className="bg-white border border-slate-300 text-slate-800 text-xs font-bold px-1.5 py-0.5 rounded focus:ring-1 focus:ring-indigo-500"
                                                  >
                                                    <option value="AGUARDANDO_APROVACAO">
                                                      AGUARDANDO_APROVACAO
                                                    </option>
                                                    <option value="PENDENTE">
                                                      PENDENTE
                                                    </option>
                                                    <option value="TEM_ESTOQUE">
                                                      TEM_ESTOQUE
                                                    </option>
                                                    <option value="EM_PRODUCAO">
                                                      EM_PRODUCAO
                                                    </option>
                                                    <option value="PRODUZIDO">
                                                      PRODUZIDO
                                                    </option>
                                                    <option value="EM_CORTE">
                                                      EM_CORTE
                                                    </option>
                                                    <option value="CORTADO">
                                                      CORTADO
                                                    </option>
                                                    <option value="EM_PINTURA">
                                                      EM_PINTURA
                                                    </option>
                                                    <option value="PINTADO">
                                                      PINTADO
                                                    </option>
                                                    <option value="EMBALANDO">
                                                      EMBALANDO
                                                    </option>
                                                    <option value="EMBALADO">
                                                      EMBALADO
                                                    </option>
                                                    <option value="PLANEJADO">
                                                      PLANEJADO
                                                    </option>
                                                    <option value="FATURADO_PARCIAL">
                                                      FATURADO_PARCIAL
                                                    </option>
                                                    <option value="FATURADO">
                                                      FATURADO
                                                    </option>
                                                  </select>
                                                ) : (
                                                  order.status
                                                )}
                                              </span>
                                            </p>
                                          </div>
                                          <p
                                            className={`text-[10px] mt-1.5 italic font-medium leading-normal p-1 px-1.5 rounded ${
                                              order.statusValidation ===
                                              "BLOQUEADO"
                                                ? "text-red-700 bg-red-50 border border-red-100 font-bold"
                                                : order.statusValidation ===
                                                    "ALERTA"
                                                  ? "text-amber-700 bg-amber-50 border border-amber-100 font-bold"
                                                  : order.statusValidation ===
                                                      "APTO"
                                                    ? "text-emerald-700 bg-emerald-50"
                                                    : "text-indigo-700 bg-indigo-50"
                                            }`}
                                          >
                                            {order.validationMessage}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Dados de Cabe√ßalho Avan√ßados */}
                                      <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                          Informa√ß√µes do Pedido
                                        </h5>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                          <div>
                                            <span className="block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5">
                                              N√∫mero Pedido
                                            </span>
                                            <span className="text-slate-800 font-extrabold text-sm">
                                              {isEditing ? (
                                                <input
                                                  type="text"
                                                  value={order.orderCode || ""}
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "orderCode",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold px-2 py-1 rounded w-full focus:ring-1 focus:ring-indigo-500"
                                                />
                                              ) : (
                                                order.orderCode || "-"
                                              )}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5">
                                              Situa√ß√£o / Forma Pgto
                                            </span>
                                            <span className="text-slate-800 font-semibold">
                                              {isEditing ? (
                                                <input
                                                  type="text"
                                                  value={
                                                    order.paymentCondition || ""
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "paymentCondition",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold px-2 py-1 rounded w-full focus:ring-1 focus:ring-indigo-500"
                                                />
                                              ) : (
                                                order.paymentCondition || "-"
                                              )}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5">
                                              Prazo de Pagamento
                                            </span>
                                            <span className="text-slate-800 font-semibold">
                                              {isEditing ? (
                                                <input
                                                  type="text"
                                                  value={
                                                    order.paymentTerm || ""
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "paymentTerm",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold px-2 py-1 rounded w-full focus:ring-1 focus:ring-indigo-500"
                                                />
                                              ) : (
                                                order.paymentTerm || "-"
                                              )}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="block text-[10px] text-slate-455 font-extrabold uppercase mb-0.5">
                                              Data Emiss√£o
                                            </span>
                                            <span className="text-slate-800 font-mono font-bold">
                                              {order.emissionDate ||
                                                "A ser definida"}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="block text-[10px] text-slate-455 font-extrabold uppercase mb-0.5">
                                              Data Estimada Entrega
                                            </span>
                                            <span className="text-slate-900 font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded inline-block">
                                              {isEditing ? (
                                                <input
                                                  type="text"
                                                  value={
                                                    order.deliveryDate || ""
                                                  }
                                                  placeholder="ex: DD/MM/AAAA"
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "deliveryDate",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="bg-white border border-slate-300 text-slate-800 font-mono text-xs font-bold px-2 py-1 rounded w-full focus:ring-1 focus:ring-indigo-500"
                                                />
                                              ) : (
                                                order.deliveryDate || "Sem data"
                                              )}
                                            </span>
                                          </div>
                                          {hasFinanceAccess && (
                                            <>
                                              <div>
                                                <span className="block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5">
                                                  Total Bruto
                                                </span>
                                                <span className="text-slate-700 font-bold font-mono">
                                                  R${" "}
                                                  {order.totalGrossValue
                                                    ? Number(
                                                        order.totalGrossValue,
                                                      ).toLocaleString(
                                                        "pt-BR",
                                                        {
                                                          minimumFractionDigits: 2,
                                                        },
                                                      )
                                                    : "-"}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5 text-emerald-700">
                                                  Total L√≠quido
                                                </span>
                                                <span className="text-emerald-700 font-extrabold font-mono text-sm">
                                                  R${" "}
                                                  {order.totalValue
                                                    ? Number(
                                                        order.totalValue,
                                                      ).toLocaleString(
                                                        "pt-BR",
                                                        {
                                                          minimumFractionDigits: 2,
                                                        },
                                                      )
                                                    : "-"}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                          <div>
                                            <span className="block text-[10px] text-slate-455 font-extrabold uppercase mb-0.5">
                                              Quantidade de Itens
                                            </span>
                                            <span className="text-slate-850 font-extrabold font-mono">
                                              {order.items?.length || 0} itens
                                              extra√≠dos
                                            </span>
                                          </div>

                                          {isEditing ? (
                                            <div className="col-span-2 md:col-span-4 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white transition bg-white/50 border border-transparent hover:border-slate-200">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    order.isProgramacao || false
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "isProgramacao",
                                                      e.target.checked,
                                                    )
                                                  }
                                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                />
                                                <span className="text-xs font-bold text-slate-700">
                                                  Programa√ß√£o
                                                </span>
                                              </label>
                                              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white transition bg-white/50 border border-transparent hover:border-slate-200">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    order.isUrgent || false
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "isUrgent",
                                                      e.target.checked,
                                                    )
                                                  }
                                                  className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500"
                                                />
                                                <span className="text-xs font-bold text-red-700">
                                                  Marcar como Urgente
                                                </span>
                                              </label>
                                              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white transition bg-white/50 border border-transparent hover:border-slate-200">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    order.isThirdPartyLaser ||
                                                    false
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "isThirdPartyLaser",
                                                      e.target.checked,
                                                    )
                                                  }
                                                  className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-500"
                                                />
                                                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                                                  Corte Terceirizado
                                                </span>
                                              </label>
                                            </div>
                                          ) : (
                                            <div className="col-span-2 md:col-span-4 mt-2 flex flex-wrap gap-2">
                                              {order.isProgramacao && (
                                                <span className="px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">
                                                  Programa√ß√£o
                                                </span>
                                              )}
                                              {order.isUrgent && (
                                                <span className="px-2 py-0.5 text-[10px] font-black uppercase text-red-700 bg-red-50 border border-red-200 rounded">
                                                  Pedido Urgente
                                                </span>
                                              )}
                                              {order.isThirdPartyLaser && (
                                                <span className="px-2 py-0.5 text-[10px] font-black uppercase text-slate-700 bg-slate-100 border border-slate-200 rounded">
                                                  Corte Terceirizado
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {(order.notes || isEditing) && (
                                            <div className="col-span-2 md:col-span-4 bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-xs italic mt-2 text-slate-600">
                                              <strong>
                                                Observa√ß√µes do Pedido:
                                              </strong>{" "}
                                              {isEditing ? (
                                                <textarea
                                                  value={order.notes || ""}
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "notes",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="bg-white border border-slate-300 text-slate-800 text-xs p-1.5 rounded w-full focus:ring-1 focus:ring-indigo-500 mt-1 font-sans italic"
                                                  rows={2}
                                                />
                                              ) : (
                                                order.notes
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Tab de Itens do Pedido */}
                                      <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-150 flex justify-between items-center">
                                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Itens do Pedido (
                                            {order.items?.length || 0})
                                          </h5>
                                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                            PDF Items Preview
                                          </span>
                                        </div>

                                        {/* Exibi√ß√£o Desktop (Tabela) */}
                                        <div className="hidden md:block overflow-x-auto">
                                          <table className="w-full text-left text-xs bg-white">
                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-150">
                                              <tr>
                                                <th className="p-3 font-bold">
                                                  C√ìDIGO / SKU
                                                </th>
                                                <th className="p-3 font-bold">
                                                  DESCRI√á√ÉO DO ITEM
                                                </th>
                                                <th className="p-3 font-bold text-center">
                                                  COR/TAM
                                                </th>
                                                <th className="p-3 font-bold text-center">
                                                  UNIDADE
                                                </th>
                                                <th className="p-3 font-bold text-center">
                                                  QUANTIDADE
                                                </th>
                                                {hasFinanceAccess ? (
                                                  <>
                                                    <th className="p-3 font-bold text-right text-indigo-900">
                                                      VALOR UNIT.
                                                    </th>
                                                    <th className="p-3 font-bold text-right text-emerald-950">
                                                      VALOR TOTAL
                                                    </th>
                                                  </>
                                                ) : (
                                                  <th className="p-3 text-center text-slate-400 font-medium">
                                                    FINANCEIRO
                                                  </th>
                                                )}
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-150 text-slate-800">
                                              {order.items.map(
                                                (item: any, i2: number) => (
                                                  <tr
                                                    key={i2}
                                                    className="hover:bg-slate-50/40 transition-colors"
                                                  >
                                                    <td className="p-3 font-mono font-bold text-slate-700 bg-slate-50/30">
                                                      {isEditing ? (
                                                        <input
                                                          type="text"
                                                          value={
                                                            item.itemCode || ""
                                                          }
                                                          onChange={(e) =>
                                                            handleUpdateExtractedOrderItem(
                                                              idx,
                                                              i2,
                                                              "itemCode",
                                                              e.target.value,
                                                            )
                                                          }
                                                          className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-24 focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                      ) : (
                                                        item.itemCode || (
                                                          <span className="text-slate-400 italic font-normal">
                                                            S/ c√≥digo
                                                          </span>
                                                        )
                                                      )}
                                                    </td>
                                                    <td className="p-3 font-semibold text-slate-900">
                                                      {isEditing ? (
                                                        <div className="relative">
                                                          <input
                                                            type="text"
                                                            value={
                                                              item.itemName || ""
                                                            }
                                                            onChange={(e) =>
                                                              handleUpdateExtractedOrderItem(
                                                                idx,
                                                                i2,
                                                                "itemName",
                                                                e.target.value,
                                                              )
                                                            }
                                                            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-full focus:ring-1 focus:ring-indigo-500"
                                                          />
                                                          {/* Sugest√£o de Itens */}
                                                          {item.itemName && (() => {
                                                            const query = (item.itemName || "").toLowerCase().trim();
                                                            const minLen = 3;
                                                            if (query.length < minLen) return null;

                                                            const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                            const normQuery = normalize(query);
                                                            
                                                            const scored = db.items.map((it) => {
                                                              const normName = normalize(`${it.code} - ${it.name}`);
                                                              let score = 0;
                                                              if (normName === normQuery) score = 2000;
                                                              else if (normName.includes(normQuery)) score = 1000;
                                                              else {
                                                                const queryWords = normQuery.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
                                                                const itemWords = normName.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
                                                                let matchCount = 0;
                                                                for (const qWord of queryWords) {
                                                                  if (itemWords.some(iWord => iWord.includes(qWord) || qWord.includes(iWord))) matchCount++;
                                                                }
                                                                score = matchCount;
                                                              }
                                                              return { item: it, score };
                                                            });
                                                            
                                                            const matches = scored.filter(s => s.score > 0).sort((a,b) => b.score - a.score).map(s => s.item).slice(0, 5);
                                                            
                                                            // If exact match doesn't need suggestion logic (already matches code)
                                                            if (matches.length > 0 && matches[0].name.toUpperCase().trim() === (item.itemName||"").toUpperCase().trim()) return null;

                                                            return matches.length > 0 ? (
                                                              <div className="absolute left-0 right-0 top-full z-50 mt-1 flex flex-col gap-0.5 border border-slate-200 rounded p-1 bg-white shadow-lg w-full min-w-[250px] max-h-32 overflow-y-auto">
                                                                <span className="text-[9px] font-bold text-indigo-700 px-1 pt-0.5 uppercase tracking-wider block bg-indigo-50 leading-tight border-b">
                                                                  Sugest√µes baseadas no nome:
                                                                </span>
                                                                {matches.map((it) => (
                                                                  <button
                                                                    type="button"
                                                                    key={it.id}
                                                                    onClick={() => {
                                                                      handleUpdateExtractedOrderItem(idx, i2, "itemCode", it.code);
                                                                      handleUpdateExtractedOrderItem(idx, i2, "itemName", it.name);
                                                                    }}
                                                                    className="text-left text-[10px] px-1 py-1 rounded hover:bg-indigo-600 hover:text-white transition-colors bg-white font-medium text-slate-700 flex justify-between gap-2"
                                                                  >
                                                                    <span className="truncate">{it.name}</span>
                                                                    <span className="font-mono text-[8px] bg-slate-100 text-slate-600 px-1 rounded font-semibold shrink-0">
                                                                      {it.code}
                                                                    </span>
                                                                  </button>
                                                                ))}
                                                              </div>
                                                            ) : null;
                                                          })()}
                                                        </div>
                                                      ) : (
                                                        item.itemName
                                                      )}
                                                    </td>
                                                    <td className="p-3 font-medium text-slate-650 text-center">
                                                      {isEditing ? (
                                                        <div className="flex gap-1 justify-center">
                                                          <select
                                                            value={
                                                              item.color || ""
                                                            }
                                                            onChange={(e) =>
                                                              handleUpdateExtractedOrderItem(
                                                                idx,
                                                                i2,
                                                                "color",
                                                                e.target.value,
                                                              )
                                                            }
                                                            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-28 focus:ring-1 focus:ring-indigo-500"
                                                          >
                                                            <option value="">
                                                              Cor
                                                            </option>
                                                            <option value="-">
                                                              -
                                                            </option>
                                                            {Object.values(
                                                              COLOR_MAP,
                                                            ).map((cName) => (
                                                              <option
                                                                key={cName}
                                                                value={cName}
                                                              >
                                                                {cName}
                                                              </option>
                                                            ))}
                                                          </select>
                                                          <input
                                                            type="text"
                                                            placeholder="Tam"
                                                            value={
                                                              item.size || ""
                                                            }
                                                            onChange={(e) =>
                                                              handleUpdateExtractedOrderItem(
                                                                idx,
                                                                i2,
                                                                "size",
                                                                e.target.value,
                                                              )
                                                            }
                                                            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-12 text-center focus:ring-1 focus:ring-indigo-500"
                                                          />
                                                        </div>
                                                      ) : (
                                                        `${item.color || "-"} / ${item.size || "-"}`
                                                      )}
                                                    </td>
                                                    <td className="p-3 font-bold text-slate-500 text-center">
                                                      {item.unit || "UN"}
                                                    </td>
                                                    <td className="p-3 font-black text-slate-900 text-center bg-indigo-50/10">
                                                      {isEditing ? (
                                                        <input
                                                          type="number"
                                                          value={
                                                            item.quantity ===
                                                            undefined
                                                              ? ""
                                                              : item.quantity
                                                          }
                                                          onChange={(e) =>
                                                            handleUpdateExtractedOrderItem(
                                                              idx,
                                                              i2,
                                                              "quantity",
                                                              e.target.value,
                                                            )
                                                          }
                                                          className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-16 text-center focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                      ) : (
                                                        item.quantity
                                                      )}
                                                    </td>

                                                    {hasFinanceAccess ? (
                                                      <>
                                                        <td className="p-3 text-right font-semibold text-indigo-700 font-mono">
                                                          {isEditing ? (
                                                            <div className="flex items-center gap-1 justify-end">
                                                              <span>R$</span>
                                                              <input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                  item.unitPrice ===
                                                                  undefined
                                                                    ? ""
                                                                    : item.unitPrice
                                                                }
                                                                onChange={(e) =>
                                                                  handleUpdateExtractedOrderItem(
                                                                    idx,
                                                                    i2,
                                                                    "unitPrice",
                                                                    e.target
                                                                      .value,
                                                                  )
                                                                }
                                                                className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-16 text-right focus:ring-1 focus:ring-indigo-500"
                                                              />
                                                            </div>
                                                          ) : (
                                                            `R$ ${item.unitPrice ? Number(item.unitPrice).toFixed(2) : "0.00"}`
                                                          )}
                                                        </td>
                                                        <td className="p-3 text-right font-black text-emerald-750 font-mono">
                                                          R${" "}
                                                          {item.totalPrice
                                                            ? Number(
                                                                item.totalPrice,
                                                              ).toFixed(2)
                                                            : Number(
                                                                (item.unitPrice ||
                                                                  0) *
                                                                  (item.quantity ||
                                                                    1),
                                                              ).toFixed(2)}
                                                        </td>
                                                      </>
                                                    ) : (
                                                      <td className="p-3 text-center text-slate-400">
                                                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold">
                                                          <Lock
                                                            size={10}
                                                            className="shrink-0"
                                                          />{" "}
                                                          Oculto (Representante)
                                                        </span>
                                                      </td>
                                                    )}
                                                  </tr>
                                                ),
                                              )}
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* Exibi√ß√£o Mobile (Lista Empilhada por Item) */}
                                        <div className="block md:hidden divide-y divide-slate-150">
                                          {order.items.map(
                                            (item: any, i2: number) => (
                                              <div
                                                key={i2}
                                                className="p-3.5 space-y-2 bg-slate-55/10 font-sans"
                                              >
                                                <div className="flex justify-between items-start">
                                                  <div className="min-w-0 pr-2">
                                                    <span className="text-[10px] font-mono font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                      SKU:{" "}
                                                      {item.itemCode ||
                                                        "S/ c√≥digo"}
                                                    </span>
                                                    <h6 className="font-semibold text-slate-800 text-xs mt-1 leading-normal">
                                                      {item.itemName}
                                                    </h6>
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <span className="block text-[9px] text-slate-400 font-bold uppercase">
                                                      Unidade
                                                    </span>
                                                    <span className="font-extrabold text-slate-700 text-xs">
                                                      {item.unit || "UN"}
                                                    </span>
                                                  </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded-lg border border-slate-100 text-[11px]">
                                                  <div>
                                                    <span className="block text-[8px] text-slate-450 font-bold uppercase">
                                                      Qtd
                                                    </span>
                                                    <span className="font-extrabold text-slate-800">
                                                      {isEditing ? (
                                                        <input
                                                          type="number"
                                                          value={
                                                            item.quantity ===
                                                            undefined
                                                              ? ""
                                                              : item.quantity
                                                          }
                                                          onChange={(e) =>
                                                            handleUpdateExtractedOrderItem(
                                                              idx,
                                                              i2,
                                                              "quantity",
                                                              e.target.value,
                                                            )
                                                          }
                                                          className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-16 text-center focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                      ) : (
                                                        item.quantity
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="block text-[8px] text-slate-450 font-bold uppercase">
                                                      Atributos
                                                    </span>
                                                    <span className="font-medium text-slate-600 truncate block max-w-full">
                                                      {isEditing ? (
                                                        <div className="flex gap-1 justify-center">
                                                          <select
                                                            value={
                                                              item.color || ""
                                                            }
                                                            onChange={(e) =>
                                                              handleUpdateExtractedOrderItem(
                                                                idx,
                                                                i2,
                                                                "color",
                                                                e.target.value,
                                                              )
                                                            }
                                                            className="bg-white border border-slate-300 text-slate-800 text-[10px] font-bold p-0.5 rounded w-20 focus:ring-1 focus:ring-indigo-500"
                                                          >
                                                            <option value="">
                                                              Cor
                                                            </option>
                                                            <option value="-">
                                                              -
                                                            </option>
                                                            {Object.values(
                                                              COLOR_MAP,
                                                            ).map((cName) => (
                                                              <option
                                                                key={cName}
                                                                value={cName}
                                                              >
                                                                {cName}
                                                              </option>
                                                            ))}
                                                          </select>
                                                          <input
                                                            type="text"
                                                            placeholder="Tam"
                                                            value={
                                                              item.size || ""
                                                            }
                                                            onChange={(e) =>
                                                              handleUpdateExtractedOrderItem(
                                                                idx,
                                                                i2,
                                                                "size",
                                                                e.target.value,
                                                              )
                                                            }
                                                            className="bg-white border border-slate-300 text-slate-800 text-[10px] font-bold p-0.5 rounded w-8 text-center focus:ring-1 focus:ring-indigo-500"
                                                          />
                                                        </div>
                                                      ) : (
                                                        `${item.color || "-"} / ${item.size || "-"}`
                                                      )}
                                                    </span>
                                                  </div>
                                                  {hasFinanceAccess ? (
                                                    <div className="text-right">
                                                      <span className="block text-[8px] text-slate-450 font-bold uppercase">
                                                        Total It.
                                                      </span>
                                                      <span className="font-black text-emerald-700 font-mono text-[10px] block">
                                                        R${" "}
                                                        {Number(
                                                          item.totalPrice ||
                                                            (item.unitPrice ||
                                                              0) *
                                                              (item.quantity ||
                                                                1),
                                                        ).toFixed(2)}
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <div className="text-right">
                                                      <span className="block text-[8px] text-slate-450 font-bold uppercase">
                                                        Valores
                                                      </span>
                                                      <span className="text-[9px] text-slate-400 font-bold inline-flex items-center gap-0.5 leading-normal">
                                                        <Lock size={9} />{" "}
                                                        Bloqueado
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>

                                      {/* Rodap√© Interno do Acorde√£o */}
                                      <div className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-100 p-2.5 rounded-lg border border-slate-150">
                                        <span>
                                          Extra√ß√£o Auditada via Intelig√™ncia
                                          Artificial do Sistema
                                        </span>
                                        {hasFinanceAccess &&
                                        order.totalGrossValue &&
                                        order.totalValue ? (
                                          <span>
                                            Desconto estimado:{" "}
                                            {(
                                              ((order.totalGrossValue -
                                                order.totalValue) /
                                                order.totalGrossValue) *
                                              100
                                            ).toFixed(1)}
                                            %
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rodap√© Fixo de A√ß√£o */}
                    <div className="px-5 py-4 border-t border-slate-150 bg-white shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                      {pdfExtractedOrders.length > 0 ? (
                        <div
                          id="import-footer-actions"
                          className="flex flex-col sm:flex-row justify-between items-center gap-3"
                        >
                          <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
                            Total Geral pronto:{" "}
                            <strong className="text-indigo-600">
                              {pdfExtractedOrders.length} pedidos
                            </strong>
                            . Clique em "Confirmar" para que ingressem na base
                            de dados ativa do sistema.
                          </p>

                          <div className="flex gap-2 w-full sm:w-auto shrink-0">
                            <button
                              onClick={() => {
                                setPdfExtractedOrders([]);
                                setPdfImportResult(null);
                                setPdfImportProgress(0);
                                setEditingOrderIdx(null);
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition text-xs uppercase tracking-wider"
                            >
                              Cancelar e Reenviar
                            </button>
                            <button
                              onClick={handleConfirmPdfImport}
                              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-2 rounded-lg shadow-md hover:shadow transition text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={14} /> Confirmar Importa√ß√£o
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end text-xs text-slate-400 font-medium">
                          Status: Pronto para upload e processamento de arquivo
                        </div>
                      )}

                      {pdfImportProgress > 0 && (
                        <div className="mt-3 bg-indigo-50 border border-indigo-100 p-3 rounded-lg shadow-xs animate-pulse">
                          <div className="flex justify-between items-center text-[10px] font-black text-indigo-700 mb-1 uppercase tracking-wider">
                            <span>Gravando registros no banco de dados</span>
                            <span>{pdfImportProgress}%</span>
                          </div>
                          <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${pdfImportProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isExcelModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                  <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">
                        Importa√ß√£o de Pedidos via Excel
                      </h3>
                      <button
                        onClick={() => setIsExcelModalOpen(false)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      Cole os dados diretamente do Excel. Ordens das colunas
                      esperadas:
                      <br />
                      <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs text-blue-800">
                        C√≥digo do Pedido | Cliente | Representante | Produto |
                        Cor | Tamanho | Varia√ß√£o | Quantidade | Data Entrega
                      </span>
                    </p>
                    <div className="mb-4">
                      <span className="text-xs text-gray-500">
                        * M√≠nimo exigido: Pedido, Cliente, Representante,
                        Produto. (A Quantidade assume 1 se vazia)
                      </span>
                    </div>

                    <textarea
                      value={excelData}
                      onChange={(e) => setExcelData(e.target.value)}
                      placeholder="Cole aqui as linhas do Excel..."
                      className="flex-1 w-full border border-gray-300 rounded p-3 min-h-[200px] text-sm overflow-auto focus:outline-[#107c41] font-mono whitespace-pre"
                    />

                    {excelImportResult && (
                      <div
                        className={`mt-4 p-3 rounded text-sm font-semibold flex flex-col gap-2 ${excelImportResult.includes("Processando") ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700 border border-green-200"}`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{excelImportResult}</span>
                          {excelImportResult.includes("Processando") && (
                            <span className="text-xs font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-800">
                              {excelImportProgress}%
                            </span>
                          )}
                        </div>
                        {excelImportResult.includes("Processando") && (
                          <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-out"
                              style={{ width: `${excelImportProgress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4 shrink-0">
                      <button
                        onClick={() => setIsExcelModalOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleImportExcel}
                        disabled={!excelData.trim() || !!excelImportResult}
                        className="bg-[#107c41] hover:bg-[#185c37] text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50"
                      >
                        Confirmar Importa√ß√£o
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isDeduplicateModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
                  <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-100 animate-fade-in">
                    <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-indigo-700">
                        <span className="text-xl">üßπ</span>
                        <h3 className="text-lg font-extrabold tracking-tight text-slate-800">
                          Diagn√≥stico e Higieniza√ß√£o de Duplicidades
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setIsDeduplicateModalOpen(false);
                          setCleanupResult(null);
                        }}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer transition"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 text-sm text-slate-600 space-y-4 scrollbar-thin">
                      {cleanupResult ? (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-5 flex flex-col gap-2 shadow-sm">
                          <h4 className="font-bold text-base flex items-center gap-2">
                            ‚úÖ Limpeza Estrutural Conclu√≠da!
                          </h4>
                          <p className="text-sm leading-relaxed">
                            {cleanupResult}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 leading-relaxed text-slate-700">
                            <strong className="text-slate-900 font-bold text-xs uppercase block mb-1">
                              üìù Regra de Deduplica√ß√£o Adotada:
                            </strong>
                            <span className="text-xs">
                              Mapeamos itens repetidos que compartilham o mesmo{" "}
                              <strong>C√≥digo do Pedido</strong>,{" "}
                              <strong>ID do Produto (Cat√°logo)</strong>,{" "}
                              <strong>Cor</strong>, <strong>Tamanho</strong>,{" "}
                              <strong>Varia√ß√£o</strong> e{" "}
                              <strong>Quantidade</strong>. Para preservar a
                              consist√™ncia, mantemos intacto o registro com o{" "}
                              <strong>
                                maior progresso na linha de produ√ß√£o
                              </strong>{" "}
                              (quantidade cortada, pintada, embalada ou
                              faturada) ou de cria√ß√£o mais antiga, removendo
                              apenas os registros duplicados excedentes. Itens
                              distintos dentro de um mesmo pedido nunca s√£o
                              tocados.
                            </span>
                          </div>

                          {(() => {
                            const diag = getDuplicatesDiagnostic();
                            if (diag.totalDuplicatesCount === 0) {
                              return (
                                <div className="text-center py-8 flex flex-col items-center justify-center gap-2">
                                  <span className="text-4xl">üåü</span>
                                  <h4 className="font-bold text-slate-800 text-base">
                                    Sua base de dados est√° 100% limpa!
                                  </h4>
                                  <p className="text-xs text-slate-500 max-w-sm">
                                    Nenhum item duplicado ou redundante foi
                                    localizado nos pedidos ativos do sistema.
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-3">
                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-805 rounded-lg flex flex-col gap-0.5 shadow-3xs">
                                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                                    ‚ö†Ô∏è DIAGN√ìSTICO ENCONTRADO
                                  </span>
                                  <p className="text-sm font-semibold text-amber-900">
                                    Foram identificados{" "}
                                    <strong>
                                      {diag.totalDuplicatesCount} itens
                                      duplicados
                                    </strong>{" "}
                                    redundantes distribu√≠dos por um total de{" "}
                                    <strong>
                                      {diag.affectedOrdersCount} pedidos
                                    </strong>{" "}
                                    afetados.
                                  </p>
                                </div>

                                <div className="border border-slate-100 rounded-lg overflow-hidden shrink-0">
                                  <div className="bg-slate-104 px-3 py-2 text-[10px] font-bold text-slate-600 uppercase grid grid-cols-12 gap-1.5 border-b border-slate-100 bg-slate-100">
                                    <span className="col-span-3">
                                      C√≥d. Pedido
                                    </span>
                                    <span className="col-span-4">Produto</span>
                                    <span className="col-span-3">Cor/Tam</span>
                                    <span className="col-span-2 text-right">
                                      Duplicatas
                                    </span>
                                  </div>
                                  <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto text-xs bg-white scrollbar-thin">
                                    {diag.duplicates.map((dup, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-2 grid grid-cols-12 gap-1.5 text-slate-700 hover:bg-slate-50 transition"
                                      >
                                        <span className="col-span-3 font-semibold text-slate-900">
                                          {dup.orderCode}
                                        </span>
                                        <span className="col-span-4 truncate">
                                          {dup.itemName} ({dup.itemCode})
                                        </span>
                                        <span className="col-span-3 font-mono text-[11px] text-slate-500">
                                          {dup.color}/{dup.size}
                                        </span>
                                        <span className="col-span-2 text-right font-bold text-red-600 font-sans">
                                          +{dup.toDelete.length}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 shrink-0">
                      <button
                        onClick={() => {
                          setIsDeduplicateModalOpen(false);
                          setCleanupResult(null);
                        }}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition active:scale-95"
                      >
                        {cleanupResult ? "Fechar" : "Cancelar"}
                      </button>

                      {!cleanupResult &&
                        getDuplicatesDiagnostic().totalDuplicatesCount > 0 && (
                          <button
                            onClick={handleExecuteDeduplication}
                            disabled={isCleaningUp}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            {isCleaningUp
                              ? "Higienizando base..."
                              : `Executar Limpeza Segura (${getDuplicatesDiagnostic().totalDuplicatesCount} registros)`}
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {(isFormVisible || editingId) && (
                <div className={`${editingId ? "flex-1 min-h-0 overflow-y-auto mb-2 custom-scrollbar pr-3 pb-2 flex flex-col gap-4 mt-4" : "max-h-[55vh] overflow-y-auto pr-1 sm:pr-2 flex flex-col gap-3.5 mt-2 animate-in slide-in-from-top-4 fade-in duration-200 scrollbar-thin"}`}>
                  {/* Row 1: Identification & client info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        C√≥digo do Pedido
                      </label>
                      <input
                        value={orderCode}
                        onChange={(e) => setOrderCode(e.target.value)}
                        placeholder="Ex: PED-001"
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-400 font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5 relative">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Cliente
                      </label>
                      <input
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setCustomerSelected(false);
                        }}
                        placeholder="Buscar ou Digitar Cliente"
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-400 font-medium"
                      />
                      {!customerSelected &&
                        customerName.trim().length > 0 &&
                        (() => {
                          const query = customerName.toLowerCase();
                          const matches = db.customers
                            .filter(
                              (c) =>
                                String(c.id).includes(query) ||
                                (c.name || "").toLowerCase().includes(query) ||
                                (c.tradeName || "")
                                  .toLowerCase()
                                  .includes(query),
                            )
                            .slice(0, 10);

                          if (matches.length === 0) return null;

                          return (
                            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto w-full">
                              {matches.map((c) => {
                                const hasTrade =
                                  c.tradeName && c.tradeName !== c.name;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setCustomerName(c.tradeName ? `${c.id} - ${c.tradeName}` : `${c.id} - ${c.name}`);
                                      setCustomerSelected(true);
                                    }}
                                    className="w-full text-left p-2 hover:bg-indigo-50 text-[11px] border-b border-slate-100 last:border-0 flex flex-col gap-0.5"
                                  >
                                    <span className="font-bold text-slate-800">
                                      {c.id} - {c.name}
                                    </span>
                                    {hasTrade && (
                                      <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100/50 px-1 py-0.5 rounded self-start">
                                        Fantasia: {c.tradeName}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Representante
                      </label>
                      <select
                        value={representativeName}
                        onChange={(e) => setRepresentativeName(e.target.value)}
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-700 font-medium cursor-pointer"
                      >
                        <option value="">Nenhum (Opcional)</option>
                        {db.users
                          .filter((u: User) => u.role === "REPRESENTANTE")
                          .map((u: User) => (
                            <option key={u.id} value={u.name}>
                              {u.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 1B: Billing Rules & Payment Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-200 mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Regra de Pagamento / Hist√≥rico
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBillingRule("cadastro")}
                          className={`flex-1 py-1 px-2 border rounded text-[10px] font-bold transition ${
                            billingRule === "cadastro"
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          Manual / Cadastro
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingRule("ultimo_pedido")}
                          className={`flex-1 py-1 px-2 border rounded text-[10px] font-bold transition ${
                            billingRule === "ultimo_pedido"
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                          }`}
                          title={
                            lastOrderForClient
                              ? `√öltimo pedido: ${lastOrderForClient.paymentCondition}`
                              : "Nenhum pedido anterior localizado"
                          }
                        >
                          Repetir √öltimo Pedido
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex flex-col gap-1 w-28 shrink-0">
                        <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                          Nota Fiscal
                        </label>
                        <select
                          value={fiscalType}
                          onChange={(e) => setFiscalType(e.target.value as any)}
                          className="border border-slate-300 text-[10px] p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-slate-800"
                        >
                          <option value="COM_NF">Com NF</option>
                          <option value="SEM_NF">Sem NF</option>
                          <option value="MEIA_NOTA">Meia Nota</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 flex-1">
                        <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                          Condi√ß√£o / Forma
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={paymentType}
                            onChange={(e) => {
                              setPaymentType(e.target.value as any);
                              if (e.target.value !== "outro") {
                                setCustomPaymentCondition("");
                              }
                            }}
                            className="border border-slate-300 text-[10px] p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="boleto">Boleto Banc√°rio</option>
                            <option value="pix">PIX</option>
                            <option value="deposito">Dep√≥sito em Conta</option>
                            <option value="carteira">Carteira</option>
                            <option value="outro">-- Outra Forma --</option>
                          </select>
                          {paymentType === "outro" && (
                            <input
                              type="text"
                              value={customPaymentCondition}
                              onChange={(e) =>
                                setCustomPaymentCondition(e.target.value)
                              }
                              placeholder="Especifique a op√ß√£o"
                              className="border border-slate-300 text-[10px] p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 w-1/4">
                        <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                          Prazos
                        </label>
                        <input
                          type="text"
                          value={paymentTerms}
                          onChange={(e) => setPaymentTerms(e.target.value)}
                          placeholder="Ex: 30/60/90"
                          className="border border-slate-300 text-[10px] p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Item Select & Attributes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="flex flex-col gap-0.5 relative md:col-span-1">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Item / Produto
                      </label>
                      <input
                        type="text"
                        placeholder="Digitar c√≥digo ou nome..."
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-850 placeholder-slate-400 font-medium"
                        value={orderItemSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOrderItemSearch(val);
                          const found = db.items.find(
                            (it) =>
                              `${it.code} - ${it.name}`.toLowerCase() ===
                              val.trim().toLowerCase(),
                          );
                          if (found) {
                            setItemId(found.id);
                          } else {
                            setItemId("");
                          }
                        }}
                      />

                      {!itemId &&
                        (orderItemSearch.trim().length > 0 ||
                          (customerName.trim().length > 0 &&
                            clientMostBoughtItems.length > 0)) && (
                          <div className="absolute left-0 right-0 top-full z-50 mt-1 flex flex-col gap-0.5 border border-slate-200 rounded-lg p-1 bg-white shadow-lg max-h-36 overflow-y-auto w-full">
                            <span className="text-[9px] font-bold text-indigo-700 px-2 pt-0.5 uppercase tracking-wider block bg-indigo-50 py-1 border-b">
                              {orderItemSearch.trim().length === 0 &&
                              clientMostBoughtItems.length > 0
                                ? "‚≠ê Itens mais comprados por este cliente:"
                                : "Cat√°logo de itens:"}
                            </span>
                            {suggestedOrderItems.length === 0 ? (
                              <span className="text-[10px] text-gray-500 px-2 py-1">
                                Nenhum item correspondente.
                              </span>
                            ) : (
                              suggestedOrderItems.map((it) => (
                                <button
                                  type="button"
                                  key={it.id}
                                  onClick={() => {
                                    setOrderItemSearch(
                                      `${it.code} - ${it.name}`,
                                    );
                                    setItemId(it.id);
                                  }}
                                  className="text-left text-[11px] px-2 py-1 rounded hover:bg-indigo-600 hover:text-white transition-colors bg-white border border-slate-100 font-medium text-slate-700 flex items-center justify-between"
                                >
                                  <span className="truncate pr-1 flex items-center gap-1.5 flex-wrap">
                                    <span>{it.name}</span>
                                    {clientBoughtStatsMap[it.id] !==
                                      undefined && (
                                      <span className="text-[7.5px] sm:text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded-sm shrink-0">
                                        ‚≠ê {clientBoughtStatsMap[it.id]} un.
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-semibold shrink-0">
                                    {it.code}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}

                      {itemId && (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded p-1.5 mt-1">
                          <span className="text-[10px] text-emerald-800 font-bold truncate max-w-[80%]">
                            ‚úì Selecionado:{" "}
                            {db.items.find((i) => i.id === itemId)?.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setOrderItemSearch("");
                              setItemId("");
                            }}
                            className="text-emerald-700 hover:text-emerald-900 text-[10px] font-black px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 rounded transition shrink-0"
                          >
                            Mudar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5 md:col-span-2">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Atributos (Cor / Tamanho / Varia√ß√£o)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 font-medium"
                        >
                          <option value="">Cor (opcional)</option>
                          <option value="-">-</option>
                          {((db?.attributes || []).filter((a) => a.type === "COLOR" && a.value).length > 0
                            ? Array.from(new Set((db?.attributes || []).filter((a) => a.type === "COLOR" && a.value).map((a) => a.value.trim().toUpperCase())))
                            : Object.values(COLOR_MAP)
                          ).map((cName) => (
                            <option key={cName} value={cName}>
                              {cName}
                            </option>
                          ))}
                        </select>
                        <input
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          placeholder="Tamanho"
                          className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-450 font-medium"
                        />
                        <input
                          value={variation}
                          onChange={(e) => setVariation(e.target.value)}
                          placeholder="Varia√ß√£o"
                          className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-450 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Quantities, dates, prices, discounts & stock status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Quantidade Total
                      </label>
                      <input
                        type="number"
                        value={totalQuantity}
                        onChange={(e) =>
                          setTotalQuantity(Number(e.target.value))
                        }
                        placeholder="Qtd de Pe√ßas"
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-400 font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5 relative">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                          Pre√ßo Unit√°rio (R$)
                        </label>
                        {selectedItemObj &&
                          (selectedItemObj.basePrice ||
                            lastPrices.length > 0) && (
                            <button
                              type="button"
                              onClick={() => setShowPriceHistory((prev) => !prev)}
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border transition flex items-center gap-1 cursor-pointer ${
                                showPriceHistory
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                              }`}
                              title="Alternar hist√≥rico e pre√ßos de tabela"
                            >
                              <span>üìä Hist√≥rico</span>
                            </button>
                          )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-slate-400 font-semibold text-[11px]">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={unitPrice}
                          onChange={(e) =>
                            setUnitPrice(
                              e.target.value ? parseFloat(e.target.value) : "",
                            )
                          }
                          placeholder="0,00"
                          className="border border-slate-300 text-xs pl-8 pr-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-400 font-medium"
                        />
                      </div>
                      {showPriceHistory &&
                        selectedItemObj &&
                        (selectedItemObj.basePrice ||
                          lastPrices.length > 0) && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-indigo-200 shadow-xl p-2 rounded-lg text-[11px] text-slate-800 z-30 w-56 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between pb-1 border-b border-indigo-100">
                              <span className="font-extrabold text-indigo-950 text-[10px] uppercase tracking-wider flex items-center gap-1">
                                üìä Hist√≥rico de Pre√ßos
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowPriceHistory(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold px-1 rounded text-xs cursor-pointer"
                              >
                                ‚úï
                              </button>
                            </div>

                            {selectedItemObj.basePrice && (
                              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100">
                                <span className="text-slate-600 font-medium text-[10px]">Tabela:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUnitPrice(selectedItemObj.basePrice!);
                                    setShowPriceHistory(false);
                                  }}
                                  className="font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer"
                                  title="Clique para aplicar o pre√ßo de tabela"
                                >
                                  R$ {selectedItemObj.basePrice.toFixed(2)} ‚Üµ
                                </button>
                              </div>
                            )}

                            {lastPrices.length > 0 && (
                              <div className="flex flex-col gap-1">
                                <span className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider">
                                  √öltimos Pre√ßos:
                                </span>
                                <div className="flex flex-col gap-1">
                                  {lastPrices.map((p, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between bg-indigo-50/50 p-1.5 rounded border border-indigo-100"
                                    >
                                      <span className="text-slate-500 font-medium text-[10px]">
                                        {idx === 0 ? "√öltimo pedido:" : "Pen√∫ltimo:"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setUnitPrice(p);
                                          setShowPriceHistory(false);
                                        }}
                                        className="font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer"
                                        title="Clique para aplicar este pre√ßo"
                                      >
                                        R$ {p.toFixed(2)} ‚Üµ
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5 flex justify-between items-center">
                        <span>Desconto (%)</span>
                        {matchedCustomerForOrder?.defaultDiscountPercent ? (
                          <span className="text-[9px] text-emerald-700 font-extrabold bg-emerald-50 px-1 rounded border border-emerald-200">
                            Padr√£o
                          </span>
                        ) : null}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={discountPercent}
                          onChange={(e) =>
                            setDiscountPercent(
                              e.target.value !== "" ? parseFloat(e.target.value) : "",
                            )
                          }
                          placeholder="0.00"
                          className="border border-slate-300 text-xs px-2.5 py-1.5 pr-6 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full bg-white text-slate-800 font-semibold"
                        />
                        <span className="absolute right-2.5 top-1.5 text-slate-400 font-bold text-xs">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Data Limite
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-600 font-medium cursor-pointer"
                      />
                    </div>

                    {itemId && (
                      <div className="flex flex-col gap-0.5 justify-end">
                        <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 border border-emerald-150 rounded flex justify-between items-center h-[34px]">
                          <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 truncate pr-1">
                            üì¶ Estoque:
                          </span>
                          <span className="font-bold font-mono">
                            {db.stocks.find(
                              (s) =>
                                s.id ===
                                `${itemId}|${color}|${size}|${variation}|ACABADO`,
                            )?.quantity || 0}{" "}
                            un
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 4: Config flags & status indicators */}
                  <div className="flex flex-wrap items-center gap-4 py-1.5 border-t border-b border-slate-100/80 my-1 justify-start">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasRET"
                        checked={hasRET}
                        onChange={(e) => setHasRET(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded bg-blue-50 border-blue-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label
                        htmlFor="hasRET"
                        className="text-xs text-blue-900 font-bold cursor-pointer select-none flex items-center gap-1"
                      >
                        Possui RET
                        {matchedCustomerForOrder?.hasRET && (
                          <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 rounded border border-blue-200">
                            Cliente RET
                          </span>
                        )}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="laserTerc"
                        checked={isThirdPartyLaser}
                        onChange={(e) => setIsThirdPartyLaser(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded bg-gray-100 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label
                        htmlFor="laserTerc"
                        className="text-xs text-slate-700 font-semibold cursor-pointer select-none"
                      >
                        Laser Terceirizado
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isUrgent"
                        checked={isUrgent}
                        onChange={(e) => setIsUrgent(e.target.checked)}
                        className="w-4 h-4 text-red-650 rounded bg-red-50 border-red-200 focus:ring-red-500 cursor-pointer"
                      />
                      <label
                        htmlFor="isUrgent"
                        className="text-xs text-red-700 font-bold cursor-pointer select-none"
                      >
                        Pedido Urgente ‚ö†Ô∏è
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isProgramacao"
                        checked={isProgramacao}
                        onChange={(e) => setIsProgramacao(e.target.checked)}
                        className="w-4 h-4 text-indigo-650 rounded bg-indigo-50 border-indigo-200 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label
                        htmlFor="isProgramacao"
                        className="text-xs text-indigo-700 font-bold cursor-pointer flex items-center gap-0.5 select-none"
                      >
                        üìà √â Programa√ß√£o
                      </label>
                    </div>
                  </div>

                  {/* Products in this current order list section (multi product workflow) */}
                  <div className="flex flex-col gap-2 mt-1">
                    {!editingId && lineItems.length > 0 && (
                      <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-lg flex flex-col gap-1.5 shadow-inner">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block border-b border-slate-200 pb-1">
                          Produtos neste Pedido ({lineItems.length}):
                        </span>
                        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                          {lineItems.map((li, idx) => {
                            const isBeingEdited = editingCartIndex === idx;
                            return (
                              <div
                                key={idx}
                                className={`flex justify-between items-center text-xs border rounded p-1.5 transition ${
                                  isBeingEdited
                                    ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/50"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-indigo-200"
                                }`}
                              >
                                <span className="truncate pr-2">
                                  <strong className="text-slate-800">
                                    {
                                      db.items.find((i) => i.id === li.itemId)
                                        ?.name || `Item #${li.itemId}`
                                    }
                                  </strong>{" "}
                                  <span className="text-slate-500 font-mono text-[10px]">
                                    ({li.color || "-"} | {li.size || "-"} | {li.variation || "-"})
                                  </span>{" "}
                                  -{" "}
                                  <span className="font-extrabold text-indigo-600">
                                    {li.totalQuantity} un
                                  </span>
                                </span>
                                <div className="flex gap-1 shrink-0 items-center">
                                  {li.unitPrice !== undefined && (
                                    <span className="text-indigo-700 font-semibold bg-indigo-50 px-1 py-0.5 rounded text-[9px] mr-1 border border-indigo-150">
                                      R$ {li.unitPrice.toFixed(2)} / un
                                    </span>
                                  )}
                                  {li.isUrgent && (
                                    <span className="bg-red-50 text-red-700 text-[9px] px-1 rounded font-bold border border-red-200">
                                      URG
                                    </span>
                                  )}
                                  {li.isProgramacao && (
                                    <span className="bg-indigo-50 text-indigo-700 text-[9px] px-1 rounded font-bold border border-indigo-150">
                                      PROG
                                    </span>
                                  )}
                                  {li.isThirdPartyLaser && (
                                    <span className="bg-blue-50 text-blue-700 text-[9px] px-1 rounded font-bold border border-blue-150">
                                      LASER
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleEditCartItem(idx)}
                                    className="p-1 text-amber-700 hover:bg-amber-100 rounded transition ml-1"
                                    title="Editar este item do carrinho"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCartItem(idx)}
                                    className="p-1 text-rose-600 hover:bg-rose-100 rounded transition"
                                    title="Remover este item do carrinho"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-row gap-2.5 mt-1 shrink-0">
                      {!editingId && editingCartIndex !== null ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveCartItem}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded shadow-xs transition text-xs leading-none"
                          >
                            ‚úì Salvar Item do Carrinho
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditCartItem}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-3 rounded shadow-xs transition text-xs leading-none"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          {!editingId && (
                            <button
                              type="button"
                              onClick={handleAddProductToOrder}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded shadow-xs transition text-xs disabled:opacity-40 leading-none"
                              disabled={!itemId || !totalQuantity}
                            >
                              + Outro Produto
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleCadastrar}
                            className={`flex-1 ${
                              editingId
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-indigo-600 hover:bg-indigo-700"
                            } font-bold text-white py-2 rounded shadow-xs transition text-xs leading-none`}
                          >
                            {editingId ? "Salvar Altera√ß√µes" : "Gerar Pedido"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setIsFormVisible(false);
                        setOrderCode("");
                        setItemId("");
                        setOrderItemSearch("");
                        setCustomerName("");
                        setColor("");
                        setSize("");
                        setVariation("");
                        setTotalQuantity("");
                        setUnitPrice("");
                        setPaymentCondition("");
                        setPaymentTerms("");
                        setCustomPaymentCondition("");
                        setIsThirdPartyLaser(false);
                        setIsUrgent(false);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded shadow-xs transition text-xs leading-none mt-1 shrink-0"
                    >
                      Cancelar Edi√ß√£o
                    </button>
                  )}
                </div>
              )}
              </div>
            </div>
          )}

          <div className="w-full flex-1 mt-4 mb-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                ‚ö° Fluxo de Pedidos
              </h3>
              <button
                onClick={handleExportPDF}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1"
              >
                üìÑ Exportar PDF
              </button>
            </div>

            {/* BLOCO EXCLUSIVO: PEDIDOS PARA APROVA√á√ÉO */}
            <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-800 font-black text-base shrink-0">
                  ‚è≥
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs sm:text-sm text-amber-950">
                      Pedidos Aguardando Aprova√ß√£o
                    </span>
                    <span className="bg-amber-500 text-white font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-full shadow-2xs">
                      {db.orders.filter((o) => o.status === "AGUARDANDO_APROVACAO").length}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">
                    Pedidos em an√°lise/libera√ß√£o comercial antes da entrada na produ√ß√£o.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    selectedStatuses.includes("AGUARDANDO_APROVACAO") &&
                    selectedStatuses.length === 1
                  ) {
                    setSelectedStatuses([]);
                  } else {
                    setSelectedStatuses(["AGUARDANDO_APROVACAO"]);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition duration-150 shrink-0 cursor-pointer shadow-xs border ${
                  selectedStatuses.includes("AGUARDANDO_APROVACAO") &&
                  selectedStatuses.length === 1
                    ? "bg-amber-600 text-white border-amber-700 shadow-sm"
                    : "bg-white text-amber-900 border-amber-300 hover:bg-amber-100/60"
                }`}
              >
                {selectedStatuses.includes("AGUARDANDO_APROVACAO") &&
                selectedStatuses.length === 1
                  ? "‚úì Filtrando Aprova√ß√£o (Mostrar Todos)"
                  : "Filtrar Pedidos p/ Aprova√ß√£o ‚Üí"}
              </button>
            </div>
          </div>
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 rounded-xl border border-slate-200/50 p-2 sm:p-3 mt-1 text-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 mb-3 shrink-0">
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 uppercase tracking-wider">
                Status e Prazos dos Pedidos Agrupados
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Filtre por prazos de entrega e gerencie o progresso de cada item
              </p>
            </div>

            <div className="w-full md:w-auto flex flex-col xl:flex-row items-stretch xl:items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por C√≥digo, Cliente ou Produto..."
                  className="w-full border border-slate-200 text-[11px] font-semibold rounded-lg p-1.5 pl-3 pr-7 bg-white text-slate-700 placeholder-slate-400 focus:outline-indigo-500 shadow-xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Limpar pesquisa"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-white border border-slate-200 shadow-xs rounded-lg px-2 overflow-hidden h-[30px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">De</span>
                  <input
                    type="date"
                    value={deliveryDateStart}
                    onChange={(e) => setDeliveryDateStart(e.target.value)}
                    className="bg-transparent text-[11px] text-slate-700 font-medium outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center bg-white border border-slate-200 shadow-xs rounded-lg px-2 overflow-hidden h-[30px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">At√©</span>
                  <input
                    type="date"
                    value={deliveryDateEnd}
                    onChange={(e) => setDeliveryDateEnd(e.target.value)}
                    className="bg-transparent text-[11px] text-slate-700 font-medium outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="relative shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="flex items-center gap-1.5 border border-slate-200 text-[11px] font-bold rounded-lg p-1.5 px-2.5 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs select-none"
                >
                  <Filter
                    size={12}
                    className={
                      filterDeadlines.length < 5 ||
                      filterBatchState !== "TODOS" ||
                      filterNotInvoicedOnly ||
                      printedFilter !== "TODOS" ||
                      deliveryDateStart || deliveryDateEnd
                        ? "text-indigo-600 animate-pulse"
                        : "text-slate-500"
                    }
                  />
                  <span>Filtros</span>
                  {(filterDeadlines.length < 5 ? 1 : 0) +
                    (filterBatchState !== "TODOS" ? 1 : 0) +
                    (filterNotInvoicedOnly ? 1 : 0) +
                    (printedFilter !== "TODOS" ? 1 : 0) +
                    (deliveryDateStart || deliveryDateEnd ? 1 : 0) >
                    0 && (
                    <span className="bg-indigo-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                      {(filterDeadlines.length < 5 ? 1 : 0) +
                        (filterBatchState !== "TODOS" ? 1 : 0) +
                        (filterNotInvoicedOnly ? 1 : 0) +
                        (printedFilter !== "TODOS" ? 1 : 0) +
                        (deliveryDateStart || deliveryDateEnd ? 1 : 0)}
                    </span>
                  )}
                  <ChevronDown size={12} className="text-slate-400" />
                </button>

                {isFilterDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={() => setIsFilterDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 z-40 flex flex-col gap-3 text-slate-850 text-left">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                          Filtrar Pedidos
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterDeadlines([
                              "NO_PRAZO",
                              "RISCO",
                              "ATRASADO",
                              "SEM_PRAZO",
                              "FATURADO",
                            ]);
                            setFilterBatchState("TODOS");
                            setFilterNotInvoicedOnly(false);
                            setPrintedFilter("TODOS");
                            setDeliveryDateStart("");
                            setDeliveryDateEnd("");
                          }}
                          className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider cursor-pointer"
                        >
                          Limpar
                        </button>
                      </div>

                      {/* Section 1: Prazos / Entrega */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                            Prazos / Entrega
                          </label>
                          <div className="flex gap-1.5 text-[8px] font-semibold text-slate-500 uppercase">
                            <button
                              type="button"
                              onClick={() =>
                                setFilterDeadlines([
                                  "NO_PRAZO",
                                  "RISCO",
                                  "ATRASADO",
                                  "SEM_PRAZO",
                                  "FATURADO",
                                ])
                              }
                              className="hover:text-indigo-600"
                            >
                              Tudo
                            </button>
                            <span>|</span>
                            <button
                              type="button"
                              onClick={() => setFilterDeadlines([])}
                              className="hover:text-indigo-600"
                            >
                              Nenhum
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 pl-0.5 mt-1">
                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("NO_PRAZO")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("NO_PRAZO")
                                    ? prev.filter((x) => x !== "NO_PRAZO")
                                    : [...prev, "NO_PRAZO"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>No Prazo (+ 2 dias)</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("RISCO")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("RISCO")
                                    ? prev.filter((x) => x !== "RISCO")
                                    : [...prev, "RISCO"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Risco de Atraso (At√© 2 dias)</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("ATRASADO")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("ATRASADO")
                                    ? prev.filter((x) => x !== "ATRASADO")
                                    : [...prev, "ATRASADO"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Atrasado (Vencido)</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("SEM_PRAZO")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("SEM_PRAZO")
                                    ? prev.filter((x) => x !== "SEM_PRAZO")
                                    : [...prev, "SEM_PRAZO"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Sem data prazo</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("FATURADO_PARCIAL")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("FATURADO_PARCIAL")
                                    ? prev.filter((x) => x !== "FATURADO_PARCIAL")
                                    : [...prev, "FATURADO_PARCIAL"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Faturado Parcial</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("FATURADO")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("FATURADO")
                                    ? prev.filter((x) => x !== "FATURADO")
                                    : [...prev, "FATURADO"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Faturado</span>
                          </label>
                        </div>
                      </div>

                      {/* Section 2: V√≠nculo */}
                      {(currentUser.role === "GERENCIA" ||
                        currentUser.role === "ADMIN" ||
                        currentUser.role === "PCP") && (
                        <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            V√≠nculo de Lote
                          </label>
                          <select
                            value={filterBatchState.toString()}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (
                                val === "TODOS" ||
                                val === "COM_LOTE" ||
                                val === "SEM_LOTE"
                              ) {
                                setFilterBatchState(val);
                              } else {
                                setFilterBatchState(Number(val));
                              }
                            }}
                            className="w-full border border-slate-200 text-[11px] font-medium rounded p-1.5 bg-slate-50 text-slate-700 outline-none"
                          >
                            <option value="TODOS">Todos os Pedidos</option>
                            <option value="COM_LOTE">Com Lote Vinculado</option>
                            <option value="SEM_LOTE">Sem Lote Vinculado</option>
                            {db.productionBatches.map((b) => (
                              <option key={b.id} value={b.id.toString()}>
                                Lote: {b.name} ({b.status})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Section 3: Faturamento */}
                      <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          Faturamento
                        </label>
                        <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                          <input
                            type="checkbox"
                            checked={filterNotInvoicedOnly}
                            onChange={(e) =>
                              setFilterNotInvoicedOnly(e.target.checked)
                            }
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="flex items-center gap-1">
                            üí∏ Apenas N√£o Faturados
                          </span>
                        </label>
                      </div>

                      {/* Section 4: Impress√£o */}
                      <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          Status de Impress√£o
                        </label>
                        <select
                          value={printedFilter}
                          onChange={(e) =>
                            setPrintedFilter(e.target.value as any)
                          }
                          className={`w-full border border-slate-200 text-[11px] font-bold rounded p-1.5 outline-none cursor-pointer ${
                            printedFilter === "NAO_IMPRESSOS"
                              ? "bg-amber-50 text-amber-900 border-amber-300"
                              : printedFilter === "IMPRESSOS"
                              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                              : "bg-slate-50 text-slate-700"
                          }`}
                        >
                          <option value="TODOS">Todos os Pedidos</option>
                          <option value="NAO_IMPRESSOS">‚è≥ N√£o Impressos</option>
                          <option value="IMPRESSOS">üñ®Ô∏è J√° Impressos</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleExportPdfGrouped}
                className="flex items-center justify-center shrink-0 gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg shadow-sm transition"
                title="Exportar Lista em PDF"
              >
                Exportar PDF
              </button>
            </div>
          </div>

          {/* Multi-Status Pill Filter */}
          <div className="mb-2.5 bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                üè∑Ô∏è Filtro por Status dos Itens:
              </span>
              {selectedStatuses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStatuses([])}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider cursor-pointer transition"
                >
                  Limpar Status ({selectedStatuses.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "PENDENTE",
                "AGUARDANDO_APROVACAO",
                "EM_PRODUCAO",
                "PRODUZIDO",
                "EM_CORTE",
                "CORTADO",
                "EM_PINTURA",
                "PINTADO",
                "EMBALANDO",
                "EMBALADO",
                "FATURADO_PARCIAL",
                "FATURADO",
              ].map((st) => {
                const isSel = selectedStatuses.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      if (isSel) {
                        setSelectedStatuses(
                          selectedStatuses.filter((s) => s !== st),
                        );
                      } else {
                        setSelectedStatuses([...selectedStatuses, st]);
                      }
                    }}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-lg transition duration-150 border cursor-pointer select-none ${
                      isSel
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs font-extrabold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {st.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filter Badges */}
          {(filterDeadlines.length < 6 ? 1 : 0) +
            (filterBatchState !== "TODOS" ? 1 : 0) +
            (filterNotInvoicedOnly ? 1 : 0) +
            (printedFilter !== "TODOS" ? 1 : 0) +
            (deliveryDateStart || deliveryDateEnd ? 1 : 0) >
            0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2 mb-2 border-b border-slate-150 shrink-0">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mr-1">
                Filtros:
              </span>

              {printedFilter !== "TODOS" && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs">
                  {printedFilter === "NAO_IMPRESSOS" ? "‚è≥ N√£o Impressos" : "üñ®Ô∏è J√° Impressos"}
                  <button
                    type="button"
                    onClick={() => setPrintedFilter("TODOS")}
                    className="hover:text-red-500 font-extrabold text-[12px] leading-none ml-1 transition cursor-pointer"
                    title="Remover filtro de impress√£o"
                  >
                    &times;
                  </button>
                </span>
              )}

              {filterDeadlines.length < 6 && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-150/60 px-2 py-0.5 rounded-full shadow-2xs">
                  ‚è∞ Prazos ({filterDeadlines.length}/6)
                  <button
                    type="button"
                    onClick={() =>
                      setFilterDeadlines([
                        "NO_PRAZO",
                        "RISCO",
                        "ATRASADO",
                        "SEM_PRAZO",
                        "FATURADO",
                        "FATURADO_PARCIAL",
                      ])
                    }
                    className="hover:text-red-500 font-extrabold text-[12px] leading-none ml-1 transition cursor-pointer"
                    title="Remover filtro de prazos"
                  >
                    &times;
                  </button>
                </span>
              )}

              {filterBatchState !== "TODOS" && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-amber-50 text-amber-850 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs">
                  üõ†Ô∏è Filtro de Lote
                  <button
                    type="button"
                    onClick={() => setFilterBatchState("TODOS")}
                    className="hover:text-red-500 font-extrabold text-[12px] leading-none ml-1 transition cursor-pointer"
                    title="Remover filtro de lote"
                  >
                    &times;
                  </button>
                </span>
              )}

              {filterNotInvoicedOnly && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-emerald-50 text-emerald-850 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                  üí∏ N√£o Faturados
                  <button
                    type="button"
                    onClick={() => setFilterNotInvoicedOnly(false)}
                    className="hover:text-red-500 font-extrabold text-[12px] leading-none ml-1 transition cursor-pointer"
                    title="Remover filtro n√£o faturados"
                  >
                    &times;
                  </button>
                </span>
              )}

              {(deliveryDateStart || deliveryDateEnd) && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-blue-50 text-blue-850 border border-blue-200 px-2 py-0.5 rounded-full shadow-2xs">
                  üóìÔ∏è {(() => {
                    let label = "";
                    if (deliveryDateStart) {
                      const d1 = deliveryDateStart.split("-");
                      label += `${d1[2]}/${d1[1]}`;
                    }
                    if (deliveryDateStart && deliveryDateEnd) label += " - ";
                    if (deliveryDateEnd) {
                      const d2 = deliveryDateEnd.split("-");
                      label += `${d2[2]}/${d2[1]}`;
                    }
                    return label;
                  })()}
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryDateStart("");
                      setDeliveryDateEnd("");
                    }}
                    className="hover:text-red-500 font-extrabold text-[12px] leading-none ml-1 transition cursor-pointer"
                    title="Remover filtro de data"
                  >
                    &times;
                  </button>
                </span>
              )}

              {(orderRangeStart.trim() || orderRangeEnd.trim()) && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs">
                  üéØ Faixa: {orderRangeStart || "In√≠cio"} at√© {orderRangeEnd || "Fim"}
                  {filterByRangeActive && <span className="font-bold text-amber-700">(Filtrando)</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setOrderRangeStart("");
                      setOrderRangeEnd("");
                      setFilterByRangeActive(false);
                    }}
                    className="hover:text-red-500 font-extrabold text-[12px] leading-none ml-1 transition cursor-pointer"
                    title="Remover filtro de faixa"
                  >
                    &times;
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setFilterDeadlines([
                    "NO_PRAZO",
                    "RISCO",
                    "ATRASADO",
                    "SEM_PRAZO",
                    "FATURADO",
                    "FATURADO_PARCIAL",
                  ]);
                  setFilterBatchState("TODOS");
                  setFilterNotInvoicedOnly(false);
                  setPrintedFilter("TODOS");
                  setDeliveryDateStart("");
                  setDeliveryDateEnd("");
                  setOrderRangeStart("");
                  setOrderRangeEnd("");
                  setFilterByRangeActive(false);
                }}
                className="text-[9px] font-black text-slate-400 hover:text-slate-650 uppercase tracking-widest ml-auto hover:underline cursor-pointer py-1"
              >
                Limpar Todos
              </button>
            </div>
          )}

          {/* Order Range Selector & Batch Print Controls */}
          <div className="mb-2.5 bg-slate-100/80 p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                üéØ Sele√ß√£o / Faixa de Pedidos:
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Ped. Inicial (ex: 101)"
                  value={orderRangeStart}
                  onChange={(e) => setOrderRangeStart(e.target.value)}
                  className="w-28 sm:w-32 text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:outline-indigo-500 shadow-2xs"
                />
                <span className="text-slate-400 font-bold text-xs">at√©</span>
                <input
                  type="text"
                  placeholder="Ped. Final (ex: 150)"
                  value={orderRangeEnd}
                  onChange={(e) => setOrderRangeEnd(e.target.value)}
                  className="w-28 sm:w-32 text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:outline-indigo-500 shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectRangeForPrint}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] rounded-lg transition active:scale-95 shadow-2xs cursor-pointer flex items-center gap-1"
                title="Marcar todos os pedidos neste intervalo para a lista de impress√£o"
              >
                üéØ Marcar Faixa p/ Impress√£o
              </button>

              <button
                type="button"
                onClick={() => setFilterByRangeActive(!filterByRangeActive)}
                className={`px-2.5 py-1 font-extrabold text-[11px] rounded-lg transition active:scale-95 shadow-2xs cursor-pointer flex items-center gap-1 border ${
                  filterByRangeActive
                    ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
                title="Filtrar ou exibir todos os pedidos na tela com base no intervalo"
              >
                üîç {filterByRangeActive ? "Filtrando Lista p/ Faixa (Ativo)" : "Filtrar Lista na Tela"}
              </button>

              {(orderRangeStart || orderRangeEnd || filterByRangeActive) && (
                <button
                  type="button"
                  onClick={() => {
                    setOrderRangeStart("");
                    setOrderRangeEnd("");
                    setFilterByRangeActive(false);
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                >
                  Limpar Faixa
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allFilteredCodes = groupedOrders.map(([c]) => c);
                  if (
                    groupedOrders.length > 0 &&
                    selectedOrderCodesForPrint.length === groupedOrders.length
                  ) {
                    setSelectedOrderCodesForPrint([]);
                  } else {
                    setSelectedOrderCodesForPrint(allFilteredCodes);
                  }
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] rounded-lg transition active:scale-95 cursor-pointer shadow-2xs"
              >
                {selectedOrderCodesForPrint.length === groupedOrders.length &&
                groupedOrders.length > 0
                  ? "Desmarcar Todos Vis√≠veis"
                  : `Marcar Todos Vis√≠veis (${groupedOrders.length})`}
              </button>

              {selectedOrderCodesForPrint.length > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] font-extrabold text-emerald-800 font-mono">
                    {selectedOrderCodesForPrint.length} marcado(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      markOrdersAsPrinted(selectedOrderCodesForPrint);
                      window.dispatchEvent(
                        new CustomEvent("print-order", {
                          detail: {
                            isBatch: true,
                            orderCodes: selectedOrderCodesForPrint,
                            printSheetSize: "half",
                          },
                        }),
                      );
                    }}
                    className="px-2 py-0.5 bg-[#00b14f] hover:bg-emerald-600 text-white font-extrabold text-[10px] rounded shadow-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Printer size={11} /> Meia Folha
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      markOrdersAsPrinted(selectedOrderCodesForPrint);
                      window.dispatchEvent(
                        new CustomEvent("print-order", {
                          detail: {
                            isBatch: true,
                            orderCodes: selectedOrderCodesForPrint,
                            printSheetSize: "full",
                          },
                        }),
                      );
                    }}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] rounded shadow-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Printer size={11} /> Folha Inteira
                  </button>
                  {currentUser.role !== "LEITURA" && (
                    <button
                      type="button"
                      onClick={handleBulkDeleteSelectedOrders}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded shadow-xs transition cursor-pointer flex items-center gap-1"
                      title="Excluir todos os pedidos selecionados em massa"
                    >
                      <Trash2 size={11} /> Excluir em Massa
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {groupedOrders.length === 0 ? (
              <p className="text-slate-500 text-center text-xs font-sans italic py-10 bg-white rounded-xl border border-dashed border-slate-200">
                Nenhum pedido condizente com os filtros selecionados.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pb-4">
                {groupedOrders.slice(0, ordersLimit).map(([code, orders]) => {
                  const firstOrder = orders[0];
                  const dStatus = getDeliveryStatus(firstOrder);
                  const isSelectedForPrint = selectedOrderCodesForPrint.includes(code);
                  const isPrinted = orders.some((o) => o.isPrinted);
                  const printCount = Math.max(0, ...orders.map((o) => o.printCount ?? (o.isPrinted ? 1 : 0)));
                  let badgeColor = "";
                  if (dStatus === "Atrasado") {
                    badgeColor =
                      "bg-red-50 text-red-700 border-red-200 animate-pulse font-semibold";
                  } else if (dStatus === "Com risco de atraso") {
                    badgeColor =
                      "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
                  } else if (dStatus === "No prazo") {
                    badgeColor =
                      "bg-emerald-50 text-emerald-800 border-emerald-250 font-medium";
                  } else if (dStatus === "Faturado") {
                    badgeColor =
                      "bg-purple-50 text-purple-700 border-purple-200 font-medium";
                  } else {
                    badgeColor = "bg-slate-50 text-slate-500 border-slate-200";
                  }

                  const clientObj = db.customers.find(
                    (c) =>
                      c.name.trim().toLowerCase() ===
                      firstOrder.customerName.trim().toLowerCase(),
                  );
                  const clientDisplayName = clientObj?.tradeName || firstOrder.customerName;
                  const clientCode = clientObj?.id || "-";

                  return (
                    <div
                      key={code}
                      onClick={() => setSelectedOrderCode(code)}
                      className="border border-slate-200 rounded-xl shadow-xs hover:shadow-md bg-white hover:-translate-y-0.5 transition-all p-2.5 sm:p-3 cursor-pointer shrink-0"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col min-w-0 bg-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 leading-tight">
                              Pedido: {code}
                            </h4>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSelectedForPrint) {
                                  setSelectedOrderCodesForPrint(
                                    selectedOrderCodesForPrint.filter((c) => c !== code),
                                  );
                                } else {
                                  setSelectedOrderCodesForPrint([
                                    ...selectedOrderCodesForPrint,
                                    code,
                                  ]);
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition flex items-center gap-1 cursor-pointer border ${
                                isSelectedForPrint
                                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
                              }`}
                              title="Marcar/Desmarcar para Impress√£o em Lote"
                            >
                              <input
                                type="checkbox"
                                checked={isSelectedForPrint}
                                onChange={() => {}}
                                className="w-3 h-3 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer pointer-events-none"
                              />
                              <span>{isSelectedForPrint ? "Marcado" : "Marcar"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOrderPrintedStatus(code, isPrinted);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition flex items-center gap-1 cursor-pointer border ${
                                isPrinted
                                  ? "bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200"
                                  : "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                              }`}
                              title="Clique para alternar o status de impress√£o do pedido"
                            >
                              {isPrinted ? `üñ®Ô∏è Impresso ${printCount > 0 ? printCount : 1}x` : "‚è≥ N√£o Impresso"}
                            </button>
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-slate-700 font-semibold mt-0.5 truncate max-w-[210px]" title={firstOrder.customerName}>
                            Cliente: {clientDisplayName} <span className="ml-1 text-[8px] font-mono leading-none bg-slate-100 text-slate-500 font-extrabold px-1 rounded border border-slate-200 block sm:inline-block w-max mt-0.5 sm:mt-0">C√≥d: {clientCode}</span>
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-indigo-600 font-bold mt-1.5 bg-indigo-50/50 px-1.5 py-0.5 rounded w-max inline-block">
                            {orders.length}{" "}
                            {orders.length === 1 ? "Item" : "Itens"}
                          </span>

                          {(() => {
                            const statusCounts = orders.reduce((acc, o) => {
                              const effSt = (o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity))
                                ? "FATURADO_PARCIAL"
                                : (o.status || "PENDENTE");
                              acc[effSt] = (acc[effSt] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);

                            const uniqueStatuses = Object.keys(statusCounts);
                            return (
                              <div className="flex flex-wrap gap-1 mt-2 max-w-[240px]">
                                {uniqueStatuses.map((st) => {
                                  let bgStyle = "bg-slate-100 text-slate-800 border-slate-200 text-[8px] sm:text-[9px]";
                                  if (st === "FATURADO_PARCIAL") {
                                    bgStyle = "bg-amber-100 text-amber-800 border-amber-250 font-bold shadow-3xs text-[8px] sm:text-[9px]";
                                  } else if (st === "FATURADO") {
                                    bgStyle = "bg-purple-100 text-purple-800 border-purple-250 font-semibold shadow-3xs text-[8px] sm:text-[9px]";
                                  } else if (st === "EM_PRODUCAO") {
                                    bgStyle = "bg-blue-100 text-blue-800 border-blue-200 text-[8px] sm:text-[9px]";
                                  } else if (st === "PRODUZIDO") {
                                    bgStyle = "bg-green-100 text-green-800 border-green-200 text-[8px] sm:text-[9px]";
                                  } else if (st === "EMBALADO") {
                                    bgStyle = "bg-emerald-100 text-emerald-800 border-emerald-250 text-[8px] sm:text-[9px]";
                                  }
                                  return (
                                    <span
                                      key={st}
                                      className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] border uppercase tracking-wider font-semibold whitespace-nowrap shadow-xs ${bgStyle}`}
                                    >
                                      {st.replace("_", " ")} ({statusCounts[st]})
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {firstOrder.deliveryDate && (
                            <>
                              <span
                                className={`px-2 py-0.5 rounded text-[8px] sm:text-[9px] border uppercase tracking-wider shrink-0 ${badgeColor}`}
                              >
                                {dStatus}
                              </span>
                              {(() => {
                                try {
                                  const dateParts = firstOrder.deliveryDate.split("T")[0].split("-");
                                  if (dateParts.length === 3) {
                                    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                                    const day = String(dateObj.getDate()).padStart(2, '0');
                                    const monthStr = dateObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toLowerCase();
                                    const dateFormatted = `${day}/${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}`;
                                    return (
                                      <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 rounded uppercase tracking-wider flex items-center gap-0.5 shrink-0 shadow-3xs">
                                        üóìÔ∏è {dateFormatted}
                                      </span>
                                    );
                                  }
                                } catch(e) {}
                                return null;
                              })()}
                            </>
                          )}
                          {currentUser.role !== "LEITURA" && (
                            <div className="flex flex-wrap items-center justify-end gap-1 mt-1">
                              {orders.some((o) => o.status === "AGUARDANDO_APROVACAO") && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveOrderGroup(code);
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                    title="Aprovar Pedido"
                                  >
                                    ‚úì Aprovar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectOrderGroup(code);
                                    }}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                    title="Reprovar Pedido"
                                  >
                                    ‚úï Reprovar
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markOrdersAsPrinted([code]);
                                  window.dispatchEvent(
                                    new CustomEvent("print-order", {
                                      detail: {
                                        isBatch: true,
                                        orderCodes: [code],
                                        printSheetSize: "half",
                                      },
                                    }),
                                  );
                                }}
                                className="p-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-[#00b14f] font-bold text-[10px] rounded-lg border border-emerald-200/80 transition flex items-center gap-1 cursor-pointer"
                                title="Imprimir PDF do pedido em meia folha"
                              >
                                <Printer size={11} /> PDF Meia Folha
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenOrderGroupEditModal(code);
                                }}
                                className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
                                title="Editar dados do pedido (n√∫mero, cliente, data, status)"
                              >
                                <Edit3 size={11} /> Editar
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOrderGroup(code);
                                }}
                                className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-lg hover:text-rose-700 transition cursor-pointer"
                                title="Excluir pedido completo"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {groupedOrders.length > ordersLimit && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 my-2 mb-4 shadow-2xs">
                <div className="text-xs text-slate-600 font-medium">
                  Exibindo <span className="font-extrabold text-slate-900">{Math.min(ordersLimit, groupedOrders.length)}</span> de <span className="font-extrabold text-slate-900">{groupedOrders.length}</span> pedidos
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOrdersLimit((prev) => prev + 20)}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl border border-indigo-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    üîÑ Carregar mais 20 pedidos
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrdersLimit(groupedOrders.length)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-250 transition cursor-pointer active:scale-95"
                  >
                    Mostrar Todos ({groupedOrders.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Batch Printing Bar when orders are selected */}
      <AnimatePresence>
        {selectedOrderCodesForPrint.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white shadow-2xl rounded-2xl px-4 py-3 border border-slate-700 flex flex-wrap items-center justify-between gap-3 max-w-2xl w-[92%] sm:w-auto"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-extrabold text-xs text-slate-100 font-mono">
                üéØ {selectedOrderCodesForPrint.length} pedido(s) selecionado(s)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  markOrdersAsPrinted(selectedOrderCodesForPrint);
                  window.dispatchEvent(
                    new CustomEvent("print-order", {
                      detail: {
                        isBatch: true,
                        orderCodes: selectedOrderCodesForPrint,
                        printSheetSize: "half",
                      },
                    }),
                  );
                }}
                className="px-3.5 py-1.5 bg-[#00b14f] hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
              >
                <Printer size={14} /> Imprimir Meia Folha
              </button>

              <button
                type="button"
                onClick={() => {
                  markOrdersAsPrinted(selectedOrderCodesForPrint);
                  window.dispatchEvent(
                    new CustomEvent("print-order", {
                      detail: {
                        isBatch: true,
                        orderCodes: selectedOrderCodesForPrint,
                        printSheetSize: "full",
                      },
                    }),
                  );
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Printer size={14} /> Imprimir Folha Inteira
              </button>

              {currentUser.role !== "LEITURA" && (
                <button
                  type="button"
                  onClick={handleBulkDeleteSelectedOrders}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/20 active:scale-95"
                  title="Excluir pedidos selecionados em massa"
                >
                  <Trash2 size={14} /> Excluir em Massa
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedOrderCodesForPrint([])}
                className="px-2 py-1.5 text-xs text-slate-300 hover:text-white font-bold underline cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Order Grouped Items Drawer / Modal */}
      {selectedOrderCode && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in z-50 animate-in fade-in zoom-in-95 duration-200"
          onClick={() => setSelectedOrderCode(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border"
          >
            <div className="p-3 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-800">
                  Detalhes do Pedido: {selectedOrderCode}
                </h3>
                {(() => {
                  const rawCustName = groupedOrders.find(
                    ([code]) => code === selectedOrderCode,
                  )?.[1][0]?.customerName || "";
                  const clientObj = db.customers.find(
                    (c) => c.name.toLowerCase().trim() === rawCustName.toLowerCase().trim()
                  );
                  const clientCode = clientObj?.id || "-";
                  const clientDisplayName = clientObj?.tradeName || rawCustName || "-";
                  const modalOrders = db.orders.filter(
                    (o) => o.orderCode === selectedOrderCode
                  );
                  const modalIsPrinted = modalOrders.some((o) => o.isPrinted);
                  const modalPrintCount = Math.max(0, ...modalOrders.map((o) => o.printCount ?? (o.isPrinted ? 1 : 0)));

                  return (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] sm:text-xs text-slate-700 font-bold font-sans">
                        Cliente: {clientDisplayName} <span className="ml-1 text-[9px] font-mono leading-none bg-indigo-100 text-indigo-700 font-black px-1.5 py-0.5 rounded border border-indigo-200">C√≥d: {clientCode}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleOrderPrintedStatus(selectedOrderCode, modalIsPrinted)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition flex items-center gap-1 cursor-pointer border ${
                          modalIsPrinted
                            ? "bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200"
                            : "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                        }`}
                        title="Clique para alternar o status de impress√£o do pedido"
                      >
                        {modalIsPrinted ? `üñ®Ô∏è Impresso ${modalPrintCount > 0 ? modalPrintCount : 1}x` : "‚è≥ N√£o Impresso"}
                      </button>
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {currentUser.role !== "LEITURA" && (
                  <>
                    {(() => {
                      const currentGroupOrders = db.orders.filter(
                        (o) => o.orderCode === selectedOrderCode
                      );
                      const needsApproval = currentGroupOrders.some(
                        (o) => o.status === "AGUARDANDO_APROVACAO"
                      );
                      return (
                        <>
                          {needsApproval && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveOrderGroup(selectedOrderCode)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-1 leading-none cursor-pointer"
                                title="Aprovar Pedido"
                              >
                                ‚úì Aprovar Pedido
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectOrderGroup(selectedOrderCode)}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-1 leading-none cursor-pointer"
                                title="Reprovar Pedido"
                              >
                                ‚úï Reprovar
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenOrderGroupEditModal(selectedOrderCode)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-1 leading-none cursor-pointer"
                            title="Editar Pedido (N√∫mero de Acompanhamento, Cliente, Data, Status)"
                          >
                            <Edit3 size={13} /> Editar Pedido
                          </button>
                        </>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => handleReplicateGroup(selectedOrderCode)}
                      className="bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1 leading-none cursor-pointer"
                      title="Replicar todos os itens deste pedido"
                    >
                      <Copy size={13} /> Replicar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOrderGroup(selectedOrderCode)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-rose-550 shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1 leading-none cursor-pointer"
                      title="Excluir todos os itens deste pedido"
                    >
                      <Trash2 size={13} /> Excluir
                    </button>
                  </>
                )}
                {(currentUser.role === "ADMIN" ||
                  currentUser.role === "PCP" ||
                  currentUser.role === "GERENCIA") &&
                  (() => {
                    const orderItemsForCode = db.orders.filter(
                      (o) =>
                        o.orderCode === selectedOrderCode &&
                        o.isActive !== false &&
                        (o.invoicedQuantity || 0) < o.totalQuantity,
                    );
                    if (orderItemsForCode.length > 0) {
                      return (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            handleInvoiceEntireOrder(selectedOrderCode)
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-emerald-550 shadow-xs hover:shadow-sm transition-all flex items-center gap-1 leading-none cursor-pointer"
                        >
                          üí∞ Faturar Pedido Inteiro
                        </motion.button>
                      );
                    }
                    return null;
                  })()}
                <button
                  type="button"
                  onClick={() => {
                    const group = groupedOrders.find(
                      ([code]) => code === selectedOrderCode,
                    )?.[1] || db.orders.filter((o) => o.orderCode === selectedOrderCode);
                    if (group && group[0]) {
                      window.dispatchEvent(
                        new CustomEvent("print-order", { detail: group[0] }),
                      );
                      setSelectedOrderCode(null);
                    }
                  }}
                  className="bg-indigo-605 hover:bg-slate-900 bg-slate-950 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-50 border-white/20 shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1 leading-none cursor-pointer"
                >
                  <Printer size={13} /> PDF do Pedido
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderCode(null)}
                  className="p-1 rounded-full hover:bg-slate-200 transition cursor-pointer"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto flex-1 flex flex-col gap-2.5 sm:gap-3 bg-slate-50/50">
              {(groupedOrders.find(([code]) => code === selectedOrderCode)?.[1] || db.orders.filter((o) => o.orderCode === selectedOrderCode))
                ?.map((o) => {
                  const item = db.items.find((i) => i.id === o.itemId);

                  if (isUpdating === o.id) {
                    return (
                      <div
                        key={`skeleton-${o.id}`}
                        className="bg-white p-3 rounded-lg shadow-xs border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-pulse"
                      >
                        <div className="flex flex-col gap-2 w-full md:w-1/2">
                          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                          <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                        </div>
                        <div className="h-8 w-24 bg-slate-200 rounded-lg"></div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={o.id}
                      className="bg-white p-2.5 sm:p-3 rounded-xl shadow-xs border border-slate-150 flex flex-col gap-2.5 relative hover:border-indigo-150 transition-colors text-slate-800"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Item Thumbnail */}
                          {item?.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 bg-slate-50 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100/60 flex items-center justify-center shrink-0 text-xs">
                              üì¶
                            </div>
                          )}
                          <div className="min-w-0 animate-in fade-in duration-300">
                            <span className="font-extrabold text-slate-800 text-xs sm:text-sm block truncate">
                              {item?.name || o.customProductName} <span className="ml-1 text-[9px] font-mono font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">Ref: {item?.code || o.itemId}</span>
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-450 font-mono mt-0.5 block">
                              {o.color || "-"} | {o.size || "-"} |{" "}
                              {o.variation || "-"}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap font-sans">
                              <span className="text-[8px] sm:text-[10px] text-indigo-650 font-bold bg-indigo-50 px-1.5 py-0.5 rounded leading-none">
                                Total: {o.totalQuantity || 0} un
                              </span>
                              <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                                Emb: {o.packedQuantity || 0} un
                              </span>
                              <span className="text-[8px] sm:text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded leading-none">
                                Fat: {o.invoicedQuantity || 0} un
                              </span>
                              {(() => {
                                const batch = db.productionBatches.find((b) =>
                                  b.orderIds.includes(o.id),
                                );
                                if (batch) {
                                  return (
                                    <span className="text-[8px] sm:text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded leading-none border border-amber-200">
                                      Lote: {batch.name} ({batch.status})
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded leading-none border border-slate-200">
                                    Sem Lote
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 select-none">
                          {(() => {
                            const itemEffSt = (o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity))
                              ? "FATURADO_PARCIAL"
                              : (o.status || "PENDENTE");
                            return (
                              <span
                                className={`px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold border uppercase tracking-wider shrink-0 ${getStatusColor(itemEffSt)}`}
                              >
                                {itemEffSt.replace("_", " ")}
                              </span>
                            );
                          })()}

                          {/* Status Select Box */}
                          <select
                            value={o.status || "PENDENTE"}
                            disabled={currentUser.role === "LEITURA"}
                            onChange={(e) =>
                              handleStatusChange(o.id, e.target.value as any)
                            }
                            className="border border-slate-250 rounded-lg text-[10px] sm:text-[11px] font-semibold py-1 px-1.5 text-slate-700 bg-white focus:outline-indigo-500 cursor-pointer disabled:opacity-50 disabled:bg-slate-100 transition shadow-xs"
                          >
                            <option value="PENDENTE">Pendente</option>
                            <option value="EM_PRODUCAO">Em Produ√ß√£o</option>
                            <option value="PRODUZIDO">Produzido</option>
                            <option value="EM_CORTE">Em Corte</option>
                            <option value="CORTADO">Cortado</option>
                            <option value="EM_PINTURA">Em Pintura</option>
                            <option value="PINTADO">Pintado</option>
                            <option value="EMBALANDO">Embalando</option>
                            <option value="EMBALADO">Embalado</option>
                            <option value="FATURADO_PARCIAL">Faturado Parcial</option>
                            <option value="FATURADO">Faturado</option>
                          </select>

                          {/* Dynamic item-level Partial Invoicing trigger button inside detail view */}
                          {(currentUser.role === "ADMIN" ||
                            currentUser.role === "PCP" ||
                            currentUser.role === "GERENCIA") &&
                            (o.invoicedQuantity || 0) < o.totalQuantity && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
                                  const physicalStock =
                                    db.stocks.find((s) => s.id === stockId)
                                      ?.quantity || 0;
                                  const limit = Math.max(
                                    o.totalQuantity - (o.invoicedQuantity || 0),
                                    physicalStock,
                                  );
                                  setInvoiceModalData({ order: o, limit });
                                  setInvoiceInput(String(limit));
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] sm:text-[10px] px-2.5 py-1.5 rounded shadow-xs shrink-0 transition"
                                title="Faturamento Parcial"
                              >
                                Faturar
                              </button>
                            )}

                          {currentUser.role !== "LEITURA" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteIndividualOrder(
                                  o.id,
                                  selectedOrderCode,
                                )
                              }
                              className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg transition border border-transparent hover:border-rose-100 cursor-pointer shrink-0"
                              title="Excluir este item"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {(() => {
                        let label = "";
                        let qty = 0;
                        let color = "";
                        if (o.status === "EM_CORTE" || o.status === "CORTADO") {
                          label = "Cortado";
                          qty = o.cutQuantity || 0;
                          color = "bg-indigo-500";
                        } else if (
                          o.status === "EM_PRODUCAO" ||
                          o.status === "PRODUZIDO"
                        ) {
                          label = "Produzido / Zincado";
                          qty = o.producedQuantity || 0;
                          color = "bg-amber-500";
                        } else if (
                          o.status === "EM_PINTURA" ||
                          o.status === "PINTADO"
                        ) {
                          label = "Pintado";
                          qty = o.paintedQuantity || 0;
                          color = "bg-pink-500";
                        } else if (
                          o.status === "EMBALANDO" ||
                          o.status === "EMBALADO"
                        ) {
                          label = "Embalado";
                          qty = o.packedQuantity || 0;
                          color = "bg-emerald-500";
                        }

                        if (!label) return null;

                        const pct = Math.min(
                          100,
                          Math.round((qty / (o.totalQuantity || 1)) * 100),
                        );

                        return (
                          <div className="bg-white p-2 rounded border border-slate-100">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                              <span>Progresso ({label})</span>
                              <span>
                                {qty} / {o.totalQuantity}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${color} transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Timeline / Cronograma Estimado de Produ√ß√£o */}
                      {(() => {
                        const itemAgendas = (db.productionAgendas || [])
                          .filter((a) => a.orderId === o.id)
                          .sort(
                            (a, b) =>
                              new Date(a.estimatedDate).getTime() -
                              new Date(b.estimatedDate).getTime(),
                          );

                        if (itemAgendas.length === 0) return null;

                        return (
                          <div className="w-full mt-1 pt-2 border-t border-slate-100">
                            <h4 className="text-[8px] sm:text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                              <span>‚è±Ô∏è</span> Cronograma de Produ√ß√£o Estimado
                            </h4>
                            <div className="flex items-center flex-wrap gap-1.5">
                              {itemAgendas.map((agenda, idx) => {
                                const sector = db.sectors.find(
                                  (s) => s.id === agenda.sectorId,
                                );
                                return (
                                  <div
                                    key={agenda.id}
                                    className="flex items-center gap-1 shrink-0"
                                  >
                                    <div className="flex flex-col border border-indigo-100 bg-indigo-50/20 rounded px-1.5 py-0.5 text-center min-w-[65px] transition-all hover:bg-indigo-50">
                                      <span
                                        className="text-[8px] font-extrabold text-indigo-900 truncate max-w-[70px] uppercase block"
                                        title={sector?.name || "Setor"}
                                      >
                                        {sector?.name || "Setor"}
                                      </span>
                                      <span className="text-[9px] font-mono text-indigo-600 font-bold block mt-0.5">
                                        {agenda.estimatedDate
                                          .split("-")
                                          .reverse()
                                          .join("/")}
                                      </span>
                                    </div>
                                    {idx < itemAgendas.length - 1 && (
                                      <span className="text-slate-300 text-[9px] font-bold">
                                        ‚Üí
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Order Group Edit Modal */}
      {editingOrderGroupCode && (
        <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col gap-5 border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-3.5">
              <div>
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <span>üìë</span> Edi√ß√£o Completa do Pedido #{editingOrderGroupCode}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Altere as informa√ß√µes do pedido e gerencie a lista de produtos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrderGroupCode(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            {/* SE√á√ÉO 1: INFORMA√á√ïES DO PEDIDO */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 flex flex-col gap-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span>üë§</span> 1. Dados Gerais do Pedido
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {/* N√∫mero do Pedido */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    N√∫mero / C√≥digo (Acompanhamento)
                  </label>
                  <input
                    type="text"
                    value={editingGroupOrderCodeInput}
                    onChange={(e) => setEditingGroupOrderCodeInput(e.target.value)}
                    className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 bg-white"
                    placeholder="Ex: PED-1002"
                  />
                </div>

                {/* Cliente */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={editingGroupCustomerName}
                    onChange={(e) => setEditingGroupCustomerName(e.target.value)}
                    className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 bg-white"
                    placeholder="Nome do Cliente"
                  />
                </div>

                {/* Representante */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Representante
                  </label>
                  <select
                    value={editingGroupRepresentative}
                    onChange={(e) => setEditingGroupRepresentative(e.target.value)}
                    className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 bg-white"
                  >
                    <option value="">Nenhum Representante</option>
                    {(db.users || [])
                      .filter((u) => u.role === "REPRESENTANTE")
                      .map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Data de Entrega */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Data Limite de Entrega
                  </label>
                  <input
                    type="date"
                    value={editingGroupDeliveryDate}
                    onChange={(e) => setEditingGroupDeliveryDate(e.target.value)}
                    className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                  />
                </div>

                {/* Status do Pedido */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Status do Pedido
                  </label>
                  <select
                    value={editingGroupStatus}
                    onChange={(e) => setEditingGroupStatus(e.target.value)}
                    className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 bg-white"
                  >
                    <option value="AGUARDANDO_APROVACAO font-bold text-amber-600">
                      AGUARDANDO APROVA√á√ÉO
                    </option>
                    <option value="PENDENTE font-bold text-indigo-600">
                      PENDENTE (Aprovado)
                    </option>
                    <option value="EM_PRODUCAO font-bold text-blue-600">
                      EM PRODU√á√ÉO
                    </option>
                    <option value="PRODUZIDO font-bold text-emerald-600">
                      PRODUZIDO
                    </option>
                    <option value="EMBALADO font-bold text-emerald-700">
                      EMBALADO
                    </option>
                    <option value="FATURADO font-bold text-purple-600">
                      FATURADO
                    </option>
                    <option value="CANCELADO font-bold text-rose-600">
                      CANCELADO
                    </option>
                  </select>
                </div>

                {/* Observa√ß√µes */}
                <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Observa√ß√µes / Notas
                  </label>
                  <input
                    type="text"
                    value={editingGroupNotes}
                    onChange={(e) => setEditingGroupNotes(e.target.value)}
                    className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                    placeholder="Instru√ß√µes Especiais ou Notas..."
                  />
                </div>
              </div>
            </div>

            {/* SE√á√ÉO 2: ADICIONAR / EDITAR PRODUTO NO PEDIDO */}
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <span>üì¶</span> 2.{" "}
                  {editingGroupCartIndex !== null
                    ? "Editar Produto Selecionado"
                    : "Adicionar Produto ao Pedido"}
                </h4>
     xúÏΩks…ë ¯ΩEt5[*P®B·≈G5An [êH¿÷ŒP42Qô®J1´≤îôïŸò≠ÌŒÏ›ŸÈN∫˝¢”YOœŸÆf∆nÃvmÏÏ÷ˆ√}8¸ì˛€?·‹„ïëôY∞ª•È4©â åßáááªá?ëœe‡áY8|öƒ”…∂ód{c?xG>‹⁄"„ië¸Ä4? ÖÁA:Ò∆§yi˙‹[ç,xóµ^Æv&Ô^ë”xúµN‚»''Éñ7:	í÷jßChˆÛ¸úºk≠ë…E´”ﬁ$–9tÎ∑FP%N¸ ·ˇ‚kP‹á#/Zìiîçáñ1Ú,ˆc‚d◊Ø˛xı“ø˜≤`D>rLÛGdufõ›
NØÿ«íY¯¡äû=¸¿|/Uÿí–'¯üV?é“÷*IG›¸Áâ œ2&≠u≠w©e¶ó+∑…A˚”,&+l~GÅóÙá‰ˆJq6Ê`N#ò7˛ª£}—Ò¿èNÜìëóÖgv ?àºì “î´MáúF∏Jw`≈¶ìIêÙΩ4 Y‚ıﬂÙ[Á!Æ≠Ç+éÖ§ìZë≥¥c[ßAk≥”i<ºÌZ0\!:`Îßp<ôf÷˛≥ã	Ô•a˝~ÊE”`KC™}ƒW7[Zè∑áﬁx Uõ¡ŸzH.≠≈IÉl◊›x3hg^2≤6»“'ıZ¡ˆ¸f£·®0≥zy˝`$[çùpfÈ_˝≥bO…8ƒ˜»$∏˙£◊n∑ÌSOﬂ·_÷ë  ÓqBÄäÙßi7A¥YSÑcÏûö¨¬t§"R†<ÁC©m4+6l¿]u4Ç4„qJvíx‚«ÁcÎ¶Ç‚»"±,AâvñÑ£ÊR;
∆ÉlHíéã∫w≠wí∆— ü≈ì÷)Ê(8ÕZíÑÉ!˛˚9 Ñå2ÿÃbÊƒg§§∆Ô"í=ò#˛5ÚﬁµÜ≠ç{$>í”^^¥<ÿ{é
 O⁄–À(u|'§}FYêÿ'»ûfò·6()AHòµ˚±îñÅŒ≤¯i|$€@oöKUÖ√q?ö˙A⁄,].µ≈%ÚÎ_WsKım”Ÿ§˚K;ç¬~–Ï,ì’NI©ë7iÚır -{uK'ˆ6∏ÿ∫pÖæùﬁàà%Ï-– RR);±£˝8	§£ÆInﬂ‹∫‰X8#-B‡ZœﬁT6û"é∑ß„0;H  î±¬Ìwé©rRÖ°Ω-iÕVé£“¬/ÖçvmàD¢{¢–b“ü&iú¥&q8Œr¢s¢S‰°≠¨Àﬂv(#B~9ö{z—:	≤Û JVZ˝Ä∂$¯†íñ”èîE++aagÈ…='^ŒŸ…ﬁÖIåÄ'uR∆¸ëXS’Ωì}©§ı¯´96äƒ706ŒWuÁÿÓSPÈ°ûºAﬂ£ Ò"üÚ†Ä£‚Á&9V}u°£¨oÈ„ö˚$|¯ÕµÇDPM5¯J©ÄÌí£≤≥ö•º]äa,—vú,*V|ãÚåzNY ¢†o,Ã˛v≈IMﬂ ‡¥™…¿€õz/<Û|≤∂‚	r»,ç∆√Á¡x8y(Øy~b˜ÉVƒ^ˇ≤ŸÙOµΩÿ·`iS‡¨»ÀWKÇ]lzl^Ö0≤î¢±Ωˇtˇ∞Åt¬„ Sòh«÷xDzI‚]¥Oìx‘Á #g7“3ÂÉDI˙N0ˆY¸QñsbN^¨KˆO~	»∆*ßM⁄«ÎgΩ{ﬁc°î˘C˘+Z|&pó˝rS^¿’pÈz⁄)–=∫£äu ®Õ±7Ú∆√¯Oê‚ëõà£s«V—$¨Yè$i∫Ä›w]Úlôl¨-ìOøA©ˇzí~˙}Ê%°«4ázò˛€DB:
$ãa¢¨æ :Ó¶ì†z—ü:˛lÍç≥–˜¸Ä«ô˝	"Âœ2øÕˇ-)q«SºB®çøt¨Ÿ≈b8¨5± É§lÚ(o5Vøi´â7åËIpı«ò†n„ÍÀ$¸S§æÖ)4oŸ¯π˜Ö iL∂ùv«ÅTó™§≈–<◊DÕè‚ùe~ˇâëËÌa–{øY®Ù˛Œﬂˇ˛Æçøö™qx√∏åõdMì≠≠¢¬√PŒqïö}kﬂujèJS`hüÉ√•≠£ﬂ_«√ΩÙ`œ8sâUà(ÍÁx»ªqÍU†qD"˘atá=âF‚Ä"CXõÛ÷Ü}j÷+%Æ∂z¯ıˇ€$lå¡bá‹ü—Z$Ò a©Ô≈ã/∏“»ıWùŸÀŒ^^w›˜oâ*ÂÃˇ≈Ø˛Ò0L¸/….û¬1ÎP°’¡ £°Îc?.4Pë≈Ò‡´ﬂIË(…1∞AòÑü{˛"∏`UÍ⁄è'<ú«=ç¸ò<âì—4bú	¸Ü≈s zJâö`ÏSLsKU÷DèÏ∆D‡ùL≥,ó¢!+‚BByÉ»‰G¡∂7Ó‚—Æ9LÿK5fÚÆµé∑∏”\‹â¬ô‹eæ	Â˝Y~-Á8©˛NlZ}/€ÁËRÈ±©zâb
S´«eÉ„7¥GﬁY∞¯
l»(§[ÇîΩ∫+∏>f
a\Á)kƒ- “Qı
'ŸùomP¶ë§·Á@ﬂV7f@<»ëù¡jıPÌ]o¡Xh—È⁄w^…“V/¨±¨=ﬂßt•ü«ÍÚ⁄ó’SÔ$¬¬fIÛÎ_ìÁÀ›X¢êvÛÊÒDå§Oº>4è7Öﬂ.Ó8ˆ·A4Mu¥È˘a:Ã›‚ÄÛÌJ@÷∏-Ø¥w‘hj˜ÍØØ˛Õ>YÔíß{G«=≤B∂{áá{œºOvv…¡·˛Œã„˝#≤≥Ovwˆ‡Û‘©ñÏãgMÈ9e3$∞úVÜEµ à©oÂ"ñ+$U≤∫ˆÀF∆˛ÔøÂ<ÄXΩîå≈Úë¶vñ>«nçî_|Õä∫Ö+√çäŸl•ÃÕÆÆsÒí¸Æ=?œ–∫ó]µØ*[∆uyBÑæò{˜≤AékÌ4K‚Ò†0.e;ÁÀË∂]≥%	ÄxnSÑf:-ì(dÈtD~DöQÿŒT⁄Ñî´≥¥Ïl√u]π4sOö0€Jª•†â˝(∏ñs9Ó‡˝h« —ô{s“∫√pÖÔŒ3≠â?|/~©°¢Çj‚h∑G¬Æ£…DDN"}J'lsyÄ/^õº»¬»)âir˛ÅëG&^‚… 	_Åv=ñ‹~‹ö`©aü)ç1á°ÔAˆöˆôõ0õŒ;”¶Nº3†b≠Òá‹∂é„@z/ÖÀ$ÙﬂïöËı„qöQ˙∏ÚK≤EÑÈh˚÷°Ÿd*lá>E*ÿR!ÂúVmºΩîs ¶–™]ˆ¿a|üıwÏIÇlöåKê*Ïô5£ˇÆÃÜ'_ìÀ7h€_<.ÃìKÛPŸã[ÂÉLJK¢ÖD„$Wt<åÄuíJ-Hô˘>]“0ÑöÕŒ ΩrU´xfo‹∞+3ú™f– ké[Á‹“–qCP—d·\_cçù'ﬁ§“xÃn¥ßp …•TZm’ƒEƒ™˚"B}>∫‰{Ó5Cƒ≥©±}ıªÁ9#G}ÉD€]QñL«}¯Qœ.ë≠q»o®7»ﬁ˘Ë÷•§eH3œhã\Å\«—iäx?∑D§ã{¬U«“Ûâ˛∫€Y‹
ë¶H>¸t˜˘Ònı8kÕø“ÄëHQ∏ﬁ4î ƒÜ*^˜?˝fÅdË$oPú6HH)îcqPQ›dÔh˜õUK·z4x]%Ö*πŸ‰‚%œË”qHaÍÉÎ◊G√Ã9÷¨t∑„§+dñá≤ìYœnÙts¯âäÉûﬁ±7“ßá}|;≥;ÜC7<≈œ<ceGﬂŒ<ØaC?«¨Òn?ü6öø´]´ÊÔﬂ0*ÈáÎ≤^)Qìæ§√$ømU˘RòÕ±≥ΩÚ‰ØÖâ¢?G‰$äKt˘siÍ&fÄ/7∆4]qÁ®9uÊ≤QTŒ‹&Í»óÊ„∏Y¸ΩÅ∞Jî©∫∑…ü:78˘cxÂ1’øÎN≠âöÅj–j∫"ddåÛúâñ
{x∑x„≥j‹ΩÂ"sù{4a¡Hp>^BÇ4Ñ2©™n"à≠Æ%˛ÊÃuq¨‘(ΩõS }s´}åb˚ﬁ¨˜Üæﬁ“$G.77»π·≈~◊è¶°æ⁄®êf˙¬X˜„ƒKák7øuƒÖ>ª‚8<>¨-Ÿ§∆ê„jÈYÏ{y«HÙj›Y-÷ÖB+Cy¿ró‰ÿ:Â[≈ÿπÖ
ıÊæ^~–D√¿,◊ïkïF∫&º‘®`sõÇ‚Í	;Ç¬}Å7Ø	…‹< á!µ
zw(Ùj]ˆV_ÏÊaF®¸7of≠éπÜ„Jp≠‰‚v∑ˇØ∏‰∆«∞RˇìV‹∏«z·k_¢¬n4^h?k˘_óÃô+È∫Ë<û°Ww$ÚV$√÷hQÌ&Ue¨‹·—*‹Zp˛≠aQ};l•˝µ‚fl
•€‚n<RálÓB¶Ç_Ω£¡4¨A3ŒY(ºg9o≠¡]ÕÓ_^ﬁÔú_ÈÎûèñô∑Ì4ã'I<ÒÃ˝E£Î>´˝§µY»$ﬁeöúré›q˛úbÖ[·»d⁄iÎ˜;∂[Öìh ∏∫IdΩ
©£aÁ˜ƒ^∂i€á{£lµ“∑ § Û(êkt·«=a,R^,Ò≠j±"•^∑b=îìÆ•»µÕ‹°}îÇ©:ˇú®ZÄ‡úˆ◊_¸Óo®÷ˆ∞˜¨GmJÆÅ+√5O
(úéƒ5cM}µ‡:÷I¿ûF.†eˆfR¨›«ˆ¡ ƒa“iº¨w7e≥ l¬Ÿî@ô)å&â#Ó‹|∞}–∞áµ±óÔÌ<€{>WçOwwüoÔıKN3ìElkGÜa≈î,0õ4≤E¥µq«M±ü ÓÚπ ‹T˙sVpÜ\—É≠∞SsHõ4˙„é¬“Hr:Ù≥aOöõ©’ét˘˜†DrZ8„~	iÁûS⁄πé·ÈbHpL†–‡˜ç	≤£¶ŸÛM‡D~OlØ€ÒB•ﬁ◊∆>ìqc;û\\3¨Æ¬ÍDü9ô≈¸).Ñd£Ù”√æ
Ù3äU‡vZ⁄o€'‘≤·_ªNFß¥Vœ»≥hŒµ…≠)
ÜEbéõvn“ Y#óo5™’Öa	Ë—	»{E[èu´ÅÁz`i0
>ı^Œßûê…â√·noåFbBÏñ∑+‡9÷-c)
∫∆Ωˇ3Ç‹F-#/.´∫ùŒ}C”!(ˆÆïØDX≠Œ…•ïÁûéX¶Í¯Év#2ÉÔeˆdNíùõ4Z.À”wá
Ì;¥Tf(ÅZ3 n‹U«Â^/}Eåã©…’ùÊ≠¬`«ËY+2™Õ
ﬁ&ﬂ‰nëê≈„íHùÜ4BÌ8™√òåœ‘LÄ-3I.TÃo‡ˇ|∑—éóy4¿Ù8KÇÅ˜^÷≤öÚÈp˜É(Ñc¯∆Êé>˙à`,,R~9În⁄m“é!™0iﬂã,yî°Îd≥1…ZèÀ‰¯∆QóÒ$„∆ã„Ì±x/àß{É®3áª‰Mq'7»Ñ £≥aEÇß·xË°‚˜8Mb“Ñs∏§)4?Œb´càÖπl∫Â&EbzRf±¡_÷uë·”"⁄`ƒ‘p{÷sÿq∑ÅŒöMoôú–6N⁄à2iÊç&§ÖŸƒ/´ÏTj¬]m%l„9å$∏≠{<®ê5£ #^©‡SÍ¥çZæ: (πe∆ºçàıÏ¬˜¨”Ãœ≤h§„4{á≠~f˝!¡I—ÄwÂ¡h)âlPgÆÌﬁ~£[JEäßüá• »´© (™> Áü∑¬Êès˚g2¯:‘π∞Sﬁ∆IxoÀä0plÔÔæ¶ÊìÛA¯†-Û
ü*v·q»lO≥õÉ…¡ﬁÛ„áΩ91‰‡i‚Õ	Èº†öo.å!ä„7àªœ˜ûˆ>›}64vG'^TN/
‡(-I85	Ç±˚ïü:ƒ]bapb ÜõÉÊì"÷≥›Á«s“ü'"◊‰GòûI,^,îΩÒYˆo,37iØÙi™Ùj‚~M8Ú™0ÌÊŸ™Î1ÿú›IÊºÇ\Awóì÷∫ú˛Ç˜•ŒG’∆ô;CÛÕ‚∑U´¶øçqµó‚Úîú∑÷ÓiNé∑.|™ÚV©4∏T0˙Ωÿ√îÖ£î&í,ÍﬂT∏Æa¥˘£Kπij˙ˆî…ß‚ôé€d'uä⁄Á¢ÛÍB„Q«˛òÊ)úÔBC5•º„T∫9¬ﬁäèº,N tS˘ìk©Ù∫7Â	ç˙@(qûÖQ¶Â9J¥. Âma#CÌwsïÖ[Ài>T“)Ò7¶ÚÃÀÜm∫áõñY≠ê;xñfàÛ’S˚ñ¸^§ÛgQsAaóìTaå˝†5ék9%^Je e˛•pe„À”Â‡O≤Rk?Vˆ}Øxﬂ/_-◊»ê1åßIó4÷Z>Ê&jî)*ÿ´>≈k˙⁄UÏè˘s]#L˜ç†≥c´XÎ>z—Ó1∑ÇDõ»$)\¯»c±p Õ}NW5ô&ìHqå‰ø´“VÏa2ú‘ﬁòèª¬‘ı¶ŒΩ:ÛJ5‚•»TÎ√ÉØy¶Äû˚tôfã•jZπàä≤L2¸ËesÎ'´	[=¢ñ€12+i+ù"–ΩrÃ)–º"M#≥Rà∏gTä%›Gä‘m∂‘ú#‰êÛÖÀZ5dB5ß*˚Ç¡Í˚4S’ê‹©XÆ6(˘∆5∑DXÜcrÍ˘Ùﬂ4
È-L{$)À‡ü" 4>0ˆ†eÄ™«çH+6ı¸AñÂ∑i}ù”L‰[ﬂ†-∆Á\íﬁé«ßa2: Ç	F¥¯Í˜˚ﬂˇÎoÎ%Ñ	ˇT5Nv–G-Ã¬≥∏Å_Ò€ˇÃøK[ñ"VïÁ‹∞Ñ∆eö$°e…ûÅã‹zàùXg—<ı¢4Äs +(1ŒÜ‚1co:™6<ˇÍˇ°0˘rÌ›ÂáŒ%1Iù≈‚œea¢ÎÈÌó!U∂úÓ√|vMéarı%Å9˝<—~ä%¶ÛG£ ≠ü>ÈT⁄¿3ˇj‡#¨‚8%^ﬂ;Í0Ï'Bä¡ä¨∆¶Ùuëp;€=◊•ÎJﬁ^±{kÑcw…äS±È∫£U£∞πÌR\Êºúùó≠+ú;Ï&L1K'≠2n¬Uø‹~∏|Zã›™óØ_!qqÔÿ∞é}ä'IrÛŸ’óÔ¬⁄˘ Ö£0s‹#óƒR&ubó≈ŸóëÙ˘àˆ∞µy¬Ô)ıÍEŒ∑≈œÖπ<ªùÊ…Ú4“ıXìﬁ"êàíèÖ:éßYéëSÇQ•<M˜}ﬂ
¯ñ-◊Rπ™Ñ„≠KknGPÂyÓ˙K	€$wI…
FÜVg¬äò eÊ Ôù3¿«ÍRh#bösú$ÈVá⁄˙·IÆÇlqJåyÁÄök{PsÖ_—ªñâó§∞π≤¶∫?if[óéÖ¶h∞=oBòÊó∂Ù ÉÚø;Nó›òÉ¥ódÕÜB◊†ç´/Å=˜⁄¿áû#çº0N¯`œ£x§A~‰Í‘}#ƒÆ}ú∫$«{7∫eâ3∑x5rÌJ:Í“ø(iQ]5º‰)´u·C‚®xyWG”‹OsÑ«ÃWˇÓ∑s·¨√¨Hcy√ú/MòG#ß
Îur˝ %èΩÒÿ‚1mÔR?JŒóïçéfıN?$ cSV±} Õj5ÁóãÑ—IâJâïÄ§Ã<çÍé§:ß·ﬁ∫~¥ö«$•zVÊ“M∫ËeÒåÏ^˝uØy‰bz*X¿z® ù«]—IÎ0˛D[⁄ lu¸YU”8˜ö◊π¡ìaE∑Ø˛Mgî»√Âó=.yè5y_∑ÉÆñ ≈∑2U€|ª∏Aàq«o Nö‘Û~A5)SMœ	!Érs‡ëë3πN%lAj†ÏÇèéIöN∞
ÛÔ∂~8[ZÆıI
rÕ≈(≥9Ÿkì˘ÃmπÓ+w«Q‡˘4!0ô®∞Utk«uÅ"åY/∆4µBWŒZË	Óy¬M5å≠ËÜ|©7ƒÛDFÉ´$ÿLç${kì›4ÛœÔ Ì{Q¯πázßò¿álöÊ!gÄÙÈß/|u¶∞ÆæÃ¬æál"WŸ5<eÚ—˚ê¨AnVb™äæ9âHØÕh~ıÔ˛ÚYeﬂÜlT)L:ÍÒå9¨<Ø›\X ‡oÍåŒ0]áÛ∑.ÃM‰⁄¯ÍˇVπC»ÔﬁÉ††ØÊ˝V¡tüI¿<|N0ˆïKè]ê1—
“K/∆}RD?Tà›œá^ñˆ&ì£°ó‡u©∑dë+Q{ëbG@êiEY„!·óÓCrD	\—w:K.‰eìIÇt†ü∂wÓÖ9≤˛∞ŸXÒ&·J
]∑8’ÅnEKëQêcøK˚G«è!'Aív-;ß+gE÷:æòh¿õ0◊m@≤ï_¶ cöçÓZObˇ¢K~r¥ˇºù“_ ìÕbOíÏí≤%»y∆‚ùÆ &U¥¢-6§:˚T4TÓDwﬁ1Ï≈.ysÎ≤¥°	À¥§˝$§9Êg§ÖIÉª§¢¶∞ßùΩ)ÄZR|Ü’äy‰ãç$ ,NêŸ•X‹5~≥£ﬁƒ#Ô«Ã†ó±}ºêH-∞ºçhe“W‹ö≤@¸o±±r;ùˆëM)™ü{Æàw®ÁºÊYÏü2∂|ª-J=ÇÒYà	4˙Òà@®Hö∑.ÈhFYûF˚HGŸ§Åó∞ªº¸8Õ£g«‰0"zÂ˙4ê£p4EÛvddéÇ‰∏ù§1[*,§	æ	‡ƒ∫ˆ§É$Å˛úS~‚ECSÖ–I'$h±ıÁ≥•µ©á„.¸õ&ÖUn‡›qıî_3phì]‚ç/Ã≠9µ“ââïd£Ñ√+ÀÏhÌGÌÚøjd -UËá%sn˙ÃfH/äLR^<'ä\Gìô‚≠T˚X¢âïärì°•Ï3ãõ[^æKÎmP¢™î9∞|{d¨R{‚˘Gh[◊\[&çN√R}«»ΩÁ^j@i¸ƒ3Oê∆ì‡Ã|ıÃ3≥—;)ºzÊÖÊ´üLÕˇd⁄ƒÊ´£¿4ÖlÏOØû«Ö°ÓükØ^9`†`0y)Ä˘6ó,./)ˇ	,ˆ_¿\Ä4Bû¥µ¶Aû#≈‹Æ≥ï[ó¥C¸úΩ…À¢íÇ7++4I&`œ(B 1∆120åo<Á`òon+ﬁ)4ÌMuvõ|˝≈ÔˇÍÉn?ˇˇ˛õP1›Æ:⁄î(f∑Öæ•≤í~G|õZ=)\ mÄo
‡#oÔQ„Nß”ÓÌæ˙´ø´Í¢‰∞æ]˜¥æ˝¡ØüqÄ¢∞ÀÌ…ﬁhrıò|È'10‹˝ıei,Ó,ÛÿpΩ\]Ìº™g∆uï¸$û†ô"òQpj™m+Õ∫rÂ:f]ü«Ò≠πÓo:GR¢≈ï⁄ìóu:'´ßØË$´≥ôé:≤˛ ö’√y·»dPw'é"/9
chmmVå.–p\
[|¨üÈﬁÔé›F»Û`@√)˚∆*ÔY√ª8‘.%Ÿ=`ùr¿Ænñ™:è°ë"@ªÓGJÇ&íèjSü‚mZÕzıéã-√ﬁå'ƒ#hﬁ•4-–-⁄~ŸÕàJ‘Ñ‚Z(¿»™ÒÑá˜ÒPÌ3≠ pΩ”1EC+h√¶ΩsY˘’aÌ5»5ï÷ﬁ˙Ïx®Íné£#WVZñbQ ‚-‰Ó≥ﬁﬁSÚ|ˇxÔ…ﬁvÔxoˇ9y¸t˚ß÷»:iVMkñu¢ﬁMYÑ∫Rm÷ã•ﬂ.∆Gï7^‹;—ïÃ≥‰b”‘tÂ©,˚ñ^∫TWe13ˇ()c\PËbrõCß˝{¬k€äŸ3=»=[m/∆&òí&gê»
»òñ·ááø[∞±q˜&gWˇî@Ë|?ˆbLÂ(¬Õ≈,Íg≤O¿ò`P	Lﬂª¸_—~⁄@éñÅ%ö‰?K“nÃœã„X¿
ç34|Îb(<ÅÛ¬!H2DÃ¬ô¯÷™˙#?Ë4Î3K(0Nº≠£*3´Å» ilÛha—_≈≈SŸı˝>ó§—™ÁÍK©0Òù§9'ŒÉ ¡hô^;÷áÒ/¸ØbyÛ3 ı/˝´ûÑˆ»CÙ¥ÕV∂Vry4ÁUDuJâ<Ÿw®©hûoÀ÷hÉ‘7*∫à∞«o—wW^HpŒsÑ32-Ø>«˝<∂±∆⁄yœ/!*Âq‡Ò‚-Y»Î_W`ul`°ô„ı"E◊vªÌ"]^X&®<R¿lÁ7‰UàÂ„ePTeïÑ†v{ÓÎŸT◊lπ1ïìE€ΩeÈS-√£qq∏nì´Jù’E>U≈ñ™`ÿ$É°€Ã´ öÓ“¶EÊì<1äΩQ^ŒŸ¢+Å”2…
ÑÀ›Âf)Ïπ üˇ∏w|‘;8 €˚œè{{œwøÁ'ﬂ??˘€ˇãl«#8J≤0“ƒ◊QLÑ–pc%ÆÔ∂á—À∂É≥ïA:WœzÒ€gEl
3x/º&éÆÇ’,W‚ÅÀ™ÕynnÆÆﬁ«Á<uŸL'ˆÛI…ÿöM ﬁYi0D(RÚ©puƒ 8ˆ∞ùÍHZ]¢3»m`æPÕï_Ï¨ñI£±T’Ry¯Ä.Ω√p∑·Úﬁæ£û˚l◊fŸ≥¿ãË¶psÏspÈË4Xç™e·G îkäôÙEíi)J‹–πÕÿ∞s¿L«d|ıﬂ‡à¶&¢}N©Ä=yåŸf∑h6NöéØƒ
∞,ÖñÉ^  Ü¡9ﬁIH˙ü
ëîﬁéAzÒ]ëSÀh#ÏX◊∏äoªlÉŸ+Kœq^*ﬂ1E£Æ ˙aπÉuŒë9˜∑º»rIπr±F–˙uΩöjG0ïÜ|‹˙
∑Y“Ïv~õ%ŸÅ D¬*Å∞h€Wz.‘
«ˇéNOtåﬁŸ%6Ô,ˇå$	ãƒÍÙákøS±õÇ•˝{g· ÉEµ˚Q89âΩƒoü'ÄÚà™Mm~Ãõ…Åˆππ˚ls´v"åNz‰ÍÀ$†°ì)dOÉ‰ÍQÈÒ°#ˆéuV;C7(Üú˙ØõUÀÂzà@…]"…ﬂ7Çπ≤•∆˘ji-îb∑‡} íc≤UnfE;í\ìã3ÂB±y–Dåmö†›„õañM“Ó
⁄∂œqlﬁdÇä0jD¯àémÎ÷%ù»Ïà +˜c?xq∏á¢ÎõD5#PüÛpÏ«Áôm‹ÑﬁÅ5|‚⁄¯m√1ŒZÑÔFvBÆmï[_›6Óº™÷q°†™⁄∞EI±ÎπjÊ:9†ºœ≥^ºfπ¿XíﬁI&nu˛‹'Œr%XÙ˛„íß˜Ò“Ï∑ù™mFFf°ô¬—Ú@∑VñDÆØ€m\ÈÀ+kPòM3FáA∫¯9u1—/[]∆+k»^≠˜”¶•ƒˆ0Ëø›ÿakÆº?E–◊q∫5°?3πn”àZ{k
+…ËxÃƒÂß⁄}·2w–Pî@"D˝g∫ÑYı‚úí˙[ÊA»_R2˙Ê÷%wŒ˘5ê˛¿⁄¯Ø¨Ö¥ÂÉ‡›$N2r:”àò‰Ë≥OvH≥…^2˚—Yó∞øD'ÄîîPk∂2“≥ü¯yËg√≠∆)≈ƒ<ı
è„w[çÈêµ˚?Ò≈?èíjâ≤.dA˘	∞œb–¥ ˛}F´bSkUp@rAˇÀ´ﬂÕkﬂï©^ÃVyïV^ïï7Û õï=Ø— k≤Úz^yΩ≤ÁµµÎå{m˝Zﬂ∏Œ»¿◊÷Æqˇ5@æq-òØ-8Ò{ÃWÛ ´’ÛÓ0üØ∂â-Û’ﬁ§µ◊¨mŒ{mû⁄¨ÚÊbïW∂l,8£Ô˘jﬂ1˙VFæVsì‹[¨k∂ÿ´Æ6#˜É8√î’—ÙÓµ~ﬂÄŸ|®≤~àÛr¡⁄◊õ˜™9Ò˘êeı:C_€ºVﬂ7±‡ã"'´◊£JÔÛ·€›ÎıŒÁæ MÁˇÇΩØ›πﬁ‹uC\„0[]tßsuÁz«Ÿ¢ÊzsÁ¨◊¢søg20sJ|«¨]o«¨-∫_“≠- ‹79«ÍﬁA‹;‰¢úô∏s>ﬁS5ôîòòƒ$>ºÂFˇ¸ﬁN'Qò5Wöø∏˝ã€Ì€èü•ï˙πPEã≥LP¯Á2	˝:,·€6∏ù˛<ÃÜÕ∆Ì€,Û5˝å}ÂuÓÎUpoÒ!h
épVÉÂ=VIJÇK6Í"≥∂LZkä›˙¿¨ ¿˘h®ÉLH÷XzfÉˆ65$~Ê%o˝¯|ÏÑ:.âı∆/∆“¥œπ§˝w¨ÒΩÎè>˙àîÉu∏¡'‰ø+jî“ë¢Ïe≠u]»∏›4!,1åçÜB{cIıp√
fÎZàB•9Âù2©Ê¨è¬4k˘a⁄∆QÎ∫©#^~q5r]ù…ÆÈìç¬Ú…2≥>fQ’(ÃîÍô¨+4DÔ¶¥±‡™Ä–ÉI…˙÷ö{>Â¬ÑÂ<e’%e#P›Ê©◊èïp4Ç˜FzÏù$Ò$•”ıO®ß'V5”Nw	KŒ]A€°%üó4ÉBa¶˛qó•ñîP.dˇäç(À™˚◊:Í&≤e¨ÀˆQ-∞¸¡¨[ï0ºL/È6íãe÷•¸˝
∆4–¯,h6±êµÿ¿é√ yBS.´„Õ_ÎmÙû>m0@©˛+’Ä
··óﬁÿ—ôégF§´ñä4àMö±\âTqõáy˘7 Û‹Ÿo¿	°	”¨…Y@QwY˝ªñ'Ä¥†£6èÑ‡À∑~f	≥∑,LUÜü¡j]<K5ﬂ◊6 Ï«Ò4Iõ´pZtÿˇÙj ü«^z„∑ï|zr≥ra
;Ä"~àì¡â7Ú˙^¸âVN†#âÌiLï¥•z	:‡«€≈1À∫]ZØ=éœs◊^1¬ßÃ˜W¬Èw»‚B‚•´Ò˙'⁄7lE~[ﬂ¯ÔUN®4¢'ì#ÃˇÁ£gpª›Œ—ÈïôSál†ÔA%e%öû17,Ûÿ(s≤§éõµÇ»EÀ 	∞ö-÷Ka©∞_=uÇo
bÁ'%yoÿd;¢Yòπa–ƒ ‚ÿ–Q/• bGY‹€%áAˆ‹Æ^Á ˘á–ÒÂå’áMôbQÿîq≤ÎıáÕfZƒWÑFä[r¿ç|{€Ω«∏!U?|ΩÔói;Ùëé§“ßUﬁ
YGÆë}˘€n«07ñ?né=Ø/ÖªÃxsÎ2nÁ˜q[ﬁ@ƒmqÁ9úgøÊ∞x£∑ËùyaÑó<º«W<øù^9¬gàO34ç¬qSùÎ≤—æúé≥—ê˜ÆŸ1kcÊX—„í1î>ﬁÇ¬∫	ﬁö)˘5ÿc˛´G§ô|E˚æDn¥È¶˙›!Çí¨ÕO1õlß'î€¸ƒxáúÕU…÷Ôç”ÈiÿßéJ+Õ∑osıÌçhëª©
êQß6I=xï˛⁄]≥∑€°IÀ¬´¥e¢√√-\WK€Îˆ∂°«DÄ¢«Bˆ◊ÏÁÆ≠õ{7¢átÈÒ"“§ı?^ ªÄÁT6oòsñÒ≤—Û∑˙Rﬁã-êø2&ì`+Æ˛~™
¬)-&(ﬁÃå#@!°Â«#6ƒi~@[[ıÄê›Æv…j>àµ.YÀ≠w…z˛k£K6Ú_õ]≤©U2ûîr(/1w5pûüÀ=÷ ùàr Œ·Õ·QÕj»≥öiÒ˜∆0‰q≤∏ó⁄U≈Á;∫yie˘®º§p‹ÄS:´me¡õ
Ø?º⁄éßH∞ç⁄2	y L
9—]jG¡xêÛ&©›•í?¯˘–›ö<–ΩRﬁ(âlŸNo¥û‰±wÚÆÛæi€p*jP,ùï*« ;¿$j?¬”TÜ9£ä\ï©]îØ4Á1®åFcÌp4V#-fæ»_j˛ÊÑYE‰©-çŸö0Îjø‘‘za»§ eÇ!≤¢w‡á˙—‘“¶"DÍÌƒ§l_A8‰ 
ÖuµŒ>©¨{p∏ˇ©£2.¶XÿÍÜûˆéwK˙¶≥6W@œÍ∂ÕÃ¶sì•ìy1UWˇîç‰Ó…πq€ÄÓv ã<‡CñE‘°Î/Áõ¬”˝ü◊Xß‚pÓñ ì\≠	u”¶ïè=Ø°KÉªÇîEówFµ1¬æª\Ï∏UZ™F⁄∞Öf1ÿ<Å˝}·⁄H„µ‘	"Ûıø˚–: u˘@˜Pñì9)q3Ù»-ñ‡!‹yTÈ\L\¯4ƒ0æ~8æ˙ª‰ù$aúÑü£Â3≥vûƒhÙãÊŒ˝0Â#S#áß#oÏ©&≠˝d˙9ıÀù$ﬁÁq∫LO:Œ˛b<íÄ»†øéÁ$`·É€ ‹‘‡Ë.Ú≥i2*úR2HÄê´æ"ÊJ”¯ƒä¥µF¢A7ˇπ¡m
UñÅ|17©ü£é(¸”™ÓïQà!o⁄›!°,ˇﬂÿ|l~AÃWD≈∏ªõµíX3WjÚâﬁ}Ì!Y“({∫ÌXúD/%4√ü]-+ãKÑuΩ˝ç-s¨Zlπp ◊Y+!˙•7∑N8§≤EílÊM-RÓ)^\(ÒÌÊÎøÿJ…pÕ◊X-*Lo« ±e7πb21G…™ÈÃ¸M-]iNçõ§Üˇi±EÀè∫EóåÂZ÷»ªπı =˙\´e:L<Z`—¥ü∫w]µ'•öHªºÙ»g©êí¯úüß
•!ÄOÙ£∑Ë+ÓÚ◊‹∫O”>èä‘gÈOñEÄ!O	Úò≈Ö¿ ‹∑\Æt[¨!Â˙Æ<∆PëyUñã.)“!ôZ>l≤<õÃûXiVw0`,º}J&s_gffù⁄,ôôD˝í⁄côø:mc∑≈4P'ü+o«æób¥;∆∑br≤Ù¡
+XZõ
∏îÎ"ΩI0Ü4&®VT∂ÂÃ@~.≥{ıFA7PRﬂ™ûµZ …fÒõø%}ÍŸ'L•Zo2 ˇ=¸Íˇ¯ü»Q0íÏ˘ËÍü∆ò¬≠˘É(˚ƒŸ%äC*îÛÌßqT˙Ïπu-ÚåöæQKäK£—”ïÿóÍ‰êe(}<Ú0&9~åQ™Auó∆–án,§"XeúQˇ¶2Wú∂5†(ŸiÕjvë≈†¿N¿—ª∂‘Íœx# ∞BsÈÓËƒ£aŒÛ¸ˆüÍvü=Ó=≈À∆OLOnºb9Ò¸A/êrbU¯ÖÂq_
ãbF∂ıî˙ı„PÑæ›YtfÄ#CQª4-^ÍàGπ"Ú©‚ç2v˛∆6x¢ΩA)°√ﬁ≥ﬁ’__˝õ}We
S(£‹«•KıD∏åtøì≥ˇ $gù∫w|ÿ;bk_:|Vº|’WWˆ	©2É+PïxUkjHëèé˜ˆbóR‰ π˝·ÔÁûÿ›Ûb1?‰¨ÿœ{yf√ã B•Xç)Ω°gƒAÔp{Ø˜”–´fJ'ã√[ö}ºdÒ
6∞Ò7Îös’¥Ú»Z‰#-wÂîæ˙Õ°·MûΩx≤∑Ω∑˚¸x˜&f∆ö-ŒÕ$ñHﬁÏqÑ{£Ê|íﬁ˙^œVu•ãùﬁÏ‰+πS¥-ùhÅ˚r≤ÙˆdX‘ºÀ]tÎE∆–ÃÓöñhV7jªfxé[Á-[ÿ3gXò⁄aœhs>•<üû„õ‹Øõ®¬´ö’ö-±c\‰÷%ﬂMÆ–wÓ‡w|¿/%¬;hrôÔ-W´Ââ /.°$ŒëEh>ë—òDËèªS≈@_Ø…0l ÷U@¨-™xIú$™ E]ˆdE$“uèæŒx≥vpæ«≠+êû·Œ—»0Ë≈K —≤…©Í∞F(óÆÌπ‚≈»ãÍªˆE<"YÑ;ÊlÓ[`œ=i⁄∏Îè˝◊¥“Ãí§¿-Á~smïs‰Lß—%ÊUs´1+áï≠—ß„8‡^3w⁄(¢a’†©1&q«ìR!.≤v‚ò…ØÛhªóø/õç“ö4Û5B¸íƒ˚'fÉGÔ±Ç4uD*´{¥–ª'§ZZ*çí}Ó8˙$'µŸ—ì*KräˆJà°zl!1®ÒÉ„&›å€¡<YÆkÓG
ãÀãJÊd˙Ü˚x√'Õ."`y|DÍxE3∑IMÊrqH¿ZrØÂè#+$>KˆZTÍ⁄«2m∂ﬂK$ûﬁT√ªç„RÓÑêö6˘H-4Æ87%ùëïä}¶U‘FQ;]rŒW2‚ãüPŒ5˘∆úQdõSƒé„.Râíw
,oÇ©ëÈ•ø©ıÅà#óGöÉœ‚ox=°W~˛uÊ	Øq,lnÁ©;É¿Ü9Íñuò’≤mß€ïÿÿŸR±Äáﬂ3ô¢thÑØ,m©Kˆ´…∂ùÁÁäÂabµY∂MPZ1€j.Q[-¥)‹aY™0ÎWÈ<	i ≤<>tÑSFJ≤p¸%ç‰⁄xqº›(¶Î‘◊.√ß[q^.ÃÛÿ∂ãÕ'ü=w≠WóüÍÿ¸¯‰bgPöMtYå'ËºÂ(·JÃßÎÆTrrÿ.VW’ B∫IåM`S¨i∑‘Çú†ÿ…ÉßÂbßT∏ÄËﬁ)üA∑O¬˛–ÙîîGÕßæÎkl¯Ü«‹äWq´∞=•jq`M®¸˙‡pÁ≈voøúF"9æ5ı–àWË£¨8ıªπ√JeO˘$ÅsyktTºZ©N√öÕ›¿zïœ∂+`¶Û‚√<+rÌÒQ_¢=üπHÈW;4>õ*Ä©/Ñ”TA¶*∫Nπ;ü/“=ÓMU:S≈ßç^M•SfÚ^äÕ§
Iœ5Ó£U5»(ÖôÍiU⁄A]ÙÆƒ?)~È ≤ÜU—◊+>kKPV¥Íî3}°õó¬ÈÜ£»2á§ôÿ’KŒƒY!ZuÈ&M5Ã§<6•›ñ{rﬁ√QQ©ª2OÃ}|~˝≈oˇsÖä—Eó}-ÄjΩ69kZK3Ph*@æ7"NJ«˚û(~‘«pÂäª}ö$ ¥):JÕ∫2r¿!Ω?¡¥Ù–èO—üëM¶ih•fó‡°;√«û1c{îƒiûÚÏïÍ%œ=®»ØôgƒCÈ5_hÓ˛Îé˜Ïï÷mõ‹ﬁ?<ﬁ}˝¥w¥{HÀ≥õ˛ÿ{éÓÒÙo∆|∫˚±«2è:Ã{'¥ˇû¯UÏ€≈L2O‚Á≥˝Á{«˚<qØ|ª›€ÈÓ…7O˜èwÛ_J≤_˘ÓË≈ßªG«Ω¸≈Óg˚Oq:Øµ·≥O«{?{±{‹À[du_ÏÌ≥◊0O>Vu™|}èA¢°ì›Œk·rﬂwµ∂îÙÇ9Ï˚4ˆ"⁄ NÒΩ6ã±RÔå˙ÛR0†°®Ø¿DÕàKÕc<º¯5Ì¯ıDˆz ]à∞»¬Så6ıHDÓ…öÙ≈2YÌ†)»zß”r>a∫Î·‰Lˆ‘7DÚÃ„º2åpÇ•Xò
¨|¨æ—*À4‘8q∑¢ïBK¶$ã	ö˚åP1õ2∆H[aZ„ bGçÀ”ÍIc∑6$ÔcZ˝≈9jy∞îèîV•“w°£=0ﬂñƒ»PZPBdòoµEoÙé˜>É-ÄËyºø·÷cÔm?≈S löæ‘∆∂∫¶ﬁê4ÑE)Hå⁄†º1∞-4_ √<<∂¿3âÌX÷ZcòúG]a¯HœZÛó‚\Uó9
©gwYÃía|Œãn«„”0e¡ÑÕ›˙…ä 
ƒc§@úëCÎ'Lƒä·éw eè˛•ò\ˇ.¯Lî2ßéZ0ëiìêrõ†/ßÕ r(ICãÿÇ∂$öà!úÙTœ¬À‹EZi–îYS≠Ò+úAR+V;™ªaÏ◊ÛÊØ0b ‹XÒÒø≤s€ñn°¡D¥œƒq\}¡ﬂm≤úòfx‡0NövH@∆1]}˘-‰GºE›só;ËjÒ)TÈÁ:"Xs¡; l∞l":DAfûµ∫ƒ¢@Jo/≈µ7mƒì‰ÃÍ&ü.ÇÜ4ıêWa‘®$d°.◊F*xÉ√•Nÿ¯á‚1»?Rò—˘ ±˚;VÜ˝](BoÚX	˙g°@~k«JÂøµ¢M⁄ò¢9x⁄{æ˚ÆS!ÊW©pY≤Lçá"b—íÊûÓ ∞∞Q’ñ$w‡G^r5haÍ≠lmÂeG˙ÃÁ1;Ë>ár”ÂQûmÅøVÂÕ7Ωßªá«=r∞‚Ä¥e,è˜…·.∞öü¡d—™´Gˆ_ ãGvwˆvˆªøˇb¸Ü¸H„ÚﬂÏ{x∫ÕŒ‚˛’?¢ùÔ’ó‹ù=ˆ– ıÍFd:f¶‘ËÏ'lÅEáΩ#j€µtÒ’_˝7IËí[ó|€GUqÁo©´›“[ßî;¯•GÛ+Ó=—;$ 'Ü#2
R†"L$=ı>–ìëm;”`≈”,âyûsÙËG!Ns;y„~Ä≤®Ω/µóJbLC˚Hπ(\R,J)q÷ñU∑Ô≥I’Öú¶¿‹–≥m®§ãΩ–ÉÈ01‘kæ‘†dÍIiÚ8“¶÷ÄmØ.Ïº›Á;hbW∏¢–ıy]S¢›OºZ“lpŸ^É8.6d◊ª◊#¶¶∆≠ibñÆ†£ï‘~4¯K‡“.k W¢	8sƒ]ı	Û|ˇi<®SË´°ƒ‡l›4GEw)¶â0˙Ö¢∞0ñVduKIº¥LM‘ﬁÕB"w«≥0ô¢ÄHÇ{„"„¨ﬁäÕ˚;3–Ç”+?LÑa>€ƒ|õ„—üì¢•7Pñ>Pˇ’èq ò\üFìs≈∞˚rH*ã¨T|Œ‘A‘∂^mËa!V÷'zó<Îñﬁ
Â#“TbÚy)´&‘©]“‘∫b˛≤¬kn'¨Tƒ*2‚⁄Hr CQ∏(OéÇ∞!îò=&ê∫ÍÙÛbÇ …´±xÿëﬁ%j0PKºH@fHı#å∞Kc≤2y≠◊^îû± ¢Ä›Y2Õc˙∞?^99=ìy£#á˜mÎ,Î,fÆ n!û·œ†ë*©Ïóö¥˚Q¯!ˆáõ»©ƒ§å∏˝J]Q1uµÄçÚù[	ü‹éb+Œ$≤¡£m?ãœE®›ônª,AIÛ›p∂UºeIoß*ﬁ)âoÊT|Õ'® ïòpNıˆvzÚêÙUyÚÕëwıOËB,≥B#ÑŸhi*Q¨Û@ÇnÕîÌg˘zÈd?Ø$ˆ±F¥Îv±c5XHh® E5LVÈq‡<Ã≠∑≤Béìp‡Âyã©NÄPyW™/P»&ÁLfö¶LdAé∑›új¬“¥ùƒ•x∏{ÄÃÔÛ„<U¥hNô&bä¢?n¥©êÕ , ê¶˘≈*≥qä_BËÏS°≥Øˆ™¢ÖﬁEûù0ùDﬁª&
?j£7õ£ﬁävDŸ]…t/≤ÿLI’®0ô‹∞XÂ¶¨ƒs‹ñRPñúÀ‰ÿ±˜™iË2˘Ã„≈∆üË›A«P¡n[mÒ≈Æeí‘E—-)ªG¿Ù˛LÚ∫æ©∞ ¢òM˘§æ+•;\∏ıàß¶ëßƒgõ>äñÀµ∑„mcÃ¢Ω¿äij‰‰F|ˆ2Lü≈„®÷˚ì`Ãı◊ñ/Âzl°>Õ+n{â~≥£*ﬁã‰Z’‚¡‘r¬tº∞Iú=¥Ì'∆K≠U¶Ω{(qD’◊·ååI"à2ë£’9Z:«Ks,πËiŸì¬¬∞ä÷ßt ==æxÊçΩ•0÷ÅZ5ÇE∞≠
ãáRPUôp%‡=¯ŒnÕx)ãn∂ø UÉ\1HöæPbÇn¶\j7 tÄ8
˛ı√ÇEhÄ≠ãF4< ü¯1∆8‹ÁgqÄ⁄ÄJ;?g‹ÈW*Pºfê€oâ≥M´MÍ÷%¿cñÎnFå∑(4É±èwa∞fÙgÏP;'°ò®–¢B9«è/Nï~P‘| "¡i
ò1ı¢ïﬁŸ4JcíyÈ[ç	MÎ¢ xä2Z Ç`…¨Q´4“8Öµ0¿l2Ù3˛ie¯\]\ÉRg&˛@‚Ç?÷¨ˆRâZ1i˘¬{#¬ß\±™éƒªR=3¢d¯®¿˘+%sÓ>j¥*.ì´⁄DùUÌF’ÎÎÚÜ∑ßôµ—“¡$1&P.'ó8$Î*+øRí$óü”0é∆π√∫ì4Ê'åc´±ÀŒ±Ñò"<ÊÎ@%z˜I%YZ= aË«qè€Œ´S·1[iÃ&ù—O 7¸Œ¢∂Á≥hÔM›Ωo?7-‘›’A˘IÆŸ«ïWÈÅÆzw"≥Rà*b†ÉŸ∂Û∆˘∏•º˙[´(≈0£ê©∫œÔM+^'ó	¥XAd™Wÿ]ISai{j:œ0ÌÜ%F∫”§ù◊Ó√ëSÔe¶Üz¨6tR÷–â≠!‹ßl<∏ú¥AíìΩo±∑y˛Uî±4.≈FµLΩ4c°]‡¶t¯5Ç}	hÔ˚îËøD÷ËÂ´¸3”‰òçY $vã¿ß∞ÃM,{ÍTﬂ9µ¡ÈÍ[Ï=üN`oµ@ﬁ„ )1ÈÃM}eUk zãmÍ“bπ™∫aÊÌ»E•À;ÎO≥“éj⁄fyõ7fèèØÜ«gÕ/ÎtTÀÁ kY/‹‚Ω±ºC÷\≈9*í“/ÕÊîe ò∆äd™F5°ë®Y+∑àÅA•‚‚FOÎÈ%´˙JSΩ◊∆ºº 	Ú»o*˝Y—X)ïO,mâÎOÌQ∫Äy™]ËÎ˙H=I∫‚«ÛB4+4˛è=∞˜ïŒ™nä‰ ÌóNÊ€\›õœÓÅ{rÜ^_ù–|[ŸX8¡W+gŸ–◊X:÷IŸ⁄µ®◊éó≤≠À¸	¯‰ﬁœ⁄j Ë*”®≥∫5ó«E µ%b™∂<∏“`„U[
GôÔ®◊t–ÔË ¥∫|pã€ÖÓúÊ›z,é¢õπ1≠!˛rØÁÖÓ{Az
]u.ÛØƒ˘_ÚOù!jmY \`ﬂ~§ñ2ŒP4Æ∂
ŒÀÄö2{â‘^.∑W\¸NòÏ®»‚ Â¢H?‰kû»EIºÂyœåb”‚‡òßm7¡3€gTœŸvÈ–Ò‹“Ä¸KJÌ…46y3
»˛˚AÂ"†-\.-[Ï›4S>EDE√Ω\TîøÑMü.˙πÚ>-lÿó£ó„æ∑‹BDß-Â÷!π¶ﬂqG¸£ÄjM≈|·ïõœØ?JTÎq ËW¨ ‚Ë¯]kæZ˙gvÈ*WOˇ®‹æ⁄•yHVXPí;¿[Hë≠RH ï\/WÃædÊŒY◊òqÈl˘uÎÓÛ„√ûr˝l^@≥MÉ`$ıﬂæGŒBè|$Wˇ8Ó√_-†–,“%∆:]}ôaZÄq≤øπè‘ﬂg7vM˘Ø…—rå›XHΩB´ó◊D˙èïPWÈH„&EÕÅU~º!™‰~˜ŸÓŒ^ÔpOuåºÍRA_n⁄≠ù— [◊X™ƒ0±÷∏ùtßÂ©§=‘ß6˝1.d]P ÈêÜ9ç∫∞T…v)U™ÑM)\J`R5`·§RCô¯$Aõ>ÓäFdÆC±*E-vGÅ^}ôÑÒÕ-¢∏Ωòû7Æë¢úÖí…<£x`h¢·M€º€S°hÈAC•GD	ΩSêãhè&«kPYyƒÍ¢ú”≠,à,´µ l≈Ú⁄ú¯πm)Â∫dèÓQﬁ5J¢≠íËíKMUóŒªŒ/≤‰BÎú¡Ê÷ΩO˝6ÔOk	`7z*O˘õøù£ÈyØD]M◊Ω-÷/bUÒzT3@äøsRiÆ•úº÷≈Û8OÅ€C,P@ôîû_ozä°ƒ©F1r‹‰!â¶Eò∞°Ÿx›X&“Xö-!qïsù1É6p≈6åS»∂ÃêÅ
á&-ø–åRPyëó‘M{ªÃ˛∑hB©Y0kJ¢Ró—5Æ¢ôôŒ4vOOÉ~fqEf∆;ªg jö∑†ˇ”‡‚$ˆüæ,‰~⁄o172›oiﬂõ:Œ÷ªÁá˚…]í /hèò(ΩõË>åaA’QÍ˛œlFº	∞˙≠Ãñ…ÀWöKhË%YzàFŸÃS<ˇÌr&µCó^2	üzNB∏c∫js Å°1ÅB∆SL+JV7;£î<†˛ _ ãì»ª†_c2ˆŒÇ≈<†Øhi4äÉ{#†ˆ@>¥3Niˆ≥æıßëG”Vå3Êb5¬mÖñHáõ©vJ‡ öí^Cè⁄î¯˙* …Ì¡Ër.„ÿæ@˝(—(Ì«~\Ì´X3„&° WJˆ≥vé+Û⁄CnÌÃãö2T¥@ıˇ_&w:,}Ç´ƒˆ'	NAOy–∂‚e˚˘H®◊ıäÕ Õ%}DÉ_+hWP	/ÚüL£Ë/†qRÛ◊∞„≤°Òé5éØÄºØƒüDÈOÈºEÓ›Ÿ¿Èw,ySÒ|Ä‚Ïœ`”i@«ãÛD¯CÂπ)ÙPÃ~Ñ%Ωîà√Î≤?d.÷"ˇ™$6<TÒ0bW¥ÚÜ-ÆyVÑ570
˛j(#&7k„5Y±Ya^,Ä«\Û¢„åré@oJÎâóµ ∞ã√x9á¿2)F,—‚ã®¯»8HX¸¬™“.Ÿ“™´_π‡ˆËµäƒ#éè/’∫À ˜WpìÙ|!∞Úf∆b 9¨ØZ‡AÂXı˙ñ±À¡#µ=¢i#ïÅo{QtÇ7Â“πYKë<°¥!yR,	ﬁÏHèØﬂ_&˝%Ê¬K≈5µR÷™!cU V•2UÓŒÿ±x–IJ˚—™I≤…±I™Ê8ÈÏÈ«Òî	©›Æêı;ú®Â•'ì°(∆Í05EÆUógE)âÆjçπTórY)∫LªôYOÅRôã®JÃj ç
ß”K˘z9ﬂ¿ØÙΩf€rÛY⁄óﬂäÉW”«ñù¬†åQ+æÇn*®πÙò[Wß3¢-éQ:*)ÍéÄ˙“”pJ7§ﬁÍ·`±’âm«ãz b∏èn¥$˚é€S`êË/=ö\ÆÇ≥$˝PˆÑÈÖÕ∏68*9n≥æec*œ÷Y*;GäWX¯Ûn˛&W_S«/∏Ùàê±Nﬂ1gc|êiòî∂√L,ÌÁfëıUÜNæJä.‡A<”˘<µƒ=§DT%ÖÔÉIÆ.µ'ûOmÆÅ‹ih5}ﬂ®…∏√ÚJ|ú‹©
á7k›∫çø>∫ü´«…˘/nNEŸ+Õ6ïÆ¥ËE.%Ö°¨äqCÉ‘3Òí0Ö"•y0≠MÜÌ¸#À¥[N¥mX…´?zÈRõ⁄jËç0”‚-Z§õ†qÎTµçd]Qª2µ¨ÒµXEΩÑ÷ˇÜπ™Ög¬°£i∂∑bi¯ıU‹„ò¬™ù≈O¬wÅﬂ\]ö}LFA4‰·nË‰?$_Ò˚øRÆ©]”Ç1∆:l.Õå·<∏ÓÙVa5¶ËöﬁXù]sõˇ˚ Ÿ±¨d∆‹\CnËCS/¢I yóç™ﬁh∫IîpU€b‡1&äQsyNIûyÓ0∂,2ä@Êø≠·®;«ì8ÈuLf¡Q∂≥∏?àµ„îèFcBä“T|©©πUgY˛‘«¢;ÑrèBedÃ}^j}ÃR-èL”aı$pWVŒbÌ™jëç! ï˙p†;ª*Å˛Öò~±¶JueÖÏùrÈXP¶ª 9¿)Dj†Ú6⁄ÄtíÈrµpí√Æ4Ä£œ@∂æE„òc∆ıLıı\&¬˙FæúÍ˜†êÌ”$5±ﬁèÖAäÕ˘≤O+˚;çbOÛí∞Whºo°Ω••◊N]!ê}Z{ßh˙mÉÂﬁ‹´m¬Ç˜ëì¬°¡¡|ñíuÈwF∏?∆ûàê~ï“=„D⁄íJÙ| ZW≤√ ◊‘≤HÖ/m„bü€ ˙¿Å¢I√4t¬∫‘Õ“^ã&8á≈ÜÉ3øprÃ):uâîÓX]Ω±v8ÓGS∞«∞§ç˙v*≠hƒè‡†≤*D¥E_&ñ8é8h8áò¿$*ÆÕ©B7¥œ‘ùY˙qí˙+‘‘ÍoÇ—	{!Hn)k\¡Á˜ºÜÿCÂgΩƒ∆42r«πd"Ä»ys≈¶¨µ∆îïÌ‰ókF˙Ä§"¢≤ı˛Ak¥√u"y3Ú>F Ôèe6ëe:ñe⁄–L!Q•"BﬂKﬁè„Õ ‰nıHß»ÜQä°[üç≈#=•®ßûÿÀ®ÛßNPç'N˜e<UÄ+AØˆ:ÕË≈´ê“îopŒ„0?UÚ±Û?U—àéÚ%ZQÎe}tÙ:Õ]ß0∞é}LqºÀı`zõ]`dAﬁ0ëyÅ®Rü4∑‡ é÷Ê¶ÜÇæ∑D% x4!µ±®⁄
ÿŸQ¸òzàqG…<“.-ˆ‡	B‚D;á∑˜üo?}Åˆ‡úiÌIûò◊g2@
hÔ˘ØÙ∏ö|94›∂5¸blÆúúÇ˛iª˜|{Wxuí°≥HÂ$ó˙3…É¿`cõﬁ¿#,ﬂ!»   ‘]Ô–ÎñSÆ6’(ãÈër⁄Ìã~À£«˜∆k∫™6'Ô™¢àwTΩå≈wÅ≥'ΩÕ…±Á	º‡ì?• j[¨KM;DßG€ÅÈ‡ø|∏QR”˘$üÅYÚ%ÔÛY,ΩBrW(ßNæØÎŸTÁ }™¨;‡ˆÜÇb‡lSÕ‹PÖæÿ('¡ø∫W•∏B…;xîGûil”ÉÂ)ÏËÑ3yEüCÀ·j67˘*¥jı:ôßi8:¶âWl◊‚Ω5G≥“™÷“∞Sƒë%èM$h®$¨Ëã)˚P÷∞@ø⁄*Ÿ«3∑ôwpõ£k¡ÑI%ı¿Í¬·Ä‹êgaJu5€Túê7GâõFõ Œ\z–≥◊“9fI°ÓÏé’åfùı|_Dö“:„ßÙ<'°'M.röá÷»û∫)‹€A.ûi–îÉ4_q$ ¸†•øÒ¥5Ç{_€⁄ã–ß+
{>÷°`ÜËX8Ø“õm—Ï¨∞"Høê„!(‚1ÆGÂU≈aï≥®à—u ]|¸¢qá_)1B™@,2oõLX’Zµ}µ¶ÚßyÏ∆X„4çlá…ºG•R§‚¨ÃÎG•+9˚"«•uÜdŒ≥∆ë)'„81ï…L=‡ÃXd›»!_%´ÿS*√X1≤»eS∫åc)Pds˚sYhˇ‰ó–^õRÿ¥I{XªùoLçÓ?dëŸSc7<‘ÔW¯˛^∂r€⁄Ωì@¸eWñΩL*Ômx>©Ù2)º¢’hN®|ˆ·K)ì.´rÂ≤.Ûæ ˘Â	ïCôπM~	K%I ∏Ã—˘ƒ!amOèQ—∞•M)mÁmÇ±òø5EËV`úûÜ˝0˜Òû«´!^ÖÄQO„Å¥AáL]"˝£<ÿBRùcA_≤îõbw]Æºãt7Ú&Ã@÷åx∫*TOÙC?£¶b*Ün˘‡Òx∆Sy‘E©Òa\[$z‚Àm°0“ﬁpùëˆrW®çT 9‘?% ü|,54@5Ù? 4Jï@*†|ﬁïz†J-êWπ*H?~©ÅÙêPıŒêGné5åv’bπqÚ3Ã#+g§)g„Ryøô
–\m%õ‰exƒˇ`Tó~ÃçÌœÆ˛¡=≤C˝VºF∑`Úà¨l≈3`€éí^áâæµiéˆÅâ»66˚3˝Ñy…ø™–n2YØ±¨ ìÏY/H7Q∏ qQl9G,G…\∫Zñà√ãæ≤ôH≈’5«Ù›~ø?ùxuà_~y.PÖ“0ˆ√â\ı¥Vr¡ö,U.≥q+CŒ/0ê]πU¿9möB9•çJv<µó=√Èú◊π∆âM7ô)MÖ'SpIÈIötIL/⁄–À™“˘`¬=hPcK1≈xEùïaùÜ93ß#êëôŸtÑv%Ò£Ú†˛Ù˙bü»E∞nüZ€º≠ok≈w◊¢FÙ›ïÂﬂ¬tˇ,H¢v∂o4@ +J€π˘;˝Ü/NÄç2\)¨Z»,?∞√”SC}°$yÉ#9ów5]‹£≠¨Ko•‹P/7¢ÖtéA/ÅVkJúRüŸÖµ{sÎ“ü˘‰÷Âê|ÂfC¯sﬁÈÃFoÚJC≥“–V2ˇ<‚Ôe’L∆∞ÙàOô„@Ëo5h∂´VJ_∑òCÅLêÕKˇ8Ä•œ£Á¡¬G¡ñÊ†ò«™>ÿ>h–¿(p.°?—{	·¨dF7J÷Ô ∑u˘‡±óPˇµBRzi)A=D∑.◊:3≤ÚPﬁ§ÀLœf÷oô¿z≥Éô6◊iûÕˆ¶»Z}b§ØÓtH:Ñ£¸m´£$∑¶◊≤eÛƒù≠h@&≠éløÿ:¶E≤ıÆÖûÌ@£B;iç1h2†kÎºÖWˇ4π'∂ƒå≥Èg-g˘eòMOéΩÙq=¸¶‰ èÉ±á∑SçI“ù–%†πààÓÜiOÇùOÛÚç
0ëÆ4O`*Ê<“Úï“4ß)PÉ Ü|ûx‹{iú¥&1ıÜîµªæ æ L≈B´ISeTäEπÒUûp5wpdˆ∆L›ößÍÆ2ßeûRØdÊ+Â∏¸)¶‘·h…ï™µUs•FÃ3äÀ~óLœ˘Ì≠õ>éäÂ{¶BwŒık⁄©\oÁŸﬁsöÃ˛˝”›√›Á€{=∂ñıê`Äbi¸zBVÏ•ﬂe,0Ú´~{h`§æ˛‚˝è∞â”å≈ï'“7åZs%gd≠íè äó…ãç$yIàDe—º˝o«>ﬁ[ÕÅŒ¡Y—tµÅr;ıùEiK~·o≠-É©DÌﬂ˝'≤ãg6ÕRf≠É‹ÛüWAÜiÍ≤Ô6ï ÛBã+)«PπÄø˘˛˚˝Ÿêùw·<®8)™uåÀlN°&ÓÙ—ı8Kb+Ó∏ÒÁ€¡°<w˘{≈°J< «±T¨k.>€ EZp	üB√5◊3ä¶
k…≤ŒªÎ»∆Psü"d]ø+Ê¡
à¥R¿g?¯ØÀóB Z6Y}ÂJKÇu	ÉÔÁÌQyvC	Ä∏ÑâK}¥∞;B°Ω·„4h®í4[ªã÷Ü.⁄:%ƒ
Íc
ÍÉ$Ù	˛ß’è£¥µJ“Q7ˇπF¢ÅÚsÉä‹dt“Zkó¬¢Y`Éu˘ü#P:2t cPW@µ¯Ïñ¸röf·ÈE´è	aKø≈û5Ô#À^ôN&A“G/'ÿ*}L#—:q$0≥UkÑ®~ö?éÿÜ°‚LÂ¯÷ﬁE|H«ÆCˆA\¢Ô ﬁ8ã⁄œ©fÔ	U˛5ì¨ı¯–±pyœü4ªà0§;ø˙ÖÏ∞‚†Ï„√ßéb3jíÇõ¨ñ-ÎãÎıü5Pﬂ9/ÌÛ£ãº7\í
A*YùPø_ø™ı√ê)ô¨ê›qñ‘|˙=-`«¯ †Œvé%t˙‘Œ®·6Ç™x2Œª†ó+∑…3‡µ≈e'¡dh‰ˆJUﬁÛ“üŸ9ê«ZkO[†&0cjµRá^Æv&Ô^±’ÇﬂâWäLé~í †ˆik¿µ ÖJî˚‹ıC˙iÏEÖÛ ·ŸÓB{⁄Bà)ùüY8ª≠ªr*∆yœjµu	}Op–4≥£çÓàX≈!Ó‡¡,´ïõè˛ŒÆ¨áêxú∑VÔ¬~ƒÙÇ„+ﬁâ¨"◊›Q∏n˙//{ÒU“î”∏?MªÒ4ãÄπcW%É¡é'X£tˆ?.v‚Û±úæÎêgèeåíKãYü	z/wFÛ" {¡’Â<≥†∂\4≠ Ωi5çOäﬁÚaƒOJ∞ïÊôÙ⁄s?ô4:BùÙ @üJå∆º7H{MØ}_Á•Ø–00A‹,{®3∫=uë÷Ïè‚–]œÌ˚$E¨	ä–≠öwŸôπ?Æîß+C‡+“{¬∆ÖqÒΩc‚8Q≤Pƒ8ÖÉﬁ…˘˘&ée$jÇ–	‚∆dx•
ˆ∫÷†å¶±kÔ∆ëùy%›®D»W¯ù—rΩR‚fQq°›zc{uéE¶\ ∆\+,õπów€˜ÉhÒ˛/p	3Ñ1•ú¸OVÃÅ7∂∏‘“Büd0YVŒ§™åä°ü„oÔ	ˆ%geÌ¨!µŸàjÃX5ëú58Vì8ıê-˜ ª
ª1È´?¸o∞ró\Z‡ÔX9íïi1j»£8FàËLãÏ`]$ùx„¬ÇZ‰C¡Än∫‰CßêÔÍÉK«i0
)&‰“œ
°+v?X¡÷ì)˚V:à$vOV±¡m⁄Cl°QnqìÚË8‘ qˆÒúÛ®è‹lI–]tá≠5)”è“˙i˙ øƒ•Ç±≠2 äsÂ±kóÜœ<4|Ãvﬂ ‚VB›‘òﬁàr
±F:ÿ µ—Ê-~
Ô/™≤(”Dn]∫È+HÕŸ∞ãˆy“G µLnbqóføqi>ƒ’ Ûñ¨πß_ﬁóƒXπ…1Û¡tDWÉ…åiRî‡6ﬂŒ•µCáAÀ‹À‘÷q™üîiø˛‚˛˜LK·sêáGVË{ívÈ’?å”À∂zÈ…L´=Ò¢Ãkéñ¨$FDπ*2ãå%~°°M√ÑxdÉmó»N‚Ì¨,áPYˆ<>ã…œCd]bÑX/]? €t»ÙWQ°vYàá°¯Ú8.]∏y¥o¸äg√ÆhÆ€ıcFÇ~Ñ~†±ı‹ûtrDœŒcÿnï˘Í7ˇÖﬁ˙3óπåFcê»aòçb#	IÛ( a-HIJ«Èíu±áÎu4âÖ≤ë_yCÊ⁄º≈E~Ù(„91¶ΩnA£ıxÏß0~8ÏéF.ØÜ}ô™¶V∑Wu√àÎÛ∞%™’Nú’˝ò’Um¡mO¡z[nüôÎÉê	Eñ-Ç|,Øab≤˚´)†UÑ®$ÕOâVx©√ (–ß^jXEjÌÓæÎíc@{/∆S≤
åv‚-ìí&÷«îƒ$P:Ò»ÍpΩCöl@1·È˘°G„—ª;ö≥ìıŒHÙÒÄ˜ª3uwAC-y˝‡†ØD[*>‘m÷‚∞ZÇYy√¨≤≈”vÖõÂg∏l1>ñ(∞˙C˜˙€‡bÎíGFÂôπ,‰]VÎR[‹Z/Q°[‘RsÃà%mûr]ÖwQ%óÖÅóà«Ïôgp⁄5%–»™∏®¥´ÂhÕ
@≈? ?ù*:q≤Zä‡+V≠cà5î¡ Å⁄x»éí'a‰ë&ﬂ˝Ke‹C’ ‡Ã3Ö56ñª(æ\Êîôm’|©Túí›:–¸π¥ÔO;„`4ØØ‡ÂeÂ
≈í∏–}l(ÆÂ#ÚCMÈ(V[ºÅ2?Ü±h¢¢ ˛¬è≥7≥*¿W¨˘ÇK)DIµfL‡£ŒÊ˝;wÓ”q~‰˜◊Ó¨›˘!»’√"ú!È—»+Mzxºgäç1fUÌnÓ¬≥L’[Ûz∞ª≥y∫qá¡Ó˛˝’ì’ì∫∞√KÌB{œcvnØ»Ûë6-N≤ñÈHÁÖk≠-]wÔmﬁe@8πø⁄_ÌœE⁄ÂM/94ãM≥Úò‡≈l◊·Löe2kN⁄Pfåôè#`¿Gxhö– ¬¡0´Ö{Çá∞/RY‰ñf$Íƒå%dÛ„¥}3†©Q®Ù∫¢~Èg˜<ª∂Ò’RÅìZÿ¢£»:ÿÑ¢jÜcΩ‡áòã©(U:ŸëÚ¶AÜ£'Ò9˛]F7Ÿ0\z∂»;	"'±∞(RÔñ(01º*»ÜDöçi€ÿõ∏Î–M“Q∏î¨‘;“—#7≈–”›∏÷¥√pboäÅ‘À¯›vÉõ„?}ZvÖL™Àt	≥ë4≠C\
@3Èd˛∏ ¢nå¢*eù™R§~ó»Ω£ÎL∏V∞ºugÉê–_˜Ã{9©PqÈ]◊;õvò8/”bö ï„ÖÈ√„‹‚T ]Jö‘•8bV⁄©ó·∂hXÇêeø+ëæxÁT ≥vËœB≤_eÙã`¥‰i—øiÓ◊zZ>Ù%±Ü„î"râÿÚ·œäÙPM⁄˚&<,éH]¬£V”ÿ„ÑfÌªpû¿ÊW(?kÓ[£-5,—Cê»c·CÁlHKzòkfÁmÇ«5z»„–ÃY=w|(]˝ õX`√ªdqCS>ÔÆ‘w"¸Ìå/§aCÍKgb@VŒô\Ô?∞B°—dÙ¿˜ñ,›Ÿ5ÁV™'öG˜õuÖ∑c]&6Jßgôyò◊c.tÌz∞2©›^nÇ-®¬Ñ‡ŒXåv=W≥ª(©Ã‹2ˇ##!∏˙tâΩ5◊9eùgÈu@3Ω8Uâ_¬‹∆}q≥drÇX⁄eióÍùY»W◊Q2¸.¨«¡’ÒroñÆπUH%ÀAÛºu‘Ö∑7Å≤%Œ&ñFT’e	Wƒπ.î!…≠K#ëÕm—6‡K-ÁëçZ∫éá§»áHÈ∂a3<∏Êâ≤ãA%yˆoöÅª« Í(ı`v(:RW‹Zı»?ÁéÜ»Q ÁÊÜ+ÎZ8 ∑Êíˇt\S'A‰—põòiÿzπz'	FØ¨3øTS;ç"È$ˆÏ,êﬁôé=@mT∂0äè]2Ë0@≈◊÷Â⁄Üìt¿∏N∫,+Úcﬁê≥L8Ü“ãvhÓÍ£D]
#ö’e>¯”e‡‚d•D®)'˝ƒD[óz¨R∑6˛<§ÉÀ‚Ió¨uñI¬Ü∂F¡iFS\úƒY”4sNk«µŸ6å7HCo¸i˙ŒbhÖîƒoÉ/Ö	>m5÷…z©ÀJêdaﬂã∂.©ıoôfè5Ω’¯hws˜ÓÓcw´e÷Ùˇ∫˜.,s
A–ˇƒÊäΩÂÊ∫h”zI©∫"¨ïcçßÄ˚5¶Í¡ k-õÍ_TLıª?É„8é≤pR“ìÈ,¬(BØyî1Bˇ8kTÿxc¢<òyïŸ>åBz~í(i‹õºs˙˘™†(uT™*˚Óàjy°xálLﬁë;ˇ÷*¸'úxCêˇØΩ∫T⁄÷Ç&OÉA0.€‘"Ôò˙†ı√§ïÓÖ G† ´Ç]ç’5Ä€¢É¢Yg€ÊÁkŸ YjB∫‰[ó/7ñ…[ÑWÔu¸F¯€Í9¨?æ∑ˆ‰Œ70á+‚‹r	¯ñcﬁV‘m≤XÆﬂ´m‘f„ôÓ √§€ÿr∂gÕpQD´˛&k)‰ÑxcjK–J'·∏Ò∞Ù"…y€´Ÿ}´ñ™%ypÙ¢;ÙÿèMPÂ$»9Œv€uÛVn>ÓæEµ∑£çÃÈ∆˚‡∂˜1à1≥FÙùú∆\KñªIÉòê·¥Ω(◊≠- ZS‹1,çsìã…;¿)å&ìÎ95>õ€b–`Ù≤◊:ÀØø¯˝ﬂìœÇÑ¶ %àõ}è¿ÏF‘DdöH8ü±ÔsÆM† V¿Ó|/[û?Ÿ¬¸{„{£¯|/`|/`‰œø\cL…"ÉQ6Rπ’Eà˙Ï¸ŒÍŒÊŒwB$3Fﬁﬁ ÅÉ¬Ø7[ÎˇÊ&QjÆ`9 ®ôDÈñhbFã.ﬁe/#sº”\8*Õx∑É(™(Cò˘≈õ>m›∫§ùÿ#ˆÈEÑ™H¯–)¥’‰hΩÛ—Óìxh¡èÓ¨ﬂπÛdµ‹öü™Qï`>%ñ?•÷zT§¸^ﬁ¸Ó õq.j°≈Jä¢÷7&oZ_öo5£t»]ıES∑#ü=iJõüEePãß]pzi]M°¶F]ëŒñ[§8Ÿ j “-§¢o≥‰‰éJ‹ñó'ºàﬁ≠:" ⁄_Wç]…ô;Ô¿inıÍqÁÌ∑»5Ô†1|ı†'òN‰∆≠$§ösÿ¡Ë§∆®ï|så˚OQU‚É…ù(ΩwñdzÊ3ÇœÖUs≠Ê<0\µpòµÛtçAÇGı‰6~+¢R◊¿
ˇøí 	ú+J€ôjÖ])íΩUa"»MÊèoRjS%åDUı^=cO⁄4=Â´˝Fd
˝ô\˝1≠™UÂÂP CcMÜÆá•äèjRΩqÊF∑˜¨,ÆEk,˝ÇÚ0ugø)ƒÀyß
`ñEE≤mõ≥»5ä˜´yÙíñªâ-h«√…~MC≠ƒùv%x?ÅGK«s≈Ó)±…ﬁd,⁄j•i$>ª#%∆ÅÉù7‹Œ˙"Vènµ≠íÇP‰dIyÇDûcÙuûHµdGpéNã˝Ú@=ñˇb∞áÒŒîs~ËCYÁRÙ©ç%‘Ω±ƒÒ‡˚üü\0∆˝˝-6e›ﬂ7≠…çø'˘@ﬁ3Ê†Ë4v	πƒ©c¯]C–…„˘Œ˛MäöW“˙R„"›ª‡Ôj˜.âErπ∫÷	ƒdΩ$]ïrÃ§¸Î/~˜?*q —åAƒøo^≤%	¸OÌ'ÅœÛ˛Úò'‡RçmÊ1J¬†úf ıá&ÿ]¡òVnì£¿K†ç‚içhOS˜ú≈<G¯∫§ªI‰ıÉ!¨Iêl5O”æóP-Âˆ’?£bïƒS≤aæ†›nª·ÓrÄøAƒ ÕÜ^€cŒMÜ” ;0õ5]f›·öÙ⁄O√Qò5W◊ñ>°±ñÇîÑcè'#§OiÄz.ZΩò”ﬁ⁄¶ëcñ∆&≈åIB…Ïp„+FlÁØä˙oU“Ê≤*‡⁄yk”aÿ∂‚à–BQèQ∞'të„x0à7
:“Î*!€î¨8{¿H˜Õ¿çF«U0ÇÕØŸËÔ}Üiπ*¬·Zq…Y•V<\ö7kç™]-fp∏^Ó¨íŸLL p◊vàR%ÀΩ• kÈU…æU⁄Ññôk”íôÎÆ;D' ÷©Âp´'Ä€Ïç}Kˆÿ¸©Ì¸æ±xÁ{$$dp¯Û√¡<tcS¬C7Û?üˇo)áD◊°„∞¥∏Í±À—ÕéÊ∏&N6@™{5nMãÏÉ>∞ˆœÉÒNπ	Ö#	∆h%ÑÒsX§Uèú #C 1É~xb≤J'Ô“5[„©-±5`~ÇÒ›h[ùõ≠ûÇÆÎÚÍ€HWtŒyS„iq@◊ÁâÍƒç»[ÄÜNÉ-±[£AºLBˇ]≠¯ù»ÈzÁd´dèbÊÏäq·*®Å∆\Zå÷\,Ùˇ  ˇˇÏΩks$«ë ¯ùø"∫ƒë
$™h†Ÿ›[†Ihhiv!\wVUïbUf13B0”ÓŒÕﬁ}8õ€ë∆ŒlNvÌ=d;fcv∂cc∑6ˇÑ`˘Œ=^ëè›îò2±QôÒÙp˜áÒ®—úacÍ€LÊ‰àDÿÊ≤ñä™≠∏X™`"kDsjÂ†ﬁ¨¸giÃ“"–î^M–˚&ò=∆4Aü˝7ås˚
÷ªÃßL!“∑$ŸVÖƒrI -ë1"ó$Iπ(°W'Ö'B±ué€Z/Sz&ÑA/N©∆£Ω\!¸XNo·e¨<{¬ÊœƒËÍaŒ~$Vπ‹∆™r0∑“Hà∂8˙≤9∏ÆoÚœï‹ƒ◊∞ãØƒ6f◊Ñw4—jÅŸÚgßTøŒ¿"‚Æ[¥#tY©Ü¶Ë¬2F#ü∆b≈m‹‡≤=°°X¨«õ>Eá˜æÉ;ﬂIŸ’k.$´º{uøù[*æjŒz¨ÄH”ß'X¨ñõ‡a”ô=éã‹“[\ˆî›ÂrêT*TùÊeÒ¶$zJx«\\núßDÕ≠Há—"Ÿ1ˇîræ Q€W%uÂBÌΩF„°üF•{Á.È•I¯EXÊjìfàrTØ¥HIßtk)YLÖä≈ûß9÷∂(q!Ó+—;ä≤V÷ÕfS 4«±Fø‚‰c≤∞X5…§v»:ìM å\¸›ÇP⁄Ûﬂü8í+†w—¢«ˆ¢Ö›{ﬂÕHdôj¡ï‘9±"˚Óõﬂ˛%ŸéEn€î´ÇÕã††ùnñ—≈DÇYRÑ53◊ËDXˇ∆Åc¿-ä’à®ö+k)gdõÚf‰q◊≥…Á”π◊1ª°wJyäµä©1.Óı.∑£0Äm
y68å;ï¨·eúÚ;òat J·˘œœ÷dà»|Ê ¡äøÛÖ|8¢Kﬂg≈‰Ø|¡I‚Û∂Ë_˘~ËÖÈV_ôûxU\%W!_<K˘‹K{>Ê‹€|≈(‹Ö#p;Í£;‡¿˚CüΩE?ôıÊLT3∞±-¥»Í≠ŒÙ‚h8Ãπ%dE˘ã+M◊;ùÉ√˝›ÉÜNΩW˜÷˜†M‰H˙]úÓ5O(üæÇUXªR~\ìd“ee◊‘ˆ‰4‰~2;π{∏yWÛ∂ ;›¸ŸÓK¥WzùÖƒ¨nûECL*çç±Ü¬‹Sgsá[_º⁄<Ï‰Ê±ô_M¸‘K‘v‹S)¯gõá0ÏΩÕÉÉ›|wü˘ 'G{xΩ;Mó¢œ 1êÒU.("f≈hq•D3Ø”Á
L°†+±tR‘>	Pã4fÁs;Ë”â€{ÑØò	LkÕ^Ú”‹@ênë5"É‹≤n⁄m ∫≈—“Ô[}ç´≤™à,"ëJ‹É‡ïÉí÷iË˘πGÛ‰k‰UÁèÀΩ€Q	‘ÖJ˝8£‡[tˆyˆgÀ∂ö<Ì©NurgãM∆≥kßYÃeÄqAUΩã÷πt‡◊’∑“„(…◊HÑAÿzb	üöMå]Å˚mÕ«{ 
ÔîäÇÕ‹ë]—ÿ£X˙Í∫"í[2gŸ±{iKª¥aßv
cFê9¬ÀyÛÊLtU¿ﬂ)ƒcΩ¬∞]=∂K‰-˝_ê$¯⁄«‡◊Æ‰|.~œ!$o’UÅgœR˛,Y–të-'Ü∞cCI\G∑˝˛* Oü≤¿Ã D≤üÆ–∞qWQtŸdñÙœusA)öΩ¥cü⁄∂4Ø≥zw«–v⁄]ŸC@ﬁ4"\æˆÿãS°ô√M˚Ã6¸≠Ì‡œ_Õ˝ÛøQ#Ó‹©ù*[çkÚ+˜¢≤‚∏≤“¸Â6O%<˛Â>Á∑ÀÚlƒ,ˇMn~4‡≠=À¿Ù£*Rà°±®µ I“1Ø±}Ïı"áûùdÉÎ õlÌÜ±ªŸ7ŒkË¶¬æµÅﬂ˜c∏øπ≥æ’iò¸{Ïï:€[;4nt•ÀW·0úœó6N[<Äè-ÁG1Èƒ£t©`ArfèEG{YÒw(Z>Ê˙Ù›7ø˝π˘∑±Ô··ãú3zæBo|Ì¬èQé¢ßp±ãÒ`…Ò%èÊ¬7:Àd&ÚÍ`Ñ"‡ùc^èF9•Éú%gQÔÊ»Ø˝∞Á«®£ÅO>Ò≤1c¨ü^‡Nà6ã_¡ñÒ$ÒzÇq%¢Y`lOT˙†~«#,®Fûp¥“ã ≠–ûjx	å …¿è÷O‚IHcá‚ù7pGo(!®¯¿‹†=:ﬂÓ¸Ìé\j5P§Qw§bP”fI‡ÍZ‚‚ÛÖÑmÊ¥Ïì<˚û=E)N“‡òyqÅìX|òY,UQt€2
@/ºè·ñØ'lõ˘2Ûo±B7ó.‚ÖQﬂ¥p-jO≥‡≈DüÀÖ#ŒÎÁ®*U—ñ§èDâG-5Î$7H“ì”dôs$©Ÿy[fÒ»n5ú≥)äÀRS±^xÉ¡¥\bë:R∏~πÌÖﬁ©”#≥»ÿ£∫:^∏∑eJwq 0∞À¸ç∞|K∫Ü],íÁLüÓ⁄”¶
>Kq9ï¶}=
O`'ÄÑgßœ€–~◊5ÑÀß+¬í€ãò ≤ä„ŸÂµ\‹lìeƒxLm1sõNRgeQ•ı∏„Ó{ŸûÎÖª‰FmÁCJ—ﬁ¬ŸŸó–z¡`j}3%‘ıL¶êâwË%ä°‘ï85R¬Ñ®L≈*&LWk\\®‡ £«Å:‰&Íß¨PÁú”B%DWl£ÌÕé†ßnÇ˜É÷—ì˘≥¡±æ¥5uM∆¢’÷1ç[ÀÓºx… Fß<ÀÕè›|u∞XU-ı$ã4DÕ"Å8b∆C8Êâ›—~ŸåÔ
Wºdﬁ_Î[)£lêºÇÛ<,∏OŒ	r<™ºl≈èÖçmŒ|JLUÏ£§*r<XDº⁄ˇlsÁp≥¶îg•yπIS˜,o‰ıº®ﬁÃ7ÕRn≤õCXÄ‡úˆwﬂ¸Ê"{˚ªüÌw∂;7ˇ·ÊﬂÔﬁ =-Zp∏<IäÊº32ÈsA:Y'¡m∑rh©yŸÜò2ÏëJ3¯∫ÿ:áj!’Ãec%Yáƒ	F›(L≤¬¡»8´ù
¥Jl<˝ä‘?	/íU«ïzaÿJVÔƒ'òÜ2Æ=´b ∞«¡ÓRs +öoÖT=uÛáõA∫”h^KÃ‘jÒør±<ÿ≠çÿïŒP“Ö2x-7h=íÖâ°ÚfƒÕIπ∏˛∏&π*ŒcS+t{÷ni¸G˝ö—8ÿ}£S`jÓmp±≤qö4ó˜ª^äj‰Ì	Ôh·§\X·ZD_j’(un#ËÔ7ÿ◊£òÃëC‡>¬A˝Ã!áNπe$‰GQUÖº~Å2g~V/L‹*íØXÂRÂ˚æûîUØõaä°5ﬂ Zñì?Ó}¿Yås]:etO
˝sæ_Ïû‰n∫04,lÁóQœ˙XÚ E˝D≥1N[œ˜≥‰ä§¡»ˇ7Qà°ù_Æ7HÅ-‚ ¢Œ}ƒ-D1-'‚Êı2ÙäÖ›◊5E:OzKQ5(Èï≈ûH<ÃúáÊetö0õ¥Z¥Æãå=2ÃŒ·!ìL∑¨á±„ n_ú6õèÊ‹ÕZÎ∂Éí‘çIãxŸ/´]v°≥Ÿ¥±X)»$Dò≥!@$£€€pËß‘22
_“[ê5Êî%`çnßπ¨M∑àıÏR*®´4ÛEz	çÃÍvéIŒåÇ3£3Ö.‰îlfIå]˜+Ï…CÄ^– ´¶ÄkSîõ…‚˘g≠∞˘„‹Dhsæ~œ¨OH|∫±Ô}YTÑÅCM]"zÿﬁ∫P…Ãq]≈îêYü§wü™Üê∫u!··ïö˚ıxyjÒPNøC¸»ÃckAÉ_b÷⁄.Ö%	ß&òÕvYR¸ïùDƒ]bjpRˇ¶;ÉÊã"s®œ"◊‰«°ü¢¢/¶ VxΩª ãÂ~I<wÊÇç#Y∂≈SKWÔ‘”S.ZJÖ_u·≠râÿ‘∫D£‰AK X“+€u≈ôau.&^)¯Wûs¢ÇÆ≤ =m+9ﬂf,êËπQ‚FÅÅ¯∆Ù…{Ã3DzÉ¯:	]I≤ßy$∞–^q$ÑjÆ‚kXîqŒH· bªºç≤≤qj’ÁJJvîkì¨±M&õ)ÈÂ∫1ô+∞˜´—7ZÔÒæèégπIˆ¢	Fè_lˇ§%	ë·o *WqπläÁ]˘äVjIΩ¢.®ü{eº–~™n*Ï$¢∂T◊ëª˜~õ∑›™ﬂ—ı®o\»{ãA–Ô√Q§¯Júx}˙o2Ë-ÊNO”·¡P•É¸¢itßó€
èÒàÆ[ HDÈaöø{±¯T®ˆ;R	aÕÈ:ØíAtŒŸnmsê˙cåãÙÌﬂ˝˝ˇØ≠ÿ‡0NãYPn¯'4a‚YDÛ}˜Õﬂ¸ø¸{Ão∏s$«¶Ω‡◊{˘¿òf¸3j4c‡4ª‚˚î^˝Yg¡j>µÖ1∞ÇrÓ±Ê≤aoﬁñ)’o˜∑π…€ÆÔl*¨´Œ%1Yæ’Ú*qœW%.‘ÙÒª∞„2‹‚õﬂÿÃìØ ,˜NéGRdyNm”Ì’',ÇK∆N^d©\ùß*⁄5ÒQ…´&¿¥{]œ)M«€ZVU•›Ä?O¯m™#P%–Öá∫Öñ≈"∑ñr\cQñ]Jr’nœ};H∑ÚÌµ„∑ÇŒ<øòR±í!≠"∂∆Uøÿú°xZ”]kØü”ö:”#˚Vπ Ù$Innﬂ¸˛"°ŸQ2CåJ‡P‰ZTWà\lÕû˘àhh‚ Q~≥ÛÄ÷´j‰ú˜ÿê±®≈Y≠ö~–∫ã¬{bQãQcYÂ|_∂◊Us‚®qE≠'n{d‡y÷\KÂ™ÇÅÏ_ﬁÉ∑âÆ∂qf!óÊdç”Ò√>˜{qöÓ—æ™˚kﬁ=gÄèzÇJìh”å´%IWÕm•}mu«œu/Ï˘CÎsëçs®π∂Ω/˙ä*∂∆^ú¿ÊJõÍ˛ú%ÛNπ(8!MVZ@Ás⁄“*Fˇ‰?%vú.∫û ·3NõÖÆA7ø÷ﬁkzF˝g`√‘k«áŒ|“¯àQ<“ ª:-sËîˇÔ›Ëñ∆Œ–‚Â»Ì¥D,xJZ +Q¨⁄d‡%„Z·C‚®x˘âé¶\Ë“ÚVGXqÃ|˚WSg˜∫˙[¯”;Ê|1J9µ¶!¬ÜêÏ~œO»s/ªÏ— >…ÓYœóπ•y3j•zHdAáßa˚5v9ÁÏË0Ç≥£G:Y
t∆bÃ<ŒıΩ∫∂>Æ¡?‘èVÛò‰£¨ÉÚ M∫®f˛öÏmﬁ¸áNÛ¿≈Ùî∞Ä’PA∫4π<°™0˛ƒ¢Ö-LÆb^Ø⁄&∏◊‹Œ¬€º™0+‰Së‚‰<n‡^¨Ñu…{YºQEœ\.ãoEé?ı vyá„◊˜ 'MÍyª†)∫kBh+ıGwû,¯)”'¡§b.®1S”k“tÇUÿﬂ˝§ıìÎô)·Zù§ ◊¨ﬁäÎdÖΩ∂9X≤/Oƒ-'–√±∫B<uÆ·:©öA8ª„≥∞ÈcnìH”ı•ﬁœ—^9¡fj$Ÿ[õl&©Gx&l·XçzßàÑI¿ùát'}˙©ÎÛûæ˘=∫O#õ»’DvO≠ ¯w" YÔUÔVb*äÓO"Yù—¸ˆØ˛WÚ≥hòæŸ®Tòt‘cøº<Ø›úZê10%„ü1L∑·¸≠„'Qc…~˜?*wŸΩ¡[T‡Uº'Û˙£ ¸˘¿KìŒx|0büﬂñ…öŒhm}vãyömàìÇÚv’XwQÂm~ªä5⁄ß~ äœ¥«^ˇ √ß4gIcﬁÃË¬h"–∫”Ã3ﬂ¯©ÊÓQ/¸≥¸Àm/übæ—ÈZ^n{A˛ÂO'ñé~:Z⁄<ÕßÑo¯˘˚ﬁ∆ÓƒÚr'≤~√ˇ⁄xyÏÑÄâ¡ÎHÄz6g¨U.}/Œ/Œã…p¯Ø·.Àd—2Áp3ù7^¡Ú^œ}xE;≈?∞…Î7jiº÷å9ÁÊ»Gáüp4&‡	ÅS4¡ÿã9l·i{Í¬∆Ö·æ˘H±ß"õ llmÏ~Dæ˚ÊÔ~˝¡Ì¸∑|˙Ghúb›™OÍGÇ]-(Æ+◊?¢Iπ3§U˘¶Å¯—ΩïŸœ0K≤Ú—ﬂ˛˙?πÁ¡D7¸§c$R◊§EæH˚+‰#g%aóu˝—ºﬁÊ†CŒÄíê≠—¯Ê?«AD~uÍØﬂhÀ‡eX=x·¬¥¡"9m‹À„÷πEœ"F)≤åF‰≈Uè%;Æ¢≠÷Íﬁ ]Y<Îçm√°⁄∂òÍk7‰Jl4¬j¡„ ü(êÀzlY}+≤â=UÖâ÷˚ZÁ-cÜKo`ü˛®údLˇIX;·Fô@úF$ô†(=Ä√?Òâ\wJ)°l˚cÃù¶∞Q˝Ú¡π>é!g≠cînnÊT˙6B$µLB±ÿ/ëäyœ¨Ë1∂ w®t\˜–Ôc›NÜ Ä◊æ
èäj«[ﬂ7ïrÂAXû&Ä”°§7oEÄ“Ö^JchëÊûwÛè	˘òlll¿wn˛ŒãßÉ€ÌÓq%7èÆ≥)èK…üë¥º∞ü«∏:4Ô/ùHßH«:™,2ø≥.°1˚>£˚XπÂ^ª›∆v -ˆ(úVà~ı*ceŒ˝bcÓx÷Fif´b3>†€›ÜÀ¥¬∞H√4)2í©»-M≠:Ö	Ø"Œ+Aß‘Ùÿ√£›+Ñ‹MÀ{ÍÍAÇfìp§˝XêŸÅòVËQEÉ^ÆˇëõR ,π]õlÅ‰àŸÚz¿=Pê≥©ûr∞>pø@ÈWî®¿Ae˜ õê¿ÄñL‡˜î¥ Òcí•æÀoµàp¬÷vçR†∏‘2'ë•yÌ∂JŸíyº‡Ÿ2√gËÜ∆¿…)ô!&*rﬂﬂ(¬åÎÜˆÎ€4‘“ŸqEﬁ—Xm*=K‹⁄UÅäX¨ÄùB‰uxéS¬ˆƒ°¬„¥O¨≠#ö£tl÷5{z ±≤à(ŒÎc,¥ˆQºKÂ^m–∫Œ«–;N1ûoª7∆›CÏü«ÄÔà•Mcùä@f»‡f?ÂﬁÓEcêâ=ïy…HÅçÚ©„:˚âﬂ¸CÿºNc˘€(ä(z\}˝öﬁ´Ext{<YG∏ƒíﬁ+ñÙÉƒÎ˝˛ZÒ°lk-ÎõPÃê¨ë¢n$ìÂƒ&∆}πë≠.¬à—MbÙ∫{3H”q≤27ÁçÉˆ9é—è€ÄØs ªÙü—1Æ}xEßr˝cD¯Ö©u˚˛´˝-î≠°@®o]%¶>ÁòRÈjáMËx ◊›°~ÈNo]BÔdOH%á‹Ùç\≥“Ü»µ¡Ÿ§ËXT…y⁄Ì£iTä4*§”çÉ∏XÁQSU?e¸Fö∏òêóﬁ%0’Xä]Å1é‚Öuo2L……$§ûfF€d∆d]èî‡ﬁ≥àÎŸÔc@‰I‚§^ÍØ‚Ú+*j<’Ù˘¨ùƒ;ÉEDoœû7<¿ßTåw‘ÕF06.à^£”SøˇÛ0	‹Dõ8Z93qK„KÖp„Ovw⁄Ùî–ÄeÚ®+øÊ√œk·pe¡≤ˇüØik¸≤°À¶çª°úß3ù)°9‰ ∂>|ÈÔ≈∞]S
ºÌï?/º|öm.ﬁDê¿«∞ÔÔfY‹”ÏÖZ]πBìU∑vx¯´¥p∏uÇzfQÉˇ,ÆÜé{?Ô–{˝Yqø'^îıàW Ã€â˜ôΩ–™>x–	5‡ÌYbsË„Ω≈Á‘?i«;[èÜCoú¯}ﬁr˛É˙n!ù’—ñcÄ_ô'‘k`i^˜Dìç˜Mi‰R¿Ï°/Çó^JgéQ*…Ê≤÷BvKÒ ?Ù’FöétV\«`;3rß§áóÏC˚k:Ä÷Ê…	HñÕÕC2À’a™céƒ\ÂÚï}˜ 
z˝˛Ê¸Ò/ B?n6≤™=⁄-ÃŒ>ﬁdASÁ~˜À ≠€†∏‰–Ê*{â˝o∑sY{”¸öÆÓ,9:ŒcjV≈XFï¯"m.ZCÖﬁbQYR¸¡À¡úæö¯Iöı©õ3WØ◊úiSbﬂlôu‹)√^oü{qÿl(s‰-®≈+ 8¨Øﬂ0*ß+ÒÅö—)9ÁÑ	
0 Nõ-Õ~ÒßnFΩ‹ûˆ˛EPhΩ–‘P≈f¶©1˜ÕÇÅW´c€	¡9+∂A`r=üﬁ£“πâ-Uâ^ˆ~ÔÀÏ œJûDN9Î∑1G∆Ñ3Ù#Ù∂ﬂºf£	<0à4ó≠]A#.^u¶1√
˙âzy”‰mH±\Ç.´™ñWÂa‚vˆÜìæü4P>éÇ~di2©¬`XÄ‡õs2»º±`K"û¯√Ú N\˛;ç∆¬ÄKZéH≠2ïå˙L]Úœ˝xô7≠á›ÉÊ\@eØ_cØˇâ˙sÌv\s‚ÕË≠3 ˙‹?âb^x√!„Íp5˝|4,üﬁ	@˜åÂn™P“˘¬¶	>√¸Å’•›¨˚1≠,âæehEÔ√vºH∞˜'?;˚E
œVõ◊£‚> …eÿ”F Œ^3öªâ˛≠ÕF)†Õ∫∫¬∂}ÿ¯–«π§f5ƒñıööebà®DŸ<Øá€ü≤}&≈ )¶Ÿ 6òp@±XêYÖåTÿ_  ◊™0Aµåá—∞mLîÿU^òÇÑî√Ly¬y¡0ZÁÜ&Ykõñﬁhrâ¢VöéÇñ¶-≈˙Òò∞úPPâªå˚  E”o˜˝zì€WNºƒ+Ò7`î?¯ ∂ÄDØ(ò◊[˚ÿtU“eG‚• «˝ÇM€o—’ñ;9ûrﬂ6fn¬π9≤ÖÍDRr8£©KúGûí4i8º§ﬁÈΩîåó	æÅ„›KŒp<rÛ·L;C´Û¯TªâEQú¢Y÷+µß5≤Ô{=∫ˇˆ˝ì¶1:v[Ω6¬YÄFµ
ùú9•óuòö1*«È+Ã”ÜÁqéçpÜñ:qÏ]∂ÉÑ˛´◊ÃnVüÌÉ|øBé¥“ÑékM¨…aƒ¶JrÑ€ÚËXöY±%M~‡±ñHtB«¶b4Á;T Ep,ptDÁâò—º%P˘©—FêÏDÁ"f…äÚeß¥QÆµY˘‹Kî™|8œ\u5VÔˆÒµ1¸-FÚ⁄∆æ◊ø‹†8™*é¿bLN¥/î≥eø ﬁPıÍ˛‘ﬂ2‘ÔıØ:ÎùÁ0nM	À:6m8NË&°¿gÀÅü∞+)∞õçm&ﬂ–WÈÂaƒ¶eƒ¥„—ÇI£Èøúè¨¶~”„_"ê’ûíy”´îíRu2y∑S6Pæ@ÊO˝˛VˇÇ¨®Lgæˆ˝ãºﬁSﬂûSB„Ër?]ÀO}8GfΩci˙Cﬂˆ“∞–ñ°2oª®ﬁxK]”|SE{i€h˛ü)+=≈öı{A|ö!-Kc§ÊsÚ´}ÍÌÒ$4mWAÌv[√R€≈
¨d¿ôü’w™cï¨÷8&8V
aÓÄ:1vó»≈ êÊ_^Á¡¸Å˛K˚âi”˚}:äm‡+FîLÁÄÕÊ
—	®Ÿ9%¢Y!˙”,Ét5+ÇøÃí“f≈‰+≥l∂∏Ä¬+À“8Ëlmtróy˝ÃLzÖº¡ò9f≈‰qq0…%crÿ'z¡,N/“d÷·$;*2Ûœô7zw˙⁄dÎíÈ(V÷ÿC?<M&±Ê"ç‡zË:&FUÖwÂ »i?Ü˚¬xì4!?-±˜t‡«>ÒˇIúÜ¿l∞Rhë$∏≥Ã'Ω¿:Ùí/©klKQ(^IVÀèºæèÖô~ãS·@˘#frD]\[ı46ÿÂìÖ|áÆÓœ§Z)cdi˝ÄTÄÌ…zoWìÊ˘äJ7^ßÀºwåPÆTÑW†î?ü•¸ ‰{gv6 J»=÷b»˘ ≥gÉ5…Å:ñ¨î§Ô˙Ë«â%¿;G=;-CâBêé`õ†«“ço™±Äêc^]+€ƒq%≠ä?&‘ü1¨Œ≥OCOJ,ñ≥aËe©Õx»˜")iF£íçVÁŒmz,ÏonÆπ.üÂÀ»%À^…«.[vX¥lD|êCX•5gÃwb~@˛YÕQAæ˜‡„«€òR£üU ª:ÛÀöå8…^éÇ„|qÉºà'ùR'.∏ √9"Ÿ †≥YÖJb yÆ1–{¥éd^xË}ÈKÆ7êŒÍ±⁄±X¿	çŸ:§ú¶ï√úËi∆Í≥oâ1⁄j^€Ü§‡DkM‘∂Ã£xù/iÍòº†Ìo˝∆Ñaî—_"¡Ÿ4·õÁC∏û´HœcËY∏JãÙà7#èˇŸÏcÅî*É§º6ô_Âìd`r≠ÏË_éÒÕ"$çº$M®íÙê˛©)ni%yµ⁄«;º§‡‹˙ÊKnˇï+Àx€ <â‰W§ÅwXô˛ùLzh…YèÎ£c¯˜iS®•^Ã¢é≈Wç]‰`Ì¶6£ûYfß√Fú\jÌâe‘`≠q¶Ê,5¢◊p≥öÒR¶Ê¸sﬂ”Ù4ÚP/Ã«åLl.u='™1 _Ày ﬂÙ"àQà1ä`™7la∞Á
ê{†πàf√!˛ƒã9¢¸<R¡y˝vÉa“	åa@Z”Í©As¢q ï‚NêV}¥'Ç)VâØ4o/ZJø=≥‘1
t⁄H˝(·Væ?˘†a}OOÖ”a‘ıÜçô¶]UÃƒ$TfMmêlp∆K’õ…‚,Â›c4°·Ìñèë€4ã”ó÷‚r¯feæñjc8XœÅÄÂ™…÷jﬁ`q¸*ÊÍe_îä∆vT∫˜„Q@7≈Œ´ÎlPYK˜F∂‘˝TaïÂ0n]„BãÌì‹IÏã≈Ñ˛Z?∞≠.YRŒ7˜Öv/vE#ˆ&√:\g ≠ùçÌ≠ gbW$b˝Z¡)´-*ß˙µqg$Hï≤çg’e{c8ñód{ìd∞√›?È›JS≥œÏwMÕr™Æ^≤u∆cz09Ó⁄‘´¥gmz ©7jœ⁄¸82î:p01àäcHÁÂ–ÇAùﬂZˇ⁄Ï6Hvà*òr§4eYrCõ›ÁZ:ê4˚—®â±˙Ev ¯—+/ÈoΩà<àe!˛∆hâÃYCL‡@Ojc≤« Ùq“p‹Dì‘3√ä≈,¬¬¬å
«Y≤<??o"c…Ì§7ø¶LåºNcª¢,∫ö,iIøò§X¿‹?DÒ%çX2VV¨)∞[cµ:ì~≠ßyªˆ%
—®óáõú∆Ej)ı≤˘Åhx∆É…Ïë4Âîÿ¸f4È-†àú^¥{¿b ÛõÙ¥#à‚l/»¢ããûzA∏CÌàî‚ü¡K•Ïπ≈C§¢Çl;s/d	Ï•œ›óaUå^) BÑ~„SıÀ	µ∆{ó»K˛}b;ÎõÀã€ãÀ≥l¯å∆·˚ôOI÷ó+µÒh˘â≠Ú1ôo/,≥¶6ó?Pg,F
¥ƒú°6⁄EwOãè⁄è∫FªT©çáãOlmË£]˙¿\¸√l
+Xc≠äﬁË_x√}o˚Roh~~¡>§%cçx«’'ù∫´àﬁL46ã»˛¥∂J ï€˘m∆qD<W!b¯ìhÑzuÅ≈m≥⁄¸!©ƒèb8[zÇÅ\é~™TGÑíF")◊©üÓ¬‹Æ¨ÊV•ˆ&„2wÖG:~J¯˝ˇ:t£˜1öËß8V£Ã7¥Å€L›êD)Â,Óa¬Ω◊T¡®ú«úñÛŒ%çI.U¡ …) ?Î˝+É¥«∆åM¢§av4f,evs¨YY¶<Ê9ıÓg∫ÿ[ÌŸ“|£;önå>Ø˝˛ƒã˚—=Õ:ÎÕòx≥\t¥çj÷QR6ˆN<≈¡;ìhÛ^†$;{ã@í+q'P
¬_˙®è© Ÿx·(iªçôÈ÷≈‰‚Øøö£†w_HN˚¨Ω∑qåw≥≥aFaÙ∫ˆ^üﬂ =Õõˆ[{ﬁråw;ıÅ∆pPÔı‹≥Aﬁ≈‰}öı‘›ı.§ﬂf≤HsjûEåo√˝ ƒ¡È}mR:§⁄∆;≈rÒ©—{8’å•ÒÁÃcﬂ?1å]WQŒàNP°ÀÉıÎ»Ks}¶–‹¬ †ﬁ–Ÿò»òAπböœ…–Oã∑∂—düm_5Ì5-7£iêluT-ê$›≤7WQ◊_Ëâ'¯ÖS9Ê &Œ∫û™„ÇñM+Àÿ2¥`å?™¸¥i
C∫.œHßy5@]±>ˆ!K:¿Zx¿ªmº§)öìÀZ≥⁄qÌ√XïZl¬L”‘ëœ“k8∂…31OÈÑ§MùÕ∫¯¬PrÅÑE}ôà†-È14≈âH]˛{ä&oHÊ˘kYôﬁŒ'nπtm˚ö-Ìèç_6–º+ $3‚†û1åïïVçA!Å”	@Ù}çQ3£§°S¶‹Ω≠µ∑ø˚”Õ√≠É√Nv#nµmf◊˘•À`n∑96¶ÛL‹~êÜñ…YPöôùã∫zG¥Û2.Gá+qY—9ä8∆0ÿ|™ìÊX*‘¥»D+F Hu∞™:[√ΩÎ‚“-+l√^≠ ‘4>£;£y‡èêÃDÒåi\±25™—òƒ÷KC34n∆^í
|÷f–øn}xÖqõ€atﬁ4öjÙ“*}˜Õo˛≤ùE‰eî˙§ì∆AwrÛè}™ΩIDœ,Mp≈<6≤KÜXπ!FÄSπn`TN‘)á˛/=˛ﬁÀßVûÿ.+‘À÷„∫—÷Éﬂñ]P8n•ÆË≈œ,õ¨Ù¨∏⁄◊'ÍEÅ~UPpô¢".`ùZFπª„◊≠1F“Ï7Lõ<©‘äM>–+“ç˙ó+ŸÄAa¿s¯o{åF¶Ω´3Á˝F¡á8ŸR˙*E\≈ÎO≈Ω√YÚXΩ˙PL[f¥√π6?¿ÔÒrﬂ¥=ı ‘ èÇd˜‰„r7:˛KèÜë9¥F·K¯™∫ÂÈŒi≥y?6Õﬁ§1Ü'‘$=˜OõÏEUáº›'oY‘k˝µ:ÏªΩíí„Ày—NÂùCi%÷AVã˝û÷´Æh%5bz‰Meä√YA†GBl⁄4ÿt¬6˝±…Ñ’ím «Ï∆õB,Uéß˙,P^¢‰ÖãJe±ZHÇBÏXè3eÂ€0`»MwFgR;‘Wﬁ#√‡‘X¸vûÿÖ’úÀ‡‘§±@S¸“⁄æü	ôŒ¿Iz	Ç°∞®&i,<j/è/$≥ñ3bV∆ƒé∞ÑÙ—8Åù>°±Öºß?mc`Lo∫q|¢è„Àhj4◊†7\{^?¯‰%lGÃï©⁄ª/o3fZoâµ6¢€ØæåNÉêÖ€í†£◊=kWäuGf¡¿lGÿW˛wˆ®;6∑v•€sdtáuhD˚≠ŸIlEsØ≤“jÄÜµ+ıóZfk˜ ?¬?⁄[°Å~‚gﬂÛ˛˝kW˘w¢<èËÀå‘ â;`„@˚Ó_¢-î∏+ÀpRÿŸ$˘’î`JÀzëôúg>åhƒU~™âÛü¨8ó“ô!‚!]˛gm˘$Ü£cÌÄü¯4F¥›—Ã ô‚lg8Ñb‘nÇE:Å˙ñIGœ3›FJöeeÜ«ä@¨’À$[fLïQcG±ΩıΩÚBümÓoÓ¨ou K~Ò™Ûrk£≥±Ÿ∞(©≤Ì#@¡è¢ﬁX;^åœ_a"-Ã±ZT#˘B…meÂyaKå:’Ñ[çQ'\m≈™Âêâb´õdãÒ@‘$„Z-Nïû˘QZ¢ôúôÇUY\}GÁ ¯}`È˝X(mã√DZ¨ŸV‚ù`hwGM	if›`â<ÃRO≠/—R€cÎ}a¨Kòç[ÌâÆ˜•Œ⁄û†ÑER√0Œò;˛˝öÜ2œ∏^‰ôBí·&[4ÓKB£ôk°çØòA8SÎ—øÈ>ÀßK1dÎ/˝À5Vef„£nSÔüÜòñP§YAµxG?öüÔ.,ùœ=¥Ö‡ƒ\(<+
&Úñ˘HÃÑõ“qcTì˛$¶Ú!çu´$GI ÔÒè˙∂Ló…âG_fµÕﬂeπ\‹a?çq∂L,÷¸ä‘ã+Â¨ÅósEµG≤¶¡Ÿø˚Ê∑øÂq⁄9"0ª¬|UW4ww@^=^Æ•¿î¢4U[ö≥~µßî\íÒ^À«vAœi ô∏/◊ãmjﬂ˛Óo-¥G[µ«ZÕßÖQ◊úÕ„!Êî·À∆U◊4QIaÛ3Jdq3§˙ïˇÕƒñ Î"â•∂O±«Eé§KL∂PñI…ñO(∑-Ä  ë¶A|ÅÖ§1|ç†˘ ƒ6OÄÌo<µ·Ôv‘èàòo≥É.ï–=W˝3p?p`†<î¿9Cù/0QıÍÓ£e|¿—y±äâ®g≠≤◊ôVº‚
´ﬂEBW≤ÑR@◊3”(1¡”Ft^nÓv»∆.y±µøyp∏ªøπbõ÷µ“v*aD‘F	h©\ÜΩ/&˛ÑÎc
Nô5ãB·•∏«ﬂ@≤à¿ôœr5B:/S;d4ñü0pz*ÒùGCh£(l≥πáQ“ç·»∏bÏÀ<9»#êƒö‹|Lvº≥Æßß2_ ùB'y*JF…ÏÄê«ea¶“,çº zYÚ‰‹)Ω8ﬂ T¥]ª∫‚_YŸuq°ô„«1†\|π.ÔÚ∂~2C>&?Yöˇ…¨à÷PΩ*πæ~Z∞ï™•,ª ı7åN#ÙUÅùj|ìüXRı œÚiÓÉ—)I‚ﬁöŸæh„ÈŒZDÌ®°éz–zL¢Ó/1—F≠ ÇPd=^X§YèÕî33d%ﬂ˚:æ°»¿ˆ8/\.•≤é”¿?7}◊s€ÍQõœî7X»çZföÁAÿ’åÚ∑õG˛8œ„Öºò‹⁄ﬁª˘ü˜∑vsy∆VÁπyÿÛ˘Ã∑≈˛ËX…¡∞$˙∞tŒzZ~Ç'ú±pv˘¡&óò&qGπ3F\Í√ƒ˚>Ÿ√[jLlôÅÖåõºD˛EµùGí—
Kà,r5¡˙góÊ—ë†xòKõWrîòëÉÕiQˆïCJ0’g§q‡Ë{â…ë<≤>è47ìﬁL∂Tc3Ñàâ?“>SÓ·≈ÕÔªq–Ûfr´$‡π‘¶jêÌØÅ€†98,¢œ4;ÿhπOä2∑ËúÇÃœûw]ÓŒ=ûÁ~©+IœÇàñK|´ÌUxböÀ≤∫ ÇÍRûÔ‡íXí’mÔ"ˇ!á¬ÊÜ„Ç:‡Z¿.é¨Èùlª ƒó}ÿá»á1Eê-*n#õ$p•¶µ%s…Zˆ‹‡"æùá™é†oÉûäòï±!uqVcÂ3Œãbwáô6±NàÃø˘/NaÿÅp£>G∏∆S¶gj“èÌÕÿ±√<NÀP;áƒWÊ‹5i^ô˜k◊3¢Zê◊Ï∫dùÉ,öªÁK∆√ m6HcÊh˛xz—¿pÀµÊ«““±.ña+ïk„kâX∏]U≈h“„OTÅÁ∆Å≤Û™Pºˇ6r‘œ/LI”Gi"¿?$mSC©e˛x®œ˘¶sc£ lXd©Ï§˙bÿI^≠RçjbLíæ4@3ˆ“¡ZcŒ‹≤>ª[ªZ˝π?§qçZS—È63r–y:o¿¯*gÌg◊Ôã«^˙ÂÊFU™\^ø(.kπ(Æ •;˚˚õüaöÎ¡`π:ÕAï'ñÏiñ%¶°óPvØC˛ú-Ê¸ÔfAﬁ*ÄÎÆˆ-$ª{)Zï}YÍá•ôniäÎà+C<˝†§l°)&k`∆é&¡é;XÙ)[F∞7vò0∞‘`Y¡ì·	Â,x`MO[68/√‚ÅXµ˙´_©69∑¿qÒÎGv:m—v]âCWÈgÁ…uEf1≠/[—
X˝ﬁÔïÍ∏o5ËæﬂÌío¡`I`{¢ ∑8ñ>àË˜ïG!jÕ‹Ÿæª∞˛~aaZ√jG¯Fp|u	÷Ú÷Õt'„íMÅW„a‰—pl5Œ∫?ím~œÃ\ƒyl≤" láBÔä>p¿∑òœG˝=¬We«g¡πﬂˆ>©>°ﬁ¿{”Ïz>£uZˇOo„ﬂ)´ù’Úhú˛¥ŒŒ…˙§&ä{‘Í∏PŒ±,ÊÍÆ®»¸ónÅÔÇ0M±Æõ;ù◊õØ:˚”uá°%B,‘Éˆ≠º…Í˛—˚pwg˜ı˙Œ˙ÎüoΩ|π’Ÿôﬁ‘˘æ’{-L†»±˛zÿ˚9´˝'Ùœ7wˆ∑æxµy;®À0”Å˝s^˝èÓú≤Ïw^t6_ﬁÇ∞¯0”–ï}Zıè“[;p4ÔÓªÿ≈B ÀX6<˘/Ûû3Âµ·ˆº≥Û˘ÓÎ/^mmo≠OuÙ—ÿ7-oßÜ>«∫_∞™Ù∫π˝ºÛ≤ÛŸÊˆTR£ÙB´aÈbV†‹(Rm‘Sl¸Ï≥/ˆ1ΩÕ⁄ï¸”VÚ˚∫Ñ  lºZÔT◊ÓmÔÓ‚íøÜä˚[üUØx∞˚r£˙∏≤n6˜;á[/ÔKô!√¸PŒ=^Ê≠QŒ¢Ok®˚)z‰ŒP˜ÓQ∆d±*§oÛ÷˜y„∑°a6„A⁄â~◊†^2‰€0ﬁ‹√EmÌ=Ñ	=6_øÏlÓﬂôjá„òVØ≥éïo-ËV‘È∏ÄÆB≈}o∂pÖê*WóÍ’ƒvgBÁÕπﬁÀsaká™êß°†<ieEﬁ	˝òÁ¬¬ŸπqeısQg
 _ãÄŸc§ÆÉM8w7”Xå1Á"Pˆ0≠+‡Ó´uÔè£-Z¡úwin"´_à"S£òigU0û"«◊¸–2#ÅLõr¥˜kë4ïfyÇ–ÉıΩw'ÇÄfäôû¢o‘Íh“Ø´£˛å÷^Áïøo“„üÜÇ;–ÀËÇQ∫Í"Iô%Ü√ (Y¿áYÃ*-y;Æß¢±Ã;ïÑßXóì Ù¬ûƒÖR‡YÍû»óûµx®_≠È§\.ß4]g‡µ{óqË˜}7reM»Os_óL0rfôµËñzõ&£´s¶YÒÍ8&—ÃÕêpÒù	4ìhˆæÚÏ(m8¿œÙx9√<Ë%$Î—pËçøø?î¸≠ÈVz™s”’È} ùhRÒı]Zúü/p√ı®%:wYÑ	Èj…›éÊ_∑«Ø—?ıu|⁄ıöÛ≥ÙÌ˘Âô„Ã≤õp<¯ :∑g@—õ˙∆≤@ËÀ¬Ω≥–7ãΩº~c¯ƒ!E3dél^å=ò»!uº"œ©Åª∂tUº∂‰ ùN[ˆi∞1Ÿˆ√	RS(‡ü≤$tNËÇ;ƒP≠¥ Û‹ZèFcØóFEû[Wot√¯"jÓN•x√k"W∏ß˚º|ò?9lµt\AX@4◊Ñy∏Ñ^LÒ‡f @9ç–zü£%±(\"¯oÕeöø[0c^∞á#Ôr˘ˆƒ‹éñÛnôœ¿ÇÌ¡_»^ŸO≠SY¬ÏêO{cÒ≥‚D^7±∫>œ‚(|5V¸3LgL>˘G0ê¸j◊êâv77€˘|Àr“∂ÜÀ◊Æﬁ∏˜0˜Ω¡ïQ=⁄G)FZ–É∞1`@Jµ†ìûﬂ
£ÛÿÁw9>bﬂ‰î ’|⁄ﬁ˚uõ/aSö‰&*<—Ÿœ¡A‡˚ñå≠˚R~›iáe∫ÍÊ*ΩÆ?\kÏ±¯	sBÔI√GÆåpYò∂"Ë°ïùcé¨&À_]ö®∆áW©eÁÙÎÿ;Ÿ zCåòˆcœ∆t
ÃJoæÊü£ãR∂ÿ∞¶b∑¬õƒ»≠Z·≤)ºÎù/]M|w≥—|ÓHu‚É‡4‘!`«ÍéÊjÅámøªÇåÀ–v:úûz≥î\y≠Q9zÓ≈Î/N´¨Œv{˙•Q|òÓj}ﬁƒÎ-¸-÷«Ìÿ≈	ÿ›q7Ú‚>∆„≠≤PTˇxÛO˘&k-ñ©È™¥bıîmE`)Q¥qÿ`?Iò¨[€©ÊŸt_à[˝ õ“œL?≠ÿ‰XÛò&è,VÆ‡ÑìÀ{øÁãtêµ5êoo1Õ˙ÔèT—Üv∏:I∆8èÉt›ã+—∏=[kµ∞R¯¥‹?Vﬁ€—‚p€õ‹ª¨H<7mÌ˚}ﬁ‰≈^:9C'‚áYÉc]Q◊¶¿¶˙2·£/*¥÷-ó´‹sπgn5eß—À≠fºwÛÇf1r±˛§Wk—≈IÂΩ?‘jQUƒ·©ùäàï€Òá£≈ã`ËbbÛ
k7æ˘oçºÃ£[≠≈f∆Gw∂Œ’ñ„#g‘Êf*rj8Œ^MG•æÂ©¶J˘N\…ÙÇ$âÃΩ/uáï≠«{
cœw§Â*5¶≠i¥[«ÚˆŒ˘	óÂ,_ΩÜÕ
“ÀJ¸[Dp˙ù©òPæ£Â}«{»∂Hnª“¬Mf_¶€“Œ,[˘ª—1´6é”-çúA›Ωb∑ë‰k∞Á¡Án<Iï6ã≠≠ödPÛı|WÀ°˚¨V”˛˘ﬂÎ-d’qTÈõ^?5≥¥)zûx¢}QsúÁ∆¿Êe«[êhW∑Å %]Í #Ö|Ì£°»ôX‹Ñx£∆äÆr<`s§π9s§œ;‹æ#ºw∏◊#H∑≤…≤Ïﬁ*„okÆg©≥rÌ%•~¥‰Á∂÷¶\U%y˙;^V›Ay uU¶s/ÎÚáûre?∑67Õ)%H–;=§µ¨~F©√æ´#*EÖûÛî“‘ÁS_b⁄J∂PΩh…%è›ÈŒ(ª_˙Ã±8§ˆosHI?ÓwÑÓ∫˙î§KôÑN£≤5◊ Âﬁ>≈2mYõ™µH∫ø¯;Z)ã◊˚îÀEßì?f0†qnı≤‚≠µ®ÑOÕµ.Ù∆ñ
æ˜eµ”à˙Áœ˝‡ÙÆ$P}7ãm8ﬁO'ª*≥®{s‰r›À]T∫8≤7Sk)Úﬁ–Ô\ï'÷o±4 dÙb∫µó¨‘kº6_'<≈	∫äﬂ¸>◊dM€’C—ŒTrÖ,∂•)pÉú÷úu5&øPè≠ÌçﬂÂ5Q].)ÔÀ']?≈(Ç’Ïm.ç£Ñ‡àßá]Ên˘ﬁ_¥Me=RGÀüÂ}≠të«≤⁄÷Z{ßs´ÿ;ø˜Âz˜Ü˛bÅ˝≤∆ˆ1Õ_ÅÛˆŒ¶¥(l˝QcJ∂ÙS[∫=óåAæ≈KÌ€‰.÷ó˘O˛.Ëùé’r[-¬´ÀÍ¥gÁÀ|cµ÷?ÂPsŒÇ¢ﬂ+]UbQ¥¶5€rπZ¨ŒÖûLŒ≤:ÁÙ)dEÙl™W‘˘È0⁄ãÉ0ÖÀFõM%ì9Ô≥$û˘ƒãcÔíD'Ñ˘ìı¢æü »õQ™∞Ã€¥ÜπJxG∏ö"a˙—1Y#lØ$Ùﬂ¶:&=Zœ3¢~cÈ†£‚Öót¥Q[vÖ\ÓÌ†ôxWÙFÇ‰πóˆ∏‹Óad'Ö# äu)KMŸKmaæ{ÂïñF\"Ö55w&~ íÊ–‹õsü,ìØ[GO‡±ef6º•◊ÂÈBÂ~ç°ôIå…∞(µ˙'©Í≈ı8ó›∆0ˇ’”´7∆˚Öy=ÜA$Ôm¯Ø∆ Xﬁ∫£VHgâå£ë ˝‘RH”iÆêyÚ aA`ÿÛÂÚV_Ì0
[tL^whÔø$„°wπBh
ÊzÕˇà6›‚àﬂ∑M]È¢;åz_ˆA»y–O+da~˛œJJ“KïKèΩ>¶ø,ÉaUXäCß‘uÖ˘˙’]õÅ7<aPk9±£]¥ CË¿EÇÿË‚Œ@81õÁ
Y|Ú…hT‹u „úZ›ÿ˜æly'∞ˇÄŒœΩÀ§¨j
ó › yÄÉ˙9ãP^°õ:5$SBS\ñz3˜ÉÿÔ°kÚ
Ê õå¬íJí\±dp¬PÁQë?¯æ—õb[≤Pw'¿X#Ê≤Ω"3ûïTû¯+Ñ'Yõ~ß±=‘ûÏ]Ó∑Ö•«ÌÂZ;ÆZâi·Ú
bï∆x#ÿ?z≤‰=Ï>æÀ©è!Ù±◊&I9Æﬁˇ÷§≠Ä–ß%5OΩ1@∑tÈ,HRJ\Hø’õ kÇôTÔa≥Ëua’'•ÎëF„™(àLT˘ä≈´Àä—'Q<Za"[ˆØõ OˇŸLIÕØQˆˆ/pWV‹ìwâd …üÜ- åÜ1ˆ≥&ÜU™%b¢‡Ú,¬Ó{@Â`?|∏¥∞º|G'ÂàÈå*éäeñ•|Ì'ÌÂqŸ°≈œ˘*`*—‚‚<ÔÏè¸≈'ª•ÿò¶»õ¬IJ∑“πö˚”yæáá$Óè`>ûÜ¥˜∫˝e°Z¿»Q/«é{„øÓâü¨{TΩÔgœ√⁄gè˛˚f¶2ÔF9SFóëöD|û≈ã°µÑjôq¬=èôHór? ‹/ûéezÍ $_G—˛m=YÜ›Ì·éhÖpBxC[NÒπè»Á4◊/ij¢L.zícFLDƒ’…è[ Y°OpÎ˜.ËÅ¯C64∑8Ot)]1¢†¡»14J‘¢5l]NQbM3nØKÛG∞ IŒt j?ŒlíÉá⁄êû∞b/ãsë ®òne§ÊäKò"˘wÊ´$d3˚√AD˙aæ¨§yEAvÄî˘ ”‘S}.≤˙åŸ≥Ìyç€Cˇ"[0Ÿ ˆ◊fm9ïπ¡CÁ4Õ¨‹j, Ì"g	£í!FQ1≠G¡‘Æ¨
∆ˆ–O”ù’Ç≥.™›ﬁpÄ¸ËC{Kò‹TW©œ
y≥5¬ã‡‰Êˇåà?"®Ö^!é÷¯∏Æ	sPn&3olﬁÜòˆÓÏõ°tØˆÂV®é§Ä¢…Å?§∂"ööçTÎ.#ÀÛ£Ñ	¬¥çá*”¢s…4È∞X‹7'™YCπeOz9FÚDŸ„|„ìOæßÌò&€-9÷ÏQ√ca;†x4ûùÅÕ∂€èËûê¡ŸÃxlˆ•[∞≈iÀÁv/®C∏¡:)âÊ3⁄√œ¶G®tÒà®_lóÙˆ¨%#»⁄c{`7ˆò·÷≤«M"æ˚Ê7I2äÊ‹o˘¯`⁄˜{¬*<Êø◊XE''ÅUˇëh„TàÂ¶ÿe(W·ÚË∂´‹25CX*'™ôg5jµÇT2ÆÁ¬2'◊]/Òï8Ä≤Ä≤'Qoí¨Dìu3-™&’Ò—>#◊r|˚ªøu@◊{«!ÍZ<∑=`°◊ô(AöΩ#é!◊âÔ–r+Æ∆Kn˝íG≈X¶î^÷√SR÷~–·pÿ≈-›~‰O¯«~cˇV¯˝µFÓ zù≥ßK>ˆ–"ÄÀ$(§åx∞W]6a(o\R≥dÔç
MóK¯Ò≥®%8‡JÇF¶%hêk€¥ºåÂz[õ(Ω∑ÜôA„t∑¨£ bç4Ò¶õÔqÅ]ÿU†á«¥ùÈwŸ’n“>	ÜÄÊ∂%‚iFÿ|!T/Ωë¯*CT/ÙÌUA
N'	ÛvXÔÏ¨oæDìíYg≠õòÃû‡Ñ4ïâ™Ï˜¸LÄ»-¿# T˜d
ß„"â≈”‰wÒHT?µtÅ\'Aú %Ü+ÕÅ®·´$3›Ì˛jùa~E 3Ωàö6E´≥∆ˇö8ß…⁄ÒäÏ0ÍóhÉÇcÚS—¯K˛ô~Rz‡Cô)ô(cÎ"j<C„!Íaƒˆ∏¡Üh[é\Xr4≈3àΩs$Ki¨ˆ™Ô„{¸35g¥NC„CÆs≥fŸ ∏$écﬁ¶%k ∏⁄#|’ú˚~ë|tÙã£_4èü¡_Õ_Ù?ûô+Yz9T (Ä“Ãu¯,7Ü£Öcdî%]Ù†^òAP6O§e∆MˇbÜ˛>j}˚Îﬂ|˚Îﬂ“s≥ÿ#á\Ï@`o0- vÀpõMŸπ=AjˇJª&-`RµY Ä≤iàÔ+ƒ]≠t'=ox<ÿœ<ÿ3Œ.$fe4L‘_7÷w∑_Ôºp"(Y±_Îf>JA¿°ﬂHö!;/fúÌ !3f@C{l“ﬁ]˙bÎ˚¿7˙ÜF¶È{{s´Ûzg#e’Èû uJˇçíu{ó™á‚∫≥ü#πjº8w} ‡ŒÛ”°èí„ÇsFeœ£ëÕ=;(˙K`~õ@Ë|‡=m*{˙˛â7¶{ PäÍ5n~MŒ–\ìÃë=ØcDîx˛•ﬂßVr>?°YdÑ-fÿÏ2,M~∏oıqê‰Ëx¶ù¿ˆ/dÅÇ~)§»eÌ—6OÀ˘*|v&£.Läé îˇ<ç⁄¯¶ »‚·à¢>ˇ…ÍÒ%«=3`4™+ºMA#ŒO•Ã Êp)‹>Ë)ô/T≤jïJ «;)&ë.=®]…'ºA+™kª »Î7E€â6«∂úJE%·ò‹A˝ÌYˆ&CØ_∫-("√π’ã&a∫Á«®2©r
Ùç*»|£ﬁN3kÒ<s6Q8+ìP#.∆:«œΩdÛ∞ ‘¨§6#u‹¸ª2(ˆ¶“)–ˆ·È%›·:√
¢ÇﬂL&£Y¬§¯ì|"Cõ58Ò¬√GFÕÏ§˘)wR2È“~û˚'QÏ∞€áØé“-*±vQA∑~∆1’÷µQh6Z=¶˘˝∏’/r¯y=ø`yQPúÑ™){~et•∂—YΩ]ü‘3•#X˘v,ﬁÃª'√eØ¢E&±…∫πûÖB%»(ˆ^gƒñ”≠Áµ—áˇÿ˛æå|6ÿÙëµπ8‹ÊãZ\AHño:`Õƒ¶s†e §§’ A)ös™çùXÌ‹’«©‚bœó˛Â⁄ïrx∫ıÎƒHkRàªlF%G–36πºÍ˚®⁄ÔUÖ=,÷y”S nå)ıáx´ŒÓÒ
ö∫&FZ(˝¢32)wqR#ohıƒ=≥•pÈ¯úäu|§í-Kû£©…7iiPõ‘˜Yﬁ⁄ï}Ï)bÎhNÆSA—ˇ;EûSõz◊%&{J0Àíé©ö-C	j	‰¢Iî∫∞¿£ÆHÄ’•*t¯=ﬂ^.∆ôÎ\Ü£¬)fä+^!√ò òkL≈)3.yùF•ÃÙ
Ωäáò«≠ÌaËGˇêÊ„y÷Ê_ê∏ﬂ‰'™·úCg¨ˆ8<EW…“ÑO…e≥»œ⁄GÛ«®ßçΩÚ%/	Gäs((»g›‹ÂâG¡†l—œ[ÛdÄˇâ∫øÙ{)µa¬æ9).ú∑>Å2ü∏äîwÌSÙú;ç»&5c∞$Z÷áâKˆª(•ã•ejëbÒd ÃÆüÑıÃ4KC•’îMük~ãÖæS*ï£ÊM1ºîñ8äiUËì…x3£pÎ±ßn@∆rx'Ñ§‘›·≈Ø:ds#t*`»Í‹`±¬z¢µ Ω¨Ë—ìÒ≈±íN≠d·E•Ã.2óÖïQvO.*[Œsöèëy^çR§∑omŸ Ìî,•^™—È°·ÕæáhÏëÌõ:ÛÉ§“≤∫Ìã‘R•ªπJ„‰`â«Jå÷x’JxU´Lúbvhô=û¨ä=≈ß“(èïô).‰, uŒK3h‰ƒ[%7N‘BzÅN1¥5Àì√ı}Ú3?Ï{§©úG∫ G±t⁄äß
∫ïbRë±{ê«{'¿ï∂~àY∑¬ìàÏy°?¨¿Îi7›v˛xÓ…ºjocﬂ ;¸Â˘πOÊAFBÏ÷•¯#À%YúÀ~tNV»ü˚ód€«t©W2Ö¸$N„†O?»∑'Ãè7˚π$ÜuQw|πûXH…¥
è·Eæó–öàæ Ó’ûŒ1◊æ5Õ§æs3Úü;Æ’3∫6µØ2:Bv˛€ød6µwDq+Õ⁄…’$#˘À4ÚL˚”0∞ïá[ïYˇ®™ ]g⁄Â[õñ˙G∏‹ˇÔ„.3É´ƒ-#}+Zˆ‘G™´Ï
D˛‘Ôwä4€ŸÛåÑ˛9¬≈oÊ[ò°âCzﬁ–«¸
•1N[œ˜Ø≤¶‹∫kfÍ/|ˆbˇ,†÷Ù¿ÜlÜiÏü∫L+U–ﬁ+¶«Q¬Ú´àû’∫(ﬂ˜á 	ƒóà•±ﬁZ∑ùåáA⁄îùi˝ò¶Àa7`s?`¸˚äÒö˘ƒŒãÚu∫l7&aáO¬|©åÓöı∆˝ã®ï∏Ì≈"åﬂ»∞‹¡0π-«Ω†s‹ãôD Ô≈ﬂ≠yÂ◊ºxÌMƒìÆí9≤Ô}çß«A‘º≤ªôwµóû‹r/YLÁ~†Ÿ˜än4⁄ `€´üÁ^«‘øí£·{Çv%¨yM¨˚Óõﬂ¸/‰*g1¸ûÚá@»#?åd‡RÆ∂ˇæÔ-¥∂§˘⁄PÿÛNYv≈˜dOe§ú(Ω%-ˇÓõø˘'rïŸ•˛@«Ô◊ˆ’(ﬁÔ	ÜT˚ì[Û›\TÃ"ñ„≈ìºDb™˛ç ˘.é*Û•"¨éÚcÇÜÑÔ%ó!Ñrf?–¯íg√O–X!"·{¶ÕÃ»ªHq[π˜m≥ÁyÛ›7˝ˇ˝˜ˇ˙◊"÷Ñ—“ıüëfÎ√+›@OÍCu]Ë,πb∆X ÁπwŸò%‚Ox˚|ˇeÉ\œ\œ≈¬»ûÊ"π9ˇg3?(ïÓ˘`;Ä¿∆Awíﬁ¸>`Älæ/ •ªïLÆ[ıä€ß€Á«Ìs∞µêa–¬@9T\Ë»yîù©b^¬›˛˝Æl‰è…ËŒˇVE™]°RØˆËÑl°yﬂ]H÷∞zLX¢¯¥¢πÖºÉÁ.Ë∂õ˚≈yı⁄˛6ñê4÷T…D‘YÛË]Y†l>Æ√>Ø`¥Ræ∑Jö∏Œ¨tKLEJ1¯^øâH„
˚Fî˛¿‡ÅïÛyJÀ1nÂs	Ëd˜\∂™ôêπi≥§¨ö…-{™–8 ∫˚<ªD€§>/Ü⁄G7–=o=™FP	˘Qï!Õ•É∑8Ù™C]ø˘'ƒ—©]+h
ﬁÍ–È¿◊£¯mwqËçﬁv?ÛﬁÓ,T‰¨∫⁄_§≈ûG|8o5If¬Xu‹{±Ûá≠”“ˆ˜r‹	ËŒ•‚rûß“Y≥öv£˛•*Ó;≠ÓÊïKÁ¿©éz,◊H‹ﬂ
?√∑≥ÑÜG.qÿÀÕu»πÔUÇŒ«Oà;˚{≥ß¿!–0˙ys?˚jßm6Aiì^©¢2vØµ«<Ãwj¥ÒÜì~»QÃıõz≥Ê7¥	ıä"R®HÊG∞	≥∫¥Íı1©,:ª›‡l√-ÛﬂÃ.”∏tfœ3kS+ØËpµ˘|≤/U¸>≥G˜ª≈xM ›A+4^Í~®>’∏^|®W¢ä≠˝rVë=
°Ûœ¸pE59^ö7$Îj¬kµC ßWM¶Úˆ`Oï3¨rs:lËÑ7H.ù=U·ÑÜ≤Ùú ìÖ™ç√qWAÆ‚eøáaU˛<y+–wDñô	t&XV`≤ÁJU«^]∑¶uQÒí]Ù}C†⁄˚ò!Õ#&⁄Ôì—[@ ï2”º	Ù∂¨äq${~Xäíg∫•¿hÎ?¨Ñ|ﬁ·Júyq@MÅ~X˘Xx#sf ®ÿãø’u sø◊d|Ûá?⁄’öÇ7§äÆ˜GÅÕ„≠ÆE‹∑≥5†ìø«≠QŸ∏Ò≠^ı∫Bîˆ¸©°ì’Ù˜≠‚íêÅ@'≥d©∂ü
≤Ú·Ag®ê,W[ûDQZAY◊Ü£FU—”V][3˚<÷/Èe¢—†»zv3©O*òIe#Ëc¬ßêû÷Æñµ\Òbü.™[œyKß˜aç˛3Ì7yO“hÂÌP;€ºÚïZu¿◊ò…ïRè≤eAßûéX≤≈Ú%ªãôŸ„î˝@ÕíïaÖ}/L‰:v˛ΩÔÔ»íß9ÏÁfÓsì7ûﬁ„ﬁRRm’ X´≤1·€™∏§∂≠£ô)èEÁ3§«bÛ∫'‹¥∞ÍmnŸû[¨y¶2;|BMÏF5Ïı€Cz“æ¿Ô0ƒÃêÙ~v‰bÈ±õÀUWW{¸^ú¡˘%Æ4MKR¬⁄3±E†!f…J4dµ4
F_©&TºÆúäbUÑP¬V©%w"/ı©J•´*"Zˇ˙ˆÌê⁄;ΩÒe‘XÜù©FÑk ˝˝‡©…o≠Y’Eü≈ªBü©…¯ù¢ÕùS˙[–˘)©|U_-™—˜*⁄•rΩB+ı
Œ S}v®…Æˆ4òı≈ˆ€ù"åﬁÿìÈR≥<4Æ¢vqF∆6ˆ¡5J˚ ÁÊî<°+ÑŸÍ±Ñd$@QqÏgtB`œQÍ,ãõúÈÄ$~c‹)@6ö7≈n%“–@C"ã‹—Ò—1Y#GéÙ_'Qå˘ûR@°˘O·üU@X:,ÒÒYtCïˆﬁOíA”ﬁP2z~3ò≈ñ†°zP‰k∆:°kÑŒíÒñ¥ötÒ%ÖÆ$‘ZÍÕdˇ·k¨ËºWà§5ù&±74Jo∞áZˆuWpt{tﬂ{‘Â·‹CÍiÎ"´Óùwe"3Bh˛x∆r;u“[Äé-DG2¢™¸è;Lπ»ŒÃù`¸œæ ÏÎ–Xr8idGgNƒÉQ‰K£ö“ÏãrÖ‘À4ëaÌ·<|»Cµ´ËöÖX˜ÃM«òR∆‘:Âb>{*ÿ◊b“¸ÌÔ˛iiˇ{πµÛyálÓÔoΩ¸º≥—!õd}wˇpì411y±ØgåJ–L!q/∂5*Ûª¢8∑p\rï`≈‘Öc∑üaô\b‚±+Â¡íLc0˜hæ¬2yJ∑ÄÇœ˛*fcÖ˛ö0@AØé»Å:A|‚’'}~·˘Ú28ãiP#ˆÛ‡) 5Vr†;ãÇzv‚=”¥46EJ›¿« †PªGé¯,π®ºß¬j3À|±î]2ïÁ`£∞EôÍÊò‡œ/[Û<sÜ[BSÚZ÷ÕoèdqöàpU79;ı^˝Õ_íóﬁeº∆nåÇØ7¸ë¬¿ê&p)äNó‡+f¯r:≥Æ–fˇ£häk1ü±âÊÇ“$jÊ˙Ä≤CLÁ_å1©F?JÏØnrT1Ø©kßàÔM≤lq¯,‰ü<ûÍt≈0K˛Df€(ø¿í8r∏ÇX/yˆø7Ï:†í‹ÂwÚ‚L „˛…aê—3£¡4ŒìLﬁ(bí…”5≤Púöò')eæ ÷∂
2ˆfD4œØöŸ∏Ã·ßB‚g{ÍÁ≤úœ”d}ÊÈçÒ§^.¥ü»ø2ò“H¶ñ\∆Q.ç1P'ñYπ¨Òÿ;gAÿX>ŸBÄ`Ûˆ\¡™Ö5j¿|ûπíVt'ŒfLìÿ™s÷aPÿ˛-í¸∑[íü“=ä(U≤IâJ@îÏÖg‰œw!çhÆ$Œ⁄(»Ãû≥ïB_≥k‚ÅMºáŸõe√ºÂlì*]É¬˘≠@»Eç)î2^¬r…ØÑd„˘-éÉ≤DıJNL®ˇj‹á≥‹ñ±^PFkgAÿN‡]S!ú.Ìä1pŸiÂã1Ohµæ8ƒ≤Üò[k%7VA∑QãöÆÛ\ñQõü˝|ˆÛ.…_ègdñZ”qmQπ∏›nGÂz[9Ä!„óW‡¯”IWh˘vù7KÚÛ jtÊ+:X>&eµØãar]3@9∂§Ã;π…◊∑∞÷Tõ-añ∂f£=Gg˚*Ü	Êv¯a≥y≈@∞9Ù1n·ÛÀ≠>ºïÃ*Õ}√{*‰ÂÙoñ.a¡º‹êr¶‘ı%…®+Ÿz2ñ_=Òó´wú≈º{∆õªıD◊Œ’Fò∫É˝%Ók@úú[X&,O‘
œˆ[O∆».vqïmË$Àµ´Öá◊dÓ)Ÿ‹GALˆ6^˚'eº&cJ1Z@©î›€∫≤I≈™É“óπW
f0]ˇâ:áΩüw@¶Fx8dÓ+¯#f)Õ…F‡£SÁL‘˜‘|AW… :á™Ï˝è¨(±rlpAO$![Ûà[Tﬂ9˜˛Ì«—ﬁLb\ÚØ[GO‡9.◊Gç[KöËõ”ïÎíØ·¨a°I5îæF˚=Ã:™jª•ÚrHFﬁEã‚#[$¥±Y¸"çÖ∞ Ñy—˙@fÛƒ¶('[+ÛÒ∫I4ú¿ÊK#Tı–[N¯óéáŒhIJ  N5ˆ∆x”ÙºrüK†d€Wﬂe9¸æüÁØÕåàñÎØ+j9Ã0BŸÇÒ$†Kç,q*uK\…g¢ƒ›Ì≈óÎ¬kÒ'ú∂˝cn.V›‡A„Èwﬂ¸Êøÿı6´Éáπ*Ä0NE®ÕäŒl¡j∆vßìŒ3Zˆ#S=±:7xh• ˙ªqnêâÅ5"W#"9ÓZ
asDl<>âà7D∆›@c{tx4:1˛Do›	\L≥Ò¡OòÉ?∫jêúNlHNû>M°_“†÷.ÒG»—vΩ8ÜÄãΩ3ˇgã¿J‹Ñ1	~íD$æ˘˝π˝±?å»Õ?ˆ0›dA;LÃ<éïœ¢∂ß±•´ Ÿ
∑NbÛ∫~ãÚ’u1ü∞Pt?fjuù⁄íÛYP˛˘€4ûAVÆJNN-¯ë√Ÿ™sz[6¬%~–™\¸ˆÔ˛n^¯ΩIÍÖ}¥t≥§∞π0P†ü§~ﬁ|ƒ•\€˙ÿÉ∂ˇtËÊﬁl∂Ù~Ç#˚jÿÅá
Óå,:ˆœ;	˘jBGÂ_]*öı}‘¶„Á…$\Ÿ|»!äá»Ã{∆ã\‘ {g_Ø ·ÃJÈ°∆xˇÑ—ôü<ºπ¶È™|	´î¬*oAdåSøhú'ÁLˇºçÅ1Âã(ıÌAÏüÄ0˙é‡K{2^è¯âWzVé!—ÿÎÈ% ∫öc-œ¢±ÊóºPˆ≤ëÚ‘iKb[£‘Ó*‰)NisÎSπñm–È∆2≤ÉK€Å•˝ˆØ˛7À"⁄˘;øÜÍºæ‚É‡‘ﬂã£—8≠@zÚ§‚°ç6î˝á˙%çu«v¡é√mﬁçR‹iÄÕ¡ßÍAÙ†Î∆fÒT†ËûùwáË^rˆHëö‹;˜ÇîÄ}Œ›“∫Máêdg¬¨ó}w∏iÔcÀp^v‘7%*<≥Œ/Ñ˝ê˙–√$ÏYoKÓss—√y≠ˇõ*˚#0È∂õŒ¯›Éj«;ìñKév¡ó⁄Oˆ%˚…nr[ïèˆ¢SùŒ:Gß±ªÂëÒaB"Ïıˆy≤Â`oÄ◊¸·ım[Ω∞–&áëNt`jÇK\«ﬁqû¬6œgc/≠†‘AÑ(˜	î=∆wM™‡iëÔƒãÉô[Òãm≤ÎL!∆®®¥gË˜Ç¬°≥)6:˝ ¬^∏˘{‡¥ÄW®lÖ0Ò j‹$æ˝?˛ñ‚vì}ÿGúï˘9(ÜUÓy(6$ì1áw˚A œòÃI~Vécœø€ΩÆpÒou∑ª<ã`ÀD%›ˆ¬â7DIÕøÉùöÒ–‚DŸ®8ñ∆7ˇ ÑÊÑÉ()D&√I‡∂êñ%FŸêÀ∏m£Iï6¥MK\∆3≥ñ*O…eu#£≈/ºZˇÌÔ~C^çÑHç;ó«yõÙ‚ -mË.Âb8e√ÙÊ?Ö>5¡…D˙”Ó^ïàﬂµüº‡Í‹Û8:áÓG`Ä+pr◊¸ˇ   ˇˇ ÁKîõ