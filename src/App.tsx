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
                            actionColor = "bg-blue-50 text-blue-800 border border-blue-200";
                            actionQty = log.quantityProcessed || 0;
                            break;
                          case "CORTE_LASER":
                            actionLabel = "Corte Laser";
                            actionColor = "bg-indigo-50 text-indigo-800 border border-indigo-200";
                            actionQty = log.quantityCut || log.quantityProcessed || 0;
                            break;
                          case "DOBRA":
                            actionLabel = "Dobra";
                            actionColor = "bg-violet-50 text-violet-800 border border-violet-200";
                            actionQty = log.quantityProcessed || 0;
                            break;
                          case "SOLDA":
       xúÏΩksIr ¯ΩEtuœLU(ºÿdë ∑Ä›ò¡´∞GáF&™U9Ã ¨Œ¨âÆ)3ùÌ›J{wvsßY}ëÕY´µv;+Ÿ Lk≤µìÌ«√?È?†˛	ÁØåàå»Ã¿J€i3MTf<=<<‹=¸AàÂÒzì éˆº3?$õ§vá}Øˆ‡[QΩ V∆	V94„ƒã~s£M&˛€â¯yØ›&gq“˜˛è¯∞⁄nWÍ‚Û…%t∆É÷óS/öìÀ£$Ó˘iÍ˜…ØM⁄≈mú%æ˜∫®HœK}R;⁄=8}v‹≠u*HÇÈ(à&”dq@y£3 ÉÄ˚ï{(y0<£wºù˝'›ΩÓß;˚ãÅogtÊÖ^?^~Éƒ˜#	?ˆ+?ˆ˛&ÎΩ˛^¿˜¥ã®∑øspz∏ üzà~◊ †?Ú/ÏKäﬂy ä/◊„ntΩÔêO∫üæ¸¸ŸÓ˛Ó÷Ç†|‚E√ò|>Ω˙˚Q–[†ΩK/CH˙#J˙˙˝"z«;'›ó;€œ∫«€≈ ”*wüvwˆ§ïâ•ãì $N≥Ö˛»ñæ~Ø {zx|p¯rÎ`ÎÂ/v˜ˆvª`õ’˘lÁ‡x˜Ûg;ã¯4N¢ò@˝Öaúææî ∆øÛ∆∑ÔÄw~∂ [ºﬁç~ÂO‚kÿﬂ%àËè<åËÎ˜
H˚áßx*ø<ﬁ9=ÓûÓ.∏c˜„h‚¸—¬–OìqòÌZ˛31˛·ΩÄŸ¸ÁßƒáS6"ıÇÊˆÉã¬ﬁ_˚óõ3z–üÏÖ^öx#≥v˙o…¿7◊˘÷ë`‚è“f:Òíâ ‚Y∆ÓxóÕïv{‡>>kÆhi“·€Ïºo◊
˙T8∂“Y™√üΩømÆí1åâ$Ò4Í√*—i<_ièﬂæ ÁÄ]Õ3ê3»t<ˆä±È0	¢◊0ÿ7Õ’{¸,ıÅáM»«3ÕÊØäaX<Bf
¢∑Ùp¶\s’` £ jæiJñÊ@Û≤ë=L«^§µ&°î5tøBCÑ¸t&wMÒqñÿÌ£Yç‘ äN£«Iï¢ˆπ§˛(»ÊsN˝JÄÅEÎüµ¶©ü§≠Û Í◊Î”Ÿ|D¶∞°»Ê&#1‡ëÙ}∑ﬂ(méê«≠Ü%∏“¨nEhï·6⁄Ó◊`?√ %èHõ¸¯«ÖÑÑwaÇ.[¸ı6«©∑)9„ﬁk∂ëF1ú˝£Is•$	9ıG„∏SeÈTˆΩ…∞E˜p›2´er∑Océ8_>µJ–k‹˙∂0”!ô¡.#=C ≤0∆ûﬂå‚7â7.ÖË,Úﬂêmo‚SËLÇëz4n¥&Ò^‹ÛBøùL†˝AΩ1Ø¥uŒ≤\i?ñˆ}
Øxﬂœ_,ëYÈ„i“!µ’f?ì⁄RiXıÈƒ_† ¸¶´[R†·:Â›€àx¡—mU≤}d<iÆ âŸvv,ÊNπÖœ…åŸZiÁ∏≠Bƒ›çz·4Ω˙è±{‹≈PæµsÔñŒºYÍá~o‚˜qY ˇ'^¯9Áã≠‚·á_˝$H<˜È≤ ÃÆOî i}F
¡¶C≠L2¸ËNäˆ5	[5¢ñ€12+i+ú"–ΩbÃ…—º<M#ÛBà∏gTàùü,‘mﬁ®ÁF`©ü{eº–~6§@4òo?Ó{!¨åßÛ09:º
D©?aÍ,ÙzØóÔ∂…W(R  h)'zøö¶ì‡¸R¸DöãDdÿL{®¿’ê‹Ïöß[CPŒÊ€6ç◊èﬂ‡_oöÁ”0$#Ô-ê§QüıMÈT/I|·'Á!î˝æ/
FÄbÕ "Á^ü˛õÜ˝£yûƒ# Iì	¸≥ND%W∆˘
*pItrrS”·àŸü˘ì70[4π˝˝p∏ñ#l˛Õ@„y∂j°≥tø·Z⁄≠8:í—…ƒì«§ˆÌ_˝ı?ˇ”oÎ%ÑiúG–`L∂}‡ƒÉIp◊lïÔæ˛ã‡ﬂr‰˜É~ú€ÈóákπIùMÆ…ç§Ω0ËΩﬁú’)´?Z5Ÿ5p±¡
7‡ßÎ,ÍÁ^ò˙Pbûﬂ£VP.ﬂk= ‹Ë∏¡õéL!:’o˜óπ…≥ôZw•ˆnˆ°sILR˜0ﬂsé·hn®O9ÎÈÒpúÉ
>UÛCÿ5n…’76‰Ù´ ∂¥ı{/%}8–¸©˚ xòNí8ÿÂû˚mJLÑíÉåﬂfzÁ9Ãp¸Â‘áÅ‡NàR‚ıº3†©É‰≤ÿ[kŸ†µ<∂1OË∏7Ú7T’´]XkmH"&vØ∂^Æ”ﬁ.+jL≈Ü`*6rí eÜ„≥˘»úàl+ª ÊÊnÃ÷ÂŒù˚ÔV‹˜Á§YƒM∏Í˜Ä‚∆@ìqTDtNÀy*[àjÎR}k·ﬁµ/†tåÔÌ√)F<IíÎ˚WﬂºFq«ô0ìπùØ}∏LGË}çß«0&ócòN4≈{ló÷Ò¬ß˛¶—.∂ÊZP8Üh8 ÇOOÑÏ<†ıÍ~§≥Å?i—FùLô∫3Ÿ>\5o;q«(ªŒMÿût=VÅØ`KÅl—ÔRœc@ÆN<ùÑAÑúz‰DïÚ¥W‹éqﬂ≤ÈZ*Wï ⁄ú≠ÿø./Ä–Æ◊n¬Üúçîàç¥ŒÈ¯Qünà5…	ŸO"vXZßÚŒ9|të}EˆUìêªìq´:˙ ùç“ 9F€R€7÷ñı¸–K¨kf„#áök{ƒQ:!_“Àñ±ó§∞π&uu.ëï∂S«úìz `;®C‘ÆbK7I[¸˝àÿq∫Q†úi/ô‘k
]É6Ææˆ‹kz·√2'∞aÇ8!x‡∑âOP! (©ëü∫:uﬂ±kß.…ÒﬁçnìhíΩπr‰⁄ït‘°Q“Xyób%–&/◊jG≈ÀOt4ÂÇJ◊AXqÃ|˚Ô˛b!úµíöá±jÄÄÒé9ﬂŸÚräJ#r¬‰({~JûxQÿugŸ∂Jüd˜¨ÁÀÚ:#öä‰™BäMØ≈ˆ©ˆ<•ú_¬/Fg*%ÿxGåôß@Ò˙ûìõÆŒ“AØÈG´yLÚQ °OÇ¡p‚Ê›§ã^œ…—Œ’üuÎ'.¶ßÑ¨Ü
iàÖﬂœ^We¸â∂¥¨Æ[≥r¢¶ñAﬁèã÷º ûò!gÎÍ˚¡ F9è…ù‚Àóº«öºØ¢nÌQπ4P,æ©⁄ÉÿÂ-B,p∑p“§ûw™qëjzAÌN¸—ÌÅà«4Í¡kÆ|[p¸ˆÖj®?€ÌœI›	VjˆÂ'ÕüÃ◊ÑkuíÇ\≥j?Ï0÷òœÃƒ¯ærw˙^©hL&*lŸ•l€È»±v\»¡˝®;Ò£´ﬂ_˝G∫ÀŸ+°'ÙëoÙ»òYÁ Ok∫°æ‘‚y"⁄+'ÿLç${këùt‚èÇ@˚^|Â°ﬁ)&a2•ß1•D¿ˆÈß3/xu¶∞Ææô=ŸDÆ&≤kxä‰£w# ŸT¡∑,1ï	EﬂüD$≤:£˘Ìø˚?…q8˘C»F•¬§£ﬁ–ã˙°(œk◊Ø- 7t∆?còn¬˘[∆që∞“⁄X`…~˜ø(wŸΩ¡;T‡Uºﬂ™õkŒ$`∂f'~‘W.=v@∆D„H/Ωåz$è,(˛~®ª_ΩI⁄èOÜ^Ç◊•^√"W¢ˆ"≈éÄ ”Ú≤"°_∂˝0Äµº<°éÎ8îrì‰“@^6ôƒO«áèC„rÓOz√zmŸÀ)t›‰TP∫©Â-EF˛d˜;§vtxrö≥Ò¬q‚'i«≤sj∞ÚpVLößócøx„1Ï5zÉ∂¸´dL≥±‹]ÎY‹øÏêüù¥Rz·d≤ûÔIÚÇR¥œòø”UŸ§íV‘¢˘Ü˙|°*ª§!µhæ!∫ÛNa/v»´ègÖ¡Å€üˆ&€~⁄KÇ1¬wNö‰Û	¨ZIMaP;ï µ§¯5™%Û»
ÊI@X#≥K±∏c¸fGΩâ˝Õ‹†ó±˚x!-êZ`y— §Ø∏5eÅ¯5ﬁbcÂV:Ì!õíW?9ˆ\ÔPœxÕ≤ÿ?MÿÚÌ4)ı£ã Ë-L`D†Tâ?$ıègt4#@Kj–XKGìq/awx˘1pö'˚ßG‰ÿ˜BzÂ∫»I0ö¢22'~r‹NRõ7riÇoN|8±n<i?I†?Áîüz·¯≠òM:!~ì≠?ü-≠çÏ]m˛ÇMì¬™7Ó∏|
 Ø9ä“í:m≤CºË“\—äS+úòXI6Z@8ºb±Ãé÷~‹!ˇ;†F¶‹RÖ~hòs”g6'p@zahíÚ¸9ëÁ:2òÃd¸iÂcâ‡â¢Tîõ-m`üÂŒJµ|ó÷;⁄†DT)s8`˘÷¿ü∞¬ç÷ÿÎü†m]}uâ‘⁄5Kı#√ZxÆ•ˆ3œ<AjO˝Û’æg.f≠{ñ{µÔÊ´üMsÕˇlÊ⁄ƒÊ´ﬂ4Ö¨NsØ‚‹P∑˝Ø¥W/∞ P0ò<¿DèçaΩa©pÈ{I¯Oa±ˇæ‡§!Ú§ÕUÚ)^·vΩú/<£‚ÿ‡¸UVmêºY^&Oc‡ˆ&\<£ lDÑ;bd`ﬂ(xŒ¡0_›Q\"…ˆ9⁄Ÿﬁ›>ºCæ˚˙Ø˛ÙÉÓ¸ˇ]®òÓîmôÇËÉ;BﬂRZIø#æC≠û.ê6¿7ëwv©qß”iÁŒﬂ˛ÈﬂîuQpXﬂ©zZﬂ˘‡Éó˚†(Ïr˚D≤;_˝mƒ‰g10‹Ω‡Â+ei,Ó,ãÿp=_Yiø®f∆uï˙I<F3ˇD*0Cˇ‹T€ñöue2 MÃ∫æä„Zs›ﬂpé§@ã+µ'œ?j∑œV÷œ_–I∫!ëSÚ?d˝ÂUõ o’±U2‰Ç∫€qz…I0àH|ÂoŒVWÁ9Õò@Õq)¨õô˛Ω@ê≤¶C[tÄÀ◊L∆¨Ú^ﬁ"Ã≠v±ﬁ<øèv“∞N`W6rK≈≠Æ€ä∫ù¢ë"@ªÓG¨SdÙá|Tô˙‰Áh”j⁄5K/∂ﬁ¸»≠pŸDç›1√ÊÛO⁄√6ƒÀ€~ŸÕà
‘Ñ‚Z∏¢îƒc ˛ˇÕOâáj∑òiÅÎùF1≠†;òˆŒeÂ#Táï◊ ”TZ{Î±„°¨ªééLYiY˛±EÅà∑ê;˚››=rpx∫˚tw´{∫{x@ûÏn˝‹zô#Wñã¶”öÖ*ëÂ›TëV[vÚRâ4≠¿3iûºÒ‚ﬁâ+é
.6MMkÒ‹≤oÈÂ†KuÂºú¯ÓÎﬂ˛^R.∆∏†–≈‰6áNˇÊ˜Ñ7∂ÀyäË{∂‹^åM0%uŒ ëeê1« ,√7ac„ÓM(<.Æ˛>Ä–˘nÏ≈ò QÑõãY‘.Éå1`å?®¯…fmÁmGÏÚC˚i9Zñhú˝tum3?;Œè„Vhú°·[∂ü‘Ω
á …13d‚õ+ÍèÏ†”¨œÙÛ@%ﬁ÷QôàU@dÂ4∂y¥–éÂ≈S—ı˝!ó§—™ÁÍ©0È;IsFú~‚GΩ¿k#¿˙ ˛„ÄˇÕ@,ov†˛•wıè„¿≥∂HO+—likóG^E∞]¿
ÿó©§ﬁYË˜7gÅ¶@5√áñ≠—©oîwaèº˘pÎªK/$8„’8“~./d◊_Qèb†rE°˘∫‰=ªÑ(ï3ƒÅ”õ&iú4«q@_u‚±◊Q	aıÎ
¨é,4s^/RtmµZ.‚—·Ö≈aÇ #Ãv~C^ÖX>Œ¸º*ÀÌ\\‡πØyÏÈ1|WÙìE€Ω ‚:%ƒ2ºb6◊mrU©≥:o•@EÕ–j^U‘tß4≤å⁄(/Ál—ç¿iôd¬eåÓr≥âvÇÉ\Â/>Îûûtèé»FŸ=ÿ9˛Åü|˜¸‰_¸≤è‡(ô·Ÿ'?åânç£ƒı›ÚF„òl˘!0f	*ÉtÆöı‚û∞…Õ‡ùö8∫V≥Xâ7.´2Áπ±±≤rü{Te3ùtÿœßc´◊xÖ-¿°H¡g§¬Â‡ÿ√v #PhuàŒ ∑Ä˘F@’óπΩ<X"µZ£¨•‚zá·n√ÂΩ}#F=ÛŸÆÃ≤ÛòRÌé}.ùÀQµ(¸HërM1"ìæH*Òò—°÷‹flÿ9`¶c]˝w8¢©âhèS*`œFc∂Ÿ-öçì¶„+∞¥Ú∂≈ÙÚP6ﬂ‡ùÑT°ˇK!ír¿[1H/}ª¸RLa«∫∆ï◊x≥HöÎÃ^YbxÜÛR—¯ñ)ïp–Oì,–9GÊ‹ﬂÙ¬–m¡≠‹	πX#h˝¶^M’Æ™!∑æB√m´c”™√ŒÍÿÔπE¬2Å0o€Wx.Põ!@u3úûËΩ≥Kl:˛~í≥¸£ÅI2ÅNó”Ú”±-ÁSø7¥X˚òä›,Ìá_‰]’ÍÖ¡¯,ˆí~ÎM(è®ZW–÷a·«ºôh_ìõª«6∑j'¬Ë§GÆæI|eH
Ÿs?π˙;Tz|ËàΩcá’Œ–çä!ßæ¿kÌ∂°g*@îõ!%wâ$ﬂFd ñ
Á´§ïPä›Ç˜ÄHFd≥ÿÃäv$π&1f Öbã†â€4Aª«W√…dúvñ—n∞ı«Êç«®£FÑèÈÿ6?û—âÃå ø¸®˜˝g«ª(
AÅHﬂ$™Å˙º	¢~¸#≥EuËX√ó ÆEØkéqV"|∑≤2m´‹
¯Íæø~˜EπéÀÿ9U’∫-Jä]œUm€<<¢ºª^YÀ_≥ã\`,I˜,	∑ÄÍ⁄`◊à6#WÇEØ·?fÙ®9çΩt≤œmß*DõëëYd.–Ú@∑VñDÆØŸmÏÄ_S≠¨Aa6dÃÈ‚W‘≈Dølu;,Ø"{µb‹Oõñ[Cø˜z+H`á≠äΩ7◊eÇ<Ë´8›åjèÚ–üõ\∑iD≠ΩÉ5ÖïdÙº#f‚ÚsÌæpô;
h(J ¢˛3¬¨zÒNI˝}·%Ögˆíí—Wœ∏sŒØÅ‹–®†÷∆e-§-¯o«q2!Á”àFƒ$'_|˙˘1^◊gÃ~tﬁ!Ï/—	 %%‘ö≠Ã√Ùb¿'˛&ËOÜõµªRä˙àyÍ.ûƒo7km“&´˜·‚ãÕ–e¨DIµƒY≤†Ä¸√ÿg1hZ ˇ>¬ÑU±©µ*8†π§ˇÂ’?…j"*SΩò≠Ú
≠º"+odï7J{^•ïWeÂµ¨ÚZiœ´´7˜Í⁄çæ~ìë3ÄØÆﬁ‚8˛Ä|˝F0_ΩÊƒÔ0_…*Øîœªm¿|±⁄&∂,V{É÷^ªfmsﬁ´ã‘fï7ÆWyÖaÀ˙5ænÙΩXÌªFﬂ »W+ní{◊Îö-ˆ 5WõëÜ˚◊É8√îïk¢È'7¯}fã° ⁄M Œw»˝k÷æŸºWÃâ/Ü,+7˙Í∆ç˙æçø.≤q‚∞r3Í†Ùææ}r≥ﬁ˘‹ØIì≈˘ÕﬁWÔﬁlÓå∫!npò≠\wßsu˜f«Ÿu7ÃÕÊŒYØÎŒ˝û…¿,t(Ò≥z≥≥z›˝ ênı∫º¿}ìs,ÔƒΩãA& Iëâ;Á„=Uù˘@1AââIL‚√[nÙœ¡Ô≠tì˙r˝ów~yßuÁ1˛”XP°üU¥xk‰çÎu¸sâä~ñmã‹NLÜı⁄ù;µ™Ë?Í+Ø3_Øú{ÉàASpÛú,Ô±
RÃÿX®ãÃÍiÆ*
t3ËWl∞|4L Á#†°&B≤∆“s¥∑®!ÒæóºÓ«o"'‘qI®◊~’TH”"“¯'@∫ˇ÷Ä5æ◊`˝—Gëb∞◊˘Ñ˙oÛ•t§(ªFìÊç.d‹nöñ∆FC°Ωﬁ–@=\∑ÇŸ:Öf…¬@È_NEyßLj6◊éÈ§Ÿ“û0éZ”MÒÚ√à´ë)Ë™LvUülOñôı1ã™Zn¶Tœd]°!zè0•çWÑé÷∑“‹≥)Á&,Á)C®6îç@uõÁ^œ'<V¬…t0S‹È©wvîƒ„îN∑F==±*ÜfP#ÜwH=fˇRWP¿vh©œKö¡°0Sˇ∏ÀRKJ(∞≈Fîe’˝kuùx…2÷%˚®ñÚX˙`ﬁ) äJûßæóÙÜüO˝‰râu)ø Ç1M}4>ÛÎ5F,d-6∞”¿Oû!,ƒí:ﬁÏµﬁFwoØ∆ •˙/?LT*Ñá_zxQ?@g:¸‹?cÓòÂ;»XèÂ⁄H§ä[<ÃÀá∏ò«‡ˆaN•HêvaM.|Zà∫ÀÍﬂµ<§	µx$Ñæ|ã·gòΩeI`™2¸	¨÷Â~™˘æ∂ `ü≈”$≠Ø¿i—fˇ”´|ûx©ÏEØ*ŸÙ‰6fÂÇv E>¸'É?o‰ıº¯ÅVN†#âµòr∂è≥!Í%ËÄüùnÂ«,ÎvhΩVø…\{≈˜òÔØ2Ñá,“Ôê≈Öƒ·KW„µ⁄7lE~[ﬂ¯ÔN®4¢'ìì8¡p}õ‰y´’ –ÈE+Öı∫∑DŒ,êM Ù]®§¨D›3ÊÜeûeŒÍ∏Y+à\¥¨ú ´ŸdΩ‰ñ
˚’?P'¯ZÆ v~VPê˜ÜM∂BöÅô˙u¨,éıR1  v2â{Ø;‰ÿÔ¡û{»’Î\9ˇ:ûÕY}ÿî)ÖM';^oXØßy|Eh§∏%‹»∑ª’}ÇRı√◊˚~û∂Ç>“ëT˙¥ [!Î»5R¢/?„ob€B£¡msc	‰ÿÛ˙rP∞ÀåWœ‚Vvˇ∑‰%~∑≤[à_sXº“[Ù.º ƒÀ?
ÑÉﬁ„ûﬂNØ‚Ç3ƒßöFATWÁ∫d¥/ß„ÏE4‰Ω≠∑Õ⁄ 'Ÿc√JoAa›è¸oÕ»¶\oˆòˇÍ1©g_÷æ7»Ç÷"ù‹Tﬂ"(…⁄‚0Ù·∞Ä” m<0ﬁ!gE3"ÛÄıªQ:=z‘Q©f•°Ÿñ‚mÆ<–ﬁàπõ™ ujì‘É« QÈoÆ›U{ª]öR5ı∞“ñâè6q]-mØŸ€Ü¬?"]≤øb?üÿ∫Y∑w#z8Bó/$uZˇGç¨+xNe≥Ü9g/Y={´o!ÂΩÿŸ+c2Ÿ∂‚ÍÔ=-PNi)7AÒfn
	->±!ŒHÛÇﬂ⁄™ÑÏv•CV≤A¨v»jˆk≠C÷≤_Î≤û˝⁄Ëêe®⁄(êÒ§îCyÓµÔÚÂûhÂŒD9eÁÊ®f5‰YÕø4˘{cÚ∏f+⁄e≈;∫yie˘®º§p‹ÄS:´me¡Î
Ø?º⁄äßH∞ç⁄Ç˚ÆßÃ§ê›F+Ù£¡dò5Å«HÂ&(ï¸Òè…áÓˆ–‰ÅÓï‚F)HdÀvz£ı$àΩìuùıM€ÜSQÉb·¨T9Ÿ&¡P˚û¶2»•@‰™LµË¢|•9èAe4ká£	∞i>ÛEˆRÛ7'Ã*"KmY´Õ_—ÑYo†&Ku≠∑ÜLÚS&"˚!z~®N˚~ZWÑHΩÅòîÌÀ	áúD°P†Æ÷ŸÉ“∫G«áü:*„bäÖ-ohØ{∫SkËõŒ⁄\=À€43õŒLñN≈T]˝S4íOH∆ç€ÙIª∏»C>dYD∫˛r±)Ï˛¢¬:ÂáÛI |‡jM®õ>0≠|ÏyÕX‹§(∫º3™çˆ›Âb«≠“R5“Ü-4ã°¿≤‚Ê}·⁄H„µT	"Û›◊ø˝_	–: u˘@˜Pñì9)q3Ù»-ñ‡!‹yTÈúO\∏`ﬂ~]˝ÕÚéì NÇØ–ÚôY;èc4˙EsÁ^êÚë©ëCÜ”ëy™Ik/ô~E˝r«â˜Uú.—ìé≥øèƒ'2Ë/Å„9ÒY¯‡ñ2758∫ã|>@BÖSJ	r’Wƒ\iZ ˇÉXë6WI8Ëd?◊πM!@bΩÃ2ê/Êıs‘ÖZ—Ω2r1‰MBª;$ÉÂˇsõèç√/à˘ä®˜…F•d÷Ãïö|¢w_yHñÙ ^Än€'—ôdÇÊò„≥§Îºee~…ÄÉ∞Ææøµ≈béU◊[.»M÷Jà~ÈÌ≠©hë$õy[ãîyäÁJ|ªΩ≈˙›æﬁJ…pÕ7X-*Lo≈ ±Mns≈dbéÇU”ô˘€Z∫¬ú∑Iˇ”ı-;ÍÆªd,◊
∞FﬁÌ≠WÊ—ÁZ-C–a‚—5M˚©{◊ï{R™â¥ãKè˙,Rø·Á©¬_i‡¿˝ËÕ˚äª<ƒ5∑Ó'”¥«£"ıX˙ì%`àƒSBÉ<N‚\`Ó[ÆW∫ä-÷êr}Wc(œº*ÀyóÈêL-6XûMfO¨4´;0ﬁ>%ìπØ23≥NÂ	ÃL¢É~Imä±Ã_ù∂±€b®ìœïä∑èN„æób¥;∆∑br≤Ù·2+XXõ
∏îÎ"›±AT©*€rf ;óYåΩj£†(©oUœãJ-Ä‰	≥¯Õ_ìú>ı«É…¶R≠6êˇ}˚ˇÔ‰ƒIˆ|tı˜¶p´ˇ8ú<p∂Dâ‚Pé
e<ºEª√iï>€Fn]ã<£¶o‘í‚R«hÙt%∂¿•:˘dJè,åâAé¸•T˜qi}Ë"X`!¡*„å¯7ï©∏‚¥•E…NkfP≥ã,véﬁµ•V∆[QÜÂöKwFgsû’‡∑ˇTw∞≥ˇ§ªáóçLOnºb9Û˙ˇ	^ eƒäÀ‚æ‰≈ålkè˙ı„PÑæ›YtfÄ#Cëª4Õ_ÍàGπ"Ú©‚ç2v˛∆6x¢ΩF)°„Ó~˜ÍœÆ˛Ì°´ä2Ö?œïQÓcÑ“•|"\F∫ﬂŒÿe¯≥ ›;=Óû∞µ/>+^<ÅÚ´+˚ÑTô¡®Jº™45§»'ßáü?€°πtnø˚œOÏì
Ûb1?‰¨ÿœ{Yf√K?D•XÖ)Ω¢gƒQ˜xk∑ªáÈËU3•ì˘·5Ê?jXºÇl¸Õ_ªÊ\6≠,2Åy√HÀ]:•oÛ_ixìÉìgOw∑vwNwncf¨Ÿ¸‹L‚aâ‰ÕG∏7jŒ'ÈmøƒÎŸ™Æt±”Ì,c%wä∂•Õq_Nñﬁûãöwbπºãnµ»öŸ]ù√¬√ÍFm◊èÇ®˘¶i{ÊS9Ïm√ßÁ”s|3Ç˚Â#`UxU≥Z≥%våã|<„ª…˙Œ¸é¯—L"º∞É&≥loπZ-N8S∏ÑÇ8G°˘LFcb°?>iõ*˙zUÜÅg`∞Æ∞‡ *`mQ≈‚$Q(Í≤«À"ëÆ{ÙÖ@p∆õµ˚Ä”=n]ÅÙwéFÜAœ_R^c›!õú™kÑrÈ⁄û)^åÏ±®~±k_ƒ#íE∏cŒfæˆ‹ì¶çª˛ÿop›@+Ã,…@z∏e‹o¶≠¢†ré¸àÈ4:ƒºjn÷Ê≈∞r"†5˙î¡†c‹kÊNÖ4¨4a¬w<)‚"k'éô¸:˚Ä∂{Ÿ˚¢Ÿ(≠I3?QÛZà_∞ÇxˇƒlË=ñü¶éHeUèz˜ÑTKK•Q∞œGü‰§6⁄zRÖaA@N—^1Tè≠a.$5~p‹§õQc€ò'ÀuÕ˝XaqyQ…ÇL_so¯§ìÀXë:^—Ãm“DÜπîÖñ‹kŸ„»
âœ£ÇÑΩï∫ˆ±Hõmƒ˜âß7‘nQ\»ù“E”¶>Rç+ŒLIÁdπdüi5ÉQ‘NúÛ•å¯ıO(Ááä|c∆(≤Õ)b«q©D…;ñ7¡Tç»Ù“ﬂ‘˙@ƒëÀ"Õ¡gÒ7ºSè´~˛uÊ	Øp,llÁ©;É@√xUÀ*Ãj—∂”ÌJÏÏl©X¿ÉCÑÔOQ:4¬W∂‘!5˚’d€Œäãs≈Ú0±⁄,€&(≠òm5‘Vm
∑Yñ*Ã˙U8OBjÄ,Oé°¡îëíI0ÚˇÑFr≠=;›™Â”uÍèkó·”)9/ØÕÛÿ∂ãÕ'ü=w≠WóüÚÿ¸¯dbß_òMtYå«ËºÂ(·JÃßÎÆTprÿ.VW‘ B∫AåM`S¨j∑‘Çú†ÿ…ÉßebßT∏ÄËﬁ)_@∑OÉﬁ–ÙîGÕßﬁ˜56|CNcn≈´∏UÿûBµ8∞¶◊®¸ÚË¯p˚ŸV˜∞òF"9æ5%ı–àWË£¨8%ı;ô√JiOŸ$ÅsymtTºZ©N√ö-‹@=çäg[é0”EÒaëπÒ¯®/—nüπHÈW;4>õ*Ä©/Ñ”TN¶ ªNπ;/” =ÓMU8S≈ßç^M•¶"ú»{)6ì2|,=◊∏èVŸ √`LTO´¬™¢w)˛IÒ#OWñ4¨*âæ^ÚY[Ç¢¢eßúÈ]ü	ßé"KífR`WK,9gÖh’∆möjòIylJª-=ˆ‰¢á£¢RweûX¯¯¸ÓÎø¯á£;ä.˚Z, Uzm&r÷¥ñf†–,TÄ|oDúîé˜›>†¯I√ï+ÓˆΩií –û•Ë(5Ô»»«Ù˛”“?ƒC?>GvD64ô¶°îöÇˇÖÓ{∆åÌRßy ≥W™ó<˜†"øfûè§◊|Æπ¯o¨;ﬁ≥WZs¥lrÎ¯tÁÂ^˜dÁò˛ñg7˝±{ÄÓÒÙo∆|∫≥èÿcÑGÊOΩ3⁄W¸ wçÌb&ôΩö¯πx∞{z»˜ ∑[›ÌÓ…ÈÒ·â|≥wx∫ì˝Rí˝ w'œ>›99Ìf/væ8‹√Èº‘Üœ>ùÓ~˛lÁ¥õµ»Íæ<⁄999dØaû|¨ÍT˘˙ûÇDC'ªï˝÷¬dæÔjÌ>P“K‰∞Ô”ÿi+€˘˜4xTœ«BHΩÍœK˝¡ÄÜ¢æ5#.’kåÒ‚ó¥„ócŸ√Àt!¬"O1⁄‘cπgRß/ñ»JMA÷⁄Ì∂ÄêÛ	“ù>ûh g≤´æ— íeÁïaÑc,≈¬T`ÂSıçVY¶°Œ¡âª-/Z2%ìò†πœ≥ì°O~Ñ¥¶˘!;h\ò6POªµÓ#yèhıgª‰®¡W~#)≠J•'Ó
BG{dæ-àë°¥†Ñ»82ﬂjã^ÎûÓ~[ —ÛÙp˛¬≠«ﬁ9⁄ﬁ√S löæ‘∆∂≤™ﬁê4ÑE…Iå⁄†ºÿö/ÂQ[`Éçƒv,k≠1LŒ¢Æ0|§g≠à˘KqÆ¨ÀÖ‘≥ª(f…0~√ãn≈—yêåN&˛òÕ›˙…ä 
ƒc$@úëCÎ'Lƒä·éw eè˛%ü\ˇ.¯Lî2ßéZ0ëiìêrõÂ†/ßÕ r(ICãÿÇ∂$öà!úÙTœ¬YÊ"-¯4h ¨©÷¯ígê‘JGÖï∂Ín ˚uPˇ# œç¢ˇ˚Î0≥maÈjLîA˚L«’7!¸›"€˛Öèi&Å‚Ñ†…aõ¯$ä…ËÍõ∑hyX#?Â-Íûª‹AWãO°J?7	¡öÛﬂaÉe—!r2ã¨’%Rzx)ÆΩi!û$∂P7¯Ñw14§©«º
£F!{uπ6P¡.u¬∆?èA˛ë¬åŒG 0_à›ﬂ±2ÏÔ\zì«J–?s≤[;V*˚≠≠”∆≠»—^˜`Ág\ßBÃØR·“∞Lçá"bQCsOw Xÿ®jKí9p#/πÑ¥0ıV∂∂Úº-}Ê≥òtüCπiàÚ(œ∂¿_´ÚÊ´ÓﬁŒÒió=;"MBÀ”Crº¨Ê0Y¥ÍÍí√g¿‚ë£ùÌ›Ì√Œ/£_FØ»O5.ˇ’°∞áß€Ï"Ó]˝⁄˘^}√›˘–c≠\Ø˛vD¶3•Fg?a,:ÏûPÿé•ãoˇÙo∏IBá|<3‡£ÿ&8™ä;K]Ìñﬁ:=†‹˛Ø<ö_q˜‡Y˜òÄúå»»OÅä¯0ëÙ‹˚ GOF∂Ì<LÉO'IÃÛú£«@/p™ò€…ãz>f»¢ˆæ‘^*â1ÌcÂ¢∞°XîR‚¨-´nﬂgì™s91LÅπ¶g€PI>{;†”1`b®WÆA…‘ì“‰q§M≠€^ÿy;€hbóª¢–ıyS¢›Oºhh6∏l/D éã√ÇŸı.F√’à©©q´õò•+Ëh%µ˛∏¥À
¿’ÜhŒq«ÑDu@¬¿º~/îç)Ë´°ƒ‡l›0GEw)¶â0ÙsEa;`"&,≠»Íñíxiò4´ΩõÖDÓé˝ ô"áHÇ{„"„¨^ãÕ˚€&†ßW˝ Ü˘lÛméGFäØJ†,?|†˛´1ë/ò‹>ç&Áäa˜S‰êTX©¯SQ€zµ°GπXYÙ.y÷·MΩ> «§Æƒ‰ÛRVM®S;§Æu≈¸/dÖó‹NX©àUdƒ?4¥ë‰@Ü¢pQûaC(1{L u‘Èg≈í3VcÒ∞#ΩC>‘`†ñxñÄÃ
êÍ«<aá∆(de≤Z/Ω0ÒΩ˛Â∂èàÊvOíi”á˝Ò¬…ÈôÃ9º7h[{Ig13UvÒƒçî—HeøT§çÿè¬±?‹DN%&EƒÌKuE≈‘’6 ˜∆J¯‰v[q.ëm{?æ1¡„V]Pd∫<Ïí%Õw√ŸVÒñ%Ωaú™xß$æQòSÒ5õ†@Tb¬9y“››Ó C≤Ø ìØNº´øG"`ô’
!ÃFõH]·àbùtkÆl?Û»÷K'˚x%±è5¢]Ö∞à´¡BBCU.™a≤
èÁA`nΩÂerö/À[LuÑrX»ªR}ÅB6A8g2”4e"rºÌ˙Tñ¶≠$y(≈„ù#d~NªHT—¢>eòLà…ã˛∏—¶BB4Ä∞(CöfC´Ã∆)~	°≥GÖŒû⁄´äzKy∂Étzó<Ïö(¸∏Öﬁlråz+⁄ew%”Ω»b[0%U£¬dr√bïõ≤÷œq[JA]Xr.ëSoƒﬁ´¶°K‰èœ¢wC	ªme¥≈ªñIRE∑§ÏV”;ÙÁíß–ıMπ≈l 'ı]!›·:(¿≠«<Õ0ç<%>€ÙQ¥l$◊ﬁé∑µàE{Å“TÀ»ç¯ÏyêÓ«Q ‘é
Î√±q˝µÂK±[®O≥ä[^¢ﬂÏËüÚ˜"ôVıºx0µú0/lgm˚©ÒRkïiÔIQıu8#cí»¢Ld∆huNÅñŒ“K&∫@ZGˆ$∑0lÄ¢5∆)AOO.˜Ω»P
c®U#ò€ä∞Hp(Uï	W—ÉÔÔ÷˙¡ /e—ÕˆÀL5»É§ﬁäAL–Õ¥ÉçV≠Hà£‡_?Ã©QÑv ÿ∫pD√˘ÄÄcå#¿}~˚®} ®¥≤CpŒù~••∆ã`&π]ñ®6Ø—Ñ±⁄§>û<ÊôﬁÄq·fƒxãB”è˙xÀ`FÊ¡µsäâ
M*î≥p¸¯B·TÈEÕß,ú¶ÄS/\Ó^L√4&/}≠1°)`]ËèAQFAô,ôı/jïF«°∞òMÊÅ~∆?≠åü´ãkPÍÉ§ê∏dƒè5´ΩT‚ÄÊELZ>˜ﬁà© G¨™#ÒÆT¬ÃÅ(˛#™Ap~©D`Œ‹GçV≈erYõ®≥™‹®z}]‹÷tbm¥p0Iå	îs√…$…∫  /TÅ$ÒG¿Âg4å£qÊ∞Ó$çŸ	„ÿjÏ≤3Í!¶è˘:–Gâﬁ}RIñCèr˙i‹Â∂ÛÍTxÃV3ÉIgÙìÚçø≥®Ì˘¿,⁄{SwØ≈€œLuEwyP~íiˆqÂUz†´ﬁù»¨¢äÜË E∂-¡ºq>Æëı@k•f2U˜Ÿ]£i˘Î„2ÅÀâlBı·
ª+i*,mWM'‡¶›∞ƒHwÍÙ†ÛZ=8R`Í›â©·«Üû®ù5tfk˜).'mPÜ‰dÔõÏmVÖU∆e,çK±ë∆¿F-S7MÉA$¥‹îøÜ∞/Ì˚}JÙü#kÙ¸EˆôÈ
2Ã∆, ªE‡sXÊ:ñÜ=uÆoÜå⁄‡tı-ˆêûOg0¯◊Z Ô»˜˚îò¥¶æ≤™5Ω≈6µq=ä\÷›0ãv‰¢“≈ùı¶ì¬é*⁄fyõ5fèèØÜ«gÕ/ÈtTÀÁ kY/‹‚›®ÔøE÷\≈9*í“/ı˙îe ò∆äd™F5°ë®Y+è6âÅA•‚‚FOÎÈ9´˙BSΩW∆º¨ 	Ú»Ø+˝Y—X)ïñ∂ƒıßˆâ(]¿<’.Ùu}¨û$Ò„ Õ√
çˇcÏ}•≥≤õ"9H˚•ì˘6S˜f≥{Ëûú°◊W'¥ÿV6NU∆ Y6ÙñéuR¥vF-ÍuÖ£«•Ã}Î0>πw≥∂ : 4™¨n≈Âq@mâá™-Oé^{i∞Ò≤-Ö£Ãv‘K:ËwteZ>∏Î€ÖÓúÊÁ›z\·E7c<ZC¸…nŒ;‹wÇÙ:Í\_â≤ø‰ü:C‘‹¥ 8«æ˝T-eú°h\m‡ùóeˆ©ΩXn/π¯3ŸQë≈ï7 Eë~»W<ë94Úíx ãû˘¶≈¡±H€nÇg∂œ®û≥Ì¬°)‚π•˘óîZ„i:¨Ûfê˝˜É“E@[∏LZ∂ÿªi¶|äàäÜ{ô®(	õ>]ÙsÂ}∫∂a_Ü^é˚ﬁbù∂[ádö~«ÒO3 ™5ÛÖn>ø˙(Q≠«†P\±*ã£‡w≠ŸjÈüŸ•´\=˝£r˚jóÊM YaAIÓ o!E.¥rH} TpΩ\2˚Çô;g]a∆Ö≥Â◊≠;ß«]Â˙ŸºÄfö˛HÍø˚π<Ú©ü\˝]‘Éøö@°Y§Kåu0∫˙fÇi¢,d˝©ü›ÿÂ4Âø&OEÀ1^tc!ı
9R/ØâÙ+†Æ“ë∆M4Úö´¸xKT»˝ŒÒ˛Œˆn˜xWuåºÍRB_n€≠ù— [’X™¿0±“∏ùtßÂ)•=%‘ß2˝1.d]P ËêÜ9µ™∞T…v!U*ÖM!\
`R	`·§R9Cô¯,Aõ>ÓäFdÆB±*E-vG~?∏˙&	‚€%ZDq{Õ1=9n\#E%ìyÜÒ¿–D√õñy∑ßB—“ÉÜJèâz''—Mé◊† ¥ÚàÂE9ß[ZYVk! ÿ≤Âµ9Òπc)Â∫dèÓQﬁ1J?–÷ It¡•¶™KÁ]gYr°ıŒ`s´ﬁß˛!ÔO+	`∑z*O˘€ø]†ÈEØD]MWΩÕ◊œcU˛zT3@äø}VjÆ•úº÷≈A<	ŒÅ€C,P@ôîû_Ø∫ä°ƒπF1r\Á!â¶Eò∞°^{Y["5RkÃH\Â\ÁÃ‡Ç\±c∆≤-3d†¬°IÀ/4£TﬁB‰%ıF”ﬁ≥ˇÕõPjÃöí(ÉT…etÖ´hf¶3M˝ùÛsø7±∏"3„ùù 5Õ€–ˇπy{IüæÃÂ~ˆ[Ø172›oiœ˚:ŒVªÁá˚…]í /hèò(ΩÎ5Ë>D∞†Í(uˇg6#ﬁXıVÊK‰˘Õ%¥7ÙíIzåFŸÃS<˚Ìr&µCó^2	üzNB∏c∫js‰Å°1ÅB∆SL+JV6⁄£î<†˛ _ ãì–ª§_cy˛Äb–W¥4≈¡Ω·S{†>¥•4˚Yœ{”–£i+¢	s±·∂BK§cüÕT;%p	ÕI/å°GmJ|}êdˆ`t9ópÏÜ	_†^Ë{âhîˆc?ÆåˆU¨ôÛìPÂ+%{ìVé+Û⁄EnÌ¬Î2T¥@ıˇ_"w€4‡*±˝I|ºS«@–S¥-?EŸ~6«íAÍuΩb3HsIü–‡◊J⁄T¬ã¸ß”0¸cËGú‘¸5Ï∏…–x««Wä	@÷◊%‚O¢Ùßtﬁ$˜ÓÆ„Ù€ñº©x>@q	ˆ}ÿt–Ò‚<˛Ü@∆êCy 7ÖJÉŸè∞¢3â8º.˚CÊbÕÛØJb`√C#vE+ohë—‚ögEËQs£‡ØÜ2br≥6^ìõÁÊ≈x,4/:Œ0„Ù¶¥û¯pYª8åó2,ë|ƒ-æàäèåÉÑ≈œ≠*Ìí-≠∫˙˘ënè^´H<‚¯¯\≠ª§|Ò7Iœ∆Ò«+og,í√˙™ñéUØoª<R€ö6R¯ñÜgxpS.ùõµ‰…Jí'≈ípê·ÕéÙzΩ%¬—_b.ºT\SKe≠
2V©lU(SeÓåmã∑ù§¥-õ$õõî!†jéìŒû>ãß‘HHÌvô¨›ÂD-+=E1Vá˘®)r≠∫<ÀJItUkkº»L] %•ËÌfn=JM\DUbV]nT8ùûÀ◊KŸ~·†Ô€ñõœ“æ¸ñºö>∂Ë\eåZÒtSAÕ•«‹∫:ùmqå“QIQw¯‘óûÜªPB∏!ıVã≠Nl;^X‘Î¿}ƒpk†ÜÏ;nMÅA>¢øÙhrô
ŒíÙCŸ¶O6„⁄‡®‰∏√˙ñç©<[ªQté(/∑GÊ›¸mÆæ¶éøÊ“[ f@∆:}«úAåÈÉL√§¥mfbi?7Û,h_eËî·´§Ëƒ3ùœSKå–CJDUR¯>ò‰J£5ˆ˙¥—˙*H¿ÌöV≥ﬂ7j2Ó∞∏'w™¬·ÕõœF#¸o›∆¬ÍÒA2˛ãõSQˆJ≥M•+-zëK…Ba(´‚ƒE‹– ıåΩ$H·ÄHiﬁL+Gìa˜}˛ëe⁄É-'⁄à6¨‰’ÔΩ¥—¢∂z#Ã¥xìáÉÈ&hA‹≈:Um!YW‘ÆL-k|ÕWQ/°ı¡øbÆj¡ÖpË®õÌ-[⁄~}˜8¶∞jM‚ß¡[ø__iÃDF~8‰·nË‰?$ﬂ}˝W™\Sª¶Ì˚∆:¨Â.Õå·<ºÈÙV`¶Ëö^§ŒÆÖπÕˇ}ÈÏXV2cnÆ!◊Ù!É©“$ÂºÀZYo4›§ ∏*çm±c≈®πåéåº1ß$˚ﬁò;å-	∆CÜå‚êŸok8*≈ŒÒ,éAzç»¸ë 8 v˜±vúÚÒ√h`LHQÍäè"55ó£j/…¡ü˙XtáPÓQ®ååπœK≠ÔÄYj°Âëi:¨û§n·  Y¨]U-≤1†RtgWÖ#–ø”/÷T©./ì›s.] t ÙAJë®¸%áç6 ùd∫\-\Ü‰∞+‡Ë3ê≠o“xÊòq=S}=óà∞æÇ/ß˙›(dÎ<âGu¨Ü˜cÅü‚¡BsG>Ô— }åùF±ß>#ÏÔ√[hØë£Ù⁄©+≤O+ÔMˇ†m∞Ãõ{•EX>rvI848ò/R“•.ù‚é¡˜«ÿ“ØT∫gú»@[RâûBÎJv‡™:@©ê‡E£m\Ïs@?8P4©ôÜNXó∫Y⁄k—Do`±·‡Ã.ús ÑN]"•ªVWo¨DΩp⁄¨¿14t°QﬂNÖç¯TVÖà∂ËKƒ«1ÁòD≈µ9eËÜˆô∫3K/N&æ˛
5µ˙t∆^í[»óp¿Ÿ=Ø!ˆP˘∆∆Y7ÿ∏ÅFÜ˛8ìL$:oÆÿîµ÷òí†¥ùÏrç¬HêTDî6£ﬁˇ!hçv∏N$kFﬁ«H˘·±ƒ&≤D«≤Dö+$™PDËy…¿˚,N–l°HÓVètäl•∫ÌÛ†±x§ßı‘{	u˛4√	™ÒƒÈæÑß
p%®‡’^ßzÒ*§4ÂúÛxÃOUÅ|¨√Ï¿OU4¢£|é÷D‘zYΩN3G◊Œ¨mS[Ôr=Åﬁb?kò»º@T©OÍ[pGÎsSC¡æ◊†@x4!µ±®⁄
ÿŸQ¸ÑzàqG…,“.-ˆ‡B‚L;á∑∂ˆû°=8ßGZ{ÜgÊıŸáê⁄ª˝z\Mæön€~1∂	WNNAˇ¥’=ÿ⁄^ù‰LË,“«…•˛LÚ 0X¡ÿ¶Ü∑ä¬w2Hà u◊⁄Ù∫Âú´M5
∆bz§‹ÉvÎ≤¬≤¡ËÒΩÒZáÆ™Õ…∫*©‚∆]U/cÒ]‡ÏIHos2Ïy
/¯‰œ©≤⁄ÎR”—È—v`:¯/nî‘t>…f`ñ|Œ≈˚lçHÓrÂ‘i¬˜5=õÅÍ†Oï’¢Åc‹ﬁPPúm™ô*£–Â$¯W˜™W(Yè≥»3µ-z∞Ï¡éNË1ì5ê˜9¥Æf3ìØ\´VØìEöÜ£cöx˘v-ﬁ[4+≠j-;EIQ≤ÿDÇÜÍA¬Úæò≤esÙ´•í}<sÎYw8∫ÊLòTR¨.Œ>»˝Gâ§TW≥E≈iysî∏i¥	‡Ã•={·Åp-ùc
ugw¨f4Ë¨€ÔãHSBCg¸îû'‚$Ù§…EFÛ¬ŸS7Ö{;»≈3ö2êf+éÄ¥Ù7û∂FpO„kK;b˙tEaœ«¿:"ÃÄÛ
ΩŸÕŒs+BÅ$Ò9Ç"„zT^UFa1ã*ÅﬁÇ·Õ¡«/∑˘ï#§
ƒBÛ∂…ÑU•%P€Wk*ö«^nåN”–vò,zT∫ EJŒ ¨ûqT∫í≥_Á∏¥Œê,x`V82Âd'¶2Ÿ¸Å©ÁúãÃ¢9‰´ú†d{
e+FÊπlJóq,9äln.û˝
⁄kQ
õ÷i±€˘∆‘Ë˛#ô=5v√#˝~ÖÔÔ%+∑≠›;	ƒ_2qe… –K§ÙﬁÜÁ”êJ/ì¬+Zç˙ò g>ó2Èí*W.È2Ôãå_S9îô€dó∞Tí§åÀùè∂—ˆòÒ%[⁄î“v÷ñ/ã≈[SÑnÊ˛˘y–¸®á˜<^)ÿ˜í0 å⁄ã“]2YltâÙè≥`,-Hué9}I#3≈Ó∏\yóÈNËçôÅ¨ÒtE®ûËáûÑu≈T›≤¡„Ò*åß≤®ãR„√∏∂HÙƒó[Ba§Ω=‚:#ÌÂéP©@r®
î?ŸX*hÄ*Ëîi*ÅJT@ŸºKı@•Z 	ÆbUê$~¸RË!°Í^ è\è4åv’bπqÚ3Ã#+c§)g„RyÊøô
–Lm%õ‰exÃˇ`Tá~ÃåÌk˚W€<≤M˝VºZ'gÚà¨l≈3`Àéí^áâæ∑héˆÅâ»66˚s˝ÑyŒø™–Æ3YØ∂§ ìÏY/H7Q∏ qQl)C,G…L∫Zíà√ãæ∞ôH≈’5«Ù›aØ7{Uà_vy.PÖ“0ˆ√â\’¥Vr¡Í,U&≥q+CŒ/0ê]πï√9möB9•çJv<µ7Ÿ«Èú◊ô∆âM7ò)Mâ'S∞°Ù$M:$¶mËÂUÈ|0·4®à±ä•òbº¢Œ ∞N√úô”»»Ãlx:Bªí¯qqPˇ∂z=±O‰"X∑O•mﬁ“∑µ‚ªkQ#˙Ó»ø≤oAzx·'a;ªo4@Â +J€Ö˘;˝Ü/NÄç2\)¨Z»,?∞ÉÛsC}°$yÉ#9ìw5]‹£≠,Ko•‹P/7¢ÖtéA/ÅV´ÎJú“>≥·k˜Í„Yﬁ'œÜ‰GPn>Ñ?GÁ›ˆ|Ù*´44+m%≥œ#˛éQVÕdÏ!Kè∏«Ç˛fçfªj¶Ùuì9»ŸºÙg>,}=>Ù75≈,Vı—÷QçFÅsŸ	˝âÿK g%3∫Q≤~ ∏ÕŸ√'^B-¸WsIÈ••ı›ú≠∂Ád˘ëºIóôûÕ¨ﬂ2ÅıF3mÆ—<õ≠ëµ˙ÃH_›nìtG˘Îf[InM%ÆeÀÊâ;õ·ÄåõmŸ~æuLä"dÛm=€	Ä<FÖv“å0h2†kÛMØ˛irOlâg”œZŒÚYêûLœNΩ3Ùq}„˜Îí+?ı#oßj„ﬁ∏3¶K@s›”û;õÊÏï
0ëÆ4K`*Ê<“Úï“4ß)PÜ¸&Ò∆∏˜“8iécÍ(kw}A|òäÖVì¶ ®ã2„´,·jˆÓ‡»¸ïô∫5K’-\;dNÀ,)§^…ÃW q˘SL=®√—í+Uk´‚Jçòg3ñ}üLœ˘á[7}%À∑ØBw¡ı´€©\w{˜Ä¶ ≥ˇtÁxÁ`k∑À÷≤P,ç_éA»äΩÙ}∆#øÍåÅî‡¡w_ˇ_ˇl‚t¬‚ ì#È[∆≠πÇ3≤RIâGE≈ã‰≈Zèº$@¢r›º˝o£>ﬁ[-ÄŒ˛E“tµær;ıﬁ¢¥%ø≠-É)EÌﬂ˛'≤Ég6ÕRf≠Ç‹ãüW˛”‘Mﬁo*ïÂÖ˛Æ§CÈ˛Êˇ˝Á˙Ÿê]t·ÆyPqRTÈ3ñŸúBE‹È°ÎÒ$â≠∏„∆ü?eπÀﬂ)ï‚Q6éFæÆπ¯l	(Á¡k¡%|rW\œ0ò˛KXKñu˛ªél◊p!{›ı{∏Ï`a.ÉH+|ˆÉˇö=—í…Í+WZ¨æüµ{BÂŸ-% ‚&.Ì£Ö›	
Ìµæ•~Mï§Ÿ⁄]6◊u—÷)!ñPSP$Aü‡öΩ8Lõ+$u≤ü´$(?◊©»ΩNFgÕ’Z~),öÜ1XGëˇ9•#C@1uT{Äˇ¡n…Ø¶È$8ølˆ0!LbÈ7ﬂ≥Ê}dŸ+”ÒÿOzËÂ[•ái$öo	Ãl≈⁄!™üÊgÒØ|€0Tú)ﬂÍ€ê)D„√u»>à˙ÆÏFì∞u@5{O©ÚØ^OöOésó˜¸I'ó!ÜÙbÁWÔ2óV<¢ î}rºÁ(6ß&)ÿ±È¡jŸ≤N∞∏^ˇ´∆¢#Í;«‚•}`tëwÜKR!Ë@%´ÍÎW∂~ò 2%„e≤MüöOø£å·¯‘ŸŒ±ÑNü⁄95‹FPÂO∆Et∂|áÏØ-.;	&C#wñÛ®Úéó˛ÃüºÚXiÌi‘ÜcL•V*·–Ûïˆ¯Ì∂Z;Ò
ë…—A ‘>Mc∏ˆAπPârü;˝ Ç~{aÓ¸_@x∂ª–û∂`
FÁgŒn≥∆ÆúÚqﬁ≥áZEmŒ†Ô1öfv¥—Ò ´8ƒù º¢/ò≈Sµr›Á—ﬂô¡ïıèÇ7Õïª∞ü1Ωá‡¯äw"+»u∑Æõ˛ÀÀﬁG|ï4Â<ÓM”N<ùÑ¿‹±+âÇ¡‡«S¨Q8˚ü˚ó€ÒõHNﬂu»≥«å2F…•≈¨œÑΩóª†yÂΩ‡ RñYP[.öVêﬁ¥ö∆Öπ'Eo˘ ‰'
%ÿJ˝BzÌπåLû†Nz‡£O%F„^á§Ω§◊æ/≥ã“óhò nñà=T›Æ∫ÉåHkˆGqË.éÁvã}í<÷ãÄyËñÕªhÉÃ›óàÉSÇè!Èa„µqÒùc‚5p¢`°àq
˚#ºìÎggò8ñë®	B'àì·ïZ(ÿÎZÉ"ö∆ÆΩk'^x·t£!ﬂ˛Ó∑nDs»ıJâ€E≈kÌ÷[€´,2ÂR÷Za…ÿ,ºº[^‘Û√Î/_^{Åò!å)Â‰J∞bú∏µ≈Õ°ñ2ˇ É…≤r&UeT˝{O∞/+kg©Õ∆@Tc∆"®â‰¨ë¿±™òƒÒ®ãlπóPÿUÿçIﬂ˛Ó7xÄï;dfÅø`≈HV§≈® {å&¿1*@DgZd´ä Èÿãrjë∫·íùBæ´.ß˛(†òêI?Î(Ñ.€a¸p[sL¶Ë[· 2|4êÿ=Y≈∑n±ÖFπ˘M £„Pƒ˘èúGuº‡fKÇÓ¢†;lÆJ¡ò~î÷O√†Ú;A\ K—Í £,;Wªvi¯ÃC£èŸÓõì∏ôP75¶7¢úB¨ë6@m¥ŸEC”Éü¬˚ã™,ä4ëõ37}©y2Ï†}ûÙQ H-ë€X‹∆¸GØ\öOqµÚºkn≈ÈÁ˜%1ñG.ErÃ|0—U∆`2Mär‹ÊÎÖ¥vË0hô{ë:¿:Nï„ì2mÌ—w_ˇˇûi)˙\‰·ëÙΩ…ëªÙÍo£Ù√¢≠^x2”jOΩp‚’G+âQÆÚÑå≈"câﬂAhËÖ” !¡`[Ö≤ìx{+Àa«Tñƒ1˘E–¯ì1B,¯äónﬂ'[t»ÙW^°6À≈√P|yâ.‹"⁄7~≈≥nW¥◊Ï˙1#A?B?–ÿZfO:>¢gÁ1l∑J¯|˚õˇJo˝ôÀ\pA#à1»˙‰8òåb#	I˝ƒaÕOIJ«i√∫ÿ√µ*öƒ‹Ÿ®_zCÊ⁄º˘E~Ù(‚91¶ΩnA£ı8Íß0~8ÏåF.ØÜü¯=ô™¶V∑Wu√àÎÛ∞™’Nú’˝´´⁄Ç€ûúı∂4‹Œ?s◊7 ä,õ¯X^√ƒdÁÀ)†Uà®$≠ü -ÛR«>P†OΩ‘∞ä‘⁄›y€!ßÄˆ^8åßdÌƒ["#$M¨è)ââØt‚ëï·Zõ‘ŸÄa¬M“ÌçGÔÓh¡N÷⁄#—«CﬁÏŒ‘›µ‰ı¸£ûm)ˇP∑q¿[ã√jfe≥ O€eíoñü·N4∞ƒ¯X¢¿Í›ÎØ˝ÀÕéå 3wY»ª¨÷•∂∏πV†B∑®·•ÊòK⁄‡=Â∫
Ô¢
.r/èŸ≥»‡¥kJ†ëUqQiW3 5–™Ää@v:ït‚dµ¡W¨Z€k(Éïµˆà%OÉ–#uæ˚E‹CŸ ‡Ã3Ö56ñOP|ôeîôm’ºQ(N…nùhˆÃÏ˚”Œ8ÕÎ+8{•¨\n°X∫ØÅ≈µ|L~¢)≈jã7PÊ'¿b!MT¿_¯q˛j^¯íı/^p)Ö(©÷å	|‘ﬁ∏˜Ó}:Œè˙Ω’ª´w2B˘∞gH∫4ÚJùo≈ôbcDåYUBª€ª¨Sı÷ºÏÓnúØﬂe∞ªÂlÂ¨*ÏR;◊ﬁAÃŒÌey>“¶≈Iˆì"È¢p≠¥•´a˝ì{ü0 ú›_È≠Ù Ç"ÌÚ¶Õƒı¶YzLb∂Îp&Õ2ô5#m(3∆Ã«0‡#<4MhNÇ¡pR	˜é#8`_r§2œ14ÊƒÂÍƒú%dÎ«iÎv@S°P·5tI˝¬œÓy~c„´Féì∫∂EGûu∞	EÂ«ZŒ1SQ™t≤#≈MÉGˇN‚7¯w›d√pÈŸBÔÃùƒ¬¢H˝§@Åâ·UA6$z–lL€∆ﬁƒáníé¬•d•ﬁëéπ)ÜûÓ∆Ö∑¶Ü{S†∂XƒoË∂‹oØË
òîóÈf#iZá∏Äf“…ÏqD›yU U•H˝.ë{G◊ôp≠0`·õÊ›un@B›3ÔÂ§B≈•w]koÿa‚ºLãi*Wé¶èNc4pãSÅt)©SóN‡àYiß˛]Ü€¢a	ñ˝Æ@˙‚ùS,ò¥Ç˛\ $˚UD_±FKûì&˝õÊ~-†ß≈Co8à5ßëî¿ñˇ™H’§Ωk¬√‚àT%<*Åa5ç=Nh÷æKÁ	¸Ø|„
Âg≈}k¥•Ü%zƒy,|ËÇ…`Iè2ÕÏ¢M∏Fèxö´géÅè§´_q◊ÿ.Y‹–î/∫+ıùˇC;„Yç‘lH=s&§aÂú…ı~¸c+juF˙^√“ù]sn•zÇ†yt/±YóXp;÷el£tzñôGôq=Ü‡B◊ÆáÀ„ Ìe&ÿrÅJLËÓå≈h––Åö›EIeÊñ˘	¡’ßCÏ≠πŒ)Î<è® öÈ≈©J¸ÜÊ6Ó◊á1K&wMkAª,ÌRΩ3˘Í:JÜÔ√z]˝/gfÈÜÎQÊÄT∞4œ¿[G]x{([‡lbiDU]pEúÎBí|<3RŸ‹mûi9èl‘“u<$y>DJ∑5õ·¡Oî*…≥”‹=8QG©≥√@—Yê∫¸÷™F˛9w4D÷à837\^”¬π5ó¸ß„ö:ÒCèÜ€ƒ¿L√ÊÛïªâ?zaù˘LILÌ4äxxÏß„ÿ≥_zg:ˆ µQŸ¨¡(~‰íAá>*æ6g´ÎN“„˛mhVT‰3ﬁê≥LCÈÖ€4wuÄQ¢f¬àfeâè˛t∏8Y)j I?1—ÊLèUÍ¡F¿ütpìx‹!´Ì%í∞°≠¡ü°>°).Œ‚…$¶iÊú÷éj≥-Øü^ÙiÙù≈–
)â_˚€^
|⁄¨≠ëµBó?ô=/‹úQÎﬂ"Õkz≥ˆ—Œ∆Œ';O‹≠Y”ˇQ˜mP‰Ç†ˇ9àÕ5{ãÕu—¶uF©∫"¨cç=¿˝
Sı`êïäMıèK¶˙˛œ‡4é√I0.ËÜIÉtA¢◊< Å°?ö‘Jlº1QÃºÃlF!èΩ~ í(©›øu˙˘™†(uT*+˚ˆÑjy°xõ¨èﬂíªˇÊ
¸'úyCêˇØµ“(lÎö&{˛¿èä65Ü»;•>hΩ ÈÖÖ˚C!¿(¿™`Wme‡v›A—¨≤m≥Ûµhêà,	!	]ÚÕŸÛı%≤Œ·≈;ø˛∂|kOÓ≠>Ω˚=Ã··≤8∑\æÂò∑uõ,Î˜*µŸx¶ª»0È6∂úÌY5\—™Åøô4rBºà⁄4”q’^$9o{5ªo’Rµ‡"é^táé˙1†	*¢˙>Ò3é≥’r›ºõè;ÜoQÌ]è—FÊt˝]p€áƒòY#ˆùú∆\KñªNÉòê#·¥}]Æ[[@¥¶∏kXg&„∑ÄSM&”sj|6∑≈†¡>ËeØuñﬂ}˝Wˇô|·'4U.A‹Ïyf7¢&ö» ”D¬Ÿå˚?Áä—rbÔÓ≤EÓ˘◊![X‚Åˇ `¸ `‰üååÏ˘W¿àË!ôg0äF*∑∫Q_Åùﬂ^Ÿﬁÿ~/D1c4‡Ì8(˙’f+b˝ﬂﬁ$
Õ,G5ì(‹uÃ~Ÿ¡ªÏ%dÆ¸∑öG©ÔñÜ%e3øx’É¢Õèg¥{ƒ>˝°àPÈ:Öñö≠w>⁄y∫!¯—›µªwüÆ[Û‡S6™,¬ß¿Úß–Zèäî?»õÔØºg¢Z¨§(j}oÚ¶ı•˘ˆ∫fîπ´∫hÍv‰≥G¢#uiÛs]‘bƒiúû[ó¿ES®©QG§≥Â)N6ÄÄtr©Ë[,9π£∑Â∆Âô¯^HÔVÌØÀ∆Æ‰Ã]t‡4∑z˘∏ÖÛˆ-è[dÅZt–òæ|–cL'rÎÉVR-8ltVa‘Jxæ∆˝Çß®*¡‰Nîﬁ[K2=ÛY¡¬™ÖVsÆÿ?8Ã⁄y∫F?¡#ézrøeQ°k`âˇ_AêŒ•-äLï¬Æ‰…ﬁä0‰&ã«7)¥©F¢™zØö±'möÇrÜÂ~#≤Ö˛úåØ~üñ’*Ûr(ê°±&√◊√¬≈Gµ…Öﬁ¯ÊF∑˜º(ÆE	k,˝Ç≤0uÁ?zU,àÛN%¿,ääd€6gë04ÔW≤Ë%ó,w[–
éÜì˝™ÜZâ;ÌJnè(éä›S`ìΩ¡X¥ïR”H|vFJåˇ∫h∏ùµÎX=∫’∂J
BëSê%!‰	yé—óY"’Ç¡√]8J8-ˆãıX>¸É=åw¶úÛªC :¢Oe,°¶Ëµ«É|qr¡˜w∑ÿîu◊¥B$7˛ÅTdy«òÉ¢S‰r+àS≈ª*Ü†ì«¡ˆ·määW“˙R„"›ª‡Ôr˜.âErπ∫V	ƒdΩ$]ïr,§¸ªØ˚ø)q —åAƒøØœÿí¯˝OÌ«~üÁ˝Â∞H¿•
€ÃbîÑA9ùÄ¿◊ö`wcZæCN|/Å
4äß5¢=LQ‹sÛ·ÎíÓ∆°◊Ûá∞&~≤Y{2M{^Bµî[WˇàäUO…Và!¯¸V´ÂjÑªÀ˛˙!É4zeè97N˝…ëŸ¨È2Î◊§◊ﬁF¡§æ≤⁄x@c-˘)&4"è'#§OiÄz.Z}=ßΩ’#«,çMäìÑíŸ·∆óèÿŒ_Âıﬂ™§ÕeU¿µ7Õáa€≤#BE=F¡û“]DN„¡ Ù›(ËHØ´ÑlSb∞‚¸Ì#›7∑W¡6øz≠{∫˚¶Â*	ák≈%gïJÒpiﬁ¨U®v%ü¡·fπ≥
f36Å¿]€ 
ï,˜ñÇ¨Y§W%˚VaZfÆKfÆO‹!:∞N-á[=‹f7Í[≤«fOihÁwçÖßá€? ! !É√ø>ÃB06ÂZxËf˛Ûˇ-‰êË:¥ˆÇW=v9∫—÷◊ƒ…HuØ¬≠iû}p¿÷˛¿èÜp ç)â°ï∆œaëV=rÜåƒÙ{¡yÄ…*ùºK«lçß∂ƒ÷Ä˘ÒGƒt£eun∂z
∫ÆÀÀo#]—9Mçß≈][$®7R o>:ç‘`∑FÉxâ˝∑ï‚w"ßÏΩ!õ{t3gWåWBd0Ê¬r¯`¥Ê“Bj4g≈ò˙6ìe9"∂π¨•‚Äjw KLdìhN≠t¬õïˇ,çYZö“´	zﬂ≥«ò&Ë≥ˇäqnœ`ΩÀÏq  }KímUHlî§‹#rIíîãzuRx"[Á∏]†ı2•˜aBÙí	’x¥6*ÑÀÈ-°åïÄg˜Ÿ¸ô]=ÃŸGbïÀm¨*s+çÑhã£_!õÉÎ˙&ˇÃ‰&û√.ûâmÃÆ	oi¢’≥ÂœN5$®~ùÅEƒ]∑hGË≤RM(–ÖdåG>ç≈ä€∏∆e{BC±Xè7}äÔ}∑æì≤´◊\HVy˜Í
~ªº^|’úıXëÆüû`µZnÇµ"¶3{π•∑∏Ï)ªÀÂ ©T®:ÕÀ‚\ìË)·sq!∏qû5∑"Y`Fìd«¸# ˘Dm_ï‘ïØµ˜çCóÓù€§ó&·aô´Mö! ˜GıJãîpJ∑ˆêí≈T®XÏyîcmã‚‚æΩ£(kÂ¢Ÿ¿l
Ä˙8Ò/ËW¸É¸î¨¨VM2©≤Œdì2#∑"îˆ¸˜'é‰
(¸Ωm“c{’¬Ó≠¡w3Y¶Zp• uN¨≈æ˚˙?¸œd?Niπ}/PÆ
vﬁg⁄Èf]L$X"EX”ò£·‚7nêPlÅà™π≤ñrF∂y oFw=õ|>ù˚"f7ÙN)O±bDjåã˚‘CCΩÀ˝8
‡_õBû„N•õxß¸Œ&å¨˛ëˇLÒlSÜàÃ`¨ˇ;_»á≥ æÙ}VL˛ ú¶>oã˛ï/¿ÔG^4ŸÌ+”Øä´‰*‰ãgÈ üxìﬁêè9˜6_1é·‹è˚Ë8Ù¢~Ë≥b°Ë'≥ﬁ≤âjˆ!∂EÄYΩáÀ'Ω$√ú[BVîøòh∫’›Óûúû‘tÍ˝hÎ⁄Dé§Ü”ùÛÑÚìg∞
õ3Â«ú§”3VvSmONCÓ'≥ÛΩ√”ù€Íò∑UﬁÈŒá{hØÙ2)à#x∏sáòTc1ÑÂGŒÊNw?∂s⁄ÕÕcg|9ı'^™∂„ûJ˘¿?›99ÖaÌúúÊª˚‘99>¬Î›Ît)˙R9_’‡Ç"aVå&WJ‘Û:}Æ†¡
∫K'E≠Û µHcv>∑Ç>ù∏ΩG¯äô¿¥÷Ï%‰Çtãl‰ñu–n—-éñ~ﬂÌk\ïUEdâT‚º^9àÄ!iRaùÜû_æ€&_!Ø⁄~QÓ›éJ†3®‘O‚1
NâEgügvm´…”ûÍT'w∂ÿd<ªvÍÆ≈\T’{€|#¯uı≠Ù8
"ÚUa5Ô[¬ßfcW‡~DÛÒÄ¬PQ∞û;≤+{K_gÆà‰ñÃY∂ |Ï^⁄¡“nm·‘ ¿NaÃ≤L¯b9oﬁúâÆ
8„õ Öx¨W∂k†{vâ‹°•ˇ#í_˘¸`ÓJŒÁ‚˜úBÚV]xˆ,Âœ∫MWŸrbÿ;6îƒut€Ô?ƒ  —‡ÃB$˚È
kwEóM∆`Iˇ\7î¬°ŸK+Ò©mKΩˆ≤∂D†wwmß›ï=‰çA#¬ÂK‡aèΩd"4s∏i;√Üø≥°ù¸¸ŸÚòˇçqÁFHµËTqÿ¨Õ…Ø›ã ä„V»JÛóÿ<ï¯óÔs~á,œF¬Úﬂ‰ÊG”p ﬁ⁄≥\TEj 14µ$I:F˛lªFΩ»·Üg'ŸÊ:»:[;º°@AÏvˆçÛ∫Æ∞o-‡˜}¡ÔlÌvk&?ƒ{•Óˆ˛Óç]ÈÚU8ÁÛ•ç'M¿«ñÛ£òt‚Q∫^∞ 9≥Gá¢£µ°¯;-s}˙ÓÎˇ{rı?%æáá/rŒË	¯4àº0¯ Ñ£EO·b„·∫„KÕÖotñ…L‰’¡E¿:«ºèb2†É\"qÔÍÔ»Ø˝®Á'®£ÅO>Ò≤1c¨ü^‡Nà6ã_¬ñÒ$Òzäq%‚%`l*}Pø„T#O8ZÈ≈ÄVËO5ºFÄd‡GÎßÒ$¢±√ Ò.Ç´ﬂªÜ£7îT|`n–ùçow˛vG.µ(“®;R1®i≥å$pãZ‚‚ÛπÑmÊ¥Ïì<˚û=E)N“‡òyqÅìX|òY,UQt€2
@/ºè·ñØÁlõ˘2Ûo±B7ó.‚©Qﬂ¥p-jO≥‡≈DüÖ#ŒÎÁ®*U—ñ§èDâG-5Î$7H“ì”dôs$©Ÿy[fÒ»n5ú≥)äÀ≤†bΩÉiπƒ"u•pˇ‰rﬂãºÅü–#≥»ÿ£∫:^∏∑eJwq 0∞À¸ç∞|Î∫Ü],íÁLüÓ⁄”¶
>Kqy-M˚Vù¿N 	œNüw°˝^‘.ü>¨Kn.b*À*"ågó◊rq≥Mñ„1µ≈Ãm:IùïEï÷„éªÔ{ÆÓzêµúO}!(E{gg_BÎÉ©ıÕîPÛF¶êâwË%ä°‘ï85R¬Ñ®L≈*¶LWk\\®‡ £«â:‰:Íß¨PÁú”B%DWl£ÌÕé†ßnÇ˜√ÊÛ˚Ìã·}i‘5ã∂∞éi‹‹pÁ≈Ká	:ÂYn~ÏÊ´√’™j©˚Y†5ã|‚àápÃ9ª3 ¢˝≤#ﬁvºdﬁ_[[)£lê>ÉÛ<*∏OŒ	r<™ºl≈˜ÑçmŒ|JLUÏ£§*r<,"û∫sp∫≥†îg•yπIS˜,o‰ıºx±ô;nö•‹d7á∞ ¡9ÌÔæ˛Ìüì£„√Oèª˚›´?ª˙∑á7á HO´.Oí¢9ÔåC&}ÆHß Î$∏ÌV-U#/€sBÜ=≤Bi_æ»°ZH5≥G«XI÷!±CÇQ7
á¨p02Œ¬jÁ_ÅÇ≠kè˛»Ö"ãüåÖÑ…™„J=ã0l%´∑‚LCWãûU1 ÿΩå`üQs +öÔFT=uı˚´ˇÇt∑–º0ñò©’‚Âby∞[±+ù°§eÖ‹†ıHr&Ü õ7'Â‚˙„…U·pÓô2X°€≥v√H„?Í◊å∆)¿Óù2 SshÉãïç◊Is˘˝Æó¢9E{¬[Z8)V∏—WÑZ5J]Ö€˙_6ÿ∑‚Ñ,ìS‡>¢a}·êCØπe$‰GqWÖº~Å≤l~V/L‹*íØXÂRÂ_˙zbPZTΩÓD≠˘N÷≤ú¸ÈpÔ˚a g1ÃuÈî—=)Úﬂ‡˝b˜$w”Ö°aa;Ô≈=/Ù±‰…ıı⁄x“|r\["32	F˛üƒÜv~v∫U#∂àù[DùÔ#˛hy äÎr"Ó`^{A4§W,ÏæÆ.“y“[ä™AIg{"Ò0s:òΩxê2õ¥Z¥Æãå=fÁp»$”]ÎaÏ8à[¿OÍuèGs>ÀZ;k!•o4&M‚eø¨vŸÖŒf◊ç≈JA&!¬ú"Ÿ›ﬁÜ°?°ñëq¥GoA6iòSñÄ5ÆπùÊ≤z4›"÷≥K®†Æ“ÃÁìKh§˝¿Ììæ	0>ŒåZ04
]»)ŸÃíªÓWÿìá Ω†)@VM ◊¶(7ìŸ÷—4.´Ö`…g`¡)ãàÁ|y¸>eí¯ú%æ˜∫®Éíö3z!@)…Uf£c*0\6;◊ÿ÷tÇ†z«0‹>|r‹]z€ÒY‚-∑ã Ü]#·∆Ê·∆?ºWàvr∏∑Ω êN‡$ZH2∫ØÆ*$˛·Ωíò∂…‚1ûîáwºNÏWLÏ˝†‰°B©ˇ=l√Ã¿{!Òk¯≈	>À∏º!O<¸ïá{¯Qœªwæß]D=Êø≤ üzà~◊ †?B◊⁄æ°¯ù¢¯r}0ÓFq–˚^ ˘§{Ÿ·ÀœüÌÓÔn- 'Tˇ|zı˜£†∑8@{ó^ÜêÙGîÙı˚EÙéwN∫/w∂üuè∑ã¶U8Ó>ÌÓÏ- ﬁ˘Q∫8©L‚4;QËè<`ÈÎ˜
∞ßá«á/∑∂^˛bwoo∑{P∂Yùœvé—◊e1 ü∆I®ø0å”◊óƒ¯w¬¯ˆΩÓ¡œv–Èo1ÌFøB≈±êß∂PÇıÊaD_øW@⁄?<8≈S˘ÂÒŒÈq˜tw¡ªèvéòbQhçß…8Ãv-ˇôáˇ^¿Ãbá#û[UÉC¨F‹Ÿ≥êMÉ”ûÅjã†•âà?Sh}W‚)Ì;W£‘’ïî—„ø‹©gJZkÚÒLAÀÚ‹\ï(õ£<"I• Öôù§°aÖãî‹(qßpnã›ª1Za•6'”»ïÏ){Í'A
ÌGå™6·*1ä2Û©Æb8ÎÑ’é%‡üÛ∆T}fRNµ[RÖh”]7
Ø>‰Œ≤\‡±@ﬂËÂ¿˚~˛b©PÎ∆ûa<≈,;´Õ~0&%â#Ò—-5*WqÖ∂œ*¶F•ñTSæÇ˙πW∆ÌßÍŒÀ§jÉIÔÑrˆÅÔ“*PCı[≤Âı√
iﬂ1˙}8äü“sØOˇM√Ä˛—daáh⁄`™$¥jNﬂ™†"ÿﬁ•~◊3QzòÊmT,æß™ù≥º¨±ÊÃvùâ≥tø·"1∑J>ô¯cå˘Ì_˝ı?ˇ”o[e&ﬁ3Oìmˇú&ñæài˛«Ôæ˛ã‡ﬂn	ò#9∂[nï n∆â•∆≈N3S®‘D :nx¸¿Ó…
 Â{ök´ºyõÔ<Tø˝›_Ê&o3s≤]ıÕ>t.â…Ú=,∑‰ˆPU‚g^ﬂsv\ÜArıÅÕ<˝* “¿rˆ·xÙßEz‘áœ~Û|üE∫Àÿ…∑Y {Á©ä~S_N}ºáUåR‡⁄Ω3œQV:Zø⁄Xó£cûp´3G@o†k∫%ª≈si!#çEŸp®˛n+*∫ï]´nE‡0Ev_döÁª≠U¨âI≥à≠q’/6˚,û÷ıÃ?ä◊œÈuñÅÈÆ}´Ryí$◊˜Øæyå–<;ô£79
=œ*dU(v„éa|D4ÖCÂlŸy@ÎUuÀ{∂Æö™e’Dñ¶!X^¶´“®û:ÈäkãGóö;Pç˜,j›w˚mœ≥ÈZ*Wï ⁄ú≠ÿø:¢,‹$gäBÿ∆ô'¡$'˚kúéıπ∞”≈ÅˆU=Æ≈Ìs¯®'®t≥1Õ	Mít’-I˙!Uê±ÂE=?¥Z‚˘Ç-5◊ˆ†v5_RÕ÷ÿKRÿ\ì∫∫?ó»J€)Á§Œ¬/C§á∂Ù£§Ûø;NôqÄôLÍ5ÖÆAWﬂ kÔµÄΩ†~∆∞aÍ›ÏCg>i|Ùˇ  ˇˇÏ}ks…ëÿw˛ä‚ÏJöŸ≈/.	ƒp:º µ>C0Ÿ3”¿¥8”=ÍÓ!ÄÖ°∞œÁ«˘nÔ¬gÖ˜t~(|˙rä;ÙÒ¯OˆxÇ3Î—]U]’èrWlÖñòÓzfeeefÂÉQ<R#€:-
mïˇ,ÔÌËá÷,≈»ÌŸEŒJZ +P¨⁄§·%„Z5·#¡QÒÚMπ–•$.(è∞‚ò˘Ê/˛∫ŒZÏﬂ‘7¶0Ò∑Ã˘b6juLÑØŸ˜‹ûë'éÔvô≥∫‰|	ªg<_f€zto˘êHì3L√ˆ…óßÖú∞£√ Œ2å≤me)h–iù1ÛHË`–w™⁄D€ø†≠˙1…GY2V˜ïùtQÕ¸5Ÿﬂ|˝:ıC”S¿ñCÖƒı€Ê1^ÜÒ'-lNó2nà≤ß}ÕÕ,º…˚≥g?©∞@Œ„éÄ˘JXõºó∆eóÙÃ≈“@æ¯ñÁ ]bó∑1ÓôvpR§û7™qû¢ª"Ñ∂bwt{‡IÉƒ3}‚1lAjIoÉs…π&u+XÖü¬èö?∫nL	◊Ú$πfŸXÀbùïÒâg_	É\†%Z öyg∏.PÑaÍƒÆØø‚ÏéÀ“Àåπ˝pHE7‘OÙÜxûàˆä	6S#%Ωµ»f;ÑEÄJ–†ﬁ) <±$&∫·©oHü~Í:ﬁÖ√¢Ãº˛ÜôA6ë´âÃûJ…ÇnE@2ﬁ´ﬁÆƒT$›ùD$≤<£˘Õ_¸gÚ”`øŸ®Pò¥‘cÅQxy^ª>µ0êƒ
Oˇîa∫	Áo\{ÿ≠
KˆÎ/›!§˜o@PêÅWÚûÃÈè<ˇãÅGùÒ¯p‡Ñ.ø-KjZ£⁄ˆŸm,H FGï¥îHnWµuÖPﬁÊ∑´X£uÊ∆¨x£5v˙áfÆ>?Cjm=Ûk`à0@/òcDµü8~Êµˆ‘}ï}π„ÑŸóùÆ·Âé„e_˛dbËË'ì°°Õ≥ ˚Ú–Õﬁ˜÷ˆ&ÜóªÅaÓó⁄À+ú L^«‘hY4®7åU.]'Ã.Œ”…p¯gàe¸jÍ	πôŒãØ`yØg?º¢ù‚ÿ‰ıπ4^+N/≥≥‰)ç7»O8;Ñå–jÒÃe∞qÑßÌô{Ü˚‚#…àóllÇ¿≥±µ±˜˘ˆÎø˚’Ω{Ì˛Àü˛ßwÅª„#¡ÆÊWïÎ—ç$›“™|”¿¸hãﬁ l˙Ø0b]¥¸—Ωo~ıˆ∆y–ı7ÍÖﬁâ‘5iíœ„˛2˘»ZIf]tÔﬁÛ:‰∏!	Ÿç_ˇÔ–»O†N=Ô˘e¨!üÀyûõ6»sNE´/`q<Ê*∑ËidÊ‹héÜ—P€√j4Æ$∆nI[≠ï˝*∫“H¡∆€öEµmpiTn»•,:ÿ`Ñ°fΩ!∆u>Q óÒÿ2∆T(…&ZÙT%BIÔk≠7¥å.ºÅ}¸A15Hô˛”¿36v =Ä8çH4AQ ∏á‰˛πÓò&úDŸ t«òc⁄èa£∫≈É≥)|,CN[«ht‹‹Ã™Ù≠˘HjôÑb∞_‡#…Û÷åË16 w®t\w–?v›NÜ Ä◊Åèíj«ﬂ7ï≤ÂãZö&–Âë§7oEÄ“˘NLcçí˙æÛ˙w˘òlll¿w_ˇŒÉG0É€ÕÓq7è∂≥)èM…ü%π47˜üáÿ:‘Ô/≠HßH«8™4Éëµ.°πçr>£õ}±Â^´’¬vä-ˆ(úñâzıöƒü˝Ÿ∆Ï¨µ¬†˘f|,ëâΩõ5hâ+`ë2èiRíàÔo8±Í&ºí8/Áúìp≥¸6QnÅ%Bnã:jâ—yu?As≥nY“£Õ%YôVËAIÉ^ÆˇI66•îi‡Ÿ…≥
˜Ä{† kS=È`Ωo~é“//°ìÖ Ó6{ Åˇú0ÅﬂQ“öåìQˆmÒ=Ú'lm€(ä'∫BÊ≤∏ÿVn´§Ωë0è<kUj¯›–XÅe#µÄ	Ì˜7í0c;Ö°˝Í6ïtv\—Çw4FÜyãJœ_åvï£Åb+`¶YûÂî∞Üá≥®8ÌkkâzùÄQ5{sj†’¢»q÷Îc=5¥vQºMÂ^e–⁄ŒGﬂyÂùaﬁÉVoËçª¶":ﬂKÎ∆ZÅÃê¡Œ~&{ªåA&vdÊY$m6 •~(ÿO›ı?˙=œπo5ñøâ¢Q†à§«U◊AèÚëáG7«ìuÑKò–¿;≈íæ9›°€_Õ?îÕ`≠d}”äÈìUí◊M¬dY±âq_vd´ä0btìùÒ^‚x-œŒ:cØuéct∆„‡Î,».˝5:∆’ØËTÆà» ø\sf?;ÿBŸ
¯Í∂QUbÚsé©'œ1Òà_á˛Åß|ﬁ:˛K]ö>ÙÒVˆD¢‰Hˆ}£!/µ!r-pvz1:Âdºòv˚(ïπ<ç
ÈtC/Ã◊yTT’OÁö&8&d€π¶ãC±Î{˜‹ãq∆(¨;ìaLN'>ı4#0⁄:3&cËz,%AôA¥XOü "O"˜0vbw_ê_RQ„±¢œgÌDŒ+XDt˜Ï9√Ct⁄=£ä`º£Æ◊º∞q^|úùπ˝ÁòØR‡&⁄ƒ— ©â[^J$ÄÎr∏∑€¢◊†º∏Ä,ìCC)±éx-nR^˙_ÌÛ5mç_6tŸ¥q7tÅÛîsÀ0%4á¿÷Ö/˝˝∂kLÅ∑°ºR‡Á¯óè”Õ≈õ"¯Ë˜ù!‡›ãüæê´KWhI’≠ΩC^˛*,Ïoù¢ûY‘‡?Û´°£≈˛zØ?#Ó˜ƒã¢Ò
Äy;Ò>”J’˚˜˚ !¢ºuöîÿ∫¯FmÒ	ıO⁄u^≠√°3é‹>o9˚A}7êŒ™hÀ1¿åØÃÍ9∞4œ{¢…ZÉÂBS≈ö@ödx1`ˆ–MÇó^RgñQJIóÊ≤÷|vKq?ÙUFÂétF\«`;çdß§áóÏC˚k:Ä÷ÊÈ)HÜÕÕSW$´√T5⁄âæ ≈++˙ÓAt˙˝ÕW«6^@¯nXØ•U{¥[òùy<º…ú¶Œ›ÓK/Æ⁄†∏‰PÊöÙ∫#8ﬁn8Ê¢ˆ¶¯5]›r|í≈‘¥ä∂å2ÒE⁄ú∑ÜΩ≈¢IIÒ/s˙≈ƒç‚¥O’úπ|Ωz£Eâ}Ωd÷rß{ΩuÓÑ~Ω&Õë∑D†Z.‡∞æz√(ùÆƒjFßdù&r¬¿Å-∂4˘3ú∫˘>\p_|xÿª^1†’BSCõô§⁄‹7s^ÆéXl'xÎ¨ÿÅ…ı\zèJÁ&∂T)zŸ∏ΩóÈAû!î<ŸÆt÷Ô`ﬁ≤40gËG8Ë∑Ô9ıZx`i.õ#(∫åF\ºj£÷`›Hæº©Û6±<]ZU./  √Ñ-œÔ'}7™◊†|x˝&»0 “§RÖ∆∞ ¡◊Á§ëy0b¡ñD<ráß‰>ú∏¸wåÖ ó¥4I¥»Tv0;u…?w√udﬁîˆÎ≥ïΩ~Èçù>¸'Ëœ∂bÿqıâ”P[gîıâ{ÑÓºpÜC∆’·j∫Ÿ®°.ΩÄÓ7À]ó°§ÚÖu,|ÜŸ´Kª˜X˜cZ9!˙Ü°ÂXº”Òí‡Äπø‰≥µ_Q$˜‹aµy=*Ó£]˙=e§ÏÃQ‡’P‹M‘o-6Jm÷’^0Ä∞Ì¬∆á>Œ/÷´!∂¨–‘,CD% Ê9=‹˛îÌ”)H1ı∞¡Ñä≈ÃN+§§¬¥¯âp-TÀxÏ€∆Dâ=ÈÖ.H$rò.O∏#«Î‹–$mm”A·¬k5M.q}‘J”Q–“¥!£?ûpñ
Jqó°e_i†®ª≠æCo…ˆ¬ï/Ò G¸òÂ.à- —À
¥πØ|¨€*©≤#±ÅRÄè„~Œé¶Ì7Èj';9úrﬂÊ6¶o¬ŸY≤ÖÍDR=£©mGûî\r8º§ﬁÈΩòåóæÅ„›KŒp<rÛ·T;C´Û†à{µãÇ–;C≥¨grO´‰¿uztˇ∏ßum tÏ¶z-.Ñ≥@÷r:9}>R/Î04bTé”VòE≥é≤8«∆?8CKù0t.[^DˇUk¶7´kD˘êº_&« áƒÑékM¨—Q¿¶Jrå€Ú¯$1≥bKÍ¸¿c-ë‡îéM∆hŒw»@
‡XÇçÄŒ/π5xK»˚«Z^¥úã@ï$- óù“∆d≠ı ÁN$UÂ√Y≥’UXµ_ÿ«˜Â∆∑…sg∫NˇrÉ‚®¨8“ ã±À—æ0ô-sX¯e˙Üz(»/P˜'ˇNR"\ˇ≤≥ﬁy„Vî∞¨3`É—Ü„Ïên
|∂∞¯ªíJõ∞±5≤˝"æ<
ÿ¥$fê“T>%Èö˛'s„Q;Âojúp≤‹¡c“÷ΩJ))ï'ìu;eÂ+pàÒÊ˙[˝≤™°2ù˘ñﬂw/≤x<t}{F	ç£Àt¸x5;|‘·ÎıN”G˙éÄÖ6ïê∂È†|„MyM≥MÌÖm£˘S¯JZÈ)&PØﬁ‚SÉ4çëäsÃ»ØÊ©∑∆ìhP7]µZ-KM3+∞úß=£ÓTÀ*≠qtp,Á¬‹u¢Ì.+êÛ
 ÕæºŒÇ˘û˙K˘	$
x:ä‡+FîLgÄÕÊ2Q	®ﬁ9%¢i!˙S/Ét5-ÇøÙ	•Mã%ØÙ≤È‚Ê 
Ø,óIÌ∞≥µ—…\ÊıS3ÈeÚ`v‰ò=ú«≈¡d‡å…aüË≥8ΩHùYáìÙ®HÕ?/‘Ó‘µI◊%’QH¨¨∂	ÜÆtbÕE¡ı–uå¥™Ô ˇ ê”~˜ÖÒ&i‚^~ZbÔÒ¿]‚‡ˇ£»;ÛÅŸ`•–"Ip5òéÇOzÄu‰D/©klKë/^%¨ñ9}3˝$ß¬Å(Ú=frD]\[˘4÷ÿÈìÖ|áÆÓœ®\)	cí“Í)€IÍ!ºmMÍÁ+.(›xù.Ûﬁ—BπR^ÇRˆ|L<J‰ áÿ;≥≥Q"ŸcM!Üú@Ïñ´ìy,i©Ñæ´£≥?0$ñ(¯ıdÏ<4%A:ÇmÇK≥4æ©ƒæB.†COœ„§†n
Zt®Ø1¨Œ≤OC'ëXg√–¡[R:qQÇGÚ^A$©"Õ¶U2—ÍÃY£Lè≈˝ÕÃ5”ÂZ∂L≤dô¬ÀŸx¡EÀãñéH√Å{ÑïZ3p∆|◊ Ê{··üï‰{>~¸±â)’˙Y°º´%–1ø¨IâS“À±wí-ÆëÒƒS"Cl≈[y8G6 hmV¢íòQák‘«ÌÜ#ô„9/›ÑÎı|	§3Í@åv,pBc¶)ßid¿ëzY÷fﬂc4’º6I¬âÊ™®m*ò=FÒ6:[R7‘—yA”ﬂÍç	√(≠ø$g]áoñ·zÆ<=è¶g·*-–cﬁLr¸œ§/$Ωê$ÈµŒ¸Jü&” Æ˙ÂˇQ,B‚¿â‚à*IèËüä‚ñVJÆV˚xáÉóÙ<Ä;CW…Ìø2eoÎ˘ßAç¸í‘>”ø£I-"9Îq}|ˇ>Æ5`¢3®cq≈ecód∞f”ìQœ≥”a£ıN/ïˆƒ2™∞“8Ss—k∏≈x)Us˛©Îéiz˘
®W‡„"ÑËkÏhzNTB‡AæñÛ‹æÈ©¢b-¿Tgÿƒ`œ% w_
r˜ÕÜC¸âsD˙)x4§ÇmıvÉa“)åa@ZUÍ…A}¢p ô‚Nêñ}¥'Ç)ñâØo/ZJΩ=3‘—
ht⁄à](·V∂ø‰@√¯ûû
g√†Îkç”ÆJfb	Tö¶÷ã68„%ÎÕí‚,5}m4æÊÌñë€‘ã”ó∆‚…ı*“|’∆p∞ûÀTK>´9Ø ã√g·0S/˝"U‘∂£‘Ωé<∫9(v^]7∞Ai-ÌŸP˜«≤+-ávÎ"lüíùƒæL¯·Ø’€Ëí/ì˘fæ–Ó≈Æ®ÖŒdXCÁ/ÇÎ§µ≥±≥µ‰L¨·rÇò@øñq rã“©~≠›	R%m„yŸ÷`'…%Ÿ˛$Ïr˜Oz∑RWÏ3˚]›F≥ò™ÀólùÒòLñª6˘*m≠E$˘Fm≠≈è#›G™É®8ÜT^-‰˘¢ıØ…nÉ§á®Ñ)«RSÜ%◊¥Ÿ}Æ•I≥åÍ´_dP—ÅΩ…% ˝≠I‚§£µDÊ¥!&p†'µÇ1Èèi˙8i8nÇIlàôaÇ≈baaÆ!√qÜ,µ€mn'ùÒ¯9ebíÎDÅ1¶+ º´…Çñ‘ãIäÃ˝OdØQ“∆ à59vk¨Vg“˜Çı¯"kW√æ>u„ÚpìÕ∏H.%_6ﬂ7¥0ò\@¡i@QNä]¡oF£ﬁä»ÒE´,0øQœC;Ç L˜BRtæd—3«Ûw©ëT¸Sx)ıè=∑†∏èTBTH⁄¡ŒÏ_≈ã§ˆ“ÁÓÀ∞*Z/å !|∑ˆc˘À)µ∆Û{ó»K˛}b;ÎÎKÛ≠˘•6|F„}„«à$ÎK•⁄x∞Ù»‘˘ò¥[sK¨©Õ•{Úå≈HÅ6Äò3TF;oÔi˛¡\Î¡Çm¥ã•⁄XòdjCÌ‚=}Ω)¨`å±*z†âÁúÏKµ°v{Œ<§Emç#x«÷'ù∫≠à⁄L0÷ã$˝)mî+∂Û€√Ä8,ÆB¿"G¡ı˛"Íã€f¥˘CRàÑp∂ Ù=π˝T©é%ç(°\gnº_pª≤ö[}î⁄ÎåÀ`‹È¯)‚˜ˇtËFÔc4POq¨Fôohˇ6ô∫!âí ·Y‹√ƒœ©ÇQ:è9-Áù'4R$óÉ(£lå(ˇ¨ˆ/Y“k=öDA->¬ÙhL,XæÓÙÊX1≤2LyÃSΩﬁÕt±∑ ≥•˘F∑4]ö≠Òπ€ü8a?∏£YßΩiØÅãÂñlP≥éÇ≤°sÍ∏(ﬁ"òDõw•§≥7§d%nJûHªX@I„π£§Ì÷”¨ãI_üˇb‚—úØw≥|¥œ {«x;;;∆4°œ{~Ô˘9}¿†‹—ºiøïÁùåÒvß>p˝–Íùû{:»€òºKìmc:œ[ﬁÖ¥·õÏBiŒAÕÛ/âˆmƒsê>á2°wvWõî©ÚÇ±¡N±\|*«ÙN6„Fi¸	Û≈8pO5c◊î3ÇSTËÚ`}¿:Ú“\Aü*4∑0®3¥6&2&‹+VLÛ9i˙iÒ÷4öÙ≥È´¢Ω¶Âä…TG÷©@R-{3U˝ÖöxÇ_(1ïc`¢·¥Î©:ŒiY∑b1å-E∆¯£Z‡–çÎÊ°0§Î“ıÎ"“)^PW¨èy»	`-‹Á›∂NTÕ%K[3⁄qÌ√XñZL¬L]◊ëœ–k8∂…S1OÍÑ§MùÕ∫¯BSrÅÑE}ôàÎ°-È{!4≈âH]˛{Ü&gH⁄¸uRôﬁŒGnπtÏ∏ä-Ìèç_6–º+“$S‚†nh∆ R´⁄Öä†ê¿Èx ˙>«®ôATS)SÊ^Å÷⁄?ÿ˚…Ê—÷·Q'Ω7⁄6≥Î|Ö“•07€k”Y∑§¶§r‘g1.Í™—Œã∏Œ≠ƒeEÎ8(‚h√`Û)#LÍc)Q”0 ≠4 Â¡ Ílo‘fåãK4¨∞	{ïhPS˚îÓå˙°;B2Ñ›∏byjT—¢1â'¨óöbh.‹åù(¯¨MØ›¸
„6∑¸‡ºÆ4·’Ë•T˙ˆÎØ˛Ÿ^d;à]“âCØ;y˝ª>’ﬁD¢Á˚Ü&∏bŸ#C¨\#¿©\◊0*'Íî}˜ÁÔ§çS+OÏ óÍ•Îq]k©¡oã.(,∑RWÙbÇÉgÜMxFzF\ÌãÎ˘¢@Ω*»πLë∞N.#››ÒÎ÷#iˆk∫ÕûTr≈:ËÈ˝ÀÂt¿ ä˘0‡Y¸∑5F#›ﬁUÉôı~#ÁÜCúl1}#Æ‚ı'ábCÌpÜ<îØ>$”ñÜr8WÊ¯=^Êõr°'Ää‰±Ìùûb‹CÓF«©—0Rá÷¿ﬂÜØ≤[ûÍú6ìıcSÏMjgxJMB–søˆ∏Œ^îu»€Ûqp…-ã<b%†øRá}7Wír|Y/†⁄irgƒ∆PXâuê÷bøßı™ÀCAÕ‹ÅËySô‚pVËë–Î6&ù∞I¨3!yıºháÚ1{·¶K•„©:îï(y·ºR©D,J@!v¨«FQ9I∆÷2”m®Ljá˙ ;dËùπãﬂŒª∞ö≥)úÍ4håˇAZ€wS!”¯"ä/aA0÷!5√$µπ≠•ÒE¬¨eåò•1±#,"}Ùé`ßOhl·ÔÈœZì≈ƒõnü®„∏gMÖÊjÙÜkﬂÈá ü¨Ñmâπ2Uªb˜em∆tÎ-±÷Zt˚ïÌ‡ÃÛY∏≠tÙ∫gıJ≤ÓH-òÌ˚ ˇN?u«ÊVØT{é¥ÄÍ∞ç(ø;â≠hÊUZZ–∞z%ˇíÀlÌ‚G¯GyÀ#4–O¸ÔÙ{÷øı*˚NîÁ}ô1Ä$ blhˇO›K¥ÖweŸ N;#∑úLjY-“»xÊ√àv@\ÂßZ˛ê8ˇ…äs)ù"—Â_k%ﬂ@b8>Q(ÒâOcD€›¬`ë)ŒvÜC(FÌ&X§®oòÑvÙ¨©6RâYVjx,	ƒJΩT≤e∆T)5∂€_ﬂ/.ÙÈÊ¡ÊÓ˙Vß∏‰Áœ:€[ùçÕöAIïn
~ı∆ Ò¢}˛&“¬´yÖ0í/ $ê‹fZû6ƒ®ìM∏Âu¬’V¨Zô¯'∂∫Q∫˜E@2˛ß—‚TÍôø•4Kf&aïBWûÑ¡9 ˛ Xz7J€¸0—É&k∂9ßòö«›ëSBÍY7X"<≥‘S´œâî‘ˆ≈˙@Îf„÷A{¢à ÖÎΩT¬Yõî∞Hj∆sg¬ø_“PÊô ◊Û<SH4"<¬dì∆}âh4s%¥Ò3gj=˙7›gŸt)öl˝“Ω\euQf÷> ·6’˛iàÈä4+®íÔ¯Évª;∑xz2ª`
¡âπPxVL‰ù‰#—n&é[£öÙ'!ïi¨[)9Jxè4—◊∞…`∫DN˙2≠5Øß¯. Âb˚©•à3eb1ÊW§^\i(g9|1[¥Qs$kú˝€ØˇÊoxúvéÃÆ0D’Õ›êWçók(0•(MïƒÜÊLÅ_Õ)%ìxØÇecªä†Á4@í∏/”ãijﬂ¸˙o4G[5«ZÕ¶Öë◊úÕcs e„™ékö®$∑˘ÜY\©~ïàˇzbCêuëƒRŸßñÿ„"G“%&[( §d 'îŸ@ ÄH” æ¿B“æÇF–|bõè'¿ˆ◊õw'ËDÃ∑ﬁAóJËç´˛∏80Pä‡ú°Œò(Åzu˜—2>‡ËúP∆D‘I´ÑÏu™’BØ∞Ñ≈ƒ™¿wû– «ÂÄú@©†ÎÈiîç‡i#:€õG≤±GûnlÌl.õ¶umÇ¥ôJhµQ|ÊÜáó~ÔÛâ;·˙òú”%…öE°ÄR‹„åo ôG‡¥”\ÕÇê∂ì‘)çÂ'úûR|Á—⁄»€¨Ô·#îtC8ÚÆh˚2K≤î‡Mn>&ªŒ´Æ£¶2_ ùB'y*RF…ÙÄHéÀ‹L•iyAÙ“‰…ôSzæ]#T¥]Ω∫‚_YŸuq°û·«!†\xπû$ﬁÂm˝®A>&?ZlˇhFDk(_ï\_?ŒŸJÂRñ]e˙g˙™¿N’æ%üXíı kŸ4˜ﬁËåDaoUo_¥qçtgµ¢vPìG=h>$A˜Áòh£áV û/≤œÕ”¨«z ôYŒˆæºØ/2∞=Ã∆OñRZ«i‡üå∫kÛπm˘®Õf ÃeFùdöÁAÿÂåÚ7õGˆ8œ‚Er1πµ≥ˇ˙?lÌeÚå≠ÃÊ2Û0ÁÛi∑ÑÓËD ¡∞(˙∞tŒjZ~Ç'ú1pvŸ¡Fóò&qWπ3F\Í√ƒ˚.Ÿ«[jLlòÅÅåÎºDˆEπùG¢—2Kà,r5¡˙góÊ—I@±êIõWpîËëÉıiQˆïCR0’5R;t<ÙΩƒ‰HY∏ûCÍõQØQÉ-U€ÙaB‚éîœî{x˙˙7›–Î9ç¸Jâx.µhÜ¸d˚K‡6hÉË3<K6ZÓìºÃ-*ßê‰gOâª*wâg∂π_Ír‘sÜ ¢e“ﬂh{Âûò˙≤¨Ïx¿ü†∫îÁ;xÄdñde«π»~»†∞æ·∏†∏Ê±ã#cz'”Æ“ÒÂ ˆ°ÚaH$Eãí€»$	\)ÅiMâ¡l≤ñ97∏àÅoÊ° #Ë¬M–S≥R6§*Œ*¨|ä¡YQÏˆ0”$÷	ë˘´≤
√Ñı9¬’3=3PìŒxln∆å˙qZÑ⁄$æ“Ô‡ÆI˝Jø_ªnhàj@^ΩgËíu≤hÊû/Ω∏^#µ∆q˚dz—@sÀ5Ê«R“±Œa+ï+„kÅX∏=U≈h“√OTÇÁ∆Å≤Û≤Pºˇr‘œœèI”G)"¿?k$m]C©d˛x®œ˘¶rc#œoX‰DŸIı≈∞ìºZ°’Hõ$}©ÅfÏƒÉ’⁄¨æe]v9∂zµÚÖ;§qç%Zï—È63r–Y:Ø¡¯*cÌg÷Ôã«\z{s£*ï.Ø^‰ó5‹‰WÄ“ùÉÉÕO1M√x0ò@û ùÊ† Àˆ4À”–'P∂ØCˆúÕÁ¸ogAﬁ(Ä´Æˆ$Ω{…[ïÉ§‘˚•ôniÚÎà+C<]Ø†lÆ)&k†aFì`∆ç;XÙ)SF∞7vô0∞‘`Y¡£·	Âx`LO[48/˝¸Åµ˙+_©6	∑¿qÒÎGv:m—vmâCWËgÁ-…uEf1•/S—X˘ŒÔïÚ∏o4Ëæ€Ìím¡‡Ñ¿ˆ“Dïoa ,Ω–Ô˜KèB‘j‹⁄æª∞˙~aaZ#ÕjG}¯F∞|µ	∆Ú∆Õt+„íMÅg„a‡–plŒ∫Ô…6øcÊÉáŒ„<6Yë?f∂C"ã∑E8‡õÃÁ£˙·´≤Î≤‡‹ozüîüPo‡åùiv=ü—:≠ˇ«∑ÒoÇîÂŒÍ‰hú˛¥Nœ…Í§&{‘Í8WŒ1,Ê û®»¸ónÄoÉ0M±ÆõªáùÁõœ:”uá°)B,TÉˆ>≠º…Í~ÔÅ}¥w∞ª˜|}w˝˘[€€[ù›i‡MùÔõ=ø◊¡™Å¸ÎØ˚Ω/XÌ?"†∂π{∞ı˘≥ÕõA=	c0ÿ?„’ø˜pÁîÂ†Û¥≥π}¬¬„√LCWh’Ô=§∑v·hﬁ;∞±ãπ@NbŸ‰‰[ºÃ;ŒîWÜ€ìŒÓg{œ?∂µ≥µ>’—Gcﬂ4Eºùj˙Î~Œ™~Ô1tsÁIgªÛÈÊŒTRc‚ÖV¬âãYér#OµQM±q¯”O??¿Ù6´W…ü¶íﬂ’%`„Ÿzßºvogo˜ó¸9T<ÿ˙¥|≈√ΩÌçÚ„JªŸ<:Ëmmﬂï2#	ÛìC9˜yô7F9Û.<E¨°fË∆ËMê9CÌªGì¡™êvº√[?‡çﬂÑÜôåi'Í]É|…êmC{sµï˜&Ùÿ|æ›9‹<∏5’∆1≠^g+ﬂX–-©”±]Üä˙ﬁ l#‡r!U¨".‘-™âÕŒ"&ÑŒösΩìÁ¬÷.U!OCAy“< äº˙90œÖÅ≥≥„  g¢Œîø3/∆¡&H]áõp"Óm÷¶±cŒE†Ï~\U¿=êÎﬁGõ∑ÇÔ“ÃDV>E¶F1›Œ*g<yéØŸ°•Fô6ì—ﬁ≠E“TöÂiBoúK÷˜ﬂûöö)fzÜ6ºA≥7Ù†I∑™é˙SZ{ùW˛ÆIèvˆ@/S†FÈ™ä$Eñ06É†§O,f1+¥‰Õ∏ûí∆2oUûb]N=ﬂÒ{ÆÊJÅOìRwDæ‘¨=ò¿C˛jL'e≥p9£È:=ß’ª}∑ÔÇ∏ë)´C~ö˚∫hÇë3ã¨E±‘õ4]ô’ÕäWf—¿Y3âfnÜÑãßËL†òD≥œïgGi¡˛ CèóWòGΩºh=ùq‰ˆó·áTÉø’›
}Gvn∫zëxür'öX¸A}óÊ€Ì7\áZ¢ìqóEòH\-π{√q˚ys~|Ò˝Süág]ßﬁû°ˇkµó'©e77‡Œx·ïqnk@—õ˙∆≤@ËÀ¬Ω≥–7ãΩº~°˘ƒ!E3dñl^åò»uº"O®Åª≤teº∂íAZù∂Ã”`#B≤„˙§¶P¿=cI2Ëú–wà°ZiÊπµå∆N/Ú<∑Æ^®ÜÒy˛‘‹ùJÚÜ—÷$Y·ûÍÛÚaˆ‰0M‘@–qa—\faΩò‚¿MÄr†ı>GK˛b^∏DﬂäÀ47ß«º`GﬁÂ“Ïâπ/>‰›2üÅπ$¥ëÙ ~*ù&%Ù>˘î7è1#Ndu+Î˜U¯œ∆íÜÓå…'ˇ í=CÕ2—ÓÜ‰f€Œ∂úL⁄‘pë„⁄’˚Êæ7∏2≤G˚(∆Hjê 6(@©t“sõ~p:„Ï.«GÏõå§úO€; ¢ns6•NnÇ‹√ùΩÒxÓ∞ﬂa	¡ÿ∫/f◊ùÜpX¢´ÆØÚ–È∫√’⁄>ãüÄ1'‘û<Qp‰JóÖi+ºZÈ–9V·»*≤¸Â•âr|xôZfNøäΩì©¨3ƒà)~?tLLß¿°ÙÊk˛∫(•ãk*VqÀ˝;\ÅÃ™Â.õƒªﬁ˙“Uƒw;ÕÁæÅT'<ÙŒ|f¨~jiÆxÿˆª-»ÿmß√È©7K¡ïWﬁÂë£'N∏>p¬xæÃÍÏæá1±ß_…áÈ∂÷ÁçAº⁄¬ﬂ`}Ïé]|ëÄ›w'Ïc<ﬁ2EıèØüm≤“bÈöÆR+VMŸññEáˆïÅ…∫±ùJ aûMwÖ∏Â≤)˝Ã‘”äMNÄ5ãi…ë≈ UúpryÁ˜|û≤≤ÚÕ-¶^ˇ›ÒÅ €–WßÑ1∆cœ?[w¬R4nﬂ‘Z%¨>-wèïwv¥X‹vƒ&w.KœMS;y¿~ó7yæóN∆ê√ä8¬Ö≈b÷`Y|‰µ…qÑ)øL¯®KÖ
≠uKÀ≈™˚úEÓôMŸjÙr£Ôø˛-A≥πX}“+ïhá‰§ÚŒjè®2‚‘Œ?yƒ Ó¯√—‚©7tè0±y	äµæ˛-oçlg—≠“b3„£[[ÁrÀqàë1j≥35\Œ^NG%øÂ©¶
˘N‹ÑËyQË{_,Í.+[ç˜∆ûoIÀUhL[—h∑äÂÌ≠Û6ÀYæzõÂ≈ó•¯∑4à‡Ù;S2°|KÀ˚ñ˜êiëÏv•πõÃºL7•ùi∂Ú∑£cñmß[ödU˜äŸFíØ¡æüª·$î⁄,¶∂*íA≈◊Ûm-áÍ≥ZN˚ØÂØ∂êe«Q¶oz˝TO”¶®y‚âÚEŒqû√}ìóo!Aª™î.iSh)‰+yŒƒ‚&ƒç0Vtô„õ#ıÕ∆ê>Îp˚ñﬁ‚>\ç %∏ïNF˚êf˜ñ	[q=ùï+/)ı£%_òZõrU•‰ÈoyYUÂ)◊UöŒù,¨Õz ï˝Ãÿ‹4ßî Aoıê‘≤¸%˚∂é®t%zŒP…ê¶>ü“¯”PIÂãQ…±;›eˆKüÇ9á‘¡M©ƒè˚-°ªÍÉ>%Èí&°“®ÙC≈µ≤π∑O±L[∆¶*-íÍ/˛ñV ‡ı>Âr—ÈdèhúYAµ¨xk,ö¿ß‚ZÁz„K◊yYÓ4¢˛˘≥ˇ8˝ÇK	TﬂŒbké˜”…Æ“,™ﬁŸ\˜≈r•.éÃÕTZä¨7Ù[WÂ	áı,ç4ıÉònÂ%+ÙØÃ◊	OqÇÆ‚Øìi≤¢ÌèÏ°hÊJπBÊ€“‰∏ANkNÉ∫ù_®∆÷ˆ∆oÛö®*óîıÂáÆc¡rˆ6xáADpƒ”√.u∑|Á/⁄¶≤©¢ÂOÛæñ∫»cYm+≠Ω’πUÏùÅ€{πÓÖΩ°;ücøÏÅqÜ}LÛóc√¸ππ≥)-
õﬂkLIó~jÎBªÁré1®≈◊!a©˝aã‹∆˙2ˇ…Ô·Çﬁ∫·X%∑’<å1∫¨N{vng´¥˛i(áä≥∞∆Ä\˝^Í™ã¢5≠ﬁñÕ’be÷wí‰,+≥VüBVDÕ¶zEùüéÇ˝–Ûcòq“hΩ.e2Á˝œc√W.q¬–π$¡)a˛dΩ†ÔF 2∆f§*,Û6-ÑaÆ"ﬁÆ¶Hò~|BVI€ky˝∑.èIç÷≥F‰o,t∞Lˇíé6h%]!ó{H;®Z&ﬁeµ/z‚ƒΩ.∑}i√QÓà“by]&•¥¶éÕ•N¥∂0ﬂΩÙJI#û Ö15∑ÁGnÃíÊ–‹õ≥ü,ë/õ«è‡1ef÷ºØÀE“Ö ˝0C3ììaQj=tOcŸãÎa&1∫ça˛´«W/¥˜ÇyÜA$Îm¯'cêÔ	›QÀ§≥H∆AÇàˇÿPH”ôÁ/ì6πÔç∞ 0ÏŸrY´Øñ¯M:&ß;4˜ﬂ˜¢Ò–π\&4sµÊ?†M7π‚¿uMSó∫ËÉﬁÀ‹>9˜˙Ò`ôÃµ€?((IS,ï.=v˙ò˛≤ÜeaM(ùQW‘eÊÎWumŒîA≠i≈énp—°	bÉã[·¿≈lûÀd˛—'£Q	pW)èsjvC◊yŸtNaˇùû;óQXÂ.•ªÚ ÙÛ*@xân™‘H∞òö¸≤‘õπÔÖn]ìó1Wﬁd‰TJ»KA'u˘ÉÔΩ)∂ï Uwå5`.€ÀI∆≥Ç
¬ô$k”Ô4∂áz¿ìΩÕ˝6∑¯∞µTi«ï´ë`¡-\\A¨Ú‹¯Ç oõ‡ÉGãŒB˜·mÆHu·†ùæ7âäqıÓ∑&mÑÜ0.®yÊå∫ÖKg@ZêRB‡B˙ÕﬁXÃ§zkõn@ß´>)\è8óEAd¢äW,dX]TåÜw8¬—2˚Ÿ≤?´É<˝ÉFAÕ/Qˆv/pWñ‹ì∑âd …ü˘M åÜ1ˆ≥"Üï™%b¢‡ÚÃ√Ó;@Â`/,,Œ--›“I@9b:£í£bôe)_˚Iki\¥EhÒsæ
òJ4ø8œ;˚¡ú;ˇh°[àçqåº)ú§tã ù´∏1ùÁ;qx$ƒ˝l¬á”êˆ^∑ø‰ŒïB9 ·≈ÿqg¸◊ÒìUè™w˝ÏY®|ˆ®ø_`Fa*Ûﬁ” È2z©IƒÁôøäPK¯ßíw^®ÅÙD∫î˚·~˛’‡$IOÌ˘‰À ¡øÕGK∞ª‹MNgh )>˚˘åÊ˙%uEnd¢'Yfƒ4èD\ù4aÒ∏	ê˙ªÓApÔÇà?íÜfÁ€Dï“ì F49ÜFâö7Ü≠À(Jåi∆Õui˛ …öNYÓ«öMr∞†È9 +t“∞8ÇäÈVFrÆh±Ñ1íkæJB6£±;§ÊÀJÍWdáHô1M=’Á"´_√ò=;ÆÁêß¡p‡–∏=Ù/≤ìıBßv≠G—N¶2;X∞NSœ -«R.r1*Ba¯”z‰LÌ ®`l]ˇ,–YÕYÎ¢⁄Ì»ö[¬¨‡∫∫J~ñ…ã≠^GØˇ{@‹A-Ù2±¥∆«uMòÉr=jº0y2`öS∏≥oÑRº ó°:íä&áÓê⁄àhj&BPÆªî<,µ	F	ÑhU¶DÁJ“§√n`qﬂ¨®fÂñ>ÒÂ…-déÛçO6¡˚æ≤cÍl∑d¸Y”GèÖ1ÏÄ‚—xvR6”n?ûõ£{"	Œ¶«c3/›ú)N[˙X∑{N¿÷IJ4ü“~6]XB•ãGD˝bã∏®f∞g-iA÷öª±G∑ñ>vÒÌ◊_˝9I)öuøe„É)ﬂÔ´òˇNcù¿V˝Q∆©ÀN±ãPÆ¬e—mO∫e™˚∞TVT”œj2‘j	©í∏ûsKú\wù»ï‚¸ Œ ûΩI¥Lb‘Õ4©öT≈GÛålÀÒÕØˇ÷];Ï-á®mA‹qÄÖ^g¢©ˆBå8Ü\'æCÀ≠∞kúpÎó,8*∆2•ÃíûíÚ∞ÊÉá√.nÈˆ#G x¬?ÊÛ˚7¬«ÎØ÷2◊Pf–´ú=]Ú±É\&A!eƒÉΩ™≤	”h@yÌzêòEsoTh¬∏\¬Ø°à_õA-¡!W‘R-Aç\õ¶m·e◊€ DÈΩ5ÃßªeU´§é7›|ÁàÏ‹Ü®Ö†8<¶ÌD–HøÀÆv£÷©747•(O=¿ÊsÈ†|ÈçƒW¢|°oÆ
Rp<âò∑√zgw}sMJf¨µ&1ô=ﬁ)©KïŸÔv#@‰‡  Ç}2π”±ëƒ¸iÚªx$™?6tÅ\ß^!%ÜKÕÅ®a´$3ﬁÎ˛jùz~~ 3=ö÷E´3∆ˇYß…⁄ÒäÏß0Ím¥A¡1π±h|õ¶ü§¯P≈bl]Dç54¢F¸gèlà∂ìëKéZ-°sédÈ0Â^Ä@ı]|èz£zCÈ‘◊>d:◊kÇK‚8ÊjQ≤*ç´5¬WıŸÛ≥Ë£„üˇ¨~≤’÷ˇ∏1[∞<Ùr(AP •ûÈp-3Ü„πdîj]Ù†ûüBP6O§•∆Mü¸¨A7ø˘’Wﬂ¸ÍoËèŸÏëCÆv ∞7òªe∏Õ¶l›û µxïª&M`RïY Ä“i‰àÔÀƒ^≠pG=gx<ÿOÿ3÷.ÃJ+(ò®æÆ≠ÔÌ<ﬂ}jE6<P“bø÷÷1Ã|ÉÄCøë:4Cvü6¨Ì !”f@C{l“ﬁm˙bÍ˚–’˙ÜF¶È{gs´Û|w#eUÈû uRˇµÇu;ó™á‚∫µü„d’xq‡Ô˙î¡ù!˙ß#7E'9Áå8 û"õ}vPÙÁ¿¸÷kÄ–Ÿ¿{ TˆÙ›Sg2å˜•°‰’´Ω˛yÖÊödñÏ;˝#¢¿¯ÛónüZ…π¸ÑfëY¸µòaΩõÀ∞‘˘·æ’«Aí„ìF+ÇÌüÀy˝BH>êã⁄£mûÛU¯ÏNF]ò (ˇy¥Mê≈√-E}˛ì’œ„K0é{j¿®UóxõúF¨ü
ôÃ·íª5|–c“ŒU≤*ï
 «;)&ë.=®›ÑOxÅ
VT◊vê◊/Ú∂mém)8ïÚJ¬1πã˙€Wûﬂõù~·∂†àÁV/ò¯Òæ¢ §Ã)–◊™ Ûçz8Õåƒ≥fm"wV:°–Fúètéü9—¡ÊQô©XIeFÚ∏˘wiPÏM§c†Ì√œ„K∫√UÜ D9æMF3ÑI	'˘DÜkp‚¯1ÜèåjÁÏ§ˆî;)öti?O‹” tÿÕ√óGiïXª®†€Ú?eÑòjÎZ(‘Î≠Ó	”¸Ä~‹ÍÁ9¸<Ωûõ≥º((N|’î=∑4∫R€Ë¥^Å.èOjMÍñ%y;o⁄ˆ…pŸ+oë…Gl≤∂FÆg†P2äΩ◊±Â¥ÎyMÙ·á?4ø/"üu6}dlÆá˚\;Ø≈eÑdÒ¶÷Ll:À ö@
Zı"î2°9´⁄ÿ⁄Ä—Œ]~¨*.ˆºt/WØ§√”Æ_'ZZì\‹e3*8Ç÷ÿ‰≤f0®Ô£jøT∂êØÛ¶ßîŸ3—‚≠:ª«ÀiÍöhi°‘ã6Ã»$›≈%yM´'ÓËô-ÖM«gU¨„ì(˘–≤‰	öölqìñµiA}ü·≠YŸ«û<∂éÊ‰
1˝/∞S‰	µ©∑]b≤ß ≥Èò Ÿ2†ñ@.öD©<ÍäX]™BáﬂÌ÷R>Œ\g2Â.H>S\Ú
∆Tƒ\cÿ åôq…vp2”C(Ù,b∑ñÉ°›#öèg≠≈ø q’æ%ü®Üsù±Zcˇl%óI>EóÃJx Øµé€'®ßçˇrõóÑ#≈:‰”ÓrÓÚƒ#aP∫ËÁÕπ6‡ÇÓœ›^LmòÇoNäÁÕO†Ã'∂"≈];√=ÁŒ≤IÕâñ’«b‚í>y∆.R©¡|aôJ§X<) ”Î'a=3<K”P)F5Eì∆Áöﬂb°ÔîLÂ®yS/K…¥ w…d<ÜÉÜëªıÿS7 cºBRÍÓÚbµ√g≤πÉë:%0dev0_b=—ZÂNVÙ¯—¯‚DJ'ÜV≤¢‘
¶ôK¬ (Ω'O*]Œsöèëy^çb§∑olŸ Ì,•Z™÷È°·ÕæáhËêù◊øÂzQ©eµ€…•
wsô"⁄…¡è≠Ò™•™2VÈ8≈Ï–R{
<YS{(>äOÖ=P+5SúÀX@™úób–»â∑Ln¨®È˘Ùùbh!j#&7ÜÎª‰ßÆﬂwH]:èT#@éd%hµ	Ot+ƒ§<c	ˆ è˜Ã˜N=Ä*m]≥n˘ßŸw|wXÇ◊Sn∫Õ¸ÒÏ£∂lo£ﬂ&w¯KÌŸO⁄ #°vÛR¸ëÊíÃŒÂ 8'sÀ‰O›K≤„b∫Åÿ)òBvg°◊'¯‰€#Ê«õ˛\√∫®:æLO,d¬¥
è·yæó–öàæ Ó’úŒ1”æ1Õ§∫s2Úü9ÆÂ3∫2µ/3:BvˇÂ©MÌ-Q‹R≥∂r5—(yçejY¶Ö˝©ÿ&á[ôYPVêÆ2Ì‚≠MK˝ë#‹Óˇ∑Çqëû¡5¡--}+ZˆTG™´Ù
D˛ÿÌwÚ4€È≥F|˜·‚÷≥-4h‚êû3t± øB©ç„ÊìÉ‹ÎÄÙÅ)7oõôzè„πœ~ËæÚ®5=∞!õ~∫g6”J¥wäÈa±<≈2¢ßDµ* ˜›!H·%biI¨7÷mE„°◊e-Ä¢“t9Ïlˆ=∆ø´ØòOÏ>-^ßª¡v]—°vòÒƒÔ¡ó“ËÆXo‹ΩàZä€û_&¬¯çl ÀÌ£õr‹s*«=üJ^¸›lKøﬁÛ‚ï7O∫Jf…ÅÛ%ûáAœsäÓfﬁ÷^zt√Ωd0ù{O≥Ô›h¥A¿∂gO·?O/©%G√wÌ
XÛäX˜Ì◊_˝'rï±~G	˘Ú √#xO ÂˆﬂıΩÖ÷ñ4_ä ˚ŒÀÆ¯éÏ©îîÛ •7§Âﬂ~˝◊ø'W©]Í{:~ó∏v GÒ~G0L£⁄ü‹òÔÊ¢b±/ûíK$¶ÍﬂB ëo·‚®1_\&¬Í("?$hH¯PÚ$ÑP∆Ã‚=ç/x6‹ç‚øc⁄ÃîºãÄ7ï{o—0}÷»ãoø˛ÀˇÛˇ˛Ô_äXZK◊? ıÊáW™Å^¢Uu°3‰äcLXúÁﬁemÜà?·ÌìÉÌπn\7Úba§œ2ÛIπﬁ˛A„ΩRÈé∂3¸QËu'ÒÎﬂÑ¨êÕwEπtªí…ïd´^r˚‘`˚¸W‹>á[; -îC≈ÖæÄúC˘–FÛÓFÔˆíÊ@˛òånÒoT§‹˙ıjN…ö˜›¶Åd´G¿ÑEä?GÆA+ö[$w‹›ts?ﬂñØÌob	IcMLDû5èﬁï Ê„Ía Å1ÏÛF+≈{´†âÎ‘J∑¿T§„ÅÎÙKêà8,±od@)·4X:üß¥„V>óÄN∫qœesÆú	ôù6kA  ô‹≤ßç†€œ≥K¥M∫‡Û¢Ò`X†q‘p›ÛÊÉrïê i6º¡°óÍ˙Îﬂ£ éNçËöXBSFáNæÑo∫ã#gÙ¶ª¯©Ûfg!#gŸ’˛<Œ˜<‚√y≥®IR∆≤„ﬁ›◊ø–:-n}''p»ùÄnmP*,ÊyJù5+q7Ë_ ‚æ’ÍnˆA±t\êÏ®«rçÑ˝-ˇS|;Chx‰áΩÙQ\˜∞Åå˚^)¯g|¸íqgø|Øbˆ‰8ÍF?oÓg_Ó¥M'òÿ§ó™(MÑ›kÌ3Û›
mº‡§ürTs˝¢⁄¨y¿eBΩºàÚí˘1l¬¥.≠z}BJãŒv78”pã¸7”GÇÀ4.ùÈ≥fl™dÂeÆ&üOˆ•åﬂg˙®~∑ØIcÆ;hâ∆›Âß◊ãıJî±µ_Ã*≤G"tÓ+◊_ñMé€öd]Nx-w‡Ù ¢…TﬁÏ)sÜïnNÂÅ5˝É)¡•≥ß,ú–Pñû‰c2W∂q8ÓJ»UºÏwp!å üGo˙ñà√âFjù
ñ%ÉÙπGEŸ±ó◊≠)]îºd=|◊®Ú>fHÛ 	ÌˆΩ…Ë êLôiﬁz[V∆8í=Ôó¢‡ôn)0⁄˙˚ïHû∑∏Øú–£¶@Ôó#yºÜâ95 îÏ≈ﬂË:eπﬂk2~˝€ÔÌjM¡RE◊èª#œdÇÒFWãä"ˆ€Ÿ
–…ﬁ„V®¨›¯ñØz]" {˛ÿ–…h˙˚FqI»¿Ô—I/Y®mƒßÑÜ¨xx–*$ã’ñßAó–FVµ!¡®QeÙ¥%Aá∆Ã>’K∫˘$—Ühêd=≥ô‘'%Ã§“Ù1·”!HO´WKJÆx±OÁÂ≠gΩ•ìÜªP°ˇT˚MûÑì8X~3‘Œ4Øπ,GA•Vfr•Ñ‘£¨@QP∆©ß#ñlæx…ncfÊ8eÔ	°^≤!,±ÔÖâ‹ÇeÁﬂ˘˛ÆÄ,©qö≈~Æqóõºˆ¯˜ñîj´¿ö•ç	ﬂo´¸í ∂íå^íLy,:ü&=Êõ◊=‚¶Öeosãˆ‹|≈3ïŸ—à‡rb7™aØvÿ—ìˆ)Üxá!¶Ü§w≥#Áè›LÆ∫™⁄„w‚Œ.q©iíVûπà-˙ûÜË%K—êï¬(|E|πúPÚ∫r*äUB%[©ñÏâº‰ß,ï.´|êàhıÎ€7Cjoı∆óQ„$ÏL9"\ÈÔû OM~+Õ™*˙Ãﬂ˙LM∆omnù“ﬂÄŒOIÂÀ“¯≤hQéæó—.Îç†Z©ópòÍ≥EMvm±ß¡¨/÷∞ﬂˆa‹∆úLóöÂ°qµã”2∂±∂Qö9;+Â	]&ÃVè%$#ääc«É?ÉS{àRgë–X‹‰‹ã$r√„N≤—º)fÉ(ëÜY‰éOéO»*9∂§ˇ:BÃ˜
µˇ¨X ¬“q`âèW…º™¥˜÷xÍÊÜ¢°◊sÎﬁ∂UÉ"_3÷	]#¸sÜå∑´I_íÎJB≠•^–Lˆ^±∆ÚŒ{âHJQ”i{-@c‚∂†d_∑G7«AÒΩG]Œ} 1§û∂6≤jﬂyW:2#è€'»Ï‰Itl:6…à™?ˆ0Â";3wfÄY?˚ ∞ØBc—‚§ë=ú9GFë/åjJ≥/r»ÂR/›¿'	kÁ·’™≠¢mb›S7mJ)SkIîã˘ÏY®¸y`_ÛIÛ7ø˛∑§©¸o{k˜≥9‹<8ÿ⁄˛¨≥—!õd}Ô‡hì‘11y∫ØZ%h&ó∏Á€yÇ]Qúõ;)∏J0bÍ‹â›œ∞H.—ÒÿñÚ`1Ic0˚†]bôµºÖ[@¬Çœ˛Jfcπ˛ö0@^Ø é…°{6A|‚’%}~·˘≤ÌΩ
iP#ˆÛ+¿/íók¨‡@∑29ıÃƒˇ∫Q746EJ›ß¿« †Pªñ¯,ô®ºg¬j3Õ|±ò^2Á`øIôÍÊ‡œóÕ6œúaÉ≈ñPóºñTÛ¬„√ Yúf"\UMŒNΩWø˙s≤Ì\¿kÏ≈ﬁ»˚q√I©ó†Ëƒq	æbÜ/´3Î2mˆØD≥P\â˘åM‘Á§&Q3◊îbj8˜båI5˙Advxµì£íy%»hH];-@|gíeã√g.s¯dÈ–L•+öYÚ'I∂mÅÚs,ŸÄ%áª à’íg?u{«¨*»]~€ œœ§<ÓüyÒ=3jLaÕ1…‰ç<&ô<^%s˘©âyíRÊbl+'co⁄@@Û¸ ôçã~J$~6ß~. ˘<M÷gûéPNÍÂ\˚â4Ò+É)çdj»ed“ubôïãùsÑçÂìÕ6oŒ\¢ö_°ÃgÕñ\8∑¢=Òp:cöƒVû≥
É‹ˆoê‰7ø›Ç¿¯ÓQD©ÇMJd≤†¢`/¨ë<ﬂ¡á4¢πîH8m#'{0{ñıVr}ÕÆâ;6ÒfdlöÛÜ≥ç të
Î∑!54N¯R(eúàÂí^ﬂÛ…∆ìEâÍ•úòPˇŸ∏gπ)cΩ†å∆Œ<ø7ú¿ª∫D8m⁄m‡Iß•G,∆<°’˙‚Kbn≠•‹X›F-jºŒsY-
|ˆsmÛ.z—>_è52áâ≠È∏∂®X‹jµÇbΩm2Äe!„W‡¯”âói˘ñú◊ÚÛ&’ËÃóU∞|LÊäj_Á√‰∫ fÄrlIôwrùØon≠©6õ7¬,mıZkñŒˆYÏ#ÃÌ>p˝z˝äÅ`sËb‹¬'ó[}x*ÈUÍ5˙ÜˆT» !Ëﬂ]¬úyŸ!eM®2Íã	£.eÎIYn|ı»]|p"ﬂqÊÛÓ)on◊i\;WaÍˆó∏Øqrvnâ∞<QÀ<€m>≤#€ÿ≈∂†ê,WØÊÆ…Ïc≤5∏èºêÏo<ˆO xM∆î‡Áb4áR)ª∑µe ì&ÚUÖ/3Ø$Ã`∫
˛u˚_t@¶Fx8dÓ+¯#d)Õ…ÜÁÉ3ÁL–w‰|AW— 8á™Ï˝()±2¨wAO$!õmƒ-™Ôú}xˇˆ√`o&!.˘óÕ„GúÎ£∆ÕEEÙÕË U…óp÷∞–§äJ_£˝fïµ›âÚrHFŒEì‚#[$¥±i¸"µÖ0 ÑY—˙Pf˝‘¶(#[KÛq∫Q0ú¿ÊãTı–[N¯óéáŒh1ëî•ù™Ì3åÒ¶Ëyì}û %›æÍ.À`‡ø‚˚iæ}≠gDL±\}]RÀ°áJå']¨•âS©[‚r6%Ón'º\^ã?‚¥ÌG@3s1Í∂ jèø˝˙´2ÎmVô*Ä0VE®…äŒlŒh∆vßíŒ3Zˆ]=±2;X0R ı›83»ãH√ë´ëw-Ö∞>"6óƒ"„n†±â:<ù¢∑ÓÑ.¶Ÿ¯‡'Ã¡]’HF'∂$'œ«–/ÈPkπ#‰hªN¬?¿≈˚Œ+˜gã¿J‹Ñ!	n$|˝õ1r˚cwê◊øÎa∫I?Äv&òòy *ø
Zú∆îÆºhÀﬂ:QtÃÍ˙ Wg‘ƒ|ƒB–˝ò™’Uj√K∂”†
¸≥∑i<Él≤*ë?93‡GgÀPÃËmŸE¯A£rÒõø˚{∏y·ˆ&±„˜i–“Õæ√Ê¬@ÅnªYÛõ¬selÍc⁄ä‹≥	†◊øuf“•w#Ÿ/&Ä Äx®‡ŒH£c—â»/&tTÓÖ◊•¢YﬂEm:~ûå@Ç¿ïÕÜ¢àPrpàÃºgº»E∞Û
˛Ît· úáY)‘O‡?xÂ¿'oÆi∫*7ÅULaïµ 2∆™_‘Œìs¶ﬁ
∆¿òÚøEî˙÷ tOA}G∞ˇ“úåW¬#~‚∆ÇïcGH0vz^|	à.ÁXÀráh¨É˘%/§=ÉldrÍ4Å%—è≠Qlˆ?M‰)ŒhsÎSôñM–ÈÜ2≤ãK€Å•˝Ê/˛ãaÕ¸ùÅ_Cu^ﬂ=uApÍÔá¡hó =YR±`¢DAΩ§1Óx¿.ÿq∏ÕªAå;∞Ÿª‡T›ÛΩût]€å>û
›”3‚ˆ›â.˝…Sì;ÁéìPÇ°Àπ[Z∑níÃLòÒ≤Ô7Õ¸]lŒÀé˙∫DÖg÷Bõ8>ÏáÿÖ&~œx[róõãf»k˝O~d»Ïè¿§õn68„˜ÀÔLrX*8⁄_j>ŸÕ'ªŒmï>⁄ÛNu88Ìù∆nóG∆á	â∞◊ˇŸÂ…ñΩ˝r\≥á”7mı*¿\ã*—Å©	.qSxá±783Xg<üâΩ4ÇR¢‹ˇ(Á;åÔöTŸ√”: áŒ©zçÒÛ-r ÎL!∆®®¥gËˆº‹°≥)÷:}¬^x˝˜¿iØPŸÚa‚^Pª5H|Ûﬂ˛ñ‚fì]hâ£Œ Ï§√*˜¢…ò√€]/ÊgLÊ‘?K«≤ÁﬂÓ^ó∏¯7∫€mûE∞eÇîíÓ8˛ƒ¢§Êﬁ¬NM˘hq"m‘ã√◊ˇÑÊÁ˘É  E&√%2¿M7 #,)JÊå≤ñ@,Âb$¥&e⁄P6-pœ4L[*=%õ’M-~Ó–˙o~˝y6"5ÓL\‰m“=¥¥°ªîã·îÙ„◊ˇ‡ª‘'ÈÔOª{e"¶}W~ÚÇ+≥O¬‡xLÄ¬Ø¿…]ﬂ˚ˇ   ˇˇ ÉtˆU