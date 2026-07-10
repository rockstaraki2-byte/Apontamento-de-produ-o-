import React, { useState } from "react";
import { Users, PlusCircle, Trash2, Save, X } from "lucide-react";
import type { useDatabase } from "../../useDatabase";
import type { Employee } from "../../types";

export function CadastrosPeopleTab({ db }: { db: ReturnType<typeof useDatabase> }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Employee>>({
    name: "",
    isActive: true,
    sectorId: "",
    phone: "",
    cpf: "",
    admissionDate: Date.now(),
    uniformSizes: { shirt: "", pants: "", shoes: "" }
  } as any);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editId) {
      await db.updateEmployee(editId, formData);
      setEditId(null);
    } else {
      await db.addEmployee({
        name: formData.name as string,
        sectorId: formData.sectorId ? Number(formData.sectorId) : 0,
        isActive: formData.isActive ?? true,
        phone: formData.phone || "",
        cpf: formData.cpf || "",
        admissionDate: formData.admissionDate || Date.now(),
        uniformSizes: formData.uniformSizes || { shirt: "", pants: "", shoes: "" },
      });
      setIsAdding(false);
    }
  };

  const handleEdit = (em: Employee) => {
    setEditId(em.id);
    setFormData({
      ...em,
      uniformSizes: em.uniformSizes || { shirt: "", pants: "", shoes: "" }
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o colaborador ${name}?`)) {
      await db.deleteEmployee(id);
    }
  };

  const formatSec = (sid: number) => {
    const sec = db.sectors.find(s => s.id === sid);
    return sec ? sec.name : "N/A";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Quadro de Colaboradores ({db.employees.length})
        </h3>
        {!isAdding && (
          <button
            onClick={() => {
              setFormData({
                name: "",
                isActive: true,
                sectorId: db.sectors[0]?.id || "",
                phone: "",
                cpf: "",
                admissionDate: Date.now(),
                uniformSizes: { shirt: "", pants: "", shoes: "" }
              } as any);
              setEditId(null);
              setIsAdding(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <PlusCircle size={16} /> Novo Colaborador
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="font-bold text-slate-700">{editId ? "Editar Colaborador" : "Novo Colaborador"}</h4>
            <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Setor</label>
              <select required value={formData.sectorId} onChange={e => setFormData({...formData, sectorId: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
                <option value="">Selecione...</option>
                {db.sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
              <select value={formData.isActive ? "true" : "false"} onChange={e => setFormData({...formData, isActive: e.target.value === "true"})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">CPF</label>
              <input type="text" placeholder="000.000.000-00" value={formData.cpf || ""} onChange={e => setFormData({...formData, cpf: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Telefone / WhatsApp</label>
              <input type="tel" placeholder="(00) 00000-0000" value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Data de Admissão</label>
              <input type="date" value={formData.admissionDate ? new Date(formData.admissionDate).toISOString().split('T')[0] : ""} onChange={e => setFormData({...formData, admissionDate: new Date(e.target.value).getTime()})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <h5 className="font-bold text-slate-700 text-sm mb-3 border-b pb-1">Tamanhos de Uniforme / EPI</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-150">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Camisa</label>
              <select value={formData.uniformSizes?.shirt || ""} onChange={e => setFormData({...formData, uniformSizes: { ...formData.uniformSizes, shirt: e.target.value }})} className="w-full border border-slate-200 rounded-md p-1.5 text-sm outline-none">
                <option value="">Selecione...</option>
                <option value="PP">PP</option>
                <option value="P">P</option>
                <option value="M">M</option>
                <option value="G">G</option>
                <option value="GG">GG</option>
                <option value="EXG">EXG</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Calça</label>
              <select value={formData.uniformSizes?.pants || ""} onChange={e => setFormData({...formData, uniformSizes: { ...formData.uniformSizes, pants: e.target.value }})} className="w-full border border-slate-200 rounded-md p-1.5 text-sm outline-none">
                <option value="">Selecione...</option>
                <option value="36">36</option>
                <option value="38">38</option>
                <option value="40">40</option>
                <option value="42">42</option>
                <option value="44">44</option>
                <option value="46">46</option>
                <option value="48">48</option>
                <option value="50">50</option>
                <option value="52">52</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Botina / Sapato</label>
              <input type="number" placeholder="Ex: 40" value={formData.uniformSizes?.shoes || ""} onChange={e => setFormData({...formData, uniformSizes: { ...formData.uniformSizes, shoes: e.target.value }})} className="w-full border border-slate-200 rounded-md p-1.5 text-sm outline-none" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-sm transition">
              <Save size={16} /> {editId ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Setor</th>
              <th className="px-4 py-3">Contato / CPF</th>
              <th className="px-4 py-3 text-center">Uniformes (C/Cal/S)</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {db.employees.map(em => (
              <tr key={em.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-semibold text-slate-800">{em.name}</td>
                <td className="px-4 py-3 text-slate-600">{formatSec(em.sectorId)}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  <div className="flex flex-col">
                    <span>{em.phone || "-"}</span>
                    <span className="text-[10px] text-slate-400">{em.cpf || ""}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-600">
                  {em.uniformSizes?.shirt || "-"} / {em.uniformSizes?.pants || "-"} / {em.uniformSizes?.shoes || "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${em.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {em.isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => handleEdit(em)} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded">Editar</button>
                    <button onClick={() => handleDelete(em.id, em.name)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded transition"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {db.employees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                  Nenhum colaborador cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
