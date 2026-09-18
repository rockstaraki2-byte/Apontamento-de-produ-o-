import React from "react";
import { Download, ExternalLink, Eye, X } from "lucide-react";

export function PdfPreviewModal({
  url,
  fileName,
  title,
  onClose,
}: {
  url: string;
  fileName: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[170] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
              <Eye size={15} />
              Prévia do relatório
            </h3>
            <p className="text-[10px] text-slate-500 truncate">
              {title} • o arquivo ainda não foi salvo no aparelho
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="h-8 px-3 border border-slate-300 bg-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 hover:bg-slate-100"
            >
              <ExternalLink size={13} />
              Nova aba
            </a>
            <a
              href={url}
              download={fileName}
              className="h-8 px-3 bg-blue-600 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 hover:bg-blue-700"
            >
              <Download size={13} />
              Salvar PDF
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200"
              aria-label="Fechar prévia"
            >
              <X size={17} />
            </button>
          </div>
        </div>
        <iframe
          title={title}
          src={url}
          className="w-full flex-1 bg-slate-100"
        />
      </div>
    </div>
  );
}
