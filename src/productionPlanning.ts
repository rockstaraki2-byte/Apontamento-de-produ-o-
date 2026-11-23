export const PRODUCTION_PLANNING_ENABLED_TENANTS = ["sk"] as const;

export type ProductionPlanningStatus =
  | "draft"
  | "planned"
  | "in_production"
  | "completed"
  | "cancelled";

export interface ProductionPlanningModel {
  key: string;
  name: string;
}

export interface ProductionPlanningComponent {
  id: string;
  name: string;
  material: string;
  widthMm?: number;
  lengthMm?: number;
  thicknessMm?: number;
  quantityPerUnit: number;
  unit: string;
  lossPercent: number;
  active: boolean;
  stockItemId: number | null;
  stockEntryId: string | null;
  stockItemCode?: string;
  stockItemName?: string;
}

export interface ProductionPlanningBom {
  id: string;
  tenantId: string;
  modelKey: string;
  productName: string;
  version: number;
  components: ProductionPlanningComponent[];
  updatedAt?: number;
  updatedByUid?: string;
}

export interface ProductionPlanningStockItem {
  stockEntryId: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  itemUnit: string;
  color: string;
  size: string;
  variation: string;
  stage: "INTERMEDIARIO" | "ACABADO";
  quantity: number | null;
  reservedQuantity: number;
}

export interface ProductionPlanLine {
  lineId: string;
  modelKey: string;
  productName: string;
  variantName: string;
  quantity: number;
}

export type ProductionPlanComponentSnapshot = ProductionPlanningComponent;

export interface ProductionPlanBomSnapshot {
  lineId: string;
  modelKey: string;
  productName: string;
  variantName: string;
  quantity: number;
  bomVersion: number;
  components: ProductionPlanComponentSnapshot[];
}

export interface ProductionPlan {
  id: string;
  tenantId: string;
  plannedDate: string;
  notes: string;
  status: ProductionPlanningStatus;
  lines: ProductionPlanLine[];
  bomSnapshot: ProductionPlanBomSnapshot[];
  createdAt: number;
  updatedAt: number;
  createdByUid: string;
  inventoryAppliedAt?: number;
}

export interface ProductionPlanReservation {
  id: string;
  tenantId: string;
  planId: string;
  stockEntryId: string;
  itemId: number;
  quantity: number;
  active: boolean;
}

export const PRODUCTION_PLANNING_MODELS: ProductionPlanningModel[] = [
  { key: "gabinete-1-gaveta", name: "Gabinete 1 gaveta" },
  { key: "gabinete-2-gavetas", name: "Gabinete 2 gavetas" },
  { key: "gabinete-sem-gaveta", name: "Gabinete sem gaveta" },
];

function component(
  id: string,
  name: string,
  material: string,
  widthMm: number,
  lengthMm: number,
  thicknessMm: number,
  quantityPerUnit: number,
  active = true,
): ProductionPlanningComponent {
  return {
    id,
    name,
    material,
    widthMm,
    lengthMm,
    thicknessMm,
    quantityPerUnit,
    unit: "peça",
    lossPercent: 0,
    active,
    stockItemId: null,
    stockEntryId: null,
  };
}

const sharedComponents = [
  component("fundo-1", "Fundo 1", "MDF cru", 574, 697, 18, 1),
  component("fundo-2", "Fundo 2", "MDF cru", 574, 697, 2.7, 0, false),
  component("coluna-lateral", "Coluna lateral", "MDF cru", 60, 824, 25, 4),
  component("transverso-lateral", "Transverso lateral", "MDF cru", 100, 452, 25, 6),
  component("prateleira-1", "Prateleira 1", "MDF cru", 60, 633, 15, 2),
  component("prateleira-2", "Prateleira 2", "MDF cru", 60, 450, 15, 4),
];

function modelComponents(drawers: number): ProductionPlanningComponent[] {
  return [
    ...sharedComponents.map((entry) => ({ ...entry })),
    component(
      "frente-gaveta",
      "Frente gaveta",
      "MDF cru",
      330,
      634,
      15,
      drawers,
      drawers > 0,
    ),
    component(
      "encosto-gaveta",
      "Encosto gaveta",
      "MDF laminado",
      120,
      540,
      15,
      drawers,
      drawers > 0,
    ),
    component(
      "fundo-gaveta",
      "Fundo gaveta",
      "MDF laminado",
      440,
      545,
      15,
      drawers,
      drawers > 0,
    ),
  ];
}

export const DEFAULT_PRODUCTION_BOMS: ProductionPlanningBom[] = [
  {
    id: "gabinete-1-gaveta",
    tenantId: "sk",
    modelKey: "gabinete-1-gaveta",
    productName: "Gabinete 1 gaveta",
    version: 0,
    components: modelComponents(1),
  },
  {
    id: "gabinete-2-gavetas",
    tenantId: "sk",
    modelKey: "gabinete-2-gavetas",
    productName: "Gabinete 2 gavetas",
    version: 0,
    components: modelComponents(2),
  },
  {
    id: "gabinete-sem-gaveta",
    tenantId: "sk",
    modelKey: "gabinete-sem-gaveta",
    productName: "Gabinete sem gaveta",
    version: 0,
    components: modelComponents(0),
  },
];

export const PRODUCTION_PLANNING_READ_ROLES = [
  "ADMIN",
  "GERENCIA",
  "PCP",
  "PRODUCAO",
  "LEITURA",
] as const;

export const PRODUCTION_PLANNING_MANAGE_ROLES = [
  "ADMIN",
  "GERENCIA",
  "PCP",
] as const;

export const PRODUCTION_PLANNING_EXECUTE_ROLES = [
  ...PRODUCTION_PLANNING_MANAGE_ROLES,
  "PRODUCAO",
] as const;

export function isProductionPlanningEnabled(tenantId?: string | null): boolean {
  return PRODUCTION_PLANNING_ENABLED_TENANTS.includes(
    tenantId as (typeof PRODUCTION_PLANNING_ENABLED_TENANTS)[number],
  );
}

export function roundPlanningQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function requiredQuantityForComponent(
  lineQuantity: number,
  componentRow: ProductionPlanningComponent,
): number {
  if (!componentRow.active) return 0;
  return roundPlanningQuantity(
    lineQuantity *
      componentRow.quantityPerUnit *
      (1 + Math.max(0, componentRow.lossPercent || 0) / 100),
  );
}

export function aggregateProductionPlanNeeds(
  snapshot: ProductionPlanBomSnapshot[],
): Map<string, number> {
  const needs = new Map<string, number>();
  for (const line of snapshot) {
    for (const row of line.components) {
      if (!row.active || !row.stockEntryId) continue;
      const quantity = requiredQuantityForComponent(line.quantity, row);
      if (quantity <= 0) continue;
      needs.set(
        row.stockEntryId,
        roundPlanningQuantity((needs.get(row.stockEntryId) || 0) + quantity),
      );
    }
  }
  return needs;
}
