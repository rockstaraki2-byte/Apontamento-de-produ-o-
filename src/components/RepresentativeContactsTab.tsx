import React, { useState } from "react";
import { Phone, PlusCircle, X } from "lucide-react";
import type { useDatabase } from "../useDatabase";
import type { User } from "../types";

type Database = ReturnType<typeof useDatabase>;

function makeTenantScopedLoginId(login: string, tenantId: string): string {
  const suffix = `.${tenantId.toLowerCase()}`;
  const maxBaseLength = 80 - suffix.length;
  if (maxBaseLength < 1) return "";

  let base = login
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "");

  // Accept a login pasted with its tenant suffix without adding it twice.
  if (base.endsWith(suffix)) base = base.slice(0, -suffix.length);
  base = base.slice(0, maxBaseLength).replace(/[._-]+$/g, "");
  return base ? `${base}${suffix}` : "";
}

function RepresentativeContactRow({
  user,
  db,
  canEdit,
}: {
  user: User;
  db: Database;
  canEdit: boolean;
  key?: React.Key;
}) {
  const [phone, setPhone] = useState(user.phone || "");
  const [email, setEmail] = useState(user.email || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await db.updateUser(user.id, {
        phone: phone.replace(/\D/g, ""),
        email: email.trim(),
      });
      alert(`Contatos do representante ${user.name} atualizados com sucesso!`);
    } catch (error) {
      alert("Erro ao salvar os contatos do representante.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col items-start min-w-0 lg:w-1/3">
        <span className="font-bold text-gray-800 text-sm">{user.name}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold break-all">
          Login: {user.id}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
        <input
          type="tel"
          placeholder="Telefone (WhatsApp)"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={!canEdit || isSaving}
          className="border p-2 rounded text-sm w-44 font-mono focus:ring-1 focus:ring-teal-500 outline-none bg-white text-gray-800 disabled:bg-slate-50 disabled:text-slate-500"
          title="Telefone / WhatsApp"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={!canEdit || isSaving}
          className="border p-2 rounded text-sm w-56 focus:ring-1 focus:ring-teal-500 outline-none bg-white text-gray-800 disabled:bg-slate-50 disabled:text-slate-500"
          title="Email"
        />
        {canEdit && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold transition disabled:opacity-40"
          >
            {isSaving ? "Gravando..." : "Salvar"}
          </button>
        )}
      </div>
    </div>
  );
}

export function RepresentativeContactsTab({
  db,
  currentUser,
}: {
  db: Database;
  currentUser: User;
}) {
  const canManage = currentUser.role === "ADMIN" || currentUser.role === "GERENCIA";
  const tenantId = db.activeTenantId;
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginId = tenantId === "global" ? "" : makeTenantScopedLoginId(login, tenantId);
  const representatives = db.users
    .filter((user) => user.role === "REPRESENTANTE" && user.tenantId === tenantId)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const resetForm = () => {
    setName("");
    setLogin("");
    setPassword("");
    setPhone("");
    setEmail("");
    setErrorMessage("");
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || tenantId === "global") return;
    if (!loginId) {
      setErrorMessage("Informe um login válido para este representante.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);
    try {
      await db.addUser({
        id: loginId,
        name: name.trim(),
        role: "REPRESENTANTE",
        password,
        phone: phone.replace(/\D/g, ""),
        email: email.trim(),
        tenantId,
      });
      setSuccessMessage(`Representante ${name.trim()} cadastrado com login ${loginId}.`);
      resetForm();
      setIsAdding(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(
        message === "USER_ALREADY_EXISTS"
          ? "Este login já está cadastrado nesta empresa. Escolha outro login."
          : message === "FORBIDDEN"
            ? "Seu usuário não tem permissão para cadastrar representantes."
            : "Não foi possível cadastrar o representante. Confira os dados e tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-5 max-w-4xl mx-auto mt-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Phone className="text-teal-600" size={24} />
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Representantes e contatos</h3>
            <p className="text-xs text-gray-500 font-medium">
              Cadastre os acessos e contatos dos representantes desta empresa.
            </p>
          </div>
        </div>
        {canManage && tenantId !== "global" && !isAdding && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setSuccessMessage("");
              setIsAdding(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-bold"
          >
            <PlusCircle size={17} /> Cadastrar representante
          </button>
        )}
      </div>

      <p className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-amber-900 text-xs">
        Para o WhatsApp, informe o Código do País + DDD + Número, apenas com números. Exemplo: <code>5511999998888</code>.
      </p>

      {successMessage && (
        <p role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      )}

      {canManage && tenantId !== "global" && isAdding && (
        <form onSubmit={handleCreate} className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-slate-800">Novo representante</h4>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                resetForm();
              }}
              aria-label="Cancelar cadastro"
              className="text-slate-500 hover:text-slate-800"
            >
              <X size={19} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-700">
              Nome do representante
              <input
                required
                maxLength={120}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ex.: João da Silva"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Login de acesso
              <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-teal-500">
                <input
                  required
                  maxLength={60}
                  autoComplete="username"
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  className="min-w-0 flex-1 rounded-l-lg bg-transparent p-2.5 text-sm font-normal outline-none"
                  placeholder="Ex.: joao.silva"
                />
                <span className="rounded-r-lg border-l border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-bold text-teal-700">
                  .{tenantId}
                </span>
              </div>
              <span className="mt-1 block font-normal text-slate-500">
                Login completo: <strong>{loginId || "informe um login"}</strong>
              </span>
            </label>
            <label className="text-xs font-bold text-slate-700">
              Senha inicial
              <input
                required
                type="password"
                minLength={4}
                maxLength={256}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Mínimo de 4 caracteres"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Telefone / WhatsApp
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="5511999998888"
              />
            </label>
            <label className="text-xs font-bold text-slate-700 md:col-span-2">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="representante@empresa.com"
              />
            </label>
          </div>

          {errorMessage && (
            <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                resetForm();
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : "Salvar representante"}
            </button>
          </div>
        </form>
      )}

      {tenantId === "global" && (
        <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          O cadastro de representantes deve ser feito dentro do tenant da empresa.
        </p>
      )}

      <div className="flex flex-col divide-y divide-gray-100">
        {representatives.map((user) => (
          <RepresentativeContactRow
            key={user.id}
            user={user}
            db={db}
            canEdit={canManage && tenantId !== "global"}
          />
        ))}
        {representatives.length === 0 && tenantId !== "global" && (
          <p className="text-gray-500 text-center text-sm py-8">
            Nenhum representante cadastrado neste tenant.
          </p>
        )}
      </div>
    </div>
  );
}
