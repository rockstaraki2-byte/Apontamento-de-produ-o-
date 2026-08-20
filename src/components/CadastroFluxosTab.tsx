import React, { useState, useEffect } from "react";
import { Flow } from "../types";
import {
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Package,
  Check
} from "lucide-react";

interface Props {
  db: any;
}

export const CadastroFluxosTab: React.FC<Props> = ({ db }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);

  // Form State
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [fluxosComponentes, setFluxosComponentes] = useState<string[]>([]);
  const [isComposto, setIsComposto] = useState(false);

  // Product Flow Binding States
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductFluxos, setSelectedProductFluxos] = useState<string[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const flowsList: Flow[] = db.flows || [];

  // Seed default initial flows if empty
  useEffect(() => {
    if (flowsList.length === 0 && db.addFlow) {
      const seedInitialFlows = async () => {
        try {
          await db.addFlow({
            nome: "Fluxo A",
            codigo: "FLUXO_A",
            ativo: true,
            descricao: "Fluxo padrão de estampagem e usinagem",
            fluxosComponentes: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          await db.addFlow({
            nome: "Fluxo B",
            codigo: "FLUXO_B",
            ativo: true,
            descricao: "Fluxo de acabamento, pintura e tratamento químico",
            fluxosComponentes: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          await db.addFlow({
            nome: "Fluxo AB (Composto)",
            codigo: "FLUXO_AB",
            ativo: true,
            descricao: "Fluxo composto unindo estampagem, acabamento e pintura",
            fluxosComponentes: ["FLUXO_A", "FLUXO_B"],
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        } catch (e) {
          console.error("Erro ao popular fluxos iniciais:", e);
        }
      };
      seedInitialFlows();
    }
  }, [flowsList.length]);

  const handleOpenModal = (flow?: Flow) => {
    if (flow) {
      setEditingFlow(flow);
      setNome(flow.nome);
      setCodigo(flow.codigo);
      setDescricao(flow.descricao || "");
      setAtivo(flow.ativo);
      setFluxosComponentes(flow.fluxosComponentes || []);
      setIsComposto((flow.fluxosComponentes || []).length > 0);
    } else {
      setEditingFlow(null);
      setNome("");
      setCodigo(`FLUXO_${String.fromCharCode(65 + (flowsList.length % 26))}`);
      setDescricao("");
      setAtivo(true);
      setFluxosComponentes([]);
      setIsComposto(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !codigo.trim()) {
      alert("Nome e Código do Fluxo são obrigatórios.");
      return;
    }

    const payload = {
      nome: nome.trim(),
      codigo: codigo.trim().toUpperCase(),
      descricao: descricao.trim(),
      ativo,
      fluxosComponentes: isComposto ? fluxosComponentes : [],
      updatedAt: Date.now()
    };

    if (editingFlow) {
      await db.updateFlow({
        ...editingFlow,
        ...payload
      });
    } else {
      await db.addFlow({
        ...payload,
        createdAt: Date.now()
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, flowName: string) => {
    if (confirm(`Tem certeza que deseja excluir o fluxo "${flowName}"?`)) {
      await db.deleteFlow(id);
    }
  };

  const toggleComponentFlow = (codeOrId: string) => {
    setFluxosComponentes((prev) =>
      prev.includes(codeOrId)
        ? prev.filter((c) => c !== codeOrId)
        : [...prev, codeOrId]
    );
  };

  const filteredFlows = flowsList.filter(
    (f) =>
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.descricao && f.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="text-emerald-600" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Cadastro de Fluxos Produtivos</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configure fluxos atômicos e compostos (ex: Fluxo A, Fluxo B, Fluxo AB) para vinculo com setores e produtos.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition shadow-sm"
        >
          <Plus size={18} />
          Novo Fluxo
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-emerald-900 text-sm">
        <Info className="text-emerald-600 shrink-0 mt-0.5" size={20} />
        <div>
          <strong className="font-semibold">Regras de Elegibilidade & Fluxos Compostos:</strong>
          <p className="mt-0.5 text-emerald-800">
            Fluxos compostos (ex: <em>Fluxo AB</em>) combinam múltiplos fluxos-base (<em>Fluxo A + Fluxo B</em>). Quando um produto utiliza o Fluxo AB, o motor de elegibilidade habilita automaticamente qualquer setor que atenda ao Fluxo A ou ao Fluxo B sem necessidade de alterações manuais.
          </p>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
          <span className="bg-gray-100 px-3 py-1.5 rounded-full">Total: <strong>{flowsList.length}</strong> fluxos</span>
          <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full">Ativos: <strong>{flowsList.filter(f => f.ativo).length}</strong></span>
        </div>
      </div>

      {/* Flow Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredFlows.map((flow) => {
          const isComp = (flow.fluxosComponentes || []).length > 0;
          return (
            <div
              key={flow.id}
              className={`bg-white rounded-xl border transition-all hover:shadow-md ${
                flow.ativo ? "border-gray-200" : "border-gray-200 opacity-60 bg-gray-50"
              }`}
            >
              <div className="p-5">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                      {flow.codigo}
                    </span>
                    {isComp ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                        <Layers size={12} /> Composto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                        <Sparkles size={12} /> Atômico
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      flow.ativo ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {flow.ativo ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {flow.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>

                <h3 className="font-bold text-gray-800 text-lg">{flow.nome}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[32px]">
                  {flow.descricao || "Sem descrição informada."}
                </p>

                {/* Sub-flows badges */}
                {isComp && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                      Fluxos Componentes
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {flow.fluxosComponentes!.map((compCode) => {
                        const target = flowsList.find(
                          (f) => f.codigo === compCode || String(f.id) === String(compCode)
                        );
                        return (
                          <span
                            key={compCode}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-800 rounded"
                          >
                            <ArrowRight size={10} />
                            {target ? `${target.codigo} (${target.nome})` : compCode}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl flex justify-end gap-2">
                <button
                  onClick={() => handleOpenModal(flow)}
                  className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                  title="Editar Fluxo"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(flow.id, flow.nome)}
                  className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Excluir Fluxo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {filteredFlows.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
            <GitBranch size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm font-medium">Nenhum fluxo encontrado com os critérios digitados.</p>
          </div>
        )}
      </div>

      {/* Vínculo de Fluxo aos Produtos (Itens) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4 mt-8">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Package className="text-indigo-600" size={22} />
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Vínculo de Fluxos aos Produtos</h3>
            <p className="text-xs text-gray-500">
              Associe quais fluxos de produção cada produto utiliza. O sistema impedirá que este produto apareça em setores de fluxos divergentes.
            </p>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-lg flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            {saveSuccessMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Item Selector Form */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                1. Selecione o Produto / Item
              </label>
              <input
                type="text"
                placeholder="Buscar produto por código ou nome..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              />
              <select
                value={selectedProductId || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedProductId(val || null);
                  if (val) {
                    const item = db.items?.find((i: any) => i.id === val);
                    setSelectedProductFluxos(item?.fluxos || []);
                  } else {
                    setSelectedProductFluxos([]);
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Escolha um produto --</option>
                {(db.items || [])
                  .filter((i: any) =>
                    !productSearch.trim() ||
                    i.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                    i.code.toLowerCase().includes(productSearch.toLowerCase())
                  )
                  .map((i: any) => (
                    <option key={i.id} value={i.id}>
                      {i.code} - {i.name} {i.fluxos && i.fluxos.length > 0 ? `[Fluxos: ${i.fluxos.join(", ")}]` : ""}
                    </option>
                  ))}
              </select>
            </div>

            {selectedProductId && (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  2. Selecione os Fluxos do Produto:
                </label>
                <div className="flex flex-wrap gap-2 bg-white p-3 rounded-lg border border-gray-200">
                  {flowsList.map((f) => {
                    const isChecked = selectedProductFluxos.includes(f.codigo);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          const code = f.codigo;
                          setSelectedProductFluxos((prev) =>
                            prev.includes(code)
                              ? prev.filter((x) => x !== code)
                              : [...prev, code]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                          isChecked
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {isChecked && <Check size={14} />}
                        {f.nome} ({f.codigo})
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedProductId) return;
                    const item = db.items?.find((i: any) => i.id === selectedProductId);
                    if (!item) return;
                    try {
                      await db.updateItem({
                        ...item,
                        fluxos: selectedProductFluxos
                      });
                      setSaveSuccessMsg(`Fluxos atualizados para o produto "${item.code} - ${item.name}"!`);
                      setTimeout(() => setSaveSuccessMsg(null), 3500);
                    } catch (err: any) {
                      alert("Erro ao atualizar item: " + err.message);
                    }
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-xs transition"
                >
                  Salvar Fluxo do Produto
                </button>
              </div>
            )}
          </div>

          {/* List of Products with assigned Fluxos */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
              Resumo de Produtos com Fluxos Configurados ({ (db.items || []).filter((i: any) => i.fluxos && i.fluxos.length > 0).length })
            </h4>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {(db.items || [])
                .filter((i: any) => i.fluxos && i.fluxos.length > 0)
                .map((i: any) => (
                  <div
                    key={i.id}
                    onClick={() => {
                      setSelectedProductId(i.id);
                      setSelectedProductFluxos(i.fluxos || []);
                    }}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition flex justify-between items-center ${
                      selectedProductId === i.id
                        ? "bg-indigo-50 border-indigo-300"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-gray-800">{i.code}</span>
                      <p className="text-gray-600 text-[11px] font-medium line-clamp-1">{i.name}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {i.fluxos.map((fl: string) => (
                        <span key={fl} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[10px]">
                          {fl}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

              {(db.items || []).filter((i: any) => i.fluxos && i.fluxos.length > 0).length === 0 && (
                <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed text-xs">
                  Nenhum produto possui fluxo específico atribuído ainda (por padrão, aparecem em todos os setores habilitados).
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">
                {editingFlow ? "Editar Fluxo Produtivo" : "Novo Fluxo Produtivo"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nome do Fluxo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fluxo A, Fluxo Pintura Especial"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Código do Fluxo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: FLUXO_A"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={ativo ? "true" : "false"}
                    onChange={(e) => setAtivo(e.target.value === "true")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  placeholder="Instruções e escopo do fluxo..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Compound Flow Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isComposto}
                    onChange={(e) => setIsComposto(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-gray-800">
                    Este é um Fluxo Composto (agrupa múltiplos fluxos atômicos)?
                  </span>
                </label>
              </div>

              {/* Sub-flows selector */}
              {isComposto && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                  <span className="text-xs font-bold text-purple-900 block">
                    Selecione os fluxos-base agregados:
                  </span>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {flowsList
                      .filter((f) => !editingFlow || f.id !== editingFlow.id)
                      .map((f) => {
                        const isSelected = fluxosComponentes.includes(f.codigo) || fluxosComponentes.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleComponentFlow(f.codigo)}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium border transition ${
                              isSelected
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                            }`}
                          >
                            <span>{f.codigo} - {f.nome}</span>
                            {isSelected && <CheckCircle2 size={14} />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
                >
                  Salvar Fluxo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
