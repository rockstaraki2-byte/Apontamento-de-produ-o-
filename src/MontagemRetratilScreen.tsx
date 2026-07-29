import React from "react";
import { ProducaoScreen } from "./ProducaoScreen";
import { useDatabase } from "./useDatabase";
import type { User } from "./types";

export function MontagemRetratilScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  return <ProducaoScreen db={db} currentUser={currentUser} />;
}
