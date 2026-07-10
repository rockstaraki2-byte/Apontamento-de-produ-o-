const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// replace state
content = content.replace(
  `const [pdfFile, setPdfFile] = useState<File | null>(null);`,
  `const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingFiles, setBillingFiles] = useState<File[]>([]);
  const [billingProgress, setBillingProgress] = useState(0);
  const [billingResult, setBillingResult] = useState<string | null>(null);
  const [billedItems, setBilledItems] = useState<any[]>([]);
  const billingInputRef = React.useRef<HTMLInputElement>(null);`
);

// replace handleExtractPdf
content = content.replace(
  `if (!pdfFile) return;`,
  `if (pdfFiles.length === 0) return;`
);

content = content.replace(
  `const formData = new FormData();\n    formData.append("file", pdfFile);`,
  `const formData = new FormData();\n    pdfFiles.forEach(f => formData.append("files", f));\n`
);

// add handleExtractBilling
const handleExtractPdfStr = `  const handleExtractPdf = async () => {`;
const insertIndex = content.indexOf(handleExtractPdfStr);
if (insertIndex !== -1) {
    const handleExtractBillingStr = `
  const handleExtractBilling = async () => {
    if (billingFiles.length === 0) return;
    setBillingResult("Extraindo faturamento com IA...");
    setBillingProgress(5);

    const extractionInterval = setInterval(() => {
      setBillingProgress((prev) => prev >= 90 ? prev : prev + Math.floor(Math.random() * 10) + 5);
    }, 600);

    const formData = new FormData();
    billingFiles.forEach(f => formData.append("files", f));

    try {
      const resp = await fetch("/api/extract-billing-pdf", {
        method: "POST",
        body: formData,
      });
      clearInterval(extractionInterval);
      const data = await resp.json();
      if (!data.success) {
        setBillingResult("Erro: " + data.error);
        setBillingProgress(0);
        return;
      }
      setBilledItems(data.billedItems || []);
      setBillingProgress(100);
      setBillingResult(null);
    } catch (e: any) {
      clearInterval(extractionInterval);
      setBillingResult("Falha na rede: " + e.message);
      setBillingProgress(0);
    }
  };

  const confirmarFaturamento = async () => {
     setBillingResult("Atualizando estoque e faturando itens...");
     let allOrderItemsCount = 0;
     for (const billed of billedItems) {
        // try to find order by code
        const order = db.orders.find(o => o.code === billed.orderCode);
        if (order && order.items) {
           for (const oi of order.items) {
              if (oi.partName === billed.partName || (oi.partName && oi.partName.includes(billed.partName))) {
                 // decrement stock
                 const dbItem = db.items.find(i => i.code === oi.itemCode || i.name === oi.partName);
                 if (dbItem && dbItem.stock !== undefined) {
                    await db.updateItem(dbItem.id, {
                       stock: Math.max(0, dbItem.stock - billed.quantity)
                    });
                 }
                 // update order item status (a shortcut, usually we need a full update logic)
                 // to do it right:
                 const updatedItems = order.items.map(it => {
                    if (it.id === oi.id) {
                       return { ...it, status: "FATURADO" };
                    }
                    return it;
                 });
                 // if all items billed -> order billed
                 const newStatus = updatedItems.every(i => i.status === "FATURADO") ? "CONCLUIDO" : order.status;
                 await db.updateOrder(order.id, {
                    items: updatedItems,
                    status: newStatus
                 });
                 allOrderItemsCount++;
                 break;
              }
           }
        }
     }
     
     alert(allOrderItemsCount + " itens faturados baseados no documento!");
     setIsBillingModalOpen(false);
     setBilledItems([]);
     setBillingFiles([]);
  };

`;
    content = content.slice(0, insertIndex) + handleExtractBillingStr + content.slice(insertIndex);
}

// UI: find the button grouping where "Importar Pedidos via PDF" is and add "Importar Faturamento via PDF"
const btnGroup = `                        </button>

                        <button
                          onClick={() => {
                            setPdfFiles([]);
                            setPdfImportProgress(0);
                            setPdfImportResult(null);
                            setPdfExtractedOrders([]);
                            setIsPdfModalOpen(true);
                          }}`;
content = content.replace(
  `onClick={() => {
                            setPdfFile(null);
                            setPdfImportProgress(0);
                            setPdfImportResult(null);
                            setPdfExtractedOrders([]);
                            setIsPdfModalOpen(true);
                          }}`,
   `onClick={() => {
                            setPdfFiles([]);
                            setPdfImportProgress(0);
                            setPdfImportResult(null);
                            setPdfExtractedOrders([]);
                            setIsPdfModalOpen(true);
                          }}`
);

const importBillingBtn = `
                        <button
                          onClick={() => {
                            setBillingFiles([]);
                            setBillingProgress(0);
                            setBillingResult(null);
                            setBilledItems([]);
                            setIsBillingModalOpen(true);
                          }}
                          className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-md transition bg-white text-left group"
                        >
                          <div className="bg-emerald-100 text-emerald-600 p-3 rounded-lg group-hover:scale-110 transition shrink-0">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition">
                              Importar Faturamento PDF
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              Identifique itens faturados via IA.
                            </p>
                          </div>
                        </button>
                        
`;

content = content.replace(
  `                        <button
                          onClick={() => {
                            setPdfFiles([]);`,
  importBillingBtn + `                        <button
                          onClick={() => {
                            setPdfFiles([]);`
);

