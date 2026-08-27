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
import { OrderEditModal } from "./components/OrderEditModal";
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
      {/* Order Group Edit Modal */}
      {editingOrderGroupCode && (
        <OrderEditModal
          orderCode={editingOrderGroupCode}
          db={db}
          currentUser={currentUser}
          onClose={() => setEditingOrderGroupCode(null)}
          onSaveSuccess={(newCode) => {
            if (selectedOrderCode === editingOrderGroupCode) {
              setSelectedOrderCode(newCode);
            }
          }}
        />
      )}

      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 min-h-screen overflow-y-auto"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-500 pl-3 flex items-center gap-2 flex-wrap">
                  Pedido: {selectedOrder.orderCode}
                  {selectedOrder.isUrgent && (
                    <span className="bg-red-100 text-red-850 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
                      URGENTE
                    </span>
                  )}
                  {selectedOrder.isProgramacao && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                      üìà PROGRAMA√á√ÉO
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500 font-medium pl-4 mt-1 bg-white">
                  Cliente: {selectedOrder.customerName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(currentUser.role === "PCP" ||
                  currentUser.role === "ADMIN" ||
                  currentUser.role === "GERENCIA") && (
                  <>
                    <button
                      onClick={() => {
                        const orderToEdit = selectedOrder;
                        setSelectedOrder(null);
                        handleEdit(orderToEdit);
                      }}
                      className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition shadow-sm cursor-pointer"
                      title="Editar Pedido"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => {
                        const orderToReplicate = selectedOrder;
                        setSelectedOrder(null);
                        handleReplicate(orderToReplicate);
                      }}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition shadow-sm cursor-pointer"
                      title="Replicar Pedido"
                    >
                      <Copy size={18} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 cursor-pointer"
                >
                  <span className="font-bold px-1">X</span>
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto bg-gray-50">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col gap-3">
                <h3 className="font-semibold text-gray-800 border-b pb-2">
                  Informa√ß√µes Adicionais
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm mt-1">
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Produto
                    </span>
                    <span className="text-gray-800 font-semibold">
                      {db.items.find((i) => i.id === selectedOrder.itemId)
                        ?.name || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Quantidade Total
                    </span>
                    <span className="text-blue-700 font-bold">
                      {selectedOrder.totalQuantity} p√ßs
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Cor / Tamanho / Var
                    </span>
                    <span className="text-gray-700 font-mono">
                      {selectedOrder.color || "-"} / {selectedOrder.size || "-"}{" "}
                      / {selectedOrder.variation || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Data de Entrega
                    </span>
                    <span className="text-gray-700 font-semibold">
                      {selectedOrder.deliveryDate
                        ? new Date(
                            selectedOrder.deliveryDate,
                          ).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">
                  Linha do Tempo (Processamento)
                </h3>
                {(() => {
                  const orderLogs = db.logs
                    .filter((l) => l.orderId === selectedOrder.id)
                    .sort((a, b) => b.timestamp - a.timestamp);
                  return (
                    <div className="flex flex-col gap-3">
                      {orderLogs.map((log) => {
                        let actionLabel = "Processado";
                        let actionColor = "bg-gray-100 text-gray-800";
                        let actionQty = 0;

                        switch (log.type) {
                          case "PRODUCAO":
                            actionLabel = "Produzido";
                            actionColor = "bg-blue-50 text-blue-800";
                            actionQty = log.quantityProcessed || 0;
                            break;
                          case "CORTE_LASER":
                            actionLabel = "Corte a Laser";
                            actionColor = "bg-indigo-50 text-indigo-800";
                            actionQty = log.quantityCut || 0;
                            break;
                          case "PINTURA":
                            actionLabel = "Pintura";
                            actionColor = "bg-amber-50 text-amber-850";
                            actionQty = log.quantityPainted || 0;
                            break;
                          case "EMBALAGEM":
                            actionLabel = "Embalado";
                            actionColor =
   xúÏΩms‹»ô ¯]ø"ª∫mW…¨‚ª^J¢¥IµiK"[d∑gFVH`¨ÇT(JÏrE¯bogfÔ.Œ{ˆŒá/zz6n=3q171óˇ§ˇ¿ÙO∏Á…7d&2Iu{ºç∞[, ë»|Ú…'ü˜áÁ’:váiƒ›Õíos˛ÎŒ 
9IR?HâªEÎﬁwœÑxÉ<L‚èÚs≤E¢dÿ˚lÍ≈yòüzÉOü¸‚d•∫Éì4>≠j2≤Ä¥o¸|˚Èﬁ≥„ÉVø¡àûx'Acj=ˆÚiÍ˘I£yÏ$Qí‚[ è`§^‰wWW8HƒçÀe?>K¬¡uÄe~√˘(`¬1iWtﬂœ*ø˛ipæ5√ëá˛º≤· Ú≤Ïô7∂ZßQñΩIwÉÅ+ì0∆Y7ÀΩ4Áà÷=SÔaª79ÈÆË)ÔÛá+Ï‹_iU|ˇAÂÿjg©ˆzÚ∂ªF&0&í&”ÿáU¢”x±∫2y˚íú&qﬁ=I"üL'ì •Hôç“0˛˚¶ªváµq€ÈÉôÇOÛ◊’0¨û!3£´{∫øSÆäπj0ÂqwﬂtÂﬁá•πX^7≤˚Ÿƒãµﬁ$îäéÓ6ËàêŒ‰¶©û#Œ?˚`÷"≠∫¶”∏G&I⁄§©}.Y0ã˘úD”†``—¸ìﬁ4“¨w∆~ª=Ìê≠d
älm1™ê yyíÓ˚ù⁄ÓyÿãaXH9ÙwB´«∞S%Æ¡”0ä¬å< +‰˚ﬂØ$$¸&Ëä≈ﬂƒÛmFN¢d)€H„$N»8ÔÆ6Ä$!«¡xíÙõ,"ù S/ıËn[fµLn≠¿’ô#Œ◊O≠Ù:◊æ-ÃtH∞+Hœà,åqt„‰MÍMj!:ãÉ7d◊À
ù<@†«ìN/Oû$/
ŸQ˝€ùy£≠sííÂF˚±ˆ€«pã˚≈À%2´]†Q2M˚§µ÷ı√aò∑ñj_ÄUüÊ¡ØÃØ∫∫5:ÆSﬁ˝aØ8za£≠âc7'ìºª^Å$fﬂ≈±X:Â>'Å´öL”ILˇ}ßÜ®Ó«Éhö]¸óƒ=Ój(_€πwMgﬁ,¢`ê˛.‡ÓEq6±
ﬂ~xµè¬∞¿sü.¬ÏÚD©û÷î°l:‘¿$√èÌºj_í∞5#j≈∞#≥í∂ )›´∆úÕ+”42ØÑà{FïQÒ–˘»B›Êùviñ˜K∑å⁄œéàf!≤û&æ¡ x:S¢·[†`aú9#P'HÆÀ∑V»Á(S  h)'z?üfyxz.~"ÕE"2Ífô5$7?›”≠!(g˜mõÑ”7¯◊õÓÈ4ä»ÿ{$iÏ≥oS:5H"íúÈi-G°Ô1Ò‚p(÷crÍ˘Ùﬂ,
È›”4I s¯gÉ®ªV¢Jñ
)∏$:9π©ÈpƒÏOÇ¸ÃVMiﬂ≠ó»õøA3£°–xû≠Yh∆,%o∏$Ωìƒßa:> É	yHZ_˝ˆØˇıüE¯]/%L¯Cá	ŸÄÛ,iÿ*_ÒÎ‰œSr¯°üîv˙˝Â—ziR'SÄkLJ„i/
ünÕ⁄î’ü≠ ˜\l«∞¬ù{¯Ë»:ãˆ©e¥òó˜®îÀwVÄ nÙ›‡Õ∆¶]ÜÍWø˚´“‰ŸL≠ªRª7{œπ$&©ª_˛râ·Ën®O9ÎÈqRÇ
>MÛÿ5nÑÈ≈ó6‰ÙÛ∂tpÒ{/#>h¡‘} ‹œÚ4âávπÁÓ 
”©1%ôº-Ù
Œsò·‰≥i ¡ùgƒx'@2…e∞˜÷≥Akybbô–qo⁄AEe≥FÈ¬zoS1±{µırùˆvYQc*6Sa∞ëy
îéœÓ sN ≤≠ÏÇòSòª2[W:wzhÏø;âÃI∑äõpΩ? äõ M∆Q9—9-Á©l ö≠_D´ïxÀæÄN–1æ◊áSåxí$∑ü^|˘6'}d¢pÊs;_{ôé–1˙0ûLs«0ÚÛ	L'ûéO‡,s¥9Û¢i∞%F¥èΩπŒÉë°u;†'Bq–˜⁄A§≥aê˜hßN¶L›ôlJaNú’∏cî›Á&lO∫k¿W∞•@∂Ü(Á;27	 W?ôÊQ#ßÇQ•<M˜ç;¿1N‡[∂\KÂz%å∑f´ˆßÀ ¥Î∂õ∞!g#%bC#≠s:AÏ”±.9!˚IƒKÎTﬁ9gÄó.≤o†»æf2rw2éA¿cMG†≥q"«h[j˚∆⁄Ò‚Ay©uÕl|ƒ‚Psmè$ŒrÚµµLº4ÉÕï∑’˝πDVWú:ñî¥C €≥6Ù–AÌ*ˆtã¨àø;Nw*îS Ì•yª•–5Ë„‚K`œΩ°g,s
&LRÇ˛
	*D≈#-ÚC◊G›!fˆqÍí˜›Ëñß@ìÏ›’c ◊Æd„>˝ãí¿ [+Å6x…∏VC¯ê8*nﬁ÷—îN (]a≈1Û’üˇz!úµíö˚±ÍÄÄÒé9ﬂŸÚMråJ#rƒ‰0AFyqÿusŸ∂Jüd˜¨ÁÀÚ#öä‰™BäÕ.≈ˆ)ñ’zŒ/ÂÜÑÒIÖJâÅ6ﬁ!cÊ)ê A<ﬂsr”ÕyC:Ëu˝h5èI>J9Ù<ér7˜Ë&]‘X<'á{±›>r1=5,`3T»"‘(î¯~vª)„O¥•eÔ∫Â0+'jj§ÌxRµÊM,xbÜ0úùãÚ√aÇrì˙’∆óº«∫º´¢nÎAΩ4P-æU©⁄Éÿ˘5B,
q∑p“§ûw™IïjzAÌÁ¡¯˙¿ƒc‡6◊	æÄ-8y˚“5‘üÌ˚s“vÇï˙∑ A˘A˜ÛŒ%·⁄ú§ ◊d≈Câ™LVÿmì˘DX∞'w€qx>R—òLTÿ2£l€Èÿ±v\»¡˝`;‚ãﬂ_¸∫ÀŸ-°'êoÙ»$M‡¯ÃÄ'H4›ê/ıÜxûà˛Í	6S#…Øı»^ñ{ƒ£É –øÖü{®wJ<»ßT„4°îÿAü>:Ò¬∑Œˆ¬≈óy8êM‰j"ªÜßJ>z7íM|ÕSùPÙÕID!õ3ö_˝˘"ü$Q˛m»Fµ¬§„Ωë˚ëhœﬂn_Z ‡oÍå¡0]ÖÛ∑.å√ê∞⁄€\`…~˜Ba7xÇÇ
ºÜˆ≠∂πÊLfkvƒæbÙÿΩ ΩÏ<ê2≤†¯˚ûBÏ~:ÚÚl{29y)öKΩéEÆDÌEÜÇL?Pñ°	}≤D!¨Â˘%p\«°¥À”syŸd“ õ¿˝çÊ‰4»£vkŸõÑÀ|∫À©.†|¶Uˆ˘(Ò˚§uxpt\ÚÒ¡q§Yﬂ≤sZ∞ÚpV‰›„ÛI–Çº…ˆµ†-ˇ<”Ï¨dk=I¸Û>˘Ò—¡≥^Fæ@&€Â/I^∞O™ñ†‡À6]ïM™ÈEmZÓ»ÁÖ¶Ïöé‘¶ÂéËŒ;ÜΩÿ'Ø?òUvÆ?‰ªA6H√	¬wN∫‰£V≠ÊM·O;] ı§¯5™5Û(ñ;IAXú ≥K±∏o¸fGΩâ˝Œ‹†ó±}4H§XﬁC¥2È+nMŸ ˘≠ÿ¯r/õêM)´ü{Æåw®ÁºÊY¸ür∂|{]J=Ç¯,zx^Iﬁ#Ìft4c@KÍ–ÿ ∆˘§ÖFÿ=ﬁ~úÊ—”„CÚ<"jr}í…Q8ûF¯ô£ =n'mÕ;•Ö4¡7'úXWûtê¶=Áî{—¯≠ÑM:%Aó≠?ü-}Ÿª÷¸õ&ÉUn†Ì∏~
 Ø9ä2ë6Ì≤Oº¯‹\—ÜS´úòXI6Z@84±XfGﬂ~ÿ#ˇ;§N¶‹SÖ>Ëòs”g6'p@zQdíÚÚ9QÊ:
òÃÔ¸i„câ‡â¢º(7z⁄¿>+ùïjx.Ωw¥Aâ&®RÊp¿ˆΩaê≥∆ùﬁƒÛè–∑ÆΩ∂DZ+-ÀÎc8FFÙBJÎ«ûyÇ¥gÊ≠ßûπò≠Ìì“≠ß^hﬁ˙Ò¥‘˝èßQ©Øabﬁ:
LW»÷¡¥tÎYRÍnπvÎ• 
ìòOÒgªcy·<“2√bˇ)<¡»"‰Iªk‰9Rº∆Ìz>_˛`F?à`áÛ◊E[ÙARfyô<NÄ€ÀπxF0 ÿàwƒÿ¿0æQúÉaææ©Dßê›=r∏∑ªø{pì|˝≈oy„∆Õgˇ„_ÑäÈf›—V(àn‹˙ñ⁄ótÒMÍı§pÅ¥æ)ÄèºπOù8ùŒ˙7o|ıÀø©˚D≈a}≥Èi}Û∆çWO9@QÿÂ˛âd<π¯ª4L»è`∏·´◊ “X¬YÒ·z±∫∫Ú≤ô◊	º‰ß…›¸S©¿åÇSSm[Î÷U»(WqÎ˙<I∆ËÕuw”9í
-Æ‘ûºxeÂdu„Ù%ù§%’!ˇCæøºf‰≠:∂Fé\ÓnE^zcíÖü[≥µµyI3&–rÖu73C¬?°)k:¥EœÄp˘öÀòUﬁ+{Ñπ’.Vª¡ãªË'ÎT vu≥¥T‹ÎzEQ∑S4Rhó}ƒ:EF»˚ç©Oyé6≠¶]≥‘–∞•®`–Ú#∑¬y5^t«å∫/nØúç^⁄ØÏ˚ew#™P
≥pEI&@¸ˇ{ê’n	”
◊;ç)bZAv0ÌùÀÀG®ØA°©¥~m¿éá∫œ-pt JÀÚO,
D¥BÓ=›ﬁBûÔ?ﬁﬂŸ>ﬁ?xF=9ÿ˘â’Y"WC”™ÈÕBï»“6UF§µﬁ¶ùº4"M´∞≈Lö'-^<:q’ÒÖ
√¶©Èb]"û[ˆ-5∫TWN„ƒ◊_¸Ê˜ír1∆Ö.&∑9t˙W∑^ŸW¨)¢ÔŸz16¡å¥9ÉDñA∆úÄ∞?<¸›Öççª7•8ª¯átBÁªÒc
(GÓ.fQ∏2&Ä1¡†§[≠Ω∑}±Àˇ˝N»—∞Dì‚ßÎ”6˜≥ÁÂq\¬ç34|Î¬ˆì∫W$"ÊaÜL|wU˝Qtö˜ô~®ƒ€:™*±à¨ú∆∂à˙aix™2ﬂpIΩz.æî
ﬂIö‚<“ Ñ^/÷á…œ¸ÔÜbyã3 ı/ÉãöÑûµGzZânk{´0-hä`ªÄ5∞/ìfﬁI¯[≥PS†ö·=À÷ËÅ‘7.áà∞KZ>‹˙ÓZÉG`4ç#ÌÁÚBav¯<åÖÎfê˜¬Q+gàg0M≥$ÌNíêﬁ Í'o ¢¬ÊÊ
¨é,4s1ö)∫ˆz=ÒËÛ∆‚0AÂëf;ø!M!ñá≥†¨ rWDÓk˚@zåƒU˝d—v/à∏éN	±ØáòÕuõ\UÍ|ùÇW˜•*96q÷"≤∫WUu›ß]ßI»~È{ßºù≥GW6ßgí40ó3∫+Ã&Rÿ	rï?˝—ˆÒ—ˆ·!Ÿ9xvºΩˇlÔ˘w¸‰ªÁ'˝ˇíùdGIF#düÇ(!Bh∏6é◊w«O≤D¿ò•®“9∏fﬁãﬂ>+*`Sö¡;·5qt5¨fµo\VcŒsssuı.^w‡j f:È∞üè+∆÷nŒ*{Ä!Bìä«HÖÎ3¿±á˝‘g
†–ÍùAÓÛçÄj/ˇlwy∏DZ≠N]O’È˙‘Ü·Ó√Ω}%FΩàŸnÃ≤ÁÅ—M·Êÿ‡“1h∞U´“èT)◊'2ã∑Rè9:aÕ}∆ˆÅùf:!Ò≈ø¿M]DúR{6ˆ≥Õ¨h6NöéØ¬– €V”ÀC@Ÿ0xÉ6	©Bˇ∑B$ÂÄwê^|ª¸RMa«∫∆U÷x≥‹eÃ_YbxÅÛR—¯ñ)ïtù.MX†sé,∏øÎEë€É[±	πX#Ë˝™QMÕÆ™#˜æB«mk`”ö√œﬁ≠ﬂsãÑuaŸ∑ØÚ\†>C6ÄÍf8=!–1zgóÿt¸Ω]Ú¸£âI
ÅNó” ”±-Á„`0≤x˚U∏ä],Ìá_ÏùÖCL’D·‰$ÒRø˜&îGTm+hÎc—L¥o…Õ=`õ[ıat“#_¶Åá2$ÖÏiê^¸=*=ﬁs‰ﬁ±é√ÍgË∆≈ëS_‡ıïCœTÅ(WCJÓRI˛æå(î-ŒWH°≥ÇÄH∆d´⁄Õä~HrM,bÃî≈A1∂iä~èØGy>…˙ÀË7ÿ{ÉcÛ&TÑQ'¬átl[ÃËDÊﬂGÄ_A<H¸‡„Á˚(
AÉXﬂ$™ÅzΩ	c?yÉôŸ‚6|X√W Æ≈ü∂„lD¯Æe'⁄Vπ÷›`„÷Àzó±J™™[ñªû´Ÿ∂πHy?f^]/Ñô!K≤}íÜ©[@um∞Kdõë+¡≤◊3z‘'^ñ?ÂæS≤Õ»Ã,)2Ëy†˚?+K"◊◊Ìæv¿Ø´^÷§0õ2gåLÉtÒsb¢[]ŒÀk»^≠ˆi”Sbg>›	SÿakbEÔÃuô†˙&A7„÷É2ÙÁ&◊m:Qk˜`Ma%Ω Ôêπ∏¸$@ø/\CNÉäHÑh¸Lü0Ø^ºÅSRüyiH·Y‹§dÙı3úÛ 74+(¸Åo„øÚ-§-7Ç∑ì$Õ…È4¶1…—'~Ù¬ÌÛù˜	˚K|êíjÕWÊ~v6‰˙˘h´uKJÒ£ 1OΩÉ¬≈£‰ÌVkÖ¨êµª?ÒƒÊË2Q≤§ZrÑ¨YP@˛~
Ï≥t-ÄüÜQ¬™ÿ‘⁄+8†9ßˇÂØﬂ.ﬁæ-^¶z1€À´ÙÂU˘ÚfÒÚfÌó◊ËÀkÚÂı‚Âı⁄/Ø≠]e‹kÎW¯∆UFŒ æ∂và„¯Ø Úç+¡|Ìíøc¿|µxyµ~ﬁ+Ã{€ƒñ≈ﬁﬁ§oØ_ÚmsﬁkãºÕ^ﬁº‹À´[6.9„€ãΩ}À¯∂2ÚµÜõ‰ŒÂ>Õ{ıí´ÕH√›ÀAúa Í%—Ùˆï~◊ÄŸb®≤~àÛr˜ío_mﬁ´ÊƒCñ’´}mÛJﬂæéø,≤q‚∞z5Í†|}1|ª}µØÛπ_í&ãÛˇí__ªuµπ3ÍÜ ∏¬a∂zŸùŒi‘≠´gó›0Wõ;gΩ.;˜;&≥–°ƒwÃ⁄’vÃ⁄e˜+C∫µÀÚwMŒ±˛Î ÓùQNäL<8ÌTm≈%&&1â≠‹üÉœ{Ÿ$
Ûˆr˚g7v≥wÛ!˛”YR°üU¥yoÏM⁄m¸sâÑä~ñnè&‹Œ~Ê£vÎÊÕV’ÙA˚ Ì"÷´ﬁ ÚC–·º$K;VEIÇëY["›5EÅn&}‡ä÷ÄèÜ	‡|4’A.$kl=∑A{á:?ı“O˝‰MÏÑ:.âı÷œ‚ñ
i⁄ÑAˇH˚oX„}÷Ôøˇ>©ÎhÉO»[÷(ecEŸ5ŒªÎ4ªêa›4!,1åçÜB{££Åz¥a≥u
›ö	D°Ú}9Âû2©q‘› 8fy◊≥ÅpéZ◊]—¯a‰’(tM&ª¶O6
´'À‹˙òGU´4S™g≤Æ–£Gò“∆Ç´B˜'Î€hÓ≈îKñÛî)T; F†∫ÕSoû+·h:ÓçÏÿ;9LìIFßÎü–HO|S3®√˚§ù∞i((`;Ù‰Ûñf≤@hÃ‘?Ó∂‘ì⁄ÖÏ_±e[uˇZG›f^≤åu…>™•Ú ñnÃ˚@Q	√ã,“¡Ë£iêû/±O ﬂ/Å`L≥ ùœÇvã˘ÿq§è√bIoq[Ôc˚…ì îÍøÚ0Q®nÙb?ƒ`:|Ïü∞p¨ÚÇ»ÿN‰⁄H§Jz<ÕÀ{∏Xƒ‡ÓAN•Iòm√öú¥ó’ükuH>‘„ô|y”œt∞zÀí¿Te¯9¨÷˘”Lã}Ì¿~îL”¨Ω
ß≈
˚ü˛¿ÁëóœΩ¯SÑJ1=πçYª0ÉÖBì˜ﬁ√…‡è‘{/πßµIËH-ßÄúÌ√bàz:‡èèw cñÔˆÈ{Ω8ySÑˆä>a±ø Ó∞»∏Cñá/Cç◊Ôiœ∞˘lM<„øW9°“`àëhHLéí”ımëΩ^Ø@ßóΩ¥€ﬁ9±@6–o√K J¥=cnÿÊë—Ê§£éõıÇ»E€ 	∞7ªÏ+••¬ÔÍâh|´‘?~R—êªÏE¥*s7⁄¯≤86t‘Àh∆ ÄÿQû>ÌìÁ¡ ˆ‹}Æ^Á ˘·ŸúΩõ2√¶∞)ìtœå⁄Ì¨åØç∑‰ê;˘nÔl?¬©∆·Îﬂ~ëıBÈH&cZ•U»:rçîËÀœ¯õƒ∂–Ëp√‹X˝∏ˆºæÃòÒ˙ÉY“+ÏIOZ Ä(qD“+¨ø‡∞x≠˜ËùyaÑ∆?
ÑÉ˛≈óºæù˛rÑŒüVháq[ùÎí—øúéÛ+¢#Ôm{≈|‡$øÿ1Ü2@+(¨˚aê¢’ål…ı÷`èıØív1eÌyá‹$Ë-“/MıáJ≤∂8å8,‡ÙÑvõ˜å{»Yaïƒ=û∞~?Œ¶ß·Ä*µ¨4¥ÿRºœ’{⁄—#S £Amíz *˝-ıªfÔwÑ¶L≠©Ùe¢√É-\WKﬂÎˆæ°Ò˜à ≈6KŸﬂ;∑müŸ∞F|·Czºà¥È˚ﬂÎüÄÁT∂Ëòsñ…í—ãª˙RÓã-P‹2&S<`+Æ˛~¢%
¬)-ï&(ÓÃç#@!°’«#vƒi~@p´≠z@»œÆˆ…j1àµ>Y+~≠˜…zÒk£O6ä_õ}≤©U2ûîr(/º˛˝Ú^π›#≠›âhßÏﬁ’ÏyVÛ']~ﬂÜ<ÆY∆«∆áv]Û≈énﬁZY>*/)7‡îŒj[Y∂¬ÎO Øví)l„m¡}∑3ÊR»ânßÒ0]‡1“∏J%øˇ}Úûª?ty†{•∫S
Ÿ≥ùﬁh_í?ƒﬁ)>]|õˆß¢≈ Y©r≤LÇ°˛#ºLeX0J°®UôiŸE˘JsÉ h4◊G`5≤rÂã‚¶oNòWDQ⁄≤’öø¶≥ﬁ¿õ¿/µµØç1eRê1¡ŸÒu‡á—‘≤∂"DÍ˝ƒ§l_I8‰ 
Öuµè›´}˜˘¡áéóq1≈¬÷wÙd˚xØ’—7ùµªz÷˜hfv](ò,YSuıO’Hn/0êÇ∑ËˆJuì˚|»≤â:t˝ÊbSxr”ÎTŒÌ
 ﬁª·ÍM®õnò^>ˆ∫Üf.
Rï]ﬁô’∆H˚Ó
±„^iôöi√ñö≈P`Ÿ	áI˜Æm§˘Zö$ë˘˙ãﬂ¸ohê:Ã|†G®Kä≈úîºzÊKÚ<™ßt..|b_?å/˛få	y'iò§·ÁË˘Ãºù'	:˝¢ªÛ Ã¯»‘Ã!£Èÿã=’•uêN?ßqπì‘˚<…ñËI«Ÿ_ÃGôÙó¿Òú,}pOôõöú√E>öÜ °¬)#√π+bÆ4mÄˇA¨»∫k$ˆãü‹ß ±QÁ»sì∆9Íà¬≠ÍQ•Ú¶°=ö¡Úˇ•-∆∆ƒbETåªΩŸ®ÿÄµr•&üËüo<$K˘ e/¿gW,A¢3…Õ±∆gÕßÀûïÂ%¬∫^xˇ⁄ãV]nπp WY+!˙e◊∑N8§™EílÊu-R)^^(ÒÏ˙Îw{πïíÈöØ∞ZTòﬁI@bÀØs≈daéäU”ô˘ÎZ∫ ö◊IˇÎÂ≠8Í.ªd¨÷
∞Fﬁı≠W—ÁZ-C–a‚—%M˚©G◊’GR™Ö¥´[è}V
)MﬁÛT·Ø4p‡â~Ùñc≈]‚ZX˜£i6‡Yë¨¸…íH0Dí)°IÛ§îÑ«ñ+¬ïÇbÀ5§òÔ™sïôW%`πí"í©Á√&´≥…¸âïnı ∆¬€ßd2˜Mffæ”xÇ3ìË†©çD1ñ˘´”6v[BuÚπRÒˆ¡q‚{fªc|+'ÀÓ/≥ÜïoSór]d{ƒ–É∆5ÍÉ ∂ú(ŒeñcØŸ(ËFÄJÍ[’Û¢Q y¬,~ı◊§§O˝˛0ø«T™Õ&ÚﬂÉØ˛ÔˇÉc…ûè/˛!∆nÌÔG˘=g_@î(ï®P¡√[¥;ú∆QÈs≈®≠këg‘ÚçZQ\çëÆƒñ∏T'?Ä,#„Q§11»Ò≥ F©’}\√∫XHE∞ 8£˛Õd)Æ$Îi@Q™”ö‘Ï"ãAÅùÄ£∂∂Ãœx- ∞RwŸﬁ¯ƒ£iŒã7∏ıüÍˆû>⁄~Ç∆∆{f$7öXN<<BR¡@¨ä∏∞"ÔKiQÃ¡»æû–∏~ä–∑;õÓ√√»PîG«å¶e£é∏Ùë+"ü*ﬁ(cÁwlÉ'˙–[îÚ zæ˝t˚‚/.˛˝ÅÎe
Yj£ÿcÑ“•~"\F∫ªR∞ˇ $gì∫w¸|˚à≠}ÂYÛÍ	‘õÆÏReW¢*q´—‘ê"|ÙÒ•»µs˚›ﬂ.<±€Ê≈r~»Y±üwä ÜÁAÑJ±SzMœà√ÌÁ;˚€O∞‹55S:Y^g˛Ωé%*ÿ¿∆_˝µkŒu”*2hô7å≤‹µS˙ÍWˇç¶7yvÙÒ„˝ù˝Ωg«{◊13÷myn&Ò∞dÚfó#›uÁìÙ÷Øâz∂™+]ÏÙÊJQ±íE€ âñ∏/'Ko/ÜE›;±]9D∑YfÕÌÆÕaa…Üa£∂kÜ«a‹}”µ•=s¶ÖiúˆåváÈS™ÎÈ9û…˝ ∞â*º™U≠Ÿ;∆E>òÒ›‰J}ÁN~«¸`&^¯AìY±∑\ΩVú)\BEû#ã–|"≥11à–∑WLΩΩ&”¿3∞XWYr ∞∂¨‚yí®uŸìeQH◊=˙J 8ÛÕ⁄c¿i˙∑Æ@FÜ;G#”†óçîóXDw &ß™√ö°\Ü∂ä£z,™_Ï⁄qâbÓú≥ElÅΩˆ§È„Æ_vÆhïï%H/∑Ç˚-¥UTŒë2ùFüò¶Ênk^+'Z≥O:Êq¿ΩfÓ¥qD”™AW1qÁìR!.™v‚ò…/äËªW‹Øöç“õtÛo^
Ò+VÌOÃè⁄±Ç,sd*kz¥P€R-≠îF≈>w}íì⁄\—ã*å*rä˛*à°zlçJ)1®ÛÉ√ínfç]¡:Y.3˜CÖ≈ÂM%s2}À}º·ïÂÁ∞:?"º¢ï€§ã&s©<$‡-µ◊äÀQØ{-*uÌaï6€»Ô%
Oo™È›‚§í;!d]õ|§W\∏íŒ…rÕ>”^‘FQ;]qŒ◊2‚ó?°úÚç£»6ß»«C§Rë$ÔXﬁK5"”KSÔëGÆ»4è≈ﬂp{B#Æ¸>¸Î¨ﬁ‡Xÿ‹4ŒSwÅÜ9ÙöñMò’™mß˚ïÿ/ÿŸR±ÄáHﬂ3ô¢th§Ø¨Ï©OZˆ´≈∂ù/.ŒÀ√ƒÍ≥lõ†Ùb∂ΩŸ°æZËS∏À™Ta’Ø y“dyÙ‹ëL)…√qg4ìkÎ„„ùVπ\ß~πv^˝öÛÚ“<èmÀ±‹åpÚŸk'—˜*ÚÚ„UüõØBÏ*´	„Ö!ã…É∑º!e"\eÅŸÂa›/Uú6√Í™ö‡O®B7â±	lJÄ5ÕJ-»	äù<yZ!vJÖÄàÓùÚ	|ˆq8ŸìûíÍ¨˘¥¡˙±!«	˜‚U¬*lW•ZX”Kº¸Í˘¡Ó«;€’4…ëË¿à≠©yùxÖ> ÅSÛ~øX©˝R1I‡\>5>TüºZyù¶5[∏ÉFUœ∂+`¶ã‚√"+rÂÒ—X¢}üÖHÈ¶öüM¿‘"h™$SïCß‹üåŒ≥=MU9S%¶çö¶≤ú©siób3©√¿á2rç«h’2
«aÆFZU~†)z◊‚ü? teI√™öÏÎ5èµ%®jZw ô±–Ìô∫·(≤ƒ!ivıƒä3qVàæ⁄πéCSM3)èMÈ∑•Áû\ÙpTTÍÆ ü_ÒÎ¨Q1∫≥Ë≤ß’P£€f!gMki&
-R»˚F∆IxøÌä0]πn?ò¶) Ì„•Ê}ô9‡9µü`Y˙˚xË'ßœé»Ü.”45ÇÚfü‡·sFå=c∆ˆ)â”"ÂŸ-5JûGPë_∞»à2jæ‘›¸7—ÔŸ-≠;

⁄vπs¸xÔ’ìÌ£ΩÁÙ∑<ªÈè˝gOˇfL¡á{O{,Éh¿¸±wBøø-~ï?ç˝b%ô'-ÒÛÈ¡≥˝„^∏Wﬁ›Ÿﬁ›>:~~p$Ô<98ﬁ+~)≈~ÂΩ£è?‹;:ﬁ.nÏ}rßÛJ>{tºˇ—«{«€EèÏ›Wá{GGÏ6ÃìèUù*_ﬂcêhËdwäﬂZzÉ"ˆ]}€JzŒìúˆ}òxÌe∑|ﬂÇ⁄Â\ôwF„yi<–P‘W`°fƒ•vã1^Úä~¯’D~·’>!“"ãH1⁄’Cëπ'o”Kdu]A÷WVVDÑúOòÌ˘@x‚°ú…æzGÉHQyúø#ú`+ñ¶_>VÔh/À2‘%8Ò∞¢ÂeB[f$O∫˚åQ1õè2b§≠0≠8àÿë@Û≤¿¥Åz“‹≠Ì …{L_ˇxüú5¯<Ë#•ØRÈâáÇ–—öw+rd(=()2Õª⁄¢∑∂è˜?Å-ÄËy|∞·÷c˜}?¡S Ïöﬁ‘∆∂∫¶&ﬁê4Ñe)Iå⁄†ºÿZ/ÂAë[`Éôçƒv,kΩ1L.≤Æ0|§g≠»˘KqÆÓì
©gwUŒíQÚÜ7›I‚”0Â¡ÑÕ›˙»ä 
ƒc§î@úëCÎ#–&r≈¿;≈ÿ£?)◊ü>S•¨©£6LeŸ$§‹ÊáJ–ó”f 9î§å°elA_í˜LƒAzjd·¨ë|teæ©æÒMŒ ©ïé
´+j∏aÏ◊≥ˆgò1 xn|Ò>:Òø∞æ-¨‹Bãâ2Ëüâ„∏¯2Çø{d78∞Ã$¿aít9\!â2æ¯Ú-z∂»yèz‰.–’ÚS®“œUD∞ÓÇ∑@ÿ`ŸDvàíÃ""kuâEÅîﬁ≈µ;=ƒìÙÃñÍ¶ üà.ÇÜ4ı9ÖQ£äî=ÑÜ\®‡óa„Jƒ HaFÁ# XnƒÏw¨˚ª‘ÑZÚX˙g©Aaµc≠äﬂZ”6ÌL—ä>Ÿ~∂˜cÆS!ÊS©pÈX¶∆S	±®£Öß; ,|Tµ%)∏√±óû√¥1çV∂ˆÚbE∆Ã9;Ë>áv”ÂQ^mÅﬂVÂÕ◊€Oˆûoì√É√èIóP∆Ú¯Ä<ﬂVÛò,zumìÉèÅ≈#á{ª˚ª˝ü≈?ã_ìj\˛Î·O∑ŸY2∏¯{ÙÛΩ¯íáÛaƒzπ^¸›òLcÊJç¡~¬X|p˚à˙¿ˆ-ü¯Íó√]˙‰Éô≈7¡Ò™∞˘[ﬁ’¨Ù÷ÈÂ~Ó—˙ä˚œ>ﬁ~N@N«dd@EòHvÍ}`$#€vñ¡J¶yö:Á10àBú*÷vÚ‚AÄ≤®ø/ıóJ,C˚P1vèRJúµe’˝˚lRu©&Ü)0∑Ùj*È√À‚oÙ`:¡Lı⁄/4(ôzRZ<NÉ¥©5`€´;oÔŸ.∫ÿïL∫>Øo*C4˚ƒÀéÊÉÀˆB‚∏ÿ0,Iê]Ôbt‹åòö∑∂âY∫Çéæ§~GÉø.˝d‡jC4gé∏oB¢9 a`ûÔ?IÜuc
}5ïú≠õÊ®Ë.≈2&†Bø‘∂b¬÷ä¨niâF+¿§ÒD˝∫ŸH‘ÓxF SîIpo\daú’ÎÁb3√˛¬‹¥‡Ù S·òœ61ﬂÊxÙ§®Û∫ Ú¡ı_çÒà¡‰˙4õú+á›ëCRY`•í7LD}Î’éîre›”?…´oÈΩQ>$m%'üó±◊Ñ:µO⁄⁄ßX¸Ö|·˜V^ƒWd∆?t¥ë‰@¶¢pQûaC(9{L ı’ÈÕí3VsÒ∞#ΩOﬁ”`†∂¯8ô ‘y2¬>ÕQ»⁄oΩÚ¢4¸Û› - ÏŒ”ië”á˝Ò“…ÈôÃ9‹7h€ íŒb™Ï.‚âë˛:©£ë ~iHÒ;
?ƒ˛p9ïòT∑œ‘SWÿ(ﬂ+·ì€Ql≈πD6 x¥Ôß…YÄ©ˆ⁄bÄ¢“ç‡aó$(iΩŒ∂äª¨Ë„T≈=•ç¬úäß≈ ¢Œ…£Ì˝›myH˙™<˘˙»ª¯!ñYM°Ä¬l¥â¥é(—y A∑Ê ˆ3èÄbΩt≤_ÄW˚D#⁄MªÄÅÿ±,$4TÂ¢ö&´Ú8pÊ÷[^&«i8Ùä∫≈T'@(áÖº+’(dÑs&3M3&2Å «˚nO5ai⁄KìàßR|æwàÃÔ≥„m$x™h—û2L&ƒîE‹hS!!ö@Xî)Mã!äUf„øÑ–9†BÁ@˝™äzOyv√lyÁ<Ìöh¸∞á—lråz/⁄e%”£»[2%U£¬dr√cïª≤∂œq[JA]xr.ëcoÃÓ´Æ°K‰è7/9btCªme¥≈ªñIRE∑§ÏV”;¯s…SË˙¶“Çàf6ÂìzØíÓp‡÷C^fòfûèm˙(⁄6ñko«€VÃ≤Ω¿äij‰FO|ˆ"Ãû&q‘é
ÎÉIs˝µÂIµ[®OãwºT∑ÏËè vëB´z¶ñ¶„EÄM‚Ï°}?6njΩ2Ì›â#™ægdLY@îâÃ≠Œ)–÷^öc)Ñ@H€»ûîÜPÙ∆8•C¯“£Ûß^Ï)Ö±‘™,ÉmUx$8îÇ™ Ñ+È¡wÜ∂5?¢Q√l?+TÉ\1H⁄æPbÅn¶ÏÙZU:@˙^Iç"¥¿÷EcöÄœ¸sÓÛ≥8@Ì@•WÇsÙ+(-ﬁ+	»ÌÇV¢÷ºE∆jì˙`òz∆Öõ„-
Õ ˆ—À`fÊ…µsöâ∫T(gÈ¯ÒÜ¬©“äöOY$8M3¶^¥º}6ç≤Ñ‰^ˆ©∆ÑfÄuQ <E-eI∞dﬁø®Uká¬Z`6ô˙ˇ¥2|Æ.ÆAyg¶˛!@‚ú?÷≠vS…Z1i˚“}#√ß\±™éD[©ûÑôQ2¸áTÉ‡¸L…¿\ÑèΩ
cr]ü®≥j‹©jæÆÓxgö[;≠Lö`Â“p
âC≤ÆÚÂó™@íc‡Ú∆—∏Xwí∆‚Ñql5fÏå} ƒ·±^∆(Q€'ïdi3å(á°'€‹w^ù
œŸJsf0Èå>Rû±‰wµ=òE{oÍÓµ|˚Ök°ÆËÆO O
Õ>ÆºJt’ªôïFT—ê §»∂#ò7Œ«uä/–ﬂ⁄ãR3ô™˚¬ñ¿hZŸú`h≥í»&TÆ¥ªí¶¬“n´Â<√µñÈNõt^o G
L};75¸ÿ—#µ£ì™éNl·>e„¡Â§ îúÏ~ó›-^·OïqAKÁRl§9∞QÀ¥ùe·0⁄ÓJáO#ÿóÄˆæOâ˛dç^º,3]AÅŸX@b∑»|
À‹∆÷∞ßNıÕPPúÆæ≈Ó”ÛÈˇ©ñ»;üìïÖ©Ø|’öàﬁ‚õ⁄πEÆ˚›0ã~»E•´?6òÊïj<hõÁm—ô=?æöüuø§”Q≠ûÉ|ÀjpKˆc?xã¨πäsT$•O⁄Ì)´@0M…TÕjB3Q≥^l#ÉJ≈ÖEO˚“ˆÍKMıﬁÛäO IêG~[˘û˝ÄïPπgÈKò?µGD˘ÃS˝ÑæÆ’ì§/~<+eÛ∞ÇA„ˇÿ{_˘Xù•H“nt2ÔÍﬁbv˜›ì3Ù˙ÍÑ€ ∆¬	æ X9ÀÜæ¬“±èT≠ùÒç∫¬—„RñûıY<ü‹ªY[ }eMV∑·Ú∏†∂DåC’ñßD/Ω4ÿy›ñ¬Q;ÍÙ;∫2≠>‹eÅÌBwNÛK¯n=.è‚3c<zC¸Ÿ~Œ?‹wÇÙ˙Í\_â≈_ÚOù!ÍnY \bﬂ~®∂2ŒPtÆ∂
Nc@CôΩBjØñ€kø&;*≤∏rG1Èá|√ôC£,âó°ºËôQÓZãÙÌ&xfˇåÍ9˚Æö"û[:êII†7ôf£6ÔF· Ÿo‘.˙¬“≤≈ﬂMsÂSDTt‹+DE˘K¯ÙÈ¢ü´Ó”•˚
Ùrÿ{´=Dt⁄RÌRh˙6‚ TﬂT‹^∫˘¸Ê£DµÄ>@abUGo¿m≠≈jÈèô—UÆû˛P±æ⁄•yHVXPí;D+§®ÖV©@ÊÂöŸWÃ‹9Î3Æú-7∑Ó=;~æ≠òüM4À–4∆RˇÌ{‰,Ù»áAzÒ˜Ò ˛ÍÖfô.1◊¡¯‚ÀÀƒE ˛ˆRüYÏJöÚ_ê«¢Á›ÿH5!«™Òö»¯±
Í*i‹D£¨9∞ è◊DUÄ‹Ô=∫∑ªø˝|_åºÍRC_Æ€≠ù— €‘Y™¬1±—∏ùtßÂ©•=5‘ß1˝1≤.(tH√úVSX™dªí*’¬¶.0iè∞pR©í£Lrí¢OKwE327°X
ï¢ª„¿/æL√‰zâQ¬^KLOâ◊HQ¡B…bûQ244—pßg⁄ˆT(Zæ†°“C¢§ﬁ)…EÙã&«kMPYyƒ˙¶ú”≠mà,´µ lŸr€úxá‹¥¥rŸŸ•Gî˜ç÷˜¥5@]a‘TuÈ¸”Ö!K.¥~¿lnS{Í∑i?m$Ä]´TûÚ◊o]†ÎEM¢ÆÆõFÀÔó±™l’ê‚Ôû‘∫k)ßÔÖ}‚Yíáß¿Ì!(†LFœØ◊€ä£ƒ©F1r‹Ê!âÆEX∞°›z’Z"-“ÍÃ;H\Â\ÁÃ·Ç\ÒcŒ≤/3e†¬°Iœ/t£TﬁB‰%ıF◊ﬁ>Ûˇ-ªPjÃöí®ÄTç1∫Å)öπÈL≥`ÔÙ4‰ñPdÊº≥w†¶u€˙?	ŒO/ıÈÕRÌÁ†˜)÷F¶˚-xì@«ŸfÊq~ò±ü<$	Ç~ÖaÙoªÇ1,®:J=˛ôÕàw¡ ÷ºó˘yÒR	åº4œû£S6ã/~ªÇIÌ–•F&SœILW˝`‡!05&P»däeE…ÍÊ 8#C®?»»b$$ÚŒÈ”ÑƒﬁY0§òÙ=ç&@qpo‘»á~‚åV?x—`y¥lEú≥´1n+ÙDz∞ôjß"•ı!©¡æ®MâØØí¬å.Áé›pÅ‡4à/ù“Ôÿè+£kÊ|¡$T˘ AÀAﬁ´¬qe^˚»≠ùyQ[¶äVr®ÒˇK‰÷
\ù{∏Jlí mÍòz ì∂ïß(˚/ÊXB2¯ÄjÆW|i-È#ö¸Zi@?/°!ˇÒ4ä˛æ#Nj~v\>2Ó±ŒÒñ‚P|ÎÒ'Uæß|ºKÓ‹⁄¿ÈØXÍ¶‚˘ Õ%ÿü¬¶”ÄéÜÛTƒCÂû‹z*Ê?¬
àŒ$‚wŸ≤kôU
™x1≠¥–"£≈5œä–£÷F¡_Meƒ‰fmº&+6/Õã%Xh^túQ¡Ë]i_‚√e=Ï‚0^* ∞D K¥¸"*>2ø¥™Ùìli’’/è\p{‘¨"Òà„„ı›%Â˘À‹%Ω«ü
¨ºû±HÎ´6∏_;V˝}ÀÿÂ‡ë⁄—≤ë ¿wº(:¡ÉõrÈ‹≠•LûP⁄ê<)∂ÑÉ-;2b¿ñGâπpS	M≠ïµ»Xµ≤U•LUÑ3ÆX¢Ë$•ˇh›$Ÿ‰ÿ§Uút~ÈG…î:	©ü]&Î∑8Q+ZO&#—åΩ√b‘πV]ûe•%Ü™≠hº»L] %•È˝Ã‹zî ]DUbV[nT8ù^»€K≈~È†Ô˚ñõœ“ø|VºZ>∂Í\eåZÒtSA-§«‹∫:ù}qå“QIQw4ñû¶ªPR∏!ıVãØNb;^X÷ëÎ¿}ƒpo†é¸v“õÉ|HÈŸ‰
ú•Ëá≤'Ãò(Ï∆µ¡Q…qì}[v¶Úl+ù™sD°x•Ö?4mÛ◊π˙ö:˛íKoÅòÎÙs1∆ôÜIiªÃ≈“~nñYP_eËî·´§Ë.ƒ3ùœS[å1BJdUR¯>ò‰jß7Ò|⁄i{$‡ïñˆ¶Ôo2Ó∞˙%>NTÖ√õw?òç«¯_›{∆¬Í˘A
˛ãªSQˆJÛM•+-æ"óí•¬PV≈âã∏°AÍôxiò¡ë—∫?XVé√ˆ˛êU⁄É-'⁄à6¨‰≈ÔΩ¨”£æz'ÃµxãßÉÂ&hC‹≈:UÌ!YW‘ÆL-k<-ø¢°ı¡øf°j·ôËhõ˝-[˙~}˜8ñ∞ÍÂ…„m‡∑W;ÛÔëqçx∫:˘˜»◊_¸ˆóäô⁄5Ì à1◊a´d43Üsˇ™”[Ö¡7ò¢kz±:ª÷6ˇèµ≥cU…åππÜ‹“áß^DãîÛO∂ÍæFÀM*†º¡UilãÅ«ò(NÕutdÏM8%yÍMx¿ÿí`<d (Ó Y¸∂¶£R¸Oí§◊òÃÇ£lga?H¥„îèFcBä“Vb©´π’ í¸©èEÂÖ »X¯º‘˙ôßzôÆ√ÍI:‰Æ¨ù≈€U’"C *ıﬁPvU8˝	1„bMïÍÚ2Ÿ?Â“%∞†LwrÄR:à‘@Âœ9l¥È$”j·r$á]i GüÅÏ}ãÊ0«åÎôÈÎπDÑ˜ç|9’ﬂNÅBˆN”d‹∆◊–>,¥v‰ã}Ÿ«‹i{⁄3¬n°Û>‹Ö˛:%JØù∫B ˚∞ÒN—Ù⁄+¢πW{Ñ%Ô#'ÁÑCÉÉ˘,#€4§Sÿåtå=)˝j•{∆âµ%ïËy_ ¥ÆdáÆ©dô
	m„bè{ ˙1¿Å¢IÀtt¬wiò•˝-ZH‡,6úÖ¡…1ßBË‘%R∫;`uıŒza<à¶>`é°£ç˙v™|—»¡AeUàhãæD,yKp–p1ÅIT\õSánËü©≥í4Ù[®©’Ô„vCê‹J÷∏Ü.ÏºÜÿCÂg›a„9¯„B2ë@‰¥\±)kΩ1%Am?Öqç¬HêTD‘v£⁄ˇ¥F?\'Rt#Ì1R~Gx,±â,—±,—éÊ
â™^:Ù~î§Ë∂P%w´G:E6ÃRüıy“X<“3äzÍâΩÑ:Z·’x‚t_¬S∏Tj∑≥ú^Öî¶<Ésm¿¸T»«>X¯ôäFtî/–õàz/Î££Ê4st+•Å≠ÿ«¥"éwπå@Ô0FYà*ıI{N ‚Ë}·amjhË{*¯¿£	©çe’V¿Œé‚G4BåJôv˘m±O'⁄9ºslÁ…«ËŒÈë÷üÑ·âi>{èR@{ﬂ©Á’‰À°È∂≠ÈõpÂ‰ÙG;€œvˆDT'9:ãÏaAri<ì<V0±©·≠	<¬™ÙÇR "¿ªÎ+‘‹r ’¶c9=2Aªs>à`Ÿ`Ùxﬂ∏≠CW’Êü™yƒç[™^∆ª¿ŸìàZs
Ïy7¯‰O©≤⁄ñÎR”—È—~`:¯/nîÃ>)f`∂|¡≈˚bùóHÓJÌ‘i¬ÛuΩöÅ†OïΩE«πø°†8€Ls7TF°/6 IØU)L(≈ôgZ;Ù`y;:•«L—A9Ê–rD∏∫-\æJΩZ£NÈééiÍï˚µDo-–≠Ù™µtÏq$E)r	™'	+«b o(kX¢_=ïÏ„ô€.>pì£k…ÖI%ı¿Í¬·Ä‹ògaFu5;Túê7Gâõfõ Œ\F–≥◊28¶£Pwfc5≥Y¿«∂}_dö“„gÙ<'°'].
öá÷»û∫)‹€A.ûÈ–TÄ¥Xq$ ¸†•øÒ¥5í{O{⁄ã–ß+
{>÷°`¶ËË úW©e[t;/≠íƒ/‰xäxåÎQyUqE’,™btFW74Órì#§
ƒ"”⁄d¬™—®˝´o*ö«^iåN”»vò,zT∫ EjŒ ‚=„®tgøÃqiù!Y¿lpd …8NLe≤ÂSØ87ôe7r»W%A…*ˆT 0Vå,sŸî.„XJŸ‹˛\:8˘9Ù◊£6k”/tƒnÁS£˚XfˆÃÿt˚
ﬂﬂKVn[≥;	ƒ_2qe… –K§÷n√ÎiH•óI·≠F{BÂ≥˜^HôtIï+ótô˜e¡/O® ‹m
#,ï$)„≤¿«'	€Ë{¬xåöé-}JiªË+å≈‚Ω)B∑Û‡Ù4ÑA<@;è◊@
º4
£û$CÈÉ.ô"7∫D˙áE≤ñÑ6§:«íæ§S∏b˜]	ÆºÛl/Ú&ÃA÷Ãx∫*TOÙ¡ £∂‚*Üa≈‡ÒxŒSE÷E©Òa\[$z‚Õ°0“ÓrùëvsO®çT 9‘? üb,4@Ù? 4*ï@5*†bﬁµz†Z-êWµ*H?n‘¿zH®∂œêGn«öF3µXL"N~ÜEdå4Âl\*œÚ3SZ®≠dó|†l ˘åÅÍ”áÖ≥}ÎÈ≈ﬂ˘°Gvi‹ä◊Íó\^ ëïm°DÏx¿QRsò¯÷√≠Ò√0ÒŸ&√gÆü0/¯S⁄m&Îµñdí_÷“√M4ƒÆv\[*À—≤êÆñ$‚¶/m.|quÕ1Ωw0L'^‚Wœ™P∆~8ë´ô÷J.Xõe†*d6Óe»˘¶≤+∑J8ßMS(ß¥Q…œOÌÂOq:'Üô†–8±È&!s•©Ò‡ƒf
vî/IóÉ>I®°£\‡U:,∏*b¨‚)¶8Ø®≥2º”∞fÊt22sûé—Ø$yXù‘≈ΩÅÿ'r¨€ß—6ÔÈ€Zâ›µß®ﬂÓÀøägavp§Q;€7: JÌ•Ì¬¸ùn·KR`#ÖÃÑW
´2ÀÏÙ‘P_(Eﬁ‡H.‰]ÕÅF˜h/À¬”[i7“€çi#ùc–[†◊¬⁄Üíß‘g~!|Ì^0ÛÁ>˘`6"ﬂÉvÛ¸9Ü?o≠Ã«ØãóFÊK#[À‚ÒòﬂcîUsªœ #>aÅ°ø’¢’Æ∫Ω›e≤@6o˝£ ñæ»û[ZÄbë´˙pÁ∞E£¿πDÑ˛ƒx¸Jg%s∫Q™~á ∏≠Ÿ˝G^J=¸◊JEÈ•ßç›ö≠≠Ã…ÚiIóïûÕ™ﬂ≤ÄıÊ
V⁄\ßu6{õ¢jıâQæzeÖd#8 ?ÌÆ(¬≠•ƒµjŸºpg7íIwEˆ_ÓÀÉ¢Ÿ}€≈»v OP°ùvcLöË⁄}”E”?-Óâ=1Ál˙X´Y>≥£È…±wÇ1Æoø-πÚ„ ˆ–:’ö&˝	]ZãàËaòˆ"ÿ≈4gØUÄâr•ES1Á±VØîñ9ÕÄ0‰7©7¡Ωó%iwí–hX@Y{Ë‚¿T,¥Z4U÷@•XT8_Wã{w GÊØÕ“≠E©n⁄!kZE!ıóÃz•ó?ƒ“É:-µRµæÆ‘òEF1gŸ?‰”+|~{Î¶è£f˘û™–]p˝⁄v*∑Ω˚tˇ-f˛·ﬁÛΩg;˚€l-õ!¡≈“‰’Ñ¨ƒÀ˛ê±¿®Ø˙Ì°Å1ê<¯˙ãˇÎˇÅMúÂ,Ø<9dêæfå–∫´8#µîxT’ºJ^l•…ÿKC$*óÌ¡ã0˛6ˆ—nµ :gIDÀ’äuÍ•-ıÖø=¥∂¶µÛ_…Bú˘4Kôµ	r/~^9ñ©Àˇ∞©TQ˙[\I9Ü⁄¸’ˇ˜Øˇ¸+≤' ªË¬]Ú†‚§®—1f,≥9ÖÜ∏3¿–„<M¨∏„∆üoáä⁄ÂÔájÒ®Gß¸ÆπxÌ(ó¡k¡%ºJ7\œ(ò˛[XKVu˛€]G6ÜÜk¯!{ŸıªøÏ`aÓ/ÉH+|ˆÉˇöΩ—í…Í+&-	÷&ﬂ/˙=¢ÚÏ¶ q	ó˙ËawÑB{À‚,h©í4[ªÛÓÜ.⁄:%ƒÍc
Í√4Ù	˛ß;H¢¨ªJ≤qø¯πF¢°ÚsÉä‹d|“]kïó¬¢Y`ÉÔ(Ú?G†llË (∆†ÆÄj?¯YÚÛiñáßÁ›ÑI-ﬂ-Yã>≤ÏïÈd§årÇ≠2¿2›7!éf∂j˝!júÊèíü∂a®8S;æµ∑RÑŒ1FËê}3å]ŸèÛ®˜åjˆSÂ_ª5…ªèû:ñå˜¸ ÚÛSz±Ûkp^™+.— ⁄>z˛ƒ—lN]R√f´eÀ:¡‚∫˝GçEá4véÂK˚<ƒÏ"Ôó§B–ÅJ÷ ‘Ô÷Øn˝∞ dF&Àd/Œ”Ä∫Oø£L‡4ÿŒ±ÑŒò⁄9u‹FPïO∆Et∂|ì<^[;	C#7óÀ®Úéó˛$»ﬂ yl¥ˆ¥Í√1¶Q/çpË≈Í ‰ÌK∂Z;ı*ë…ÒÇ$ ®}ñ%pÌÉr°Â>˜¸Ç~òxQÈ¸_@x∂ª–ûˆb	FÁcñŒn´≈LNÂ<Ô≈EΩ¢∂fÌ	öVv¥—q´8¬ù ºb ò≈cıÂv¿≥ø3á+Î!$.o∫´∑a?já‡¯ä6ëU‰∫WÆõ˛À€ﬁE|ï4Â4L≥~2Õ#`ÓòI¢b0h‡xåoTŒ˛'¡˘nÚ&ñ”wÚÏ2≥åQriqÎ3·BÌrg¥.¢¥Æ.ïµÂ¢e©•’t.,]FÀá?iP(¡^⁄g2jœ}af“Ëu“√ c*1:‹!Ì5˚æ*•ØÜ–10A‹-ø–dt˚Í22≠Ÿ/%†ª:ü€5~ìî±^$$(C∑nﬁUdÓ~∏\Aú¨∏ÅØHÔ/çãÔ/ÅEåS8£MŒ/Œ0q,#QÑN7&√+o°`Øk™h3{∑éºËÃ´hËF%Bæ˙›o‹àÊêÎï◊ãäó⁄≠◊∂WXd •l,¥¬í±YxywºxDó_‡ø∫ÙW0CòS …ˇ‘`≈8qmã[B--!d˘™@ìeÂL™ ®˙9~˜é`_
V÷ŒRüç°xç9ã†&í≥F«öb«£mdÀΩîÚ¿Æ∆nL˙ÍwøBk æ‹'3¸] ´F≤*-FŸcú«® Éiël*Çd/.-®E>Ë¶K>t
˘ÆopÈ8∆!≈ÑB˙Ÿ@!tŸ„˚Àÿõc2Uœ*Q‡£ÅƒÓ…*>∏m{ä-t -oRûá: Œø∑‡<ö„w[t›QwM
∆Ù°Ù~Ö>»Ôq©‰,E_eŸπÚ¯ióÜœ<4|¨vﬂÕìnJ√‘òﬁàr
âF:ÿ µ—ÜÜÆ?EÙUYTi"∑fn˙
Rs>Í£ûåQ H-ëÎX‹Œ¸{Ø]öOqµÚºkn≈Èw%1ñG.Er¨|0”U∆d21-är‹ÊßiÌ0`–2˜*uÄuú*«'e⁄÷ÉØø¯?ˇ#”R¯\‰·ë˙ﬁ{‰–É]zÒwqˆ^’VØ<ôÈkèΩ(˜⁄„éïƒà,WeB∆rë±¬Ô 4¢iòèåa∞Ω ŸIº˝+Àa«Tñ=KŒÚ”–yü)%J◊»2˝UV®ÕJ˘0îXá!—•Å[D˚∆M<vE€h›Æ≥0Ù!|:[/¸I''@ÙÏ<ÜÕ™Ñ◊Wø˙o‘ÍœBÊ¬3öAåA6 œ√|úEH⁄GkAF∂°uíu¨ã=Zo¢I,Y»∆~≠ÖÃµyÀä¸;P≈sbNjnAßı$ˆ3?ı«câW√èÇÕLØf÷∞◊ÎÜ7æœs¿Vp®V?qˆÓ˜ÿª™/∏Ì*yoK«ÌÚ5w=p2•»≤EêÅO§&!{üM≠"DE i~äH¥Ã[=Ä}ËeÜW§÷Ôﬁ€>9¥˜¢Q2%´¿hßﬁ#ibﬂòíÑ G<≤:Z_!m6†òÇpãl˚°GÛ—ª?¥‡G÷W∆‚˜˘7`wfÓO–TKﬁ 8(Ÿñ ºµ¨V`V—1{ŸiªL ›Ú3‹â∂É/KX˝¢{˝”‡|k∆Ü#≥ÚÃ]Ú.Øu©-ÓÆW®–-jx©9fƒívxG1W°-™¬∏PxÖxÃÆEßôa(ÅFV≈E•]›(f†5+ ï¯Ä‚t™˘àì’R_±j+ÜXC¨®≠Ï(yFiÛ›ﬂ©‚Ígû)¨±±‹FÒeVPf∂‘PN•8%?Îd@ãkfﬂüv∆¡Ë^_¡ŸkeÂJ≈ä∏–}l(ÆÂCÚMÈ(V[‹Å6? Ü±l¢¢˛¬áÛ◊Û:¿◊¨ıÇK)D)µfL‡˝ïÕª∑n›•„|ﬂ¨›ZªıêÍáE8C≤M3Ø¥È·ÒVú)6FƒòU#¥ª>Égò™VÛf∞ªµy∫qã¡ÓÓ›’ì’ì¶∞C£v©øg	;∑óÂ˘Hª'Ÿ™t§ã¬µ—ñnÑç€w6o3 ú‹]¨ Ç"ÌÚÆ;ÕƒÂ¶Y{Lf6s8ìfôÃZê6î„∫&tÛp8 ·ﬁ°‡aÏKâTñ9ÜŒú„rCùÅò≥Çl~íıÆ4Uö°kﬁØ|Ï‡ûÁWvæÍî8©K{tîYõPTœp¨ó‚1•J';R›5»pÙÔ4yÉW—M6óû-ÚNÇ»I,,ä‘€
LLØ
≤!—ìfcŸ6v'È;tìt.%+çét|ëªbËÂn\xk˙a8±7√ƒ jèU¸ÜÓª¡›Òü<©≤Aaì˙6}¬|$MÔó–,:Y\.Ä®£¨JYß™©ﬂ%rÔË:Æ,|”Ωµ¡HËØ;¶]N*T\z◊ıïM;Lú∆¥ÑñrÂx@a˙‡8A∑$Hóë6ÈéòµvÍﬂe∫-öñ d’Ô*§/˛q*ÄÖy/ÙÁ!ŸØ*˙äM0[ÚútÈﬂ¥ˆk=≠z«A¨·8•à\°∂<¯£"=TìˆÆ	À#“î®ÜΩiÏqB´ˆù;O‡?Úç+îü˜≠—óöñËKH‰±Ù°v$ì%=(4≥ãv¡Û=‡yh|Ω| C˝™ª∏ƒÜw…‚Ü¶|—]©ÔD¯˙œZ§eCÍô≥0 M+Á,Æ˜˝Ô[°–j3z‡{ÀÁÏös+’Õ£{âÕ∫∆É€±.•”´Ã<(úÎ1Üv›_û4ÓØp¡ñT„Bpg,F/Ñéû©’]îRfnôˇ°Q\Ω˙ƒﬁõÎú≤Œ≥Úà∫†ô^ú™ƒØaÓ„~y≥bró±ñ¥À“/’;≥îØÆ£dÙá∞áøG„ZñÆ∏uHÀAÎºu‘Öª◊Å≤¡&ñNT’eWƒπ.î!…3£ë-l—6‡ôVÛ»F-]«CZÊC§t€≤9\ÒDŸ√§íº˙7≠¿=Äcuîz2;L]$©+o≠f‰üsG#dç(Äw√Âu-ê[s…:Ã‘iy4›&&fu_¨ﬁJÉÒKÎÃgJajßSƒ˝ÁA6IÄ=;dt¶cPï≠å‚{.t†‚kk∂∂·$0Óü“éfUM~ƒ;r∂	c`(Ωhó÷Æ1K‘L8—¨.Òq¿ü.'+%RM9È'V ⁄öÈπJ›"ÿ¯Ûê.O&}≤∂≤DR6¥u¯3
NsZ‚‚$…ÛÑñôsz;V®Õv`ºAzÒáiË;õ°Rö|ÏzLi´µN÷+CVÇ4^¥5£ﬁøUö=÷ıVÎ˝ΩÕΩ€{è‹ΩVy”ˇ…ˆ€∞*(Aˇõ[(ˆVªÎ¢OÎåR?1DX´v*∆7û Ó7ò™Él‘¥j™Z3’?¸'Iîáìäœ0iêŒ"å"åöG93Ù«y´∆«Â¡ÃÎ‹ÊbÚπÁá âí÷ù…[gúØ˙4•ÅJumﬂQ-/4_!ì∑‰¸øª
ˇIá'Ê‰ˇÎ≠v*˚∫dÑ…ì`ƒUõS‰”¥Aò¢ }Å©‡`U∞´µ∫pªÏ Åh6Ÿ∂≈˘Z5HDñÑÑêî.˘÷Ï≈∆Ÿ`ãÚùéﬂH[?áıGw÷ﬂ˙ÊpYú[.ﬂrÃ€ö∫]´ı{çù⁄l<”-dòt[Œˆ¨!äË’¿Ô‰]Öú/¶æ›l∆≠ïÜ$ßµWÛ˚V=U+ypÙb8tÏ'Ä&®àÚgØÁ≤ºUªè;ÜoQÌ]é—FÊt„]p€òƒòy#˙äNNcÆ%À›¶IL»°⁄æ,◊≠- zS‹2<çóã…[¿)Ã&SË95>õ˚b–d‘ÿkùÂ◊_¸ˆo…'AJKÂƒÕÅG`vcÍ¢â2-$\Ãÿwƒ97Ã&P+`x∑æì-J◊ála…˛ùÄÒùÄQææ0æ0äÎ^#¶ádô¡®©‹Í"E}v~wuws˜B$3FﬁÌa
Öﬂl∂"◊ˇıM¢“]¡rîQ7â -—∆ä‡Á}¥e/!sº’B8j›xwÇ(™iCò˚≈Î4Ì~0£±gÏ”/äuô.¢SË©≈–{Á˝Ω«p—ÇÔﬂZøuÎÒjµ7^u£™¿"º*<*Ωı®H˘ùº˘á+o&Ö®Ö+äZﬂòºiΩiﬁΩ¨•CÓj.ö∫˘ÏôËH[˙¸\Vµ8q⁄ß÷%p—Íj‘ÂlπGäì† ˝R)˙+NÓxâ˚r„Ú‰ÅQ€™#¢˝v›ÿïöπãú÷VØ∑ﬁæÊqã*Pãk¿◊zÇÂDÆ}–JA™áåOåZIœ∑¿∏_ÚU1ò<à“{k)¶g^ã!¯BXµ–j.√U˚á[;/◊§xƒ—»AÓ„∑å ™¨âˇ´Hí¿π¢¨Gë©Q⁄ï2Ÿ[.Ç‹aÒ¸&ï>U¬ITUÔ5sˆ§]”CPŒ∞>nDæ@°?'ìãﬂguo’E9‘'»–XìQMËaÂÇ‚•˙ÖîRo| s£€{^ï◊¢Ü5ñqAEé∫ÛÔΩÆƒ´yß`VeE≤m[∞»ä˜´EˆísVªâ-hÉ¿#»~MOC≠‰ùv$%x7âG+«ÂÓ©…ﬁd,⁄j≠k$^{c%«ÅÉ]4›Œ˙eº›j[•°®)»äÚâº∆Ë´¢êj≈é‡È.-ú˚’âz,˛ß¡∆;SŒ˘›°eù+—ß1ñPWÙVá„¡wæ8π`å˚ª[l ∫økZ!äG*äÅºcÃA—)v$	πƒi‚¯›C0»„ŸÓ¡uäÜ&i})Åqë·]w}xÀéDì"πB]õ$b≤•^í°J9LR˛ıø˘ﬂï<ÂË∆ Úﬂ∑glIˇC@˚I‡Û∫ø|I∏‘`õπAÃíí0(g9|Éë	vW2¶Âõ‰(RxÅfÒ¥f¥ßÉ© {Œrû#|]“›$Ú¡÷$H∑Zè¶Ÿ¿K©ñrÁ‚üP±Jí)Ÿâ0_–Îı\ùp9¿ﬂ bêfCo1Á&√Yêö›ö!≥ÓtM˙€O¬qò∑W◊:˜hÆ• £…ÑÜaÏÒbDÄÙ˝†ûãV_.hom”®1Ksìb≈$°dvÑÒï3∂Û[e˝∑*isYpÌMw”·ÿ∂Ï»–BQèQ∞«të„d8å7
: Î*)€î¨8{¬H∑e‡Z≥„*¡Ê◊nmÔÇeπj“·Zq…˘J£|∏¥n÷KTªZÆ‡pµ⁄Y≥ôò@‡°ÌïJV{KA÷"”´R}´≤≠2◊¶•2◊mwäN ¨SÀ·VO ∑π˚ñÍ±≈Uõ⁄˘]c·Ò¡ÓwHH»‡«áÉEÍ∆¶\
›ÃˇbÒøï]ááø†%TèG7W¥¿5q≤R›i`5-≥¯¿⁄?‚úr
GƒË%Ñ˘sX¶Uèú #C 1ÉAxb±J'Ô“7{„•-±7`~Ç1Ò›ËYÉõ≠ëÇ.syΩ5“ïùs—“xZ–ıEÚÄ:q#Ú†£”ƒ Af5&K$Ùﬂ6 ﬂâú˛sÔŸ™ÿ£√Ñªb^∏j ì1W∂√≥5◊6R≥9√(&4∂ô,Àâ¥Õu=U'TÎªX™`"[DjÂ†—¨¸gmŒ“*–‘ö&®Ω	fè9M0fˇ5„‹>ò¡z◊˘„‘)$@˙ñ$€™êÿ¨)π%*Fîä$)Üj:©<™Ωs‹!–zõZ{òΩ4ßèﬁfÉÙc%ΩÖ#ï±íÏ.õ?£õß9{_¨rΩèU„dnµômyÙTspôo ◊Ln‚9Ï‚ôÿ∆ÃLxMmñò≠|v™)AıÙÎ,"Ô∫E;Bóïjh@Å., c2h.V‹∆-.€öä≈zºÈStDÔ0∏ˆùTò^K)Y•Ì’ï¸vy£⁄‘\|±"]æ<¡Z≥⁄ÎULgq9πµV\v’Ÿr9H5jNÛä|ó$zJz«R^ÓúßdÕmHá—%≈1ˇÄræ Q€S•tÂkB˝Ω∆ì(»ì⁄ΩsùÙ“$¸"-s≥I3D˘Ê®^mìöNÈ÷ûR≤ö
Uã=J¨mU>‚J‹W≤wTU≠\¥òM–û§¡}äêí’µ¶E&µC÷YlRV‰‚˜VÖ“ûˇæÌ(ÆÄ¬ﬂ€.=∂◊,Ïﬁ:<73ë™W	PÁƒ™PÏÎ/˛ÛˇJû&Õ"˜‘S¡ﬁ€$D?›¢¢ãâK§
k:s"\‹‚¿1‡
≈»®ZjkigTõÚf‘q◊´…óÀπ/‚vCmJeäu3Rc^‹«:Íù?M‚˛µ)‰Ÿ‡0ÔT∂Ö∆8Âw0Q2d≠èÚcäg[2Edπê`M¯ﬂÂFú…y∞fÚWπ·4x_ÙØr¯ ˆ‚|ﬂW¶'nUøRz°‹º(˘»À#>Ê“›ÚãI| G‡”ƒ«p¿ë˚Q¿nàÖ¢èÃ˜ñMT3∞±-¥(ﬁªø|4Hì(*Ö%M˘çôÅ¶;€ª€G«œéZ:ıæ∏s}"G‚ü‡tÁº†|˛1¨¬÷L˘1'ŸÙÑµ›R˚ì”ê˚…¸¯ìÉ„ΩÎ˙0Ô´˛£{ü<A•WEJA¡˝Ω≥$¬†“ŸﬂCX~‡ÏÓxˇ£è˜é∑KÛÿÀ√œ¶AÓej?Ó©‘¸√Ω£cˆ·ﬁ——A˘s ''áhﬁΩÃ'≈7√Ã@NƒW5π†»@X4£EƒïÌ≤Nü+h∞ÑÇÆƒ“IQÔ4D-“ÑùœΩ–ß∑ûb%0≠7{À{•Å ›"[D&πeüÈgCÒY-}æÔk\ïUEdâT‚æ^9åÅ!ÈRaù¶û_æµB>G^uÂe}t;*ÅN‡%?M&(8•ù}ô˝Ÿ∑≠&/{™Sù“ŸbìÒÏ⁄©[w`\DRUÔm˜ç‡◊’∑2‚(å…Á	HÑa‹ΩkIüZLåô¿ÉàÊìC Ö7§¢`ªtd7tˆ®ñæN\…-ï≥l	¯ò]⁄¡“Ómà‡‘ ¿NaŒ≤L¯b9-oŒBWúÒUêB\VÜÕt«.ë;¥ÙB≤Û ìÃ]≈˘\¸û3CHŸ´´œ^î¸Ÿ∞†È[NL;`«Üöºénˇ˝˚ò  >`âôAàd?]©a-‚Æ¢Ë≤…¨ËüÀrA)∫ΩÙ“Ä˙∂¥[ØZKæÓŒ°ÌÙª≤ßÄº2hD∫|	>ÏâóÊB3áõˆ°3m¯;⁄—O>^˛ÎøQ'Ó“©ù*ª≠9˘Ö{QYs‹
Ek~ÛªßÚMŒÔÄ’ŸHY˝õ“¸h¿[{ïÅÀè™J Ü∆≤÷Ç$I«h¿ÅÌc◊®W‹Í$ª\Ÿfká
ƒÆgﬂ8Õ–mÖ}Îø∆˘ﬁ≥ù˝Ìñ…±À˛“ˆÓ”˝g4ot#„´.◊Kõ‰]û¿«VÛ£öt‚Q∫Q± %∑Gá¢£∑©ƒ;T-}˙˙ãˇ¸{rÒø§Åáá/rŒ	¯8åΩ(¸‹Ñü†EO·Í„—Ü„IÕEltQ…L‘’¡E¿:«ºìå2§É\"g…‡‚Ô…MãA<R‘—¿£Äx≈ò1◊œ tDü≈œ`KÉxíÇx=≈º…0∂√ï>®ﬂÒK™Äô'Ω@+åáß^#@2£ÔgÒ$¶π√ ÒŒ¬ãﬂªÜ£wîT|`m–ùM`˛v'GÆı®“®;J1®e≥å"pãz‚‚ıëÑm¥Ïì<}œ^¢ÅTipÃº:ç@çK,^Ã-ñ•™®≤∂åC¬+Ì1‹Ûıîm≥@V˛≠VËñ E<6ﬁ7=\´˙”<x±–ÁfÂàÀ˙9ÍÜJU¥5Â#Q‚DK≠:…RÖÙ‰tYEÊIjÒCZÀ,qÖU√9õ™º,*÷+-LÀ%i[
˜èŒüz±7RzdV9{4W«ã∂BÈ. cYøñoC◊∞ãeBÚ\Ë”]{⁄T¡%./•iﬂI‚”ÿ	 ·≈ÈÛ.¥ﬂã:¬ïÀáUa…’ELeYEÜÒ¬x-∑ÿd1ûP_Ã“¶ì‘YYTÈ=Ó∞}o⁄kΩ–É“®m‡|`
A)⁄[8;˚Z¶÷∑PBÕ;Ö¬Cﬁ°FC)®+qj§ÑQù:ä%TÃòÆ÷0\®‡*£«ë:‰6Íß¨PÁ\“BUDW|£Ì≠é†ónÇ˚£Óãª+g£ó˙“.®k2ma”§ªÈÆãóçR ≥X~ÏÓ´£µ¶j©ªE†5ã|‚àôDpÃ9
ª3 ¢ˇ≤#⁄
˚^≤ËØáØî—6Ã>ÜÛ<Æ∞'ó9ûU[Ò«·c[rü	Sˇ(©äúL£
èàèü∏˜ÏxoA)œJÛJì¶·Yﬁÿx…b3wXö•‹dwá∞ ¡9ÌØø¯Õ_í√Á>ﬂ~∫}Òˇ˛‡Í ÈiÕÇ√ıER¥‡ùIƒ§œUdù˜›*°•Í‰ebI»∞gV®≠‡Îb√9T+©fq)„ò(≈:$vH0ÍNa‚êF∆YÿÏ¸´P∞†WbÎ¡ü∏PdÒì±í"Yuò‘ã√V≤z-1¡4ïq≥ÏYÄ›)ˆ	u∞¢˘~L’Søø¯Ô Ho˚!≠c…ô⁄,ˇW)ó≥⁄à]ÈL%])É/≠gí£01Tﬁå∏9)◊/HÆ*ás«î¡*√û5#Õˇ®õçSÄŸù2 SsWhÉ´ïçó)s˘ÕÆó¢9F¬kZ8)60ãË+BΩ•Æ¬Ì˝oÏ;IJñ…1pÒ(Åø>q»°ó‹2Ú„$NöB^7†,õèUÉâ[ÂO /61™¸[_OLJã™◊Ω8«‘öÔd-Î…üw?àB8ã1aÆKßå·IqáTá'πªÆL€˘I2¢ [Â®üh∑&y˜—Û÷ôë<ñƒò⁄˘„„ù©EÏ_#Í|˘GÎQ\ñq'Ûz∆#jbaˆ∫∂(ÁI≠MìíŒ,˛D‚bÓ<t0Oía∆|z–k—∫.2˜HTú√ìL˜≠á±„ Ó_ú∑€œÊ|RÙv“C ro<!]‚ø¨~Ÿï¡fóÕ≈JA&!¬Ç"≈›—ÜQêSœ»$~B≠ [4Õ)+¿ö¥‹As≈{¥‹"ægó:PA›§õèÚsËdÂû;8&{b~úı`ËTÜêS≤Y1vŸWÿUÜ 5–T†xM ◊¶(ñ…Í˘Ω∞˘„‹DjsæÅègVE$$^'i‡}Z’ÑÅC-ΩDÙ¥ΩãB•p«1tóÑÃŒ4ø>òà¸TãaO©ª($<4©I@∞_w6/ç! È◊àÖ{ÏB–‡FÃÖ∂KeK¬©	V≥›î‘'q∑∏48i|”µAÛÒ6"Xûè=DÆKêü`åqääNT‹∏<Pˆ„≥$\X,ˆ%q][6é<tTŸ◊B∫zßûûrA–S.‚™+≠ 5`ó÷%˝ Z”∆R^ŸÆ+.Ñkp1˘`¶‡_}Õâ∏ .®è¥m|WY±@–(J£ƒç;ÒçÈìYdàåÒuªäW˚(Ã`°ΩÍLÕ&‹$÷∞™‚úQ¬ƒviç≤$≤qj’k&%; µI÷ÿ&ìu*Ez9Éìî,W¯˚-mÙﬁ„ﬂ~Òr©íõd◊(ôbˆ¯µ./a^S	ØqO——¯W»¶∏æ≠X—F=©&Íä˜K∑å⁄O5LÖùD‘∑ÄÍ:JvÔwiÌ÷P˝öl‘cﬂ0Hª≈(Ù}8äîXâSœßˇfQHˇË≤pzZÜ*‰◊Lá†k5n+<∆-ö∏n£ µáiŸˆbâ©P˝w§¬Z“u&Œ≤QÚÜ≥-‹€Ê(&òÈ´ﬂ˛ıø˛ÛØ∆i1 ›‡îL<Kh]£Øø¯ı?ÚÁ)∑póHéM{¡Õ{Âƒòf˛3Í4c‡43Ò›£¶?Î,∏CÕ=[+(óÔh!Vñ}ô P˝ÍwUöºÕ|gSaÕﬁs.â…Ú›Ø∑P	;_ìºPó˜à?ÄW‡Fò^|I`3O?Å4∞⁄;>è¡¥ Ûú˙¶€5™wYóÇù|[îruû™Ë¸Ÿ4@%/¨bú”ÓùxÆLi“9ﬁÆ–≤™*Ì¸e"¿≠©éDï@÷u-ãGÓB qçEŸt)…Uø=∑uênÂ´k«.6nùy~1-§‚%C∫UlçÎ˝jwÜÍi]Œ¨QΩ~NoÍL∑Ïÿƒ@ËIí‹~zÒÂ€pånG%»Dòï¿°»ØÙ®nê-∏⁄-ö;<Û—‘ƒç≥¸Á}Ø©ìs9bCÊ¢gµÍ˙A”ÎÆâËâ5È,FùeïÛ}”ö\W≠â£Ê1o›u˚#œ≥ÂZ*◊+Xx’˛‘=xï\‡
aõryIˆ◊8ù ˆy‹ã”uè~´yºÊısx©'®tâ∂1ÕπZít’›V˙◊6¸‹Ò‚AY-ÃU>Œã@Õµ=®ΩË3™ÿöxiõ+o´˚sâ¨Æ8Â¢î¥YZAËÉœiO˜1˚'ˇ˚±„tïyÑœ4o∑∫}\|	¨Ω◊>Ùå∆œ¿Ü	i‘N H„cFÒHã¸–ı—∫4áN˘œqﬂçnyÍL-^èÅ‹OK‰Çß§∞Ú≈J†M^2Æ’>$éäõ∑u4ÂBóñê∑9¬äcÊ´?ˇıB8Î∞ÎÍwlÈOØôÛ≈,Â‘õÜBrÉ #èº8Ï≤g+Ø¯$ªg=_ñ7VÃ¨ïÍ!Q$æ€ß®±Î9?`G£Œ2ÃÈd)h0ã1ÛHË8Á{ã˙˙∏øÆ≠Ê1…GŸ0ÂÃM∫®f~N˜.˛bª}‰bzjX¿f® Cö\ëPMb—¬VD&7qØW}‹kng·mQUXÚÅ(Ò rwpØV¬∫‰Ω"ﬂ®¢gÆó™≈∑™¿ü≈ v~ç„◊ﬂ ú4©Á›ÇjR•Ë^B˚y0æ>…Oô>ÒlAÍ!ÊÇs5ùì∂¨¬ˇÓ›Ã;óÑksíÇ\≥j◊…
ªm∞dOÓ
+'–#∞∫A>uÆÈ∂Û 6ì:pv'`i”'‹/&%â¶Ú•ﬁœ—_=¡fj$˘µŸÀrèJÿ"∞ıN	·ì0Å;OÈN|˙Ëƒﬂz,z˙‚KüF6ë´âÏûÖí‡_ãÄdµ´^ØƒT'}së@»ÊåÊW˛ü»'Iî≤Q≠0Èxè¸Úˆ¸Ìˆ•ÖôS2˛√tŒﬂ∫0Ót,ŸÔ˛ÉbC(ÏÔ@PPÅ◊–NÊ˘„0˛È»À≥Ì…‰h‰•∑ñ…7ùŸ⁄|fç≈:Õ6ƒ)Ai]5÷]4Byõ[WÒçﬁ0»YÛNo‚˘Gò>•Ω∂DZ+fE^@aÑﬁùfù˘÷èΩ∏dGm=Œ 7üzÂÛ≠ÌÀÕß^Xæ˘„©ÂC?ûFñ>áÂí≠£†lÔmL-7ü%ñ¡Ôü7_:·`bz!@˝∂;÷WŒ/-/Œ„i˝)<¡bï,∫f·Ó¶Û˙É,Ô|˘É˝(˛Å]Œ_´≠—¨9s./ì«4è?·hN¿ßhÜπKÿ8∆”v√∆Ö·ææ©¯Së›=xv˜wníØø¯Ì/o‹∏˘Ï¸ã‡”o¢säu®1©7ªZ—\WÆﬂ§I±“W˘¶ÅxsüZeˆ‚3Ãƒíıoﬁ¯Íó„Óú'›≤ANêHÕIó|î˚}r”˘íÀöﬂºq„’S:‰∏#	ŸO.˛.Ú„®” |ıZ[Õ’Íˇ  ˇˇÏ}ko$Gíÿw˝äúñv∑{≈næG39ºí#Òn¯…YŸÊ“3’]Evi∫´z´™á§∏ˆ¡Ä?á≥Ó`¿^X∑~-p¿~π≈¡∆}Ù¸˝Î'8"UôYôıhr8#ij±vU>####"„!û:óÁ«ÛÛ”/,àdµq/è3XÁ=ã8X•»0ëW>ñ“ÿqmµV˜®Ë "‡ol’∂¡T_π!óZ∞Ë`√ÜPÛáØ ¯DÅ\∆cÀË+XëM¥Ë©*ÑH4ﬁ◊Zoh3\z˚Ë√rjê1˝ß°olÏîeqëxÇ¢@xˇÿ˚
πÓÑ&RBŸ Ú∆ò;1H`£zÂÉ≥)|,CŒZ«(+‹‹Ã™ÙmHjôÑb∞_‡#)Û÷çË16 w®t‹p–Ôc√NÜ Ä◊Åèäj«ﬂ7ï≤ÂAXû&Ä”ë§7ØãÜ"@È'°1¥Hsﬂy˝«ò|L677·øªØˇŒÉßÉ€ÕÓq%7è∂≥)èM…üë¥<?ˇüÿ:‘Ô/≠HßH◊8™,2øµ.°1˚>£˚XπÂ^ß”¡v -ˆ(úVàzıö∆ ú˝ıÊÏ¨ç“ÃV≈f|,@∑Ωõ5hÖ+`ë
ÜiR“H¶"∑4µÍ&ºí8/ùöó–cwår,r[4-KÏ©´{EZòM¬íˆc>Õƒ¥B˜+Ùr˝O∫±)•Ãí€u»6Héò-Ø‹’ YõÍKÎ=€î~Eâ
,Tv∞Ÿ	¯Áî	¸Åí÷t¸òd…µ˘≠Nÿ⁄∂Q
OuÖÃIdiNπ≠íˆF <^lô·3tCc‡‰îçÃÖŸÔo$a∆v
C˚ımjÈÏ∏¢Ôhå6ïû!nÌ™@≈,V¿L!Ú:<À)a{bQ·q⁄'÷÷Õ1ulV5{Ûj ±≤à(÷Îc,¥ˆPºMÂ^m–⁄Œ«¿yÂüa<ﬂNËè{!Üÿ?è ﬂKõ∆ZÅÃê¡Œ~¶{ªéA&vdÊY$#6 £éÎÏß^Ù˙ÇæÔ‹≥ÀﬂD—(PD“„™Îø®{Ø·—ÕÒd·•4N±ƒıcß7Ù‹µ‚CŸ÷Z÷7}†òY#E›§Lñõ˜eG∂∫#F7â–ÎÓ≈ I∆Ò Ï¨3ˆ;Á8Fg<Ó æŒÇÏ‚Æ”1Æ}tEßr˝sD¯Ö©u]ÔŸ¡6 ÷P P∑ç™ìüsL©téµÉ&Ù<ÂÛﬁ–	^⁄”[ó–«[Ÿ©í#›Ùç\≥“Ü»µ¬ŸÈ'ËXT…y⁄Ì£hTÊã4*§€ã¸®XÁQSU?e¸Fö∏òêßŒ%0’Xä]Åw1£Öug2L»È$†ûfF€d∆d]è•‡ﬁ3àŸÔ@‰IÏ&N‚≠‚Ú[*j<RÙ˘¨ùÿyãàﬁû}gxà9(Œ®"Ô®õlú>Üggû˚Û0	‹Dõ8Z93qK¢Kâp„üÓÌvË5(/.†À‰PW~≈áü◊¬·¶?»˛´}æ¶≠ÒÀÜõ6ÓÜpûrÃt¶ÑÊêÿz≈›è`ª&xõ +~Np˘(€\º	?ÜèÅÎÔfX‹”ÏÖ\]∫BK´nÔÚ:Wi·`˚ıÃ¢ˇY\-ˆøÏ“{˝qø'^îıàW Ã€â˜ôΩP™ﬁªÁÇÑàŒiZbkË·µ≈«‘?i◊yµáŒ8ˆ\ﬁr˛É˙^"ùU—ñcÄ_ô'‘s`iû˜Eìçã{è¶äÅ4È¿Ï°ó/Ω§Œ,£îí	
Ãe≠Ïñ‚~Ë´å4.Èå∏é¡vZÈNH/Ÿ+Üˆ◊t ≠≠”Sê<õõádNWá©j¥9}ïÀWVÙ‹É(Ë∏Ó÷+¯„)^@^‘ldU˚¥[òùy<º…Ç¶ŒΩﬁK?©€†∏‰PÊöˆy#8ﬁn8Ê≤ˆ¶¯5]›r|í«‘¨ä∂å2ÒE⁄\¥ÜΩ≈¢iIÒ/s˙Õƒãì¨O’úπzΩf´Câ}≥	d÷rß{ΩsÓDA≥!Õë∑D†Z≠ ‡∞æz√(ùÆƒjFßdù&(¿Ä8∂4≈3ú∫˘>\p_|xÿ{~9†’BSCõô§⁄‹∑
^≠éXl'xÎ¨ÿÅ…ı=zèJÁ&∂T%zŸx˝óŸAû#î<âút÷Ô`>é,å	gËG8Ëœıùf£	<0à4óÌ]A#.^µ’h±Ç^,_ﬁ4y©XûÇ.´*óóÂa¢éÙá◊ãõ(Öæ€DöL™– ¯˙ú42ØF,ò¬íàÅ«ﬁî‹ÉóˇN¬±∞‡íñÉÜ#©÷ô .F}¶.˘Á^¥ÅÃõ“√ﬁas÷ß≤◊o˝±„¬Bw∂ì¿ékNúñ⁄:£¨èΩ”0Ú∂·Ö32ÆW”ÀG√ÚËù tø…XÓ¶%ï/lÍ`·3ÃX=⁄Ωœ∫” )—7≠Ë¿‚}òéóÃ˝•ü≠˝ä"ÖÁ´ÕÎQqe¯¯2Ë+#egéØñ‚n¢~Î∞Q
h≥ÆÆÇÑm6>ÙqÓ¯â^±ecÄ¶fô"*Q6œÈ„ˆßlüN1@äi6Ä&P,dV!#¶≈OeÄkYò†Z∆£pÿ6&JÏI/tA"ï√ty¬9˛(‹‡Ü&Yk[Ü
ﬁhhrâ†VöéÇñ¶-≈¯ÒÑ∞úPPâªå,˚JE”Î∏^Ω•€WNºƒ+Ò7`î?x ∂ÄD/(ò◊[˘ÿ¥UReGb• «˝ÇM€o”’Nwr4Âæ-lLﬂÑ≥≥d’!à§‰p2FS#ñ8é<)i“pxIΩ”˚	.c|«∫óú‡x‰Ê√ôvÜVÁÒ©6˜)ÖëÜfYœ‰û÷»ÅÁÙÈ˛;Nõ⁄@ËÿMı:\gÂ*tr˙|§^6`>h:ƒ®ß7¨0Oû«96˛!¿ZÍFësŸÒc˙ØZ3ªY]' áÙ˝
9V>§&t\kÇ`çèB6U:êc‹ñ«'©ô[“‰kâÑßtl2FsæCR» «Gát~°àÕ[¬ ïüjm¯Ònx.bÜë¨(_vJ”µ÷+ü;±Tïg›VWa`’~aﬂì√ﬂb$œùa‰9ÓÂ&≈QYq§cr¢}a:[Ê∞€ÏıPê_†ÓO˛ùÜ˙Ω˛mw£˚∆≠(aYg¿£«Ÿ!›$¯la9cv%ïÏfckÂ˙Mry≤ii1Ìƒxî`“h˙üŒçGVìø©Ò/»rè»úÓUJI©<ôº€)(_ ÛgûªÌ^ê5ïÈÃ∑◊ª»k‡-–ıÌ9%4é.◊Ò£µ¸4Qás¨◊;IMaË;N2 ⁄0TBÊL◊ ’oÀköo †h/mÕü¢W“JO1Åf˝^üZ§mhå‘úcN~5OΩ3ûƒÉ¶È*®”È(Xjö°XÅï8s3ÍNµ¨í—G«J!Ã-P'⁄Ó≤π† “¸ÀÎ<ò?P)?1m∫Î“QÏ _1¢d:lF0WàJ@ıŒ)Õ
—üz§´Y¸•óH)mV,}•óÕ∑ PxeπBá›ÌÕnÓ2œÕÃ§W»lÄŸëcVLì\2&á}¢Ã‚Ù"MfN≤£"3ˇlΩPªS◊&[óLG!±≤⁄&z¡Y2–â5i◊C◊1÷™Jº+ˇX@N˚1‹∆õ§	È¯iâΩ'/ÚàÉˇècˇ, fÉïBã$¡’`òe>È] ÷ëø§Æ∞-aDÅxï≤:X~‰∏f˙I,NÖQ‰GÃ‰à∫∏∂Úi¨±;“'1
˘.]‹üqµR∆§•’R∂ì÷Cx€ö‘œW\P∫Ò∫=ÊΩ£Ör•"º•¸˘òxî @±wfg¢D∫«⁄B9`÷·l∞:9ê«íïJÈª::ÀÒCb	ŒQO∆ŒC√P¬ §#ÿ&Ë±4K„õ @t}r#Ã´kdõ8Æd†ïÒGá˙:√Í<˚4tRâ≈p6ù,µ9‚¢èÙΩÇHREöC´d¢’π≥Fô˚õõkÆÀı|ôt…rÖWÚÒÇÀñ-ëÜ‰VjÕ¿Û]ÉòÔSÑáVsTêÔ=¯¯Ò«&¶TÎgïÚÆñ@«¸≤&#Ni/«˛Iæ∏F^ƒìLââlÂ·IŸ †µYâJb yÆ1Ps¥édNp‰ºÙRÆ◊$êŒ®1⁄±¿	çô:§ú¶ë√úËI∆™≥oã1öj^õÜ$·D{M‘6Ã£xù/©ÍËº†Èoı∆Ñaî÷_íÇ≥©√7œáp=WëûG”≥pïË1o&=˛g≤åí^»íÙZg~•O)ìkeW˝rÇˇ(!IËƒILï§GÙOEqK+•W´.ﬁ·‡%Ω ‡Œ–”_r˚Ø\Y∆€˙¡iÿ ø%º√ÇœÙÔx“GãHŒz\ü¿øèöBòÍ≈ÍX\qŸÿ%¨ŸÙ¿d‘3√Ïtÿh˝”K•=±åÍ¨4Œ‘ú•FCÙnF1^ ‘ú·ycÅûFæÍÖ˘òëâu—·R’s¢:pÚ5∞úÁ>MO¸%Ä£h¶:√6{Æ π{“`Pêªáh6‚Oºò#“O¡£!úSo7&ù¬¥°5•ûÃ4'
0ë)Óy`ŸG{"òbiê¯JÒˆ¢•‘€3C≠ÄFÁ°çƒÄnÁ˚K? 4åÔÈ©p6{Œ∞—j1Ì™d&ñB••ij˝xì3^≤ﬁ,-ŒRﬁ›”FhﬁnYÒπMΩ8}i,û_Ø"Õ◊PmÎ9∞\µÙÉ±öÛ
∞8zsı≤/REm;J›{—»ßõÉbÁ’uî÷“æëu?ïEXi9¥[…∏–`˚îÓ$ˆ≈`¬á≠ÿFó,xôŒ7˜Öv/vE#r&√:\g ≠›ÕùÌ] gbWRƒ˙µÇSñ[îNıkÌŒHê*iœ»À∂c8I/…ˆ'Ò`óª“ªï¶büÈˆtÕr™._≤u«cz0YÓ⁄‰´¥ı=ê‰µı?ét√©L¢‚Ry9¥`êÁwà÷ø&ªí¢¶KMñ\”fª\Kí¶éö´_dP—ÅΩÈ% ˝≠I‚¥£µDÊ¨!&p†'µÇ1Ÿèi˙8i8n¬IbàôaÇ≈baaæ%√qÜ,œÕÕÈ»Xr;Èå«œ)ì^'
å1]Q]Mñ¥§^LR,`Óx"ÉxçíFî2VF¨)∞[cµ∫◊7íãº]˚h‘çÀ√MN4„"πî|Ÿ|O4‹“¬`r{§MD9)vøç˚Û("'ù>∞¿¸∆}Ì¬(€i—ÖäEœ?ÿ•vDRÒœ‡•‘?ˆ‹Å‚R	Q!m;≥/“ÿãÀ›óaU¥^) B‡^„S˘À)µ∆˙ó»K˛
}bªÎõÀãùÖÂ6|F„}ÎSDíçÂJm‹_~hjÉ|LÊ:ÛÀ¨©≠Â‰ãëm 1g®åv¡ﬁ”¬˝˘Œ˝E€hó*µ±∏–‘Ü:⁄•Ù¿?Ù¶∞Ça0∆™ËÄ˛%æ3<pF∞/’ÜÊÊÊÕCZ“÷8¶Åwl}“©€ä®ÕÑcΩH⁄ü“VIπr;ø≠(
â√‚*Ñ,éPÔ/¢.∞∏mFõ?$UÄ¯agBO–#êÀ—OïÍàP“àS uÊ%{∑+´πÌ¢‘ﬁd\„ÆH«O1øˇo°C7z£)Äzäc5 |C¯∑…‘IîTœ‚>&‹{Nå“yÃi9Ô<•ë"…•,ƒ9ecL˘gµ…bêˆÿhÈ—$JjÒfGcf`¡ÚPf7«äëïa cûSÔn¶ãΩ’û-Õ∑0∫•ÈFËÛ˜‹s'N‰Üw4Î¨7m‚Õ2p——6Z‘¨£§l‰ú:äÉ∑&—Êù@)ÌÏ)]â[Åí|Â°>¶:Ä“∆GI€m¥¶Xìã?ˇÕƒ˘˝ªBr⁄gÌΩçcºùù3
¬Á˝†ˇ¸¯>`PÓhﬁ¥ﬂ⁄ÛN«xªSxA‰ıNœ=‰mLﬁ£iPœº—mÔB⁄Mv!ã4Á†Ê˘∑D˚Ü1¸p–œ°L‰ü›’&•C™Ω`l∞S,ü 1ΩáìÕ∏QÃ|1ºSÕÿuÂå∫<X∞éº4W–g
ÕmÍ≠çâå	î+¶˘ú4˝¥xkMˆŸÙU—^”r-EÉd™#kÅT ©ñΩπä™˛BM<¡/îò 10—p÷ıT¥¨[±∆ñ°c¸Q-pË%MÛP“ıx&x@:≈´Íäı19•¨Ö{º€Œ¿âõ¢πbYkF#Æ}ÀRãIòiÍ:Úz«6y&ÊIΩÅê¥Â†≥Y_hJ.ê∞®/Ò|¥E"ÆASúhÄ‘E‡øg®arÜdéøN+”€˘∏À-óé¬O±¢•˝Ò°ÒÀöwEödF‘¬-ÕXYjUªP8DﬂÁ53å*e ›+–Z˚{æu¥}x‘Õnƒç∂ÕÏ:_°tÃÕ6«⁄t÷≈Ìi(ôúı°ôŸπ®´vD;/‡rt∏∞ó≠„†à£ÉÕßä0©è•BM√Ät¥“`Äî+´≥ºQõ1..m–∞¬&ÏU
†AM„3∫3öáﬁ…Lµt„äï©QEkà∆$û∞^ä°πp3v‚DX‡≥6}˜∫˝—∆mÓ·ySh¬´—K®Ù˝∑ﬂ¸/≤æ
…”0ÒH7â¸ﬁ‰ı]™ΩâEœ˜Mp≈<6≤GÜXπ!FÄSπn`TN‘)ﬁWÔdçS+OÏ óÍeÎq›Ë®¡oÀ.(,∑RWÙbÇÉgÜMxFzF\ÌãÎ˘¢@Ω*(∏Lë∞N.#››ÒÎ÷#i∫›ÊO*πbìÙäÙB˜r%0àbxˇÌå—A∑w’`fΩﬂ(∏·'[B_%à´x˝…°ÿR;ú!‰´…¥••Œµ˘~èó˚¶\Ë…†‚ yÏ«{ßß˜êª—Ò_j4åÃ°5û¬WŸ-OuNõ…˚±)ˆ&çÅ3<•&!Ëπﬂx‘d/™:‰Ì8∏ÙñE±–_©√æõ+I9æ¨P!Ì4Ω3bc(≠ƒ:»j±ﬂ”z’ç°§f·@tèº©Lq8+ÙHËÅuõìNÿ§?÷ôê¢z~ºC˘òΩhKà•“ÒTü KîºpQ©L"ñ•†ê;÷c´¨ú$ckπÈ∂T&µK}Â2Ùœ<ü≈oÁâ]XÕŸNM4¡ˇ ≠uΩL»¥æàìKXÖuHÕ0Ic˛~gy|ë2k9#fiLÏãâãﬁ¿1ÏÙ	ç-„=˝Yc≤òx”ç„uFS£πΩ·⁄w‹‡ìó∞-1W¶jWÏæºÕònΩ%÷Zãnø˙4<Ûn+ΩÓYªí¨;2f;¬æÚø≥è@›±πµ+’û#+†:¨C# o≈NbS+ö{ïïñ4¨]…ø‰2€{á¯˛QﬁÚÙˇ;˚û˜Ô_ª øÂyD_f 	àÖÿ⁄ˇÔm°ƒ]Y>ÄìƒŒ∆·»´¶ìZVã¥rû˘0¢W˘©V<$Œ≤‚\JgÜàGt˘◊;È7êéOîJ|‚”—vG∑0Xdä≥›·äQª	ÈÍ&°=Î™çTjñïK±R/ìlô1UFç-≈ˆ7ˆÀ}∂u∞µª±›-/˘≈≥Ó”ÌÕÓÊV√†§ ∂è ?ä˙cÂx—>ˇiaé’¢B…Hn;+œb‘…&‹rå:·j+V-áL¸[›8[å{¢ ˇ”hq*ıÃ_à“)ö•3ì∞J!ã´è£  ,Ω	•mqòËAõ5€éùSLÕ„Ó»)!ı¨,ûÉYÍ©’ÇÔƒJj{åb} åu	≥qÎ¢=QLÄ¬ı_*·¨Õ	JX$5„åπ3·ﬂØi(Û\ÄÎû)$a≤M„æƒ4öπ⁄¯äÑ3µ˝õÓ≥|∫M∂~È]Æ±∫(3kÂpõjˇ4ƒt
EöTIÅw¸·‹\o~ÈÙdv—Çs°¨(ò»;ÕG¢'‹L∑0F5q'ïi¨[)9Jxè¥—◊∞Õ`∫LN˙2´µ†ß¯.ÀÂb˚©•à3eb1ÊW§^\Y(g9|
1[¥Qs$kú˝˚oˇˆoyúvéÃÆ0D’Õ›êWçók(0•(MïƒÜÊLÅ_Õ)%ó“xØÇÂcªä†Á4@ö∏/◊ãijﬂ˝ÓÔ4G[5«ZÕßÖë◊úÕcs e„™ékö®§∞˘ñY\©~ïäˇzbCêuëƒRŸßñÿ„"G“%&[(À§d 'î€@ ÄH” æ¿B“æÇF–|bõè'¿ˆ7ôw'tC"Ê€Ï¢K%tè∆Uˇ‹(≈pŒPÁLî@Ω∫]¥ÃÇÉ8:'í1QuK“*!{ùiµ–¿+™ a1±:] 4¿q5 ßPÍË˙z%F#x⁄àÓ”≠É£.Ÿ‹#O∂∂èˆ∂VL”∫6A⁄L%¥à⁄(Å >Û¢√À†ˇ≈ƒõp}L¡ÈífÕ¢P@x)ÓÒ∆∑ê, pÊ≤\ÕÇêŒ•©2ÀO8=•¯Œ£!¥Q∂Yﬂ√G(ÈFp‰\—ˆeû‰(≈ö‹|LvùW=GMeæ: :ÖNÚ
T§åíŸëóÖôJ≥4ÚÇËe…ìsßÙ¬\ÉP—vÌÍäe1d7XƒÖfé#GÄr—ÂFöxó∑ıã˘ò¸biÓ3"ZCı™‰˙˙Q¡V™ñ≤Ï*◊ﬂ0<—Wv™ˆ-˝Ñ«í¨W^œßπ˜Gg$é˙kz˚¢çk§;kµ√Ü<ÍA˚	{_a¢ç>Z¯Å»z<ø@≥Î)gZd%ﬂ˚æÅ»¿ˆ /<]JißÅn0ÍÆ-Ê∂Â£6ü)o0üuöiûaó3 ﬂl˘„<èÈ≈‰ˆŒ˛Î∞ΩóÀ3∂:;òœÕ√úœgÆs?ÚF'RÜ%ë–á•sV” –<·åÅ≥À6æƒ4âªb»›1‚íw=≤è∑‘òÿ0◊yâ¸ãj;èƒ£ñY‰jÇÙœÕ£ìÇb1ó6Ø‰(—#Î”¢Ï-*á§`™Î§qË¯Ë{â…ë≤1|á4∑‚~´[™±¿
Dƒ)ü)˜‰ıÔ{ëﬂwZ9¯U\Í–5¯»ˆ◊¿m–—gxñl¥‹'Eô[TN!ÕœûwUÓŒ>ò„~©+qﬂÇàñK|£ÌUxbÍÀ≤∫„ÇÍRûÔ‡>íXí’Á"ˇ!á¬˙Ü„Ç:‡öœ.éåÈùLªJ«óÿá»áEê-*n#ì$p•¶5%≥…ZÊ‹‡"æôá™é†ã7AOIÃ ÿê∫8´∞ÚÁE±€√LìX'DÊo˛—*[n‰rÑk<bzf†&›Òÿ‹å;Ù„¥µsH|•ﬂ¡]ìÊï~øv›“’Äºzœ–%Îd—‹=_<˙I≥A≠„πìÈEÕ-◊òKI«∫PÜ≠TF¨çØ%j `·ˆ0T£Ir<Qû ŒÀB9˛;»˝Q?ø !]L•à #¸¨mhê¥u•íE¯‡°F<Áõ çç¸†=`iêSe'’√NRjïjTcmíÙ•ö±ì÷≥˙ñıÿÂÿ⁄’Íóﬁê∆5ñ0hMFßkÿÃ»AÁÈº„´úµüYø/sÈß[€U©ryıZ†∏¨·v†∏îÓl}ÜqhZ∆É¡ÚË4UûXf∞ßYñòÜ>Ö≤}ÚÁl1Á;ÚF\wµo∏ Ÿ›K—™§•ﬁ/ÕtKS\G\Ç‡È˘%eM1Y-3"ò3n§ÿ¡¢Oô2Çe∏±À∞ÄÅ°À
7O(g¿cz⁄≤ë¿yƒ®’_e¯JµÅèÒ∏éã_?≤”iõ∂kK∫J?k8oIÆ+2ã)}ôäVÄ«Í~ØT«}£A˜›nó| ß ∂ó6 ™|ãB`È˝ê~øWy¢VÎ÷ˆ≠ÿÖı˜”kV;Í√7ÇÂ´ıH0ñ7n¶[°ól<CáÜc´q÷˝H∂˘3<tpÁ±≈ä¸îŸâ,ﬁ}‡Äo3üè˙{ÑØ Æ«ÇsøÈ}R}B˝Å3v¶Ÿı|F¥˛Oo„ﬂ)´ù’È—8˝iùùìıIMı©’q°úcXÃ’=Që˘/› 3ﬁaöb]∑vªœ∑6üu¶#Í,C[ÑX®Ì}Zyã’˝—˚hÔ`wÔ˘∆Ó∆Û/∑ü>›ÓÓNoÍ|ﬂÓ˝∂&P‰GX#Ë…jˇÑÄ˛˘÷Ó¡ˆœ∂nı4å¡t`ˇúWˇ—√ùSñÉÓìÓ÷”f∫r@´˛Ë!ΩΩGÛﬁÅç],rÀ¶Ä'ﬂÊeﬁq¶º6‹ww?ﬂ{˛≈≥ÌùÌç©é>˚¶-‚Ì‘√–«X˜VıGè°[;èªOªümÌL%5¶^hı ú∫ò(7äTıáø˙ÏãLo≥vï˛i*˘C]B 6ümt´k˜vˆvèp…üC≈ÉÌœ™W<‹{∫Y}\Y7[G›£Ìßw•ÃH√¸PŒ}^ÊçQŒ¢Ok®y	z‰ŒP˚Óë∆d∞*§Ô÷x„7°a&„A⁄âz◊ _2‰€–ﬁ‹¡EmÌ=Ñ	=∂û?Ìn‹öjá„òVØ≥Åïo,ËV‘ÈÿÄ.CE}o ∂pÖê*WóÍ’ƒfgBÁÕπﬁ…sa{ó™êß°†<ieEﬁ
˝¯òÁ¬¿ŸŸqeısQg
 _ãÄô„`§Æ√-8wè∂”Xå1Á"Pˆ ©+‡»uÔé£-Z¡úwin"´_à"S£òngU0û"«◊¸–2#ÅL[ÈhÔ÷"i*ÕÚ4°?.$˚oO- Õ3=Cﬁ∞›˙–§WWG˝≠Ω¡+ˇ–§«üÜÇ=–ÀËÇQ∫Í"Iô%Ü√ (Y¿ãYÃ*-y3Æß¢±Ã[ïÑßXóS?pÇæÁGÖR‡ì¥‘ë/5k&êø”IŸ,\Œh∫NﬂÈÙ/£¿s=7reu»Os_O0rfôµË!ñzì&£´≥∫YÒÍ,8k&—ÃÕêpÒù	ìhˆæÚÏ(8¿_˘ËÒÚ
ÛH†óÄoÑ√°3é=w~H5¯[›≠0pdÁ¶´©˜)w¢Iƒ‘wianÆ¿◊°ñËd‹c&RWKÓﬁp<˜ºΩ0æxé˛©œ£≥û”úõ°ˇÎÃ-∑N2Ànn¿]‡£+„‹÷Å.¢;6ıçeÅ–óÖ{g°o{y˝BÛâC‡ãf»,Ÿ∫;0ë#ÍxESwe)(Ë™xm•É¥:môß¡F‡Gd«&HM°Äw∆íd–9°ÓCµ“Ãsk#çù~yn]ΩP„ã¸©π;ï‰£≠I∫¬}’ÁÂ£¸…aö®Å†„
¬¢π> Ã‚z1ƒÄõ> Â,DÎ}éñ¸≈Çpâ‡øói˛n^èy¡é ºÀÂ˚ÿs8^z¿ªe>Ûih˛"Ìï˝T:MKË}Ú)ocFú»Î&V7ﬁ´(ûç%ˇ›ìO˛>$Üö5d¢›M…Õv.ﬂr:iS√eékW/Ï{ò˚ﬁ‡ »Ì£#-®Aÿ0† •Z–Iﬂk·y‰åÛª±orJêj>mÔ¸Åà∫Õß∞)urÜËÏçÁ‡¿˜Ünó%cÎæî_w¬aôÆ∫æ CßÁ◊˚,~∆úP{RD¡ë+-\¶≠˚h•CÁXá#´…ÚWó&™Ò·Ujô9˝:ˆN¶≤Œ#¶n‰òòNÅBÈÕ◊¸stQ ÷T¨‚v˙è∏πU+\6âwΩı•´âÔv6öœ}©NtËü*ÃX˝ƒ“\-∞Ìw[ê±⁄Ná”Soñí+Ø¢5*"Gèùhc‡D…Bï’Ÿ	cbOø4í”m≠œÉxΩÖø¡˙ÿª¯"ª;ÓÖN‰b<ﬁ*EıèØˇîo≤÷bÈöÆJ+VOŸVñEáˆWÅ…Ü±ùZ aûMwÖ∏’≤)˝Ã‘”äMNÄ5èiÈë≈ ’úpryÁ˜|ë≤∂ÚÕ-¶^ˇ›ÒÅ*⁄–Wßî1«c?8€p¢J4nﬂ‘Z-¨>-wèïwv¥X‹vƒ&w.+œ-S;E¿~ó7y±óNŒê√ä8¬Ö≈b÷`Y|‰µ)pÑ©æL¯®KÖ
≠KÀÂ™˚úEÓôMŸjÙr£Ôø˛A≥πX“´µhá‰§ÚŒj5è®*‚‘Œ?Eƒ Ó¯√—‚â?Ùé0±yäµΩ˛oç<Õ£[≠≈f∆G∑∂Œ’ñ„#g‘fg*rj∏4úΩúéJ~ÀSMïÚù∏)–˜„8‘˜æX‘]V∂Ô)å=ﬂíñ´‘ò∂¶—nÀ€[Á'lñ≥|ı∫6ÀO.+ÒoY¡Èw¶dB˘ññ˜-Ô!”"ŸÌJ7ôyônJ;≥lÂoG«,€8N∑4ÈÍÓ≥ç$_É}>˜¢I<®¥YLm’$ÉäØÁ€Z’gµöˆ_Àˇ^o!´é£JﬂÙ˙©ô•MQÛƒÂãú„<7Ü{&/;ﬁBävu®\“¶–R»◊>äúâ≈Mà3a¨Ë*«6Gö[≠ }ﬁ·ˆ-·Ω≈}∏AJq+õåˆ!ÀÓ-0˛∂Êzñ:+◊^RÍGKæ4µ6Â™J…”ﬂÚ≤™ SÆ´4ù;YXõ?Ùî+˚π±πiN)AÇﬁÍ!%®eı3JˆmQŸ(*Ùú?†“!M}>eÒ%¶=†“™-9¢“cw∫3 Ïó>s,©ÉõR©˜[Bw’}J“%MB•QŸáökesoübô∂çM’Z$’_¸-≠î¡Î} Â¢”…3–8∑ÇjYÒ÷X4ÖOÕµ.Ù∆ñ
ûÛ≤⁄iD˝Ûgˇp˙ó®æù≈÷Ôßì]•Y‘Ω9≤πÓãÂ/*]ôõ©µyoË∑Æ Î7Xi2Í1›⁄KVÍ5^õØû‚]≈_ˇ>◊dM€ŸC—ÃTrÖ,∂•)pÉú÷úu5:øPè≠ÌèﬂÊ5Q].)ÔÀ']/¡(Ç’Ïm.â¬ò‡àßá]Ên˘Œ_¥Me=RGÀüÂ}≠të«≤⁄÷Z{´s´ÿ;Øˇr√è˙Co°¿~Ÿ„]LÛW`√¸Öπ≥)-
€?jL…ñ~jÎBªÁrÅ1®≈◊°xa©˝aá‹∆˙2ˇ…·Çﬁ∫·X-∑’"å1∫¨N{v>Õ7Vk˝≥P5gaç!∏ ˙Ω“U%EkZΩ-õ´≈Íl‡§…YVg≠>Ö¨àöMıä:?Ö˚ë$0„¥—fS dŒ˚ü∆,áØ<‚DësI¬S¬¸…˙°Î≈ 2∆f§*,Û6-ÑaÆbﬁÆ¶Hò~|B÷H€Î¯1˝∑)èIç÷≥N‰o,t∏Bú‡íé6Ï§]!ó{H;hÜZ&ﬁµ?~Ï$˝.∑}Y√q·à≤bE]¶•¥¶éÕ•N¥∂0ﬂΩÙJI#û"Ö15∑ƒ^¬íÊ–‹õ≥ü,ìØ€«·1ef÷ºSØÀ%“É né°ôIÑ…∞(µzßâÏ≈ı ó›∆0ˇ’£´⁄˚?√<Ç√ í˜6¸≥1HÜ˜ÑÓ®“]"„0AƒO>5“tÊ+dé‹ÛGXˆ|πº’W'É6ì”ö˚w˝x<t.WM¡\Ø˘i”mÓÅ8<”‘•.z√∞ˇ≤∞BŒ}7¨ê˘ππüïî§)ñ*ó;.¶ø,ÉaUXäCg‘uÖ˘˙’]õÅ3<ePk[±£^¥CË¿EÇÿ‚÷@80õÁ
Yx¯…hT‹u „ú⁄Ω»s^∂ùSÿ@ÁÜÁŒe\VπÖKÂnÄ<¿A˝º
Q^°õ:5R,¶Ñ¶∏,ıfv˝»Î£kÚ
Ê õåÇíJ)πb)»‡Ñ°Œ£"]£7≈∂
d°ÓNÄ±ÜÃe{%ÕxVRAx‚Øûdm˙ù∆ˆPx≤∑πﬂÊótñkÌ∏j5R,X§ÖÀ+àUû_‡ç`|¯p…YÏ=∏Õ©è!Ùë„˙ì∏WÔ~k“V@hàííögŒ†[∫t§)%.ƒm˜'¿ö`&’[Cÿl:=XıIÈz$·∏*
"Uæb√Í≤b4º√içVÿü»ñ˝À&»”?kï‘¸eoÔwe≈=yõHí¸Y–¶Ã(`c?kbX•Z"&
.œla◊*{xqqi~y˘ñN ”UÀ,K˘⁄O:À„≤-BãüÛU¿T¢≈≈yﬁŸÁΩÖáãΩRlL‰M·$•[È\Õ}àÈ<ﬂâ√#%Ó˜a>òÜ¥˜{Ó≤7_	-`‰(áóc«ùÒ_wƒO÷=™ﬁı≥g±ˆŸ£˛~ÅÖ©Ã˚ÅVNó—”HM">œ¬≈PÑZ¬?ïÃ∏ãB¸£'“•‹˜Ø'izj? _á·˛m?\Ü›Ì‡éhpB8CSNÒŸ_íœiÆ_“TD·V.zíeFLPƒ’…è€ Y°O∞Î˜.ËÅ¯#mhvaé®RzƒàÇ#«–(Q∆∞u9Eâ1Õ∏π.Õ¡$Y”)À˝X≥Iï! =`ENÁ"FP1› HŒ-ñ0AÚoÕWI»V<ˆÜÉê∏!aæ¨§yEAvàî˘”‘S}.≤˙åŸ≥„˘yç€Cˇ"€0Y?r◊zÌt*≥ÉEÎ4ı¨‹r, Â"g	£í!Fa2≠G¡‘Æå
∆Œ–Œíù’ºµ.™›^pÄ|¯ëπ%Ã
Æ´´‰gÖºÿ·Ep¸˙øáƒ‘BØKk|\◊Ñ9(7„÷ì∑!¶9Ö;˚fA(U¡´|π™#)†hrË©ÌÄà¶f"’∫À»√Ú¡(aÇm„° îË\iötÿ,Óõ’å°‹≤'π#y¢ÖÃqæÒ…'xﬂWvLìÌñú?kˆ»·±0ÜP<œNä¿f⁄Ì«ÛÛtO§¡ŸÙxlÊ•õ7≈iÀÎv/®C∏¡:IâÊ3⁄√œ¶K®tÒà®_ló‘ˆ¨%-»⁄s`7ˆË·÷≤«N"æˇˆõø"E≥Ó∑||0Â˚aÛ?h¨¢¯I`’ﬂÂ`ú
±ÏªÂ™ \›ˆ§[¶f KeE5˝¨¶!Cç†ñê*çÎ9øÃ…uœâ=)Œ†Ï<†Ïiÿüƒ+·$A›Lõ™IU|4œ»∂ﬂ˝ÓÔ,–µ√ﬁrà⁄è¿XË&JêÊa?¬àc»u‚;¥‹ä™±∆)∑~…Ç£b,S /´·))k>Ëp8Ï‚ñn?rÇ'¸c>è±#||w≠ëªÜ2É^ÂÏÈíè¥‡2	
)#ÏUïMòF k◊Éî¿,ô{£BÜ¿Â~E¸∆j	πí†ëi	‰⁄4m/c∏ﬁV&JÔ≠af–8›-®≤X#MºÈÊ;G\`6D(≈·1m'ÜF‹ª⁄ç;ß˛–‹î¢D<Õõ/§ÉÚ•7_iàÚÖæπ*H¡…$fﬁ››ç≠ßhR2c≠’2â…ÏÒOISö®Ã~œµ
 Dn †" ÿ'S8I,û&øãG¢˙©ô†‰:ı£)1ÃXjD€êX5 ô…^Ô+®uÍÓ¸
Afz24mäVgå}˛5∂Nìµ	‚%ÿO`‘O—«‰%¢Òß¸3˝$ı¿á“*ô(cÎ"j¨£Òı0‚?˚‹`C¥ùé\Xr4≈3àús$KáI$˜ ı=˛Èèö-•”@˚êÎ\ØY6.â„òw®E…ö4ÆŒ_5gˇıØ„_ˇ˙¯◊Õìu¯´˘k˜„÷l…Ú`–À°AîfÆ√ı‹éÁOêQjît—ázAAiÿ<ëñ>p7˝}ÚÎ˝}‹˛Ó/ø˘Ó/ˇñ˛òù¡9‰*`{ìi±[Ü€l ÷Ì	R˚GWi±k“&Uô (õFÅ¯æBÏ’J∑p‹wÜG¿É˝ Å=cÌ"≈¨¨ÇÇâÍÎ∆∆ﬁŒÛ›'Vd√%´!ˆkc√Ãá	8ÙiB3d˜IÀ⁄2m4¥«Ì›¶ﬂ!¶æ=≠ohdöæw∂∂ªœw˜0RVùÓ©\'ıﬂ(Y∑±sâ°z(Æ[˚9NWç˛Œ•Ó—?y—(>)8gƒQˆ8ŸÏ≥É¢_Û€l BÁÔ)Sÿ„zßŒdòÏKC)™◊x˝ó‰ökíY≤Ô∏FD)ÅÁ/=óZ…y¸ÑfëY¸µòa≥W»∞4˘·æÌ‚ …ÒI´√ˆ/dÅ|∑îí‰≤ˆhõgÂ|>ªìQ&EG  ûÖ|S dÒpDQüˇdıã¯å„û0j’%ﬁ¶†ÎßRf s∏nÙàÃ*YïJ%ÄcÜùìHè‘ç^ 'º@+™k{ »ÎE€â6«∂úJE%·ò‹E˝Ì+?ËOÜé[∫-("√π’'A≤ÔE®2©r
∏ZdæQoßô1ÉÇx÷≠MŒJ'⁄àã±ÅŒÒs'>ÿ:™2µ+©ÃH7ˇ.äΩ)Åt¥}¯ErIw∏ 0ÉÑ®`√7„…hÜ0)˛$É»–aNú ¡QÄQs;in ùOz¥ü«ﬁiyÏÊ·À£¥ãJ¨]T–mü1BLµuîöMüV˜Öi~H?nªB?#øÔ,/
äì¿G5eﬂ´åÆ‘6:´W¢À„ìZó:ÇeIﬂé≈õ9˚d∏ÏU¥»‰ól≤∂FÆg†P	2äΩ◊±Â¥ÎyMÙ·Á?7ø/#üM6˝“ÿ\˜˘π¢WíÂõX3±È,hk )i’èQ ÑÊ¨jckF;w˘±™∏ÿÛ“ª\ªíOª~ùhiM
qóÕ®‰ZgìÀõ¡†æè™˝ÓSUÿb±ŒõûRfcÃTà∑ÍÏØ†©k¢•ÖR/⁄0#ìtój‰5≠û∏£g∂6üU±éO™‰CÀí«hj≤ÕMZ‘¶ı}Ü∑fe{äÿ:öì+¬TPÙø¿Në«‘¶ﬁvâ…ûÃ2§c™fÀPÇZπh•,®'`ı®
~œuñãqÊ:ó·®pAäô‚äW»0¶2Ê”¿ÜQ¬åKûÜga)3=ÑBœ¢!ÊqÎ8˙—;¢˘x÷;¸WÌ[˙âj8g—´3Œ–¿¡VrÖ4·S|√¨ÑÚzÁxÓıT£±\>Â%·H±˘¨ªÇª<ÒHî-˙y{~é?aÔ+ØüP&ºÄ‡õì‚¬y˚(Ûâ≠Hy◊Œ0Aœπ≥êlQ3C¢eı±ò∏dOë±ãTj∞PZ¶)O¿Ï˙IXœœ≤4TäQMŸ§ÒπÊ∑XË;%S9jﬁ¡À‘G2≠
<2è·`Üan=ˆî√»XÔÑêTÇ∫ªºX„YólÌ`‰ÉnYù,TXO¥Vπì=~8æ8ë“â°ï,º®¥ÇŸEÊ≤∞2 Ó…”Ö ñÛúÊcdûW£ÈÌ[D∂rª%K©ñjt˚hxD≥Ø¿!9dÁıü^y~\iYÌˆEr©“›\•àvr∞ƒc%Fkºj%º™çU:N1;¥ÃûO÷≈àè‚Siî« ÃÁsê*Á•4r‚-ì+j˙Ω@ßZäöÂà…ç·\è¸ \á4•ÛH5D‡HVÇVõ@ÒTA∑RL*2ñ`Úxœˇ‘¯°“÷0·vpí}'Üx=Â¶€Ãœ>úìÌmt„€Ùynˆì9êë–ª})˛»rIÉÁrûì˘Úﬁ%ŸÒ0›@‚îL!?â≥»w	˛˘ˆò˘Òf?óƒ∞.Íé/◊Àô2≠¬cxÅÔ%¥&¢/Ä{5ßsÃµoL3©Ó‹å¸ÁŒÉk˘åÆMÌ´åéê›ˇ˚œôMÌ-Q‹J≥∂r5Ò(}çey¶Ö˝©ÿ¶á[ïYXUêÆ3ÌÚ≠MK˝ƒn˜ˇ[¡∏ãXœ‡ö‚ññæ-{Í#’Uv"‚π›"Õvˆ¨ì¿;G∏xÕ|-ö8§Ô=,¿ØP„§˝¯†: {` Ì€f¶ﬁ„x·≥yØ|jMl»VêDﬁôÕ¥RÌùbz∆,O±åËQ≠ãÚÆ7I ∫D,≠àı∆∫ùx<Ùì&†l´PÙ"ö.á›ÄÕæ«¯w„Ûâ›'ÂÎt7ÿÆ+:t¬3û}¯R›ÎçªQ+q€+DøëM`π˝a|Sé{^Â∏2â ﬁãø€s“Ø˜ºxÌMƒìÆíYr‡|çß«aÿ˜ù≤ªô∑µóﬁp/LÁﬁ”Ï;E7m∞ÌŸ¯œc«è"Í_…—Aª÷º&÷}ˇÌ7ˇÅ\Â,ÜﬂQBæÑ<ƒ√Hﬁìrπ˝w}o°µ%Õ◊Ü"¿æs∆≤+æ#{*#Â<@Èi˘˜ﬂ˛«?ë´Ã.ı=øK\;ê£xø#¶QÌOnÃwsQ1ãXéOÈ%Sıo˙ê»∑pqTâò/≠auìü4$|(yB(gfÒû∆ó<õ^å∆
!	ﬁ1mfFﬁE@äõ Ω∑hò=Î‰≈˜ﬂ˛ıˇ˛ˇÁØE¨	≠•Îüëf˚£+’@/’á™∫–r≈å± &,Œsˇ≤1CƒüˆÒ¡”πn]∑äbadœ
ÛIπ9˜≥÷{•“lg>¯£»ÔMí◊øè|X õÔärÈv%ì+…VΩ‚ˆi¿ˆ˘/∏}∑w 2Z(áäÆÄúC˘–VÛÓFo˜“Ê@˛òånÒoT§⁄˙ıjO…6ö˜›¶Åd´G¿Ñ%ä?G°A+ö[§w‹›tsø0'_€ﬂƒí∆ö*ôà<kΩ+îÕ«’« cÿÁåV ˜VI◊ôïnâ©H)"&œq+êà$™∞od@)·4X:üß¥„V>óÄN∫qœe{æö	ôù6kA ™ô‹≤ß
ç†€œ≥K¥M∫‡Û¢Ò`X†q‘p›Ûˆ˝jïê´i6º¡°WÍ∆Î?° éNçËöXASFáNæFo∫ã#gÙ¶ª¯ïÛfg!#g’’˛")ˆ<‚√y≥®I2∆™„ﬁèº◊—:-È¸ 'p»ùÄnmP**Áy*ù5´I/t/eqﬂju7{ø\:.Hv‘cπF"w;¯ﬂŒπƒa/{◊=l ÁæW	˛9øt@‹ŸØÿ´ò=Å˙Ä—œõ˚ŸW;m≥	¶6Èï*Ja˜Z˚Ã√|∑F/8ÈÁÅU¿\ø®7kpCôPø("Ö¸Äd~õ0´K´^üê ¢≥›Œ4‹2ˇÕÏë‡2çKgˆ¨õ™XyEÖ´…Áì}©‚˜ô=™ﬂ-∆kí∆XËZ°ÒR˜C˘©∆ı‚CΩeluÀYEˆHÑŒ{Â+≤…Ò“ú&YW^´8Ω™h2ï∑{™úaïõSy`Mˇ ºA*pÈÏ©
'4î•Á˘òÃWméª
r/˚\£ÚÁ·Åæ%‚pÍÅëô@gÇe∆ {ÆƒQQuÏ’ukJ/ŸE?4™Ωè“‹O√D{Æ?Ωí)3Õõ@oÀ™G≤Á˝Rî<”-F[øÈÛW‚ï˘‘Ë˝r§èÅ◊–"1gÄíΩ¯]ß<˜{M∆Øˇ£]≠)xC™·˙qo‰õL0ﬁËjQQƒ~;[:˘{‹ïµﬂÍUØ+D9`œOùå¶øoóÑ¸ùÙí•⁄F|*h» áù°B≤\myÜImd]åUEO[tIdÃÏÛ@Ω§[H˝`àI÷3õI}R¡L*Åã	üAzZªZVr≈ã}∫ o=Î-ù4‹≈˝g⁄oÚ8ö$· õ°v¶yÕÁ9
*µ™ÄØ1ì+%§e Ç2N=±dÂKv33«){OıíïaÖ}/L‰-;ˇŒ˜wd…å”,ˆs≠ª‹‰çGw∏∑§T[5 ÷ÆlL¯~[óT∂ïdÙíf c—˘4È±ÿºÓ!7-¨zõ[∂Ájû©ÃéFüêªQ{Ω√ˆàû¥O0ƒ;13$ΩõπPzÏÊr’’’øgp~â+M”êî∞ˆÃEl—˜4D/YâÜ¨ñF·√(‚+’dÄä◊ïSQ¨ä™@ÿ*µdO‰%?U©tUÂÉDDÎ_ﬂæR{´7æåßag™·H˜xjÚ[kVu—g·∂–gj2~´hsÎî˛t~J*_ï∆WEãjÙΩäv©\oÖ–JΩÇ3¿Tü-j≤kã=f}±Ü˝∂ß„Ü7Êd∫‘,ç´®]úñ±ç}∞ç“<»ŸY)OË
a∂z,!ÒQT;>¸ûÿs@î∫KÑ∆‚&Á~2 ±Ew
êçÊM1Dâ44–ê»"w|r|B÷»±%˝◊iaæßÑ¯PhÓS¯g’ñéK|ºFÏP•Ωw∆ìx–47˝æ◊Ùg∞%h®˘ö±NË·ü3dºùZM⁄¯íBWj-ıÇf≤ˇËä5VtﬁKDRäöNìÿkSo∞E%˚∫-8∫9∫àÔ=ÍÒpÓ à!ı¥µëU˚Œª“ë!x<w“≤Ä\¿Nû¥@«6†c—ëå®j ˇcS.≤3sgòˇ”u ÄÆ
ç%ãìFvÙpÊD1Eæ4™)Õæ»!WHΩtü4¨=úáã<T´∂ä∂Yàuœ‹t¥)eL≠%Q.Ê≥g°ÚÄ}-&Õﬂ˝Óﬂê∂Úøß€ªüw…·÷¡¡ˆ”œªõ]≤πE6ˆé∂Hcë'{∫•UÇf
â{±≠Qô'ÿ≈π˘ìí´#¶Œüÿ˝À‰èm)ñ“4≥˜Á*,≥ñ◊†tHXê‚π¿_…l¨–_”»Ôó`√19ÙŒ&ËÉOCºzƒÂ'û/O˝Wj‰¡~~¯EärçïËV∆¢†ûô¯_∑öÜ∆¶H©˚¯ jw¢–ü%ï˜LXmfô/ñ≤K¶ÚA¥)3B›„¸˘≤=«3gò¿`±%‘%Øe’¸Üx¿0@ßŸÇWuì≥SÔ’o˛ä<u.C‡5ˆ‰ç∏·ç$Ü4ÅK	Qt‚∏_1√ó’ôuÖ6˚7¢Y(Æƒ|∆&öÛRì®ôseáòŒªcR7åÕØvrT1Ø©kßàÔL≤lq¯ÃÁü<û©tE3K˛$Õ∂-P~û%∞‰p±^ÚÏ'^‡òu@%πÀo‰≈ôî«ÓÈëü—3£¡4÷ìLﬁ(bí…£52_úöò')eæ ∆∂
2ˆfÑ4œØúŸ∏Ã·ßB‚gsÍÁ≤úœ”d}ÊÈµÒ§^.¥ü»ø2ò“H¶Ü\∆a.ç1P'ñYπ¨Ò»9gAÿX>ŸBÄ`ÛÊ\¡™5j¿|÷m…Ö+⁄g3¶IlÂ9´0(lˇI~ã€-… åOÈEî*Ÿ§D& Jˆ¬:y¡Û|D#öKâÑ≥6
≤≥gEo•–◊ÏöxC`Ô`Ff¿fŸ0o8€∏J≈†∞~+rQC„D/ÖR∆âY.9‡ı˝Äl>æ¡qPñ®^ â	ıüç]8ÀMÎe4vÊ˝·ﬁ5%¬i”ÆhO;≠<b1Ê	≠ÊäC,kàπµVrctµ®…œev(ŸœıuÃªË«˚|=÷…<&,µ¶„⁄¢r-pß”	Àı∂È V0ÑåW^Å„O7Y°Q‰;Axﬁ,…œõV£3_Q¡Ú1ô/´}]ìÎò ±%eﬁ…MææÖµ¶⁄l˛≥¥5ùY:€gâ?å1∑˚¿öÕ+Ç≠°áq_nª02T“´4ÙÏ©êîC–ø∫ÑÛ≤C ö"Pe‘óRF] ÷ì±‹¯Í°∑tˇDæ„,Ê›3ﬁ‹Æ'“∏vÆ6¬‘Ï/q_‚‰Ï¸2ay¢V0x∂◊~h1F∂±ã´l;@/ YÆ]Õ/^ìŸGd{p˘Ÿﬂ|"Ïü,îÒöå)¡/,ƒh•RvokÀT$M´J_Ê^Iò¡t¸'ÍˆøÏÇLåp»‹WGƒRöìMﬂÜgŒô–u‰|AWÒ <á™Ï˝œ.)±r¨AO$!€sà[Tﬂ9˚ ˛u£po&.˘◊Ì„áúîÎ£∆Ì%EÙÕÈ U…◊p÷∞–§äJ_£˝fïµ›©ÚrHFŒEõ‚#[$¥±Y¸"µÖ0 Ñy—˙PfÛ‘¶('[KÛqzq8ú¿ÊKBTı–[N¯óéáŒh)ïî•ù™Ì3åÒ¶Ëy”}û%€æÍ.Àa‡ø‡˚iaÓZœàòaπ˙∫¢ñC#î-O∫‘»ßR∑ƒï|&J‹›Ntπ!º¡i€/Ä0ÊÊb‘m4}ˇÌ7ˇh÷€¨sU a¨äPì#ùŸº—.åÌN'"›1f¥tC]=±:;X4R ı›87»ãX√ë´ëw-Ö∞>"6èÑƒ"„n†±â:<ù¢∑ÓÑ.¶Ÿ¯‡'Ã¡]5HN'∂
$'Œ%–/ÈPk{#‰h{N¡?¿≈Œ+Ôgã¿J‹Ñ	^á$z˝˚1r˚coí◊Ïc∫… Ñv&òòy"*ø
;ú∆îÆ¸x;ÿ>çPtÃÎ˙ Wg‘ƒ|»B–˝ò©’Uj√KŒeA	¯Áo”xŸtU‚`rf¿èŒV†ò”€≤.âÉFÂ‚wˇ˘Ô1P‡÷Ö◊ü$N‡“†•[Æü¿Ê¬@Å^úxyÛõ¬sulÍc⁄äΩ≥	†◊pf≤•˜bŸo&Ä Äx®‡Œ»¢cŸç…o&tTﬁÖﬂ£¢ôÎ°6?OF A‡ ÊCQD®88Dfﬁ3^‰¢ÿyˇuzŒ«¨îjå'Oær‡ìÉ7◊4]ïó¬*°∞ [ôc’/jÁ…π”?ÔÑc`L˘ﬂ"J}gyß å>á#8xiN∆+·?ÒJc¡ ±#$;}?πDós¨ÂπC4÷¡¸í“ûA62=u⁄¿íË«÷(1˚ü¶á Úg¥πç)éÉ\À&Ëˆ"	Ÿ≈•Ì¬“~˜Ô˛ìaÕ¸ùÅ_CuûÎùz 8π˚Q8'HOûT,öhC	—_T/iå;∞vnÛ^ò‡Nlˆ/8U˜øÔ]◊6cÄßE˜Ïå∏=Dw‚À†Oä‘‰Œπ„'d î`ËqÓñ÷mZÑ$3fºÏª≈M≥p[ÜÛ≤#Wó®ÃZú#N ˚!Ò†áI–7ﬁñ‹ÂÊ¢áÚZˇì2˚#0È¶õŒ¯Ω√j«;ìñKév¡óöOˆ%Û…Æs[ïèˆ¢SùŒ:Gß±€ÂëÒaB"ÏıÚx≤eÄ◊,¸·∏¶≠^áòÔê£P%:05¡%n`
Ô(ÒáGbõåÁ3±óFP™ Bî˚ÂáÒù@”Ä*˚xZá‰–9u"øu#ﬁa°CB`ù)ƒıÄˆΩæ_8t6≈F◊ı± ÏÖ◊ú  ïÌ &Óáç[ÉƒwˇıÔ8 n6Ÿ≈é8:‡¨ÃœA0¨rﬂA±!ûå9º˝»Û~∆¿dN˝≥“p,{˛ÌÓuâã£ª›ÊY[&Ã(ÈéLú!Jjﬁ-Ï‘å?Ä'“F-¿±$z˝@8`~~0„BT`2\*‹t2¬í°d¡()ƒ2.FB€pR•e”RóÒL√¨• S≤Y›§—‚Áﬂ ≠ˇÓwﬂêg#!R„ŒƒÂÒ@ﬁ&˝»GK∫KπNŸ¿ y˝ﬂèö‡d"˝ΩiwØLƒ¥Ô O^puˆqû√ ¬	0@¯8πÎ˛?   ˇˇ “Åy