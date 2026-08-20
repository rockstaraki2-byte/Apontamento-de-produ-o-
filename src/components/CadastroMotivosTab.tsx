import React, { useState, useEffect } from "react";
import { RejectionReason } from "../types";
import {
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  ShieldAlert,
  Tag,
  Info
} from "lucide-react";

interface Props {
  db: any;
}

export const CadastroMotivosTab: React.FC<Props> = ({ db }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<RejectionReason | null>(null);

  // Form State
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("USINAGEM_SOLDA");
  const [ativo, setAtivo] = useState(true);

  const reasonsList: RejectionReason[] = db.rejectionReasons || [];

  // Seed default reasons if empty
  useEffect(() => {
    if (reasonsList.length === 0 && db.addRejectionReason) {
      const seedInitialReasons = async () => {
        try {
          const defaults = [
            { codigo: "MOT-01", descricao: "Solda com trinca, porosa ou falta de penetração", categoria: "SOLDA", ativo: true },
            { codigo: "MOT-02", descricao: "Pintura com falha, bolha, escorrimento ou casca de laranja", categoria: "PINTURA", ativo: true },
            { codigo: "MOT-03", descricao: "Dimensional fora da tolerância do desenho técnico", categoria: "USINAGEM", ativo: true },
            { codigo: "MOT-04", descricao: "Rebarbas excessivas ou cantos vivos não chanfrados", categoria: "ACABAMENTO", ativo: true },
            { codigo: "MOT-05", descricao: "Materia-prima com oxidação, risco profundo ou amassado", categoria: "MATERIAL", ativo: true },
            { codigo: "MOT-06", descricao: "Montagem incorreta ou componente trocado", categoria: "MONTAGEM", ativo: true }
          ];
          for (const r of defaults) {
            await db.addRejectionReason({ ...r, createdAt: Date.now() });
          }
        } catch (e) {
          console.error("Erro ao popular motivos iniciais:", e);
        }
      };
      seedInitialReasons();
    }
  }, [reasonsList.length]);

  const handleOpenModal = (reason?: RejectionReason) => {
    if (reason) {
      setEditingReason(reason);
      setCodigo(reason.codigo);
      setDescricao(reason.descricao);
      setCategoria(reason.categoria || "GERAL");
      setAtivo(reason.ativo);
    } else {
      setEditingReason(null);
      setCodigo(`MOT-0${reasonsList.length + 1}`);
      setDescricao("");
      setCategoria("GERAL");
      setAtivo(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !descricao.trim()) {
      alert("Código e Descrição são obrigatórios.");
      return;
    }

    const payload = {
      codigo: codigo.trim().toUpperCase(),
      descricao: descricao.trim(),
      categoria: categoria.trim().toUpperCase(),
      ativo
    };

    if (editingReason) {
      await db.updateRejectionReason({
        ...editingReason,
        ...payload
      });
    } else {
      await db.addRejectionReason({
        ...payload,
        createdAt: Date.now()
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Tem certeza que deseja excluir o motivo de reprovação "${code}"?`)) {
      await db.deleteRejectionReason(id);
    }
  };

  const filteredReasons = reasonsList.filter(
    (r) =>
      r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.categoria && r.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-amber-600" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Motivos de Reprovação de Qualidade</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre os códigos padronizados de defeito exigidos no modulo de Qualidade e inspeção.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition shadow-sm"
        >
          <Plus size={18} />
          Novo Motivo
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-sm">
        <Info className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div>
          <strong className="font-semibold">Padronização do Módulo de Qualidade:</strong>
          <p className="mt-0.5 text-amber-800">
            Quando a inspeção de qualidade reprova um lote/item, o inspetor é obrigado a selecionar um destes motivos cadastrados. Isso gera dados precisos para o Diagrama de Pareto de Defeitos no Relatório Gerencial.
          </p>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
          <span className="bg-gray-100 px-3 py-1.5 rounded-full">Total: <strong>{reasonsList.length}</strong></span>
          <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full">Ativos: <strong>{reasonsList.filter(r => r.ativo).length}</strong></span>
        </div>
      </div>

      {/* Reasons Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Descrição do Defeito</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReasons.map((reason) => (
                <tr key={reason.id} className="hover:bg-gray-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-amber-700">
                    <span className="bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      {reason.codigo}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-800">
                    {reason.descricao}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                      <Tag size={12} />
                      {reason.categoria || "GERAL"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        reason.ativo ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {reason.ativo ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {reason.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(reason)}
                        className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(reason.id, reason.codigo)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredReasons.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                    Nenhum motivo de reprovação cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">
                {editingReason ? "Editar Motivo" : "Novo Motivo de Reprovação"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: MOT-01"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SOLDA, PINTURA"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Descrição do Defeito *
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva detalhadamente a não conformidade..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>

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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
                >
                  Salvar Motivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