// Fix the PDF modal to handle multiple files 
content = content.replace(
  `onChange={(e) =>
                              setPdfFile(
                                e.target.files ? e.target.files[0] : null,
                              )
                            }`,
  `onChange={(e) => setPdfFiles(e.target.files ? Array.from(e.target.files) : [])} multiple`
);

content = content.replace(
 `{pdfFile ? (
                            <div className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shadow-xs max-w-sm w-full">
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 truncate">
                                  <FileText
                                    size={16}
                                    className="text-red-500 shrink-0"
                                  />
                                  {pdfFile.name}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {(pdfFile.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              <button
                                onClick={() => setPdfFile(null)}
                                className="bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition shrink-0"
                                title="Remover"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (`,
  `{pdfFiles.length > 0 ? (
                            <div className="flex flex-col gap-2 w-full max-w-sm">
                              {pdfFiles.map((f, i) => (
                                <div key={i} className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shadow-xs w-full">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 truncate">
                                      <FileText size={16} className="text-red-500 shrink-0" />
                                      {f.name}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {(f.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                </div>
                              ))}
                              <button onClick={() => setPdfFiles([])} className="text-xs text-red-500 font-bold hover:underline self-end">Limpar Seleção</button>
                            </div>
                          ) : (`                          
)

content = content.replace(
  `{pdfFile && !pdfImportResult && (`,
  `{pdfFiles.length > 0 && !pdfImportResult && (`
);

// Add Billing Modal right before Pdf Modal
const billingModal = `
        {/* Modal de Importação de Faturamento via PDF */}
        {isBillingModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
              <div className="flex justify-between items-center bg-white px-6 py-4 border-b border-slate-200 shadow-sm relative z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 shadow-inner block">
                    <FileText size={22} className="drop-shadow-sm" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                      Importar Faturamento via IA
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Extração automática de itens e pedidos faturados.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBillingModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {billingFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl p-12 w-full max-w-lg flex flex-col items-center transition hover:bg-indigo-100/50 group hover:border-indigo-300">
                      <div className="bg-white p-4 rounded-full shadow-sm text-indigo-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                        <UploadCloud size={48} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">
                        Arraste um PDF ou selecione
                      </h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-sm">
                        Suporta PDFs múltiplos (notas fiscais ou espelhos de faturamento)
                      </p>
                      
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        ref={billingInputRef}
                        multiple
                        onChange={(e) => setBillingFiles(e.target.files ? Array.from(e.target.files) : [])}
                      />
                      
                      <button
                        onClick={() => billingInputRef.current?.click()}
                        className="bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-slate-900 transition text-sm shadow-md"
                      >
                        Selecionar Arquivos
                      </button>
                    </div>
                  </div>
                ) : billedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="flex flex-col gap-2 w-full max-w-sm">
                        {billingFiles.map((f, i) => (
                           <div key={i} className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shadow-xs w-full">
                              <span className="text-xs truncate">{f.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                           </div>
                        ))}
                      </div>
                      <button onClick={() => setBillingFiles([])} className="text-xs text-red-500 font-bold hover:underline mb-8 mt-2">Limpar Seleção</button>

                      {billingProgress === 0 && (
                        <button
                          onClick={handleExtractBilling}
                          className="mt-4 bg-indigo-600 text-white font-bold py-2.5 px-8 rounded-lg hover:bg-indigo-700 transition text-sm shadow-md flex items-center gap-2"
                        >
                          <FileText size={16} /> Processar Faturamento com IA
                        </button>
                      )}

                      {billingResult && (
                        <div className="mt-4 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-lg w-full max-w-md text-center border-dashed">
                          {billingResult}
                        </div>
                      )}

                      {billingProgress > 0 && (
                        <div className="mt-5 w-full max-w-md bg-white border border-indigo-100 p-4 rounded-xl shadow-md">
                          <div className="flex justify-between items-center text-xs font-bold text-indigo-600 mb-1.5 uppercase tracking-wider">
                            <span>Mapeando Faturamento</span>
                            <span>{billingProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
                            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-300 animate-pulse" style={{ width: billingProgress + '%' }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                ) : (
                    <div>
                        <h3 className="font-bold text-slate-800 mb-4">{billedItems.length} itens faturados encontrados:</h3>
                        <div className="space-y-2 max-h-[60vh] overflow-auto">
                            {billedItems.map((item, i) => (
                                <div key={i} className="flex flex-col bg-white border p-3 rounded-lg text-sm">
                                    <div className="font-bold">{item.partName} <span className="text-slate-500 font-medium text-xs">x{item.quantity}</span></div>
                                    <div className="text-xs text-slate-500">
                                      Pedido: <span className="font-bold text-slate-700">{item.orderCode}</span> | Cliente: {item.customerName}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => { setBillingFiles([]); setBilledItems([]); setBillingProgress(0); setBillingResult(null); }} className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-50 font-bold">Cancelar</button>
                            <button onClick={confirmarFaturamento} className="px-4 py-2 bg-emerald-600 text-white rounded-md font-bold hover:bg-emerald-700 transition">Confirmar Faturamento</button>
                        </div>
                    </div>
                )}
              </div>
            </div>
          </div>
        )}
`;

const pdfModalPos = content.indexOf(`{/* Modal de Importação de Pedidos via PDF */}`);
if (pdfModalPos !== -1) {
  content = content.slice(0, pdfModalPos) + billingModal + content.slice(pdfModalPos);
}

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx substituído com sucesso!');
