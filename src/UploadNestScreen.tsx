import React, { useRef, useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Plus,
  Pencil,
  Save,
  X,
  History,
  Clock,
  FileUp,
  Clipboard,
  Sparkles,
  Check,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Camera,
  Image as ImageIcon,
  ClipboardPaste,
  Link,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, NestTask, ProductionLog } from "./types";
import { normalizeString } from "./searchUtils";

export function UploadNestScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingTask, setEditingTask] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [historyTask, setHistoryTask] = useState<NestTask | null>(null);

  const [isUploadBoxOpen, setIsUploadBoxOpen] = useState(false);

  // States to link a nest or specific task to a production batch / PCP plan
  const [linkingTask, setLinkingTask] = useState<any | null>(null);
  const [linkingNestName, setLinkingNestName] = useState<string | null>(null);

  const [formPartName, setFormPartName] = useState("");
  const [formNestName, setFormNestName] = useState("");
  const [formSize, setFormSize] = useState("");
  const [formTotalQty, setFormTotalQty] = useState("");
  const [formCutQty, setFormCutQty] = useState("");
  const [manualNestParts, setManualNestParts] = useState<
    {
      partName: string;
      size: string;
      totalQuantity: number;
      thumbnailBase64?: string;
    }[]
  >([]);

  // New state for AI drag-drop and clipboard paste
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const activePasteTargetRef = useRef<{type: "preview" | "manual", index?: number} | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // States for IA preview and validation (specifically requested for Marcos)
  const [previewTasks, setPreviewTasks] = useState<any[] | null>(null);
  const [previewNestName, setPreviewNestName] = useState<string>("");
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);

  // Marcos camera & upload states
  const [selectedPieceImage, setSelectedPieceImage] = useState<string | null>(
    null,
  );
  const [cameraTarget, setCameraTarget] = useState<{
    type: "manual" | "preview";
    index?: number;
  } | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);

  const startCamera = async (target: {
    type: "manual" | "preview";
    index?: number;
  }) => {
    setCameraTarget(target);
    setIsCameraActive(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Erro ao acessar câmera:", err);
      setCameraError(
        "Não foi possível acessar a câmera (webcam) diretamente neste navegador. Por favor, utilize o botão 'Tirar Foto com Aparelho' ou 'Selecionar do Arquivo'.",
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
    setCameraTarget(null);
  };

  const processImageFile = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // max dimension

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL("image/jpeg", 0.6); // Compress
          callback(base64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      let width = videoRef.current.videoWidth || 640;
      let height = videoRef.current.videoHeight || 480;

      const maxDim = 800;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.6);
        if (cameraTarget?.type === "manual") {
          setSelectedPieceImage(base64);
        } else if (
          cameraTarget?.type === "preview" &&
          cameraTarget.index !== undefined
        ) {
          updatePreviewTask(cameraTarget.index, "thumbnailBase64", base64);
        }
        stopCamera();
      }
    }
  };

  const handleNativeCameraCapture = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0], (base64) => {
        if (cameraTarget?.type === "manual") {
          setSelectedPieceImage(base64);
        } else if (
          cameraTarget?.type === "preview" &&
          cameraTarget.index !== undefined
        ) {
          updatePreviewTask(cameraTarget.index, "thumbnailBase64", base64);
        }
      });
    }
    setIsCameraActive(false);
    setCameraTarget(null);
  };

  // Capture pasting screenshots (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob, (base64) => {
              const target = activePasteTargetRef.current;
              if (target?.type === "manual") {
                setSelectedPieceImage(base64);
              } else if (target?.type === "preview" && target.index !== undefined) {
                // Here we call setPreviewTasks through a setState callback to get latest state
                setPreviewTasks(prev => {
                  if (!prev) return prev;
                  const updated = [...prev];
                  updated[target.index!] = { ...updated[target.index!], thumbnailBase64: base64 };
                  return updated;
                });
              } else {
                setPastedImage(base64);
              }
              activePasteTargetRef.current = null; // reset after paste
            });
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleUploadFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    await handleUploadFile(file);
    if (e.target) e.target.value = ""; // inline element reset
  };

  const handleUploadFile = async (file: File) => {
    // Fully reset parser and upload states
    setIsUploading(true);
    setPastedImage(null);
    setPreviewTasks(null);
    setPreviewNestName("");
    setPreviewThumbnail(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("[Nesting Extração] Enviando para rota IA:", file.name);
      const response = await fetch("/api/extract-nesting-ai", {
        method: "POST",
        body: formData,
      });

      let data: any = {};
      let responseText = "";
      try {
        responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch (jsonErr) {
        console.error("Erro ao decodificar JSON de nesting:", jsonErr);
        if (
          response.status === 504 ||
          response.status === 502 ||
          response.status === 503 ||
          (responseText &&
            (responseText.toLowerCase().includes("timeout") ||
              responseText.toLowerCase().includes("<html") ||
              responseText.toLowerCase().includes("service unavailable") ||
              responseText.toLowerCase().includes("indisponível")))
        ) {
          data = {
            success: false,
            error: "Limite de tempo excedido (Timeout) ou Servidor Temporariamente Indisponível. O arquivo PDF ou imagem é muito pesado ou o servidor levou mais de 10 segundos para responder. Por favor, tente novamente com uma imagem menor ou utilize a Adição Manual para cadastrar as peças sem bloqueio.",
          };
        } else {
          data = {
            success: false,
            error: "Resposta em formato inválido recebida da IA.",
          };
        }
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro desconhecido na extração IA.");
      }

      const parsedTasks = data.tasks || [];
      if (parsedTasks.length > 0) {
        if (data.warning) {
          alert("⚠️ " + data.warning);
        }
        const newTasks = parsedTasks.map((t: any, index: number) => ({
          partName: t.partName || "Sem nome",
          size: t.size || "-",
          totalQuantity: Number(t.totalQuantity) || 1,
          cutQuantity: 0,
          nestName: file.name,
          sequence: index + 1,
          status: "PENDENTE",
          isActive: true,
          createdAt: Date.now(),
          thumbnailBase64: t.thumbnailBase64 || undefined,
        }));

        setPreviewTasks(newTasks);
        setPreviewNestName(file.name);
        setPreviewThumbnail(null);
      } else {
        alert(
          "A IA processou o arquivo, mas não detectou nenhuma tabela de peças ou quantidades válidas.",
        );
      }
    } catch (e: any) {
      console.error(e);
      const errStr = String(e?.message || e || "").toLowerCase();
      const isDunningError = errStr.includes("dunning") || errStr.includes("pendência financeira") || errStr.includes("deny for project") || errStr.includes("permission_denied");
      
      if (isDunningError) {
        alert(
          "⚠️ INTEGRAÇÃO COM IA INDISPONÍVEL TEMPORARIAMENTE\n\n" +
          "A conta do Google Cloud possui uma pendência financeira pendente de sincronização automática (Dunning Decision Deny).\n\n" +
          "Como você realizou o pagamento recentemente, o Google Cloud pode levar de 2 a 24 horas para processar e atualizar o status da conta para restabelecer o acesso das APIs.\n\n" +
          "Não se preocupe! O sistema continuará funcionando perfeitamente. Vamos abrir o formulário de ADIÇÃO MANUAL agora mesmo para que você cadastre as peças do seu Nesting sem qualquer bloqueio!"
        );
        setIsAdding(true);
      } else {
        alert("Falha ao analisar arquivo: " + e.message);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleProcessPastedImage = async () => {
    if (!pastedImage) return;
    setIsUploading(true);

    try {
      const response = await fetch("/api/extract-nesting-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedImage }),
      });

      let data: any = {};
      let responseText = "";
      try {
        responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch (jsonErr) {
        console.error("Erro ao decodificar JSON de imagem colada:", jsonErr);
        if (
          response.status === 504 ||
          response.status === 502 ||
          response.status === 503 ||
          (responseText &&
            (responseText.toLowerCase().includes("timeout") ||
              responseText.toLowerCase().includes("<html") ||
              responseText.toLowerCase().includes("service unavailable") ||
              responseText.toLowerCase().includes("indisponível")))
        ) {
          data = {
            success: false,
            error: "Limite de tempo excedido (Timeout) ou Servidor Temporariamente Indisponível. A imagem colada é muito pesada ou o servidor levou mais de 10 segundos para responder. Por favor, tente novamente com um print menor ou utilize a Adição Manual para cadastrar as peças sem bloqueio.",
          };
        } else {
          data = {
            success: false,
            error: "Resposta em formato inválido recebida da IA.",
          };
        }
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao processar imagem colada.");
      }

      const parsedTasks = data.tasks || [];
      if (parsedTasks.length > 0) {
        if (data.warning) {
          alert("⚠️ " + data.warning);
        }
        const nestNameString = `Print Colado (${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")})`;
        const newTasks = parsedTasks.map((t: any, index: number) => ({
          partName: t.partName || "Sem nome",
          size: t.size || "-",
          totalQuantity: Number(t.totalQuantity) || 1,
          cutQuantity: 0,
          nestName: nestNameString,
          sequence: index + 1,
          status: "PENDENTE",
          isActive: true,
          createdAt: Date.now(),
          thumbnailBase64: t.thumbnailBase64 || pastedImage,
        }));

        setPreviewTasks(newTasks);
        setPreviewNestName(nestNameString);
        setPreviewThumbnail(pastedImage);
        setPastedImage(null);
      } else {
        alert(
          "Nenhum item válido identificado no print colado. Verifique se o print inclui a tabela ou rascunho de quantidades.",
        );
      }
    } catch (e: any) {
      console.error(e);
      const errStr = String(e?.message || e || "").toLowerCase();
      const isDunningError = errStr.includes("dunning") || errStr.includes("pendência financeira") || errStr.includes("deny for project") || errStr.includes("permission_denied");
      
      if (isDunningError) {
        alert(
          "⚠️ INTEGRAÇÃO COM IA INDISPONÍVEL TEMPORARIAMENTE\n\n" +
          "A conta do Google Cloud possui uma pendência financeira pendente de sincronização automática (Dunning Decision Deny).\n\n" +
          "Como você realizou o pagamento recentemente, o Google Cloud pode levar de 2 a 24 horas para processar e atualizar o status da conta para restabelecer o acesso das APIs.\n\n" +
          "Não se preocupe! O sistema continuará funcionando perfeitamente. Vamos abrir o formulário de ADIÇÃO MANUAL agora mesmo para que você cadastre as peças do seu Nesting sem qualquer bloqueio!"
        );
        setIsAdding(true);
      } else {
        alert("Falha no processamento: " + e.message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleClipboardRead = async (target?: {type: "preview" | "manual", index?: number}) => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        if (target) activePasteTargetRef.current = target;
        alert("A leitura pelo navegador está bloqueada neste ambiente fechado.\n\nPara colar sua imagem:\n1. Clique em OK para fechar este aviso\n2. Imediatamente aperte Ctrl+V (ou Command+V) no teclado");
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      let foundImage = false;
      for (const clipboardItem of clipboardItems) {
        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        for (const imageType of imageTypes) {
          const blob = await clipboardItem.getType(imageType);
          const file = new File([blob], "pasted.png", { type: imageType });
          processImageFile(file, (base64) => {
            if (target?.type === "manual") {
              setSelectedPieceImage(base64);
            } else if (target?.type === "preview" && target.index !== undefined) {
              setPreviewTasks(prev => {
                if (!prev) return prev;
                const updated = [...prev];
                updated[target.index!] = { ...updated[target.index!], thumbnailBase64: base64 };
                return updated;
              });
            } else {
              setPastedImage(base64);
            }
          });
          foundImage = true;
          break;
        }
        if (foundImage) break;
      }
      if (!foundImage) {
        alert("Nenhuma imagem encontrada na área de transferência. Tire um print primeiro.");
      }
    } catch (err: any) {
      console.warn("Erro ao ler área de transferência interceptado (esperado caso bloqueado):", err);
      if (target) activePasteTargetRef.current = target;
      alert("A leitura pelo navegador foi bloqueada.\n\nPara colar sua imagem:\n1. Clique em OK para fechar este aviso\n2. Imediatamente aperte Ctrl+V (ou Command+V) no teclado");
    }
  };

  const updatePreviewTask = (index: number, field: string, value: any) => {
    if (!previewTasks) return;
    const updated = [...previewTasks];
    updated[index] = { ...updated[index], [field]: value };
    setPreviewTasks(updated);
  };

  const removePreviewTask = (index: number) => {
    if (!previewTasks) return;
    const updated = previewTasks.filter((_, idx) => idx !== index);
    setPreviewTasks(updated.length > 0 ? updated : null);
  };

  const addPreviewTaskRow = () => {
    if (!previewTasks) return;
    setPreviewTasks([
      ...previewTasks,
      {
        partName: "",
        size: "-",
        totalQuantity: 1,
        cutQuantity: 0,
        nestName: previewNestName,
        sequence: previewTasks.length + 1,
        status: "PENDENTE",
        isActive: true,
        createdAt: Date.now(),
        thumbnailBase64: previewThumbnail || undefined,
      },
    ]);
  };

  const openEdit = (t: NestTask) => {
    setEditingTask(t);
    setIsAdding(false);
    setHistoryTask(null);
    setFormPartName(t.partName);
    setFormSize(t.size);
    setFormTotalQty(t.totalQuantity.toString());
    setFormCutQty(t.cutQuantity.toString());
    setFormNestName(t.nestName || "");
    setSelectedPieceImage(t.thumbnailBase64 || null);
  };

  const openAdd = () => {
    setEditingTask(null);
    setIsAdding(true);
    setHistoryTask(null);
    setFormNestName("");
    setFormPartName("");
    setFormSize("");
    setFormTotalQty("");
    setFormCutQty("0");
    setManualNestParts([]);
    setSelectedPieceImage(null);
  };

  const openHistory = (t: NestTask) => {
    setHistoryTask(t);
    setIsAdding(false);
    setEditingTask(null);
  };

  const handleDeleteNest = async (nestName: string, items: NestTask[]) => {
    if (
      confirm(
        `Deseja realmente excluir o nesting "${nestName}" e todas as suas ${items.length} peças?`,
      )
    ) {
      await Promise.all(items.map((t) => db.deleteNestTask(t.id)));
      alert("Nesting excluído com sucesso.");
    }
  };

  const handleConcluirNest = (nestName: string, items: NestTask[]) => {
    if (
      !confirm(
        `Deseja concluir o Nesting "${nestName}" inteiro? Todas as ${items.length} peças receberão status de CORTADO e entrarão no estoque intermediário.`,
      )
    ) {
      return;
    }

    const updatedTasks: NestTask[] = [];
    const stockUpdates: any[] = [];
    const stockMovements: any[] = [];
    const logUpdates: any[] = [];

    const now = Date.now();
    items.forEach((task) => {
      const newCut = task.totalQuantity;
      updatedTasks.push({
        ...task,
        cutQuantity: newCut,
        status: "CORTADO",
        completedAt: now,
        isActive: false,
      });

      const activePacks = db.activePacks.filter(
        (p: any) => p.taskId === task.id,
      );
      activePacks.forEach((p) => db.removeActivePack(p.id));

      const matchedItem = db.items?.find(
        (i) =>
          normalizeString(i.name) === normalizeString(task.partName) ||
          (i.code &&
            normalizeString(i.code) === normalizeString(task.partName)),
      );

      if (matchedItem) {
        const stockId = `${matchedItem.id}|-|-|-|INTERMEDIARIO`;
        // Need to sum updates multiple times if the same item exists multiple times in the nest
        let existingQty = 0;
        const alreadyUpdated = stockUpdates.find((s) => s.id === stockId);
        if (alreadyUpdated) {
          existingQty = alreadyUpdated.quantity;
        } else {
          const existingStock = db.stocks?.find((s) => s.id === stockId);
          existingQty = existingStock?.quantity || 0;
        }

        const existingIndex = stockUpdates.findIndex((s) => s.id === stockId);
        const newQty = existingQty + task.totalQuantity;

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
          quantity: task.totalQuantity,
          type: "ENTRADA",
          description: `Entrada por Corte Laser - Nest ${nestName}`,
        });
      }

      logUpdates.push({
        id: Date.now() + Math.random(),
        orderId: task.id,
        operatorId: currentUser.id,
        quantityCut: task.totalQuantity,
        type: "CORTE_LASER",
        timestamp: now,
        durationMillis: 0,
        nestedPartName: task.partName,
      });
    });

    db.updateNestTasks(updatedTasks);
    if (stockUpdates.length > 0) db.updateStocks(stockUpdates);
    stockMovements.forEach((m) => db.addStockMovement(m));
    if (logUpdates.length > 0) db.addLogs(logUpdates);

    db.addNotification({
      message: `Nesting: ${nestName} concluído integralmente por ${currentUser.name}. Estoque atualizado!`,
      read: false,
    });

    alert(`Nesting "${nestName}" concluído e estoque atualizado com sucesso!`);
  };

  const handleAddManualPiece = () => {
    if (!formPartName || !formTotalQty) {
      alert("Preencha o nome da peça e a quantidade total para incluí-la.");
      return;
    }
    setManualNestParts((prev) => [
      ...prev,
      {
        partName: formPartName,
        size: formSize || "-",
        totalQuantity: Number(formTotalQty),
        thumbnailBase64: selectedPieceImage || undefined,
      },
    ]);
    setFormPartName("");
    setFormSize("");
    setFormTotalQty("");
    setSelectedPieceImage(null);
  };

  const handleRemoveManualPiece = (index: number) => {
    setManualNestParts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (isAdding) {
      const tasksToSave: any[] = [];

      // 1. Add parts from the list
      manualNestParts.forEach((p) => {
        tasksToSave.push({
          partName: p.partName,
          size: p.size || "-",
          totalQuantity: p.totalQuantity,
          nestName: formNestName.trim() || "Adição Manual",
          thumbnailBase64: p.thumbnailBase64,
        });
      });

      // 2. Add current inputs if filled out
      if (formPartName && formTotalQty) {
        tasksToSave.push({
          partName: formPartName,
          size: formSize || "-",
          totalQuantity: Number(formTotalQty),
          nestName: formNestName.trim() || "Adição Manual",
          thumbnailBase64: selectedPieceImage || undefined,
        });
      }

      if (tasksToSave.length === 0) {
        alert("Adicione pelo menos uma peça/corte ou preencha o formulário.");
        return;
      }

      db.addNestTasks(tasksToSave);
      alert(
        `${tasksToSave.length} peça(s) adicionadas ao nesting manual com sucesso!`,
      );
    } else if (editingTask) {
      if (!formPartName || !formTotalQty) {
        alert("Preencha ao menos o nome da peça e a quantidade total.");
        return;
      }
      const updated = {
        ...editingTask,
        nestName: formNestName.trim() || editingTask.nestName,
        partName: formPartName,
        size: formSize,
        totalQuantity: Number(formTotalQty),
        cutQuantity: Number(formCutQty),
        isActive: Number(formCutQty) < Number(formTotalQty),
        thumbnailBase64: selectedPieceImage || undefined,
      };
      db.updateNestTasks([updated]);
    }
    closeForm();
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingTask(null);
    setHistoryTask(null);
    setManualNestParts([]);
    setSelectedPieceImage(null);
    stopCamera();
  };

  const [expandedNests, setExpandedNests] = useState<Record<string, boolean>>(
    {},
  );
  const [viewTab, setViewTab] = useState<
    "PLANEJAMENTO" | "PENDENTES" | "PRODUCAO" | "CORTADOS"
  >("PLANEJAMENTO");

  const toggleNest = (nestName: string) => {
    setExpandedNests((prev) => ({ ...prev, [nestName]: !prev[nestName] }));
  };

  const canEditNesting = () => {
    if (viewTab === "CORTADOS") {
      return currentUser.role === "GERENCIA" || currentUser.role === "ADMIN";
    }
    return (
      currentUser.role === "PROJETISTA" ||
      currentUser.role === "CORTE_LASER" ||
      currentUser.role === "GERENCIA" ||
      currentUser.role === "ADMIN"
    );
  };

  // Group by nest name
  const allTasks = db.nestTasks || [];

  const activeTaskIds = (db.activePacks || [])
    .filter((p) => p.type === "CORTE_LASER")
    .map((p: any) => p.taskId);

  // Planejamento = status === "PLANEJAMENTO"
  const planejamentoGroup = allTasks
    .filter((t) => t.status === "PLANEJAMENTO")
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    .reduce(
      (acc, t) => {
        if (!acc[t.nestName]) acc[t.nestName] = [];
        acc[t.nestName].push(t);
        return acc;
      },
      {} as Record<string, NestTask[]>,
    );

  // Pendentes = status === "PENDENTE" (liberado p/ corte)
  const pendentesGroup = allTasks
    .filter((t) => t.status === "PENDENTE" && !activeTaskIds.includes(t.id))
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    .reduce(
      (acc, t) => {
        if (!acc[t.nestName]) acc[t.nestName] = [];
        acc[t.nestName].push(t);
        return acc;
      },
      {} as Record<string, NestTask[]>,
    );

  // Em Produção = status === "EM_CORTE" ou ativo (e ainda não concluído)
  const emProducaoGroup = allTasks
    .filter(
      (t) =>
        (t.status === "EM_CORTE" || activeTaskIds.includes(t.id)) &&
        t.status !== "CORTADO" &&
        (t.cutQuantity || 0) < t.totalQuantity,
    )
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    .reduce(
      (acc, t) => {
        if (!acc[t.nestName]) acc[t.nestName] = [];
        acc[t.nestName].push(t);
        return acc;
      },
      {} as Record<string, NestTask[]>,
    );

  // Cortados = status === "CORTADO" ou quantidade cortada atingiu o total solicitado
  const cortadosGroup = allTasks
    .filter(
      (t) => t.status === "CORTADO" || (t.cutQuantity || 0) >= t.totalQuantity,
    )
    .sort((a, b) => {
      const timeA = a.completedAt || a.createdAt || 0;
      const timeB = b.completedAt || b.createdAt || 0;
      return timeB - timeA;
    })
    .reduce(
      (acc, t) => {
        if (!acc[t.nestName]) acc[t.nestName] = [];
        acc[t.nestName].push(t);
        return acc;
      },
      {} as Record<string, NestTask[]>,
    );

  const currentGroup =
    viewTab === "PLANEJAMENTO"
      ? planejamentoGroup
      : viewTab === "PENDENTES"
        ? pendentesGroup
        : viewTab === "PRODUCAO"
          ? emProducaoGroup
          : cortadosGroup;

  return (
    <div className="p-4 flex flex-col h-full bg-slate-50 relative">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex justify-between items-center">
        Tarefas de Nest
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition"
          title="Adicionar Manual"
        >
          <Plus size={20} />
        </button>
      </h2>

      {viewTab === "PLANEJAMENTO" && (
        <div className="mb-6 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => setIsUploadBoxOpen(!isUploadBoxOpen)}
            className="flex items-center justify-between w-full bg-white p-4 rounded-xl border border-indigo-200 hover:border-indigo-400 transition shadow-sm text-indigo-900 font-bold"
          >
            <span className="flex items-center gap-2">
              <Upload size={18} className="text-indigo-600" />
              Importar Arquivos de Nesting (PDF / Prints IA)
            </span>
            {isUploadBoxOpen ? (
              <ChevronUp size={20} className="text-indigo-600" />
            ) : (
              <ChevronDown size={20} className="text-indigo-600" />
            )}
          </button>

          {isUploadBoxOpen && (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`bg-white p-6 rounded-2xl border-2 border-dashed ${dragActive ? "border-emerald-500 bg-emerald-50/20" : "border-indigo-200 hover:border-indigo-400"} flex flex-col items-center justify-center text-center shadow-sm shrink-0 transition duration-150 animate-in slide-in-from-top-2 fade-in`}
            >
              {pastedImage ? (
                <div className="flex flex-col items-center gap-3 w-full max-w-md">
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm mb-1 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full animate-pulse">
                    <Sparkles size={14} />
                    Print de Nesting Colado do Clipboard!
                  </div>
                  <div className="relative w-full aspect-video bg-gray-50 rounded-xl overflow-hidden shadow-inner border border-gray-100 max-h-48 flex justify-center items-center">
                    <img
                      src={pastedImage}
                      alt="Pasted clipboard printscreen"
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={() => setPastedImage(null)}
                      className="absolute right-2 top-2 p-1.5 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition"
                      title="Descartar Print"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex gap-2 w-full mt-2">
                    <button
                      onClick={() => setPastedImage(null)}
                      className="flex-1 py-1.5 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      Descartar Print
                    </button>
                    <button
                      onClick={handleProcessPastedImage}
                      disabled={isUploading}
                      className="flex-1 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-lg transition shadow-sm animate-bounce"
                    >
                      {isUploading
                        ? "IA Analisando Print..."
                        : "Processar Print com IA"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3 shrink-0">
                    <Upload size={32} />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base leading-tight mb-1">
                    Planejamento Inteligente de Nesting (PCP / Proj.)
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md leading-relaxed mb-4">
                    Selecione o plano de corte (<strong>PDF</strong> ou{" "}
                    <strong>Imagem</strong>) ou apenas{" "}
                    <strong className="text-indigo-600 font-semibold underline">
                      tire um Print Screen
                    </strong>{" "}
                    da tela do seu software de Nesting e{" "}
                    <strong className="text-indigo-600 font-semibold underline">
                      pressione Ctrl+V
                    </strong>{" "}
                    para extrair as peças por Inteligência Artificial!
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf,image/*"
                    className="hidden"
                  />
                  <div className="flex gap-2.5 flex-wrap justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <FileUp size={14} />
                      {isUploading
                        ? "Processando..."
                        : "Subir Arquivo PDF / Imagem"}
                    </button>
                    <button
                      onClick={() => handleClipboardRead()}
                      className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm"
                      title="Colar Print Copiado da Área de Transferência (Ctrl+V)"
                    >
                      <ClipboardPaste size={14} className="text-emerald-600" />
                      <span>Colar da Área de Transferência</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap lg:flex-nowrap rounded-lg overflow-hidden border border-indigo-200 shrink-0">
        <button
          onClick={() => setViewTab("PLANEJAMENTO")}
          className={`flex-1 py-2 text-xs sm:text-sm font-semibold transition ${viewTab === "PLANEJAMENTO" ? "bg-indigo-800 text-white" : "bg-white text-indigo-800 border-r border-indigo-100"}`}
        >
          Planejamento (Projetista)
        </button>
        <button
          onClick={() => setViewTab("PENDENTES")}
          className={`flex-1 py-2 text-xs sm:text-sm font-semibold transition ${viewTab === "PENDENTES" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600"}`}
        >
          Filas Pendentes
        </button>
        <button
          onClick={() => setViewTab("PRODUCAO")}
          className={`flex-1 py-2 text-xs sm:text-sm font-semibold transition ${viewTab === "PRODUCAO" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 border-l border-r border-indigo-100"}`}
        >
          Em Produção
        </button>
        <button
          onClick={() => setViewTab("CORTADOS")}
          className={`flex-1 py-2 text-xs sm:text-sm font-semibold transition ${viewTab === "CORTADOS" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600"}`}
        >
          Histórico
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full pb-6">
        {Object.keys(currentGroup).length === 0 ? (
          <p className="text-gray-500 text-center mt-4">
            Nenhuma tarefa encontrada nesta aba.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.keys(currentGroup)
              .sort((a, b) => {
                if (viewTab === "CORTADOS") {
                  const maxTimeA = Math.max(...currentGroup[a].map(t => t.completedAt || t.createdAt || 0));
                  const maxTimeB = Math.max(...currentGroup[b].map(t => t.completedAt || t.createdAt || 0));
                  return maxTimeB - maxTimeA;
                }
                return b.localeCompare(a);
              })
              .map((nestName) => {
                const items = currentGroup[nestName];
                const isExpanded = expandedNests[nestName];

                return (
                  <div
                    key={nestName}
                    className="bg-white border text-left border-gray-200 rounded-lg shadow-sm overflow-hidden"
                  >
                    <div className="p-4 bg-indigo-50 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div
                        className="cursor-pointer select-none flex-1"
                        onClick={() => toggleNest(nestName)}
                      >
                        <h4 className="font-bold text-indigo-900 flex items-center gap-2 flex-wrap">
                          {nestName}
                          {(() => {
                            const linkedBatch = items.find((t) => t.batchId);
                            if (linkedBatch) {
                              const batch = db.productionBatches.find(
                                (b) => b.id === linkedBatch.batchId,
                              );
                              if (batch) {
                                return (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-extrabold border border-amber-200">
                                    Lote: {batch.name}
                                  </span>
                                );
                              }
                            }
                            return null;
                          })()}
                          {(() => {
                            const linkedPlan = items.find((t) => t.coilPlanId);
                            if (linkedPlan) {
                              const plan = db.coilCuttingPlans.find(
                                (p) => p.id === linkedPlan.coilPlanId,
                              );
                              if (plan) {
                                return (
                                  <span className="bg-teal-100 text-teal-850 text-[9px] px-1.5 py-0.5 rounded-full font-extrabold border border-teal-200">
                                    PCP: {plan.name}
                                  </span>
                                );
                              }
                            }
                            return null;
                          })()}
                        </h4>
                        <p className="text-xs text-indigo-700 mt-1">
                          {items.length} itens{" "}
                          {viewTab === "PENDENTES" || viewTab === "PLANEJAMENTO"
                            ? "pendentes"
                            : "concluídos"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-2 sm:mt-0">
                        {viewTab === "PLANEJAMENTO" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                confirm(
                                  `Deseja liberar o Nesting "${nestName}" para a fila do laser?`,
                                )
                              ) {
                                const updated = items.map((t) => ({
                                  ...t,
                                  status: "PENDENTE" as const,
                                }));
                                db.updateNestTasks(updated);
                                db.addNotification({
                                  message: `Nesting: ${nestName} | Status: Fila Pendente | Data/Hora: ${new Date().toLocaleString("pt-BR")} | Responsável: Marcos (Projetista)`,
                                  read: false,
                                });
                                alert(
                                  `Nesting "${nestName}" liberado com sucesso para a fila pendente!`,
                                );
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg transition shadow-sm cursor-pointer whitespace-nowrap"
                          >
                            Liberar Fila
                          </button>
                        )}
                        {canEditNesting() && (
                          <>
                            {(viewTab === "PENDENTES" ||
                              viewTab === "PRODUCAO") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConcluirNest(nestName, items);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg transition shadow-sm cursor-pointer whitespace-nowrap mr-3"
                              >
                                ✓ Concluir Nest Inteiro
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newName = prompt(
                                  `Digite o novo nome para o Nesting "${nestName}":`,
                                  nestName,
                                );
                                if (
                                  newName &&
                                  newName.trim() !== "" &&
                                  newName.trim() !== nestName
                                ) {
                                  const updated = items.map((t) => ({
                                    ...t,
                                    nestName: newName.trim(),
                                  }));
                                  db.updateNestTasks(updated);
                                  alert(
                                    `Nesting renomeado para "${newName.trim()}" com sucesso.`,
                                  );
                                }
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition mr-3 inline-block cursor-pointer"
                            >
                              Renomear Nesting
                            </button>
                             <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLinkingNestName(nestName);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition mr-3 inline-block cursor-pointer flex items-center gap-1"
                            >
                              <Link size={12} /> Vincular Nest a Lote/PCP
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNest(nestName, items);
                              }}
                              className="text-red-500 hover:text-red-700 font-semibold text-xs transition inline-block cursor-pointer"
                            >
                              Excluir Nesting
                            </button>
                          </>
                        )}
                        <span
                          className="text-indigo-500 font-bold text-xl cursor-pointer"
                          onClick={() => toggleNest(nestName)}
                        >
                          {isExpanded ? "−" : "+"}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 flex flex-col gap-3 bg-white">
                        {items.map((t) => (
                          <div
                            key={t.id}
                            className="border-b border-gray-100 last:border-0 pb-3 last:pb-0 flex justify-between items-center"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                {t.thumbnailBase64 && (
                                  <img
                                    src={t.thumbnailBase64}
                                    alt="Thumbnail"
                                    className="w-16 h-12 object-contain bg-white border border-gray-200 rounded shrink-0 p-1 cursor-pointer hover:border-indigo-400 transition"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFullSizeImage(
                                        t.thumbnailBase64 || null,
                                      );
                                    }}
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-gray-800">
                                      {t.partName}
                                    </h4>
                                    {canEditNesting() && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEdit(t);
                                          }}
                                          className="text-gray-400 hover:text-indigo-600 transition"
                                          title="Editar"
                                        >
                                          <Pencil size={14} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            db.deleteNestTask(t.id);
                                          }}
                                          className="text-red-400 hover:text-red-600 transition ml-2"
                                          title="Remover Peça"
                                        >
                                          <X size={16} />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openHistory(t);
                                      }}
                                      className="text-gray-400 hover:text-blue-600 transition ml-2"
                                      title="Ver Histórico"
                                    >
                                      <History size={16} />
                                    </button>
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    {t.size}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {t.batchId && (() => {
                                      const batch = db.productionBatches.find(b => b.id === t.batchId);
                                      return batch ? (
                                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                                          Lote: {batch.name}
                                        </span>
                                      ) : null;
                                    })()}
                                    {t.coilPlanId && (() => {
                                      const plan = db.coilCuttingPlans.find(p => p.id === t.coilPlanId);
                                      return plan ? (
                                        <span className="bg-teal-100 text-teal-850 px-1.5 py-0.5 rounded text-[10px] font-bold border border-teal-200">
                                          PCP: {plan.name}
                                        </span>
                                      ) : null;
                                    })()}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLinkingTask(t);
                                      }}
                                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer flex items-center gap-0.5"
                                    >
                                      <Link size={10} /> {t.batchId || t.coilPlanId ? "Alterar Vínculo" : "Vincular a Lote/PCP"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-semibold text-gray-500 mb-1">
                                CORTADO
                              </div>
                              <div className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                                <span className="font-bold text-gray-800">
                                  {t.cutQuantity || 0}
                                </span>{" "}
                                / {t.totalQuantity}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {(isAdding || editingTask || historyTask) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 flex flex-col gap-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-gray-800">
                {isAdding
                  ? "Adicionar Item p/ Corte"
                  : editingTask
                    ? "Editar Item do Corte"
                    : "Histórico de Produção"}
              </h3>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {historyTask ? (
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="mb-4">
                  <h4 className="font-bold text-gray-800">
                    {historyTask.partName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Adicionado em:{" "}
                    {historyTask.createdAt
                      ? new Date(historyTask.createdAt).toLocaleString("pt-BR")
                      : "Data não registrada"}
                  </p>
                </div>
                <h5 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2 border-b pb-1">
                  <Clock size={16} /> Registros de Corte
                </h5>
                <div className="flex flex-col gap-3">
                  {(db.logs || []).filter(
                    (l) =>
                      l.type === "CORTE_LASER" && l.orderId === historyTask.id,
                  ).length === 0 ? (
                    <p className="text-gray-500 text-sm text-center">
                      Nenhum corte registrado ainda.
                    </p>
                  ) : (
                    (db.logs || [])
                      .filter(
                        (l) =>
                          l.type === "CORTE_LASER" &&
                          l.orderId === historyTask.id,
                      )
                      .map((log) => {
                        const op = db.users.find(
                          (u) => u.id === log.operatorId,
                        );
                        return (
                          <div
                            key={log.id}
                            className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-1"
                          >
                            <div className="flex justify-between">
                              <span className="font-bold text-blue-900">
                                {log.quantityCut || 0} unid.
                              </span>
                              <span className="text-xs text-blue-700">
                                {new Date(log.timestamp).toLocaleString(
                                  "pt-BR",
                                )}
                              </span>
                            </div>
                            <span className="text-sm text-blue-800">
                              Op: {op?.name || log.operatorId}
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {isAdding && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">
                      Nome do Nesting{" "}
                      <span className="text-xs font-normal text-slate-400">
                        (Opcional)
                      </span>
                    </label>
                    <input
                      value={formNestName}
                      onChange={(e) => setFormNestName(e.target.value)}
                      placeholder="Ex: Avulsos Semanal ou Corte 001"
                      className="border border-gray-300 w-full p-2 rounded text-sm bg-slate-50 font-medium"
                    />
                  </div>
                )}

                {isAdding && manualNestParts.length > 0 && (
                  <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg flex flex-col gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block">
                      Peças incluídas neste Nesting ({manualNestParts.length}):
                    </span>
                    <div className="max-h-[140px] overflow-y-auto flex flex-col gap-1 pr-1">
                      {manualNestParts.map((p, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-xs bg-white border border-gray-150 p-2 rounded-md shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            {p.thumbnailBase64 && (
                              <img
                                src={p.thumbnailBase64}
                                alt="Miniatura"
                                className="w-8 h-8 object-contain bg-white border border-gray-200 rounded p-0.5 cursor-pointer hover:border-indigo-400 transition"
                                onClick={() =>
                                  setFullSizeImage(p.thumbnailBase64 || null)
                                }
                              />
                            )}
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-gray-800">
                                {p.partName}
                              </span>
                              <span className="text-[10px] text-gray-500 font-medium">
                                {p.size || "-"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-indigo-700 bg-indigo-100/75 px-2 py-0.5 rounded text-[10px]">
                              {p.totalQuantity} unid.
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveManualPiece(index)}
                              className="text-red-500 hover:text-red-700 font-bold px-1 py-0.5 rounded hover:bg-red-50 text-sm"
                              title="Remover"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border border-gray-200 p-3 rounded-lg flex flex-col gap-2.5 bg-gray-50/20 shrink-0">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block text-left">
                    {isAdding ? "Adicionar Peça / Corte" : "Dados do Corte"}
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
                    {!isAdding && (
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
                    )}
                  </div>

                  {/* Image asset uploader / camera photography container */}
                  <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-gray-150">
                    <label className="text-xs font-bold text-gray-500 block text-left">
                      Imagem / Desenho da Peça{" "}
                      <span className="text-slate-400 font-normal">
                        (Opcional)
                      </span>
                    </label>

                    {selectedPieceImage ? (
                      <div
                        className="relative w-full aspect-video bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center p-1.5 group cursor-pointer"
                        onClick={() => setFullSizeImage(selectedPieceImage)}
                      >
                        <img
                          src={selectedPieceImage}
                          alt="Foto da peça"
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/opacity-0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPieceImage(null);
                          }}
                          className="absolute right-1.5 top-1.5 p-1 bg-red-100 text-red-700 hover:bg-red-200 transition rounded-full shadow-xs cursor-pointer"
                          title="Remover desenho"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] text-slate-450 leading-relaxed">
                          Nenhuma imagem anexada.
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <label className="border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-bold py-1.5 px-2 rounded-lg transition text-[10px] text-center cursor-pointer flex items-center justify-center gap-1.5 leading-none shadow-3xs">
                        <ImageIcon size={12} />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              processImageFile(e.target.files[0], (base64) => {
                                setSelectedPieceImage(base64);
                              });
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => startCamera({ type: "manual" })}
                        className="border border-amber-200 bg-amber-50/40 hover:bg-amber-50 text-amber-700 font-bold py-1.5 px-2 rounded-lg transition text-[10px] flex items-center justify-center gap-1.5 leading-none shadow-3xs cursor-pointer"
                      >
                        <Camera size={12} />
                        <span>Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleClipboardRead({ type: "manual" })
                        }
                        title="Colar Copiado da Área de Transferência"
                        className="border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-700 font-bold py-1.5 px-2 rounded-lg transition text-[10px] flex items-center justify-center gap-1.5 leading-none shadow-3xs cursor-pointer"
                      >
                        <ClipboardPaste size={12} />
                        <span>Colar</span>
                      </button>
                    </div>
                  </div>

                  {isAdding && (
                    <button
                      type="button"
                      onClick={handleAddManualPiece}
                      className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition w-full cursor-pointer flex justify-center items-center gap-1.5"
                    >
                      <Plus size={14} />
                      Incluir Peça no Nesting
                    </button>
                  )}
                </div>
              </div>
            )}

            {!historyTask && (
              <button
                onClick={handleSave}
                className="bg-indigo-600 text-white font-bold p-3 rounded hover:bg-indigo-700 flex justify-center items-center gap-2 mt-2 shrink-0 shadow-sm"
              >
                <Save size={18} />{" "}
                {isAdding
                  ? `Salvar Nesting (${manualNestParts.length + (formPartName && formTotalQty ? 1 : 0)} peça(s))`
                  : "Salvar Alterações"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pop-up Modal for extracted NestTask review and validation (specifically requested for Marcos) */}
      {previewTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-indigo-950 text-white p-5 flex justify-between items-start shrink-0">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-900 border border-indigo-700 font-extrabold tracking-widest text-indigo-100 px-2.5 py-0.5 rounded uppercase flex items-center gap-1">
                    <Sparkles
                      size={10}
                      className="text-amber-400 animate-pulse"
                    />
                    Validação do Nesting por IA
                  </span>
                  {currentUser?.name && (
                    <span className="text-[10px] bg-emerald-800 text-emerald-50 px-2 py-0.5 rounded font-medium">
                      Usuário: {currentUser.name}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-xl leading-snug mt-1">
                  Revisar Extração de Peças
                </h3>
                <span className="text-xs text-indigo-100/90 font-medium">
                  Marcos, valide e ajuste as informações detectadas pela IA
                  antes de salvar na produção.
                </span>
              </div>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Deseja realmente cancelar a importação deste nesting?",
                    )
                  ) {
                    setPreviewTasks(null);
                  }
                }}
                className="bg-indigo-900/60 hover:bg-indigo-950 text-white p-2 rounded-full transition shrink-0 shadow-sm cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nest/Source summary block */}
            <div className="bg-slate-50 border-b border-gray-200 p-4 shrink-0 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3 w-full">
                {previewThumbnail ? (
                  <img
                    src={previewThumbnail}
                    alt="Nesting visual source"
                    className="w-16 h-12 object-contain bg-white border border-gray-200 rounded p-1 shrink-0"
                  />
                ) : (
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                    <FileText size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                    Origem do Nesting
                  </span>
                  <span className="text-sm font-extrabold text-slate-800 block truncate">
                    {previewNestName}
                  </span>
                </div>
              </div>

              {/* Summary stat cards */}
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-center flex-1 sm:flex-none sm:min-w-[100px]">
                  <span className="text-[9px] font-bold text-gray-400 block uppercase">
                    Peças
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    {previewTasks.length}
                  </span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-center flex-1 sm:flex-none sm:min-w-[100px]">
                  <span className="text-[9px] font-bold text-gray-400 block uppercase">
                    Total Unids
                  </span>
                  <span className="text-sm font-black text-indigo-600">
                    {previewTasks.reduce(
                      (sum, t) => sum + (Number(t.totalQuantity) || 0),
                      0,
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Content Table */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="bg-amber-50 border border-amber-200/60 p-3.5 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 mb-4">
                <AlertCircle
                  size={16}
                  className="shrink-0 text-amber-600 mt-0.5"
                />
                <div>
                  <span className="font-extrabold block mb-0.5">
                    Dica de Verificação:
                  </span>
                  <span>
                    Verifique se os nomes das peças e as quantidades estão
                    corretos. Toque nos campos abaixo para corrigir erros de
                    detecção da IA. Caso falte alguma peça, use o botão ao final
                    para inseri-la manualmente.
                  </span>
                </div>
              </div>

              {/* Table / List representation */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="bg-slate-100 px-4 py-2 text-slate-700 text-xs font-bold font-sans grid grid-cols-12 gap-3 border-b select-none shrink-0 border-slate-200">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-2 text-center">Desenho</div>
                  <div className="col-span-4">Nome da Peça</div>
                  <div className="col-span-2">Dimen./Espessura</div>
                  <div className="col-span-2 text-center">Quantidade</div>
                  <div className="col-span-1 text-center">Ação</div>
                </div>

                <div className="divide-y divide-slate-150 max-h-[45vh] overflow-y-auto">
                  {previewTasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 grid grid-cols-12 gap-3 items-center hover:bg-slate-50/55 transition"
                    >
                      <div className="col-span-1 text-center text-xs font-mono font-extrabold text-slate-400">
                        {idx + 1}
                      </div>

                      <div className="col-span-2 flex flex-col items-center justify-center gap-1">
                        {task.thumbnailBase64 ? (
                          <img
                            src={task.thumbnailBase64}
                            alt="Miniatura"
                            className="w-14 h-10 object-contain bg-white border border-slate-200 rounded p-0.5 cursor-pointer hover:border-indigo-400 transition"
                            onClick={() =>
                              setFullSizeImage(task.thumbnailBase64)
                            }
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">
                            Sem desenho
                          </span>
                        )}
                        <div className="flex gap-1.5 justify-center items-center">
                          <label className="text-[9px] text-indigo-600 hover:text-indigo-800 font-extrabold cursor-pointer hover:underline select-none">
                            Subir
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  processImageFile(
                                    e.target.files[0],
                                    (base64) => {
                                      updatePreviewTask(
                                        idx,
                                        "thumbnailBase64",
                                        base64,
                                      );
                                    },
                                  );
                                }
                              }}
                            />
                          </label>
                          <span className="text-[9px] text-slate-300 pointer-events-none select-none">
                            |
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              startCamera({ type: "preview", index: idx })
                            }
                            className="text-[9px] text-amber-600 hover:text-amber-800 font-extrabold cursor-pointer hover:underline select-none"
                          >
                            Foto
                          </button>
                          <span className="text-[9px] text-slate-300 pointer-events-none select-none">
                            |
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleClipboardRead({ type: "preview", index: idx })
                            }
                            title="Colar Área de Transferência"
                            className="text-[9px] text-emerald-600 hover:text-emerald-800 font-extrabold cursor-pointer hover:underline select-none"
                          >
                            Colar
                          </button>
                        </div>
                      </div>

                      <div className="col-span-4">
                        <input
                          type="text"
                          value={task.partName}
                          onChange={(e) =>
                            updatePreviewTask(idx, "partName", e.target.value)
                          }
                          placeholder="Ex: FIXADOR LATERAL"
                          className="w-full text-xs font-bold px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 bg-white"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="text"
                          value={task.size}
                          onChange={(e) =>
                            updatePreviewTask(idx, "size", e.target.value)
                          }
                          placeholder="Ex: 50x50 mm"
                          className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 bg-white"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={task.totalQuantity}
                          onChange={(e) =>
                            updatePreviewTask(
                              idx,
                              "totalQuantity",
                              Math.max(1, parseInt(e.target.value, 10) || 1),
                            )
                          }
                          className="w-full text-xs text-center font-bold px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 bg-white"
                        />
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => removePreviewTask(idx)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Remover peça"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add piece row helper */}
              <button
                onClick={addPreviewTaskRow}
                className="mt-3.5 flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition border border-indigo-100 border-dashed w-full cursor-pointer hover:border-indigo-300"
              >
                <Plus size={14} />
                Adicionar Nova Linha de Peça Manualmente
              </button>
            </div>

            {/* Footer */}
            <div className="bg-slate-100 px-5 py-4 border-t border-gray-200 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-[11px] text-gray-500 font-semibold">
                • Marcos, após revisar e ajustar tudo acima, clique para
                confirmar o lote na produção.
              </span>

              <div className="flex gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        "Deseja realmente descartar todos esses dados detectados?",
                      )
                    ) {
                      setPreviewTasks(null);
                    }
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold rounded-xl transition text-xs shadow-sm cursor-pointer"
                >
                  Descartar Tudo
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const validTasks = previewTasks.filter(
                      (t) => t.partName.trim() !== "",
                    );
                    if (validTasks.length === 0) {
                      alert("Insira ao menos um item de peça válido com nome!");
                      return;
                    }
                    try {
                      setIsUploading(true);
                      await db.addNestTasks(validTasks);
                      setPreviewTasks(null);
                      alert(
                        `Sucesso! Foram enfileiradas ${validTasks.length} tarefas de Nesting na produção.`,
                      );
                      setViewTab("PENDENTES");
                    } catch (err: any) {
                      alert("Erro ao salvar: " + err.message);
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                  className="flex-1 sm:flex-none px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  Confirmar e Criar Fila (
                  {previewTasks.filter((t) => t.partName.trim() !== "").length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden camera input for devices fallback/prompt */}
      <input
        type="file"
        ref={nativeCameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraCapture}
        className="hidden"
      />

      {/* Live Webcam Stream Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex flex-col items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg p-5 rounded-2xl flex flex-col gap-4 shadow-2xl relative text-white animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-extrabold flex items-center gap-2 border-b border-slate-800 pb-2.5 text-indigo-400 select-none">
              <Camera size={16} />
              Fotografar Peça ao Vivo (Marcos Projetista)
            </h3>

            {cameraError ? (
              <div className="bg-red-950/40 border border-red-900/50 text-red-300 p-4 rounded-xl text-xs flex flex-col gap-2.5">
                <p className="leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => {
                    nativeCameraInputRef.current?.click();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition text-xs shadow-md"
                >
                  Abrir Câmera do Aparelho (Celular/Tab)
                </button>
              </div>
            ) : (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2.5 left-2.5 bg-black/60 px-2.5 py-1 rounded text-[9px] uppercase font-bold tracking-wider text-slate-300 select-none border border-slate-800/80 animate-pulse">
                  Alinhe o desenho da peça na câmera
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-2 font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl transition text-xs shadow-md active:scale-95 cursor-pointer flex justify-center items-center gap-1.5"
                >
                  <Check size={14} />
                  Capturar Snapshot
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  nativeCameraInputRef.current?.click();
                }}
                className="flex-1 py-2 font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-xs shadow-sm border border-slate-700 cursor-pointer"
              >
                Foto com Celular (Nativa)
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="py-2 px-4 font-semibold text-slate-450 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-xl transition text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Size Image Viewer Modal */}
      {fullSizeImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer animate-in fade-in duration-200"
          onClick={() => setFullSizeImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition backdrop-blur-md cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setFullSizeImage(null);
              }}
              title="Fechar"
            >
              <X size={24} />
            </button>
            <img
              src={fullSizeImage}
              alt="Visualização da peça"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()} // Prevent close when clicking directly on image
            />
          </div>
        </div>
      )}

      {/* Linking Task or Nest to Batch / PCP Plan Modal */}
      {(linkingTask || linkingNestName) && (
        <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <Link size={20} className="text-indigo-600" />
                Vincular a Lote / Plano PCP
              </h3>
              <button
                onClick={() => {
                  setLinkingTask(null);
                  setLinkingNestName(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {linkingTask ? (
                  <>
                    Vincular a peça <strong className="text-indigo-900">{linkingTask.partName}</strong> (Tamanho: {linkingTask.size}) a um dos lotes ou planos disponíveis no sistema para acompanhar a produção.
                  </>
                ) : (
                  <>
                    Vincular todos os cortes do Nesting <strong className="text-indigo-900">{linkingNestName}</strong> a um lote de produção ou plano de PCP.
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Selecione um Lote de Produção
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500 font-medium font-mono"
                  defaultValue={linkingTask?.batchId || (linkingNestName ? (db.nestTasks.find(t => t.nestName === linkingNestName && t.batchId)?.batchId || "") : "")}
                  id="select-batch-link"
                >
                  <option value="">-- Nenhum Lote Selecionado --</option>
                  {(db.productionBatches || [])
                    .filter((b) => b.status !== "CONCLUIDO")
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        📦 Lote: {b.name} ({b.status})
                      </option>
                    ))}
                </select>
              </div>

              <div className="text-center font-extrabold text-[10px] text-slate-400 uppercase tracking-widest my-1">
                OU
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Selecione um Plano de PCP
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500 font-medium font-mono"
                  defaultValue={linkingTask?.coilPlanId || (linkingNestName ? (db.nestTasks.find(t => t.nestName === linkingNestName && t.coilPlanId)?.coilPlanId || "") : "")}
                  id="select-plan-link"
                >
                  <option value="">-- Nenhum Plano Selecionado --</option>
                  {(db.coilCuttingPlans || [])
                    .filter((p) => p.status !== "CONCLUIDO")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        ⚙️ PCP: {p.name} ({p.type} - {p.status})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-between items-center mt-4 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Tem certeza que deseja desvincular?")) {
                    if (linkingTask) {
                      db.updateNestTasks([{
                        ...linkingTask,
                        batchId: undefined,
                        coilPlanId: undefined
                      }]);
                    } else if (linkingNestName) {
                      const updated = (db.nestTasks || [])
                        .filter(t => t.nestName === linkingNestName)
                        .map(t => ({
                          ...t,
                          batchId: undefined,
                          coilPlanId: undefined
                        }));
                      db.updateNestTasks(updated);
                    }
                    setLinkingTask(null);
                    setLinkingNestName(null);
                    alert("Vínculo removido com sucesso!");
                  }
                }}
                className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer"
              >
                Remover Vínculo
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLinkingTask(null);
                    setLinkingNestName(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const batchSelect = document.getElementById("select-batch-link") as HTMLSelectElement;
                    const planSelect = document.getElementById("select-plan-link") as HTMLSelectElement;
                    const batchVal = batchSelect?.value ? parseInt(batchSelect.value, 10) : undefined;
                    const planVal = planSelect?.value ? parseInt(planSelect.value, 10) : undefined;

                    if (linkingTask) {
                      db.updateNestTasks([{
                        ...linkingTask,
                        batchId: batchVal,
                        coilPlanId: planVal
                      }]);
                    } else if (linkingNestName) {
                      const updated = (db.nestTasks || [])
                        .filter(t => t.nestName === linkingNestName)
                        .map(t => ({
                          ...t,
                          batchId: batchVal,
                          coilPlanId: planVal
                        }));
                      db.updateNestTasks(updated);
                    }

                    setLinkingTask(null);
                    setLinkingNestName(null);
                    alert("Vínculo salvo com sucesso!");
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md cursor-pointer"
                >
                  Confirmar Vínculo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
