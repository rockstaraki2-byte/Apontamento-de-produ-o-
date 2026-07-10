import React, { useState } from "react";
import type { useDatabase } from "../useDatabase";
import type { User } from "../types";
import { Users, Clock, Calendar, Handshake, BarChart, Shield } from "lucide-react";
import { CadastrosPeopleTab } from "./gestaopesoas/CadastrosPeopleTab";
import { ControlePontoTab } from "./gestaopesoas/ControlePontoTab";
import { HoraExtraPessoasTab } from "./gestaopesoas/HoraExtraPessoasTab";
import { GestaoDesempenhoTab } from "./gestaopesoas/GestaoDesempenhoTab";
import { GestaoUsuariosTab } from "./gestaopesoas/GestaoUsuariosTab";
import { ScrollContainer } from "./Layout";

export function GestaoPessoasTab({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [subTab, setSubTab] = useState<
    "CADASTROS" | "PONTO" | "HORA_EXTRA" | "DESEMPENHO" | "USUARIOS_SISTEMA"
  >("CADASTROS");

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full animate-in fade-in p-4 md:p-6 gap-4">
      <div className="flex flex-wrap bg-white rounded-lg p-1.5 shadow-sm border border-slate-200 shrink-0 gap-1">
        <button
          onClick={() => setSubTab("CADASTROS")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-colors ${
            subTab === "CADASTROS"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Users size={16} /> Equipe (Cadastros)
        </button>

        <button
          onClick={() => setSubTab("PONTO")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-colors ${
            subTab === "PONTO"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Calendar size={16} /> Controle de Ponto
        </button>

        <button
          onClick={() => setSubTab("HORA_EXTRA")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-colors ${
            subTab === "HORA_EXTRA"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Clock size={16} /> Hora Extra
        </button>

        <button
          onClick={() => setSubTab("DESEMPENHO")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-colors ${
            subTab === "DESEMPENHO"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <BarChart size={16} /> Avaliação de Desempenho
        </button>

        {(currentUser.id === "raul" || currentUser.role === "ADMIN" || currentUser.role === "GERENCIA") && (
          <button
            onClick={() => setSubTab("USUARIOS_SISTEMA")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-colors ml-auto ${
              subTab === "USUARIOS_SISTEMA"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Shield size={16} /> Usuários de Acesso
          </button>
        )}
      </div>

      <ScrollContainer paddingSize="none" className="flex-1 w-full relative min-h-0">
        {subTab === "CADASTROS" && <CadastrosPeopleTab db={db} />}
        {subTab === "PONTO" && <ControlePontoTab db={db} />}
        {subTab === "HORA_EXTRA" && <HoraExtraPessoasTab db={db} />}
        {subTab === "DESEMPENHO" && (
          <GestaoDesempenhoTab db={db} currentUser={currentUser} />
        )}
        {subTab === "USUARIOS_SISTEMA" && (currentUser.id === "raul" || currentUser.role === "ADMIN" || currentUser.role === "GERENCIA") && (
          <GestaoUsuariosTab db={db} currentUser={currentUser} />
        )}
      </ScrollContainer>
    </div>
  );
}
