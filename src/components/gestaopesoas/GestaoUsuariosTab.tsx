import React, { useState } from "react";
import { Users, PlusCircle, Trash2, Save, X, Edit, Lock, Shield, Settings, Server } from "lucide-react";
import type { useDatabase } from "../../useDatabase";
import type { User, Role } from "../../types";

export function GestaoUsuariosTab({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<User>>({
    name: "",
    role: "PRODUCAO",
    password: "",
    sectorIds: [],
    machines: [],
  });

  // Allowed to edit: Super-admin Raul or any user with ADMIN or GERENCIA roles
  const canEdit = currentUser.id === "raul" || currentUser.role === "ADMIN" || currentUser.role === "GERENCIA";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role) return;
    if (!canEdit) return;

    // Determine final login ID with suffix
    let rawUsername = formData.name.trim().toLowerCase();
    const suffix = `.${db.activeTenantId}`;
    let loginId = rawUsername;
    if (db.activeTenantId !== "global" && !rawUsername.endsWith(suffix)) {
      loginId = `${rawUsername}${suffix}`;
    }

    const userData: Partial<User> = {
      name: formData.name.trim(),
      role: formData.role as Role,
      password: formData.password || "",
      sectorIds: formData.sectorIds || [],
      machines: formData.machines || [],
      tenantId: db.activeTenantId,
    };

    if (editId) {
      await db.updateUser(editId, userData);
      setEditId(null);
    } else {
      await db.addUser({
        ...userData,
        id: loginId,
      });
    }
    setIsAdding(false);
    setFormData({ name: "", role: "PRODUCAO", password: "", sectorIds: [], machines: [] });
  };

  const handleEdit = (u: User) => {
    if (!canEdit) return;
    setEditId(u.id);
    
    // Strip the company suffix if it exists for editing ease
    let nameWithoutSuffix = u.name;
    const suffix = `.${db.activeTenantId}`;
    if (nameWithoutSuffix.toLowerCase().endsWith(suffix)) {
      nameWithoutSuffix = nameWithoutSuffix.substring(0, nameWithoutSuffix.length - suffix.length);
    } else if (u.id.toLowerCase().endsWith(suffix)) {
      const parts = u.id.split(".");
      nameWithoutSuffix = parts.slice(0, -1).join(".");
    }

    setFormData({
      name: nameWithoutSuffix,
      role: u.role,
      password: u.password || "",
      sectorIds: u.sectorIds || [],
      machines: u.machines || [],
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!canEdit) return;
    if (confirm(`Tem certeza que deseja excluir o usuário de sistema ${name}?`)) {
      await db.deleteUser(id);
    }
  };

  const roles: { value: Role; label: string }[] = [
    { value: "ADMIN", label: "Administrador (Acesso Total)" },
    { value: "GERENCIA", label: "Gerência" },
    { value: "PCP", label: "PCP" },
    { value: "PRODUCAO", label: "Produção (Montagem, Solda, etc)" },
    { value: "CORTE_LASER", label: "Corte Laser / Dobra" },
    { value: "PINTURA", label: "Pintura" },
    { value: "EMBALAGEM", label: "Embalagem" },
    { value: "REPRESENTANTE", label: "Representante / Vendas" },
    { value: "ESTOQUE", label: "Estoque" },
  ];

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-indigo-600" />
            Usuários de Acesso ao Sistema
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie os usuários do sistema da sua empresa, vinculando-os a setores e maquinarias específicas.
          </p>
        </div>
        {!isAdding && canEdit && (
          <button
            onClick={() => {
              setFormData({ name: "", role: "PRODUCAO", password: "", sectorIds: [], machines: [] });
              setEditId(null);
              setIsAdding(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
          >
            <PlusCircle size={16} /> Novo Usuário
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm flex items-center gap-2">
          <Lock size={18} className="text-amber-600" />
          Apenas Administradores e Gerentes podem gerenciar usuários do sistema.
        </div>
      )}

      {isAdding && canEdit && (
        <form
          onSubmit={handleSave}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2 flex flex-col gap-5"
        >
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-slate-700">
              {editId ? "Editar Usuário" : "Novo Usuário"}
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Nome (Login)
              </label>
              <div className="relative flex items-center">
                <input
                  required
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none pr-20"
                  placeholder="Ex: joao"
                />
                {db.activeTenantId !== "global" && (
                  <span className="absolute right-2 text-xs font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 select-none">
                    .{db.activeTenantId}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Login final: <strong className="text-slate-600">{formData.name || "usuario"}{db.activeTenantId !== "global" ? `.${db.activeTenantId}` : ""}</strong>
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Nível de Acesso (Perfil)
              </label>
              <select
                required
                value={formData.role || ""}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as Role })
                }
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="">Selecione...</option>
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Senha (Opcional)
              </label>
              <input
                type="text"
                value={formData.password || ""}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Ex: 123456"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                <Settings size={14} className="text-indigo-500" />
                Vincular aos Setores da Empresa
              </label>
              {db.sectors.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum setor cadastrado para esta empresa.</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                  {db.sectors.map((sec) => {
                    const isChecked = formData.sectorIds?.includes(sec.id);
                    return (
                      <label key={sec.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const currentIds = formData.sectorIds || [];
                            if (e.target.checked) {
                              setFormData({ ...formData, sectorIds: [...currentIds, sec.id] });
                            } else {
                              setFormData({ ...formData, sectorIds: currentIds.filter(id => id !== sec.id) });
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="truncate">{sec.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                <Server size={14} className="text-indigo-500" />
                Vincular às Maquinarias
              </label>
              {(!db.activeTenant?.machines || db.activeTenant.machines.length === 0) ? (
                <p className="text-xs text-slate-400 italic">Nenhuma maquinaria cadastrada para esta empresa.</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                  {db.activeTenant.machines.map((mach) => {
                    const isChecked = formData.machines?.includes(mach);
                    return (
                      <label key={mach} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const currentMachs = formData.machines || [];
                            if (e.target.checked) {
                              setFormData({ ...formData, machines: [...currentMachs, mach] });
                            } else {
                              setFormData({ ...formData, machines: currentMachs.filter(m => m !== mach) });
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="truncate">{mach}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-sm transition"
            >
              <Save size={16} /> {editId ? "Atualizar Usuário" : "Salvar Usuário"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="px-4 py-3">Nome / Usuário</th>
                <th className="px-4 py-3">Perfil de Acesso</th>
                <th className="px-4 py-3">Vínculos</th>
                <th className="px-4 py-3">Senha</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.users.map((u) => {
                const roleLabel = roles.find((r) => r.value === u.role)?.label || u.role;
                const isProtected = u.id === "gerencia" || u.id === "admin";
                
                // Fetch associated names
                const linkedSectorsNames = (u.sectorIds || [])
                  .map((sid) => db.sectors.find((s) => s.id === sid)?.name)
                  .filter(Boolean)
                  .join(", ");
                const linkedMachinesNames = (u.machines || []).join(", ");

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-slate-400 shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{u.name}</span>
                          <span className="text-[10px] text-indigo-500 font-mono font-bold leading-none">{u.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold">
                        {roleLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">
                      <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                        {linkedSectorsNames && (
                          <span className="truncate">
                            <strong className="text-slate-600 font-bold">Setores:</strong> {linkedSectorsNames}
                          </span>
                        )}
                        {linkedMachinesNames && (
                          <span className="truncate">
                            <strong className="text-slate-600 font-bold">Máquinas:</strong> {linkedMachinesNames}
                          </span>
                        )}
                        {!linkedSectorsNames && !linkedMachinesNames && (
                          <span className="text-slate-400 italic">Sem vínculos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                      {u.password ? "••••••••" : <span className="italic text-slate-400">Sem senha</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(u)}
                            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded"
                          >
                            Editar
                          </button>
                        )}
                        {canEdit && !isProtected && (
                          <button
                            onClick={() => handleDelete(u.id, u.name)}
                            className="text-rose-500 hover:bg-rose-50 p-1.5 rounded transition"
                            title="Excluir Usuário"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {isProtected && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">
                            Padrão
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {db.users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500 text-sm"
                  >
                    Nenhum usuário cadastrado para esta empresa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
