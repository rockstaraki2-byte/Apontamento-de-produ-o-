import React, { useState } from "react";
import { useDatabase } from "./useDatabase";
import { User, Sector, ProductFlow, Customer } from "./types";

export function PCPCadastrosScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [subTab, setSubTab] = useState<"CLIENTES" | "SETORES" | "FLUXOS">(
    "CLIENTES",
  );

  // TODO: Add forms for Cadastros
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-4">
      <div className="flex border-b border-gray-200">
        <button
          className={`py-2 px-4 font-semibold text-sm transition-colors ${subTab === "CLIENTES" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setSubTab("CLIENTES")}
        >
          Clientes
        </button>
        <button
          className={`py-2 px-4 font-semibold text-sm transition-colors ${subTab === "SETORES" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setSubTab("SETORES")}
        >
          Setores
        </button>
        <button
          className={`py-2 px-4 font-semibold text-sm transition-colors ${subTab === "FLUXOS" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setSubTab("FLUXOS")}
        >
          Fluxos por Produto
        </button>
      </div>

      <div className="pt-4">
        {subTab === "CLIENTES" && (
          <div>
            <h3 className="font-bold text-lg mb-2">Clientes</h3>
            {/* Clientes List & Form */}
            <p className="text-gray-500 text-sm">
              Funcionalidade de cadastro de clientes a ser implementada.
            </p>
          </div>
        )}
        {subTab === "SETORES" && (
          <div>
            <h3 className="font-bold text-lg mb-2">Setores</h3>
            {/* Setores List & Form */}
            <p className="text-gray-500 text-sm">
              Funcionalidade de cadastro de setores a ser implementada.
            </p>
          </div>
        )}
        {subTab === "FLUXOS" && (
          <div>
            <h3 className="font-bold text-lg mb-2">Fluxos por Produto</h3>
            {/* Fluxos List & Form */}
            <p className="text-gray-500 text-sm">
              Funcionalidade de cadastro de fluxos a ser implementada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
