import { test } from "node:test";
import assert from "node:assert/strict";
import { compareQueueStatus, isPermanentSyncQueueError, shouldParkSyncItem } from "../src/syncQueuePolicy";

test("erros permanentes de autorização vão para revisão sem novas tentativas cegas", () => {
  assert.equal(isPermanentSyncQueueError({ code: "permission-denied" }), true);
  assert.equal(isPermanentSyncQueueError({ code: "firestore/unauthenticated" }), true);
  assert.equal(shouldParkSyncItem({ code: "permission-denied" }, 1), true);
});

test("falhas transitórias continuam tentando e acabam preservadas após o limite", () => {
  assert.equal(shouldParkSyncItem({ code: "unavailable" }, 1), false);
  assert.equal(shouldParkSyncItem({ code: "unavailable" }, 5), true);
});

test("ações que precisam de revisão ficam atrás das ações que ainda podem sincronizar", () => {
  assert.equal(compareQueueStatus("pending", "needs_attention"), -1);
  assert.equal(compareQueueStatus("needs_attention", "pending"), 1);
  assert.equal(compareQueueStatus(undefined, "pending"), 0);
});
