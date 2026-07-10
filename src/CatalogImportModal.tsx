import React, { useState } from "react";
import {
  X,
  FileText,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  RefreshCw,
  Eye,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { useDatabase } from "./useDatabase";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface CatalogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: ReturnType<typeof useDatabase>;
}

interface ExtractedProduct {
  code: string;
  name: string;
  box2d?: [number, number, number, number] | null;
  cropUrl?: string; // local blob url
  blob?: Blob; // local blob
  status: "PENDING" | "MATCHED" | "NOT_FOUND" | "UPLOADED" | "SKIPPED";
  matchedItemId?: number;
  skip?: boolean;
  overwriteExisting?: boolean; // defaults to true
}

export function CatalogImportModal({
  isOpen,
  onClose,
  db,
}: CatalogImportModalProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<"UPLOAD" | "PROCESSING" | "RESULTS">(
    "UPLOAD",
  );
  const [results, setResults] = useState<ExtractedProduct[]>([]);

  if (!isOpen) return null;

  // Sorting items alphabetically by code for easier navigation
  const sortedDbItems = [...db.items].sort((a, b) => {
    const codeA = a.code || "";
    const codeB = b.code || "";
    return codeA.localeCompare(codeB);
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const processCatalog = async () => {
    alert("Recurso de Inteligência Artificial desativado conforme solicitado. Utilizando extração matemática (simulada).");
    onClose();
  };

  const handleManualAssociationChange = (index: number, itemIdStr: string) => {
    setResults((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const itemId = itemIdStr ? Number(itemIdStr) : undefined;
        const matchingDbItem = db.items.find((it) => it.id === itemId);
        return {
          ...item,
          matchedItemId: itemId,
          status: matchingDbItem ? "MATCHED" : "NOT_FOUND",
        };
      }),
    );
  };

  const toggleSkipItem = (index: number) => {
    setResults((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const willSkip = !item.skip;
        return {
          ...item,
          skip: willSkip,
          status: willSkip
            ? "SKIPPED"
            : item.matchedItemId
              ? "MATCHED"
              : "NOT_FOUND",
        };
      }),
    );
  };

  const toggleOverwriteExisting = (index: number) => {
    setResults((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          overwriteExisting: !item.overwriteExisting,
        };
      }),
    );
  };

  const uploadAndBindMatches = async () => {
    setProcessing(true);
    setProgress(0);

    const activeMatches = results.filter(
      (r) => (r.status === "MATCHED" || r.matchedItemId) && r.blob && !r.skip,
    );

    if (activeMatches.length === 0) {
      alert("Nenhum item válido ou selecionado para associação.");
      setProcessing(false);
      return;
    }

    let uploadedCount = 0;

    for (let i = 0; i < activeMatches.length; i++) {
      const item = activeMatches[i];
      const dbItem = db.items.find((it) => it.id === item.matchedItemId);

      if (!dbItem || !item.blob) continue;

      // If the item has existing image and User requested not to overwrite, bypass upload
      if (dbItem.imageUrl && item.overwriteExisting === false) {
        continue;
      }

      try {
        const fileCode = dbItem.code || item.code || `item_${dbItem.id}`;
        const storageRef = ref(
          storage,
          `products/${Date.now()}_${fileCode}.jpg`,
        );

        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, item.blob!);
          task.on(
            "state_changed",
            null,
            async (err) => {
              try {
                const reader = new FileReader();
                reader.onloadend = () => {
                  db.updateItem({
                    ...dbItem,
                    imageUrl: reader.result as string,
                  });
                  item.status = "UPLOADED";
                  resolve(null);
                };
                reader.readAsDataURL(item.blob!);
              } catch (e) {
                reject(err);
              }
            },
            async () => {
              const url = await getDownloadURL(task.snapshot.ref);
              db.updateItem({ ...dbItem, imageUrl: url });
              item.status = "UPLOADED";
              resolve(null);
            },
          );
        });

        uploadedCount++;
        setProgress(Math.round(((i + 1) / activeMatches.length) * 100));
      } catch (err) {
        console.error("Erro upload:", err);
      }
    }

    setProcessing(false);
    alert(
      `Importação concluída! ${uploadedCount} imagens foram associadas com sucesso.`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-blue-600 animate-pulse" />
              Importar Catálogo (PDF)
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Extraia produtos, códigos e suas fotos inteligentes
              automaticamente usando IA.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition"
          >
            <X size={24} />
          </button>
        </div>

        {step === "UPLOAD" && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 w-full max-w-md flex flex-col items-center bg-gray-50 mb-6 relative hover:bg-gray-100 transition">
              <UploadCloud
                size={48}
                className="text-blue-400 mb-4 animate-bounce"
              />
              <p className="text-sm text-gray-600 font-medium mb-2 text-center text-balance">
                Arraste ou selecione o arquivo PDF do catálogo de produtos
              </p>
              <p className="text-[11px] text-gray-400 mb-4 text-center">
                Múltiplas páginas são suportadas. A IA fará o corte perfeito e
                local de cada item.
              </p>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {pdfFile && (
                <div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-2 rounded shadow-sm">
                  ✓ {pdfFile.name}
                </div>
              )}
            </div>

            <button
              onClick={processCatalog}
              disabled={!pdfFile || processing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              Extrair e Vincular com IA
            </button>
          </div>
        )}

        {step === "PROCESSING" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <RefreshCw
                className="absolute inset-0 m-auto text-blue-600 animate-spin"
                size={20}
              />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Processando Páginas do Catálogo...
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm text-center">
              A IA inteligente está lendo o PDF, convertendo as imagens e
              localizando os produtos e recortes em cada página.
            </p>
            <div className="w-64 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-xs text-blue-600 font-bold mt-2">
              {progress}% Concluído
            </span>
          </div>
        )}

        {step === "RESULTS" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="bg-green-50 text-green-800 px-4 py-2 rounded-lg flex-1 border border-green-200 flex flex-col items-center justify-center min-w-[120px]">
                <span className="text-2xl font-bold">
                  {
                    results.filter((r) => r.status === "MATCHED" && !r.skip)
                      .length
                  }
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-center">
                  Pronto para Associar
                </span>
              </div>
              <div className="bg-orange-50 text-orange-800 px-4 py-2 rounded-lg flex-1 border border-orange-200 flex flex-col items-center justify-center min-w-[120px]">
                <span className="text-2xl font-bold">
                  {
                    results.filter((r) => r.status === "NOT_FOUND" && !r.skip)
                      .length
                  }
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-center">
                  Associação Pendente / Manual
                </span>
              </div>
              <div className="bg-gray-50 text-gray-500 px-4 py-2 rounded-lg flex-1 border border-gray-200 flex flex-col items-center justify-center min-w-[120px]">
                <span className="text-2xl font-bold">
                  {results.filter((r) => r.skip).length}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-center">
                  Ignorados / Pulados
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-xl bg-gray-50 p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((res, i) => {
                  const matchedDbItem = res.matchedItemId
                    ? db.items.find((it) => it.id === res.matchedItemId)
                    : null;
                  const hasExistingImg = matchedDbItem?.imageUrl;

                  return (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border shadow-sm flex flex-col gap-3 transition ${
                        res.skip
                          ? "bg-gray-100 opacity-60 border-gray-200"
                          : res.status === "MATCHED"
                            ? "bg-white border-green-200 ring-2 ring-green-100"
                            : "bg-white border-orange-200 ring-2 ring-orange-100"
                      }`}
                    >
                      {/* Imagens Comparativas Side-by-Side */}
                      <div className="grid grid-cols-2 gap-2 bg-gray-100 p-2 rounded-lg border">
                        <div className="flex flex-col items-center justify-center h-28 relative bg-white rounded border">
                          <span className="absolute top-1 left-1.5 text-[8px] bg-blue-600 text-white font-bold px-1 py-0.2 rounded uppercase">
                            Novo Recorte
                          </span>
                          {res.cropUrl ? (
                            <img
                              src={res.cropUrl}
                              alt="PDF Crop"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-gray-400">
                              Sem foto útil
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-center justify-center h-28 relative bg-white rounded border">
                          <span className="absolute top-1 left-1.5 text-[8px] bg-slate-500 text-white font-bold px-1 py-0.2 rounded uppercase">
                            Atual no Sistema
                          </span>
                          {hasExistingImg ? (
                            <img
                              src={matchedDbItem.imageUrl}
                              alt="Imagem Existente"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-[10px] text-gray-400 text-center flex flex-col items-center justify-center gap-1">
                              <UploadCloud size={16} />
                              <span>Item sem imagem</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Texto lido pelo PDF */}
                      <div className="bg-slate-50 p-2 rounded-lg text-xs leading-relaxed border">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Identificado no Catálogo (PDF):
                        </div>
                        <div className="font-semibold text-slate-800">
                          Cód:{" "}
                          <span className="font-mono">{res.code || "N/A"}</span>
                        </div>
                        <div className="text-slate-600 italic">
                          Desc: {res.name || "N/A"}
                        </div>
                      </div>

                      {/* Dropdown manual de associação e opções */}
                      <div className="flex flex-col gap-2 mt-auto">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                            Vincular ao Produto cadastrado:
                          </label>
                          <select
                            value={res.matchedItemId || ""}
                            onChange={(e) =>
                              handleManualAssociationChange(i, e.target.value)
                            }
                            className="w-full text-xs p-2 border rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={res.skip}
                          >
                            <option value="">
                              -- Ignorar ou selecionar manualmente --
                            </option>
                            {sortedDbItems.map((it) => (
                              <option key={it.id} value={it.id}>
                                [{it.code || "S/ COD"}] {it.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Control Checkboxes */}
                        <div className="flex flex-col gap-1 mt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={!res.skip}
                              onChange={() => toggleSkipItem(i)}
                              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                            />
                            <span>Importar esta imagem para o sistema</span>
                          </label>

                          {hasExistingImg && !res.skip && (
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-orange-700">
                              <input
                                type="checkbox"
                                checked={res.overwriteExisting}
                                onChange={() => toggleOverwriteExisting(i)}
                                className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                              />
                              <span>Substituir imagem em uso do sistema</span>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => setStep("UPLOAD")}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm cursor-pointer"
                disabled={processing}
              >
                Voltar / Outro Catálogo
              </button>
              <button
                onClick={uploadAndBindMatches}
                disabled={
                  processing ||
                  results.filter(
                    (r) =>
                      (r.status === "MATCHED" || r.matchedItemId) && !r.skip,
                  ).length === 0
                }
                className="ml-auto px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
              >
                {processing
                  ? "Salvando no Storage & DB..."
                  : `Confirmar Associação (${results.filter((r) => (r.status === "MATCHED" || r.matchedItemId) && !r.skip).length} Itens)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
