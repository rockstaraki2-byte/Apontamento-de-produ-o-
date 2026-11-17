import type {
  TubularOperationFactors,
  TubularPricingConfig,
  TubularQuoteItem,
  TubularQuoteItemInput,
} from "../types";

export const TUBULAR_DIAMETER_FACTOR_BANDS = [
  { label: "Até 19,05 mm", max: 19.05 },
  { label: "Acima de 19,05 até 25,4 mm", max: 25.4 },
  { label: "Acima de 25,4 até 31,75 mm", max: 31.75 },
  { label: "Acima de 31,75 até 38,1 mm", max: 38.1 },
  { label: "Acima de 38,1 até 50,8 mm", max: 50.8 },
  { label: "Acima de 50,8 mm", max: null },
] as const;

export const TUBULAR_WALL_FACTOR_BANDS = [
  { label: "Abaixo de 0,8 mm", max: 0.8, exclusive: true },
  { label: "De 0,8 até 1,2 mm", max: 1.2, exclusive: false },
  { label: "Acima de 1,2 até 1,6 mm", max: 1.6, exclusive: false },
  { label: "Acima de 1,6 até 2,0 mm", max: 2.0, exclusive: false },
  { label: "Acima de 2,0 mm", max: null, exclusive: false },
] as const;

export const TUBULAR_QUANTITY_TIER_LABELS = [
  "1 a 20 peças",
  "21 a 40 peças",
  "41 a 200 peças",
  "Acima de 200 peças",
] as const;

export const DEFAULT_TUBULAR_PRICING_CONFIG: TubularPricingConfig = {
  materialPricePerMeter: 6.25,
  quantityTiers: [
    { minQuantity: 1, maxQuantity: 20, cutPrice: 6.75, conificationPrice: 5.75 },
    { minQuantity: 21, maxQuantity: 40, cutPrice: 6.0, conificationPrice: 5.0 },
    { minQuantity: 41, maxQuantity: 200, cutPrice: 5.25, conificationPrice: 4.25 },
    { minQuantity: 201, maxQuantity: null, cutPrice: 4.5, conificationPrice: 3.5 },
  ],
  cutFactors: {
    diameterFactors: [0.95, 1.0, 1.05, 1.1, 1.2, 1.3],
    wallThicknessFactors: [1.1, 1.0, 1.05, 1.1, 1.2],
  },
  conificationFactors: {
    diameterFactors: [0.95, 1.0, 1.05, 1.1, 1.2, 1.3],
    wallThicknessFactors: [1.1, 1.0, 1.05, 1.1, 1.2],
  },
};

const finiteOrDefault = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

function mergeFactors(
  input: Partial<TubularOperationFactors> | undefined,
  defaults: TubularOperationFactors,
): TubularOperationFactors {
  const mergeArray = (values: unknown, fallback: number[]) =>
    fallback.map((value, index) => {
      const candidate = Array.isArray(values) ? values[index] : undefined;
      return finiteOrDefault(candidate, value);
    });

  return {
    diameterFactors: mergeArray(input?.diameterFactors, defaults.diameterFactors),
    wallThicknessFactors: mergeArray(input?.wallThicknessFactors, defaults.wallThicknessFactors),
  };
}

export function mergeTubularPricingConfig(
  input?: Partial<TubularPricingConfig> | null,
): TubularPricingConfig {
  const defaults = DEFAULT_TUBULAR_PRICING_CONFIG;
  const incomingTiers = Array.isArray(input?.quantityTiers) ? input.quantityTiers : [];
  const quantityTiers = defaults.quantityTiers.map((tier, index) => {
    const candidate = incomingTiers[index] as Partial<TubularPricingConfig["quantityTiers"][number]> | undefined;
    return {
      ...tier,
      cutPrice: finiteOrDefault(candidate?.cutPrice, tier.cutPrice),
      conificationPrice: finiteOrDefault(candidate?.conificationPrice, tier.conificationPrice),
    };
  });

  return {
    materialPricePerMeter: finiteOrDefault(input?.materialPricePerMeter, defaults.materialPricePerMeter),
    quantityTiers,
    cutFactors: mergeFactors(input?.cutFactors, defaults.cutFactors),
    conificationFactors: mergeFactors(input?.conificationFactors, defaults.conificationFactors),
  };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getDiameterFactorIndex(diameterMm: number): number {
  if (diameterMm <= 19.05) return 0;
  if (diameterMm <= 25.4) return 1;
  if (diameterMm <= 31.75) return 2;
  if (diameterMm <= 38.1) return 3;
  if (diameterMm <= 50.8) return 4;
  return 5;
}

function getWallFactorIndex(wallThicknessMm: number): number {
  if (wallThicknessMm < 0.8) return 0;
  if (wallThicknessMm <= 1.2) return 1;
  if (wallThicknessMm <= 1.6) return 2;
  if (wallThicknessMm <= 2.0) return 3;
  return 4;
}

function getQuantityTier(quantity: number, config: TubularPricingConfig) {
  return config.quantityTiers.find(
    (tier) => quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity),
  ) || config.quantityTiers[config.quantityTiers.length - 1];
}

