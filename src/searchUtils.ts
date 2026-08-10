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

