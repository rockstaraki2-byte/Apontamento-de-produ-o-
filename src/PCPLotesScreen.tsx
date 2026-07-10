import React from "react";
import { useDatabase } from "./useDatabase";
import { User } from "./types";

export function PCPLotesScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-4">
      <h3 className="font-bold text-lg mb-2">Montagem de Lotes</h3>
      <p className="text-gray-500 text-sm">
        O sistema vai sugerir alguns lotes separando os itens dos pedidos
        considerando setor / produto / fluxo do produto / capacidades...
      </p>
    </div>
  );
}
