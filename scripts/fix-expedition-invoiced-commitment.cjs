const fs = require("fs");
const path = require("path");

const filePath = path.resolve(__dirname, "../src/ProgramacaoCargasScreen.tsx");
let source = fs.readFileSync(filePath, "utf8");

if (source.includes("IMPERIO_INVOICED_COMMITMENT_RELEASE")) {
  console.log("[expedition-commitment] ajuste já aplicado.");
  process.exit(0);
}

const find = `  // IMPERIO_COMMITTED_LOAD_ALLOCATIONS\n  // Uma carga despachada continua comprometendo a quantidade até o faturamento\n  // reduzir o saldo do pedido. Isso evita que o mesmo item seja alocado duas vezes.\n  const allocationsByOrder = useMemo(() => {\n    const map = new Map<number, number>();\n    (db.cargas || []).forEach((c) => {\n      (c.orderIds || []).forEach((id) => {\n        const qty = Number(c.orderQuantities?.[id] || 0);\n        map.set(id, (map.get(id) || 0) + qty);\n      });\n    });\n    return map;\n  }, [db.cargas]);`;

const replace = `  // IMPERIO_COMMITTED_LOAD_ALLOCATIONS\n  // Uma carga despachada continua comprometendo a quantidade até o faturamento\n  // reduzir o saldo do pedido. Isso evita que o mesmo item seja alocado duas vezes.\n  const allocationsByOrder = useMemo(() => {\n    const map = new Map<number, number>();\n    (db.cargas || []).forEach((c) => {\n      (c.orderIds || []).forEach((id) => {\n        const qty = Number(c.orderQuantities?.[id] || 0);\n        map.set(id, (map.get(id) || 0) + qty);\n      });\n    });\n\n    // IMPERIO_INVOICED_COMMITMENT_RELEASE\n    // O faturamento é acumulado no pedido. Consideramos que ele atende primeiro\n    // as cargas mais antigas; portanto, essa quantidade deixa de bloquear novas cargas.\n    db.orders.forEach((order) => {\n      const allocated = map.get(order.id) || 0;\n      if (allocated <= 0) return;\n      map.set(\n        order.id,\n        Math.max(0, allocated - Math.max(0, Number(order.invoicedQuantity || 0))),\n      );\n    });\n\n    return map;\n  }, [db.cargas, db.orders]);`;

if (!source.includes(find)) {
  throw new Error("Trecho de compromisso de carga não encontrado.");
}

source = source.replace(find, replace);
fs.writeFileSync(filePath, source, "utf8");
console.log("[expedition-commitment] quantidades faturadas agora liberam o saldo para novas cargas.");
