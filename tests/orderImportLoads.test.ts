import test from "node:test";
import assert from "node:assert/strict";
import { selectOrderLoad } from "../api/_lib/orderImportLoads.js";

const route = {
  id: "rota-uba",
  tenantId: "imperio",
  name: "Rota Ubá - Segunda",
  active: true,
  weekday: 1,
  shift: "MANHA",
  customerIds: [5],
};

test("cria plano para a próxima data elegível da rota quando não há carga", () => {
  const result = selectOrderLoad("imperio", 5, "Ubá", "2026-10-09", [route], []);
  assert.deepEqual(result.plan, {
    routeId: "rota-uba",
    routeName: "Rota Ubá - Segunda",
    scheduledDate: "2026-10-12",
    createCarga: true,
  });
});

test("reaproveita a carga aberta da mesma rota e data elegível", () => {
  const result = selectOrderLoad("imperio", 5, "Ubá", "2026-10-09", [route], [{
    id: "carga-manual",
    tenantId: "imperio",
    routeId: "rota-uba",
    scheduledDate: "2026-10-12",
    status: "ABERTA",
  }]);
  assert.equal(result.plan?.cargaId, "carga-manual");
  assert.equal(result.plan?.createCarga, false);
});

test("não cria carga duplicada se a carga da rota/data já estiver fechada", () => {
  const result = selectOrderLoad("imperio", 5, "Ubá", "2026-10-09", [route], [{
    id: "carga-fechada",
    tenantId: "imperio",
    routeId: "rota-uba",
    scheduledDate: "2026-10-12",
    status: "FECHADA",
  }]);
  assert.equal(result.plan, undefined);
  assert.match(result.warning || "", /já existe uma carga/);
});

test("rota pode ser identificada pela cidade e registros de outro tenant são ignorados", () => {
  const cityRoute = { ...route, customerIds: [], name: "Rota UBA - Segunda" };
  const foreignRoute = { ...route, id: "rota-alheia", tenantId: "outro-tenant" };
  const result = selectOrderLoad("imperio", 99, "Ubá", "2026-10-09", [foreignRoute, cityRoute], []);
  assert.equal(result.plan?.routeId, "rota-uba");
  assert.equal(result.plan?.scheduledDate, "2026-10-12");
});

test("se a data da rota coincide com a entrega, a carga fica nesse mesmo dia", () => {
  const fridayRoute = { ...route, weekday: 5, name: "Rota Ubá - Sexta" };
  const result = selectOrderLoad("imperio", 5, "Ubá", "2026-10-09", [fridayRoute], []);
  assert.equal(result.plan?.scheduledDate, "2026-10-09");
});
