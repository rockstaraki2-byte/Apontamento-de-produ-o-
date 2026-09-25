import assert from "node:assert/strict";
import test from "node:test";
import {
  getLoginIdentifierCandidates,
  isImperioTornoWillianUser,
  normalizeTornoWillianUser,
} from "../src/loginAliases";
import type { User } from "../src/types";

test("aceita a variação William/Willian do login do torno mantendo o sufixo", () => {
  assert.deepEqual(
    getLoginIdentifierCandidates("torno_cnc_william.imperio"),
    ["torno_cnc_william.imperio", "torno_cnc_willian.imperio"],
  );
  assert.deepEqual(getLoginIdentifierCandidates("torno_cnc_willian"), [
    "torno_cnc_willian",
    "torno_cnc_william",
  ]);
});

test("normaliza somente o perfil de torno do Império e preserva outros perfis", () => {
  const user = {
    id: "torno_cnc_willian.imperio",
    name: "Torno CNC Willian",
    role: "TORNO_CNC_WILLIAN",
    tenantId: "imperio",
  } as User;

  assert.equal(isImperioTornoWillianUser(user), true);
  assert.equal(normalizeTornoWillianUser(user).role, "TORNO_CNC_WILLIAN");
  assert.equal(
    normalizeTornoWillianUser({ ...user, tenantId: "outra-empresa" }).role,
    "TORNO_CNC_WILLIAN",
  );
});
