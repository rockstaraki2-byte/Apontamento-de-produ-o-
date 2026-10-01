import type { PackageType, ProductionLog } from "../types";

export const PACKAGE_TYPE_OPTIONS: readonly PackageType[] = [
  "Caixa", "Saco", "Fardo", "Pacote", "Palete", "Rolo", "Outro", "Avulso",
];

type PackagingSource = Pick<ProductionLog, "packageType" | "measurementUnit" | "packagesConfig">;

export interface LabelPackagePlan {
  quantity: number;
  packageType: PackageType | "Não informado";
  splitQuantityMode: "fixed" | "divide";
  boxIndexOverride?: number;
  totalBoxesOverride?: number;
}

function normalizePackageType(value: unknown): PackageType | undefined {
  const text = String(value ?? "").trim().toLowerCase();
  return PACKAGE_TYPE_OPTIONS.find((type) => {
    const name = type.toLowerCase();
    return text === name || text === `${name}s`;
  });
}

export function getRegisteredPackageType(log: PackagingSource): LabelPackagePlan["packageType"] {
  return normalizePackageType(log.packageType)
    || normalizePackageType(log.measurementUnit)
    || "Não informado";
}

export function buildLabelPackagePlans(log: PackagingSource, quantity: number): LabelPackagePlan[] {
  const packageType = getRegisteredPackageType(log);
  const configs = Array.isArray(log.packagesConfig) ? log.packagesConfig : [];

  if (configs.length === 0) {
    return [{ quantity, packageType, splitQuantityMode: "divide" }];
  }

  const totalBoxes = configs.reduce((sum, config) => sum + config.boxes, 0);
  const plans: LabelPackagePlan[] = [];
  configs.forEach((config) => {
    for (let i = 0; i < config.boxes; i++) {
      plans.push({
        quantity: config.itemsPerBox,
        packageType,
        splitQuantityMode: "fixed",
        boxIndexOverride: plans.length + 1,
        totalBoxesOverride: totalBoxes,
      });
    }
  });
  return plans;
}
