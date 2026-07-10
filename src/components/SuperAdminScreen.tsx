import React, { useState } from "react";
import { 
  Building2, 
  Paintbrush, 
  Trash2, 
  PlusCircle, 
  Save, 
  X, 
  Edit, 
  Users, 
  ShieldAlert,
  Key,
  Crown,
  Upload
} from "lucide-react";
import type { useDatabase } from "../useDatabase";
import type { Tenant, User, Role } from "../types";

interface SuperAdminScreenProps {
  db: ReturnType<typeof useDatabase>;
}

export function SuperAdminScreen({ db }: SuperAdminScreenProps) {
  const [activeTab, setActiveTab] = useState<"COMPANIES" | "USERS">("COMPANIES");
  
  // Company Form State
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [companyForm, setCompanyForm] = useState<any>({
    id: "",
    name: "",
    logoUrl: "/icon.png",
    primaryColor: "#00b14f",
    systemName: "",
    sectorsInput: "",
    machinesInput: "",
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL("image/png");
          setCompanyForm((prev: any) => ({ ...prev, logoUrl: base64 }));
        }
        setIsUploadingLogo(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // User Form State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<any>({
    id: "",
    name: "",
    role: "PRODUCAO" as Role,
    password: "",
    tenantId: "imperio",
    sectorIds: [] as number[],
    machines: [] as string[],
  });

  const rolesList: { value: Role; label: string }[] = [
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

  // COMPANY HANDLERS
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.id || !companyForm.name) {
      alert("Por favor, preencha o Suffix/ID e o Nome da Empresa.");
      return;
    }

    const cleanId = companyForm.id.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!cleanId) {
      alert("ID da Empresa inválido.");
      return;
    }

    const trimmedSectors = (companyForm.sectorsInput || "").trim();
    if (!trimmedSectors) {
      alert("Por favor, insira pelo menos um setor para esta nova empresa. Os setores definem as abas e o painel de produção.");
      return;
    }

    const parsedMachines = (companyForm.machinesInput || "")
      .split(",")
      .map((m: string) => m.trim())
      .filter(Boolean);

    const tenantData: Tenant = {
      id: cleanId,
      name: companyForm.name.trim(),
      logoUrl: companyForm.logoUrl?.trim() || "/icon.png",
      primaryColor: companyForm.primaryColor?.trim() || "#00b14f",
      systemName: companyForm.systemName?.trim() || "SISTEMA DE PRODUÇÃO",
      machines: parsedMachines,
    };

    try {
      await db.addTenant(tenantData);

      // Sync sectors
      const parsedSectors = trimmedSectors
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);

      const existingSectors = db.allSectors.filter((s) => s.tenantId === cleanId);
      for (const sName of parsedSectors) {
        const exists = existingSectors.some((es) => es.name.toLowerCase() === sName.toLowerCase());
        if (!exists) {
          await db.addSector({
            name: sName,
            tenantId: cleanId,
          } as any);
        }
      }

      setIsAddingCompany(false);
      setEditCompanyId(null);
      setCompanyForm({
        id: "",
        name: "",
        logoUrl: "/icon.png",
        primaryColor: "#00b14f",
        systemName: "",
        sectorsInput: "",
        machinesInput: "",
      });
      alert("Empresa salva com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar empresa: " + err.message);
    }
  };

  const handleEditCompany = (t: Tenant) => {
    setEditCompanyId(t.id);
    const tenantSectors = db.allSectors
      .filter((s) => s.tenantId === t.id)
      .map((s) => s.name)
      .join(", ");
    setCompanyForm({
      ...t,
      sectorsInput: tenantSectors || "",
      machinesInput: t.machines?.join(", ") || "",
    } as any);
    setIsAddingCompany(true);
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (id === "imperio") {
      alert("A empresa padrão 'imperio' não pode ser removida.");
      return;
    }
    if (confirm(`Excluir a empresa "${name}"? Todos os dados isolados desta empresa não serão exibidos.`)) {
      try {
        await db.deleteTenant(id);
        alert("Empresa removida com sucesso!");
      } catch (err: any) {
        alert("Erro ao excluir: " + err.message);
      }
    }
  };

  // USER HANDLERS
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.id || !userForm.name || !userForm.password) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    let cleanId = userForm.id.trim().toLowerCase();
    
    // Auto-append appropriate tenant suffix to ensure no conflict across tenants
    const suffix = `.${userForm.tenantId}`;
    if (!cleanId.endsWith(suffix) && userForm.tenantId !== "global") {
      cleanId = cleanId + suffix;
    }

    const userData: User = {
      id: cleanId,
      name: userForm.name.trim(),
      role: userForm.role,
      password: userForm.password.trim(),
      tenantId: userForm.tenantId,
      sectorIds: userForm.sectorIds || [],
      machines: userForm.machines || [],
    };

    try {
      if (editUserId) {
        await db.updateUser(editUserId, userData);
      } else {
        await db.addUser(userData);
      }
      setIsAddingUser(false);
      setEditUserId(null);
      setUserForm({
        id: "",
        name: "",
        role: "PRODUCAO",
        password: "",
        tenantId: "imperio",
        sectorIds: [],
        machines: [],
      });
      alert("Usuário gravado com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar usuário: " + err.message);
    }
  };

  const handleEditUser = (u: User) => {
    setEditUserId(u.id);
    // Remove the suffix for editing to make it cleaner
    const suffix = `.${u.tenantId || "imperio"}`;
    const baseId = u.id.endsWith(suffix) ? u.id.slice(0, -suffix.length) : u.id;
    
    setUserForm({
      id: baseId,
      name: u.name,
      role: u.role,
      password: u.password || "",
      tenantId: u.tenantId || "imperio",
      sectorIds: u.sectorIds || [],
      machines: u.machines || [],
    });
    setIsAddingUser(true);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === "raul") {
      alert("O usuário administrador Raul não pode ser excluído.");
      return;
    }
    if (confirm(`Excluir o acesso do usuário "${name}"?`)) {
      try {
        await db.deleteUser(id);
        alert("Usuário excluído!");
      } catch (err: any) {
        alert("Erro ao excluir: " + err.message);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Banner de Super Admin */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#00b14f] p-3 rounded-xl shadow-inner text-black">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                PAINEL MULTI-TENANT <span className="text-[10px] bg-red-650 text-white px-2 py-0.5 rounded-full font-bold">SUPER ADMINISTRADOR</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Gerencie empresas licenciadas, logos, cores do sistema e controle de acessos globais de forma centralizada.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("COMPANIES")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "COMPANIES" 
                  ? "bg-white text-slate-900 shadow" 
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Building2 size={14} className="inline mr-1" /> Empresas
            </button>
            <button
              onClick={() => setActiveTab("USERS")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "USERS" 
                  ? "bg-white text-slate-900 shadow" 
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Users size={14} className="inline mr-1" /> Usuários Globais
            </button>
          </div>
        </div>

        {/* TAB CONTROLLERS */}
        {activeTab === "COMPANIES" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Form de Adicionar/Editar Empresa */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 text-sm uppercase tracking-wide">
                <Paintbrush size={16} className="text-indigo-600" />
                {editCompanyId ? "Editar Empresa" : "Cadastrar Nova Empresa"}
              </h3>

              <form onSubmit={handleSaveCompany} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Suffix / ID da Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!!editCompanyId}
                    placeholder="Ex: val (para valdemoveis)"
                    value={companyForm.id}
                    onChange={(e) => setCompanyForm({ ...companyForm, id: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">
                    Isso define o sufixo de login (Ex: se ID for <strong className="text-indigo-600">val</strong>, logins serão <strong className="text-indigo-600">usuario.val</strong>).
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Razão Social (Nome) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Valdemóveis Indústria"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Sub-Título / Nome do Sistema
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ACESSÓRIOS PARA MÓVEIS"
                    value={companyForm.systemName}
                    onChange={(e) => setCompanyForm({ ...companyForm, systemName: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Cor Primária (Hex)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={companyForm.primaryColor}
                      onChange={(e) => setCompanyForm({ ...companyForm, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded border border-slate-200 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      placeholder="#00b14f"
                      value={companyForm.primaryColor}
                      onChange={(e) => setCompanyForm({ ...companyForm, primaryColor: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Setores da Empresa (Separados por vírgula) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Ex: Solda, Pintura, Montagem, Embalagem, Corte Laser"
                    value={companyForm.sectorsInput || ""}
                    onChange={(e) => setCompanyForm({ ...companyForm, sectorsInput: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-16"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">
                    Estes setores definirão o painel de produção e apontamentos para esta empresa.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Maquinarias / Equipamentos (Separados por vírgula)
                  </label>
                  <textarea
                    placeholder="Ex: Torno CNC Willian, Prensa Eduardo, Injetora"
                    value={companyForm.machinesInput || ""}
                    onChange={(e) => setCompanyForm({ ...companyForm, machinesInput: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-16"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">
                    Máquinas para vincular aos usuários e lançar paradas/atividades de torno.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Logo da Empresa <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="flex items-center gap-4 border border-slate-200 bg-slate-50/50 rounded-lg p-3">
                    <div className="relative flex-1">
                      <input
                        type="file"
                        id="logo-file-input"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo-file-input"
                        className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-lg p-3 cursor-pointer hover:bg-slate-100/50 hover:border-indigo-500 transition-all text-center bg-white"
                      >
                        <Upload size={16} className="text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">
                          {isUploadingLogo ? "Processando..." : "Subir Arquivo de Logo"}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          Formatos PNG, JPG, SVG
                        </span>
                      </label>
                    </div>

                    {companyForm.logoUrl && (
                      <div className="flex flex-col items-center gap-1 shrink-0 border border-slate-200 p-2 rounded-lg bg-white">
                        <img
                          src={companyForm.logoUrl}
                          alt="Visualização"
                          className="h-12 w-16 object-contain rounded"
                        />
                        <button
                          type="button"
                          onClick={() => setCompanyForm((prev) => ({ ...prev, logoUrl: "/icon.png" }))}
                          className="text-[9px] font-bold text-red-500 hover:underline"
                        >
                          Limpar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2.5 rounded-lg text-xs transition shadow-sm"
                  >
                    <Save size={14} className="inline mr-1" /> Salvar Empresa
                  </button>
                  {isAddingCompany && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCompany(false);
                        setEditCompanyId(null);
                        setCompanyForm({ id: "", name: "", logoUrl: "/icon.png", primaryColor: "#00b14f", systemName: "", sectorsInput: "", machinesInput: "" });
                      }}
                      className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Listagem de Empresas Cadastradas */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                  <span>🏢 EMPRESAS CADASTRADAS ({db.tenants.length})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {db.tenants.map((t) => (
                    <div 
                      key={t.id} 
                      className="border border-slate-150 rounded-xl p-4 flex flex-col justify-between bg-slate-50/50 hover:bg-white transition shadow-2xs relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: t.primaryColor || '#00b14f' }} />
                      
                      <div className="pl-2">
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            {t.logoUrl ? (
                              <img src={t.logoUrl} alt={t.name} className="w-8 h-8 object-contain rounded" />
                            ) : (
                              <Crown size={24} style={{ color: t.primaryColor || '#00b14f' }} />
                            )}
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-xs tracking-tight line-clamp-1">{t.name}</h4>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.systemName || "SISTEMA"}</span>
                            </div>
                          </div>
                          <span className="text-[8px] bg-slate-200 font-black text-slate-700 px-2 py-0.5 rounded uppercase font-mono">
                            .{t.id}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 border-t border-slate-100 pt-3">
                          <div>
                            <span className="text-[7.5px] uppercase block font-extrabold text-slate-400">Hex Cor</span>
                            <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.primaryColor || '#00b14f' }} />
                              {t.primaryColor}
                            </span>
                          </div>
                          <div>
                            <span className="text-[7.5px] uppercase block font-extrabold text-slate-400">Logo</span>
                            <span className="truncate block font-semibold text-slate-800" title={t.logoUrl}>{t.logoUrl}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4 pl-2">
                        <button
                          onClick={() => handleEditCompany(t)}
                          className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded transition"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          disabled={t.id === "imperio"}
                          onClick={() => handleDeleteCompany(t.id, t.name)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded transition disabled:opacity-30"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Form de Adicionar/Editar Usuário */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 text-sm uppercase tracking-wide">
                <Key size={16} className="text-indigo-600" />
                {editUserId ? "Editar Acesso" : "Criar Novo Acesso"}
              </h3>

              <form onSubmit={handleSaveUser} className="flex flex-col gap-4">
                
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Empresa da Conta <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userForm.tenantId}
                    onChange={(e) => setUserForm({ ...userForm, tenantId: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="global">Global (Administra Todas as Empresas)</option>
                    {db.tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (.{t.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Raul Jomarci"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Login / Usuário de Acesso <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-500">
                    <input
                      type="text"
                      placeholder="Ex: gerencia"
                      value={userForm.id}
                      onChange={(e) => setUserForm({ ...userForm, id: e.target.value })}
                      className="flex-1 text-xs font-medium bg-transparent focus:outline-none"
                    />
                    {userForm.tenantId !== "global" && (
                      <span className="text-xs font-bold text-slate-400 font-mono select-none">
                        .{userForm.tenantId}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1">
                    O login final será: <strong className="text-indigo-600">{userForm.id || "usuario"}{userForm.tenantId !== "global" ? `.${userForm.tenantId}` : ""}</strong>
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Role / Nível de Acesso <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {rolesList.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Senha de Acesso <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 230213"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50/50 rounded-lg p-2.5 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {userForm.tenantId !== "global" && (
                  <>
                    <div className="border-t border-slate-100 pt-3 mt-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-2">
                        Vincular aos Setores da Empresa
                      </label>
                      {(() => {
                        const tenantSectors = db.allSectors.filter(s => s.tenantId === userForm.tenantId);
                        if (tenantSectors.length === 0) {
                          return <p className="text-[11px] text-slate-400 italic">Nenhum setor cadastrado para esta empresa.</p>;
                        }
                        return (
                          <div className="grid grid-cols-1 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-150 max-h-36 overflow-y-auto">
                            {tenantSectors.map((sec) => {
                              const isChecked = userForm.sectorIds?.includes(sec.id);
                              return (
                                <label key={sec.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const currentIds = userForm.sectorIds || [];
                                      if (e.target.checked) {
                                        setUserForm({ ...userForm, sectorIds: [...currentIds, sec.id] });
                                      } else {
                                        setUserForm({ ...userForm, sectorIds: currentIds.filter(id => id !== sec.id) });
                                      }
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="truncate">{sec.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-2">
                        Vincular às Maquinarias/Equipamentos
                      </label>
                      {(() => {
                        const tenantObj = db.tenants.find(t => t.id === userForm.tenantId);
                        const tenantMachines = tenantObj?.machines || [];
                        if (tenantMachines.length === 0) {
                          return <p className="text-[11px] text-slate-400 italic">Nenhuma maquinaria cadastrada para esta empresa.</p>;
                        }
                        return (
                          <div className="grid grid-cols-1 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-150 max-h-36 overflow-y-auto">
                            {tenantMachines.map((mach) => {
                              const isChecked = userForm.machines?.includes(mach);
                              return (
                                <label key={mach} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const currentMachs = userForm.machines || [];
                                      if (e.target.checked) {
                                        setUserForm({ ...userForm, machines: [...currentMachs, mach] });
                                      } else {
                                        setUserForm({ ...userForm, machines: currentMachs.filter(m => m !== mach) });
                                      }
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="truncate">{mach}</span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2.5 rounded-lg text-xs transition shadow-sm"
                  >
                    <Save size={14} className="inline mr-1" /> Salvar Usuário
                  </button>
                  {isAddingUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingUser(false);
                        setEditUserId(null);
                        setUserForm({ id: "", name: "", role: "PRODUCAO", password: "", tenantId: "imperio" });
                      }}
                      className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Lista dos Usuários do Sistema */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm overflow-hidden">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                  <span>🔑 LISTA DE CONTAS MULTI-TENANT</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">
                        <th className="py-2.5 px-2">Usuário (ID)</th>
                        <th className="py-2.5 px-2">Nome</th>
                        <th className="py-2.5 px-2">Empresa</th>
                        <th className="py-2.5 px-2">Nível (Role)</th>
                        <th className="py-2.5 px-2">Senha</th>
                        <th className="py-2.5 px-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {db.users.map((u) => {
                        const tenantObj = db.tenants.find(t => t.id === u.tenantId);
                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-2 font-mono font-bold text-indigo-700">{u.id}</td>
                            <td className="py-3 px-2 font-semibold text-slate-900">{u.name}</td>
                            <td className="py-3 px-2">
                              {u.tenantId === "global" ? (
                                <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] border border-red-200">
                                  Global
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span className="bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded text-[10px] border border-sky-200 w-max">
                                    {tenantObj?.name || u.tenantId} (.{u.tenantId})
                                  </span>
                                  {u.sectorIds && u.sectorIds.length > 0 && (
                                    <span className="text-[10px] text-slate-500 font-bold">
                                      📍 Setores: {u.sectorIds.map(sid => db.allSectors.find(s => s.id === sid)?.name || sid).join(", ")}
                                    </span>
                                  )}
                                  {u.machines && u.machines.length > 0 && (
                                    <span className="text-[10px] text-indigo-500 font-bold">
                                      ⚙️ Maq: {u.machines.join(", ")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2 font-bold text-slate-500">{u.role}</td>
                            <td className="py-3 px-2 font-mono text-slate-600">{u.password}</td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => handleEditUser(u)}
                                  className="p-1 hover:bg-slate-100 text-indigo-600 rounded transition"
                                  title="Editar"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  disabled={u.id === "raul"}
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="p-1 hover:bg-red-50 text-red-600 rounded transition disabled:opacity-20"
                                  title="Excluir"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
