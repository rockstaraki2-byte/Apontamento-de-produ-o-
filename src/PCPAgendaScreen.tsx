import React from "react";
import { useDatabase } from "./useDatabase";
import { User } from "./types";

export function PCPAgendaScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-4">
      <h3 className="font-bold text-lg mb-2">Agenda de Produção</h3>
      <p className="text-gray-500 text-sm">
        Aqui o sistema estimará as datas de produção para cada um dos produtos
        nos setores (verificando a capacidade produtiva).
      </p>
    </div>
  );
}
