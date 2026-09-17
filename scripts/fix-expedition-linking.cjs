const fs = require("fs");
const path = require("path");

const filePath = path.resolve(__dirname, "../src/App.tsx");
let source = fs.readFileSync(filePath, "utf8");
let changed = false;

if (source.includes("const linkCreatedOrderToSelectedCarga = async")) {
  const start = source.indexOf("  const linkCreatedOrderToSelectedCarga = async");
  const endMarker = "\n\n  const handleCadastrar = async () => {";
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("Não foi possível localizar o helper antigo de vínculo de carga.");

  const replacement = `  const linkCreatedOrdersToSelectedCarga = async (createdItems: { id: number; qty: number }[]) => {\n    if (!selectedExpeditionCargaId || createdItems.length === 0) return;\n    const carga = (db.cargas || []).find((c: any) => c.id === selectedExpeditionCargaId);\n    if (!carga || !(carga.status === \"ABERTA\" || carga.status === \"PLANEJADA\")) return;\n\n    const ids = Array.from(new Set([\n      ...(carga.orderIds || []),\n      ...createdItems.map((item) => item.id),\n    ]));\n    const quantities = { ...(carga.orderQuantities || {}) } as Record<number, number>;\n    createdItems.forEach((item) => {\n      quantities[item.id] = item.qty;\n    });\n\n    await db.updateCarga({\n      ...carga,\n      orderIds: ids,\n      orderQuantities: quantities,\n      auditTrail: [\n        ...(carga.auditTrail || []),\n        {\n          timestamp: Date.now(),\n          userId: currentUser.id,\n          userName: currentUser.name,\n          action: \`Pedido \${orderCode} vinculado no lançamento (\${createdItems.reduce((sum, item) => sum + item.qty, 0)} un em \${createdItems.length} item(ns))\`,\n        },\n      ],\n    });\n  };`;

  source = source.slice(0, start) + replacement + source.slice(end);
  changed = true;
}

const successMarker = "      let successCount = 0;\n      for (const itemInfo of itemsToProcess) {";
if (source.includes(successMarker) && !source.includes("const createdExpeditionItems: { id: number; qty: number }[] = []")) {
  source = source.replace(
    successMarker,
    "      let successCount = 0;\n      const createdExpeditionItems: { id: number; qty: number }[] = [];\n      for (const itemInfo of itemsToProcess) {",
  );
  changed = true;
}

if (source.includes("        await linkCreatedOrderToSelectedCarga(createdOrderId, numTotalQuantity);")) {
  source = source.replace(
    "        await linkCreatedOrderToSelectedCarga(createdOrderId, numTotalQuantity);",
    "        createdExpeditionItems.push({ id: createdOrderId, qty: numTotalQuantity });",
  );
  changed = true;
}

const pushMarker = "      // Trigger FCM Push notification";
if (
  source.includes(pushMarker) &&
  source.includes("const createdExpeditionItems: { id: number; qty: number }[] = []") &&
  !source.includes("await linkCreatedOrdersToSelectedCarga(createdExpeditionItems);")
) {
  source = source.replace(
    pushMarker,
    "      await linkCreatedOrdersToSelectedCarga(createdExpeditionItems);\n\n      // Trigger FCM Push notification",
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(filePath, source, "utf8");
  console.log("[expedition-linking] vínculo de múltiplos itens consolidado em uma única atualização de carga.");
} else {
  console.log("[expedition-linking] nenhuma alteração necessária.");
}
