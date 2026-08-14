import React, { useState } from "react";
import { ProductAttribute, COLOR_MAP } from "../types";
import { Image as ImageIcon, X } from "lucide-react";

export function getColorAttribute(
  colorStr: string | undefined | null,
  attributes: ProductAttribute[],
): ProductAttribute | null {
  if (!colorStr || colorStr === "-" || colorStr === "Sem Cor" || colorStr === "INDEFINIDA") {
    return null;
  }

  const normalized = colorStr.trim().toUpperCase();

  // 1. Direct match by value or code
  let found = attributes.find(
    (a) =>
      a.type === "COLOR" &&
      (a.value.toUpperCase() === normalized || (a.code && a.code.toUpperCase() === normalized)),
  );
  if (found) return found;

  // 2. Lookup in COLOR_MAP (numeric key to name)
  const mappedName = COLOR_MAP[colorStr];
  if (mappedName) {
    found = attributes.find(
      (a) => a.type === "COLOR" && a.value.toUpperCase() === mappedName.toUpperCase(),
    );
    if (found) return found;
  }

  // 3. Lookup in COLOR_MAP (name to numeric key)
  const entry = Object.entries(COLOR_MAP).find(
    ([, v]) => v.toUpperCase() === normalized,
  );
  if (entry) {
    found = attributes.find(
      (a) =>
        a.type === "COLOR" &&
        ((a.code && a.code === entry[0]) || a.value.toUpperCase() === entry[1].toUpperCase()),
    );
    if (found) return found;
  }

  return null;
}

interface ColorBadgeWithImageProps {
  color: string | undefined | null;
  attributes: ProductAttribute[];
  onImageClick?: (url: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ColorBadgeWithImage({
  color,
  attributes,
  onImageClick,
  className = "",
  size = "md",
  showLabel = true,
}: ColorBadgeWithImageProps) {
  const [modalImage, setModalImage] = useState<string | null>(null);

  if (!color || color === "-") {
    return <span className={`text-slate-500 font-mono text-xs ${className}`}>-</span>;
  }

  const colorAttr = getColorAttribute(color, attributes);
  const colorName = colorAttr?.value || COLOR_MAP[color] || color;
  const imageUrl = colorAttr?.imageUrl;

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageUrl) {
      if (onImageClick) {
        onImageClick(imageUrl);
      } else {
        setModalImage(imageUrl);
      }
    }
  };

  const sizeClasses = {
    sm: { img: "w-4 h-4", text: "text-[10px]", gap: "gap-1", py: "py-0.5 px-1.5" },
    md: { img: "w-6 h-6", text: "text-xs", gap: "gap-1.5", py: "py-1 px-2" },
    lg: { img: "w-10 h-10", text: "text-sm", gap: "gap-2", py: "py-1.5 px-3" },
  }[size];

  return (
    <>
      <span
        className={`inline-flex items-center rounded-lg bg-slate-100/80 border border-slate-200/80 font-medium text-slate-800 ${sizeClasses.gap} ${sizeClasses.py} ${className}`}
      >
        {imageUrl ? (
          <button
            type="button"
            onClick={handleImageClick}
            className="group relative flex items-center shrink-0 cursor-pointer focus:outline-none"
            title={`Clique para ver a cor (${colorName}) em tamanho grande`}
          >
            <img
              src={imageUrl}
              alt={colorName}
              className={`${sizeClasses.img} object-cover rounded border border-slate-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-indigo-500 transition shadow-xs`}
            />
          </button>
        ) : null}

        {showLabel && (
          <span className={`${sizeClasses.text} truncate`}>{colorName}</span>
        )}
      </span>

      {modalImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setModalImage(null)}
        >
          <div className="relative bg-white p-3 rounded-2xl shadow-2xl max-w-lg max-h-[85vh] flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-2 pb-2 border-b">
              <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <ImageIcon size={16} className="text-indigo-600" /> Cor: {colorName}
              </span>
              <button
                onClick={() => setModalImage(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={modalImage}
              alt={colorName}
              className="max-w-full max-h-[70vh] object-contain rounded-xl border border-slate-200 shadow-md"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
