import React, { useState } from "react";
import { ArrowLeft, Activity, Pencil, X, Clock, Trash } from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, NestTask } from "./types";
import { calculateWorkingMillis } from "./timeUtils";
import { LoteGeralWidget } from "./components/LoteGeralWidget";
import { DailySummaryWidget } from "./components/DailySummaryWidget";
import { normalizeString } from "./searchUtils";
import { ProductivityCard } from "./components/ProductivityCard";
import { MachineStopWidget } from "./components/OperatorActions";

export function SVGQRCode({ data }: { data: string }) {
  return (
    <svg
      width="68"
      height="68"
      viewBox="0 0 29 29"
      className="bg-white p-1 rounded border border-gray-300"
    >
      <rect width="29" height="29" fill="white" />
      <rect x="0" y="0" width="7" height="7" fill="black" />
      <rect x="1" y="1" width="5" height="5" fill="white" />
      <rect x="2" y="2" width="3" height="3" fill="black" />
      <rect x="22" y="0" width="7" height="7" fill="black" />
      <rect x="23" y="1" width="5" height="5" fill="white" />
      <rect x="24" y="2" width="3" height="3" fill="black" />
      <rect x="0" y="22" width="7" height="7" fill="black" />
      <rect x="1" y="23" width="5" height="5" fill="white" />
      <rect x="2" y="24" width="3" height="3" fill="black" />
      <rect x="22" y="22" width="3" height="3" fill="black" />
      <rect x="8" y="1" width="1" height="1" fill="black" />
      <rect x="10" y="2" width="1" height="1" fill="black" />
      <rect x="12" y="0" width="1" height="1" fill="black" />
      <rect x="15" y="3" width="1" height="1" fill="black" />
      <rect x="18" y="1" width="2" height="1" fill="black" />
      <rect x="8" y="5" width="2" height="1" fill="black" />
      <rect x="11" y="4" width="1" height="1" fill="black" />
      <rect x="14" y="5" width="1" height="1" fill="black" />
      <rect x="16" y="4" width="2" height="2" fill="black" />
      <rect x="0" y="8" width="1" height="1" fill="black" />
      <rect x="2" y="10" width="1" height="1" fill="black" />
      <rect x="3" y="9" width="2" height="1" fill="black" />
      <rect x="5" y="12" width="1" height="1" fill="black" />
      <rect x="7" y="10" width="1" height="1" fill="black" />
      <rect x="9" y="8" width="2" height="1" fill="black" />
      <rect x="13" y="8" width="1" height="1" fill="black" />
      <rect x="15" y="9" width="1" height="1" fill="black" />
      <rect x="17" y="10" width="1" height="1" fill="black" />
      <rect x="19" y="8" width="1" height="1" fill="black" />
      <rect x="21" y="9" width="1" height="1" fill="black" />
      <rect x="25" y="8" width="1" height="1" fill="black" />
      <rect x="27" y="10" width="1" height="1" fill="black" />
      <rect x="9" y="12" width="1" height="1" fill="black" />
      <rect x="11" y="14" width="1" height="1" fill="black" />
      <rect x="14" y="12" width="2" height="1" fill="black" />
      <rect x="17" y="14" width="1" height="1" fill="black" />
      <rect x="19" y="13" width="1" height="1" fill="black" />
      <rect x="23" y="14" width="1" height="1" fill="black" />
      <rect x="26" y="12" width="2" height="1" fill="black" />
      <rect x="10" y="17" width="1" height="1" fill="black" />
      <rect x="12" y="18" width="2" height="1" fill="black" />
      <rect x="15" y="16" width="1" height="1" fill="black" />
      <rect x="18" y="19" width="1" height="1" fill="black" />
      <rect x="20" y="17" width="1" height="1" fill="black" />
      <rect x="24" y="18" width="2" height="1" fill="black" />
      <rect x="8" y="22" width="2" height="2" fill="black" />
      <rect x="11" y="24" width="1" height="1" fill="black" />
      <rect x="14" y="22" width="1" height="1" fill="black" />
      <rect x="16" y="25" width="2" height="1" fill="black" />
      <rect x="19" y="23" width="1" height="1" fill="black" />
    </svg>
  );
}

