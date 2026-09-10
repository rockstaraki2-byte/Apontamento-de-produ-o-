const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function applyPatch(relativePath, patches) {
  const filePath = path.join(root, relativePath);
  let source = fs.readFileSync(filePath, "utf8");
  let changed = false;

  for (const patch of patches) {
    if (source.includes(patch.marker)) continue;
    if (!source.includes(patch.find)) {
      throw new Error(
        `[imperio-report] Não foi possível aplicar o patch "${patch.name}" em ${relativePath}: trecho-alvo não encontrado.`,
      );
    }
    source = source.replace(patch.find, patch.replace);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, source, "utf8");
    console.log(`[imperio-report] ${relativePath} atualizado.`);
  } else {
    console.log(`[imperio-report] ${relativePath} já estava atualizado.`);
  }
}

applyPatch("src/App.tsx", [
  {
    name: "saldo restante no detalhe compacto do pedido",
    marker: "IMPERIO_REMAINING_QTY_BADGE",
    find: `                              <span className="text-[8px] sm:text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded leading-none">\n                                Fat: {o.invoicedQuantity || 0} un\n                              </span>`,
    replace: `                              <span className="text-[8px] sm:text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded leading-none">\n                                Fat: {o.invoicedQuantity || 0} un\n                              </span>\n                              {/* IMPERIO_REMAINING_QTY_BADGE */}\n                              {db.activeTenantId === "imperio" &&\n                                (o.invoicedQuantity || 0) > 0 &&\n                                (o.invoicedQuantity || 0) < (o.totalQuantity || 0) && (\n                                  <span className="text-[8px] sm:text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded leading-none">\n                                    Restante: {Math.max(0, (o.totalQuantity || 0) - (o.invoicedQuantity || 0))} un\n                                  </span>\n                                )}`,
  },
]);

applyPatch("src/StatusScreen.tsx", [
  {
    name: "saldo restante no detalhe do representante",
    marker: "IMPERIO_REP_REMAINING_QTY",
    find: `                            <span className="text-xs text-gray-400 font-sans mt-1 bg-gray-50 px-2 py-0.5 rounded w-max">\n                              Embalado: {o.packedQuantity || 0} / Total do\n                              Pedido: {o.totalQuantity || 0}\n                            </span>`,
    replace: `                            <span className="text-xs text-gray-400 font-sans mt-1 bg-gray-50 px-2 py-0.5 rounded w-max">\n                              Embalado: {o.packedQuantity || 0} / Total do\n                              Pedido: {o.totalQuantity || 0}\n                            </span>\n                            {/* IMPERIO_REP_REMAINING_QTY */}\n                            {db.activeTenantId === "imperio" &&\n                              (o.invoicedQuantity || 0) > 0 &&\n                              (o.invoicedQuantity || 0) < (o.totalQuantity || 0) && (\n                                <span className="text-xs text-amber-800 font-bold font-sans mt-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded w-max">\n                                  Faturado: {o.invoicedQuantity || 0} / Restante: {Math.max(0, (o.totalQuantity || 0) - (o.invoicedQuantity || 0))}\n                                </span>\n                              )}`,
  },
]);

applyPatch("src/RepresentanteScreen.tsx", [
  {
    name: "import do relatório de itens em aberto",
    marker: `import { RepresentativeOpenOrdersReportTab } from "./RepresentativeOpenOrdersReportTab";`,
    find: `import { StatusScreen } from "./StatusScreen";`,
    replace: `import { StatusScreen } from "./StatusScreen";\nimport { RepresentativeOpenOrdersReportTab } from "./RepresentativeOpenOrdersReportTab";`,
  },
  {
    name: "tipo da nova aba Relatório",
    marker: `useState<"STATUS" | "NOVO_PEDIDO" | "RELATORIO">`,
    find: `const [activeTab, setActiveTab] = useState<"STATUS" | "NOVO_PEDIDO">(\n    "STATUS",\n  );`,
    replace: `const [activeTab, setActiveTab] = useState<"STATUS" | "NOVO_PEDIDO" | "RELATORIO">(\n    "STATUS",\n  );`,
  },
  {
    name: "botão da aba Relatório",
    marker: "IMPERIO_REP_REPORT_TAB_BUTTON",
    find: `        <button\n          className={\`flex-1 min-w-[120px] py-2 text-sm font-semibold transition \${activeTab === "NOVO_PEDIDO" ? "bg-blue-600 text-white" : "bg-white text-blue-600"}\`}\n          onClick={() => setActiveTab("NOVO_PEDIDO")}\n        >\n          + Novo Pedido\n        </button>`,
    replace: `        <button\n          className={\`flex-1 min-w-[120px] py-2 text-sm font-semibold transition \${activeTab === "NOVO_PEDIDO" ? "bg-blue-600 text-white" : "bg-white text-blue-600"}\`}\n          onClick={() => setActiveTab("NOVO_PEDIDO")}\n        >\n          + Novo Pedido\n        </button>\n        {/* IMPERIO_REP_REPORT_TAB_BUTTON */}\n        {db.activeTenantId === "imperio" && (\n          <button\n            className={\`flex-1 min-w-[120px] py-2 text-sm font-semibold transition \${activeTab === "RELATORIO" ? "bg-blue-600 text-white" : "bg-white text-blue-600"}\`}\n            onClick={() => setActiveTab("RELATORIO")}\n          >\n            Relatório\n          </button>\n        )}`,
  },
  {
    name: "conteúdo da aba Relatório",
    marker: "IMPERIO_REP_REPORT_TAB_CONTENT",
    find: `        {activeTab === "NOVO_PEDIDO" && (`,
    replace: `        {/* IMPERIO_REP_REPORT_TAB_CONTENT */}\n        {activeTab === "RELATORIO" && db.activeTenantId === "imperio" && (\n          <RepresentativeOpenOrdersReportTab db={db} currentUser={currentUser} />\n        )}\n\n        {activeTab === "NOVO_PEDIDO" && (`,
  },
]);
