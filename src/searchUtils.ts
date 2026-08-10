const cache = new Map<string, string>();
const MAX_CACHE_SIZE = 10000;

export function normalizeString(str?: string | null): string {
  if (typeof str !== "string" || !str) return "";
  let cached = cache.get(str);
  if (cached !== undefined) {
    return cached;
  }
  cached = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\s]/g, "")
    .toLowerCase();

  if (cache.size >= MAX_CACHE_SIZE) {
    const keys = Array.from(cache.keys());
    for (let i = 0; i < 2000; i++) {
      cache.delete(keys[i]);
    }
  }
  cache.set(str, cached);
  return cached;
}

export function findCustomerForOrder(ord: any, customers?: any[]): any {
  if (!ord || !customers || customers.length === 0) return null;

  // 1. Try matching by explicit customerId or customerCode
  const targetId = ord.customerId ?? ord.customerCode;
  if (targetId !== undefined && targetId !== null && targetId !== "") {
    const numId = Number(targetId);
    const found = customers.find(
      (c) =>
        c.id === targetId ||
        (numId > 0 && c.id === numId) ||
        String(c.id) === String(targetId) ||
        (c.code && (c.code === targetId || String(c.code) === String(targetId)))
    );
    if (found) return found;
  }

  const rawName = (ord.customerName || "").trim();
  if (!rawName) return null;

  // 2. Try matching by numeric code inside customerName (e.g. "1323 - ARAMADOS GOMES", "[1323] ARAMADOS", "1323 ARAMADOS")
  const leadingCodeMatch = rawName.match(/^\s*[\[\(]?\s*(\d+)/);
  if (leadingCodeMatch) {
    const codeId = Number(leadingCodeMatch[1]);
    const found = customers.find(
      (c) => c.id === codeId || (c.code && Number(c.code) === codeId)
    );
    if (found) return found;
  }

  // 3. Clean rawName by removing code prefix
  const cleanName = rawName
    .replace(/^\s*[\[\(]?\s*\d+\s*[\]\)]?\s*[-–—]?\s*/, "")
    .toLowerCase()
    .trim();
  const rawNameLower = rawName.toLowerCase();

  // Exact name or tradeName match
  let found = customers.find((c) => {
    const nameLower = (c.name || "").toLowerCase().trim();
    const tradeLower = (c.tradeName || "").toLowerCase().trim();
    return (
      (nameLower && (nameLower === cleanName || nameLower === rawNameLower)) ||
      (tradeLower && (tradeLower === cleanName || tradeLower === rawNameLower))
    );
  });
  if (found) return found;

  // Partial / Substring match
  found = customers.find((c) => {
    const nameLower = (c.name || "").toLowerCase().trim();
    const tradeLower = (c.tradeName || "").toLowerCase().trim();
    return (
      (nameLower && (cleanName.includes(nameLower) || nameLower.includes(cleanName))) ||
      (tradeLower && (cleanName.includes(tradeLower) || tradeLower.includes(cleanName)))
    );
  });

  return found || null;
}

export function getCustomerLocationLabel(ord: any, custObj?: any): string {
  const street =
    (custObj as any)?.street ||
    (custObj as any)?.logradouro ||
    (custObj as any)?.endereco ||
    "";
  const num = (custObj as any)?.number || (custObj as any)?.numero || "";
  const comp = (custObj as any)?.complement || (custObj as any)?.complemento || "";

  let baseStreetAddress = "";
  if (street) {
    baseStreetAddress = street;
    if (num) baseStreetAddress += `, ${num}`;
    if (comp) baseStreetAddress += ` (${comp})`;
  }

  const mainAddr =
    custObj?.address ||
    baseStreetAddress ||
    ord?.customerAddress ||
    ord?.address ||
    ord?.deliveryAddress ||
    ord?.endereco ||
    "";

  const city =
    (custObj as any)?.city ||
    (custObj as any)?.cidade ||
    ord?.customerCity ||
    ord?.city ||
    ord?.cidade ||
    "";

  const state =
    (custObj as any)?.state ||
    (custObj as any)?.uf ||
    ord?.customerState ||
    ord?.state ||
    ord?.uf ||
    "";

  const neighborhood =
    custObj?.neighborhood ||
    custObj?.bairro ||
    (custObj as any)?.bairro ||
    ord?.customerNeighborhood ||
    ord?.neighborhood ||
    ord?.bairro ||
    "";

  let formattedLocation = "";

  if (mainAddr) {
    formattedLocation = mainAddr;
    if (city && !mainAddr.toLowerCase().includes(city.toLowerCase())) {
      formattedLocation += `, ${city}`;
    }
    if (state && !mainAddr.toLowerCase().includes(state.toLowerCase())) {
      formattedLocation += ` - ${state}`;
    }
  } else if (city) {
    formattedLocation = state ? `${city} - ${state}` : city;
  }

  return [
    formattedLocation || null,
    neighborhood ? `Bairro: ${neighborhood}` : null,
  ]
    .filter(Boolean)
    .join(" • ") || "Não informada";
}