export function CorteLaserScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [view, setView] = useState<
    "LIST_ACTIVE" | "NEW_PACK" | "FINISH_PACK" | "MANUAL_PRODUCTION"
  >("LIST_ACTIVE");
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [packQuantity, setPackQuantity] = useState<number | "">("");
  const [searchTerm, setSearchTerm] = useState("");

  // Funcionalidade 4: Popup de Caixas e Impressão de Etiqueta 10x5
  const [showPopupCaixas, setShowPopupCaixas] = useState(false);
  const [qtdCaixas, setQtdCaixas] = useState<number | "">("");
  const [itensPorCaixa, setItensPorCaixa] = useState<number | "">("");
  const [propriaEmbalagem, setPropriaEmbalagem] = useState(false);
  const [qtdDireta, setQtdDireta] = useState<number | "">("");

  // Visualização e Impressão da etiqueta gerada
  const [etiquetaLayout, setEtiquetaLayout] = useState<"THERMAL" | "A4">(
    "THERMAL",
  );
  const [etiquetaGerada, setEtiquetaGerada] = useState<{
    nome: string;
    total: number;
    embalagens: string;
    dataHoraStr: string;
    qrData: string;
    operador: string;
  } | null>(null);

  const [manualTitle, setManualTitle] = useState("");
  const [manualProduct, setManualProduct] = useState("");

  const [editingTask, setEditingTask] = useState<NestTask | null>(null);
  const [formPartName, setFormPartName] = useState("");
  const [formSize, setFormSize] = useState("");
  const [formTotalQty, setFormTotalQty] = useState("");
  const [formCutQty, setFormCutQty] = useState("");

  const handleSaveEditTask = () => {
    if (!editingTask) return;
    if (!formPartName || !formTotalQty) {
      alert("Preencha ao menos o nome da peça e a quantidade total.");
      return;
    }

    const updatedTask: NestTask = {
      ...editingTask,
      partName: formPartName,
      size: formSize,
      totalQuantity: Number(formTotalQty),
      cutQuantity: Number(formCutQty),
      isActive: Number(formCutQty) < Number(formTotalQty),
    };

    db.updateNestTasks([updatedTask]);

    // Update any active packs that are referencing this taskId
    db.activePacks.forEach((p: any) => {
      if (p.taskId === editingTask.id) {
        db.addActivePack({
          ...p,
          partName: formPartName,
          size: formSize,
        });
      }
    });

    setEditingTask(null);
    alert("Peça do Nesting atualizada com sucesso!");
  };

  const handleStartManualProduction = () => {
    if (!manualTitle || !manualProduct) return;

    db.addActivePack({
      id: Date.now(),
      itemId: 0,
      color: "-",
      size: "-",
      variation: "-",
      operatorId: currentUser.id,
      startTime: Date.now(),
      type: "CORTE_LASER",
      taskId: 0,
      thirdPartyName: manualTitle,
      customProductName: manualProduct,
    } as any);

    setManualTitle("");
    setManualProduct("");
    setView("LIST_ACTIVE");
  };

  const activeLaserPacks = db.activePacks.filter(
    (p) => p.type === "CORTE_LASER",
  );

  const activePacksList = activeLaserPacks.filter((p) =>
    currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" ? true : p.operatorId === currentUser.id,
  );

  const pendingTasks = (
    db.nestTasks?.filter(
      (t) => t.status === "PENDENTE" && t.cutQuantity < t.totalQuantity,
    ) || []
  ).filter((t) => !activeLaserPacks.some((p: any) => p.taskId === t.id));

  const filteredTasks = pendingTasks.filter((t) =>
    normalizeString(t.partName).includes(normalizeString(searchTerm)),
  );

  const startTask = (task: (typeof pendingTasks)[0]) => {
    if (activePacksList.some((p) => (p as any).taskId === task.id)) {
      alert("Já existe um corte ativo para esta peça!");
      return;
    }
    db.addActivePack({
      id: Date.now(),
      itemId: 0,
      color: "",
      size: task.size,
      variation: "",
      operatorId: currentUser.id,
      startTime: Date.now(),
      type: "CORTE_LASER",
      partName: task.partName,
      taskId: task.id,
    } as any);

    db.updateNestTasks([{ ...task, status: "EM_CORTE" }]);
    db.addNotification({
      message: `Nesting: ${task.nestName} | Peça: ${task.partName} | Status: Em Produção (Corte Iniciado) | Data/Hora: ${new Date().toLocaleString()} | Operador: ${currentUser.name}`,
      read: false,
    });
    alert("Produção de corte iniciada!");
    setView("LIST_ACTIVE");
  };

  const cancelActiveTask = (pack: (typeof activePacksList)[0]) => {
    if (confirm("Cancelar este corte em andamento?")) {
      db.removeActivePack(pack.id);

      const task = db.nestTasks?.find((t) => t.id === (pack as any).taskId);
      if (task) {
        db.updateNestTasks([{ ...task, status: "PENDENTE" }]);
      }
    }
  };

  const sendServerPush = async (
    title: string,
    body: string,
    targetRoles: string[],
  ) => {
    const targetUsers = db.users.filter(
      (u) => targetRoles.includes(u.role) && u.fcmToken,
    );
    const tokens = targetUsers.map((u) => u.fcmToken);

    if (tokens.length > 0) {
      try {
        await fetch("/api/send-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, fcmTokens: tokens }),
        });
      } catch (e) {
        console.error("Error triggering push:", e);
      }
    }
  };

  const finishTask = (overrideQty?: number) => {
    if (!selectedPackId) return;
    const pack = activePacksList.find((p) => p.id === selectedPackId) as any;
    if (!pack) return;

    let qtyToAllocate =
      overrideQty !== undefined ? overrideQty : Number(packQuantity);
    if (!qtyToAllocate || qtyToAllocate <= 0) {
      alert("Digite uma quantidade válida!");
      return;
    }

    const endTime = Date.now();
    const operator = db.users?.find((u) => u.id === pack.operatorId);
    const opRole = operator?.role || currentUser.role || "CORTE_LASER";
    const durationMillis = calculateWorkingMillis(
      pack.startTime,
      endTime,
      opRole,
    );

    if (pack.itemId === 0 && !pack.taskId) {
      db.addLogs([
        {
          id: Date.now(),
          operatorId: currentUser.id,
          quantityCut: qtyToAllocate,
          type: "CORTE_LASER",
          timestamp: endTime,
          durationMillis,
          thirdPartyName: pack.thirdPartyName,
          customProductName: pack.customProductName,
          nestedPartName: pack.customProductName,
        } as any,
      ]);
      db.removeActivePack(pack.id);
      setSelectedPackId(null);
      setPackQuantity("");
      setView("LIST_ACTIVE");
      return;
    }

    const task = db.nestTasks?.find((t) => t.id === pack.taskId);
    if (!task) {
      alert("Tarefa não encontrada.");
      return;
    }

    const newCut = (task.cutQuantity || 0) + qtyToAllocate;
    const isCompleted = newCut >= (task.totalQuantity || 0);
    const status = isCompleted ? "CORTADO" : "EM_CORTE";
    const completedAt = isCompleted ? Date.now() : undefined;

    db.updateNestTasks([
      {
        ...task,
        cutQuantity: newCut,
        status,
        completedAt,
        isActive: !isCompleted,
      },
    ]);

    db.addLogs([
      {
        id: Date.now(),
        orderId: task.id,
        operatorId: currentUser.id,
        quantityCut: qtyToAllocate,
        type: "CORTE_LASER",
        timestamp: endTime,
        durationMillis,
        nestedPartName: task.partName,
      } as any,
    ]);

    // INCREMENTO DINÂMICO E SEGURO DO ESTOQUE
    if (isCompleted) {
      const matchedItem = db.items?.find(
        (i) =>
          normalizeString(i.name) === normalizeString(task.partName) ||
          (i.code &&
            normalizeString(i.code) === normalizeString(task.partName)),
      );

      if (matchedItem) {
        const stockId = `${matchedItem.id}|-|-|-|INTERMEDIARIO`;
        const existingStock = db.stocks?.find((s) => s.id === stockId);

        if (existingStock) {
          db.updateStocks([
            {
              ...existingStock,
              quantity: (existingStock.quantity || 0) + task.totalQuantity,
            },
          ]);
        } else {
          db.updateStocks([
            {
              id: stockId,
              itemId: matchedItem.id,
              color: "-",
              size: "-",
              variation: "-",
              quantity: task.totalQuantity,
              stage: "INTERMEDIARIO",
            },
          ]);
        }

        // Log stock movement
        db.addStockMovement({
          itemId: matchedItem.id,
          color: "-",
          size: "-",
          variation: "-",
          quantity: task.totalQuantity,
          type: "ENTRADA",
          description: `Entrada por Corte Laser - Nesting ${task.nestName}`,
        });
      }
    }

    db.removeActivePack(pack.id);

    const notifMsg = `Nesting: ${task.nestName} | Peça: ${task.partName} | Status: Concluído (Corte Finalizado, Qtd: ${qtyToAllocate} de ${task.totalQuantity} un.) | Data/Hora: ${new Date().toLocaleString("pt-BR")} | Operador: ${currentUser.name}`;
    db.addNotification({
      message: notifMsg,
      read: false,
    });

    sendServerPush("Peças Cortadas (Laser)", notifMsg, [
      "ADMIN",
      "PCP",
      "PROJETISTA",
    ]);

    if (overrideQty === undefined) {
      alert(
        `Corte de ${qtyToAllocate} peças finalizado com sucesso! Tempo útil registrado.`,
      );
    }

    setView("LIST_ACTIVE");
    setSelectedPackId(null);
    setPackQuantity("");
  };

  const handleFinishNestBlock = (nestName: string, packs: any[]) => {
    if (
      !confirm(
        `Deseja finalizar todas as peças do nesting "${nestName}" de uma vez? As peças receberão o apontamento completo do que foi planejado, e o seu tempo final será encerrado para todas.`,
      )
    ) {
      return;
    }

    const updatedTasks: NestTask[] = [];
    const stockUpdates: any[] = [];
    const stockMovements: any[] = [];
    const logUpdates: any[] = [];
    let completedPieces = 0;

    const endTime = Date.now();

    // Find ALL tasks for this nest that are not CORTADO
    const allNestTasks =
      db.nestTasks?.filter(
        (t) => t.nestName === nestName && t.status !== "CORTADO",
      ) || [];

    allNestTasks.forEach((task) => {
      // If there is an active pack for this task, we can use its operator and startTime. Otherwise fallback to current user.
      const pack =
        packs.find((p) => p.taskId === task.id) ||
        db.activePacks.find((p) => p.taskId === task.id);

      let durationMillis = 0;
      let operatorId = currentUser.id;

      if (pack) {
        const operator = db.users?.find((u) => u.id === pack.operatorId);
        const opRole = operator?.role || currentUser.role || "CORTE_LASER";
        durationMillis = calculateWorkingMillis(
          pack.startTime,
          endTime,
          opRole,
        );
        operatorId = pack.operatorId;
      }

      const qtyToCut = task.totalQuantity - (task.cutQuantity || 0);
      if (qtyToCut <= 0) return; // skip if completely cut, though filtered above

      completedPieces++;

      updatedTasks.push({
        ...task,
        cutQuantity: task.totalQuantity,
        status: "CORTADO",
        completedAt: endTime,
        isActive: false,
      });

      if (pack) {
        db.removeActivePack(pack.id);
      }

      // INCREMENTO DINÂMICO E SEGURO DO ESTOQUE
      const matchedItem = db.items?.find(
        (i) =>
          normalizeString(i.name) === normalizeString(task.partName) ||
          (i.code &&
            normalizeString(i.code) === normalizeString(task.partName)),
      );

      if (matchedItem) {
        const stockId = `${matchedItem.id}|-|-|-|INTERMEDIARIO`;
        let existingQty = 0;
        const alreadyUpdated = stockUpdates.find((s) => s.id === stockId);
        if (alreadyUpdated) {
          existingQty = alreadyUpdated.quantity;
        } else {
          const existingStock = db.stocks?.find((s) => s.id === stockId);
          existingQty = existingStock?.quantity || 0;
        }

        const existingIndex = stockUpdates.findIndex((s) => s.id === stockId);
        const newQty = existingQty + qtyToCut;

        const newStock = {
          id: stockId,
          itemId: matchedItem.id,
          color: "-",
          size: "-",
          variation: "-",
          quantity: newQty,
          stage: "INTERMEDIARIO",
        };

        if (existingIndex >= 0) {
          stockUpdates[existingIndex] = newStock;
        } else {
          stockUpdates.push({ ...newStock });
        }

        stockMovements.push({
          itemId: matchedItem.id,
          color: "-",
          size: "-",
          variation: "-",
          quantity: qtyToCut,
          type: "ENTRADA",
          description: `Entrada por Corte Laser - Nesting ${task.nestName} Lote Completo`,
        });
      }

      logUpdates.push({
        id: Date.now() + Math.random(),
        orderId: task.id,
        operatorId,
        quantityCut: qtyToCut,
        type: "CORTE_LASER",
        timestamp: endTime,
        durationMillis,
        nestedPartName: task.partName,
      } as any);
    });

    if (updatedTasks.length > 0) db.updateNestTasks(updatedTasks);
    if (stockUpdates.length > 0) db.updateStocks(stockUpdates);
    stockMovements.forEach((m) => db.addStockMovement(m));
    if (logUpdates.length > 0) db.addLogs(logUpdates);

    // NOTIFICATION
    const notifMsg = `Operador ${currentUser.name} finalizou integralmente o Nesting: ${nestName} via Lote (${completedPieces} componentes processados)!`;
    db.addNotification({ message: notifMsg, read: false });
    sendServerPush("Lote Nesting Cortado", notifMsg, [
      "ADMIN",
      "PCP",
      "PROJETISTA",
    ]);

    alert(
      `Nesting "${nestName}" concluído em lote! ${completedPieces} componentes pendentes foram apontados com sucesso.`,
    );
  };

  if (view === "MANUAL_PRODUCTION") {
    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-blue-600 font-semibold mb-4 hover:text-blue-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="bg-white p-6 rounded-lg shadow-sm border w-full flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2 text-blue-800 border-b pb-2">
            <Activity className="w-5 h-5" />
            <h3 className="font-bold text-xl">
              Iniciar Lançamento Avulso (Corte Laser)
            </h3>
          </div>
          <p className="text-sm text-gray-500">
            Registre e inicie a contagem de tempo de corte para terceiros ou
            produtos externos sem nesting.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Cliente (Terceiro) ou Origem / Projeto
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="border p-2 rounded focus:outline-blue-500"
              placeholder="Ex: Chapa Avulsa ABC"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Descrição das Peças / Produto
            </label>
            <input
              type="text"
              value={manualProduct}
              onChange={(e) => setManualProduct(e.target.value)}
              className="border p-2 rounded focus:outline-blue-500"
              placeholder="Ex: Chapa 3mm Diversos"
            />
          </div>

          <button
            onClick={handleStartManualProduction}
            disabled={!manualTitle || !manualProduct}
            className="bg-blue-600 font-bold text-white py-3 rounded-lg mt-4 shadow hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >
            <Activity size={18} /> Iniciar Processo
          </button>
        </div>
      </div>
    );
  }

  if (view === "NEW_PACK") {
    return (
      <div className="p-4 flex flex-col h-full bg-slate-50">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView("LIST_ACTIVE")}
            className="text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">
            Iniciar Novo Corte Laser
          </h2>
        </div>

        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar por Peça..."
          className="border border-gray-300 p-3 rounded-lg w-full mb-4 focus:outline-blue-500 shadow-sm"
        />

        <div className="flex-1 overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <p className="text-gray-500 text-center mt-4">
              Nenhuma tarefa pendente para corte.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {(
                Object.entries(
                  filteredTasks.reduce(
                    (acc, t) => {
                      const n = t.nestName || "Peças Avulsas";
                      if (!acc[n]) acc[n] = [];
                      acc[n].push(t);
                      return acc;
                    },
                    {} as Record<string, typeof filteredTasks>,
                  ),
                ) as [string, typeof filteredTasks][]
              ).map(([nestName, tasks]) => (
                <div
                  key={nestName}
                  className="bg-white border text-left border-gray-200 rounded-lg shadow-sm overflow-hidden"
                >
                  <div className="p-4 bg-indigo-50 flex justify-between items-center border-b border-indigo-100">
                    <div>
                      <h4 className="font-bold text-indigo-900">{nestName}</h4>
                      <p className="text-xs text-indigo-700 mt-1">
                        {tasks.length} peças prontas para iniciar
                      </p>
                    </div>
                    {nestName !== "Peças Avulsas" && (
                      <button
                        onClick={() => {
                          if (
                            !confirm(
                              `Deseja iniciar as ${tasks.length} peças deste nesting simultaneamente?`,
                            )
                          )
                            return;
                          tasks.forEach((t) => {
                            if (
                              activePacksList.some(
                                (p) => (p as any).taskId === t.id,
                              )
                            )
                              return;
                            db.addActivePack({
                              id: Date.now() + Math.random(),
                              itemId: 0,
                              color: "",
                              size: t.size,
                              variation: "",
                              operatorId: currentUser.id,
                              startTime: Date.now(),
                              type: "CORTE_LASER",
                              partName: t.partName,
                              taskId: t.id,
                            } as any);
                          });
                          db.updateNestTasks(
                            tasks.map((t) => ({ ...t, status: "EM_CORTE" })),
                          );
                          db.addNotification({
                            message: `Nesting: ${nestName} | Peças: ${tasks.map((t) => t.partName).join(", ")} | Status: Em Produção (Nesting Iniciado) | Data/Hora: ${new Date().toLocaleString("pt-BR")} | Operador: ${currentUser.name}`,
                            read: false,
                          });
                          alert(
                            `Nesting iniciado: ${tasks.length} peças colocadas em produção!`,
                          );
                          setView("LIST_ACTIVE");
                        }}
                        className="bg-indigo-600 text-white text-xs sm:text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold transition shadow-sm cursor-pointer"
                      >
                        Iniciar Nesting Inteiro
                      </button>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        className="bg-slate-50 p-4 border border-slate-200 rounded-lg flex justify-between items-center shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          {t.thumbnailBase64 && (
                            <img
                              src={t.thumbnailBase64}
                              alt="Thumbnail"
                              className="w-16 h-12 object-contain bg-white border border-gray-200 rounded shrink-0 p-1"
                            />
                          )}
                          <div>
                            <span className="font-bold text-gray-800 flex items-center gap-2">
                              {t.partName}
                            </span>
                            <div className="text-sm text-gray-500 mt-1">
                              Medida: {t.size} <br />
                              Qtd P/ Corte:{" "}
                              <span className="font-semibold text-gray-700">
                                {(t.totalQuantity || 0) - (t.cutQuantity || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => startTask(t)}
                          className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 font-semibold"
                        >
                          Iniciar Peça
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "FINISH_PACK") {
    const pack = activePacksList.find((p) => p.id === selectedPackId);
    if (!pack) {
      setView("LIST_ACTIVE");
      return null;
    }
    const task = db.nestTasks?.find((t) => t.id === (pack as any).taskId);

    return (
      <div className="p-4 flex flex-col h-full bg-slate-50">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              setView("LIST_ACTIVE");
              setSelectedPackId(null);
              setPackQuantity("");
            }}
            className="text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Finalizar Corte</h2>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-4">
            <span className="text-sm text-gray-500 block mb-1">
              Peça sendo cortada
            </span>
            <span className="font-bold text-lg text-gray-800">
              {(pack as any).partName || (pack as any).customProductName || "Avulso"}
            </span>
            {!(pack as any).taskId && (
              <span className="text-xs text-gray-500 block mt-1">
                Cliente / Lote: <strong className="text-slate-800">{(pack as any).thirdPartyName || "Não Especificado"}</strong>
              </span>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade Cortada NESTA SESSÃO
            </label>
            <input
              type="number"
              value={packQuantity}
              onChange={(e) => setPackQuantity(Number(e.target.value))}
              placeholder="Ex: 50"
              className="border border-gray-300 p-3 rounded-lg w-full text-lg focus:outline-blue-500 bg-white"
            />
            {task && (
              <p className="text-xs text-gray-500 mt-2">
                Máximo permitido para completar a tarefa:{" "}
                {task.totalQuantity - task.cutQuantity}
              </p>
            )}
          </div>

          <button
            onClick={() => finishTask()}
            className="w-full bg-slate-600 text-white py-3 rounded-lg font-bold text-base hover:bg-slate-700 mb-3 transition shadow"
          >
            Confirmar Corte (Sem etiqueta)
          </button>

          {/* Funcionalidade 4 Button for Corte Laser */}
          <button
            onClick={() => {
              setQtdCaixas("");
              setItensPorCaixa("");
              setPropriaEmbalagem(false);
              setQtdDireta(String(packQuantity || ""));
              setShowPopupCaixas(true);
            }}
            className="w-full bg-amber-600 font-bold text-white py-3 rounded-lg hover:bg-amber-700 uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow transition"
          >
            <span>🏷️</span> Finalizar com Etiqueta & QR Code
          </button>
        </div>

        {/* POPUP DE CAIXAS DA FUNCIONALIDADE 4 PARA CORTE LASER */}
        {showPopupCaixas && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-left border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 text-slate-800 my-auto max-h-[92vh] overflow-y-auto scrollbar-thin">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                  <span>📦</span> Cadastro de Embalagem & Caixas
                </h3>
                <button
                  onClick={() => setShowPopupCaixas(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                >
                  Fechar
                </button>
              </div>

              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex items-start gap-2.5">
                <span className="text-amber-500 text-lg">💡</span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Indique a quantidade de caixas embaladas e produtos por caixa.
                  Caso este item seja embalado de forma avulsa (a embalagem seja
                  o próprio produto), marque a opção abaixo.
                </p>
              </div>

              {/* Checkbox "O próprio produto é a embalagem" */}
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={propriaEmbalagem}
                  onChange={(e) => {
                    setPropriaEmbalagem(e.target.checked);
                    if (e.target.checked) {
                      setQtdDireta(String(packQuantity || ""));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-xs font-bold text-slate-700">
                  O próprio produto é a embalagem
                </span>
              </label>

              {!propriaEmbalagem ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Qtd de Caixas Embaladas *
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 5"
                      value={qtdCaixas}
                      onChange={(e) =>
                        setQtdCaixas(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      className="border border-slate-300 p-2.5 rounded-lg font-bold text-sm bg-white text-slate-900"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Produtos por Caixa *
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 24"
                      value={itensPorCaixa}
                      onChange={(e) =>
                        setItensPorCaixa(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      className="border border-slate-300 p-2.5 rounded-lg font-bold text-sm bg-white text-slate-900"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Quantidade Total Finalizada *
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 120"
                    value={qtdDireta}
                    onChange={(e) =>
                      setQtdDireta(e.target.value ? Number(e.target.value) : "")
                    }
                    className="border border-slate-300 p-2.5 rounded-lg font-bold text-sm bg-white text-slate-900"
                  />
                </div>
              )}

              {/* Live calculation banner */}
              {(() => {
                const total = propriaEmbalagem
                  ? Number(qtdDireta || 0)
                  : Number(qtdCaixas || 0) * Number(itensPorCaixa || 0);
                if (total > 0) {
                  return (
                    <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-3 rounded-lg border border-emerald-100 flex justify-between items-center">
                      <span>Total Calcular:</span>
                      <span className="text-sm bg-emerald-100 px-2 py-0.5 rounded">
                        {total} unidades
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              <button
                onClick={() => {
                  const total = propriaEmbalagem
                    ? Number(qtdDireta || 0)
                    : Number(qtdCaixas || 0) * Number(itensPorCaixa || 0);
                  const embalagemTexto = propriaEmbalagem
                    ? "O próprio produto é a embalagem"
                    : `${qtdCaixas} caixa(s) c/ ${itensPorCaixa} pçs cada`;

                  if (total <= 0) {
                    alert("Indique valores válidos para finalizar!");
                    return;
                  }

                  const nomeProd =
                    (pack as any).partName ||
                    (pack as any).customProductName ||
                    "Peça Corte Laser";
                  const now = new Date();
                  const dataHoraStr =
                    now.toLocaleDateString("pt-BR") +
                    " " +
                    now.toLocaleTimeString("pt-BR").substring(0, 5);

                  setEtiquetaGerada({
                    nome: `${nomeProd} (Corte Laser)`,
                    total,
                    embalagens: embalagemTexto,
                    dataHoraStr,
                    qrData: `PROD: ${nomeProd} | QTD: ${total} | EMB: ${embalagemTexto} | DATE: ${dataHoraStr}`,
                    operador: currentUser.name,
                  });

                  // Commit the session package with custom quantity!
                  finishTask(total);
                  setShowPopupCaixas(false);
                }}
                className="bg-indigo-600 text-white font-bold p-3 rounded-lg hover:bg-indigo-700 transition tracking-wider text-xs uppercase text-center mt-2 flex items-center justify-center gap-2 shadow"
              >
                <span>🏷️ Gerar Etiqueta & Finalizar</span>
              </button>
            </div>
          </div>
        )}

        {/* VISUALIZAÇÃO DA ETIQUETA FORMATO 10x5 CM DA FUNCIONALIDADE 4 PARA CORTE LASER */}
        {etiquetaGerada && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-100 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 text-slate-800 my-auto max-h-[92vh] overflow-y-auto scrollbar-thin">
              <div className="w-full border-b pb-3 flex justify-between items-center">
                <h3 className="font-extrabold text-base text-gray-800">
                  ✓ Produção Gravada & Etiqueta Pronta
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  Salvo com Sucesso
                </span>
              </div>

              {/* Printable Area - styled explicitly in 10cm x 5cm proportions */}
              <div
                id="etiqueta-print-box-laser"
                className="w-[378px] h-[189px] bg-white border-2 border-solid border-black p-4 flex justify-between select-none relative font-sans text-black"
              >
                <div className="flex flex-col justify-between h-full text-left max-w-[230px]">
                  <div>
                    <div className="text-[9px] font-extrabold uppercase bg-black text-white px-1.5 py-0.5 w-max tracking-wide">
                      ETIQUETA DE PROCESSO
                    </div>
                    <h4 className="font-extrabold text-sm text-black mt-1.5 leading-tight uppercase line-clamp-2">
                      {etiquetaGerada.nome}
                    </h4>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="text-xs font-semibold">
                      Qtd Total:{" "}
                      <strong className="text-sm font-black">
                        {etiquetaGerada.total} un
                      </strong>
                    </div>
                    <div className="text-[10px] font-bold text-gray-700">
                      Embalagem: {etiquetaGerada.embalagens}
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono mt-1">
                      Lançamento: {etiquetaGerada.dataHoraStr}
                    </div>
                    <div className="text-[8px] text-gray-400 font-semibold">
                      Operador: {etiquetaGerada.operador}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-1">
                  <SVGQRCode data={etiquetaGerada.qrData} />
                  <span className="text-[8px] font-bold font-mono text-gray-400">
                    RASTREABILIDADE
                  </span>
                </div>
              </div>

              <div className="w-full flex justify-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="layout_mode_laser"
                    value="THERMAL"
                    checked={etiquetaLayout === "THERMAL"}
                    onChange={() => setEtiquetaLayout("THERMAL")}
                    className="w-4 h-4 text-indigo-600"
                  />
                  Térmica (10x5cm)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="layout_mode_laser"
                    value="A4"
                    checked={etiquetaLayout === "A4"}
                    onChange={() => setEtiquetaLayout("A4")}
                    className="w-4 h-4 text-indigo-600"
                  />
                  Folha A4
                </label>
              </div>

              <div className="flex gap-3 w-full border-t pt-4">
                <button
                  onClick={() => {
                    const printBox = document.getElementById(
                      "etiqueta-print-box-laser",
                    );
                    if (printBox) {
                      import("./printUtils").then(({ printHtml }) => {
                        const styleBlock =
                          etiquetaLayout === "A4"
                            ? `
                          @page { size: A4 portrait; margin: 0.5cm; }
                          body { margin: 0; background: #fff; }
                          #print-wrapper { width: 10cm; height: 5cm; border: 1px solid #000; box-sizing: border-box; padding: 15px; display: flex; justify-content: space-between; font-family: sans-serif; position: relative; }
                        `
                            : `
                          @page { size: 10cm 5cm; margin: 0; }
                          body { margin: 0; background: #fff; width: 10cm; height: 5cm; display: flex; justify-content: center; align-items: center; }
                          #print-wrapper { width: 100%; height: 100%; box-sizing: border-box; padding: 15px; display: flex; justify-content: space-between; font-family: sans-serif; border: 2px solid #000; }
                        `;

                        printHtml(
                          `
                          <style>${styleBlock}</style>
                          <div id="print-wrapper">
                            ${printBox.innerHTML}
                          </div>
                        `,
                          etiquetaLayout,
                        );
                      });
                    }
                  }}
                  className="bg-slate-800 text-white font-bold p-3 rounded-lg hover:bg-slate-900 transition flex-1 flex items-center justify-center gap-2 text-sm uppercase shadow"
                >
                  <span>🖨️ Imprimir Etiqueta</span>
                </button>
                <button
                  onClick={() => {
                    setEtiquetaGerada(null);
                    setView("LIST_ACTIVE");
                  }}
                  className="bg-emerald-600 text-white font-bold p-3 rounded-lg hover:bg-emerald-700 transition flex-1 text-center text-sm uppercase shadow"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-slate-50 p-3 w-full max-w-2xl mx-auto relative overflow-y-auto"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Header Widget */}
      <div className="flex items-center gap-2.5 md:gap-3 bg-gradient-to-r from-blue-600 to-indigo-500 p-3 md:p-4 rounded-xl text-white shadow-md mb-4 shrink-0">
        <Activity className="animate-pulse w-6 h-6 md:w-8 md:h-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base md:text-xl font-bold font-sans text-white leading-tight truncate">
            Produção - Máquina de Corte a Laser
          </h2>
          <p className="text-[10px] md:text-xs text-blue-100 font-mono truncate">
            Operador: {currentUser.name} | Setor Linha Laser Ativa
          </p>
        </div>
      </div>

      <ProductivityCard db={db} currentUser={currentUser} />

      {/* Apontamento de Paradas de Máquina */}
      <MachineStopWidget db={db} currentUser={currentUser} machineName="Corte a Laser" />

      {/* Offline Sync Status Banner */}
      {db.syncQueueCount !== undefined && (
        <div className="bg-emerald-50 border border-emerald-100 text-[#0f5132] px-4 py-2.5 rounded-xl flex items-center justify-between gap-4 shadow-2xs mb-4 text-xs font-bold flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${db.quotaExceeded ? "bg-rose-500" : "bg-emerald-500"} animate-pulse`}
            ></span>
            <span>
              {db.quotaExceeded
                ? "Sincronização em Pausa (Cota)"
                : "Sincronizado com o servidor principal"}
            </span>
          </div>

          {db.quotaExceeded ? (
            <div className="flex items-center gap-2 bg-rose-100/80 border border-rose-200 text-rose-950 px-3 py-1.5 rounded-lg text-[11px]">
              <span>⚠️</span>
              <span className="truncate">
                Limite de gravação diária atingido. Dados salvos localmente!
              </span>
              <button
                onClick={() => db.triggerSyncQueue?.(true)}
                className="bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded text-[9px] uppercase hover:bg-rose-700 transition"
              >
                Forçar Sincronização
              </button>
            </div>
          ) : db.syncQueueCount > 0 ? (
            <div className="flex items-center gap-2 bg-amber-150 border border-amber-300 text-amber-950 px-3 py-1.5 rounded-lg text-[11px] animate-pulse">
              <span>
                ⚡ {db.syncQueueCount} apontamento(s) guardados em fila
              </span>
              <button
                onClick={() => db.triggerSyncQueue?.(true)}
                className="bg-amber-600 text-white font-extrabold px-2.5 py-1 rounded text-[10px] uppercase hover:bg-amber-700 transition"
              >
                Sincronizar
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex-1 overflow-y-auto w-full pb-25">
        {/* RESUMO DIÁRIO */}
        <DailySummaryWidget db={db} currentUser={currentUser} />

        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 font-sans font-medium">
          <Activity size={18} /> Sua Produção em Andamento
        </h3>

        {activePacksList.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-center">
            <p className="text-gray-500 mb-2">
              Você não tem atividades em andamento.
            </p>
            <p className="text-sm text-gray-400">
              Clique no botão abaixo para iniciar um corte.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {(
              Object.entries(
                activePacksList.reduce(
                  (acc, p) => {
                    const task = p.taskId
                      ? db.nestTasks?.find((t) => t.id === p.taskId)
                      : null;
                    const nestName = task?.nestName
                      ? `NEST_${task.nestName}`
                      : `AVULSO_${p.id}`;
                    if (!acc[nestName])
                      acc[nestName] = {
                        isNest: !!task?.nestName,
                        rawNestName: task?.nestName,
                        packs: [],
                      };
                    acc[nestName].packs.push(p);
                    return acc;
                  },
                  {} as Record<
                    string,
                    { isNest: boolean; rawNestName?: string; packs: any[] }
                  >,
                ),
              ) as [
                string,
                { isNest: boolean; rawNestName?: string; packs: any[] },
              ][]
            ).map(([key, group]) => {
              if (group.isNest) {
                return (
                  <div
                    key={key}
                    className="bg-white p-4 sm:p-5 border-2 border-indigo-200 rounded-2xl shadow-sm flex flex-col gap-4 relative overflow-hidden transition hover:border-indigo-300"
                  >
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pl-2 border-b border-indigo-100 pb-3">
                      <div className="text-left">
                        <div className="text-[10px] tracking-wider uppercase bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded w-max mb-1 shadow-xs">
                          PLACA INTEIRA (LOTE)
                        </div>
                        <h4 className="font-extrabold text-indigo-900 text-lg">
                          {group.rawNestName}
                        </h4>
                        <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                          {group.packs.length} componentes pendentes nesta placa
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <button
                          onClick={() => {
                            const newName = prompt(
                              `Digite o novo nome para o Nesting "${group.rawNestName}":`,
                              group.rawNestName,
                            );
                            if (
                              newName &&
                              newName.trim() !== "" &&
                              newName.trim() !== group.rawNestName
                            ) {
                              const updated = (db.nestTasks || [])
                                .filter((t) => t.nestName === group.rawNestName)
                                .map((t) => ({
                                  ...t,
                                  nestName: newName.trim(),
                                }));
                              db.updateNestTasks(updated);
                              alert(
                                `Nesting renomeado para "${newName.trim()}" com sucesso.`,
                              );
                            }
                          }}
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer"
                        >
                          Renomear Nesting
                        </button>
                        <button
                          onClick={() =>
                            handleFinishNestBlock(
                              group.rawNestName!,
                              group.packs,
                            )
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md transition whitespace-nowrap self-start sm:self-auto cursor-pointer"
                        >
                          ✓ Concluir Lote (Placa Inteira)
                        </button>
                      </div>
                    </div>
                    <div className="pl-2 flex flex-col gap-2">
                      {group.packs.map((p) => {
                        const operator = db.users?.find(
                          (u) => u.id === p.operatorId,
                        );
                        const opRole =
                          operator?.role || currentUser.role || "CORTE_LASER";
                        const workingTimeHourStr = new Date(
                          calculateWorkingMillis(
                            p.startTime,
                            Date.now(),
                            opRole,
                          ),
                        )
                          .toISOString()
                          .substr(11, 8);
                        return (
                          <div
                            key={p.id}
                            className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex flex-wrap gap-1.5 items-center justify-between"
                          >
                            <div className="flex-1 min-w-[150px]">
                              <p className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                                {p.taskId
                                  ? (p as any).partName
                                  : "Desconhecido"}
                              </p>
                              <p className="text-[9px] text-slate-500 font-mono mt-0.5 font-bold">
                                ⏱️ ON: {workingTimeHourStr}
                              </p>
                            </div>
                            <div className="flex gap-2 items-center">
                              {p.taskId && (
                                <button
                                  onClick={() => {
                                    const task = db.nestTasks?.find((t) => t.id === p.taskId);
                                    if (task) {
                                      setEditingTask(task);
                                      setFormPartName(task.partName);
                                      setFormSize(task.size || "-");
                                      setFormTotalQty(task.totalQuantity.toString());
                                      setFormCutQty(task.cutQuantity.toString());
                                    }
                                  }}
                                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Editar Peça"
                                >
                                  <Pencil size={11} /> Editar
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Cancelar este item da placa? O tempo será descartado.",
                                    )
                                  )
                                    cancelActiveTask(p);
                                }}
                                className="text-[10px] bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPackId(p.id);
                                  setView("FINISH_PACK");
                                }}
                                className="text-[10px] bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg font-black transition cursor-pointer"
                              >
                                Finalizar Peça Separada
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // AVULSO ou SEM NEST
              const p = group.packs[0];
              const operator = db.users?.find((u) => u.id === p.operatorId);
              const opRole =
                operator?.role || currentUser.role || "CORTE_LASER";
              const workingTimeHourStr = new Date(
                calculateWorkingMillis(p.startTime, Date.now(), opRole),
              )
                .toISOString()
                .substr(11, 8);

              return (
                <div
                  key={p.id}
                  className="bg-white p-6 border-2 border-slate-200 rounded-2xl shadow-sm flex flex-col gap-4 relative overflow-hidden transition hover:border-slate-300"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-slate-500"></div>

                  <div className="flex justify-between items-start pl-2">
                    <div className="text-left">
                      <div className="text-[10px] tracking-wider uppercase bg-slate-100 border border-slate-200 text-slate-600 font-extrabold px-2.5 py-0.5 rounded w-max mb-1.5 shadow-3xs">
                        Corte Avulso / Isolado
                      </div>
                      <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        {p.taskId && p.taskId > 0
                          ? (p as any).partName
                          : p.customProductName ||
                            p.thirdPartyName ||
                            "Item Avulso"}
                      </h4>
                      {!(p.taskId && p.taskId > 0) ? (
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          Cliente / Terceiro:{" "}
                          <span className="font-extrabold text-slate-700">
                            {p.thirdPartyName}
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          Item ID de Rastreio:{" "}
                          <span className="font-extrabold text-slate-700">
                            #{p.taskId}
                          </span>
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 py-1.5 px-3 rounded-lg border flex items-center gap-1.5 shadow-3xs">
                      ⏱️ {workingTimeHourStr}
                    </span>
                  </div>

                  <div className="flex gap-2 pl-2 border-t pt-4">
                    <>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Cancelar corte? Os registros de tempo serão descartados.",
                            )
                          ) {
                            cancelActiveTask(p);
                          }
                        }}
                        className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-3 rounded-xl text-xs font-extrabold transition uppercase flex-1 shadow-3xs border border-red-200 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPackId(p.id);
                          setView("FINISH_PACK");
                        }}
                        className="bg-slate-700 text-white hover:bg-slate-900 px-5 py-3 rounded-xl text-xs font-black shadow-md transition uppercase tracking-wider flex-1 text-center cursor-pointer"
                      >
                        Finalizar Corte
                      </button>
                    </>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md p-2.5 md:p-3.5 border-t border-slate-200 shadow-xl flex gap-3 z-30 justify-between -mx-3 mt-auto shrink-0 animate-in slide-in-from-bottom-2 duration-150">
        <button
          onClick={() => setView("MANUAL_PRODUCTION")}
          className="bg-slate-100 text-slate-700 font-extrabold py-2.5 px-4 md:py-3.5 md:px-6 rounded-xl md:rounded-2xl flex-1 shadow-sm hover:bg-slate-200 transition text-[11px] md:text-xs uppercase tracking-wider cursor-pointer"
        >
          Corte Avulso
        </button>
        <button
          onClick={() => setView("NEW_PACK")}
          className="bg-indigo-600 text-white font-black py-2.5 px-4 md:py-3.5 md:px-6 rounded-xl md:rounded-2xl flex-[2] shadow-md hover:bg-indigo-700 flex items-center justify-center gap-2 text-[11px] md:text-xs uppercase tracking-wider transition cursor-pointer"
        >
          <span>🚀 INICIAR NOVO CORTE</span>
        </button>
      </div>

      {editingTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 flex flex-col gap-4 max-h-[90vh] overflow-hidden select-none animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Pencil size={18} className="text-indigo-600" />
                Editar Item do Corte
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
              <div className="border border-gray-200 p-3 rounded-lg flex flex-col gap-2.5 bg-gray-50/20 shrink-0">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block text-left">
                  Dados do Corte
                </span>
                <div className="text-left">
                  <label className="text-xs font-semibold text-gray-500 mb-0.5 block">
                    Nome da Peça
                  </label>
                  <input
                    value={formPartName}
                    onChange={(e) => setFormPartName(e.target.value)}
                    className="border border-gray-300 w-full p-2 rounded text-sm bg-white focus:outline-indigo-500"
                    placeholder="Ex: SUPORTE CENTRAL"
                  />
                </div>
                <div className="text-left">
                  <label className="text-xs font-semibold text-gray-500 mb-0.5 block">
                    Tamanho/Dimensão
                  </label>
                  <input
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className="border border-gray-300 w-full p-2 rounded text-sm bg-white focus:outline-indigo-500"
                    placeholder="Ex: 50 x 80 mm"
                  />
                </div>
                <div className="flex gap-2 text-left">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500 mb-0.5 block">
                      Qty. Total
                    </label>
                    <input
                      type="number"
                      value={formTotalQty}
                      onChange={(e) => setFormTotalQty(e.target.value)}
                      className="border border-gray-300 w-full p-2 rounded text-sm bg-white focus:outline-indigo-500"
                      placeholder="Ex: 15"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500 mb-0.5 block">
                      Qty. Cortado
                    </label>
                    <input
                      type="number"
                      value={formCutQty}
                      onChange={(e) => setFormCutQty(e.target.value)}
                      className="border border-gray-300 w-full p-2 rounded text-sm bg-white focus:outline-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t shrink-0">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditTask}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                ✓ Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