function factorAt(values: number[], index: number): number {
  const value = Number(values[index]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function calculateTubularQuoteItem(
  input: TubularQuoteItemInput,
  rawConfig: TubularPricingConfig,
): TubularQuoteItem {
  const config = mergeTubularPricingConfig(rawConfig);
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const tier = getQuantityTier(quantity, config);
  const diameterIndex = getDiameterFactorIndex(Number(input.diameterMm) || 0);
  const wallIndex = getWallFactorIndex(Number(input.wallThicknessMm) || 0);

  const cutDiameterFactor = factorAt(config.cutFactors.diameterFactors, diameterIndex);
  const cutWallFactor = factorAt(config.cutFactors.wallThicknessFactors, wallIndex);
  const conificationDiameterFactor = factorAt(config.conificationFactors.diameterFactors, diameterIndex);
  const conificationWallFactor = factorAt(config.conificationFactors.wallThicknessFactors, wallIndex);

  const includesCut = input.serviceType === "CORTE" || input.serviceType === "CORTE_E_CONIFICACAO";
  const includesConification = input.serviceType === "CONIFICACAO" || input.serviceType === "CORTE_E_CONIFICACAO";
  const cutBasePrice = includesCut ? tier.cutPrice : 0;
  const conificationBasePrice = includesConification ? tier.conificationPrice : 0;
  const cutComplexityFactor = cutDiameterFactor * cutWallFactor;
  const conificationComplexityFactor = conificationDiameterFactor * conificationWallFactor;
  const cutUnitPrice = roundMoney(cutBasePrice * cutComplexityFactor);
  const conificationUnitPrice = roundMoney(conificationBasePrice * conificationComplexityFactor);
  const unitPriceWithoutMaterial = roundMoney(cutUnitPrice + conificationUnitPrice);
  const materialLengthMeters = Math.max(0, Number(input.lengthCm) || 0) / 100;
  const materialCostPerUnit = roundMoney(materialLengthMeters * config.materialPricePerMeter);
  const unitPriceWithMaterial = roundMoney(unitPriceWithoutMaterial + materialCostPerUnit);

  return {
    ...input,
    quantity,
    quantityTierLabel:
      tier.maxQuantity === null
        ? "Acima de " + String(tier.minQuantity - 1) + " peças"
        : String(tier.minQuantity) + " a " + String(tier.maxQuantity) + " peças",
    cutBasePrice,
    conificationBasePrice,
    cutDiameterFactor,
    cutWallFactor,
    conificationDiameterFactor,
    conificationWallFactor,
    cutComplexityFactor,
    conificationComplexityFactor,
    materialPricePerMeter: config.materialPricePerMeter,
    materialLengthMeters,
    materialCostPerUnit,
    unitPriceWithoutMaterial,
    unitPriceWithMaterial,
    totalWithoutMaterial: roundMoney(unitPriceWithoutMaterial * quantity),
    totalWithMaterial: roundMoney(unitPriceWithMaterial * quantity),
  };
}

export function calculateTubularQuoteTotals(items: TubularQuoteItem[]) {
  return items.reduce(
    (totals, item) => ({
      totalWithoutMaterial: roundMoney(totals.totalWithoutMaterial + item.totalWithoutMaterial),
      totalWithMaterial: roundMoney(totals.totalWithMaterial + item.totalWithMaterial),
      materialTotal: roundMoney(totals.materialTotal + item.materialCostPerUnit * item.quantity),
    }),
    { totalWithoutMaterial: 0, totalWithMaterial: 0, materialTotal: 0 },
  );
}
