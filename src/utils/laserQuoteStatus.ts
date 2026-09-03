import type { LaserQuote } from "../types";

type QuoteApproval = Pick<LaserQuote, "status" | "approvalMaterialMode">;

export function isFinishedLaserQuote(status: string): boolean {
  return ["CORTADO", "FINALIZADO", "CORTADO_COM_MATERIAL", "CORTADO_SEM_MATERIAL"].includes(status);
}

export function getLaserQuoteMaterialMode(quote: QuoteApproval): LaserQuote["approvalMaterialMode"] {
  if (quote.status === "APROVADO_COM_MATERIAL" || quote.status === "CORTADO_COM_MATERIAL") return "COM_MATERIAL";
  if (quote.status === "APROVADO_SEM_MATERIAL" || quote.status === "CORTADO_SEM_MATERIAL") return "SEM_MATERIAL";
  if (quote.status === "APROVADO") return null;
  return quote.approvalMaterialMode ?? null;
}

export function getLaserQuoteFinishedStatus(tenantId: string, quote: QuoteApproval): LaserQuote["status"] {
  if (tenantId !== "imperio") return "CORTADO";
  const mode = getLaserQuoteMaterialMode(quote);
  if (mode === "COM_MATERIAL") return "CORTADO_COM_MATERIAL";
  if (mode === "SEM_MATERIAL") return "CORTADO_SEM_MATERIAL";
  // Legacy records do not contain enough information to infer the approval.
  return "CORTADO";
}

export function getLaserQuoteDisplayStatus(tenantId: string, quote: QuoteApproval): LaserQuote["status"] {
  return tenantId === "imperio" && isFinishedLaserQuote(quote.status)
    ? getLaserQuoteFinishedStatus(tenantId, quote)
    : quote.status;
}

export function matchesLaserQuoteStatus(tenantId: string, quote: QuoteApproval, filter: string): boolean {
  const status = getLaserQuoteDisplayStatus(tenantId, quote);
  return filter === "TODOS" || status === filter ||
    (tenantId === "imperio" && filter === "CORTADO" && isFinishedLaserQuote(status)) ||
    (filter === "APROVADO" && ["APROVADO", "APROVADO_COM_MATERIAL", "APROVADO_SEM_MATERIAL"].includes(status));
}
