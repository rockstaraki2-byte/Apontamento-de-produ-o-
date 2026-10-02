import type { Item, StockEntry } from "../types";

export interface StockInventoryCsvTable {
  headers: string[];
  rows: string[][];
}

export interface StockCountAdjustment {
  stock: StockEntry;
  item: Item;
  before: number;
  after: number;
  line: number;
}

export interface StockCountImportPlan {
  adjustments: StockCountAdjustment[];
  unchangedCount: number;
  blankCount: number;
  errors: string[];
  countedRows: number;
}

export function normalizeStockCsvHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function countDelimitersOutsideQuotes(line: string): Record<string, number> {
  const counts: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') i += 1;
      else quoted = !quoted;
    } else if (!quoted && char in counts) {
      counts[char] += 1;
    }
  }
  return counts;
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parseStockInventoryCsv(text: string): StockInventoryCsvTable {
  const nonEmptyLines = text.split(/\r?\n/).filter((line) => line.trim());
  const dataLines = nonEmptyLines.filter((line) => !/^\s*sep\s*=\s*./i.test(line));
  const firstLine = dataLines[0] || "";
  const delimiterCounts = countDelimitersOutsideQuotes(firstLine);
  const delimiter = Object.entries(delimiterCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ";";
  const rows = parseCsvRows(text, delimiter).filter((row) =>
    row.some((cell) => cell.trim().length > 0),
  );
  const withoutExcelSeparator = rows[0]?.[0]?.trim().toLowerCase().startsWith("sep=")
    ? rows.slice(1)
    : rows;

  if (withoutExcelSeparator.length < 2) {
    throw new Error("O CSV precisa ter uma linha de cabeçalho e ao menos uma linha de dados.");
  }

  return {
    headers: withoutExcelSeparator[0].map((header) => header.trim()),
    rows: withoutExcelSeparator.slice(1),
  };
}

export function parseStockCountQuantity(value: string): number | null {
  const trimmed = value.trim().replace(/[\s\u00a0]/g, "");
  if (!trimmed) return null;

  let normalized = trimmed;
  if (normalized.includes(",") && normalized.includes(".")) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return Number.NaN;
  const quantity = Number(normalized);
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : Number.NaN;
}

const HEADER_ALIASES: Record<string, string[]> = {
  stockId: ["IDESTOQUE", "STOCKID"],
  itemId: ["IDITEM", "ITEMID"],
  code: ["CODIGO", "CODIGOITEM", "CODE", "SKU"],
  description: ["DESCRICAO", "PRODUTO", "ITEM", "NOME"],
  color: ["COR", "CORES"],
  size: ["TAMANHO", "TAM"],
  variation: ["VARIACAO", "VAR"],
  stage: ["ESTAGIO", "FASE"],
  count: ["QUANTIDADECONTADA", "QTDCONTADA", "ESTOQUECONTADO", "QUANTIDADE", "NOVOSALDO", "QTDFISICA"],
};

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(normalizeStockCsvHeader(header)));
}

function normalizeValue(value: string | undefined): string {
  return String(value || "").trim();
}

