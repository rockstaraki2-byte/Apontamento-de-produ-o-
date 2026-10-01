import React from "react";
import type { Order } from "../types";

type LoadOrderItem = Pick<Order, "customProductName" | "color" | "variation">;

function getItemName(order?: LoadOrderItem, itemName?: string) {
  return order?.customProductName?.trim() || itemName?.trim() || "Item";
}

function getItemDetails(order?: LoadOrderItem) {
  return [
    { label: "Cor", value: order?.color },
    { label: "Variação", value: order?.variation },
  ].flatMap(({ label, value }) => {
    const text = String(value ?? "").trim();
    return text && !/^[-–—]+$/.test(text) ? [`${label}: ${text}`] : [];
  });
}

export function formatLoadOrderItemDescription(order?: LoadOrderItem, itemName?: string) {
  return [getItemName(order, itemName), ...getItemDetails(order)].join("\n");
}

export function LoadOrderItemDescription({
  order,
  itemName,
  className = "",
}: {
  order?: LoadOrderItem;
  itemName?: string;
  className?: string;
}) {
  const details = getItemDetails(order);

  return (
    <div className={`min-w-0 w-full space-y-1 ${className}`}>
      <span className="block [overflow-wrap:anywhere]">{getItemName(order, itemName)}</span>
      {details.length > 0 && (
        <div className="flex flex-wrap gap-1 text-[10px] leading-snug font-semibold text-slate-700">
          {details.map((detail) => (
            <span
              key={detail}
              className="max-w-full whitespace-normal [overflow-wrap:anywhere] rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5"
            >
              {detail}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
