export interface SystemRepresentative {
  id: string;
  name: string;
}

function normalizeRepresentativeName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

const SYSTEM_REPRESENTATIVES_BY_NAME: Record<string, SystemRepresentative> = {
  "IMPERIO REPRESENTANTE": { id: "representante_imperio", name: "Império Representante" },
  "KESSE REPRESENTANTE": { id: "representante_kesse", name: "Kesse Representante" },
  "ANDRE REPRESENTANTE": { id: "representante_andre", name: "André Representante" },
  "DANILO REPRESENTANTE": { id: "representante_danilo", name: "Danilo Representante" },
  "LILIAN REPRESENTANTE": { id: "representante_lilian", name: "Lilian Representante" },
  "ANGELO REPRESENTANTE": { id: "representante_angelo", name: "Ângelo representante" },
};

export function getSystemRepresentativeByCanonicalName(
  canonicalName: string | null | undefined,
): SystemRepresentative | null {
  if (!canonicalName) return null;
  return SYSTEM_REPRESENTATIVES_BY_NAME[normalizeRepresentativeName(canonicalName)] || null;
}