function normalizedText(value: string): string {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function normalizeStage(value: string): StockEntry["stage"] | null {
  const stage = normalizeStockCsvHeader(value);
  if (!stage) return null;
  if (["ACABADO", "ACABADOS", "ESTOQUEACABADO", "FINALIZADO", "FINISHED"].includes(stage)) return "ACABADO";
  if (["INTERMEDIARIO", "INTERMEDIARIOS", "ESTOQUEINTERMEDIARIO", "SEMIACABADO", "SEMIACABADOS", "WIP"].includes(stage)) return "INTERMEDIARIO";
  return null;
}

export function buildStockCountImportPlan(
  table: StockInventoryCsvTable,
  items: Item[],
  stocks: StockEntry[],
): StockCountImportPlan {
  const headers = table.headers.map(normalizeStockCsvHeader);
  const columns = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([name, aliases]) => [name, findColumn(headers, aliases)]),
  ) as Record<keyof typeof HEADER_ALIASES, number>;
  if (columns.count < 0) {
    throw new Error("Não encontrei a coluna QUANTIDADE_CONTADA. Baixe o CSV modelo, preencha essa coluna e importe novamente.");
  }
  if (columns.stockId < 0 && columns.itemId < 0 && columns.code < 0 && columns.description < 0) {
    throw new Error("Inclua uma coluna ID_ESTOQUE, ID_ITEM, CODIGO ou DESCRICAO para identificar cada produto.");
  }

  const plan: StockCountImportPlan = { adjustments: [], unchangedCount: 0, blankCount: 0, errors: [], countedRows: 0 };
  const plannedStockIds = new Set<string>();

  table.rows.forEach((row, rowIndex) => {
    const line = rowIndex + 2;
    const cell = (column: number) => column < 0 ? "" : normalizeValue(row[column]);
    const countText = cell(columns.count);
    if (!countText) {
      plan.blankCount += 1;
      return;
    }

    const after = parseStockCountQuantity(countText);
    if (after === null || !Number.isFinite(after)) {
      plan.errors.push(`Linha ${line}: quantidade contada inválida ("${countText}").`);
      return;
    }

    const stockId = cell(columns.stockId);
    const itemIdText = cell(columns.itemId);
    const code = cell(columns.code);
    const description = cell(columns.description);
    const byStockId = stockId ? stocks.find((stock) => stock.id === stockId) : undefined;
    const identifiers: Item[][] = [];

    if (itemIdText) {
      const parsedId = Number(itemIdText);
      if (!Number.isInteger(parsedId)) {
        plan.errors.push(`Linha ${line}: ID_ITEM "${itemIdText}" inválido.`);
        return;
      }
      identifiers.push(items.filter((item) => item.id === parsedId));
    }
    if (code) identifiers.push(items.filter((item) => normalizedText(item.code) === normalizedText(code)));
    if (description) identifiers.push(items.filter((item) => normalizedText(item.name) === normalizedText(description)));

    let item: Item | undefined;
    if (identifiers.length) {
      const intersection = identifiers[0].filter((candidate) => identifiers.every((matches) => matches.some((match) => match.id === candidate.id)));
      if (intersection.length !== 1) {
        plan.errors.push(`Linha ${line}: produto não encontrado ou identificação ambígua; confira ID_ITEM, CODIGO e DESCRICAO.`);
        return;
      }
      item = intersection[0];
    } else if (byStockId) {
      item = items.find((candidate) => candidate.id === byStockId.itemId);
    }

    if (!item) {
      plan.errors.push(`Linha ${line}: produto não identificado. Informe ID_ITEM ou CODIGO válido.`);
      return;
    }
    if (item.type === "EPI") {
      plan.errors.push(`Linha ${line}: "${item.code} - ${item.name}" é um EPI e não pode ser ajustado por esta importação de produtos.`);
      return;
    }
    if (byStockId && byStockId.itemId !== item.id) {
      plan.errors.push(`Linha ${line}: ID_ESTOQUE não corresponde ao produto informado.`);
      return;
    }

    const color = cell(columns.color) || byStockId?.color || "";
    const size = cell(columns.size) || byStockId?.size || "";
    const variation = cell(columns.variation) || byStockId?.variation || "";
    const stageText = cell(columns.stage);
    const sameAttributes = stocks.filter((stock) =>
      stock.itemId === item!.id &&
      (stock.color || "") === color &&
      (stock.size || "") === size &&
      (stock.variation || "") === variation,
    );
    if (!stageText && !byStockId && sameAttributes.length > 1) {
      plan.errors.push(`Linha ${line}: informe o estágio ACABADO ou INTERMEDIARIO para identificar o saldo.`);
      return;
    }
    const stage = stageText
      ? normalizeStage(stageText)
      : byStockId?.stage || sameAttributes[0]?.stage || "ACABADO";
    if (!stage) {
      plan.errors.push(`Linha ${line}: estágio "${stageText}" inválido; use ACABADO ou INTERMEDIARIO.`);
      return;
    }

    if (byStockId && (
      (cell(columns.color) && byStockId.color !== color) ||
      (cell(columns.size) && byStockId.size !== size) ||
      (cell(columns.variation) && byStockId.variation !== variation) ||
      (stageText && byStockId.stage !== stage)
    )) {
      plan.errors.push(`Linha ${line}: ID_ESTOQUE não corresponde à cor, tamanho, variação ou estágio informado.`);
      return;
    }

    const matchingStocks = stocks.filter((stock) =>
      stock.itemId === item!.id &&
      (stock.color || "") === color &&
      (stock.size || "") === size &&
      (stock.variation || "") === variation &&
      (stock.stage || "ACABADO") === stage,
    );
    if (!byStockId && matchingStocks.length > 1) {
      plan.errors.push(`Linha ${line}: mais de um saldo corresponde às coordenadas; use ID_ESTOQUE do CSV modelo.`);
      return;
    }
    const existing = byStockId || matchingStocks[0];
    const targetId = existing?.id || `${item.id}|${color}|${size}|${variation}|${stage}`;
    if (plannedStockIds.has(targetId)) {
      plan.errors.push(`Linha ${line}: produto/variação repetido no CSV.`);
      return;
    }
    plannedStockIds.add(targetId);
    plan.countedRows += 1;

    const before = Number(existing?.quantity || 0);
    if (before === after) {
      plan.unchangedCount += 1;
      return;
    }

    plan.adjustments.push({
      item,
      before,
      after,
      line,
      stock: {
        ...existing,
        id: targetId,
        itemId: item.id,
        color,
        size,
        variation,
        stage,
        quantity: after,
      },
    });
  });

  return plan;
}

export function escapeCsvCell(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}
