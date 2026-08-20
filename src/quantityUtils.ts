/**
 * Utility function to safely convert any quantity value (number, string, NaN, undefined, "10 UN", "10,00")
 * into a valid, non-NaN JavaScript number.
 */
export function parseQty(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === "nan") return 0;
  
  // Extract numbers, minus sign, comma and dot
  const cleaned = str.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
