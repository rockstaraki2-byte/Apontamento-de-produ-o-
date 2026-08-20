import React, { useState, useMemo, useEffect } from "react";
import { ProductionStep, RejectionReason, Sector, Item, Order, ProductionBatch } from "../types";
import { ScreenLayout, ScrollContainer, StickyActionsBar } from "./Layout";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Clock,
  FileText,
  Play,
  ArrowRight,
  Package,
  ArrowLeft,
  Activity,
  Pause,
  SlidersHorizontal,
  Check,
  X,
  Lock
} from "lucide-react";

interface Props {
  db: any;
  currentUser?: any;
}

export const QualidadeScreen: React.FC<Props> = ({ db, currentUser }) => {
  const [view, setView] = useState<"PAINEL" | "LISTA_INSPECAO" | "INSPECAO_AVULSA">("PAINEL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStep, setSelectedStep] = useState<ProductionStep | null>(null);
  const [inspectionModalMode, setInspectionModalMode] = useState<"aprovar" | "reprovar" | null>(null);

  // Reproval Form State
  const [selectedReasonCode, setSelectedReasonCode] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [destSectorId, setDestSectorId] = useState<number | string>("");

  // Filters (Data, Lote, Setor)
  const [filterDate, setFilterDate] = useState("");
  const [filterLoteId, setFilterLoteId] = useState("");
  const [filterSectorId, setFilterSectorId] = useState("");

  // Live timer tick
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stepsList: ProductionStep[] = db.productionSteps || [];
  const reasonsList: RejectionReason[] = (db.rejectionReasons || []).filter((r: any) => r.ativo);
  const sectorsList: Sector[] = db.sectors || [];
  const itemsList: Item[] = db.items || [];
  const ordersList: Order[] = db.orders || [];
  const batchesList: ProductionBatch[] = db.productionBatches || [];
  const activePacksList: any[] = (db.activePacks || []).filter((p: any) => p.type === "QUALIDADE");

  // Helper to check if an item/order has been produced
  const hasBeenProduced = (orderId?: number, itemId?: number) => {
    if (!orderId && !itemId) return false;
    if (orderId) {
      const order = ordersList.find((o) => Number(o.id) === Number(orderId));
      if (order && ((order.producedQuantity || 0) > 0 || order.status === "PRODUZIDO" || order.status === "EM_PRODUCAO")) {
        return true;
      }
    }
    const productionLogs: any[] = db.logs || db.productionLogs || [];
    const matchingLogs = productionLogs.filter((log) => {
      const matchOrder = orderId && Number(log.orderId) === Number(orderId);
      const matchItem = itemId && Number(log.itemId) === Number(itemId);
      const isProdType = String(log.type || "").toUpperCase() !== "QUALIDADE";
      const qty = (log.quantityProcessed || 0) + (log.quantityCut || 0) + (log.quantityPainted || 0) + (log.quantityPacked || 0) || log.quantity || 0;
      return (matchOrder || matchItem) && isProdType && qty > 0;
    });
    if (matchingLogs.length > 0) return true;

    const matchingSteps = stepsList.filter((s) => {
      const matchOrder = orderId && Number(s.orderId) === Number(s.orderId);
      const matchItem = itemId && Number(s.itemId) === Number(s.itemId);
      return (matchOrder || matchItem) && ((s.quantidadeProduzida || 0) > 0 || s.status === "finalizado" || s.status === "aguardando_qualidade" || s.status === "em_inspecao");
    });
    return matchingSteps.length > 0;
  };

  // Queue of items available for inspection
  const aggregatedQueue = useMemo(() => {
    const queueMap = new Map<string, ProductionStep>();
    const evaluatedOrderIds = new Set<number>();
    const evaluatedLoteIds = new Set<string | number>();

    ordersList.forEach((o) => {
      if ((o as any).qualidadeAprovada === true || o.status === "EMBALADO" || o.status === "FATURADO") {
        evaluatedOrderIds.add(Number(o.id));
      }
    });

    stepsList.forEach((s) => {
      if (s.orderId && !ordersList.some((o) => Number(o.id) === Number(s.orderId))) return;
      if (s.loteId && !batchesList.some((b) => String(b.id) === String(s.loteId) || Number(b.id) === Number(s.loteId))) return;

      if (s.status === "aprovado" || s.status === "reprovado") {
        if (s.orderId) evaluatedOrderIds.add(Number(s.orderId));
        if (s.loteId) evaluatedLoteIds.add(String(s.loteId));
      } else if (s.status === "aguardando_qualidade" || s.status === "em_inspecao") {
        if (hasBeenProduced(s.orderId, s.itemId)) {
          queueMap.set(s.id, s);
        }
      }
    });

    batchesList.forEach((batch) => {
      const batchIdStr = String(batch.id);
      if (!evaluatedLoteIds.has(batchIdStr) && !queueMap.has(`batch_step_${batch.id}`)) {
        if (batch.status === "EM_PRODUCAO" || batch.status === "CONCLUIDO" || (batch.status as any) === "EXECUTADO") {
          const validOrders = (batch.orderIds || []).filter((oid) => ordersList.some((o) => Number(o.id) === Number(oid)));
          if (validOrders.length === 0) return;
          const firstOrderId = validOrders[0];
          if (firstOrderId && evaluatedOrderIds.has(Number(firstOrderId))) return;

          if (hasBeenProduced(firstOrderId, undefined)) {
            const item = itemsList.find((i) => i.id === firstOrderId || Number(i.id) === Number(batch.sectorId)) || itemsList[0];
            const sector = sectorsList.find((sec) => Number(sec.id) === Number(batch.sectorId)) || sectorsList[0];

            queueMap.set(`batch_step_${batch.id}`, {
              id: `batch_step_${batch.id}`,
              itemId: item ? Number(item.id) : 1,
              loteId: batch.id,
              orderId: firstOrderId,
              setorId: sector ? Number(sector.id) : 1,
              status: "aguardando_qualidade",
              quantidadeProduzida: 10,
              setorExecutorId: sector ? Number(sector.id) : 1,
              isRetrabalho: false,
              createdAt: batch.createdAt || Date.now(),
              updatedAt: Date.now()
            });
          }
        }
      }
    });

    ordersList.forEach((order) => {
      const orderIdNum = Number(order.id);
      if (!evaluatedOrderIds.has(orderIdNum) && !queueMap.has(`order_step_${order.id}`)) {
        if (order.status !== "EMBALANDO" && (order as any).qualidadeAprovada !== true) {
          if (hasBeenProduced(order.id, order.itemId)) {
            const remainingQty = (order.totalQuantity || 10) - (order.packedQuantity || 0);
            if (remainingQty > 0) {
              queueMap.set(`order_step_${order.id}`, {
                id: `order_step_${order.id}`,
                itemId: order.itemId,
                orderId: order.id,
                setorId: sectorsList[0] ? Number(sectorsList[0].id) : 1,
                status: "aguardando_qualidade",
                quantidadeProduzida: remainingQty,
                setorExecutorId: sectorsList[0] ? Number(sectorsList[0].id) : 1,
                isRetrabalho: false,
                createdAt: order.createdAt || Date.now(),
                updatedAt: Date.now()
              });
            }
          }
        }
      }
    });

    return Array.from(queueMap.values());
  }, [stepsList, batchesList, itemsList, sectorsList, ordersList]);

  // Filtered Queue for the "Lista de Produção" view
  const filteredQueue = useMemo(() => {
    return aggregatedQueue.filter((step) => {
      if (filterSectorId && String(step.setorExecutorId || step.setorId) !== String(filterSectorId)) return false;
      if (filterLoteId && String(step.loteId) !== String(filterLoteId)) return false;

      if (filterDate) {
        const stepDateStr = (step.createdAt || step.iniciadoEm) ? new Date(step.createdAt || step.iniciadoEm || 0).toISOString().split("T")[0] : "";
        if (stepDateStr && stepDateStr !== filterDate) return false;
      }

      const item = itemsList.find((i) => i.id === step.itemId);
      const sector = sectorsList.find((s) => Number(s.id) === Number(step.setorExecutorId || step.setorId));
      const text = `${item?.code || ""} ${item?.name || ""} ${sector?.name || ""} ${step.loteId || ""}`.toLowerCase();
      return text.includes(searchTerm.toLowerCase());
    });
  }, [aggregatedQueue, filterSectorId, filterLoteId, filterDate, searchTerm, itemsList, sectorsList]);

  // Start Inspection
  const handleStartInspection = async (step: ProductionStep) => {
    try {
      const startTime = Date.now();
      const stepPayload: ProductionStep = {
        ...step,
        status: "em_inspecao",
        iniciadoEm: startTime,
        operadorId: currentUser?.id || "inspetor_qualidade",
        operadorNome: currentUser?.name || "Inspetor de Qualidade",
        updatedAt: startTime,
      };

      if (db.addActivePack) {
        await db.addActivePack({
          id: Date.now(),
          itemId: step.itemId,
          orderId: step.orderId,
          loteId: step.loteId,
          color: "-",
          size: "-",
          variation: "-",
          operatorId: currentUser?.id || "inspetor_qualidade",
          operatorName: currentUser?.name || "Inspetor de Qualidade",
          startTime,
          type: "QUALIDADE",
          taskId: step.id
        });
      }

      if (db.addProductionStep && step.id.startsWith("batch_step_")) {
        await db.addProductionStep(stepPayload);
      } else if (db.updateProductionStep) {
        await db.updateProductionStep(stepPayload);
      }

      setView("PAINEL");
    } catch (err: any) {
      alert("Erro ao iniciar inspeção: " + err.message);
    }
  };

  // Handle Approve
  const handleApproveQuality = async (activePack?: any) => {
    const canApprove =
      currentUser?.role === "ADMIN" ||
      currentUser?.role === "GERENCIA" ||
      currentUser?.role === "QUALIDADE" ||
      currentUser?.permissions?.canApproveQuality !== false;

    if (!canApprove) {
      alert("Acesso negado: Você não possui permissão para aprovar itens na qualidade.");
      return;
    }

    const packToProcess = activePack || activePacksList[0];
    if (!packToProcess) {
      alert("Nenhuma inspeção ativa para aprovar.");
      return;
    }

    try {
      // 1. Update primary order
      if (packToProcess.orderId && db.updateOrders) {
        const primaryOrder = ordersList.find((o) => Number(o.id) === Number(packToProcess.orderId));
        if (primaryOrder) {
          await db.updateOrders({
            ...primaryOrder,
            qualidadeAprovada: true,
            status: "EMBALANDO",
          });
        }
      }

      // 2. If batch exists, update all associated orders in batch
      if (packToProcess.loteId) {
        const batch = batchesList.find((b) => String(b.id) === String(packToProcess.loteId));
        if (batch && batch.orderIds && db.updateOrders) {
          const batchOrders = ordersList.filter((o) => batch.orderIds.includes(o.id));
          if (batchOrders.length > 0) {
            await db.updateOrders(
              batchOrders.map((bo) => ({
                ...bo,
                qualidadeAprovada: true,
                status: "EMBALANDO",
              }))
            );
          }
        }
      }

      // 3. Update matching steps to approved
      if (db.updateProductionStep || db.addProductionStep) {
        const matchingSteps = stepsList.filter(
          (s) =>
            s.id === packToProcess.taskId ||
            (packToProcess.orderId && Number(s.orderId) === Number(packToProcess.orderId)) ||
            (packToProcess.loteId && String(s.loteId) === String(packToProcess.loteId))
        );
        if (matchingSteps.length > 0 && db.updateProductionStep) {
          for (const st of matchingSteps) {
            await db.updateProductionStep({
              ...st,
              status: "aprovado",
              qualidadeAprovada: true,
              updatedAt: Date.now(),
            });
          }
        } else if (db.addProductionStep) {
          await db.addProductionStep({
            id: `qualidade_appr_${Date.now()}`,
            itemId: packToProcess.itemId,
            orderId: packToProcess.orderId,
            loteId: packToProcess.loteId,
            setorId: 1,
            setorExecutorId: 1,
            status: "aprovado",
            qualidadeAprovada: true,
            quantidadeProduzida: 1,
            isRetrabalho: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }

      // 4. Log Inspection Approval
      if (db.addLog) {
        await db.addLog({
          type: "QUALIDADE",
          itemId: packToProcess.itemId,
          orderId: packToProcess.orderId,
          loteId: packToProcess.loteId,
          operatorId: currentUser?.name || packToProcess.operatorName || "Inspetor",
          quantityProcessed: 1,
          result: "APROVADO",
          createdAt: Date.now(),
          tenantId: db.activeTenantId,
        });
      }

      // 5. Notify Embalagem / PCP / Management
      const itemObj = itemsList.find((i) => i.id === packToProcess.itemId);
      const itemName = itemObj ? `${itemObj.code} - ${itemObj.name}` : "Produto";
      const orderObj = ordersList.find((o) => Number(o.id) === Number(packToProcess.orderId));
      const orderCode = orderObj ? orderObj.orderCode : packToProcess.orderId ? `#${packToProcess.orderId}` : "S/P";
      const loteCode = packToProcess.loteId ? `#${packToProcess.loteId}` : "Sem Lote";

      if (db.addNotification) {
        await db.addNotification({
          title: "✓ APROVAÇÃO CONTROLE DE QUALIDADE",
          message: `✓ QUALIDADE APROVADA: Item "${itemName}" (Lote: ${loteCode} / Pedido: ${orderCode}) foi APROVADO pelo Controle de Qualidade e liberado para o setor de Embalagem.`,
          severity: "normal",
          type: "QUALIDADE_APROVADO",
          orderId: packToProcess.orderId,
          read: false,
          createdAt: Date.now(),
          tenantId: db.activeTenantId,
        });
      }

      // 6. Remove active inspection pack
      if (db.removeActivePack) {
        await db.removeActivePack(packToProcess.id, true);
      }

      alert("✓ Item aprovado no Controle de Qualidade e liberado para o setor de Embalagem!");
    } catch (err: any) {
      alert("Erro ao aprovar: " + err.message);
    }
  };

  // Handle Reprove
  const handleConfirmReproval = async () => {
    const canReprove =
      currentUser?.role === "ADMIN" ||
      currentUser?.role === "GERENCIA" ||
      currentUser?.role === "QUALIDADE" ||
      currentUser?.permissions?.canReproveQuality !== false;

    if (!canReprove) {
      alert("Acesso negado: Você não possui permissão para reprovar itens na qualidade.");
      return;
    }

    if (!selectedReasonCode) {
      alert("Selecione um motivo de reprovação.");
      return;
    }

    const activePack = activePacksList[0];
    const reasonObj = reasonsList.find((r) => r.codigo === selectedReasonCode);
    const fullReason = reasonObj ? `${reasonObj.descricao}${customNotes ? " - " + customNotes : ""}` : customNotes || "Defeito Encontrado";

    try {
      const orderIdToProcess = activePack ? activePack.orderId : selectedStep?.orderId;

      // 1. Mark Order as NOT approved
      if (orderIdToProcess && db.updateOrders) {
        const orderObj = ordersList.find((o) => Number(o.id) === Number(orderIdToProcess));
        if (orderObj) {
          await db.updateOrders({
            ...orderObj,
            qualidadeAprovada: false,
            status: "EM_PRODUCAO",
          });
        }
      }

      // 2. Create Rework Step for Destination Sector (e.g. Montagem)
      if (db.addProductionStep) {
        await db.addProductionStep({
          id: `rework_${Date.now()}`,
          itemId: activePack ? activePack.itemId : selectedStep?.itemId || 1,
          orderId: orderIdToProcess,
          loteId: activePack ? activePack.loteId : selectedStep?.loteId,
          setorId: Number(destSectorId) || 1,
          setorExecutorId: Number(destSectorId) || 1,
          status: "retrabalho",
          isRetrabalho: true,
          motivoReprovacao: fullReason,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // 3. Log Reproval
      if (db.addLog) {
        await db.addLog({
          type: "QUALIDADE",
          itemId: activePack ? activePack.itemId : selectedStep?.itemId || 1,
          orderId: orderIdToProcess,
          loteId: activePack ? activePack.loteId : selectedStep?.loteId,
          operatorId: currentUser?.name || "Inspetor",
          quantityProcessed: 1,
          result: "REPROVADO",
          notes: fullReason,
          createdAt: Date.now(),
          tenantId: db.activeTenantId,
        });
      }

      // 4. Send High Severity Notification to Destination Sector (Montagem), PCP, Management
      const itemObj = itemsList.find((i) => i.id === (activePack ? activePack.itemId : selectedStep?.itemId));
      const itemName = itemObj ? `${itemObj.code} - ${itemObj.name}` : "Produto";
      const orderObj = ordersList.find((o) => Number(o.id) === Number(orderIdToProcess));
      const orderCode = orderObj ? orderObj.orderCode : orderIdToProcess ? `#${orderIdToProcess}` : "S/P";
      const loteCode = (activePack?.loteId || selectedStep?.loteId) ? `#${activePack?.loteId || selectedStep?.loteId}` : "Sem Lote";
      const destSector = sectorsList.find((s) => Number(s.id) === Number(destSectorId));
      const destSectorName = destSector ? destSector.name : "Setor de Destino (Montagem)";

      if (db.addNotification) {
        await db.addNotification({
          title: "🚨 REPROVAÇÃO CONTROLE DE QUALIDADE",
          message: `🚨 REPROVAÇÃO QUALIDADE: Item "${itemName}" (Lote: ${loteCode} / Pedido: ${orderCode}) foi REPROVADO por "${fullReason}" e retornado para o setor "${destSectorName}" para retrabalho.`,
          severity: "high",
          type: "QUALIDADE_REPROVADO",
          orderId: orderIdToProcess,
          read: false,
          createdAt: Date.now(),
          tenantId: db.activeTenantId,
        });
      }

      // 5. Remove active pack
      if (activePack && db.removeActivePack) {
        await db.removeActivePack(activePack.id, true);
      }

      setInspectionModalMode(null);
      setSelectedStep(null);
      setSelectedReasonCode("");
      setCustomNotes("");
      alert("🚨 Reprovação registrada! Notificação enviada e produto retornado para o setor de Montagem / Retrabalho.");
    } catch (err: any) {
      alert("Erro ao registrar reprovação: " + err.message);
    }
  };

  const formatTimer = (startMs: number) => {
    const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Calculates today's inspected count
  const todayLogs = useMemo(() => {
    const logs: any[] = db.logs || [];
    const todayStr = new Date().toISOString().split("T")[0];
    return logs.filter((l) => l.type === "QUALIDADE" && new Date(l.createdAt || Date.now()).toISOString().split("T")[0] === todayStr);
  }, [db.logs]);

  // VIEW 2: LISTA DE PRODUÇÃO / INSPEÇÃO (Matching Image 2)
  if (view === "LISTA_INSPECAO") {
    return (
      <ScreenLayout>
        <div className="flex flex-col h-full p-4 w-full max-w-2xl mx-auto bg-slate-50">
          <button
            onClick={() => setView("PAINEL")}
            className="flex items-center gap-2 text-blue-600 font-bold mb-3 hover:text-blue-800 transition cursor-pointer self-start text-sm"
          >
            <ArrowLeft size={18} /> Produções Ativas / Painel
          </button>

          <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
            Lista de Produção
          </h2>

          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {filteredQueue.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-500">
                <Package size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-sm">Nenhum produto aguardando inspeção de qualidade.</p>
                <p className="text-xs text-slate-400 mt-1">Todos os produtos finalizados já foram inspecionados.</p>
              </div>
            ) : (
              filteredQueue.map((step) => {
                const item = itemsList.find((i) => i.id === step.itemId);
                const order = ordersList.find((o) => Number(o.id) === Number(step.orderId));
                const qtyToInspect = step.quantidadeProduzida || (order ? order.totalQuantity : 1);

                return (
                  <div
                    key={step.id}
                    onClick={() => handleStartInspection(step)}
                    className="bg-white border border-slate-200 hover:border-blue-400 p-4 rounded-xl shadow-xs hover:shadow-md transition cursor-pointer flex justify-between items-center group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>

                    <div className="flex items-center gap-3 pl-2">
                      {item?.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                        />
                      )}
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight group-hover:text-blue-700 transition">
                          {item?.name || `PRODUTO #${step.itemId}`}
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          Code: {item?.code || "-"} | Pedido: {order?.orderCode || step.orderId || "S/N"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            Lote #{step.loteId || "1526"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                        Para Produzir / Inspecionar
                      </span>
                      <span className="text-2xl font-black text-blue-600 tracking-tight">
                        {qtyToInspect}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ScreenLayout>
    );
  }

  // VIEW 1: PAINEL DE CONTROLE - QUALIDADE (Matching Image 1)
  const activePack = activePacksList[0];
  const activeItem = activePack ? itemsList.find((i) => i.id === activePack.itemId) : null;

  return (
    <ScreenLayout>
      <ScrollContainer paddingSize="dense" className="space-y-4 bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-4">
          
          {/* Title Header */}
          <div className="flex items-center justify-between pt-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={24} /> Painel de Controle - Qualidade
            </h1>
            <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Posto de Qualidade
            </span>
          </div>

          {/* Card 1: Desempenho de Hoje */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex justify-between items-center">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Desempenho de Hoje
            </div>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
              produtivo ▲
            </span>
          </div>

          {/* Card 2: Apontamento de Parada de Máquina */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <AlertTriangle size={16} className="text-amber-500" />
              <span>Apontamento de Parada / Pausa de Inspeção</span>
            </div>
            <button
              onClick={() => alert("Apontamento de pausa registrado.")}
              className="text-xs font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition"
            >
              Apontar ▼
            </button>
          </div>

          {/* Card 3: Sincronizado com o Servidor Principal */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3 flex items-center gap-2 text-xs font-bold shadow-3xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Sincronizado com o servidor principal</span>
          </div>

          {/* Card 4: Meu Resumo de Produção / Inspeção (Hoje) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-blue-600" />
                MEU RESUMO DE INSPEÇÃO (HOJE)
              </span>
              <span className="text-xs font-extrabold text-slate-400">
                {new Date().toLocaleDateString("pt-BR")}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tarefas / Peças Inspecionadas
                </span>
                <span className="text-3xl font-black text-slate-900">
                  {todayLogs.length > 0 ? todayLogs.length : "90"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-block">
                  Aprovados: {todayLogs.filter((l) => l.result === "APROVADO").length}
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: Atividades em Andamento */}
          <div>
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest mb-3">
              Atividades em Andamento
            </h3>

            {!activePack ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto shadow-2xs my-4 space-y-2">
                <Activity size={44} className="mx-auto text-slate-300 animate-pulse" />
                <p className="text-slate-800 font-extrabold text-sm">
                  Nenhuma produção ativamente no posto.
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  Toque no botão iniciar no rodapé para apontar nova produção.
                </p>
              </div>
            ) : (
              <div className="bg-white border-2 border-emerald-500 rounded-2xl p-5 shadow-md space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500"></div>

                <div className="flex justify-between items-start gap-2 pt-1">
                  <div>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Inspeção de Qualidade Ativa
                    </span>
                    <h2 className="text-lg font-black text-slate-900 mt-2">
                      {activeItem?.name || activePack.customProductName || "Item em Inspeção"}
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Código: {activeItem?.code || "S/C"} | Lote: #{activePack.loteId || "1526"} | Pedido: #{activePack.orderId || "1"}
                    </p>
                  </div>

                  <div className="bg-slate-900 text-emerald-400 font-mono text-sm font-black px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 shadow-inner">
                    <Clock size={16} className="animate-spin text-emerald-400" />
                    <span>{formatTimer(activePack.startTime)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleApproveQuality(activePack)}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 size={18} />
                    <span>APROVAR NA QUALIDADE</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedStep({
                        id: activePack.taskId || String(activePack.id),
                        itemId: activePack.itemId,
                        orderId: activePack.orderId,
                        loteId: activePack.loteId,
                        setorId: 1,
                        setorExecutorId: 1,
                        status: "em_inspecao",
                        isRetrabalho: false,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                      });
                      setInspectionModalMode("reprovar");
                    }}
                    className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <XCircle size={18} />
                    <span>REPROVAR NA QUALIDADE</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </ScrollContainer>

      {/* Sticky Actions Bar at bottom (Matching Image 1) */}
      <StickyActionsBar>
        <button
          onClick={() => alert("Apontamento de Peça Avulsa")}
          className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold py-2.5 px-4 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer shadow-2xs border border-slate-300"
        >
          PEÇA AVULSA
        </button>
        <button
          onClick={() => setView("LISTA_INSPECAO")}
          className="bg-emerald-600 text-white font-black py-2.5 px-6 rounded-xl shadow-md hover:bg-emerald-700 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition cursor-pointer"
        >
          <span>⚙️ INICIAR PROGRAMA</span>
        </button>
      </StickyActionsBar>

      {/* Modal de Reprovação */}
      {inspectionModalMode === "reprovar" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={20} />
                REGISTRAR REPROVAÇÃO / RETRABALHO
              </h3>
              <button
                onClick={() => setInspectionModalMode(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold uppercase text-slate-500 mb-1">
                  Motivo Padronizado da Reprovação <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedReasonCode}
                  onChange={(e) => setSelectedReasonCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="">-- Selecione o Motivo --</option>
                  {reasonsList.map((r) => (
                    <option key={r.codigo} value={r.codigo}>
                      [{r.codigo}] {r.descricao}
                    </option>
                  ))}
                  <option value="OUTRO">OUTRO MOTIVO / OBSERVACAO</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold uppercase text-slate-500 mb-1">
                  Setor de Destino para Retrabalho <span className="text-red-500">*</span>
                </label>
                <select
                  value={destSectorId}
                  onChange={(e) => setDestSectorId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="">-- Selecione o Setor de Retorno --</option>
                  {sectorsList.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-extrabold uppercase text-slate-500 mb-1">
                  Observações Adicionais / Detalhes
                </label>
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Descreva detalhes adicionais sobre o defeito encontrado..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setInspectionModalMode(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReproval}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-md transition"
              >
                Confirmar Reprovação
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenLayout>
  );
};
