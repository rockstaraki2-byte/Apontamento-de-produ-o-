import type { AtomicCreateInput } from "./orderImportCore.js";

/** Shared operational document used by manual/API imports and the Tek-System writer. */
export function buildImportedOrderDocument(
  input: AtomicCreateInput, index: number, id: number,
  paymentCondition: string, billingRule: "cadastro" | "ultimo_pedido",
) {
  const line = input.prepared.lines[index];
  return {
    id, tenantId: input.tenantId, orderCode: input.prepared.codigoPedido,
    itemId: line.itemId, color: line.color, size: line.size, variation: line.variation,
    customerName: input.prepared.customerName, customerId: input.prepared.customerId,
    representativeName: input.prepared.representativeName || "", representativeId: input.prepared.representativeId || "",
    totalQuantity: line.totalQuantity, quantityScaled: line.quantityScaled,
    packedQuantity: 0, producedQuantity: 0, paintedQuantity: 0, cutQuantity: 0, invoicedQuantity: 0,
    isActive: true, createdAt: input.createdAt, deliveryDate: input.prepared.deliveryDate,
    paymentCondition, paymentTerms: input.prepared.paymentTerms, paymentTermsDays: input.prepared.paymentTermsDays,
    billingRule, fiscalType: input.prepared.fiscalType,
    unitPrice: line.unitPrice, unitPriceScaled: line.unitPriceScaled,
    discountPercent: line.discountPercent, discountPercentScaled: line.discountPercentScaled,
    discountAmount: line.discountAmount, discountAmountScaled: line.discountAmountScaled,
    grossTotalScaled: line.grossTotalScaled, netTotalScaled: line.netTotalScaled,
    hasRET: input.prepared.hasRET, status: "PENDENTE", statusOriginalPdf: input.origem,
    notes: input.prepared.orderNotes, itemNotes: line.itemNotes, originalProductCode: line.codigoOriginal,
    importOrigin: input.origem, importedAt: input.importedAt ?? input.createdAt,
    importedBy: input.solicitadoPor, importPayloadHash: input.prepared.normalizedPayloadHash,
    ...(input.teksystem ? {
      teksystemLineId: input.teksystem.lineIds[index], teksystemOrderId: input.prepared.codigoPedido,
      teksystemCompanyId: input.teksystem.companyId, teksystemCustomerCode: input.teksystem.customerCode,
    } : {}),
  };
}
